const https = require('https');
const fs = require('fs');
const path = require('path');

const DELAY_MS = 500;
const OUTPUT_FILE = path.join(__dirname, '../data/e2-genotype-comparison.json');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function needlemanWunsch(seq1, seq2) {
  const match = 1, mismatch = -1, gap = -1;
  const n = seq1.length, m = seq2.length;
  if (n === 0 || m === 0) return 0;

  const dp = Array(n + 1);
  for(let i = 0; i <= n; i++) dp[i] = new Int16Array(m + 1);

  for (let i = 0; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gap;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const scoreDiag = dp[i-1][j-1] + (seq1[i-1] === seq2[j-1] ? match : mismatch);
      const scoreUp = dp[i-1][j] + gap;
      const scoreLeft = dp[i][j-1] + gap;
      dp[i][j] = Math.max(scoreDiag, scoreUp, scoreLeft);
    }
  }

  let i = n, j = m;
  let matches = 0;
  let totalLen = 0;
  while (i > 0 && j > 0) {
    const current = dp[i][j];
    const diag = dp[i-1][j-1];
    const up = dp[i-1][j];
    if (current === diag + (seq1[i-1] === seq2[j-1] ? match : mismatch)) {
      if (seq1[i-1] === seq2[j-1]) matches++;
      i--; j--;
    } else if (current === up + gap) {
      i--;
    } else {
      j--;
    }
    totalLen++;
  }
  while (i > 0) { i--; totalLen++; }
  while (j > 0) { j--; totalLen++; }

  return parseFloat(((matches / totalLen) * 100).toFixed(2));
}

async function run() {
  console.log('Fetching HPV16 E2 (P03120)...');
  let hpv16Ref = null;
  try {
    const data = await fetchJSON('https://rest.uniprot.org/uniprotkb/P03120?format=json');
    hpv16Ref = data;
  } catch (e) {
    console.error('Error fetching HPV16 E2:', e);
    return;
  }

  const seq16 = hpv16Ref.sequence.value;
  const seq16_TAD = seq16.slice(0, 201);
  const seq16_Hinge = seq16.slice(201, 285);
  const seq16_DBD = seq16.slice(285);

  console.log('Fetching other Papillomaviridae E2 entries...');
  // The uniProt taxonomy_id:10566 (Papillomaviridae) is too broad and often just "Human papillomavirus"
  // Let's search by typical reference genotypes directly to build a better dataset
  const commonTypes = [
    '6', '11', '16', '18', '31', '33', '35', '39', '40', '42', '43', '44',
    '45', '51', '52', '53', '54', '56', '58', '59', '61', '66', '68', '70',
    '72', '73', '81', '82', '89'
  ];

  const highRisk = ['16', '18', '31', '33', '35', '39', '45', '51', '52', '56', '58', '59', '68'];
  const lowRisk = ['6', '11', '40', '42', '43', '44', '54', '61', '70', '72', '81', '89'];

  const results = [];

  // For each type, search uniprot
  for (const genotype of commonTypes) {
    if (genotype === '16') {
      const len = seq16.length;
      results.push({
        genotype: '16',
        alphaSpecies: 'alpha-9',
        riskLevel: 'high',
        e2Length: len,
        overallIdentityVsHPV16: 100,
        tadIdentity: 100,
        hingeIdentity: 100,
        dbdIdentity: 100,
        conservedResidueCount: 365,
        uniqueMutations: [],
        uniprotId: 'P03120',
        paveId: 'HPV16'
      });
      continue;
    }

    // Try finding "Human papillomavirus type X" + E2
    let url = `https://rest.uniprot.org/uniprotkb/search?query=gene:E2%20AND%20organism_name:"type%20${genotype}"&format=json&size=1`;
    try {
      const data = await fetchJSON(url);
      if (data.results && data.results.length > 0) {
        const entry = data.results[0];

        let riskLevel = 'unknown';
        if (highRisk.includes(genotype)) riskLevel = 'high';
        else if (lowRisk.includes(genotype)) riskLevel = 'low';
        else if (genotype === '53' || genotype === '66') riskLevel = 'probable-high';

        const seq = entry.sequence ? entry.sequence.value : '';
        if (!seq) continue;

        const len = seq.length;
        const tadLen = Math.floor(len * (201/365));
        const hingeLen = Math.floor(len * (84/365));

        const seq_TAD = seq.slice(0, tadLen);
        const seq_Hinge = seq.slice(tadLen, tadLen + hingeLen);
        const seq_DBD = seq.slice(tadLen + hingeLen);

        let overallId = needlemanWunsch(seq16, seq);
        let tadId = needlemanWunsch(seq16_TAD, seq_TAD);
        let hingeId = needlemanWunsch(seq16_Hinge, seq_Hinge);
        let dbdId = needlemanWunsch(seq16_DBD, seq_DBD);

        results.push({
          genotype: genotype,
          alphaSpecies: 'alpha',
          riskLevel: riskLevel,
          e2Length: len,
          overallIdentityVsHPV16: overallId,
          tadIdentity: tadId,
          hingeIdentity: hingeId,
          dbdIdentity: dbdId,
          conservedResidueCount: Math.floor(len * (overallId / 100)),
          uniqueMutations: [],
          uniprotId: entry.primaryAccession,
          paveId: `HPV${genotype}`
        });
      }
    } catch (e) {
      console.error(`Error fetching data for type ${genotype}:`, e.message);
    }
    await delay(DELAY_MS);
  }

  // Sort by genotype number
  results.sort((a, b) => {
    const numA = parseInt(a.genotype.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.genotype.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    metadata: {
      source: "UniProtKB, PAVE (Simulated via ID)",
      reference: "HPV16 E2 (P03120)",
      methodology: "Sequences retrieved from UniProt via REST API. Pairwise global alignment (Needleman-Wunsch) used to calculate sequence identities compared to HPV-16 reference."
    },
    data: results
  }, null, 2));

  console.log(`Saved ${results.length} genotype comparison records to ${OUTPUT_FILE}`);
}

run();
