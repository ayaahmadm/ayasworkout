/* Charts: a tiny canvas line chart with optional second y-axis.
 * Written by hand instead of Chart.js so the app has no dependencies and works fully offline. */
(function (WT) {
  'use strict';

  const MUTED = '#74503F';
  const GRID = 'rgba(68, 25, 16, 0.08)';
  const HIGHLIGHT = '#68002C';

  // Round the axis to 4 "nice" steps (1, 2, 2.5 or 5 × 10^n) so labels read cleanly.
  function range(vals) {
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= Math.max(1, Math.abs(max) * 0.1); max += Math.max(1, Math.abs(max) * 0.1); }
    const raw = (max - min) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
    let lo = Math.floor(min / step) * step;
    if (lo + step * 4 < max) lo = Math.ceil(max / step) * step - step * 4;
    if (lo < 0 && Math.min(...vals) >= 0) lo = 0;
    return [lo, lo + step * 4];
  }
  const tick = v => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

  /* cfg = { labels: string[], series: [{ data: number[], color, axis: 'left'|'right',
   *         fill?, dashed?, pointStroke?, highlight?: boolean[] }] } */
  function line(canvas, cfg) {
    canvas._cfg = cfg;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const hasRight = cfg.series.some(s => s.axis === 'right');
    const pad = { l: 40, r: hasRight ? 34 : 12, t: 14, b: 28 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const n = cfg.labels.length;
    const X = i => pad.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const ranges = {};
    cfg.series.forEach(s => { ranges[s.axis] = range(s.data.filter(v => v != null)); });

    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillStyle = MUTED;
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ['left', 'right'].forEach(ax => {
        const r = ranges[ax];
        if (!r) return;
        ctx.textAlign = ax === 'left' ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tick(r[1] - ((r[1] - r[0]) * g) / 4), ax === 'left' ? pad.l - 8 : w - pad.r + 8, y);
      });
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.ceil(n / 5));
    for (let i = 0; i < n; i += step) ctx.fillText(cfg.labels[i], X(i), h - pad.b + 10);

    cfg.series.forEach(s => {
      const [mn, mx] = ranges[s.axis];
      const Y = v => pad.t + ih * (1 - (v - mn) / (mx - mn));
      const pts = s.data.map((v, i) => (v == null ? null : [X(i), Y(v), i])).filter(Boolean);

      if (s.fill && pts.length > 1) {
        const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
        grad.addColorStop(0, s.color + '66');
        grad.addColorStop(1, s.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pad.t + ih);
        pts.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(pts[pts.length - 1][0], pad.t + ih);
        ctx.closePath();
        ctx.fill();
      }

      ctx.setLineDash(s.dashed ? [6, 6] : []);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      ctx.setLineDash([]);

      pts.forEach(p => {
        const hi = s.highlight && s.highlight[p[2]];
        ctx.beginPath();
        ctx.arc(p[0], p[1], hi ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = hi ? HIGHLIGHT : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = hi ? HIGHLIGHT : (s.pointStroke || s.color);
        ctx.stroke();
      });
    });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.querySelectorAll('canvas').forEach(c => { if (c._cfg) line(c, c._cfg); });
    }, 150);
  });

  WT.charts = { line };
})(window.WT = window.WT || {});
