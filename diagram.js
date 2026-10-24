/* Muscle diagram: front and back body views as inline SVG.
 * Each muscle shape is drawn once for the left side and mirrored for the right. */
(function (WT) {
  'use strict';

  const COLORS = {
    primary: '#68002C',   // Beet Red
    secondary: '#E098AC', // Sea Pink
    none: '#DCEAF2',      // pale tint of Crystal Blue
    base: '#EFE3BF'       // head, hands, joints
  };

  const MIRROR = 'matrix(-1 0 0 1 200 0)';
  const both = s => s + `<g transform="${MIRROR}">${s}</g>`;

  const BASE = `<ellipse cx="100" cy="30" rx="17" ry="21"/><rect x="91" y="44" width="18" height="18" rx="6"/>
    <path d="M74 66 Q100 60 126 66 L134 104 L128 140 L127 184 Q100 196 73 184 L72 140 L66 104 Z"/>` +
    both(`<polyline points="70,74 58,108 52,140 46,188" fill="none" stroke-width="17"/><circle cx="45" cy="197" r="8"/>
      <polyline points="86,186 82,230 82,272 79,330 79,350" fill="none" stroke-width="24"/><ellipse cx="77" cy="358" rx="11" ry="6"/>`);

  const SHOULDER = '<path d="M74 68 Q58 68 55 86 Q55 96 59 102 Q64 88 77 82 Q78 74 74 68 Z"/>';
  const UPPER_ARM = '<path d="M59 104 Q52 118 52 132 Q56 140 62 137 Q68 122 67 104 Q63 100 59 104 Z"/>';
  const FOREARM = '<path d="M52 142 Q45 162 43 184 L51 186 Q59 166 62 143 Z"/>';

  // Drawing order matters where shapes touch.
  const FRONT = [
    ['chest', '<path d="M98 72 L80 72 Q68 78 66 94 Q72 110 98 106 Z"/>'],
    ['traps', '<path d="M92 56 Q86 64 74 68 L92 70 Z"/>'],
    ['shoulders', SHOULDER],
    ['biceps', UPPER_ARM],
    ['forearms', FOREARM],
    ['obliques', '<path d="M86 112 Q74 112 71 124 Q72 148 77 168 Q82 174 86 170 Z"/>'],
    ['abs', '<rect x="88" y="112" width="10.5" height="18" rx="4"/><rect x="88" y="133" width="10.5" height="18" rx="4"/><rect x="88" y="154" width="10.5" height="24" rx="5"/>'],
    ['adductors', '<path d="M99 194 Q93 204 93 228 Q96 236 99 232 Z"/>'],
    ['quads', '<path d="M76 190 Q68 212 70 248 Q75 266 87 266 Q93 240 92 206 Q88 192 76 190 Z"/>'],
    ['calves', '<path d="M74 282 Q68 302 72 328 Q76 342 82 342 Q87 316 86 284 Z"/>']
  ];
  const BACK = [
    ['lats', '<path d="M80 84 Q70 98 73 122 Q80 136 92 142 L97 128 L97 112 Q90 96 80 84 Z"/>'],
    ['lowerBack', '<path d="M97 132 L90 146 Q86 162 88 180 L98 182 L98 132 Z"/>'],
    ['traps', '<path d="M99 50 L92 58 Q86 64 74 68 Q88 78 99 112 Z"/>'],
    ['shoulders', SHOULDER],
    ['triceps', UPPER_ARM],
    ['forearms', FOREARM],
    ['glutes', '<path d="M99 186 Q82 182 76 194 Q72 212 84 220 Q97 222 99 208 Z"/>'],
    ['hamstrings', '<path d="M77 224 Q70 242 74 264 Q81 272 88 268 Q93 246 92 224 Z"/>'],
    ['adductors', '<path d="M99 226 Q94 230 94 244 Q96 252 99 250 Z"/>'],
    ['calves', '<path d="M75 280 Q66 300 72 322 Q79 334 86 324 Q92 302 86 282 Z"/>']
  ];

  function view(label, shapes, fill) {
    const muscles = shapes.map(([id, s]) =>
      `<g data-muscle="${id}" fill="${fill(id)}">${both(s)}</g>`).join('');
    return `<figure class="body-view">
      <svg viewBox="34 2 132 366" role="img" aria-label="${label} view">
        <g fill="${COLORS.base}" stroke="${COLORS.base}" stroke-linecap="round" stroke-linejoin="round">${BASE}</g>
        <g stroke="#FFFDF4" stroke-width="1.4" stroke-linejoin="round">${muscles}</g>
      </svg><figcaption>${label}</figcaption></figure>`;
  }

  // primary / secondary: arrays of muscle ids. labels: optional legend text.
  function render(opts) {
    const primary = opts.primary || [];
    const secondary = (opts.secondary || []).filter(m => !primary.includes(m));
    const fill = id => (primary.includes(id) ? COLORS.primary : secondary.includes(id) ? COLORS.secondary : COLORS.none);
    const L = WT.data.MUSCLE_LABEL;
    const names = list => list.map(m => L[m]).join(', ') || 'none';
    const legend = opts.legend === false ? '' : `<div class="legend">
        <span><i style="background:${COLORS.primary}"></i>${opts.primaryLabel || 'Primary'}</span>
        <span><i style="background:${COLORS.secondary}"></i>${opts.secondaryLabel || 'Secondary'}</span></div>`;
    return `<div class="diagram" role="group" aria-label="Muscle diagram. ${opts.primaryLabel || 'Primary'}: ${names(primary)}. ${opts.secondaryLabel || 'Secondary'}: ${names(secondary)}.">
      <div class="diagram-views">${view('Front', FRONT, fill)}${view('Back', BACK, fill)}</div>${legend}</div>`;
  }

  WT.diagram = { render, COLORS };
})(window.WT = window.WT || {});
