/* UI helpers shared by all screens: formatting, icons, toast, bottom sheet,
 * exercise picker and the rest timer. Also creates the action registries that
 * screens add their handlers to (see app.js for the event delegation). */
(function (WT) {
  'use strict';

  WT.screens = {};
  WT.actions = {};   // click handlers, keyed by data-action
  WT.inputs = {};    // input handlers, keyed by data-input
  WT.changes = {};   // change handlers, keyed by data-change

  // ---------- Formatting
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const fmtKg = n => String(Math.round((Number(n) || 0) * 100) / 100);
  const fmtNum = n => Math.round(Number(n) || 0).toLocaleString();
  const fmtDate = (iso, opts) => new Date(iso).toLocaleDateString(undefined, opts || { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');

  function muscleLine(e) {
    const L = WT.data.MUSCLE_LABEL;
    return (e.primary || []).map(m => L[m]).filter(Boolean).join(' · ');
  }

  // ---------- Icons (24px stroke icons)
  const ICONS = {
    today: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    plan: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>',
    library: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    progress: '<path d="M4 4v16h16"/><path d="M8 15l4-4 3 3 5-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    'star-fill': '<path fill="currentColor" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    'chev-r': '<path d="M9 6l6 6-6 6"/>',
    'chev-l': '<path d="M15 6l-6 6 6 6"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    move: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'
  };
  function icon(name, size) {
    const s = size || 24;
    return `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  // ---------- Toast
  let toastTimer;
  function toast(msg, kind) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
  }

  // ---------- Bottom sheet
  let sheetOpts = null;
  function openSheet(html, opts) {
    sheetOpts = opts || {};
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="sheet-backdrop" data-action="sheet-close"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(sheetOpts.title || '')}">
        <div class="sheet-head"><h2>${esc(sheetOpts.title || '')}</h2>
          <button type="button" class="icon-btn" data-action="sheet-close" aria-label="Close">${icon('x')}</button></div>
        <div class="sheet-body">${html}</div>
      </div>`;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => root.classList.add('open'));
  }
  function closeSheet() {
    const root = document.getElementById('sheet-root');
    if (!root.innerHTML) return;
    root.classList.remove('open');
    root.innerHTML = '';
    document.body.classList.remove('sheet-open');
    sheetOpts = null;
  }
  WT.actions['sheet-close'] = closeSheet;

  // ---------- Exercise picker (favorites first)
  const picker = { query: '', selected: [], multi: true, onDone: null };

  function openPicker(opts) {
    picker.query = '';
    picker.selected = [];
    picker.multi = opts.multi !== false;
    picker.onDone = opts.onDone;
    openSheet(`<label class="search">${icon('search', 20)}
        <input class="input" type="search" placeholder="Search name or muscle" autocomplete="off" data-input="picker-search" aria-label="Search exercises"></label>
      <div id="picker-list">${pickerList()}</div>
      ${picker.multi ? `<div class="sheet-foot"><button type="button" class="btn btn-primary btn-block" id="picker-done" data-action="picker-done" disabled>Select exercises</button></div>` : ''}`,
    { title: opts.title || 'Add exercises' });
  }

  function pickerList() {
    if (!WT.store.get().exercises.length) {
      return `<div class="empty small"><p>Your library is empty.</p><a class="btn btn-soft" href="#/exercise/new" data-action="sheet-close">Add an exercise</a></div>`;
    }
    const exs = WT.data.sortedExercises(picker.query);
    if (!exs.length) return `<p class="empty-inline">No exercises match “${esc(picker.query)}”.</p>`;
    const row = e => {
      const on = picker.selected.includes(e.id);
      return `<li><button type="button" class="pick${on ? ' on' : ''}" data-action="picker-toggle" data-id="${e.id}" aria-pressed="${on}">
        <span class="pick-main"><span class="row-title">${esc(e.name)}</span><span class="sub">${esc(muscleLine(e)) || 'No muscles set'}</span></span>
        <span class="pick-check">${icon('check', 20)}</span></button></li>`;
    };
    const favs = exs.filter(e => e.favorite);
    const rest = exs.filter(e => !e.favorite);
    return (favs.length ? `<p class="group-label">${icon('star-fill', 16)} Favorites</p><ul class="pick-list">${favs.map(row).join('')}</ul>` : '') +
      (rest.length ? `<p class="group-label">${favs.length ? 'All exercises' : 'Exercises'}</p><ul class="pick-list">${rest.map(row).join('')}</ul>` : '');
  }

  WT.inputs['picker-search'] = el => {
    picker.query = el.value;
    document.getElementById('picker-list').innerHTML = pickerList();
  };
  WT.actions['picker-toggle'] = el => {
    const id = el.dataset.id;
    if (!picker.multi) {
      const cb = picker.onDone;
      closeSheet();
      cb && cb([id]);
      return;
    }
    const i = picker.selected.indexOf(id);
    if (i >= 0) picker.selected.splice(i, 1); else picker.selected.push(id);
    const on = i < 0;
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on);
    const btn = document.getElementById('picker-done');
    const n = picker.selected.length;
    btn.disabled = !n;
    btn.textContent = n ? `Add ${n} exercise${n === 1 ? '' : 's'}` : 'Select exercises';
  };
  WT.actions['picker-done'] = () => {
    const ids = picker.selected.slice();
    const cb = picker.onDone;
    closeSheet();
    if (ids.length && cb) cb(ids);
  };

  // ---------- Rest timer (timestamp based, so it stays correct when the app is backgrounded)
  const timer = { endAt: 0, total: 0, tick: null, audio: null };

  function startTimer(seconds) {
    const sec = seconds || WT.store.get().settings.restSeconds || 90;
    timer.total = sec;
    timer.endAt = Date.now() + sec * 1000;
    try {
      if (!timer.audio) timer.audio = new (window.AudioContext || window.webkitAudioContext)();
      timer.audio.resume();
    } catch (e) { /* audio optional */ }
    const el = document.getElementById('timer');
    el.innerHTML = `<div class="timer-bar"></div>
      <span class="timer-label">${icon('timer', 20)} Rest</span>
      <span class="timer-time num" aria-live="off"></span>
      <button type="button" class="timer-btn" data-action="timer-add" data-d="-15" aria-label="15 seconds less">−15</button>
      <button type="button" class="timer-btn" data-action="timer-add" data-d="15" aria-label="15 seconds more">+15</button>
      <button type="button" class="timer-btn" data-action="timer-stop">Skip</button>`;
    el.hidden = false;
    document.body.classList.add('has-timer');
    clearInterval(timer.tick);
    timer.tick = setInterval(tickTimer, 250);
    tickTimer();
  }

  function tickTimer() {
    const left = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    const el = document.getElementById('timer');
    if (left === 0) {
      stopTimer();
      beep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast('Rest over. Next set!');
      return;
    }
    el.querySelector('.timer-time').textContent = fmtTime(left);
    el.querySelector('.timer-bar').style.transform = `scaleX(${left / timer.total})`;
  }

  function stopTimer() {
    clearInterval(timer.tick);
    timer.endAt = 0;
    const el = document.getElementById('timer');
    el.hidden = true;
    el.innerHTML = '';
    document.body.classList.remove('has-timer');
  }

  function beep() {
    const ctx = timer.audio;
    if (!ctx) return;
    try {
      [0, 0.25].forEach(t => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.25, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.2);
      });
    } catch (e) { /* ignore */ }
  }

  WT.actions['timer-start'] = () => startTimer();
  WT.actions['timer-stop'] = stopTimer;
  WT.actions['timer-add'] = el => {
    timer.endAt = Math.max(Date.now() + 1000, timer.endAt + Number(el.dataset.d) * 1000);
    timer.total = Math.max(timer.total, Math.ceil((timer.endAt - Date.now()) / 1000));
    tickTimer();
  };

  // ---------- Shared bits of markup
  function emptyState(title, text, actionHtml, iconName) {
    return `<section class="card empty"><div class="empty-art">${icon(iconName || 'library', 32)}</div>
      <h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>${actionHtml || ''}</section>`;
  }

  // Keeps only digits (and one decimal point when allowed). Used by all number fields.
  function cleanNumber(value, decimal) {
    let v = String(value).replace(',', '.');
    v = decimal ? v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') : v.replace(/\D/g, '');
    return v;
  }

  WT.ui = {
    esc, fmtKg, fmtNum, fmtDate, fmtTime, muscleLine, icon, toast,
    openSheet, closeSheet, openPicker, startTimer, stopTimer, emptyState, cleanNumber
  };
})(window.WT = window.WT || {});
