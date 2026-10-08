/* Shared score layer for The Hardest Hardware Lessons games.
   HHL.submit(chapter, score) records a finished run locally and, if API is set, posts it to the global leaderboard. */
(function () {
  var API = 'https://api.thehardesthardwarelessons.com';
  var CH = {
    1: ['The Development Journey', '#5ab0ff', 'ch1-journey'], 2: ['Prototyping', '#b388ff', 'ch2-prototyping'],
    3: ['Project Set-up', '#3ddc84', 'ch3-setup'], 4: ['EVT', '#f5c518', 'ch4-evt'],
    5: ['DVT', '#ff7a45', 'ch5-dvt'], 6: ['PVT', '#ff5a8a', 'ch6-pvt'],
    102: ['The Dock', '#3dd6c6', 'f2-dock'],
    103: ['Clear to Build', '#3dd6c6', 'f3-warehouse'],
    114: ['The Audit', '#3dd6c6', 'f14-audit'],
    115: ['The Deal', '#3dd6c6', 'f15-deal']
  };
  var ORDER = [1, 2, 3, 4, 5, 6, 102, 103, 114, 115];
  function chLabel(n) { return n >= 100 ? 'Factory ch. ' + (n - 100) : 'Chapter ' + n; }
  var K = 'hhl.profile';
  function load() { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } }
  function save(p) { try { localStorage.setItem(K, JSON.stringify(p)); } catch (e) {} }
  function rid() {
    var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function profile() {
    var p = load();
    if (!p.pid) { p.pid = rid(); p.name = ''; p.best = {}; p.plays = {}; p.pending = []; save(p); }
    return p;
  }
  function live() { return API.indexOf('REPLACE-ME') < 0; }
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
      .then(function (r) { return r.json().catch(function () { return { error: 'http ' + r.status }; }); });
  }
  var flushing = false;
  // Send every local best in one request. The server keeps the max per chapter, so repeating is harmless.
  // p.synced remembers the last name+bests the server accepted.
  function snapshot(p) { return JSON.stringify([p.name, p.best]); }
  function flush(done) {
    if (!live()) return;
    if (flushing) { if (done) setTimeout(function () { flush(done); }, 1000); return; }
    var p = profile(); if (!p.name || !Object.keys(p.best).length) { if (done) done(); return; }
    flushing = true;
    post('/score', { pid: p.pid, name: p.name, bests: p.best }).then(function (r) {
      var q = profile();
      if (r.ok) { q.synced = snapshot(p); q.lastPost = 'ok'; } else { q.lastPost = r.error || 'error'; }
      save(q); flushing = false;
      if (r.error === 'slow down') return setTimeout(function () { flush(done); }, 2500);
      if (done) done();
    }).catch(function (e) { flushing = false; var q = profile(); q.lastPost = 'network: ' + e; save(q); if (done) done(); });
  }
  function unsynced() { var p = profile(); return p.name && Object.keys(p.best).length && p.synced !== snapshot(p); }
  function toast(msg, href) {
    var d = document.createElement('a');
    d.textContent = msg; d.href = href || '../leaderboard/';
    d.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);z-index:50;background:#1d2329;color:#eef2f4;border:1px solid #2d363e;border-radius:999px;padding:10px 16px;font:600 13px -apple-system,system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 24px rgba(0,0,0,.4)';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }
  window.HHL = {
    CH: CH, ORDER: ORDER, chLabel: chLabel, API: API, live: live, profile: profile, save: save, flush: flush, unsynced: unsynced,
    // call once per finished run with the final score
    submit: function (ch, score) {
      score = Math.round(Number(score)); if (!(score >= 0)) return;
      var p = profile();
      p.plays[ch] = (p.plays[ch] || 0) + 1;
      var isBest = !(p.best[ch] >= score);
      if (isBest) { p.best[ch] = score; p.bestAt = p.bestAt || {}; p.bestAt[ch] = Date.now(); }
      save(p);
      if (isBest) { if (p.name) flush(); try { toast(p.name || !live() ? 'Saved · see leaderboard' : 'New best · add your name to rank', '../leaderboard/'); } catch (e) {} }
    },
    // Link this device to another device's player: adopt its id, name and bests (keeping the higher score per chapter).
    adopt: function (code, cb) {
      var pid = String(code || '').toLowerCase().replace(/[^0-9a-f]/g, '');
      if (pid.length !== 32) return cb('That code should be 32 letters and digits (0-9, a-f).');
      HHL.get('/me?pid=' + pid).then(function (r) {
        if (r.error) return cb(r.error === 'unknown' ? 'No scores are saved under that code yet. Set a name and sync the other device first.' : 'Invalid code.');
        var p = profile();
        for (var ch in r.bests) if (!(p.best[ch] >= r.bests[ch])) p.best[ch] = r.bests[ch];
        p.pid = pid; p.name = r.name; p.synced = null; save(p); flush(); cb(null);
      }).catch(function () { cb('Could not reach the leaderboard.'); });
    },
    get: function (path) { return fetch(API + path).then(function (r) { return r.json(); }); },
    post: post
  };

  // End-screen block: one rule to remember, the terms used, the matching free template, the next game and the book.
  var LEARN = {
    1: ['Every problem you defer comes back at the next phase\'s price. Catch it while it is cheap.', [['cost-of-change', 'Cost-of-change curve'], ['gate', 'Gate'], ['open-issue', 'Open issue']], ['gate-checklist', 'Gate readiness checklist']],
    2: ['Run the honest test, not the flattering one. Risks you do not test now are found later, at a higher price.', [['prototype', 'Prototype'], ['p1', 'P1'], ['risk-register', 'Risk register'], ['dfm', 'DFM']], ['risk-register', 'Prototype risk register']],
    3: ['If a requirement cannot be tested, it is a wish. The critical path sets the date; contingency protects it.', [['prd', 'PRD'], ['trd', 'TRD'], ['critical-path', 'Critical path'], ['contingency', 'Contingency']], ['testable-requirements', 'Testable requirements checklist']],
    4: ['Every issue needs one owner, quickly. Problems between two teams are the ones nobody owns.', [['evt', 'EVT'], ['interface-issue', 'Interface issue'], ['open-issue', 'Open issue']], ['gate-checklist', 'Gate readiness checklist']],
    5: ['Steel can be cut away but never put back. Release tooling on evidence, not because the schedule says so.', [['dvt', 'DVT'], ['tooling', 'Tooling'], ['lab-slot', 'Lab slot'], ['certification', 'Certification']], ['tooling-release', 'Tooling release checklist']],
    6: ['Find the product\'s limits on your own terms, before a customer finds them for you.', [['pvt', 'PVT'], ['halt', 'HALT'], ['readiness-gate', 'Readiness gate'], ['yield', 'Yield']], ['gate-checklist', 'Gate readiness checklist']],
    102: ['Every component in every unit crossed the dock, and the dock is the cheapest place in the system to find that one is wrong. Specify what happens there, or the factory\'s defaults decide.', [['iqc', 'IQC'], ['mrb', 'MRB'], ['msd', 'MSD'], ['traceability', 'Traceability'], ['counterfeit', 'Counterfeit']], null],
    103: ['"Material is ready" can be a true statement about a database and a false one about a building. Reconcile the system against the shelf before the line starts, while a gap can still be fixed by expedite instead of by stoppage.', [['clear-to-build', 'Clear-to-build'], ['phantom-stock', 'Phantom stock'], ['cycle-count', 'Cycle count'], ['fifo', 'FIFO'], ['eo-liability', 'E&O']], null],
    114: ['The audit is the one moment the whole relationship is still free. You see the factory on its best day, so everything you find is a floor, and every finding that matters must become a contract term, or it becomes a hope.', [['audit', 'Factory audit'], ['evidence-standard', 'Evidence standard'], ['reluctance-map', 'Reluctance map'], ['red-line', 'Red line'], ['capa', 'CAPA']], null],
    115: ['Everything is negotiable exactly once. A term deferred "until we are up and running" is a concession with a delayed invoice, and the exit is cheapest to buy at signature.', [['thin-quote', 'Thin quote'], ['nre', 'NRE'], ['lien', 'Lien'], ['epidemic-failure', 'Epidemic-failure clause'], ['eo-liability', 'E&O'], ['last-buy', 'Last buy']], null]
  };
  var A = 'style="color:#e8c547" target="_blank" rel="noopener"';
  HHL.next = function (ch) {
    var L = LEARN[ch]; if (!L) return '';
    var nx = CH[ch + 1], up = ch < 6; var tpl = L[2];
    return '<div style="margin:14px 0 6px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);font-size:13px;line-height:1.5;text-align:left">' +
      '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin-bottom:4px">Remember this</div>' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:10px">' + L[0] + '</div>' +
      '<div style="opacity:.85">Terms in this game: ' + L[1].map(function (t) { return '<a href="/glossary/#' + t[0] + '" ' + A + '>' + t[1] + '</a>'; }).join(', ') + '</div>' +
      (tpl ? '<div style="opacity:.85;margin-top:4px">Free: <a href="/templates/' + tpl[0] + '/" ' + A + '>' + tpl[1] + '</a> (print or PDF)</div>' : '') +
      (up ? '<div style="margin-top:10px"><a href="../' + nx[2] + '/" style="color:#e8c547;font-weight:700">Next: Chapter ' + (ch + 1) + ', ' + nx[0] + ' →</a></div>'
          : '<div style="margin-top:10px"><a href="../leaderboard/" style="color:#e8c547;font-weight:700">See your scorecard and the leaderboard →</a></div>') +
      '<div style="margin-top:6px;opacity:.85">One lesson a week, free: <a href="/subscribe/" ' + A + '>subscribe by email</a> · <a href="' + (ch >= 100 ? 'https://hansolo42.gumroad.com/l/cmysdx' : 'https://hansolo42.gumroad.com/l/thehardesthardwarelessons') + '" ' + A + '>Get the book</a></div></div>';
  };
})();
