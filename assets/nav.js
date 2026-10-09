/* Shared site navigation: one link list for every page, a Menu button on small screens,
   and a "More" dropdown for the secondary links on large ones. Replaces each page's <nav> contents. */
(function () {
  var nav = document.querySelector('nav');
  if (!nav || nav.getAttribute('data-hhl')) return;
  nav.setAttribute('data-hhl', '1');

  var MAIN = [['The Book', '/'], ['Factory book', '/factory/'], ['Games', '/games/'], ['Glossary', '/glossary/'], ['Templates', '/templates/']];
  var MORE = [['Slides', '/slides', 1], ['Substack', 'https://thehardesthardwarelessons.substack.com', 1], ['Consulting', 'https://www.hansstam.eu', 1], ['LinkedIn', 'https://www.linkedin.com/in/hansstam/', 1]];
  var BUY = 'https://hansolo42.gumroad.com/l/thehardesthardwarelessons';
  var path = location.pathname.replace(/index\.html$/, '');
  function on(h) { return h === '/' ? path === '/' : path.indexOf(h) === 0; }
  function link(l, cls) {
    return '<a class="' + cls + (on(l[1]) ? ' on' : '') + '" href="' + l[1] + '"' + (l[2] ? ' target="_blank" rel="noopener"' : '') + (on(l[1]) ? ' aria-current="page"' : '') + '>' + l[0] + '</a>';
  }

  var css = '' +
    'nav[data-hhl]{display:flex;align-items:center;justify-content:space-between;gap:1rem}' +
    'nav[data-hhl] .logo{flex:none;line-height:1.3;text-decoration:none}' +
    'nav[data-hhl] .hhl-links{display:flex;align-items:center;gap:1.4rem}' +
    'nav[data-hhl] .hhl-links a.hl{font-family:sans-serif;font-size:.8rem;color:var(--muted,#888);text-decoration:none;letter-spacing:.05em;padding:.4rem 0;border-bottom:2px solid transparent}' +
    'nav[data-hhl] .hhl-links a.hl:hover{color:var(--text,#e8e8e8)}' +
    'nav[data-hhl] a.hl.on{color:var(--text,#e8e8e8);border-bottom-color:var(--accent,#e8c547)}' +
    'nav[data-hhl] .hhl-more{position:relative}' +
    'nav[data-hhl] .hhl-more>button{font:inherit;font-family:sans-serif;font-size:.8rem;letter-spacing:.05em;color:var(--muted,#888);background:none;border:0;cursor:pointer;padding:.4rem 0}' +
    'nav[data-hhl] .hhl-more>button:hover,nav[data-hhl] .hhl-more>button[aria-expanded=true]{color:var(--text,#e8e8e8)}' +
    'nav[data-hhl] .hhl-drop{position:absolute;right:0;top:calc(100% + 10px);min-width:170px;background:#161616;border:1px solid var(--border,#2a2a2a);border-radius:6px;padding:.4rem;display:none;box-shadow:0 12px 32px rgba(0,0,0,.5)}' +
    'nav[data-hhl] .hhl-drop.open{display:block}' +
    'nav[data-hhl] .hhl-drop a{display:block;padding:.6rem .8rem;border-radius:4px;font-family:sans-serif;font-size:.85rem;color:var(--text,#e8e8e8);text-decoration:none}' +
    'nav[data-hhl] .hhl-drop a:hover{background:#222}' +
    'nav[data-hhl] .hhl-burger{display:none;font-family:sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text,#e8e8e8);background:transparent;border:1px solid var(--border,#2a2a2a);border-radius:6px;padding:.6rem .9rem;min-height:44px;cursor:pointer}' +
    'nav[data-hhl] .hhl-panel{display:none;position:absolute;left:0;right:0;top:100%;background:#121212;border-bottom:1px solid var(--border,#2a2a2a);padding:.5rem 1rem 1rem;box-shadow:0 18px 32px rgba(0,0,0,.5);max-height:calc(100vh - 60px);overflow:auto}' +
    'nav[data-hhl] .hhl-panel.open{display:block}' +
    'nav[data-hhl] .hhl-panel a.pl{display:block;padding:.95rem .4rem;font-family:sans-serif;font-size:1rem;color:var(--text,#e8e8e8);text-decoration:none;border-bottom:1px solid #222}' +
    'nav[data-hhl] .hhl-panel a.pl.on{color:var(--accent,#e8c547)}' +
    'nav[data-hhl] .hhl-panel .sec{font-family:sans-serif;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#888);margin:1rem .4rem .2rem}' +
    'nav[data-hhl] .hhl-panel a.cta-nav{display:block;text-align:center;margin-top:1rem;padding:.95rem 1rem}' +
    '@media (max-width:760px){nav[data-hhl]{padding:.6rem 1rem !important}nav[data-hhl] .logo{font-size:.7rem !important;max-width:60%}nav[data-hhl] .hhl-links{display:none}nav[data-hhl] .hhl-burger{display:inline-block}}' +
    '@media (min-width:761px){nav[data-hhl] .hhl-panel{display:none !important}}';
  var st = document.createElement('style'); st.id = 'hhl-nav-css'; st.textContent = css; document.head.appendChild(st);

  nav.innerHTML =
    '<a class="logo" href="/">The Hardest Hardware Lessons</a>' +
    '<div class="hhl-links">' + MAIN.map(function (l) { return link(l, 'hl'); }).join('') +
      '<div class="hhl-more"><button type="button" aria-expanded="false" aria-haspopup="true">More ▾</button><div class="hhl-drop">' + MORE.map(function (l) { return link(l, 'dl'); }).join('') + '</div></div>' +
      '<a class="cta-nav" href="' + BUY + '" target="_blank" rel="noopener">Get the Book</a></div>' +
    '<button type="button" class="hhl-burger" aria-expanded="false" aria-controls="hhl-panel">Menu</button>' +
    '<div class="hhl-panel" id="hhl-panel">' + MAIN.map(function (l) { return link(l, 'pl'); }).join('') +
      '<div class="sec">More</div>' + MORE.map(function (l) { return link(l, 'pl'); }).join('') +
      '<a class="cta-nav" href="' + BUY + '" target="_blank" rel="noopener">Get the Book →</a></div>';

  var burger = nav.querySelector('.hhl-burger'), panel = nav.querySelector('.hhl-panel'),
      moreBtn = nav.querySelector('.hhl-more>button'), drop = nav.querySelector('.hhl-drop');
  function toggle(btn, box, open) {
    var o = open == null ? !box.classList.contains('open') : open;
    box.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (btn === burger) btn.textContent = o ? 'Close' : 'Menu';
  }
  burger.addEventListener('click', function (e) { e.stopPropagation(); toggle(burger, panel); });
  moreBtn.addEventListener('click', function (e) { e.stopPropagation(); toggle(moreBtn, drop); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) { toggle(burger, panel, false); toggle(moreBtn, drop, false); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(burger, panel, false); toggle(moreBtn, drop, false); } });
  window.addEventListener('resize', function () { toggle(burger, panel, false); });

  // Back to top, for the long pages
  var top = document.createElement('button');
  top.type = 'button'; top.setAttribute('aria-label', 'Back to top'); top.textContent = '↑';
  top.style.cssText = 'position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:90;width:46px;height:46px;border-radius:50%;border:1px solid var(--border,#2a2a2a);background:rgba(22,22,22,.95);color:var(--accent,#e8c547);font:700 20px sans-serif;cursor:pointer;display:none;box-shadow:0 6px 20px rgba(0,0,0,.5)';
  document.body.appendChild(top);
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return; tick = true;
    requestAnimationFrame(function () { top.style.display = window.scrollY > 1400 ? 'block' : 'none'; tick = false; });
  }, { passive: true });
})();
