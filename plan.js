/* Weekly plan and the workout (template) editor. */
(function (WT) {
  'use strict';
  const { esc, icon, muscleLine, toast } = WT.ui;
  const D = WT.data;
  const st = () => WT.store.get();

  let draft = null; // workout being edited; only written to the store on Save

  // ---------- Plan
  function renderPlan() {
    draft = null;
    const s = st();
    const c = D.sessionCounts();
    const today = D.todayKey();
    const options = sel => (s.workouts.length
      ? '<option value="">Choose workout…</option>' + s.workouts.map(w => `<option value="${w.id}"${w.id === sel ? ' selected' : ''}>${esc(w.name)}</option>`).join('')
      : '<option value="">Create a workout first</option>');

    const days = D.DAYS.map(d => {
      const day = s.plan.days[d.key];
      const w = D.workoutById(day.workoutId);
      return `<li class="card day${d.key === today ? ' is-today' : ''}${day.training ? ' on' : ''}">
        <div class="day-head">
          <div class="grow"><span class="day-name">${d.label}</span>${d.key === today ? '<span class="pill">Today</span>' : ''}
            ${day.training ? '' : '<span class="sub">Rest day</span>'}</div>
          <label class="switch"><input type="checkbox" role="switch" data-change="day-training" data-day="${d.key}"${day.training ? ' checked' : ''}
            aria-label="${d.label} is a training day"><span class="track"></span></label>
        </div>
        ${day.training ? `<div class="day-body">
          <select class="input" data-change="day-workout" data-day="${d.key}" aria-label="Workout on ${d.label}"${s.workouts.length ? '' : ' disabled'}>${options(day.workoutId)}</select>
          <button type="button" class="btn btn-soft btn-sm" data-action="move-day" data-day="${d.key}"${w ? '' : ' disabled'}>${icon('move', 18)} Move</button>
        </div>` : ''}
      </li>`;
    }).join('');

    const usedOn = id => D.DAYS.filter(d => s.plan.days[d.key].training && s.plan.days[d.key].workoutId === id).map(d => d.short).join(', ');
    const workouts = s.workouts.map(w => {
      const n = w.items.length;
      const used = usedOn(w.id);
      return `<li><a class="row-link" href="#/workout/${w.id}"><span class="grow"><span class="row-title">${esc(w.name)}</span>
        <span class="sub">${n} exercise${n === 1 ? '' : 's'}${used ? ' · ' + used : ''}</span></span>${icon('chev-r')}</a></li>`;
    }).join('');

    return `<header class="top"><h1>Plan</h1></header>
      <div class="stat-grid">
        <div class="card stat"><span class="big num">${c.week}</span><span class="stat-label">sessions this week</span></div>
        <div class="card stat"><span class="big num">${c.month}</span><span class="stat-label">sessions this month</span></div>
      </div>

      <section class="section">
        <div class="section-head"><h2 class="section-title">Workouts</h2>
          <a class="btn btn-primary btn-sm" href="#/workout/new">${icon('plus', 18)} New</a></div>
        ${workouts ? `<ul class="list">${workouts}</ul>`
          : WT.ui.emptyState('No workouts yet', 'Create a workout like Legs, Push or Pull, then assign it to a day.', '<a class="btn btn-primary btn-block" href="#/workout/new">Create a workout</a>', 'plan')}
      </section>

      <section class="section">
        <h2 class="section-title">Your week</h2>
        <p class="muted">Switch on your training days and choose a workout for each.</p>
        <ul class="list days">${days}</ul>
      </section>`;
  }

  WT.changes['day-training'] = el => WT.store.update(s => { s.plan.days[el.dataset.day].training = el.checked; });
  WT.changes['day-workout'] = el => WT.store.update(s => { s.plan.days[el.dataset.day].workoutId = el.value || null; });

  WT.actions['move-day'] = el => {
    const from = el.dataset.day;
    const s = st();
    const w = D.workoutById(s.plan.days[from].workoutId);
    const rows = D.DAYS.filter(d => d.key !== from).map(d => {
      const day = s.plan.days[d.key];
      const other = day.training ? D.workoutById(day.workoutId) : null;
      return `<li><button type="button" class="row-link" data-action="move-to" data-from="${from}" data-to="${d.key}">
        <span class="grow"><span class="row-title">${d.label}</span><span class="sub">${other ? 'Swap with ' + esc(other.name) : day.training ? 'Training, no workout' : 'Rest day'}</span></span>${icon('chev-r')}</button></li>`;
    }).join('');
    WT.ui.openSheet(`<ul class="list">${rows}</ul>`, { title: `Move ${w ? w.name : 'workout'} to…` });
  };

  WT.actions['move-to'] = el => {
    const { from, to } = el.dataset;
    WT.ui.closeSheet();
    WT.store.update(s => {
      const a = s.plan.days[from];
      s.plan.days[from] = s.plan.days[to];
      s.plan.days[to] = a;
    });
    toast('Moved to ' + D.DAYS.find(d => d.key === to).label);
  };

  // ---------- Workout editor
  function getDraft(id) {
    if (draft && draft._key === id) return draft;
    const w = id === 'new' ? null : D.workoutById(id);
    if (id !== 'new' && !w) return null;
    draft = w ? JSON.parse(JSON.stringify(w)) : { id: null, name: '', items: [] };
    draft._key = id;
    return draft;
  }

  const stepper = (label, i, field, val) => `<div class="stepper-wrap"><span class="stepper-label">${label}</span>
    <div class="stepper">
      <button type="button" data-action="wd-step" data-i="${i}" data-field="${field}" data-d="-1" aria-label="Fewer ${label.toLowerCase()}">${icon('minus', 20)}</button>
      <input class="num-input" type="text" inputmode="numeric" pattern="[0-9]*" value="${val}" data-input="wd-num" data-change="wd-num-commit"
        data-i="${i}" data-field="${field}" aria-label="${label}">
      <button type="button" data-action="wd-step" data-i="${i}" data-field="${field}" data-d="1" aria-label="More ${label.toLowerCase()}">${icon('plus', 20)}</button>
    </div></div>`;

  const LIMITS = { targetSets: [1, 20], targetReps: [1, 100] };

  function renderWorkout(params) {
    const id = params[0] || 'new';
    const d = getDraft(id);
    if (!d) return `<nav class="subnav"><a class="back" href="#/plan">${icon('chev-l')} Plan</a></nav>${WT.ui.emptyState('Workout not found', 'It may have been deleted.', '', 'plan')}`;
    const n = d.items.length;
    const items = d.items.map((it, i) => {
      const ex = D.exerciseById(it.exerciseId);
      const name = ex ? ex.name : 'Deleted exercise';
      return `<li class="card item">
        <div class="item-head">
          <div class="grow"><span class="row-title">${esc(name)}</span><span class="sub">${ex ? esc(muscleLine(ex)) : ''}</span></div>
          <div class="item-tools">
            <button type="button" class="icon-btn ghost" data-action="wd-move" data-i="${i}" data-d="-1" aria-label="Move ${esc(name)} up"${i === 0 ? ' disabled' : ''}>${icon('up', 20)}</button>
            <button type="button" class="icon-btn ghost" data-action="wd-move" data-i="${i}" data-d="1" aria-label="Move ${esc(name)} down"${i === n - 1 ? ' disabled' : ''}>${icon('down', 20)}</button>
            <button type="button" class="icon-btn ghost" data-action="wd-remove" data-i="${i}" aria-label="Remove ${esc(name)}">${icon('x', 20)}</button>
          </div>
        </div>
        <div class="item-steppers">${stepper('Sets', i, 'targetSets', it.targetSets)}${stepper('Reps', i, 'targetReps', it.targetReps)}</div>
      </li>`;
    }).join('');

    return `<nav class="subnav"><a class="back" href="#/plan">${icon('chev-l')} Plan</a></nav>
      <h1>${d.id ? 'Edit workout' : 'New workout'}</h1>
      <label class="field mt-lg"><span>Name</span>
        <input class="input" id="wd-name" type="text" maxlength="40" placeholder="e.g. Legs, Push, Pull" value="${esc(d.name)}" data-input="wd-name" autocomplete="off"></label>

      <section class="section">
        <h2 class="section-title">Exercises</h2>
        ${n ? `<ul class="list">${items}</ul>` : '<p class="empty-inline">No exercises yet. Add some from your library.</p>'}
        <button type="button" class="btn btn-soft btn-block mt" data-action="wd-add">${icon('plus', 20)} Add exercises</button>
      </section>

      <div class="section stack">
        <button type="button" class="btn btn-primary btn-block btn-lg" data-action="wd-save">Save workout</button>
        ${d.id ? '<button type="button" class="btn btn-ghost btn-block danger-text" data-action="wd-delete">Delete workout</button>' : ''}
      </div>`;
  }

  WT.inputs['wd-name'] = el => { draft.name = el.value; el.classList.remove('invalid'); };
  WT.inputs['wd-num'] = el => {
    const v = WT.ui.cleanNumber(el.value, false);
    if (v !== el.value) el.value = v;
    draft.items[+el.dataset.i][el.dataset.field] = v === '' ? '' : Number(v);
  };
  WT.changes['wd-num-commit'] = el => {
    const [lo, hi] = LIMITS[el.dataset.field];
    const it = draft.items[+el.dataset.i];
    it[el.dataset.field] = D.clamp(it[el.dataset.field], lo, hi);
    el.value = it[el.dataset.field];
  };
  WT.actions['wd-step'] = el => {
    const [lo, hi] = LIMITS[el.dataset.field];
    const it = draft.items[+el.dataset.i];
    it[el.dataset.field] = D.clamp((Number(it[el.dataset.field]) || 0) + Number(el.dataset.d), lo, hi);
    WT.rerender();
  };
  WT.actions['wd-move'] = el => {
    const i = +el.dataset.i, j = i + Number(el.dataset.d);
    if (j < 0 || j >= draft.items.length) return;
    [draft.items[i], draft.items[j]] = [draft.items[j], draft.items[i]];
    WT.rerender();
  };
  WT.actions['wd-remove'] = el => { draft.items.splice(+el.dataset.i, 1); WT.rerender(); };
  WT.actions['wd-add'] = () => {
    const d = draft;
    WT.ui.openPicker({
      title: 'Add exercises',
      onDone: ids => {
        ids.forEach(id => d.items.push({ exerciseId: id, targetSets: 3, targetReps: 10 }));
        WT.rerender();
      }
    });
  };

  WT.actions['wd-save'] = () => {
    const d = draft;
    const name = d.name.trim().replace(/\s+/g, ' ');
    if (!name) {
      const el = document.getElementById('wd-name');
      el.classList.add('invalid');
      el.focus();
      return toast('Give the workout a name');
    }
    if (st().workouts.some(w => w.id !== d.id && w.name.toLowerCase() === name.toLowerCase())) {
      return toast('You already have a workout with that name');
    }
    const clean = {
      id: d.id || D.uid(),
      name,
      items: d.items.filter(it => D.exerciseById(it.exerciseId)).map(it => ({
        exerciseId: it.exerciseId,
        targetSets: D.clamp(it.targetSets, 1, 20),
        targetReps: D.clamp(it.targetReps, 1, 100)
      }))
    };
    draft = null;
    WT.store.update(s => {
      const i = s.workouts.findIndex(w => w.id === clean.id);
      if (i >= 0) s.workouts[i] = clean; else s.workouts.push(clean);
    }, { silent: true });
    toast('Workout saved');
    WT.go('#/plan');
  };

  WT.actions['wd-delete'] = () => {
    const d = draft;
    if (!confirm(`Delete “${d.name}”? Days that use it will be cleared. Past sessions are kept.`)) return;
    draft = null;
    WT.store.update(s => {
      s.workouts = s.workouts.filter(w => w.id !== d.id);
      Object.values(s.plan.days).forEach(day => { if (day.workoutId === d.id) day.workoutId = null; });
    }, { silent: true });
    toast('Workout deleted');
    WT.go('#/plan');
  };

  WT.screens.plan = { render: renderPlan, title: 'Plan' };
  WT.screens.workout = { render: renderWorkout, title: 'Workout' };
})(window.WT = window.WT || {});
