(function() {
  var cfg = {
    siteName: 'HPV Research',
    accent: '#10b981',
    home: '/hpv-research/',
    sections: [
      { label: 'Studies', href: '/hpv-research/' }
    ]
  };
  var nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.innerHTML = '<div class="nav-inner"><a href="' + cfg.home + '" class="nav-brand">' + cfg.siteName + '</a><button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button><div class="nav-links">' + cfg.sections.map(function(s) { return '<a href="' + s.href + '" class="nav-link">' + s.label + '</a>'; }).join('') + '</div></div>';
  var style = document.createElement('style');
  style.textContent = '.site-nav{position:sticky;top:0;z-index:10000;background:rgba(6,10,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06);font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:48px}.nav-brand{font-size:0.9rem;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.3px}.nav-brand:hover{color:#10b981}.nav-links{display:flex;gap:8px}.nav-link{color:#8a94a6;text-decoration:none;font-size:0.82rem;font-weight:500;padding:6px 14px;border-radius:6px;transition:all 0.15s}.nav-link:hover{color:#fff;background:rgba(255,255,255,0.06)}.nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px;flex-direction:column;gap:4px}.nav-toggle span{display:block;width:18px;height:2px;background:#8a94a6;border-radius:1px;transition:all 0.2s}@media(max-width:640px){.nav-toggle{display:flex}.nav-links{display:none;position:absolute;top:48px;left:0;right:0;background:rgba(6,10,18,0.95);backdrop-filter:blur(12px);flex-direction:column;padding:8px 16px 16px;border-bottom:1px solid rgba(255,255,255,0.06)}.nav-links.open{display:flex}.nav-link{padding:10px 14px}}';
  document.head.appendChild(style);
  document.body.insertBefore(nav, document.body.firstChild);
  var toggle = nav.querySelector('.nav-toggle');
  var links = nav.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function() {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
})();
