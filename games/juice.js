/* Juice engine for The Hardest Factory Lessons games.
   Sound (WebAudio synth), particles, screen shake, flash, squash-and-stretch, number tweens, floating labels, stamps, haptics.
   Everything is visual/audio sugar: game state never depends on it, and it is skipped for reduced-motion users. */
(function () {
  var J = window.J = {};
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var muted = false; try { muted = localStorage.getItem('hhl.mute') === '1'; } catch (e) {}
  J.reduce = reduce;

  /* ---------- the feel bible ----------
     One place for every feel constant, as the "Juice Factor" article recommends.
     - Feedback is instant: sound, pop and haptic fire on press (no waiting for an animation to finish).
     - Shake is scaled to the impact and reserved for impacts: ticks never shake, only hits do.
     - Hit-stop freezes the scene for 3 to 5 frames (about 50 to 85 ms) so a hit has weight.
     - Visual, audio and haptic signals fire at the same instant (see J.hit). */
  var FEEL = { shake:{ small:4, med:8, big:13 }, shakeMs:{ small:200, med:320, big:480 }, hitstop:{ small:50, med:70, big:85 }, vibe:{ small:[18], med:[28], big:[40, 30, 50] }, flash:{ small:0.12, med:0.22, big:0.34 } };
  J.FEEL = FEEL;

  /* ---------- sound ---------- */
  var AC = null;
  function ctx() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function tone(c, f, d, type, vol, to, delay) {
    var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(c, d, vol, delay, hp) {
    var t = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
    for (var i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 1800;
    s.buffer = b; g.gain.value = vol || 0.2; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  var SFX = {
    click: function (c) { tone(c, 520, 0.05, 'square', 0.05, 380); },
    select:function (c) { tone(c, 660, 0.06, 'triangle', 0.1, 990); tone(c, 1320, 0.05, 'sine', 0.05, 0, 0.04); },
    confirm:function (c) { tone(c, 392, 0.07, 'triangle', 0.12); tone(c, 587, 0.12, 'triangle', 0.12, 0, 0.06); },
    cancel:function (c) { tone(c, 400, 0.08, 'triangle', 0.1, 260); },
    hitS:  function (c) { tone(c, 140, 0.1, 'sine', 0.25, 60); noise(c, 0.06, 0.12, 0, 900); },
    hitM:  function (c) { tone(c, 110, 0.16, 'sine', 0.3, 45); noise(c, 0.12, 0.18, 0, 700); tone(c, 330, 0.08, 'square', 0.06, 180); },
    hitL:  function (c) { tone(c, 80, 0.3, 'sine', 0.4, 35); noise(c, 0.25, 0.25, 0, 500); tone(c, 220, 0.2, 'sawtooth', 0.1, 70); tone(c, 880, 0.05, 'square', 0.05, 0, 0.02); },
    pick:  function (c) { tone(c, 660, 0.07, 'triangle', 0.1, 880); },
    ok:    function (c) { tone(c, 523, 0.09, 'triangle', 0.14); tone(c, 784, 0.16, 'triangle', 0.14, 0, 0.08); },
    good:  function (c) { tone(c, 440, 0.08, 'triangle', 0.14); tone(c, 554, 0.08, 'triangle', 0.14, 0, 0.07); tone(c, 659, 0.08, 'triangle', 0.14, 0, 0.14); tone(c, 880, 0.2, 'triangle', 0.14, 0, 0.21); },
    bad:   function (c) { tone(c, 220, 0.22, 'sawtooth', 0.14, 90); noise(c, 0.18, 0.12); },
    alarm: function (c) { for (var i = 0; i < 3; i++) { tone(c, 880, 0.12, 'square', 0.08, 0, i * 0.2); tone(c, 660, 0.12, 'square', 0.08, 0, i * 0.2 + 0.1); } },
    stamp: function (c) { tone(c, 110, 0.12, 'sine', 0.3, 50); noise(c, 0.1, 0.25); },
    whoosh:function (c) { noise(c, 0.25, 0.12, 0, 600); },
    scan:  function (c) { tone(c, 300, 0.45, 'sawtooth', 0.05, 1400); },
    xray:  function (c) { tone(c, 90, 0.5, 'sawtooth', 0.08, 700); noise(c, 0.3, 0.06, 0, 2500); },
    probe: function (c) { for (var i = 0; i < 4; i++) tone(c, 900 + i * 180, 0.04, 'square', 0.05, 0, i * 0.07); },
    coin:  function (c) { tone(c, 988, 0.07, 'square', 0.1); tone(c, 1319, 0.2, 'square', 0.1, 0, 0.07); },
    cash:  function (c) { tone(c, 300, 0.4, 'sawtooth', 0.08, 80); noise(c, 0.35, 0.1); },
    tick:  function (c) { tone(c, 1200, 0.025, 'square', 0.04); },
    thud:  function (c) { tone(c, 80, 0.18, 'sine', 0.3, 40); },
    lose:  function (c) { tone(c, 392, 0.2, 'triangle', 0.14); tone(c, 330, 0.2, 'triangle', 0.14, 0, 0.2); tone(c, 262, 0.5, 'triangle', 0.14, 0, 0.4); },
    win:   function (c) { [523, 659, 784, 1047].forEach(function (f, i) { tone(c, f, 0.18, 'triangle', 0.15, 0, i * 0.1); }); tone(c, 1047, 0.5, 'triangle', 0.15, 0, 0.45); },
    phone: function (c) { for (var i = 0; i < 4; i++) { tone(c, 1100, 0.07, 'sine', 0.1, 0, i * 0.4); tone(c, 1400, 0.07, 'sine', 0.1, 0, i * 0.4 + 0.1); } },
    belt:  function (c) { for (var i = 0; i < 6; i++) tone(c, 150, 0.03, 'square', 0.04, 0, i * 0.06); },
    pop:   function (c) { tone(c, 300, 0.08, 'sine', 0.15, 700); }
  };
  J.sfx = function (n) { if (muted) return; var c = ctx(); if (!c) return; try { SFX[n] && SFX[n](c); } catch (e) {} };
  J.vibe = function (p) { try { if (!muted && !reduce && navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  J.muted = function () { return muted; };
  J.toggleMute = function () { muted = !muted; try { localStorage.setItem('hhl.mute', muted ? '1' : '0'); } catch (e) {} return muted; };
  J.muteBtn = function () { return '<button class="jmute" data-j="mute" aria-label="Sound on or off">' + (muted ? '🔇' : '🔊') + '</button>'; };

  /* ---------- particles ---------- */
  var cv = null, cx = null, parts = [], running = false, W = 0, H = 0, dpr = 1;
  var noCanvas = false;
  function setup() {
    if (noCanvas) return false;
    if (cv) return true;
    cv = document.createElement('canvas'); cv.id = 'jfx';
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
    cx = cv.getContext ? cv.getContext('2d') : null; if (!cx) { cv = null; noCanvas = true; return false; }
    document.body.appendChild(cv); resize(); window.addEventListener('resize', resize); return true;
  }
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function loop(ts) {
    cx.clearRect(0, 0, W, H);
    var dt = Math.min(0.05, (ts - (loop.last || ts)) / 1000); loop.last = ts; if (frozen) dt = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      var k = 1 - p.t / p.life; cx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.color;
      var s = p.size * (p.shrink ? k : 1);
      if (p.shape === 'rect') cx.fillRect(-s / 2, -s / 3, s, s * 0.6);
      else if (p.shape === 'ring') { cx.strokeStyle = p.color; cx.lineWidth = 2; cx.beginPath(); cx.arc(0, 0, s * (2 - k), 0, 6.283); cx.stroke(); }
      else if (p.shape === 'spark') { cx.fillRect(-s, -0.7, s * 2, 1.4); }
      else { cx.beginPath(); cx.arc(0, 0, s / 2, 0, 6.283); cx.fill(); }
      cx.restore();
    }
    if (parts.length) raf(loop); else { running = false; loop.last = 0; cx.clearRect(0, 0, W, H); }
  }
  function kick() { if (!running) { running = true; raf(loop); } }
  var PAL = { good:['#3ddc84', '#aef2c8', '#ffffff'], bad:['#ff5a4e', '#ffb4ac', '#ffd27a'], gold:['#f5c518', '#ffe58a', '#ffffff'], acc:['#3dd6c6', '#9af2ea', '#ffffff'], amber:['#ff9f43', '#ffd09a', '#fff1d9'], dust:['#93a9a8', '#c9d6d5', '#5c6f6e'] };
  // J.burst(x, y, {n, pal, speed, up, shape, size, life, g})
  J.burst = function (x, y, o) {
    if (reduce || !setup()) return; o = o || {};
    var pal = PAL[o.pal || 'acc'] || o.pal, n = o.n || 24, sp = o.speed || 260;
    for (var i = 0; i < n; i++) {
      var a = o.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * 6.283, v = sp * (0.35 + Math.random() * 0.75);
      parts.push({ x:x, y:y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, g:o.g == null ? 520 : o.g, life:(o.life || 0.9) * (0.6 + Math.random() * 0.6), t:0, size:(o.size || 7) * (0.5 + Math.random()), color:pal[Math.floor(Math.random() * pal.length)], shape:o.shape || (Math.random() < 0.5 ? 'rect' : 'dot'), rot:Math.random() * 6, vr:(Math.random() - 0.5) * 14, shrink:!!o.shrink });
    }
    kick();
  };
  J.ring = function (x, y, color) { if (reduce || !setup()) return; parts.push({ x:x, y:y, vx:0, vy:0, g:0, life:0.5, t:0, size:14, color:color || '#3dd6c6', shape:'ring', rot:0, vr:0 }); kick(); };
  J.center = function (el) { var r = el.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2, w:r.width, h:r.height }; };
  J.burstAt = function (el, o) { if (!el) return; var c = J.center(el); J.burst(c.x, c.y, o); };
  J.confetti = function () {
    if (reduce || !setup()) return;
    for (var k = 0; k < 3; k++) setTimeout(function () { J.burst(W * (0.2 + Math.random() * 0.6), H * 0.28, { n:36, pal:PAL.gold.concat(PAL.good, PAL.acc), speed:420, up:true, g:700, life:1.6, size:9 }); }, k * 180);
  };

  /* ---------- motion helpers ---------- */
  J.shake = function (el, power, ms) {
    if (reduce || !el || !el.animate) return; power = power || 8; ms = ms || 380;
    var kf = [], n = 9; for (var i = 0; i <= n; i++) { var d = (1 - i / n) * power; kf.push({ transform:'translate(' + ((Math.random() - 0.5) * 2 * d).toFixed(1) + 'px,' + ((Math.random() - 0.5) * 2 * d).toFixed(1) + 'px)' }); }
    kf.push({ transform:'none' }); el.animate(kf, { duration:ms, easing:'linear' });
  };
  // Hit-stop: freeze CSS animations and particles for a few frames so an impact has weight.
  var frozen = false;
  J.hitstop = function (ms) {
    if (reduce || frozen) return; frozen = true; document.body.classList.add('jfreeze');
    setTimeout(function () { frozen = false; document.body.classList.remove('jfreeze'); }, ms || FEEL.hitstop.med);
  };
  // One call, every sense at the same instant: flash + shake + hit-stop + particles + sound + haptic.
  // kind: 'good' | 'bad' | 'neutral'; size: 'small' | 'med' | 'big'
  J.hit = function (el, kind, size) {
    size = size || 'med'; kind = kind || 'neutral';
    var node = document.getElementById('app'), c = el ? J.center(el) : { x:window.innerWidth / 2, y:window.innerHeight / 3 };
    J.sfx(size === 'big' ? 'hitL' : size === 'med' ? 'hitM' : 'hitS');
    if (kind === 'bad') J.sfx('bad'); else if (kind === 'good') J.sfx('ok');
    J.vibe(FEEL.vibe[size]);
    J.hitstop(FEEL.hitstop[size]);
    if (kind !== 'good') J.shake(node, FEEL.shake[size], FEEL.shakeMs[size]);
    J.flash(kind === 'bad' ? '#ff5a4e' : kind === 'good' ? '#3ddc84' : '#ffffff', 220, FEEL.flash[size]);
    J.burst(c.x, c.y, { n:size === 'big' ? 34 : size === 'med' ? 22 : 12, pal:kind === 'bad' ? 'bad' : kind === 'good' ? 'good' : 'amber', speed:size === 'big' ? 380 : 260, up:kind === 'good' });
    if (el) J.pop(el, size === 'big' ? 1.3 : 1.18);
  };
  J.pop = function (el, big) {
    if (reduce || !el || !el.animate) return; big = big || 1.25;
    el.animate([{ transform:'scale(1)' }, { transform:'scale(' + big + ',' + (2 - big) + ')', offset:0.25 }, { transform:'scale(' + (2 - big * 0.9) + ',' + big * 0.95 + ')', offset:0.55 }, { transform:'scale(1)' }], { duration:420, easing:'ease-out' });
  };
  J.wiggle = function (el) { if (reduce || !el || !el.animate) return; el.animate([{ transform:'rotate(0)' }, { transform:'rotate(-6deg)' }, { transform:'rotate(6deg)' }, { transform:'rotate(-4deg)' }, { transform:'rotate(3deg)' }, { transform:'rotate(0)' }], { duration:480 }); };
  J.flash = function (color, ms, alpha) {
    if (reduce) return; var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:55;background:' + color; document.body.appendChild(d);
    if (!d.animate) { d.remove(); return; }
    var a = d.animate([{ opacity:alpha || 0.35 }, { opacity:0 }], { duration:ms || 300, easing:'ease-out' }); a.onfinish = function () { d.remove(); };
  };
  J.float = function (x, y, text, color, size) {
    var d = document.createElement('div'); d.textContent = text;
    d.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);pointer-events:none;z-index:58;font:900 ' + (size || 22) + 'px -apple-system,system-ui,sans-serif;color:' + (color || '#fff') + ';text-shadow:0 2px 0 rgba(0,0,0,.45);white-space:nowrap';
    document.body.appendChild(d); if (reduce || !d.animate) { setTimeout(function () { d.remove(); }, 900); return; }
    var a = d.animate([{ transform:'translate(-50%,-50%) scale(.4)', opacity:0 }, { transform:'translate(-50%,-90%) scale(1.25)', opacity:1, offset:0.2 }, { transform:'translate(-50%,-260%) scale(1)', opacity:0 }], { duration:1300, easing:'ease-out' });
    a.onfinish = function () { d.remove(); };
  };
  J.floatAt = function (el, text, color, size) { if (!el) return; var c = J.center(el); J.float(c.x, c.y, text, color, size); };
  J.count = function (el, from, to, ms, fmt) {
    if (!el) return; fmt = fmt || function (n) { return Math.round(n).toLocaleString('en'); };
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = null; ms = ms || 900; var lastTick = 0;
    function step(ts) { if (t0 == null) t0 = ts; var k = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e);
      if (ts - lastTick > 70 && k < 1) { lastTick = ts; J.sfx('tick'); }
      if (k < 1) raf(step); else { el.textContent = fmt(to); J.pop(el, 1.15); } }
    raf(step);
  };
  J.stamp = function (el, kind) {
    if (!el) return;
    if (!reduce && el.animate) el.animate([{ transform:'scale(3.2) rotate(-16deg)', opacity:0 }, { transform:'scale(.92) rotate(-3deg)', opacity:1, offset:0.6 }, { transform:'scale(1) rotate(-4deg)', opacity:1 }], { duration:480, easing:'cubic-bezier(.2,1.4,.4,1)', fill:'both' });
    setTimeout(function () { J.sfx('stamp'); J.shake(document.getElementById('app'), 7, 260); J.vibe(30); J.burstAt(el, { n:18, pal:kind === 'fail' ? 'bad' : kind === 'warn' ? 'amber' : 'good', speed:300 }); }, reduce ? 0 : 280);
  };
  // reveal children one after another (staggered pop-in)
  J.stagger = function (nodes, step) {
    if (reduce) return; step = step || 70;
    Array.prototype.forEach.call(nodes, function (n, i) { n.style.opacity = '0'; setTimeout(function () { n.style.opacity = ''; if (n.animate) n.animate([{ transform:'translateY(14px) scale(.96)', opacity:0 }, { transform:'none', opacity:1 }], { duration:340, easing:'cubic-bezier(.2,1.3,.4,1)' }); }, i * step); });
  };
  J.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 60) : ms); }); };

  /* ---------- global wiring ---------- */
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('button, .btn, [data-a]'); if (!b || b.disabled) return;
    if (b.matches('[data-j=mute]')) return; J.sfx('click');
  }, true);
  document.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('[data-j=mute]');
    if (m) { var mu = J.toggleMute(); m.textContent = mu ? '🔇' : '🔊'; if (!mu) J.sfx('pick'); }
  });
})();
