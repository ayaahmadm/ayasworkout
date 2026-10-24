/* Exercise library: list with search and favorites, plus the add/edit form. */
(function (WT) {
  'use strict';
  const { esc, icon, muscleLine, toast } = WT.ui;
  const D = WT.data;
  const st = () => WT.store.get();

  const view = { q: '', favOnly: false };
  let draft = null; // exercise being edited

  // ---------- List
  function listHtml() {
    const s = st();
    if (!s.exercises.length) {
      return WT.ui.emptyState('Your library is empty', 'Add the exercises you do, with the muscles they work.',
        '<a class="btn btn-primary btn-block" href="#/exercise/new">Add an exercise</a>');
    }
    let exs = D.sortedExercises(view.q);
    if (view.favOnly) exs = exs.filter(e => e.favorite);
    if (!exs.length) {
      return view.favOnly && !view.q
        ? WT.ui.emptyState('No favorites yet', 'Tap the star on any exercise to keep it here and at the top of the picker.', '', 'star')
        : `<p class="empty-inline">No exercises match “${esc(view.q)}”.</p>`;
    }
    return `<ul class="list">${exs.map(e => `<li class="card ex-card">
        <button type="button" class="star${e.favorite ? ' on' : ''}" data-action="fav" data-id="${e.id}" aria-pressed="${e.favorite}"
          aria-label="Favorite: ${esc(e.name)}">${icon(e.favorite ? 'star-fill' : 'star')}</button>
        <div class="ex-body">
          <a class="ex-main" href="#/exercise/${e.id}"><span class="row-title">${esc(e.name)}</span>
            <span class="sub">${esc(muscleLine(e)) || 'No muscles set'}</span></a>
          ${e.link ? `<a class="howto" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">How to do it ${icon('external', 16)}</a>` : ''}
        </div>
        <a class="chev" href="#/exercise/${e.id}" aria-label="Edit ${esc(e.name)}">${icon('chev-r')}</a>
      </li>`).join('')}</ul>`;
  }

  function renderLibrary() {
    draft = null;
    const favCount = st().exercises.filter(e => e.favorite).length;
    return `<header class="top"><h1>Library</h1>
        <a class="btn btn-primary btn-sm" href="#/exercise/new">${icon('plus', 18)} Add</a></header>
      <label class="search">${icon('search', 20)}
        <input class="input" type="search" placeholder="Search name or muscle" value="${esc(view.q)}" data-input="lib-search"
          autocomplete="off" enterkeyhint="search" aria-label="Search exercises"></label>
      <div class="segmented" role="group" aria-label="Filter">
        <button type="button" data-action="lib-filter" data-v="all" aria-pressed="${!view.favOnly}">All</button>
        <button type="button" data-action="lib-filter" data-v="fav" aria-pressed="${view.favOnly}">${icon('star-fill', 16)} Favorites${favCount ? ` (${favCount})` : ''}</button>
      </div>
      <div id="lib-list">${listHtml()}</div>`;
  }

  WT.inputs['lib-search'] = el => {
    view.q = el.value;
    document.getElementById('lib-list').innerHTML = listHtml();
  };
  WT.actions['lib-filter'] = el => { view.favOnly = el.dataset.v === 'fav'; WT.rerender(); };
  WT.actions.fav = el => WT.store.update(s => {
    const e = s.exercises.find(x => x.id === el.dataset.id);
    if (e) e.favorite = !e.favorite;
  });

  // ---------- Add / edit
  function getDraft(id) {
    if (draft && draft._key === id) return draft;
    const e = id === 'new' ? null : D.exerciseById(id);
    if (id !== 'new' && !e) return null;
    draft = e ? JSON.parse(JSON.stringify(e)) : { id: null, name: '', primary: [], secondary: [], link: '', favorite: false };
    draft._key = id;
    return draft;
  }

  const chips = (kind, selected) => `<div class="chips" role="group" aria-label="${kind} muscles">${D.MUSCLES.map(m => {
    const on = selected.includes(m.id);
    return `<button type="button" class="chip ${kind}${on ? ' on' : ''}" data-action="ed-muscle" data-kind="${kind}" data-m="${m.id}" aria-pressed="${on}">${m.label}</button>`;
  }).join('')}</div>`;

  function renderExercise(params) {
    const id = params[0] || 'new';
    const d = getDraft(id);
    if (!d) return `<nav class="subnav"><a class="back" href="#/library">${icon('chev-l')} Library</a></nav>${WT.ui.emptyState('Exercise not found', 'It may have been deleted.')}`;
    return `<nav class="subnav"><a class="back" href="#/library">${icon('chev-l')} Library</a>
        <button type="button" class="star${d.favorite ? ' on' : ''}" data-action="ed-fav" aria-pressed="${d.favorite}" aria-label="Favorite">${icon(d.favorite ? 'star-fill' : 'star')}</button></nav>
      <h1>${d.id ? 'Edit exercise' : 'New exercise'}</h1>

      <label class="field mt-lg"><span>Name</span>
        <input class="input" id="ed-name" type="text" maxlength="60" placeholder="e.g. Bulgarian Split Squat" value="${esc(d.name)}" data-input="ed-name" autocomplete="off"></label>

      <section class="card">${WT.diagram.render({ primary: d.primary, secondary: d.secondary })}</section>

      <section class="section">
        <h2 class="section-title">Primary muscles</h2>
        ${chips('primary', d.primary)}
      </section>
      <section class="section">
        <h2 class="section-title">Secondary muscles</h2>
        ${chips('secondary', d.secondary)}
      </section>

      <label class="field section"><span>“How to do it” link <em class="opt">optional</em></span>
        <input class="input" id="ed-link" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false"
          placeholder="https://youtube.com/…" value="${esc(d.link)}" data-input="ed-link"></label>
      ${d.link ? `<a class="btn btn-soft btn-block" href="${esc(d.link)}" target="_blank" rel="noopener noreferrer">How to do it ${icon('external', 18)}</a>` : ''}

      <div class="section stack">
        <button type="button" class="btn btn-primary btn-block btn-lg" data-action="ed-save">Save exercise</button>
        ${d.id ? '<button type="button" class="btn btn-ghost btn-block danger-text" data-action="ed-delete">Delete exercise</button>' : ''}
      </div>`;
  }

  WT.inputs['ed-name'] = el => { draft.name = el.value; el.classList.remove('invalid'); };
  WT.inputs['ed-link'] = el => { draft.link = el.value; el.classList.remove('invalid'); };
  WT.actions['ed-fav'] = () => { draft.favorite = !draft.favorite; WT.rerender(); };
  WT.actions['ed-muscle'] = el => {
    const kind = el.dataset.kind, other = kind === 'primary' ? 'secondary' : 'primary';
    const m = el.dataset.m;
    const list = draft[kind];
    if (list.includes(m)) list.splice(list.indexOf(m), 1);
    else {
      list.push(m);
      draft[other] = draft[other].filter(x => x !== m); // a muscle is either primary or secondary
    }
    WT.rerender();
  };

  function normalizeLink(raw) {
    let link = raw.trim();
    if (!link) return '';
    if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
    const u = new URL(link); // throws if invalid
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw new Error('bad link');
    return u.href;
  }

  WT.actions['ed-save'] = () => {
    const d = draft;
    const name = d.name.trim().replace(/\s+/g, ' ');
    if (!name) {
      const el = document.getElementById('ed-name');
      el.classList.add('invalid');
      el.focus();
      return toast('Exercise name can’t be empty');
    }
    if (st().exercises.some(e => e.id !== d.id && e.name.toLowerCase() === name.toLowerCase())) {
      return toast('An exercise with that name already exists');
    }
    let link;
    try { link = normalizeLink(d.link); } catch (e) {
      document.getElementById('ed-link').classList.add('invalid');
      return toast('That link doesn’t look right');
    }
    const clean = {
      id: d.id || D.uid(), name, primary: d.primary.slice(), secondary: d.secondary.slice(), link,
      favorite: !!d.favorite, createdAt: d.createdAt || new Date().toISOString()
    };
    draft = null;
    WT.store.update(s => {
      const i = s.exercises.findIndex(e => e.id === clean.id);
      if (i >= 0) s.exercises[i] = clean; else s.exercises.push(clean);
    }, { silent: true });
    toast('Exercise saved');
    WT.go('#/library');
  };

  WT.actions['ed-delete'] = () => {
    const d = draft;
    if (!confirm(`Delete “${d.name}”? It will be removed from your workouts. Your past sessions keep their history.`)) return;
    draft = null;
    WT.store.update(s => {
      s.exercises = s.exercises.filter(e => e.id !== d.id);
      s.workouts.forEach(w => { w.items = w.items.filter(it => it.exerciseId !== d.id); });
    }, { silent: true });
    toast('Exercise deleted');
    WT.go('#/library');
  };

  WT.screens.library = { render: renderLibrary, title: 'Library' };
  WT.screens.exercise = { render: renderExercise, title: 'Exercise' };
})(window.WT = window.WT || {});
