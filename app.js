/* App: hash router, event delegation and service worker registration. */
(function (WT) {
  'use strict';

  // Which bottom tab is highlighted for each screen.
  const TAB_OF = {
    today: 'today', log: 'today', finish: 'today', settings: 'today',
    plan: 'plan', workout: 'plan',
    library: 'library', exercise: 'library',
    progress: 'progress', session: 'progress'
  };
  const root = document.getElementById('app');

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const name = WT.screens[parts[0]] ? parts[0] : 'today';
    return { name, params: parts.slice(1) };
  }

  function render(opts) {
    const { name, params } = parseHash();
    const screen = WT.screens[name];
    const y = window.scrollY;
    root.innerHTML = screen.render(params);
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === TAB_OF[name];
      t.classList.toggle('active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    document.title = screen.title + ' · Workouts';
    if (screen.mount) screen.mount(root, params);
    window.scrollTo(0, opts && opts.keepScroll ? y : 0);
  }

  WT.rerender = () => render({ keepScroll: true });
  WT.go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

  window.addEventListener('hashchange', () => { WT.ui.closeSheet(); render(); });
  WT.store.subscribe(WT.rerender);

  // Event delegation: elements declare data-action / data-input / data-change.
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = WT.actions[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-input]');
    if (el && WT.inputs[el.dataset.input]) WT.inputs[el.dataset.input](el, e);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el && WT.changes[el.dataset.change]) WT.changes[el.dataset.change](el, e);
  });
  // Select the whole number when a number field is focused, so typing replaces it.
  document.addEventListener('focusin', e => {
    if (e.target.classList && e.target.classList.contains('num-input')) setTimeout(() => e.target.select(), 0);
  });

  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err)));
  }
})(window.WT = window.WT || {});
