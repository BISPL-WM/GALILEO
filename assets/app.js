/* GALILEO project page. Every figure is drawn from window.GAL (assets/data.js, built by src/build_assets.py). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ edit these when the paper is public
  const SITE = {
    authors: '<span class="an">Youngmin Kim<sup>*</sup></span> · <span class="an">Seonghyun Jin<sup>*</sup></span> · <span class="an">Jong Chul Ye<sup>†</sup></span>',   // as in the arXiv version (main_arxiv_new4.tex)
    paper: 'assets/galileo_paper.pdf',
    arxiv: null,                           // 'https://arxiv.org/abs/....'
    code: null,                            // 'https://github.com/...'
  };

  const GAL = window.GAL;
  const $ = (id) => document.getElementById(id);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = {};
  const readTheme = () => Object.assign(C, { t: ['--t0', '--t1', '--t2', '--t3'].map(css), now: css('--now'), base: css('--base'), fg: css('--fg'),
    dim: css('--dim'), faint: css('--faint'), line: css('--line'), soft: css('--line-soft'), ink: css('--ink'), field: css('--field'), sheet: css('--sheet'), raise: css('--raise') });
  readTheme();
  // charts redraw on resize; a theme switch or the late arrival of the web fonts asks for the same
  const redraw = () => { readTheme(); dispatchEvent(new Event('resize')); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.fonts) document.fonts.ready.then(redraw);
  const SUB = ['₀', '₁', '₂', '₃'];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MONO = '"EB Garamond", Garamond, "Times New Roman", serif';

  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const f32 = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer); };
  const u8 = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const fmt = (v, d = 1) => (v == null ? '–' : v.toFixed(d));

  function chips(el, items, onPick, initial = 0) {
    el.innerHTML = '';
    const bs = items.map((it, i) => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = it.label; b.setAttribute('aria-pressed', i === initial);
      b.onclick = () => { bs.forEach((x) => x.setAttribute('aria-pressed', x === b)); onPick(it, i); };
      el.appendChild(b); return b;
    });
    return { pick(i) { bs.forEach((x, j) => x.setAttribute('aria-pressed', j === i)); } };
  }

  // a scrubber: ticks = [{v, color, label}], value in [min, max]
  function timeline(el, { min, max, ticks, step, onInput }) {
    el.innerHTML = '';
    const pos = (v) => ((v - min) / (max - min)) * 100 + '%';
    for (const t of ticks) {
      const d = document.createElement('div'); d.className = 'tl-tick'; d.style.left = pos(t.v); d.style.background = t.color;
      if (t.label) { const s = document.createElement('span'); s.textContent = t.label; d.appendChild(s); }
      el.appendChild(d);
    }
    const head = document.createElement('div'); head.className = 'tl-head'; el.appendChild(head);
    let val = min;
    const set = (v) => { val = Math.min(max, Math.max(min, v)); head.style.left = pos(val); el.setAttribute('aria-valuenow', val.toFixed(3)); };
    const fromEvent = (e) => { const r = el.getBoundingClientRect(); let v = min + ((e.clientX - r.left) / r.width) * (max - min); if (step) v = Math.round(v / step) * step; set(v); onInput(val); };
    el.onpointerdown = (e) => { el.setPointerCapture(e.pointerId); fromEvent(e); el.onpointermove = fromEvent; };
    el.onpointerup = el.onpointercancel = () => { el.onpointermove = null; };
    el.onkeydown = (e) => { const d = (step || (max - min) / 50) * (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0); if (d) { set(val + d); onInput(val); e.preventDefault(); } };
    el.setAttribute('aria-valuemin', min); el.setAttribute('aria-valuemax', max);
    set(min);
    return { set, get: () => val };
  }

  // run fn(dt) every animation frame while the element is on screen
  function whileVisible(el, fn) {
    let vis = false, raf = 0, last = 0;
    const loop = (t) => { if (!vis) { raf = 0; return; } const dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t; fn(dt, t / 1000); raf = requestAnimationFrame(loop); };
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis && !raf) { last = 0; raf = requestAnimationFrame(loop); } }, { rootMargin: '80px' }).observe(el);
  }

  function strokeOutline(ctx, polys, s, lw = 1.6) {
    if (!polys || !polys.length) return;
    ctx.save(); ctx.lineJoin = 'round';
    for (const pass of [[lw + 2, 'rgba(0,0,0,.65)'], [lw, '#fff']]) {
      ctx.lineWidth = pass[0]; ctx.strokeStyle = pass[1]; ctx.beginPath();
      for (const p of polys) { ctx.moveTo(p[0] * s, p[1] * s); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * s, p[i + 1] * s); ctx.closePath(); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // fit a canvas's backing store to its CSS box (for charts with text)
  function fit(cv, hCss) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 600, h = hCss || cv.clientHeight || 200;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  // ================================================================== 1. keys in 3D
  function keysDemo() {
    const cb = $('keys-b'), cg = $('keys-g');
    let sc = null, atlas = null, G = null, B = null, tau = 0, playing = !REDUCED, dir = 1, yaw = 0, pitch = 0, userView = false, tint = false, tl = null, token = 0;
    const N = 10;

    function camera(swayYaw) {
      const M = sc.c2w, R = [[M[0][0], M[0][1], M[0][2]], [M[1][0], M[1][1], M[1][2]], [M[2][0], M[2][1], M[2][2]]];
      const c = [M[0][3], M[1][3], M[2][3]], p = sc.pivot;
      const up = [R[0][1], R[1][1], R[2][1]], right = [R[0][0], R[1][0], R[2][0]];
      const rot = (ax, a) => { // Rodrigues
        const [x, y, z] = ax, co = Math.cos(a), si = Math.sin(a), t = 1 - co;
        return [[t * x * x + co, t * x * y - si * z, t * x * z + si * y], [t * x * y + si * z, t * y * y + co, t * y * z - si * x], [t * x * z - si * y, t * y * z + si * x, t * z * z + co]];
      };
      const mul = (A, Bm) => A.map((r) => [0, 1, 2].map((j) => r[0] * Bm[0][j] + r[1] * Bm[1][j] + r[2] * Bm[2][j]));
      const Q = mul(rot(up, yaw + swayYaw), rot(right, pitch));
      const R2 = mul(Q, R), d = [c[0] - p[0], c[1] - p[1], c[2] - p[2]];
      const c2 = [0, 1, 2].map((i) => p[i] + Q[i][0] * d[0] + Q[i][1] * d[1] + Q[i][2] * d[2]);
      return { R: R2, c: c2 };
    }

    function draw(cv, arr, n, transport, cam) {
      const ctx = cv.getContext('2d'), W = cv.width, S = W / 256, K = sc.K, R = cam.R, c = cam.c;
      ctx.globalAlpha = 1; ctx.fillStyle = C.field; ctx.fillRect(0, 0, W, W);
      const px = new Float32Array(n), py = new Float32Array(n), ps = new Float32Array(n), pz = new Float32Array(n);
      const stat = [], mov = [];
      for (let i = 0; i < n; i++) {
        const o = i * N, slot = arr[o + 7], dt = transport ? tau - sc.times[slot] : 0;
        const x = arr[o] + arr[o + 3] * dt - c[0], y = arr[o + 1] + arr[o + 4] * dt - c[1], z = arr[o + 2] + arr[o + 5] * dt - c[2];
        const zc = R[0][2] * x + R[1][2] * y + R[2][2] * z;
        if (zc < 0.05) continue;
        px[i] = (K[0][0] * (R[0][0] * x + R[1][0] * y + R[2][0] * z) / zc + K[0][2]) * S;
        py[i] = (K[1][1] * (R[0][1] * x + R[1][1] * y + R[2][1] * z) / zc + K[1][2]) * S;
        ps[i] = arr[o + 6] * K[0][0] / zc * S; pz[i] = zc;
        if (px[i] < -ps[i] || py[i] < -ps[i] || px[i] > W + ps[i] || py[i] > W + ps[i]) continue;
        (arr[o + 9] > 0 ? mov : stat).push(i);
      }
      const far = (a, b) => pz[b] - pz[a];
      stat.sort(far); mov.sort(far);
      const tile = (i, pad) => {
        const o = i * N, tok = arr[o + 8], s = ps[i] + pad;
        ctx.drawImage(atlas, arr[o + 7] * 256 + (tok % 32) * 8, Math.floor(tok / 32) * 8, 8, 8, px[i] - s / 2, py[i] - s / 2, s, s);
      };
      for (const i of stat) tile(i, 1.4);
      ctx.globalAlpha = 0.62;
      for (const i of mov) tile(i, 1.6);
      if (tint) {
        ctx.globalAlpha = 0.34;
        for (const i of mov) { ctx.fillStyle = C.t[arr[i * N + 7]]; const s = ps[i] + 1.6; ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s); }
      }
      ctx.globalAlpha = 1;
    }

    function render(t) {
      if (!sc) return;
      const cam = camera(userView || REDUCED ? 0 : 0.085 * Math.sin((t || 0) * 0.55));
      draw(cb, B, sc.nb, false, cam); draw(cg, G, sc.ng, true, cam);
      const near = Math.abs(tau - sc.ta) < 0.012;
      $('keys-read').innerHTML = `query time ${tau.toFixed(3)} s${near ? ' = t<sub>a</sub>' : ''}`;
    }

    async function load(s) {
      const my = ++token;
      const [a, gt, rg, rb] = await Promise.all([loadImg(s.atlas), loadImg(s.gt), loadImg(s.rg), loadImg(s.rb)]);
      if (my !== token) return;
      sc = s; atlas = a; G = f32(s.g); B = f32(s.b); yaw = pitch = 0; userView = false; tau = s.ta;
      const [t0, t3] = [s.times[0], Math.max(s.times[3], s.ta)];   // the query time can lie past the last input (fish)
      tl = timeline($('keys-track'), {
        min: t0, max: t3, onInput: (v) => { tau = v; setPlay(false); render(performance.now() / 1000); },
        ticks: s.times.map((v, i) => ({ v, color: C.t[i], label: 't' + SUB[i] })).concat([{ v: s.ta, color: C.now, label: 'tₐ' }]),
      });
      tl.set(tau);
      for (const [id, im] of [['keys-rb', rb], ['keys-rg', rg], ['keys-rt', gt]]) {
        const cv = $(id), ctx = cv.getContext('2d'); ctx.drawImage(im, 0, 0, cv.width, cv.height); strokeOutline(ctx, s.outline, cv.width / 256, 1.2);
      }
      $('keys-pb').textContent = `PSNR_dyn ${s.psnrB.toFixed(1)} dB`; $('keys-pg').textContent = `PSNR_dyn ${s.psnrG.toFixed(1)} dB`;
      render(performance.now() / 1000);
    }

    function setPlay(p) { playing = p; $('keys-play').textContent = p ? '❚❚' : '▶'; $('keys-play').setAttribute('aria-label', p ? 'Pause' : 'Play'); }
    $('keys-play').onclick = () => setPlay(!playing);
    $('keys-tint').onchange = (e) => { tint = e.target.checked; render(performance.now() / 1000); };
    $('keys-reset').onclick = () => { yaw = pitch = 0; userView = false; render(performance.now() / 1000); };
    for (const cv of [cb, cg]) {
      let last = null;
      cv.onpointerdown = (e) => { last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = (e) => {
        if (!last) return;
        yaw = Math.max(-0.3, Math.min(0.3, yaw - (e.clientX - last[0]) * 0.003)); pitch = Math.max(-0.15, Math.min(0.15, pitch + (e.clientY - last[1]) * 0.003));
        userView = true; last = [e.clientX, e.clientY]; $('keys-hint').hidden = true; if (!playing) render(performance.now() / 1000);
      };
      cv.onpointerup = cv.onpointercancel = () => { last = null; };
    }
    whileVisible($('keys'), (dt, t) => {
      if (!sc || !playing) return;
      const [t0, t3] = [sc.times[0], Math.max(sc.times[3], sc.ta)];
      tau += dir * dt * (t3 - t0) / 4.5;
      if (tau > t3) { tau = t3; dir = -1; } else if (tau < t0) { tau = t0; dir = 1; }
      tl.set(tau); render(t);
    });
    return { load: (id) => { const s = GAL.keys.find((k) => k.id === id); if (s) load(s); } };
  }

  // ================================================================== 2. rendered clips
  // dense-in-time renders: a grid sheet of clip.dense.n frames (sub per video frame), RayRoPE ('b') and GALILEO ('g')
  const DKEY = { RayRoPE: 'b', GALILEO: 'g' };
  const denseCache = {};
  function loadDense(c) {
    if (!c.dense) return Promise.resolve(null);
    if (!denseCache[c.id]) denseCache[c.id] = Promise.all([loadImg(c.dense.b), loadImg(c.dense.g)]).then(([b, g]) => ({ b, g })).catch(() => null);
    return denseCache[c.id];
  }
  // source rectangle origin of `method` at time t (in video frames): the dense sheet when it has one, else the 30 fps sheet
  function frameSrc(c, sheet, dense, method, t) {
    const k = DKEY[method];
    if (dense && k) { const i = Math.max(0, Math.min(c.dense.n - 1, Math.round(t * c.dense.sub))); return [dense[k], (i % c.dense.cols) * 256, Math.floor(i / c.dense.cols) * 256]; }
    const fi = Math.max(0, Math.min(c.n - 1, Math.round(t)));
    return [sheet, fi * 256, c.methods.indexOf(method) * 256];
  }

  function player() {
    const NAME = { RayRoPE: 'RayRoPE', URoPE: 'URoPE', GTA: 'GTA', PRoPE: 'PRoPE', Plucker: 'Plücker' };
    const cvs = { gt: $('pl-gt'), b: $('pl-b'), g: $('pl-g') };
    const off = document.createElement('canvas'); off.width = off.height = 512;
    let clip = null, sheet = null, dense = null, t = 0, playing = !REDUCED, base = 'RayRoPE', outline = true, tl = null, token = 0;
    let zoom = [0, 0, 256], mode = 'image', hold = null;
    const ours = () => (base === 'URoPE' ? 'URoPE_G' : 'GALILEO');
    const sub = () => (dense && base === 'RayRoPE' ? clip.dense.sub : 1);          // query times per video frame on screen
    const snap = (v) => { const s = mode === 'error' ? 1 : sub(); return Math.max(0, Math.min(clip.n - 1, Math.round(v * s) / s)); };
    const fN = () => Math.round(t);                                               // nearest video frame (the ground truth's)
    const onFrame = () => Math.abs(t - fN()) < 1e-6;
    const src = (method) => { const [im, x, y] = frameSrc(clip, sheet, dense, method, t); return [im, x + zoom[0], y + zoom[1], zoom[2], zoom[2]]; };

    function panel(key, method) {
      const cv = cvs[key], ctx = cv.getContext('2d'), W = cv.width, flipped = hold === key;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.globalCompositeOperation = 'source-over';
      if (mode === 'error' && key !== 'gt' && !flipped) {   // |render - truth|, amplified 4x, without reading pixels back
        const o = off.getContext('2d'); o.globalCompositeOperation = 'source-over'; o.drawImage(...src('GT'), 0, 0, 512, 512);
        o.globalCompositeOperation = 'difference'; o.drawImage(...src(method), 0, 0, 512, 512);
        o.globalCompositeOperation = 'lighter'; o.drawImage(off, 0, 0); o.drawImage(off, 0, 0);
        ctx.drawImage(off, 0, 0, W, W);
      } else ctx.drawImage(...src(flipped ? 'GT' : method), 0, 0, W, W);
      if (outline) {
        const k = 256 / zoom[2];
        ctx.save(); ctx.translate(-zoom[0] * k * (W / 256), -zoom[1] * k * (W / 256)); strokeOutline(ctx, clip.outline[fN()], k * (W / 256)); ctx.restore();
      }
      if (flipped) { ctx.fillStyle = 'rgba(13,12,21,.8)'; ctx.fillRect(10, 10, 132, 30); ctx.fillStyle = '#fff'; ctx.font = `600 15px ${MONO}`; ctx.textBaseline = 'middle'; ctx.fillText('ground truth', 20, 26); }
      if (key === 'gt' && zoom[2] < 250) {                  // minimap: the whole frame and the region shown
        const m = 132, x = W - m - 10, y = 10, s = m / 256;
        ctx.drawImage(sheet, fN() * 256, 0, 256, 256, x, y, m, m);
        ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.strokeRect(x - .5, y - .5, m + 1, m + 1);
        ctx.strokeStyle = C.now; ctx.lineWidth = 2; ctx.strokeRect(x + zoom[0] * s, y + zoom[1] * s, zoom[2] * s, zoom[2] * s);
      }
    }

    function chart() {
      const { ctx, w, h } = fit($('psnr'), 150);
      const L = 44, Rr = 118, T = 12, Bm = 24, n = clip.n, pb = clip.psnr[base], pg = clip.psnr[ours()], f = fN();
      const vals = pb.concat(pg).filter((v) => v != null), lo = Math.floor(Math.min(...vals) / 2) * 2, hi = Math.ceil(Math.max(...vals) / 2) * 2;
      const X = (i) => L + (i / (n - 1)) * (w - L - Rr), Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (h - T - Bm);
      chart.seek = (px) => Math.max(0, Math.min(n - 1, Math.round(((px - L) / (w - L - Rr)) * (n - 1))));
      ctx.font = `13.5px ${MONO}`; ctx.textBaseline = 'middle';
      for (const v of [lo, (lo + hi) / 2, hi]) { ctx.strokeStyle = C.soft; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - Rr, Y(v)); ctx.stroke(); ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.fillText(v.toFixed(0) + ' dB', L - 8, Y(v)); }
      clip.inputs.forEach((fi, k) => { ctx.fillStyle = C.t[k]; ctx.fillRect(X(fi) - 1, T, 2, h - T - Bm); ctx.textAlign = 'center'; ctx.fillText('t' + SUB[k], X(fi), h - 9); });
      // the gap between the two curves, filled where both exist
      ctx.fillStyle = C.now; ctx.globalAlpha = 0.13;
      for (let i = 0; i < n - 1; i++) if (pb[i] != null && pb[i + 1] != null && pg[i] != null && pg[i + 1] != null) { ctx.beginPath(); ctx.moveTo(X(i), Y(pg[i])); ctx.lineTo(X(i + 1), Y(pg[i + 1])); ctx.lineTo(X(i + 1), Y(pb[i + 1])); ctx.lineTo(X(i), Y(pb[i])); ctx.fill(); }
      ctx.globalAlpha = 1;
      const line = (p, col, label) => {
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; let open = false, lastI = -1;
        ctx.beginPath();
        p.forEach((v, i) => { if (v == null) { open = false; return; } if (open) ctx.lineTo(X(i), Y(v)); else ctx.moveTo(X(i), Y(v)); open = true; lastI = i; });
        ctx.stroke();
        p.forEach((v, i) => { if (v != null) { ctx.beginPath(); ctx.arc(X(i), Y(v), i === f ? 5 : 2.4, 0, 7); ctx.fill(); } });
        return [label, col, lastI < 0 ? null : Y(p[lastI])];
      };
      const labs = [line(pb, C.base, NAME[base]), line(pg, C.now, base === 'URoPE' ? 'URoPE + GALILEO' : '+ GALILEO')].filter((l) => l[2] != null);
      if (labs.length === 2 && Math.abs(labs[0][2] - labs[1][2]) < 14) { const m = (labs[0][2] + labs[1][2]) / 2, s = labs[0][2] < labs[1][2] ? -1 : 1; labs[0][2] = m + 7 * s; labs[1][2] = m - 7 * s; }
      ctx.textAlign = 'left'; ctx.font = `600 14.5px ${MONO}`;
      for (const [tx, col, y] of labs) { ctx.fillStyle = col; ctx.fillText(tx, w - Rr + 10, y); }
      ctx.strokeStyle = C.fg; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), h - Bm); ctx.stroke(); ctx.globalAlpha = 1;
      if (pb[f] != null && pg[f] != null) { ctx.fillStyle = C.fg; ctx.textAlign = X(f) > w - Rr - 90 ? 'right' : 'left'; ctx.font = `600 14.5px ${MONO}`; ctx.fillText(`+${(pg[f] - pb[f]).toFixed(1)} dB`, X(f) + (ctx.textAlign === 'right' ? -8 : 8), (Y(pb[f]) + Y(pg[f])) / 2); }
    }

    function render() {
      if (!clip) return;
      panel('gt', 'GT'); panel('b', base); panel('g', ours());
      const f = fN(), k = clip.inputs.indexOf(f), pb = clip.psnr[base][f], pg = clip.psnr[ours()][f];
      const what = !onFrame() ? 'between video frames' : k >= 0 && clip.isInput[f] ? 'input t' + SUB[k] : 'held out';
      $('pl-frame').textContent = `frame ${(t + 1).toFixed(sub() > 1 ? 1 : 0)}/${clip.n} · ${what}`;
      $('pl-pb').textContent = pb == null ? '' : `PSNR_dyn ${fmt(pb)} dB`; $('pl-pg').textContent = pg == null ? '' : `PSNR_dyn ${fmt(pg)} dB`;
      $('pl-gname').textContent = base === 'URoPE' ? 'URoPE + GALILEO' : 'RayRoPE + GALILEO';
      chart();
    }
    function setZoom(z) { const s = Math.max(48, Math.min(256, z[2])); zoom = [Math.max(0, Math.min(256 - s, z[0])), Math.max(0, Math.min(256 - s, z[1])), s]; render(); }
    function zoomBy(k) { const s = Math.max(48, Math.min(256, zoom[2] * k)); setZoom([zoom[0] + (zoom[2] - s) / 2, zoom[1] + (zoom[2] - s) / 2, s]); }

    async function load(c) {
      const my = ++token, im = await loadImg(c.src);
      if (my !== token) return;
      clip = c; sheet = im; dense = null; t = Math.min(t, c.n - 1); zoom = c.zoom.slice();
      const sel = $('pl-base'), opts = Object.keys(NAME).filter((m) => c.methods.includes(m));
      if (!opts.includes(base)) base = 'RayRoPE';
      sel.innerHTML = opts.map((m) => `<option value="${m}"${m === base ? ' selected' : ''}>${NAME[m]}</option>`).join('');
      tl = timeline($('pl-track'), { min: 0, max: c.n - 1, onInput: (v) => { t = snap(v); tl.set(t); setPlay(false); render(); }, ticks: c.inputs.map((v, i) => ({ v, color: C.t[i], label: 't' + SUB[i] })) });
      t = snap(t); tl.set(t); render();
      loadDense(c).then((d) => { if (my === token && d) { dense = d; render(); } });
    }
    function setPlay(p) { playing = p; $('pl-play').textContent = p ? '❚❚' : '▶'; $('pl-play').setAttribute('aria-label', p ? 'Pause' : 'Play'); }
    $('pl-play').onclick = () => setPlay(!playing);
    $('pl-base').onchange = (e) => { base = e.target.value; t = snap(t); render(); };
    $('pl-outline').onchange = (e) => { outline = e.target.checked; render(); };
    $('pl-zin').onclick = () => zoomBy(1 / 1.35); $('pl-zout').onclick = () => zoomBy(1.35); $('pl-zreset').onclick = () => setZoom(clip.zoom.slice());
    document.querySelectorAll('#player [data-mode]').forEach((b) => { b.onclick = () => { mode = b.dataset.mode; document.querySelectorAll('#player [data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b)); t = snap(t); render(); }; });
    const step = (d) => { setPlay(false); const s = mode === 'error' ? 1 : sub(), n = (clip.n - 1) * s + 1; t = ((Math.round(t * s) + d + n) % n) / s; tl.set(t); render(); };
    $('pl-prev').onclick = () => step(-1); $('pl-next').onclick = () => step(1);
    // drag = pan the zoomed region; press and hold on a rendering = flip to the ground truth
    for (const key of ['gt', 'b', 'g']) {
      const cv = cvs[key]; let start = null, moved = false;
      cv.onpointerdown = (e) => { start = [e.clientX, e.clientY, zoom[0], zoom[1]]; moved = false; cv.setPointerCapture(e.pointerId); if (key !== 'gt') { hold = key; render(); } };
      cv.onpointermove = (e) => {
        if (!start) return;
        const dx = e.clientX - start[0], dy = e.clientY - start[1];
        if (!moved && Math.hypot(dx, dy) < 6) return;
        moved = true; hold = null; const k = zoom[2] / cv.clientWidth; setZoom([start[2] - dx * k, start[3] - dy * k, zoom[2]]);
      };
      cv.onpointerup = cv.onpointercancel = () => { start = null; if (hold) { hold = null; render(); } };
      cv.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.shiftKey) return; e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    }
    const pc = $('psnr'); let seeking = false;
    const seek = (e) => { if (!chart.seek) return; t = chart.seek(e.clientX - pc.getBoundingClientRect().left); setPlay(false); tl.set(t); render(); };
    pc.onpointerdown = (e) => { seeking = true; pc.setPointerCapture(e.pointerId); seek(e); };
    pc.onpointermove = (e) => seeking && seek(e); pc.onpointerup = pc.onpointercancel = () => { seeking = false; };
    let pos = 0;                                            // continuous play position, in video frames
    whileVisible($('player'), (dt) => {
      if (!clip || !playing || hold) return;
      if (Math.abs(pos - t) > 1) pos = t;
      pos += dt * +$('pl-speed').value;                     // the select's value is video frames per second
      if (pos > clip.n - 1 + 0.5) pos = 0;
      const nt = snap(pos);
      if (nt !== t) { t = nt; tl.set(t); render(); }
    });
    addEventListener('resize', () => clip && chart());

    return { load: (id) => { const c = GAL.clips.find((x) => x.id === id); if (c) load(c); } };
  }

  // ================================================================== the merged figure: one sample list, three views
  // the samples of the space-time slices; each view loads the chosen sample when it is first shown
  function demo(api) {
    const VIEWS = { player: api.player, xt: api.spacetime, keys: api.keysDemo };
    const ids = ['train', 'singer', 'car', 'float', 'fish', 'traveler', 'soviet', 'walker'];
    const list = ids.map((id) => GAL.clips.find((c) => c.id === id)).filter((c) => c && GAL.keys.some((k) => k.id === c.id));
    let view = 'player', clip = list[0].id;
    const loaded = {}, btns = [];
    function show() {
      for (const v of Object.keys(VIEWS)) { $(v).hidden = v !== view; $('tab-' + v).setAttribute('aria-selected', v === view); }
      btns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === clip));
      if (VIEWS[view] && loaded[view] !== clip) { VIEWS[view].load(clip); loaded[view] = clip; }
      dispatchEvent(new Event('resize'));                   // charts in a pane that was hidden take their width again
    }
    const host = $('demo-clips');                            // one row, no grouping by dataset
    for (const c of list) {
      const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = c.label; b.dataset.id = c.id;
      b.title = c.dataset === 'Stereo4D' ? 'Stereo4D, real video' : c.dataset;
      b.onclick = () => { clip = c.id; show(); }; host.appendChild(b); btns.push(b);
    }
    document.querySelectorAll('#demo .view-tab').forEach((t) => {
      t.onclick = () => { view = t.dataset.view; show(); };
      t.onkeydown = (e) => {
        const tabs = [...document.querySelectorAll('#demo .view-tab')], i = tabs.indexOf(t), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); e.preventDefault(); }
      };
    });
    show();
  }

  // ================================================================== 3. space-time slices
  // per column: the rendering at the query time, and under it one image row stacked over time (time up)
  function spacetime() {
    const items = ['train', 'singer', 'car', 'float', 'fish', 'traveler', 'soviet', 'walker'].map((id) => GAL.clips.find((c) => c.id === id)).filter(Boolean);
    const W = 512, H = 400, COLS = [['gt', 'GT'], ['b', 'RayRoPE'], ['g', 'GALILEO']];
    const cache = Object.fromEntries(COLS.map(([k]) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [k, c]; }));
    let cur = null, sheet = null, dense = null, fps = 300, row = 128, t = 0, pos = 0, playing = !REDUCED, tl = null, token = 0;
    const yOf = (v) => H * (1 - (v + 0.5) / cur.n);
    const tOf = (y) => (1 - y / H) * cur.n - 0.5;
    const sub = () => (dense && fps === 300 ? cur.dense.sub : 1);
    const snap = (v) => Math.max(0, Math.min(cur.n - 1, Math.round(v * sub()) / sub()));
    const srcAt = (method, v) => frameSrc(cur, sheet, sub() > 1 ? dense : null, method, v);

    function reslice() {                                    // the slices change only with the clip, the row and the rate
      for (const [k, method] of COLS) {
        const ctx = cache[k].getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const s = method === 'GT' ? 1 : sub(), n = (cur.n - 1) * s + 1, hh = H / (cur.n * s);
        for (let i = 0; i < n; i++) { const [im, x, y] = srcAt(method, i / s); const y0 = i === n - 1 ? 0 : yOf(i / s) - hh / 2, y1 = i === 0 ? H : yOf(i / s) + hh / 2 + 0.6; ctx.drawImage(im, x, y + row, 256, 1, 0, y0, W, y1 - y0); }
        cur.inputs.forEach((fi, j) => { ctx.fillStyle = C.t[j]; ctx.fillRect(0, yOf(fi) - 2, 18, 4); });
      }
    }
    function render() {
      if (!cur) return;
      for (const [k, method] of COLS) {
        const s = $('xt-' + k).getContext('2d'); s.drawImage(cache[k], 0, 0);
        s.fillStyle = 'rgba(0,0,0,.55)'; s.fillRect(0, yOf(t) - 2, W, 4); s.fillStyle = '#fff'; s.fillRect(0, yOf(t) - 1, W, 2);
        const f = $('xt-f' + k).getContext('2d'), [im, x, y] = srcAt(method, t);
        f.imageSmoothingEnabled = true; f.drawImage(im, x, y, 256, 256, 0, 0, W, W);
        f.fillStyle = 'rgba(0,0,0,.5)'; f.fillRect(0, row * 2 - 1, W, 4); f.fillStyle = '#fff'; f.fillRect(0, row * 2, W, 2);
        if (k === 'gt') { f.beginPath(); f.arc(W - 22, row * 2 + 1, 11, 0, 7); f.fillStyle = C.now; f.fill(); f.fillStyle = C.ink; f.font = `700 13px ${MONO}`; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillText('↕', W - 22, row * 2 + 2); }
      }
      const k = cur.inputs.indexOf(Math.round(t)), on = Math.abs(t - Math.round(t)) < 1e-6;
      $('xt-read').textContent = `frame ${(t + 1).toFixed(1)}/${cur.n} · ${on && k >= 0 ? 'input t' + SUB[k] : on ? 'video frame' : 'between frames'} · row ${row}`;
    }
    function setPlay(p) { playing = p; $('xt-play').textContent = p ? '❚❚' : '▶'; $('xt-play').setAttribute('aria-label', p ? 'Pause' : 'Play'); }
    async function load(c) {
      const my = ++token, im = await loadImg(c.src);
      if (my !== token) return;
      cur = c; sheet = im; dense = null; row = Math.round(c.zoom[1] + c.zoom[2] * 0.55); t = pos = 0;
      tl = timeline($('xt-track'), { min: 0, max: c.n - 1, onInput: (v) => { t = snap(v); tl.set(t); setPlay(false); render(); }, ticks: c.inputs.map((v, i) => ({ v, color: C.t[i], label: 't' + SUB[i] })) });
      reslice(); render();
      loadDense(c).then((d) => { if (my === token && d) { dense = d; reslice(); render(); } });
    }
    $('xt-play').onclick = () => setPlay(!playing);
    document.querySelectorAll('#xt [data-fps]').forEach((b) => { b.onclick = () => { fps = +b.dataset.fps; document.querySelectorAll('#xt [data-fps]').forEach((x) => x.setAttribute('aria-pressed', x === b)); if (cur) { t = snap(t); reslice(); render(); } }; });
    for (const [k] of COLS) {
      const sc = $('xt-' + k), fc = $('xt-f' + k); let ds = false, df = false;
      const setT = (e) => { const r = sc.getBoundingClientRect(); t = snap(tOf(((e.clientY - r.top) / r.height) * H)); tl.set(t); setPlay(false); render(); };
      sc.onpointerdown = (e) => { ds = true; sc.setPointerCapture(e.pointerId); setT(e); };
      sc.onpointermove = (e) => ds && setT(e); sc.onpointerup = sc.onpointercancel = () => { ds = false; };
      const setRow = (e) => { const r = fc.getBoundingClientRect(); row = Math.max(0, Math.min(255, Math.round(((e.clientY - r.top) / r.height) * 256))); reslice(); render(); };
      fc.onpointerdown = (e) => { df = true; fc.setPointerCapture(e.pointerId); setRow(e); };
      fc.onpointermove = (e) => df && setRow(e); fc.onpointerup = fc.onpointercancel = () => { df = false; };
    }
    whileVisible($('xt'), (dt) => {
      if (!cur || !playing) return;
      if (Math.abs(pos - t) > 1) pos = t;
      pos += dt * 3;                                        // 0.1x: three video frames a second
      if (pos > cur.n - 1 + 0.5) pos = 0;
      const nt = snap(pos);
      if (nt !== t) { t = nt; tl.set(t); render(); }
    });
    return { load: (id) => { const c = items.find((x) => x.id === id); if (c) load(c); } };
  }

  // ================================================================== 4. attention
  function attention() {
    // two rows (RayRoPE, GALILEO) x the four input frames, all cropped to one region around every candidate place
    let cur = null, atlas = null, gt = null, token = 0, layer = -1, crop = [0, 0, 256];  // layer -1: mean of layers 2..6
    const heatCv = document.createElement('canvas'); heatCv.width = heatCv.height = 32;
    const ramp = (v) => { const a = Math.min(0.9, Math.pow(v, 0.7) * 1.15); return [255, Math.round(120 + 135 * Math.pow(v, 0.7)), Math.round(40 + 190 * Math.pow(v, 2.2)), Math.round(255 * a)]; };
    const grid = $('att-grid'), cells = {};
    grid.innerHTML = '<div></div>' + [0, 1, 2, 3].map((k) => `<div class="ch">input t${SUB[k]}</div>`).join('');
    for (const [key, name, cls] of [['b', 'RayRoPE', 'b'], ['g', '+ GALILEO', 'g']]) {
      const h = document.createElement('div'); h.className = 'rh ' + cls; h.textContent = name; grid.appendChild(h);
      for (let k = 0; k < 4; k++) {
        const d = document.createElement('div'), cv = document.createElement('canvas'), sh = document.createElement('div');
        cv.width = cv.height = 360; sh.className = 'sh'; d.append(cv, sh); grid.appendChild(d); cells[key + k] = { cv, sh };
      }
    }
    function region(c) {                                    // a square around all places of all four frames
      const pts = c.views.filter((v) => v.ok).flatMap((v) => [v.ps, v.pt]);
      if (!pts.length) return [0, 0, 256];
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      const sz = Math.min(256, Math.max(64, Math.ceil((Math.max(w, h) + 40) / 8) * 8));
      const cl = (m) => Math.max(0, Math.min(256 - sz, Math.round((m - sz / 2) / 8) * 8));
      return [cl((Math.max(...xs) + Math.min(...xs)) / 2), cl((Math.max(...ys) + Math.min(...ys)) / 2), sz];
    }
    function cell(key, k) {
      const { cv, sh } = cells[key + k], ctx = cv.getContext('2d'), W = cv.width, v = cur.views[k], [cx, cy, cs] = crop, S = W / cs;
      ctx.imageSmoothingEnabled = true; ctx.filter = 'grayscale(1)'; ctx.drawImage(atlas, k * 256 + cx, cy, cs, cs, 0, 0, W, W); ctx.filter = 'none';
      ctx.fillStyle = 'rgba(13,12,21,.55)'; ctx.fillRect(0, 0, W, W);
      const m = u8(layer < 0 ? v[key] : v[key + 'L'][layer]), id = heatCv.getContext('2d').createImageData(32, 32);
      let peak = 1, arg = 0; for (let i = 0; i < 1024; i++) if (m[i] > peak) { peak = m[i]; arg = i; }
      for (let i = 0; i < 1024; i++) id.data.set(ramp(m[i] / peak), i * 4);
      heatCv.getContext('2d').putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(heatCv, cx / 8, cy / 8, cs / 8, cs / 8, 0, 0, W, W); ctx.imageSmoothingEnabled = true;
      const ax = ((arg % 32) * 8 - cx) * S, ay = (Math.floor(arg / 32) * 8 - cy) * S;
      ctx.lineWidth = 3; ctx.strokeStyle = key === 'g' ? C.now : C.base; ctx.strokeRect(ax + 1.5, ay + 1.5, 8 * S - 3, 8 * S - 3);
      if (v.ok) {
        const r = Math.max(3.2, 4.2) * S;
        const ring = (p, col, dash) => { ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc((p[0] - cx) * S, (p[1] - cy) * S, r, 0, 7); ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = col; if (dash) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc((p[0] - cx) * S, (p[1] - cy) * S, r, 0, 7); ctx.stroke(); ctx.restore(); };
        ring(v.ps, '#fff', true); ring(v.pt, C.now, false);
      }
      const c = layer < 0 ? v[key + 'c'] : (v[key + 'Lc'] || [])[layer], s = layer < 0 ? v[key + 's'] : (v[key + 'Ls'] || [])[layer];
      sh.innerHTML = c == null ? 'places &lt; 10 px apart' : `content <b${c > s ? ' class="g"' : ''}>${(c * 100).toFixed(0)}%</b> · static <b${s >= c ? ' style="color:var(--fg)"' : ''}>${(s * 100).toFixed(0)}%</b>`;
      return arg;
    }
    function render() {
      if (!cur) return;
      const peaks = { b: [], g: [] };
      for (const key of ['b', 'g']) for (let k = 0; k < 4; k++) peaks[key].push(cell(key, k));
      const cv = $('att-q'), ctx = cv.getContext('2d'), S = cv.width / 256, x = (cur.q % 32) * 8, y = Math.floor(cur.q / 32) * 8, [cx, cy, cs] = crop;
      ctx.drawImage(gt, 0, 0, cv.width, cv.width); ctx.fillStyle = 'rgba(13,12,21,.45)'; ctx.fillRect(0, 0, cv.width, cv.width);
      ctx.drawImage(gt, x - 12, y - 12, 32, 32, (x - 12) * S, (y - 12) * S, 32 * S, 32 * S);
      ctx.strokeStyle = C.now; ctx.lineWidth = 2.5; ctx.strokeRect(x * S, y * S, 8 * S, 8 * S);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.strokeRect(cx * S, cy * S, cs * S, cs * S); ctx.setLineDash([]);
      // per input frame where the two places are >= 10 px apart: is the most-attended token nearer the content or the static place?
      const side = (key) => { let n = 0, toC = 0; cur.views.forEach((v, k) => { const c = layer < 0 ? v[key + 'c'] : (v[key + 'Lc'] || [])[layer]; if (!v.ok || c == null) return; const a = peaks[key][k], x = (a % 32) * 8 + 4, y = Math.floor(a / 32) * 8 + 4; n++; if (Math.hypot(x - v.pt[0], y - v.pt[1]) < Math.hypot(x - v.ps[0], y - v.ps[1])) toC++; }); return [toC, n]; };
      const [bc, bn] = side('b'), [gc, gn] = side('g');
      if ($('att-say')) $('att-say').textContent = bn ? `Most-attended token nearer the patch's real content than its static place: RayRoPE in ${bc} of ${bn} input frames, GALILEO in ${gc} of ${gn}.` : '';
    }
    async function load(c) {
      const my = ++token, [a, g] = await Promise.all([loadImg(c.atlas), loadImg(c.gt)]);
      if (my !== token) return;
      cur = c; atlas = a; gt = g; crop = region(c); render();
    }
    chips($('att-layers-chips'), [{ label: 'Layers 2–6', l: -1 }].concat([0, 1, 2, 3, 4, 5].map((l) => ({ label: 'L' + (l + 1), l }))), (it) => { layer = it.l; render(); });
    chips($('att-chips'), GAL.attention, load);
    load(GAL.attention[0]);

    // aggregate bars
    const st = GAL.attentionStats, rows = [['RayRoPE', 'at the static place', st.rayrope[1], C.base], ['RayRoPE', 'at the content', st.rayrope[0], C.base],
      ['+ GALILEO', 'at the static place', st.galileo[1], C.now], ['+ GALILEO', 'at the content', st.galileo[0], C.now]];
    $('att-bars').innerHTML = rows.map(([m, w, v, col], i) => `${i === 2 ? '<div style="height:6px"></div>' : ''}<div class="bar"><span style="color:${col};font-weight:600">${m}</span><div><div style="font-size:12.5px;margin-bottom:3px">${w}</div><div class="track"><div class="fill" style="width:${(v / 0.25) * 100}%;background:${col};opacity:${w.includes('content') ? 1 : 0.45}"></div></div></div><span class="v">${(v * 100).toFixed(1)}%</span></div>`).join('');

    function layers() {
      const { ctx, w, h } = fit($('att-layers'), 200), L = 40, R = 96, T = 14, B = 28, d = GAL.layers, hi = 0.3;
      const X = (i) => L + (i / 5) * (w - L - R), Y = (v) => T + (1 - v / hi) * (h - T - B);
      ctx.font = `13.5px ${MONO}`; ctx.textBaseline = 'middle';
      for (const v of [0, 0.1, 0.2, 0.3]) { ctx.strokeStyle = C.soft; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.fillText((v * 100).toFixed(0) + '%', L - 8, Y(v)); }
      ctx.textAlign = 'center'; for (let i = 0; i < 6; i++) ctx.fillText('L' + (i + 1), X(i), h - 10);
      for (const [p, col, lab] of [[d.nt_b, C.base, 'RayRoPE'], [d.nt_g, C.now, '+ GALILEO']]) {
        ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); p.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
        p.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Y(v), 3, 0, 7); ctx.fill(); });
        ctx.textAlign = 'left'; ctx.font = `600 14.5px ${MONO}`; ctx.fillText(lab, w - R + 10, Y(p[5])); ctx.font = `13.5px ${MONO}`;
      }
    }
    layers(); addEventListener('resize', layers);
  }

  // ================================================================== 5. boost test
  function boost() {
    let cur = null, sheet = null, step = 0, steps = [], token = 0;
    const st = GAL.boostStats;
    function chart() {
      const { ctx, w, h } = fit($('bst-chart'), 300), L = 48, R = 100, T = 14, B = 34, lo = 20, hi = 32;
      const X = (px) => L + (px / 32) * (w - L - R), Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (h - T - B);
      ctx.font = `13.5px ${MONO}`; ctx.textBaseline = 'middle';
      for (let v = lo; v <= hi; v += 4) { ctx.strokeStyle = C.soft; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.fillText(v + ' dB', L - 8, Y(v)); }
      ctx.textAlign = 'center'; for (const px of st.px) ctx.fillText(px.toFixed(0), X(px), h - 20);
      ctx.fillText('drift over the input window (px)', L + (w - L - R) / 2, h - 6);
      const s = steps[step];
      if (s && s.label[0] === 'x') { ctx.strokeStyle = C.fg; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(X(s.px), T); ctx.lineTo(X(s.px), h - B); ctx.stroke(); ctx.globalAlpha = 1; }
      for (const [p, col, lab] of [[st.rayrope_static, C.base, 'RayRoPE'], [st.galileo_static, C.now, '+ GALILEO']]) {
        ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); p.forEach((v, i) => (i ? ctx.lineTo(X(st.px[i]), Y(v)) : ctx.moveTo(X(st.px[i]), Y(v)))); ctx.stroke();
        p.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(st.px[i]), Y(v), s && s.label[0] === 'x' && s.px === st.px[i] ? 5 : 3, 0, 7); ctx.fill(); });
        ctx.textAlign = 'left'; ctx.font = `600 14.5px ${MONO}`; ctx.fillText(lab, w - R + 10, Y(p[4])); ctx.font = `13.5px ${MONO}`;
      }
    }
    function render() {
      if (!cur) return;
      const s = steps[step], col = cur.rows.indexOf(s);
      [['bst-b', 0, 'b'], ['bst-g', 1, 'g']].forEach(([id, row, key]) => {
        const cv = $(id), ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sheet, col * 256, row * 256, 256, 256, 0, 0, cv.width, cv.width); strokeOutline(ctx, cur.outline, cv.width / 256);
        $('bst-p' + key).textContent = `static ${fmt(s[key][0])} · moving ${fmt(s[key][1])} dB`;
      });
      const r0 = cur.rows[0], d = (k, j) => { const v = s[k][j] - r0[k][j]; return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' dB'; };
      if ($('bst-note')) $('bst-note').innerHTML = s.label === 'obj1'
        ? `<b>Frame moving with the object.</b> Background: RayRoPE ${d('b', 0)}, GALILEO ${d('g', 0)}.`
        : s.px === 0 ? `<b>Original frame.</b> White line: the moving region.`
          : `<b>Drift ${s.px.toFixed(0)} px.</b> Static region: RayRoPE ${d('b', 0)}, GALILEO ${d('g', 0)}.`;
      chart();
    }
    async function load(c) {
      const my = ++token, im = await loadImg(c.src);
      if (my !== token) return;
      cur = c; sheet = im; steps = c.rows.filter((r) => r.label !== 'obj0.5');
      step = Math.min(step, steps.length - 1);
      chips($('bst-steps'), steps.map((r) => ({ label: r.label === 'obj1' ? 'object at rest' : r.px.toFixed(0) + ' px' })), (it, i) => { step = i; render(); }, step);
      render();
    }
    chips($('bst-chips'), GAL.boost, load);
    step = 3; load(GAL.boost[0]);
    addEventListener('resize', () => cur && chart());
  }

  // ================================================================== 6. tables
  function tables() {
    const main = [
      ['Plücker', '23.59', '29.17', '1.52', '.918', '1.047', '–', '–', '–', '–', '–', '19.20', '21.72', '2.79', '.616', '2.632'],
      ['PRoPE', '24.06', '29.95', '1.44', '.926', '0.741', '16.73', '27.51', '1.31', '.748', '0.250', '19.34', '22.57', '2.39', '.635', '2.590'],
      ['GTA', '24.15', '30.07', '1.41', '.928', '0.726', '16.81', '27.76', '1.41', '.755', '0.184', '19.28', '22.46', '2.31', '.632', '2.789'],
      ['URoPE', '24.61', '30.73', '1.08', '.939', '0.493', '16.33', '27.07', '1.44', '.730', '0.236', '19.66', '22.99', '2.18', '.627', '1.410', 'rule'],
      ['+ GALILEO', '25.41', '31.00', '0.89', '.950', '0.391', '16.70', '27.25', '1.30', '.739', '0.197', '20.14', '23.11', '1.82', '.637', '0.787', 'ours'],
      ['Δ', '+0.79', '+0.27', '−0.19', '+.011', '−0.102', '+0.37', '+0.18', '−0.14', '+.010', '−0.039', '+0.49', '+0.12', '−0.37', '+.010', '−0.622', 'delta'],
      ['RayRoPE', '24.61', '31.04', '1.04', '.947', '0.466', '16.67', '27.42', '1.53', '.743', '0.346', '19.88', '23.17', '2.19', '.639', '1.075', 'rule'],
      ['+ GALILEO', '25.78', '31.34', '0.80', '.958', '0.343', '17.96', '28.25', '1.12', '.770', '0.268', '20.82', '23.51', '1.65', '.668', '0.380', 'ours'],
      ['Δ', '+1.16', '+0.30', '−0.24', '+.010', '−0.122', '+1.29', '+0.83', '−0.41', '+.026', '−0.078', '+0.94', '+0.34', '−0.53', '+.029', '−0.695', 'delta'],
    ];
    const cols = ['PSNR<sub>dyn</sub>↑', 'PSNR↑', 'tOF↓', 'δ<sub>avg</sub>↑', 'JEDi↓'];
    const sep = (j) => (j % 5 === 0 ? ' class="sep"' : '');
    $('tab-main').innerHTML = `<table><thead><tr><th></th><th colspan="5" class="sep">Stereo4D · real</th><th colspan="5" class="sep">Objaverse</th><th colspan="5" class="sep">Syn4D</th></tr><tr><th>Encoding</th>${[0, 1, 2].map(() => cols.map((c, j) => `<th${sep(j)}>${c}</th>`).join('')).join('')}</tr></thead><tbody>${main.map((r) => `<tr class="${r[16] || ''}">${r.slice(0, 16).map((c, j) => (j ? `<td${sep(j - 1)}>${c}</td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;

    const off = [['Syn4D', '20.82', '19.84', '−0.98', '+0.779'], ['Objaverse', '17.96', '16.15', '−1.81', '+0.125'], ['Stereo4D', '25.78', '24.47', '−1.31', '+0.171']];
    $('tab-off').innerHTML = `<table><thead><tr><th>PSNR<sub>dyn</sub></th><th>with transport</th><th>motion off</th><th>Δ</th><th>Δ JEDi↓</th></tr></thead><tbody>${off.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="dn">${r[3]}</td><td class="dn">${r[4]}</td></tr>`).join('')}</tbody></table>`;

    const tr = [['ARROW', '4.89', '6.86', '8.67', '44.6', '35.6', '29.2'], ['+ plain adapter', '4.29', '6.08', '7.64', '47.8', '38.5', '32.0'], ['+ RayRoPE', '3.82', '4.99', '7.16', '50.9', '43.5', '33.8'], ['+ RayRoPE + GALILEO', '3.66', '4.47', '6.68', '51.8', '46.2', '35.6', 'ours']];
    $('tab-track').innerHTML = `<table><thead><tr><th></th><th colspan="3" class="sep">EPE ↓</th><th colspan="3" class="sep">APD ↑</th></tr><tr><th>Model</th><th class="sep">Input</th><th>Between</th><th>After</th><th class="sep">Input</th><th>Between</th><th>After</th></tr></thead><tbody>${tr.map((r) => `<tr class="${r[7] || ''}">${r.slice(0, 7).map((c, j) => `<td${j === 1 || j === 4 ? ' class="sep"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

    const dr = [['Token conditioning', '16.98', '19.73', '16.90', '16.07', '15.70', '.628'], ['+ RayRoPE', '17.01', '19.61', '17.03', '16.20', '15.71', '.660'], ['+ GALILEO', '17.45', '20.11', '17.46', '16.76', '16.04', '.673', 'ours'], ['+ GALILEO, motion off', '16.89', '19.43', '16.84', '16.10', '15.45', '.630']];
    $('tab-drive').innerHTML = `<table><thead><tr><th>Conditioning</th><th>PSNR<sub>dyn</sub></th><th class="sep">0–1 s</th><th>1–2 s</th><th>2–3 s</th><th>3–4 s</th><th class="sep">IoU</th></tr></thead><tbody>${dr.map((r) => `<tr class="${r[7] || ''}">${r.slice(0, 7).map((c, j) => `<td${j === 2 || j === 6 ? ' class="sep"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

    const abl = [['grp', 'Predicted depth'], ['RayRoPE + matching losses, keys not moved', 0.23, ''], ['RayRoPE + velocities as token features', 0.22, ''], ['GALILEO: keys moved', 0.94, 'ours'], ['GALILEO, ground-truth motion', 1.38, 'oracle'],
      ['grp', 'Ground-truth depth (gain over RayRoPE with the same depth)'], ['GALILEO, ground-truth motion', 2.32, 'oracle']];
    $('hb-abl').innerHTML = abl.map((r) => (r[0] === 'grp' ? `<div class="grp">${r[1]}</div>` : `<div class="row ${r[2]}"><span class="lab">${r[0]}</span><div class="tr"><div class="fl" style="width:${(r[1] / 2.9) * 100}%"></div><span class="val" style="left:${(r[1] / 2.9) * 100}%">+${r[1].toFixed(2)} dB</span></div></div>`)).join('');
  }

  // ================================================================== the boost test, animated
  // Plan view in the query camera's frame (the encoding is query-relative), as a schematic. Input times t0..t3 at
  // 0, 1/3, 2/3, 1 of the window and the query at 1/2. A boost adds w*t to every camera position: the photos do not
  // change, but the same static tower is lifted from a camera that sits w*(t_k - t_a) further along at each time.
  // RayRoPE encodes those lifted points as they are; GALILEO's fitted velocity of the tower is w and transport by
  // w*(t_a - t_k) puts every copy back. Numbers: measured static-region PSNR (GAL.boostStats, 80 Stereo4D clips).
  function boostAnim() {
    if (!$('bsx-r')) return;
    const cvs = { r: $('bsx-r'), g: $('bsx-g') }, caps = [...document.querySelectorAll('#bsx .mth-step')];
    const LW = 500, LH = 430, STAGE = [0, 5, 10, 15.5], TOTAL = 23, SP = 240;
    const TT = [0, 1 / 3, 2 / 3, 1], TA = 0.5, X = [338, 196], CAM = [250, 398];
    const SV = 0.45, S = [190, 318], SK = 0.4;                       // the ship: velocity (sails right, bow first), waterline, scale
    const st = GAL.boostStats, scene = shipScene();
    const clamp = (v) => Math.max(0, Math.min(1, v)), ease = (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
    const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
    let t = REDUCED ? STAGE[3] - 0.01 : 0, playing = !REDUCED;
    const SERIF = '"EB Garamond", Garamond, "Times New Roman", serif', MATH = '"STIX Two Text", "Times New Roman", serif';

    function prep(cv) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || LW, k = (w / LW) * dpr;
      const W = Math.round(w * dpr), H = Math.round(w * (LH / LW) * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; return ctx;
    }
    function text(ctx, s, x, y, { size = 15, color = C.fg, align = 'left', italic = false, math = false, alpha = 1, bold = false, halo = false } = {}) {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      ctx.font = `${italic ? 'italic ' : ''}${bold ? '600 ' : ''}${size}px ${math ? MATH : SERIF}`;
      if (halo) { ctx.lineWidth = 4; ctx.strokeStyle = C.sheet; ctx.strokeText(s, x, y); }
      ctx.fillText(s, x, y); ctx.restore();
    }
    function line(ctx, a, b, { color = C.fg, w = 1.4, dash = null, alpha = 1 } = {}) {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
    }
    // parts: [[text, 'p' plain | 'm' math (italic) | 'sub' subscript], ...]
    function mtext(ctx, parts, x, y, { size = 15, color = C.fg, align = 'left', alpha = 1 } = {}) {
      if (alpha <= 0) return;
      const items = parts.map(([str, k]) => ({ str, font: k === 'p' ? `${size}px ${SERIF}` : k === 'sub' ? `italic ${size * 0.68}px ${MATH}` : `italic ${size}px ${MATH}`, dy: k === 'sub' ? size * 0.28 : 0 }));
      let w = 0; for (const it of items) { ctx.font = it.font; it.w = ctx.measureText(it.str).width; w += it.w; }
      let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      for (const it of items) { ctx.font = it.font; ctx.fillText(it.str, cx, y + it.dy); cx += it.w; }
      ctx.restore();
    }
    function arrow(ctx, a, b, opt = {}) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 4 || (opt.alpha ?? 1) <= 0) return;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = opt.head || 7;
      line(ctx, a, [b[0] - Math.cos(ang) * h * 0.6, b[1] - Math.sin(ang) * h * 0.6], opt);
      ctx.save(); ctx.globalAlpha *= opt.alpha ?? 1; ctx.fillStyle = opt.color || C.fg; ctx.beginPath(); ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - Math.cos(ang - 0.42) * h, b[1] - Math.sin(ang - 0.42) * h); ctx.lineTo(b[0] - Math.cos(ang + 0.42) * h, b[1] - Math.sin(ang + 0.42) * h);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function camera(ctx, p, color, s = 1, alpha = 1) {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 10 * s, p[1] - 21 * s); ctx.lineTo(p[0] + 10 * s, p[1] - 21 * s); ctx.closePath();
      ctx.fillStyle = C.sheet; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(p[0], p[1], 4 * s, 0, 7); ctx.fillStyle = color; ctx.fill(); ctx.restore();
    }
    function tower(ctx, x, color, { alpha = 1, fill = true } = {}) {   // the bell tower, standing at plan position x
      if (alpha <= 0) return;
      const y = X[1] + 30, w = 16, h = 50;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = 1.3; ctx.strokeStyle = color;
      ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); if (fill) { ctx.fillStyle = color; ctx.globalAlpha *= 0.28; ctx.fill(); ctx.globalAlpha /= 0.28; } ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - w / 2 - 2, y - h); ctx.lineTo(x + w / 2 + 2, y - h); ctx.lineTo(x, y - h - 16); ctx.closePath(); if (fill) { ctx.globalAlpha *= 0.28; ctx.fill(); ctx.globalAlpha /= 0.28; } ctx.stroke();
      ctx.restore();
    }
    const dot = (ctx, p, color, r = 5, alpha = 1) => { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.sheet; ctx.stroke(); ctx.restore(); };
    const nearest = (px) => st.px.reduce((b, v, i) => (Math.abs(v - px) < Math.abs(st.px[b] - px) ? i : b), 0);

    // f: boost strength, 0..1 of 32 px drift over the input window; pr / pg: progress of RayRoPE's / GALILEO's beats
    function draw(ctx, which, f, pr, pg) {
      const tc = [C.t[0], C.t[1], C.t[2], C.t[3]];
      const off = (k) => f * SP * (TT[k] - TA), key = (k) => [X[0] + off(k), X[1]];                 // the tower at t_k
      const soff = (k) => (SV + f) * SP * (TT[k] - TA), skey = (w0) => [w0[0] + 4 * SK, w0[1] - 48 * SK];  // the ship
      const sw = (k) => [S[0] + soff(k), S[1]];
      const m = which === 'g' ? seg(pg, 0.42, 0.8) : 0, va = which === 'g' ? seg(pg, 0.1, 0.38) * (1 - m) : 0;
      // the same photo at every input time
      for (let k = 0; k < 4; k++) {
        const x = 250 + (k - 1.5) * 62, s = 50;
        ctx.drawImage(scene.still, 0, 40, 256, 216, x - s / 2, 8, s, s * 216 / 256);
        ctx.strokeStyle = tc[k]; ctx.lineWidth = 1.6; ctx.strokeRect(x - s / 2, 8, s, s * 216 / 256);
        text(ctx, 't' + SUB[k], x, 72, { size: 13, color: tc[k], align: 'center', math: true });
      }
      text(ctx, 'the same four photos for every w', 250, 92, { size: 13.5, color: C.faint, align: 'center', italic: true });
      // the new frame: moving at -w relative to the shore
      const sa = clamp(f * 4);
      if (sa > 0) {
        ctx.save(); ctx.globalAlpha = sa; scene.drawShip(ctx, 58, 138, 0.36); ctx.restore();
        arrow(ctx, [84, 148], [84 - 14 - 34 * f, 148], { color: C.gilt, w: 1.6, head: 7, alpha: sa });
        text(ctx, 'new frame, moving at −w', 14, 170, { size: 13, color: C.dim, italic: true, alpha: sa });
      }
      // the camera at the four input times, each with its rays to the tower and to the ship it sees
      const keep = 1 - m * 0.75;
      for (let k = 0; k < 4; k++) {
        const c = [CAM[0] + off(k), CAM[1] + 8], ct = [c[0], c[1] - 16];
        line(ctx, ct, key(k), { color: tc[k], w: 1.1, dash: [3, 3], alpha: 0.8 * keep });
        line(ctx, ct, skey(sw(k)), { color: tc[k], w: 1.1, dash: [3, 3], alpha: 0.8 * keep });
        camera(ctx, c, tc[k], 0.75, 0.95);
      }
      camera(ctx, CAM, C.fg, 1);
      mtext(ctx, [['query camera at ', 'p'], ['t', 'm'], ['a', 'sub']], CAM[0] + 16, CAM[1] + 22, { size: 13.5 });
      mtext(ctx, [['key camera at ', 'p'], ['t', 'm'], ['0', 'sub'], [' … ', 'p'], ['t', 'm'], ['3', 'sub']], CAM[0] - 16, CAM[1] + 22, { size: 13.5, align: 'right', color: C.dim });
      const top = [CAM[0], CAM[1] - 21];
      // where the tower and the ship are for the query camera
      tower(ctx, X[0], C.fg, { fill: false });
      ctx.save(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(skey(S)[0], skey(S)[1], 9, 0, 7); ctx.stroke(); ctx.restore();
      // the keys: where they were lifted (RayRoPE) or moved by their fitted velocity (GALILEO)
      for (let k = 0; k < 4; k++) {
        const p0 = key(k), p = [p0[0] + (X[0] - p0[0]) * m, X[1]];
        const s0 = sw(k), s1 = [s0[0] + (S[0] - s0[0]) * m, S[1]];
        if (m > 0) {
          if (Math.abs(off(k)) > 8) { tower(ctx, p0[0], tc[k], { alpha: 0.16 }); arrow(ctx, [p0[0], X[1] + 60], [p[0], X[1] + 60], { color: C.now, w: 1.6, head: 6, alpha: 0.9 }); }
          if (Math.abs(soff(k)) > 8) { ctx.save(); ctx.globalAlpha = 0.15; scene.drawShip(ctx, s0[0], s0[1], SK); ctx.restore(); arrow(ctx, [s0[0], S[1] + 46], [s1[0], S[1] + 46], { color: C.now, w: 1.6, head: 6, alpha: 0.9 }); }
        }
        tower(ctx, p[0], tc[k], { alpha: 0.75 }); dot(ctx, p, tc[k], 5);
        ctx.save(); ctx.globalAlpha = 0.6; scene.drawShip(ctx, s1[0], s1[1], SK); ctx.restore(); dot(ctx, skey(s1), tc[k], 4.5);
        if (va > 0 && f > 0.02) arrow(ctx, [p0[0], X[1] - 44 - k * 6], [p0[0] + Math.max(14, 0.32 * f * SP), X[1] - 44 - k * 6], { color: C.fg, w: 1.3, head: 6, alpha: va });
        if (va > 0) arrow(ctx, [skey(s0)[0], skey(s0)[1] - 22 - k * 5], [skey(s0)[0] + Math.max(14, 0.32 * (SV + f) * SP), skey(s0)[1] - 22 - k * 5], { color: C.fg, w: 1.3, head: 6, alpha: va });
      }
      if (which === 'r') {
        const fa = seg(pr, 0.1, 0.4), ea = seg(pr, 0.4, 0.7);
        for (let k = 0; k < 4; k++) { line(ctx, top, key(k), { color: C.base, w: 1.3, alpha: 0.8 * fa }); line(ctx, top, skey(sw(k)), { color: C.base, w: 1.3, alpha: 0.8 * fa }); }
        for (let k = 0; k < 4; k++) {
          if (Math.abs(off(k)) > 10) arrow(ctx, [X[0] + Math.sign(off(k)) * 9, X[1] - 52], [key(k)[0], X[1] - 52], { color: C.bad, w: 1.6, head: 6, alpha: ea });
          if (Math.abs(soff(k)) > 10) arrow(ctx, [S[0] + Math.sign(soff(k)) * 9, S[1] + 46], [sw(k)[0], S[1] + 46], { color: C.bad, w: 1.6, head: 6, alpha: ea });
        }
        if (f > 0.15) mtext(ctx, [['−w (t', 'm'], ['a', 'sub'], [' − t', 'm'], ['b', 'sub'], [')', 'm']], key(0)[0] - 4, X[1] - 62, { size: 14, color: C.bad, alpha: ea });
      } else {
        if (va > 0 && f > 0.02) mtext(ctx, [['fitted velocity ', 'p'], ['w', 'm']], key(3)[0] - 4, X[1] - 76, { size: 14, align: 'center', alpha: va });
        if (va > 0) mtext(ctx, [['fitted ', 'p'], ['v + w', 'm']], Math.min(skey(sw(3))[0] + Math.max(14, 0.32 * (SV + f) * SP) + 8, 420), skey(sw(3))[1] - 40, { size: 14, alpha: va });
        if (m > 0.05 && f > 0.15) mtext(ctx, [['+ w (t', 'm'], ['a', 'sub'], [' − t', 'm'], ['b', 'sub'], [')', 'm']], X[0], X[1] + 82, { size: 14, color: C.now, align: 'center', alpha: m });
        if (m > 0.05) mtext(ctx, [['+ (v + w)(t', 'm'], ['a', 'sub'], [' − t', 'm'], ['b', 'sub'], [')', 'm']], S[0], S[1] - 50, { size: 14, color: C.now, align: 'center', alpha: m });
        const qa = seg(pg, 0.8, 0.95);
        line(ctx, top, X, { color: C.now, w: 2.2, alpha: qa }); line(ctx, top, skey(S), { color: C.now, w: 2.2, alpha: qa });
      }
      text(ctx, 'the tower', X[0], X[1] + 47, { size: 13.5, align: 'center', halo: true });
      ctx.save(); ctx.font = `13.5px ${SERIF}`; const lw = ctx.measureText('the ship, sailing at v').width; ctx.restore();
      ctx.save(); ctx.fillStyle = C.sheet; ctx.globalAlpha = 0.85; ctx.fillRect(S[0] - lw / 2 - 4, S[1] + 15, lw + 8, 18); ctx.restore();
      mtext(ctx, [['the ship, sailing at ', 'p'], ['v', 'm']], S[0], S[1] + 28, { size: 13.5, align: 'center' });
    }

    function render() {
      let f, pr = 0, pg = 0, active;
      if (t < STAGE[1]) { f = seg(t, 1, 4) * 0.5; active = 0; }
      else if (t < STAGE[2]) { f = 0.5; pr = (t - STAGE[1]) / (STAGE[2] - STAGE[1]); active = 1; }
      else if (t < STAGE[3]) { f = 0.5; pr = 1; pg = (t - STAGE[2]) / (STAGE[3] - STAGE[2]); active = 2; }
      else { const u = (t - STAGE[3]) / (TOTAL - STAGE[3]); f = 0.5 + 0.5 * Math.sin(u * 2 * Math.PI); pr = pg = 1; active = 3; }   // 16 px -> 32 -> 0 -> 16
      draw(prep(cvs.r), 'r', f, pr, pg); draw(prep(cvs.g), 'g', f, pr, pg);
      caps.forEach((c, k) => c.classList.toggle('on', k === active || (active === 3 && k > 0)));
      const px = f * 32, i = nearest(px);
      $('bsx-drift').textContent = `w: drift over the input window ${px.toFixed(0)} px`;
      const say = (a, b) => `${st.px[i]} px · static ${a[i].toFixed(1)} dB (${(a[i] - a[0]).toFixed(1)}) · moving ${b[i].toFixed(1)} dB (${(b[i] - b[0]).toFixed(1)})`;
      $('bsx-pr').textContent = pr > 0.4 || active === 3 ? say(st.rayrope_static, st.rayrope_moving) : '';
      $('bsx-pg').textContent = pg > 0.8 || active === 3 ? say(st.galileo_static, st.galileo_moving) : '';
    }
    const tl = timeline($('bsx-track'), { min: 0, max: TOTAL, ticks: [{ v: STAGE[0], color: C.fg, label: 'a' }, { v: STAGE[1], color: C.fg, label: 'b' }, { v: STAGE[2], color: C.fg, label: 'c' }, { v: STAGE[3], color: C.now, label: 'sweep w' }], onInput: (v) => { t = Math.min(v, TOTAL - 1e-3); render(); } });
    const setPlay = (on) => { playing = on; $('bsx-play').textContent = on ? '❚❚' : '▶'; $('bsx-play').setAttribute('aria-label', on ? 'Pause' : 'Play'); };
    $('bsx-play').onclick = () => setPlay(!playing);
    caps.forEach((c, k) => { c.onclick = () => { t = STAGE[k]; tl.set(t); setPlay(true); render(); }; });
    setPlay(playing); tl.set(t); render();
    whileVisible($('bsx'), (dt) => { if (playing) { t = (t + dt) % TOTAL; tl.set(t); } render(); });
    addEventListener('resize', render);
  }

  // ================================================================== Galileo's ship, drawn for the method figure
  // An illustration, not model output: the ship of the Dialogue (1632) sails past Venice at constant
  // velocity. Three 256-px frames at t_b - dt, t_b, t_b + dt and the ship cut out of a common box, in the shape the
  // animation expects (frames, cuts, box, the key patch p_b, its token- and pixel-stage matches, x(t) along v_b).
  function shipScene() {
    const N = 256, WL = 156, DX = 21.3, CXB = 120, CX = [CXB - DX, CXB, CXB + DX];
    const INK = '#2a2017', HULL = '#6b4428', SAIL = '#efe4c6', GILT = '#c09a48', RED = '#b8322f';
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const waves = Array.from({ length: 90 }, () => [rnd() * 300 - 20, 121 + Math.pow(rnd(), 1.5) * 134, 3 + rnd() * 9, rnd()]);
    const poly = (g, pts, fill, lw = 1.1) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
    function sail(g, x0, x1, top, bot, belly) {                 // a square sail, bellied forward (to the right)
      g.beginPath(); g.moveTo(x0, top); g.lineTo(x1, top); g.quadraticCurveTo(x1 + belly, (top + bot) / 2, x1 + 1, bot);
      g.lineTo(x0 - 1, bot); g.quadraticCurveTo(x0 + belly, (top + bot) / 2, x0, top); g.closePath();
      g.fillStyle = SAIL; g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();
      g.save(); g.clip(); g.strokeStyle = 'rgba(42,32,23,.18)'; g.lineWidth = 0.7;
      for (let x = x0 + 3; x < x1; x += 3.2) { g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + belly, (top + bot) / 2, x + 1, bot); g.stroke(); }
      g.restore();
    }
    function star(g, x, y, r) {                                 // the emblem on the main sail: the key patch b
      g.beginPath();
      for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 8, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
      g.closePath(); g.fillStyle = RED; g.fill(); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fillStyle = GILT; g.fill();
    }
    function ship(g, cx) {
      const w = WL;
      g.lineCap = 'round'; g.lineJoin = 'round';
      // wake behind the stern
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx - 44 - k * 9, w + 2 + k * 1.6); g.lineTo(cx - 52 - k * 9, w + 2.6 + k * 1.6); g.stroke(); }
      // masts
      g.strokeStyle = '#4a2f1c'; g.lineWidth = 1.8;
      for (const [x, y0, y1] of [[cx + 2, w - 12, w - 82], [cx + 25, w - 12, w - 66], [cx - 30, w - 24, w - 60]]) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
      // sails: mizzen lateen, main course and topsail, fore course
      poly(g, [[cx - 30, w - 60], [cx - 47, w - 28], [cx - 22, w - 28]], SAIL, 1);
      sail(g, cx - 16, cx + 19, w - 64, w - 30, 5);
      sail(g, cx - 11, cx + 14, w - 79, w - 67, 3);
      sail(g, cx + 12, cx + 37, w - 56, w - 28, 4);
      star(g, cx + 4, w - 48, 5.5);
      // pennants at the mast heads, streaming aft
      for (const [x, y] of [[cx + 2, w - 82], [cx + 25, w - 66]]) poly(g, [[x, y], [x - 13, y + 2.5], [x, y + 5]], RED, 0.8);
      // hull: raised stern castle on the left, beakhead at the bow on the right
      poly(g, [[cx - 44, w - 13], [cx - 44, w - 26], [cx - 29, w - 26], [cx - 27, w - 13], [cx + 34, w - 13], [cx + 47, w - 19], [cx + 44, w - 15], [cx + 30, w + 4], [cx - 36, w + 4]], HULL, 1.2);
      g.strokeStyle = GILT; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 42, w - 6); g.lineTo(cx + 36, w - 6); g.stroke();
      g.fillStyle = INK; for (let k = 0; k < 6; k++) g.fillRect(cx - 21 + k * 9, w - 11, 3, 3);
      g.fillStyle = 'rgba(42,32,23,.25)'; g.fillRect(cx - 34, w + 4, 62, 1.6);
    }
    function frame(cx) {
      const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
      g.fillStyle = '#efe6cf'; g.fillRect(0, 0, N, 118);
      g.strokeStyle = 'rgba(150,130,95,.22)'; g.lineWidth = 0.6;
      for (let y = 6; y < 104; y += 4.2) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
      // the distant shore of Venice, with the bell tower of San Marco
      g.fillStyle = '#c8b993'; g.fillRect(0, 111, N, 8);
      g.fillStyle = '#b9a47a'; for (const [x, w, h] of [[8, 22, 9], [34, 16, 6], [56, 26, 8], [150, 30, 7], [228, 24, 9]]) g.fillRect(x, 119 - h - 7, w, h + 7);
      g.fillStyle = '#a5583a'; g.fillRect(166, 80, 9, 39);
      poly(g, [[165, 80], [176, 80], [170.5, 67]], '#7f8a74', 0.9);
      g.strokeStyle = INK; g.lineWidth = 0.9; g.strokeRect(166, 80, 9, 39);
      g.fillStyle = '#b9a47a'; for (const x of [186, 196, 206]) { g.beginPath(); g.arc(x, 112, 5, Math.PI, 0); g.fill(); g.stroke(); }
      // the sea
      const sea = g.createLinearGradient(0, 118, 0, N); sea.addColorStop(0, '#a9b9ab'); sea.addColorStop(1, '#7f9a8e');
      g.fillStyle = sea; g.fillRect(0, 118, N, N - 118);
      g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, 118.5); g.lineTo(N, 118.5); g.stroke();
      for (const [x, y, l, v] of waves) {
        g.strokeStyle = v > 0.7 ? 'rgba(240,244,236,.8)' : 'rgba(55,80,70,.55)'; g.lineWidth = 0.6 + (y - 118) / 140;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - l * 0.22, x + l, y); g.stroke();
      }
      if (cx != null) ship(g, cx);
      return c;
    }
    const box = [Math.floor(CX[0] - 54), WL - 86, Math.ceil(CX[2] + 50), WL + 9];
    function cut(cx) {                                          // the ship alone, on the common box
      const c = document.createElement('canvas'); c.width = (box[2] - box[0]) * 3; c.height = (box[3] - box[1]) * 3;
      const g = c.getContext('2d'); g.scale(3, 3); g.translate(-box[0], -box[1]); ship(g, cx); return c;
    }
    const pb = [CXB + 4, WL - 48];                              // the emblem at t_b, a token centre (8k + 4)
    const at = (cx) => [cx + 4, WL - 48 + 0.4 * Math.sin(cx)];  // where the emblem is in another frame
    const tokc = (p) => [Math.floor(p[0] / 8) * 8 + 4, Math.floor(p[1] / 8) * 8 + 4];
    const m_lo = at(CX[0]), m_hi = at(CX[2]);
    return {
      tb: 0.1, ta: 0.1667, xt: [[0, -1], [0.1, 0], [0.2, 1]], spd: 10, pb, m_lo, m_hi, c_lo: tokc(m_lo), c_hi: tokc(m_hi), box,
      win: [pb[0] - 56, pb[1] - 44, 112],
      frames: { lo: frame(CX[0]), b: frame(CX[1]), hi: frame(CX[2]) }, cuts: { lo: cut(CX[0]), b: cut(CX[1]), hi: cut(CX[2]) },
      still: frame(null),                                         // the shore without the ship (the boost test's photo)
      drawShip: (g, x, y, k) => { g.save(); g.translate(x, y); g.scale(k, k); g.translate(-CXB, -WL); ship(g, CXB); g.restore(); },
    };
  }

  // ================================================================== method, animated (the steps of the paper's Fig. 3)
  // on Galileo's ship (shipScene above), an illustration; the paper's figure shows the same steps on model output.
  function methodAnim() {
    if (!$('mth-a')) return;
    const M = shipScene();
    const cvs = ['mth-a', 'mth-b', 'mth-c'].map($), caps = [...document.querySelectorAll('#mth .mth-step')];
    const LW = 400, LH = 360, STAGE = [0, 4.6, 9.2, 12.8], TOTAL = 20;
    const SERIF = '"EB Garamond", Garamond, "Times New Roman", serif', MATH = '"STIX Two Text", "Times New Roman", serif';
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const ease = (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
    const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
    const lerp2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const img = {}; let ready = false, t = REDUCED ? STAGE[3] - 0.01 : 0, playing = !REDUCED;

    // ---------------------------------------------------------------- drawing helpers (logical 400 x 360 units)
    function prep(cv) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || LW, k = (w / LW) * dpr;
      const W = Math.round(w * dpr), H = Math.round(w * (LH / LW) * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; return ctx;
    }
    function runs(s) {
      const out = [];
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '̂' && out.length) { out[out.length - 1].t += c; continue; }
        if (c === '_') { let tt; if (s[i + 1] === '{') { const k = s.indexOf('}', i); tt = s.slice(i + 2, k); i = k; } else { tt = s[i + 1]; i++; } out.push({ t: tt, sub: true, it: /[a-z]/i.test(tt) }); continue; }
        out.push({ t: c, sub: false, it: /[a-zA-Z]/.test(c) });
      }
      return out;
    }
    // parts: [[text, 'm' (math: italic letters, _subscripts) | 'p' (plain)], ...]
    function lab(ctx, parts, x, y, { size = 15, color = C.fg, align = 'left', bold = false, halo = false, alpha = 1 } = {}) {
      if (alpha <= 0) return;
      const items = [];
      for (const [s, kind] of parts) {
        if (kind === 'p') items.push({ t: s, font: `${bold ? '600 ' : ''}${size}px ${SERIF}`, dy: 0 });
        else for (const r of runs(s)) items.push({ t: r.t, font: `${r.it ? 'italic ' : ''}${bold ? '600 ' : ''}${(r.sub ? 0.68 : 1) * size}px ${MATH}`, dy: r.sub ? size * 0.28 : 0 });
      }
      let w = 0; for (const it of items) { ctx.font = it.font; it.w = ctx.measureText(it.t).width; w += it.w; }
      let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.textBaseline = 'alphabetic';
      for (const it of items) {
        ctx.font = it.font;
        if (halo) { ctx.lineWidth = 3.5; ctx.strokeStyle = C.sheet; ctx.strokeText(it.t, cx, y + it.dy); }
        ctx.fillStyle = color; ctx.fillText(it.t, cx, y + it.dy); cx += it.w;
      }
      ctx.restore();
    }
    function line(ctx, a, b, f, { color = C.fg, w = 1.4, dash = null, alpha = 1 } = {}) {
      if (f <= 0 || alpha <= 0) return;
      const e = lerp2(a, b, f);
      ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.restore();
    }
    function arrow(ctx, a, b, f, opt = {}) {
      if (f <= 0) return;
      const e = lerp2(a, b, f), ang = Math.atan2(e[1] - a[1], e[0] - a[0]), h = opt.head || 8;
      line(ctx, a, lerp2(a, b, f * 0.999), 1, opt);
      ctx.save(); ctx.globalAlpha *= opt.alpha ?? 1; ctx.fillStyle = opt.color || C.fg; ctx.beginPath();
      ctx.moveTo(e[0] + Math.cos(ang) * 2, e[1] + Math.sin(ang) * 2);
      ctx.lineTo(e[0] - Math.cos(ang - 0.42) * h, e[1] - Math.sin(ang - 0.42) * h);
      ctx.lineTo(e[0] - Math.cos(ang + 0.42) * h, e[1] - Math.sin(ang + 0.42) * h); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function dot(ctx, p, color, { r = 5, open = false, alpha = 1, scale = 1 } = {}) {
      if (alpha <= 0 || scale <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(p[0], p[1], r * scale, 0, 7);
      if (open) { ctx.fillStyle = C.sheet; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = color; ctx.stroke(); }
      else { ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = C.sheet; ctx.stroke(); }
      ctx.restore();
    }
    function camera(ctx, apex, color, alpha = 1) {                 // the camera glyph of the paper: dot, frustum opening up
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.moveTo(apex[0], apex[1]); ctx.lineTo(apex[0] - 10, apex[1] - 21); ctx.lineTo(apex[0] + 10, apex[1] - 21); ctx.closePath();
      ctx.fillStyle = C.sheet; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(apex[0], apex[1], 4, 0, 7); ctx.fillStyle = color; ctx.fill(); ctx.restore();
    }
    // a cutout of the tractor (frame box M.box, drawn sw wide) placed so that frame pixel px lands on point at
    function cutout(ctx, key, px, at, sw, alpha) {
      if (alpha <= 0) return;
      const b = M.box, s = sw / (b[2] - b[0]);
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.drawImage(img['c_' + key], at[0] - (px[0] - b[0]) * s, at[1] - (px[1] - b[1]) * s, sw, (b[3] - b[1]) * s); ctx.restore();
    }

    // ---------------------------------------------------------------- geometry shared by (b) and (c)
    const TC = () => [C.t[0], C.t[1], C.t[2]];                      // t_b - dt, t_b, t_b + dt (input times t0, t1, t2)
    const xt = M.xt, tt = xt.map((p) => p[0]), ss = xt.map((p) => p[1]);
    const tm = tt.reduce((a, b) => a + b) / tt.length, sm = ss.reduce((a, b) => a + b) / ss.length;
    const fitS = (q) => sm + M.spd * (q - tm);                       // least-squares line: position along v_b at time q
    const d = (() => { const v = [1, -0.36], n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n]; })();
    const SC = 92 / (xt[2][1] - xt[1][1]);                          // logical units per unit along v_b
    const along = (X, s) => [X[0] + SC * s * d[0], X[1] + SC * s * d[1]];
    const TLAB = ['t_b − Δt', 't_b', 't_b + Δt'], CEN = [M.m_lo, M.pb, M.m_hi], KEYS = ['lo', 'b', 'hi'];

    // ---------------------------------------------------------------- (a) token grid, match, pixel refinement
    function drawA(ctx, p) {
      const tc = TC(), CS = 120, Y = 40, xs = [6, 140, 274], [WX, WY, CW] = M.win, s = CS / CW;
      const P = (i, q) => [xs[i] + (q[0] - WX) * s, Y + (q[1] - WY) * s];
      const order = [1, 0, 2], frame = ['lo', 'b', 'hi'];
      for (let i = 0; i < 3; i++) {
        const a = seg(p, order.indexOf(i) * 0.04, 0.08 + order.indexOf(i) * 0.04);
        if (a <= 0) continue;
        ctx.save(); ctx.globalAlpha = a; ctx.drawImage(img['f_' + frame[i]], WX, WY, CW, CW, xs[i], Y, CS, CS);
        const g = seg(p, 0.12, 0.2) * 0.55;                         // token grid
        if (g > 0) {
          ctx.globalAlpha = a * g; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.7; ctx.beginPath();
          for (let q = Math.ceil(WX / 8) * 8; q < WX + CW; q += 8) { const xx = xs[i] + (q - WX) * s; ctx.moveTo(xx, Y); ctx.lineTo(xx, Y + CS); }
          for (let q = Math.ceil(WY / 8) * 8; q < WY + CW; q += 8) { const yy = Y + (q - WY) * s; ctx.moveTo(xs[i], yy); ctx.lineTo(xs[i] + CS, yy); }
          ctx.stroke();
        }
        ctx.globalAlpha = a; ctx.strokeStyle = tc[i]; ctx.lineWidth = 2.2; ctx.strokeRect(xs[i], Y, CS, CS); ctx.restore();
        lab(ctx, [[TLAB[i], 'm']], xs[i] + CS / 2, Y - 10, { size: 16, color: tc[i], align: 'center', alpha: a });
      }
      const box = (c, a, dash, pulse = 0) => {                       // an 8 x 8 token square around frame point c
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; const h = 4 * s + pulse * 3;
        for (const [w, col] of [[3.6, 'rgba(0,0,0,.55)'], [1.6, '#fff']]) { ctx.lineWidth = w; ctx.strokeStyle = col; if (dash) ctx.setLineDash([3, 2.5]); ctx.strokeRect(c[0] - h, c[1] - h, 2 * h, 2 * h); }
        ctx.restore();
      };
      const pb = P(1, M.pb), pulse = p > 0.14 && p < 0.26 ? Math.sin(((p - 0.14) / 0.12) * Math.PI) : 0;
      box(pb, seg(p, 0.13, 0.17), false, pulse);
      lab(ctx, [['b', 'm']], pb[0] + 8, pb[1] - 9, { size: 16, color: '#fff', bold: true, halo: false, alpha: seg(p, 0.13, 0.17) });
      lab(ctx, [['token ', 'p'], ['b', 'm'], [' at ', 'p'], ['p_b', 'm']], xs[1] + CS / 2, Y + CS + 22, { size: 15, align: 'center', alpha: seg(p, 0.15, 0.22) });
      // the two token-stage matches, reached by arcs over the frames
      const ends = [[0, M.c_lo, M.m_lo], [2, M.c_hi, M.m_hi]];
      for (const [i, c] of ends) {
        const f = seg(p, 0.24, 0.46), e = P(i, c), mid = [(pb[0] + e[0]) / 2, Y - 34];
        if (f > 0) {
          ctx.save(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath();
          const n = 24; for (let k = 0; k <= Math.round(n * f); k++) { const u = k / n, q = [(1 - u) * (1 - u) * pb[0] + 2 * u * (1 - u) * mid[0] + u * u * e[0], (1 - u) * (1 - u) * (pb[1] - 6) + 2 * u * (1 - u) * mid[1] + u * u * (e[1] - 6)]; k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
          ctx.stroke(); ctx.restore();
        }
        box(e, seg(p, 0.42, 0.48), true);
      }
      // zoom insets under the side frames: token stage (open) -> pixel stage m (filled)
      const ZW = 14, ZS = 104, zy = Y + CS + 44;
      for (const [i, c, m] of ends) {
        const a = seg(p, 0.5, 0.6); if (a <= 0) continue;
        const zc = [(c[0] + m[0]) / 2, (c[1] + m[1]) / 2], zx0 = Math.round(zc[0] - ZW / 2), zy0 = Math.round(zc[1] - ZW / 2);
        const zx = xs[i] + (CS - ZS) / 2, f = ZS / ZW, Z = (q) => [zx + (q[0] - zx0) * f, zy + (q[1] - zy0) * f];
        const win = P(i, [zx0, zy0]);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = tc[i]; ctx.lineWidth = 1.2; ctx.strokeRect(win[0], win[1], ZW * s, ZW * s);
        ctx.strokeStyle = C.faint; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(win[0], win[1] + ZW * s); ctx.lineTo(zx, zy); ctx.moveTo(win[0] + ZW * s, win[1] + ZW * s); ctx.lineTo(zx + ZS, zy); ctx.stroke();
        ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img['f_' + frame[i]], zx0, zy0, ZW, ZW, zx, zy, ZS, ZS);
        ctx.strokeStyle = '#fff'; ctx.globalAlpha = a * 0.75; ctx.lineWidth = 1; ctx.beginPath();
        for (let g = 0; g <= 256; g += 8) { if (g > zx0 && g < zx0 + ZW) { ctx.moveTo(zx + (g - zx0) * f, zy); ctx.lineTo(zx + (g - zx0) * f, zy + ZS); } if (g > zy0 && g < zy0 + ZW) { ctx.moveTo(zx, zy + (g - zy0) * f); ctx.lineTo(zx + ZS, zy + (g - zy0) * f); } }
        ctx.stroke(); ctx.globalAlpha = a; ctx.strokeStyle = tc[i]; ctx.lineWidth = 2.2; ctx.strokeRect(zx, zy, ZS, ZS); ctx.restore();
        const r = seg(p, 0.64, 0.84), zc_ = Z(c), zm = Z(m), cur = lerp2(zc_, zm, r);
        ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(zc_[0], zc_[1], 6, 0, 7);
        ctx.lineWidth = 3.6; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
        if (r > 0) {
          line(ctx, zc_, cur, 1, { color: '#fff', w: 1.6 });
          ctx.save(); ctx.beginPath(); ctx.arc(cur[0], cur[1], 5, 0, 7); ctx.fillStyle = C.fg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
        }
        lab(ctx, [['m', 'm']], zm[0], zm[1] - 11, { size: 15, color: '#fff', bold: true, align: 'center', alpha: seg(p, 0.8, 0.86) });
      }
      // legend under the key frame
      const la = seg(p, 0.5, 0.6), lx = xs[1] + 12, ly = zy + 34;
      dot(ctx, [lx, ly - 5], C.fg, { r: 5, open: true, alpha: la });
      lab(ctx, [['token stage', 'p']], lx + 13, ly, { size: 15, alpha: la });
      dot(ctx, [lx, ly + 23], C.fg, { r: 5, alpha: la });
      lab(ctx, [['pixel stage ', 'p'], ['m', 'm']], lx + 13, ly + 28, { size: 15, alpha: la });
    }

    // ---------------------------------------------------------------- (b) lift along the rays, fit the line
    function drawB(ctx, p) {
      const tc = TC(), X0 = [178, 128], Xt = xt.map(([, s]) => along(X0, s));
      const apexB = [44, 330], step = [16, 3], ray = [X0[0] - apexB[0], X0[1] - apexB[1]], rl = Math.hypot(ray[0], ray[1]);
      const rd = [ray[0] / rl, ray[1] / rl], u = [-rd[1] * 30, rd[0] * 30], w = [rd[0] * 15, rd[1] * 15 + 4];
      // the tractor at each input time, the patch on the line (back to front)
      const fades = [0.4, 0.7, 1];
      const DL = [0.05, 0, 0.1];                                   // the patch at t_b first, then its matches
      for (let k = 0; k < 3; k++) cutout(ctx, KEYS[k], CEN[k], Xt[k], 104, fades[k] * seg(p, 0.3 + DL[k], 0.42 + DL[k]));
      // the static key camera drawn at the three times, each with its own ray
      for (let k = 0; k < 3; k++) {
        const a = [apexB[0] + (k - 1) * step[0], apexB[1] + (k - 1) * step[1]], c0 = [a[0] + 0.3 * ray[0], a[1] + 0.3 * ray[1]];
        const q = [[c0[0] - u[0] - w[0], c0[1] - u[1] - w[1]], [c0[0] + u[0] - w[0], c0[1] + u[1] - w[1]], [c0[0] + u[0] + w[0], c0[1] + u[1] + w[1]], [c0[0] - u[0] + w[0], c0[1] - u[1] + w[1]]];
        const fa = seg(p, 0, 0.08);
        if (fa > 0) {
          ctx.save(); ctx.globalAlpha = fa * 0.9; ctx.lineWidth = 1; ctx.strokeStyle = tc[k]; ctx.fillStyle = C.raise;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(q[i][0], q[i][1]); ctx.lineTo(q[(i + 1) % 4][0], q[(i + 1) % 4][1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fillStyle = C.line; ctx.globalAlpha = fa * 0.35; ctx.fill(); ctx.globalAlpha = fa; ctx.stroke();
          ctx.beginPath(); ctx.arc(a[0], a[1], 4, 0, 7); ctx.fillStyle = tc[k]; ctx.fill(); ctx.restore();
        }
        // where the ray crosses that image plane (solve a + lam (X - a) = c0 + mu u)
        const X = Xt[k], A = [X[0] - a[0], -u[0]], B = [X[1] - a[1], -u[1]], det = A[0] * B[1] - A[1] * B[0];
        const lam = ((c0[0] - a[0]) * B[1] - (c0[1] - a[1]) * A[1]) / det, ip = [a[0] + lam * (X[0] - a[0]), a[1] + lam * (X[1] - a[1])];
        const f = seg(p, 0.06 + (k === 1 ? 0 : 0.06), 0.26 + (k === 1 ? 0 : 0.06));
        line(ctx, a, ip, Math.min(1, f * 3), { color: tc[k], w: 1.3, dash: [3, 2.5] });
        if (f > 0.33) line(ctx, ip, X, (f - 0.33) / 0.67, { color: tc[k], w: 1.6 });
        dot(ctx, ip, tc[k], { r: 3.6, alpha: seg(p, 0.08, 0.14) });
        if (k === 1) {
          const mid = lerp2(ip, X, 0.42), ang = Math.atan2(X[1] - ip[1], X[0] - ip[0]);
          ctx.save(); ctx.translate(mid[0] + 9 * Math.sin(ang), mid[1] - 9 * Math.cos(ang)); ctx.rotate(ang); lab(ctx, [['depth', 'p']], 0, 0, { size: 14, color: tc[1], align: 'center', alpha: seg(p, 0.2, 0.28) }); ctx.restore();
          lab(ctx, [['p_b', 'm']], ip[0] + 16, ip[1] + 14, { size: 15, color: tc[1], alpha: seg(p, 0.1, 0.16) });
        }
      }
      lab(ctx, [['key camera', 'p']], apexB[0] + 22, apexB[1] + 20, { size: 15, alpha: seg(p, 0, 0.08) });
      // the world line through the three points, and v_b
      const e0 = [Xt[0][0] - 38 * d[0], Xt[0][1] - 38 * d[1]], e1 = [Xt[2][0] + 44 * d[0], Xt[2][1] + 44 * d[1]];
      const lf = seg(p, 0.5, 0.64);
      if (lf > 0) { ctx.save(); ctx.globalAlpha = 0.85; line(ctx, e0, e1, lf, { color: C.line, w: 6 }); ctx.restore(); }
      for (let k = 0; k < 3; k++) {
        const a = seg(p, 0.3 + DL[k], 0.38 + DL[k]);
        dot(ctx, Xt[k], tc[k], { r: 6, scale: a < 1 ? 0.6 + 0.6 * Math.sin(a * Math.PI / 2) : 1, alpha: a });
        lab(ctx, [[TLAB[k], 'm']], Xt[k][0] - 2, Xt[k][1] - 40, { size: 14.5, color: tc[k], align: 'center', alpha: a });
      }
      lab(ctx, [['x', 'm']], X0[0] - 9, X0[1] + 5, { size: 16, align: 'right', halo: true, alpha: seg(p, 0.36, 0.42) });
      const va = seg(p, 0.6, 0.7);
      arrow(ctx, [Xt[2][0] + 16 * d[0], Xt[2][1] + 16 * d[1]], [e1[0] + 14 * d[0], e1[1] + 14 * d[1]], va, { color: C.fg, w: 1.8, head: 9 });
      lab(ctx, [['v_b', 'm']], e1[0] + 20, e1[1] - 8, { size: 17, bold: true, alpha: va });
      // inset: position along v_b over time, the least-squares line, x hat at t_a
      const gx0 = 236, gx1 = 390, gy0 = 214, gy1 = 326, tlo = xt[0][0] - 0.04, thi = xt[2][0] + 0.05;
      const rng = xt[2][1] - xt[0][1], slo = xt[0][1] - 0.24 * rng, shi = xt[2][1] + 0.32 * rng;
      const gx = (q) => gx0 + 8 + ((q - tlo) / (thi - tlo)) * (gx1 - gx0 - 8), gy = (s) => gy1 - 6 - ((s - slo) / (shi - slo)) * (gy1 - gy0 - 8);
      const ia = seg(p, 0.66, 0.72);
      arrow(ctx, [gx0, gy1], [gx1 + 4, gy1], ia, { color: C.faint, w: 1.1, head: 6 });
      arrow(ctx, [gx0, gy1], [gx0, gy0 - 6], ia, { color: C.faint, w: 1.1, head: 6 });
      lab(ctx, [['position along ', 'p'], ['v_b', 'm']], gx0 + 6, gy0 - 4, { size: 14, alpha: ia });
      lab(ctx, [['t', 'm']], gx1 + 8, gy1 + 4, { size: 15, alpha: ia });
      const ff = seg(p, 0.82, 0.92), q0 = tlo + 0.015, q1 = thi - 0.01;
      line(ctx, [gx(q0), gy(fitS(q0))], [gx(q1), gy(fitS(q1))], ff, { color: C.line, w: 3.6 });
      lab(ctx, [['slope ', 'p'], ['v_b', 'm']], gx(tt[0]) + 14, gy(fitS(tt[0])) + 4, { size: 13.5, color: C.faint, alpha: ff });
      for (let k = 0; k < 3; k++) {
        const a = seg(p, 0.72 + k * 0.03, 0.78 + k * 0.03);
        line(ctx, [gx(tt[k]), gy(ss[k])], [gx(tt[k]), gy1], a, { color: C.line, w: 0.9, dash: [2, 2.5] });
        dot(ctx, [gx(tt[k]), gy(ss[k])], tc[k], { r: 5, alpha: a });
        lab(ctx, [[TLAB[k], 'm']], gx(tt[k]), gy1 + 17, { size: 12.5, color: tc[k], align: 'center', alpha: a });
      }
      const xa = seg(p, 0.9, 0.98), sa = fitS(M.ta);
      line(ctx, [gx(M.ta), gy(sa)], [gx(M.ta), gy1], xa, { color: C.now, w: 1.1, dash: [2, 2.5] });
      dot(ctx, [gx(M.ta), gy(sa)], C.now, { r: 5, open: true, alpha: xa });
      lab(ctx, [['x̂', 'm']], gx(M.ta) - 9, gy(sa) - 6, { size: 15, color: C.now, align: 'right', alpha: xa });
      lab(ctx, [['t_a', 'm']], gx(M.ta), gy1 + 32, { size: 13.5, color: C.now, bold: true, align: 'center', alpha: xa });
    }

    // ---------------------------------------------------------------- (c) transport the key, then encode
    function drawC(ctx, p, qa) {                                     // qa: the query time shown (M.ta, or swept)
      const tc = TC(), xk = [150, 176], ck = [46, 334], cq = [354, 334];
      // the query-time axis on top
      const ax0 = 54, ax1 = 346, ay = 40, tlo = xt[0][0] - 0.03, thi = xt[2][0] + 0.06, AX = (q) => ax0 + ((q - tlo) / (thi - tlo)) * (ax1 - ax0);
      const a0 = seg(p, 0, 0.16);
      line(ctx, [ax0, ay], [ax1, ay], a0, { color: C.line, w: 1.6 });
      for (let k = 0; k < 3; k++) {
        line(ctx, [AX(tt[k]), ay - 7], [AX(tt[k]), ay + 7], a0, { color: tc[k], w: 2 });
        lab(ctx, [[TLAB[k], 'm']], AX(tt[k]), ay + 24, { size: 13, color: tc[k], align: 'center', alpha: a0 });
      }
      lab(ctx, [['query time', 'p']], ax0 - 4, ay - 12, { size: 14, color: C.faint, alpha: a0 });
      const mv = seg(p, 0.38, 0.72), q = M.tb + (qa - M.tb) * mv, xh = along(xk, fitS(q));
      if (p > 0.36) {
        ctx.save(); ctx.fillStyle = C.now; ctx.globalAlpha = seg(p, 0.36, 0.42); ctx.fillRect(AX(q) - 5, ay - 12, 10, 24); ctx.restore();
        lab(ctx, [['t_a', 'm']], AX(q), ay - 17, { size: 15, color: C.now, bold: true, align: 'center', alpha: seg(p, 0.36, 0.42) });
      }
      // the key where it was captured, and where transport puts it
      cutout(ctx, 'b', M.pb, xk, 104, 0.42 * a0);
      if (mv > 0) cutout(ctx, 'b', M.pb, xh, 104, Math.min(1, mv * 2));
      line(ctx, [ck[0], ck[1] - 21], xk, seg(p, 0.06, 0.18), { color: C.faint, w: 1, dash: [1.5, 3] });
      camera(ctx, ck, tc[1], a0);
      camera(ctx, cq, C.fg, a0);
      lab(ctx, [['key camera ', 'p'], ['c_b', 'm']], ck[0] - 16, ck[1] + 20, { size: 14.5, alpha: a0 });
      lab(ctx, [['at ', 'p'], ['t_b', 'm'], [': not moved', 'p']], ck[0] - 16, ck[1] + 38, { size: 14.5, color: C.dim, alpha: a0 });
      lab(ctx, [['query camera ', 'p'], ['c_a', 'm']], cq[0] + 18, cq[1] + 20, { size: 14.5, align: 'right', alpha: a0 });
      lab(ctx, [['at ', 'p'], ['t_a', 'm']], cq[0] + 18, cq[1] + 38, { size: 14.5, color: C.dim, align: 'right', alpha: a0 });
      // RayRoPE encodes the key where it was captured
      const top = [cq[0], cq[1] - 21], rf = seg(p, 0.18, 0.34);
      line(ctx, top, xk, rf, { color: C.base, w: 1.5, dash: [5, 4] });
      const ms = lerp2(top, xk, 0.55);
      lab(ctx, [['RayRoPE: ', 'p'], ['T_a(x)', 'm']], ms[0] - 40, ms[1] + 36, { size: 14.5, color: C.base, align: 'center', alpha: rf });
      dot(ctx, xk, tc[1], { r: 6, alpha: a0 });
      lab(ctx, [['x', 'm']], xk[0] - 9, xk[1] + 5, { size: 16, color: tc[1], align: 'right', halo: true, alpha: a0 });
      // transport, then GALILEO's encoding of the moved key
      if (mv > 0.02) {
        const dd = Math.hypot(xh[0] - xk[0], xh[1] - xk[1]);
        if (dd > 16) arrow(ctx, along(xk, 9 / SC * Math.sign(fitS(q))), along(xh, -9 / SC * Math.sign(fitS(q))), 1, { color: C.now, w: 2, head: 8 });
        const gf = seg(p, 0.74, 0.92);
        line(ctx, top, xh, gf, { color: C.now, w: 2.2 });
        const mg = lerp2(top, xh, 0.5);
        lab(ctx, [['T_a(x̂)', 'm']], mg[0] + 12, mg[1], { size: 16, color: C.now, bold: true, alpha: gf });
        dot(ctx, xh, C.now, { r: 6, open: true });
        lab(ctx, [['x̂', 'm']], xh[0] + 9, xh[1] - 9, { size: 16, color: C.now, halo: true });
        const mid = lerp2(xk, xh, 0.5);
        lab(ctx, [['+ v_b (t_a − t_b)', 'm']], mid[0] - 10, mid[1] - 56, { size: 15, color: C.now, align: 'center', halo: true, alpha: seg(p, 0.5, 0.62) * (dd > 30 ? 1 : dd / 30) });
      }
    }

    // ---------------------------------------------------------------- the clock
    const DRAW = [drawA, drawB, drawC];
    function render() {
      if (!ready) return;
      const sweep = t >= STAGE[3] ? (t - STAGE[3]) / (TOTAL - STAGE[3]) : 0;
      // after the build: t_a swings over the input window and back, starting at the real query time
      const span = [xt[0][0] - 0.01, xt[2][0] + 0.04], qa = sweep > 0 ? (() => {
        const ph = Math.asin(Math.max(-1, Math.min(1, (2 * (M.ta - span[0])) / (span[1] - span[0]) - 1)));
        return span[0] + (span[1] - span[0]) * (0.5 + 0.5 * Math.sin(ph + sweep * 2 * Math.PI));
      })() : M.ta;
      let active = -1;
      for (let k = 0; k < 3; k++) {
        const ctx = prep(cvs[k]), p = (t - STAGE[k]) / (STAGE[k + 1] - STAGE[k]);
        if (p < 0) { ctx.globalAlpha = 0.22; DRAW[k](ctx, 1, M.ta); }
        else { if (p < 1) active = k; ctx.globalAlpha = 1; DRAW[k](ctx, Math.min(1, p), qa); }
      }
      if (active < 0) active = 3;
      caps.forEach((c, k) => c.classList.toggle('on', k === active || (active === 3 && k === 2)));
    }
    const tl = timeline($('mth-track'), { min: 0, max: TOTAL, ticks: [{ v: STAGE[0], color: C.fg, label: 'a' }, { v: STAGE[1], color: C.fg, label: 'b' }, { v: STAGE[2], color: C.fg, label: 'c' }, { v: STAGE[3], color: C.now, label: 'sweep tₐ' }], onInput: (v) => { t = Math.min(v, TOTAL - 1e-3); render(); } });
    const setPlay = (on) => { playing = on; $('mth-play').textContent = on ? '❚❚' : '▶'; $('mth-play').setAttribute('aria-label', on ? 'Pause' : 'Play'); };
    $('mth-play').onclick = () => setPlay(!playing);
    caps.forEach((c, k) => { c.onclick = () => { t = STAGE[k]; tl.set(t); setPlay(true); render(); }; });
    setPlay(playing);
    for (const k of ['lo', 'b', 'hi']) { img['f_' + k] = M.frames[k]; img['c_' + k] = M.cuts[k]; }
    ready = true; tl.set(t); render();
    whileVisible($('mth'), (dt) => { if (playing) { t = (t + dt) % TOTAL; tl.set(t); } render(); });
    addEventListener('resize', render);
  }

  // ================================================================== Galileo's notation of Jupiter
  // one row per night: Jupiter as a circle, each moon as an asterisk (east left, as he wrote "Ori." ... "Occ.").
  // Circular orbits with the true radii (Jupiter radii) and periods (days); the phases are free.
  function jovilog() {
    const svg = $('jovilog'); if (!svg) return;
    const cx = 150, top = 40, dy = 19, nights = 11, s = 4.5;
    const R = [5.9, 9.4, 15.0, 26.4], P = [1.769, 3.551, 7.155, 16.69], ph = [0.07, 0.58, 0.31, 0.86];
    const x = (i, d) => R[i] * Math.sin(2 * Math.PI * (d / P[i] + ph[i]));
    const X = (v) => (cx - s * v).toFixed(1);
    let h = `<text x="16" y="16" class="jl-lab">Ori.</text><text x="284" y="16" class="jl-lab" text-anchor="end">Occ.</text>`;
    for (let i = 2; i < 4; i++) {                         // only the two outer moons: the inner ones turn half an orbit a night
      let d = 'M';
      for (let k = 0; k <= 330; k++) { const t = (k / 330) * (nights - 1); d += `${X(x(i, t))},${(top + t * dy).toFixed(1)} `; }
      h += `<path d="${d}" class="jl-trace"/>`;
    }
    for (let n = 0; n < nights; n++) {
      const y = top + n * dy;
      h += `<circle cx="${cx}" cy="${y}" r="4.2" class="jl-jup"/>`;
      for (let i = 0; i < 4; i++) { const v = x(i, n); if (Math.abs(v) > 1.25) h += `<text x="${X(v)}" y="${(y + 9.5).toFixed(1)}" class="jl-star" text-anchor="middle">*</text>`; }
    }
    svg.innerHTML = h;
  }

  // ================================================================== boot
  function boot() {
    $('authors').innerHTML = SITE.authors;
    const link = (id, url, label) => { const a = $(id); if (url) { a.href = url; a.removeAttribute('aria-disabled'); if (label) (a.querySelector('span') || a).textContent = label; } };
    link('link-paper', SITE.paper); link('link-arxiv', SITE.arxiv, 'arXiv'); link('link-code', SITE.code, 'Code');
    for (const k of ['method', 'tracks', 'driving']) { const el = $('fig-' + k); if (el) el.src = GAL.figs[k]; }
    // overview video: a button opens it over the page; closing pauses it
    const vm = $('vmodal'), vid = $('intro-video');
    if (vm && vid) {
      let back = null;
      const close = () => { vid.pause(); vm.hidden = true; document.body.style.overflow = ''; if (back) back.focus(); };
      $('open-video').onclick = (e) => { back = e.currentTarget; vm.hidden = false; document.body.style.overflow = 'hidden'; $('close-video').focus(); vid.play().catch(() => {}); };
      $('close-video').onclick = close;
      vm.onclick = (e) => { if (e.target === vm) close(); };
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && !vm.hidden) close(); });
    }
    $('copy-bib').onclick = async () => {
      const b = $('copy-bib');
      try { await navigator.clipboard.writeText($('bib').textContent); b.textContent = 'Copied'; }
      catch (e) { const r = document.createRange(); r.selectNodeContents($('bib')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }
      setTimeout(() => (b.textContent = 'Copy'), 1600);
    };
    const api = {};
    for (const fn of [tables, jovilog, keysDemo, player, spacetime, methodAnim, attention, boostAnim, boost]) { try { api[fn.name] = fn(); } catch (e) { console.error(fn.name, e); } }
    try { demo(api); } catch (e) { console.error('demo', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
