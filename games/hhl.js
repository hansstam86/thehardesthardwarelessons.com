/* Shared score layer for The Hardest Hardware Lessons games.
   HHL.submit(chapter, score) records a finished run locally and, if API is set, posts it to the global leaderboard. */
(function () {
  var API = 'https://api.thehardesthardwarelessons.com';
  var CH = {
    1: ['The Development Journey', '#5ab0ff', 'ch1-journey'], 2: ['Prototyping', '#b388ff', 'ch2-prototyping'],
    3: ['Project Set-up', '#3ddc84', 'ch3-setup'], 4: ['EVT', '#f5c518', 'ch4-evt'],
    5: ['DVT', '#ff7a45', 'ch5-dvt'], 6: ['PVT', '#ff5a8a', 'ch6-pvt']
  };
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
  // Post queued scores one at a time; a score leaves the queue only after the server accepts it.
  function flush(done) {
    if (!live()) return;
    if (flushing) { if (done) setTimeout(function () { flush(done); }, 1000); return; }
    var p = profile(); if (!p.name || !p.pending.length) { if (done) done(); return; }
    flushing = true;
    var s = p.pending[0];
    post('/score', { pid: p.pid, name: p.name, ch: s.ch, score: s.score }).then(function (r) {
      var q = profile();
      if (r.ok || r.error === 'invalid') { q.pending = q.pending.filter(function (x) { return x !== s && !(x.ch === s.ch && x.score <= s.score); }); }
      else if (r.error === 'slow down') { flushing = false; return setTimeout(function () { flush(done); }, 5500); }
      q.lastPost = r.ok ? 'ok' : (r.error || 'error'); save(q);
      flushing = false; flush(done);
    }).catch(function () { flushing = false; var q = profile(); q.lastPost = 'network'; save(q); if (done) done(); });
  }
  function toast(msg, href) {
    var d = document.createElement('a');
    d.textContent = msg; d.href = href || '../leaderboard/';
    d.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);z-index:50;background:#1d2329;color:#eef2f4;border:1px solid #2d363e;border-radius:999px;padding:10px 16px;font:600 13px -apple-system,system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 24px rgba(0,0,0,.4)';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }
  window.HHL = {
    CH: CH, API: API, live: live, profile: profile, save: save, flush: flush,
    // call once per finished run with the final score
    submit: function (ch, score) {
      score = Math.round(Number(score)); if (!(score >= 0)) return;
      var p = profile();
      p.plays[ch] = (p.plays[ch] || 0) + 1;
      var isBest = !(p.best[ch] >= score);
      if (isBest) { p.best[ch] = score; p.bestAt = p.bestAt || {}; p.bestAt[ch] = Date.now(); }
      if (isBest) p.pending.push({ ch: ch, score: score, t: Date.now() });
      save(p);
      if (isBest) { if (p.name) flush(); try { toast(p.name || !live() ? 'Saved · see leaderboard' : 'New best · add your name to rank', '../leaderboard/'); } catch (e) {} }
    },
    get: function (path) { return fetch(API + path).then(function (r) { return r.json(); }); },
    post: post
  };
})();
