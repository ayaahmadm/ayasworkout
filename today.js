/* Today screen (home), exercise logging and finishing a workout. */
(function (WT) {
  'use strict';
  const { esc, icon, fmtKg, fmtNum, fmtDate, fmtTime, muscleLine, toast } = WT.ui;
  const D = WT.data;
  const st = () => WT.store.get();

  const noWorkout = () => `<header class="top"><h1>Today</h1></header>
    ${WT.ui.emptyState('No workout in progress', "Start today's workout first.", '<a class="btn btn-primary btn-block" href="#/today">Go to Today</a>', 'today')}`;

  // ---------- Today
  function renderToday() {
    const s = st();
    const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    return `<header class="top"><div><p class="eyebrow">${esc(date)}</p><h1>Today</h1></div>
        <a class="icon-btn" href="#/settings" aria-label="Settings and backup">${icon('gear')}</a></header>
      ${s.activeSession ? activeView(s.activeSession) : idleView(s)}`;
  }

  function idleView(s) {
    const day = s.plan.days[D.todayKey()];
    const w = day.training ? D.workoutById(day.workoutId) : null;
    const c = D.sessionCounts();
    let main;

    if (w) {
      const items = D.workoutItems(w);
      main = `<section class="card hero">
        <p class="eyebrow">Today's workout</p>
        <h2 class="display">${esc(w.name)}</h2>
        ${items.length ? `<ul class="preview">${items.map(it => `<li><span>${esc(it.exercise.name)}</span>
            <span class="num">${it.targetSets} × ${it.targetReps}</span></li>`).join('')}</ul>
          <button type="button" class="btn btn-primary btn-block btn-lg" data-action="start-workout" data-id="${w.id}">Start workout</button>`
        : `<p class="muted">This workout has no exercises yet.</p><a class="btn btn-soft btn-block" href="#/workout/${w.id}">Add exercises</a>`}
      </section>
      ${s.workouts.length > 1 ? '<button type="button" class="btn btn-ghost btn-block" data-action="choose-workout">Do a different workout</button>' : ''}`;
    } else if (day.training) {
      main = WT.ui.emptyState('No workout assigned', 'Today is a training day, but no workout is picked for it yet.',
        '<a class="btn btn-primary btn-block" href="#/plan">Choose in Plan</a>', 'plan');
    } else {
      main = WT.ui.emptyState('Rest day', 'Nothing is planned for today. Recover well, or start a workout anyway.',
        s.workouts.length
          ? '<button type="button" class="btn btn-primary btn-block" data-action="choose-workout">Start a workout</button>'
          : '<a class="btn btn-primary btn-block" href="#/plan">Plan your week</a>', 'moon');
    }

    const last = D.sessionsAsc().pop();
    return `${main}
      <div class="stat-grid section">
        <div class="card stat"><span class="big num">${c.week}</span><span class="stat-label">sessions this week</span></div>
        <div class="card stat"><span class="big num">${c.month}</span><span class="stat-label">sessions this month</span></div>
      </div>
      ${last ? `<section class="section"><h2 class="section-title">Last workout</h2>
        <a class="row-link" href="#/session/${last.id}"><span class="grow"><span class="row-title">${esc(last.workoutName)}</span>
          <span class="sub">${esc(fmtDate(last.date))} · ${fmtNum(last.volume)} kg volume</span></span>
          ${last.prs.length ? '<span class="badge">PR</span>' : ''}${icon('chev-r')}</a></section>` : ''}`;
  }

  function activeView(a) {
    const total = a.exercises.length;
    const done = a.exercises.filter(e => e.sets.length && e.sets.every(x => x.done)).length;
    const started = new Date(a.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const rows = a.exercises.map((e, i) => {
      const def = D.exerciseById(e.exerciseId);
      const n = e.sets.length;
      const d = e.sets.filter(x => x.done).length;
      return `<li><a class="row-link${n && d === n ? ' complete' : ''}" href="#/log/${i}">
        <span class="grow"><span class="row-title">${esc(def ? def.name : e.name)}</span>
          <span class="sub">${def ? esc(muscleLine(def)) : ''}</span>
          <span class="dots" aria-label="${d} of ${n} sets done">${e.sets.map(x => `<i class="${x.done ? 'on' : ''}"></i>`).join('')}</span></span>
        <span class="num row-num">${d}/${n}</span>${icon('chev-r')}</a></li>`;
    }).join('');

    return `<section class="card hero">
        <p class="eyebrow">In progress · started ${esc(started)}</p>
        <h2 class="display">${esc(a.workoutName)}</h2>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="Exercises completed">
          <span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
        <p class="muted small-text">${done} of ${total} exercises complete</p>
      </section>
      <section class="section">
        ${total ? `<ul class="list">${rows}</ul>` : '<p class="empty-inline">No exercises yet. Add one below.</p>'}
        <button type="button" class="btn btn-soft btn-block mt" data-action="active-add">${icon('plus', 20)} Add exercise</button>
      </section>
      <div class="section stack">
        <a class="btn btn-primary btn-block btn-lg" href="#/finish">Finish workout</a>
        <button type="button" class="btn btn-ghost btn-block danger-text" data-action="discard-workout">Discard workout</button>
      </div>`;
  }

  WT.actions['choose-workout'] = () => {
    const ws = st().workouts;
    WT.ui.openSheet(`<ul class="list">${ws.map(w => `<li><button type="button" class="row-link" data-action="start-workout" data-id="${w.id}">
      <span class="grow"><span class="row-title">${esc(w.name)}</span><span class="sub">${w.items.length} exercise${w.items.length === 1 ? '' : 's'}</span></span>${icon('chev-r')}</button></li>`).join('')}</ul>`,
    { title: 'Choose a workout' });
  };

  WT.actions['start-workout'] = el => {
    const w = D.workoutById(el.dataset.id);
    if (!w) return;
    if (st().activeSession && !confirm('Replace the workout in progress?')) return;
    WT.ui.closeSheet();
    WT.store.update(s => { s.activeSession = D.newActiveSession(w); });
    WT.go('#/today');
  };

  WT.actions['active-add'] = () => WT.ui.openPicker({
    title: 'Add to workout',
    onDone: ids => WT.store.update(s => {
      ids.forEach(id => {
        const ex = D.exerciseById(id);
        s.activeSession.exercises.push({ exerciseId: id, name: ex.name, targetSets: 3, targetReps: 10, sets: D.prefillSets(id, 3, 10) });
      });
    })
  });

  WT.actions['discard-workout'] = () => {
    if (!confirm('Discard this workout? Sets you logged will be lost.')) return;
    WT.ui.stopTimer();
    WT.store.update(s => { s.activeSession = null; });
  };

  // ---------- Log one exercise
  function renderLog(params) {
    const a = st().activeSession;
    const i = Number(params[0]);
    const ex = a && a.exercises[i];
    if (!ex) return noWorkout();
    const def = D.exerciseById(ex.exerciseId) || { name: ex.name, primary: [], secondary: [], link: '' };
    const last = D.lastSets(ex.exerciseId);
    const best = D.bestBefore(ex.exerciseId);
    const n = a.exercises.length;

    const rows = ex.sets.map((s, j) => `<div class="set-row${s.done ? ' done' : ''}">
        <span class="set-no num">${s.pr ? '<span class="pr-mini">PR</span>' : j + 1}</span>
        <input class="num-input" type="text" inputmode="decimal" autocomplete="off" value="${s.kg === '' ? '' : esc(s.kg)}" placeholder="0"
          data-input="set-field" data-change="set-field" data-field="kg" data-ex="${i}" data-set="${j}" aria-label="Set ${j + 1} weight in kilograms">
        <input class="num-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${s.reps === '' ? '' : esc(s.reps)}" placeholder="0"
          data-input="set-field" data-change="set-field" data-field="reps" data-ex="${i}" data-set="${j}" aria-label="Set ${j + 1} reps">
        <button type="button" class="check" data-action="toggle-set" data-ex="${i}" data-set="${j}" aria-pressed="${!!s.done}" aria-label="Set ${j + 1} done">${icon('check')}</button>
        <button type="button" class="icon-btn ghost" data-action="remove-set" data-ex="${i}" data-set="${j}" aria-label="Remove set ${j + 1}">${icon('x', 20)}</button>
      </div>`).join('');

    return `<nav class="subnav"><a class="back" href="#/today">${icon('chev-l')} Workout</a><span class="muted num">${i + 1} / ${n}</span></nav>
      <h1>${esc(def.name)}</h1>
      <p class="muted lead">Target ${ex.targetSets} × ${ex.targetReps}</p>

      <p class="last-time"><strong>Last time:</strong> ${last.length ? last.map(x => `${fmtKg(x.kg)} kg × ${x.reps}`).join(' · ') : 'first time. Have fun!'}
        ${best ? `<br><strong>Best:</strong> ${fmtKg(best.maxKg)} kg · est. 1RM ${fmtKg(Math.round(best.bestE1rm * 10) / 10)} kg` : ''}</p>

      <section class="card sets-card">
        <div class="sets-head"><span>Set</span><span>kg</span><span>Reps</span><span></span><span></span></div>
        ${rows || '<p class="empty-inline">No sets yet.</p>'}
        <div class="row-actions">
          <button type="button" class="btn btn-soft" data-action="add-set" data-ex="${i}">${icon('plus', 20)} Add set</button>
          <button type="button" class="btn btn-blue" data-action="timer-start">${icon('timer', 20)} Rest ${fmtTime(st().settings.restSeconds)}</button>
        </div>
      </section>

      <section class="card section">
        ${WT.diagram.render({ primary: def.primary, secondary: def.secondary })}
        ${def.link ? `<a class="btn btn-soft btn-block mt" href="${esc(def.link)}" target="_blank" rel="noopener noreferrer">How to do it ${icon('external', 18)}</a>` : ''}
      </section>

      <div class="pager">
        ${i > 0 ? `<a class="btn btn-soft" href="#/log/${i - 1}">${icon('chev-l', 20)} Previous</a>` : '<span></span>'}
        ${i < n - 1 ? `<a class="btn btn-primary" href="#/log/${i + 1}">Next ${icon('chev-r', 20)}</a>` : '<a class="btn btn-primary" href="#/finish">Finish workout</a>'}
      </div>`;
  }

  const MAX = { kg: 1000, reps: 500 };

  WT.inputs['set-field'] = el => {
    const f = el.dataset.field;
    const v = WT.ui.cleanNumber(el.value, f === 'kg');
    if (v !== el.value) el.value = v;
    const n = v === '' || v === '.' ? '' : Number(v);
    WT.store.update(s => { s.activeSession.exercises[+el.dataset.ex].sets[+el.dataset.set][f] = n; }, { silent: true });
  };
  WT.changes['set-field'] = el => {
    const f = el.dataset.field;
    WT.store.update(s => {
      const set = s.activeSession.exercises[+el.dataset.ex].sets[+el.dataset.set];
      if (set[f] !== '' && set[f] > MAX[f]) {
        set[f] = MAX[f];
        el.value = MAX[f];
        toast(`That looks too high. Max is ${MAX[f]}.`);
      }
    }, { silent: true });
  };

  WT.actions['toggle-set'] = el => {
    const i = +el.dataset.ex, j = +el.dataset.set;
    let completed = false, pr = null;
    WT.store.update(s => {
      const ex = s.activeSession.exercises[i];
      const set = ex.sets[j];
      if (set.done) { set.done = false; set.pr = false; return; }
      if (!(set.reps > 0)) { toast('Enter your reps first'); return; }
      if (set.kg === '') set.kg = 0;
      set.done = true;
      completed = true;
      // Live PR check against saved history and the other sets already done today.
      const best = D.bestBefore(ex.exerciseId);
      if (best && set.kg > 0) {
        const others = ex.sets.filter((x, k) => k !== j && x.done);
        const maxKg = Math.max(best.maxKg, ...others.map(x => x.kg));
        const maxE = Math.max(best.bestE1rm, ...others.map(x => D.e1rm(x.kg, x.reps)));
        if (set.kg > maxKg || D.e1rm(set.kg, set.reps) > maxE + 0.01) { set.pr = true; pr = set; }
      }
    });
    if (completed) WT.ui.startTimer();
    if (pr) toast(`New PR! ${fmtKg(pr.kg)} kg × ${pr.reps}`, 'pr');
  };

  WT.actions['add-set'] = el => WT.store.update(s => {
    const ex = s.activeSession.exercises[+el.dataset.ex];
    const prev = ex.sets[ex.sets.length - 1];
    ex.sets.push({ kg: prev ? prev.kg : '', reps: prev ? prev.reps : ex.targetReps, done: false });
  });

  WT.actions['remove-set'] = el => WT.store.update(s => {
    s.activeSession.exercises[+el.dataset.ex].sets.splice(+el.dataset.set, 1);
  });

  // ---------- Finish
  const elapsedMin = a => Math.max(1, Math.round((Date.now() - new Date(a.startedAt)) / 60000));

  function renderFinish() {
    const a = st().activeSession;
    if (!a) return noWorkout();
    const sets = [].concat(...a.exercises.map(e => e.sets.filter(x => x.done && x.reps > 0)));
    const vol = sets.reduce((t, x) => t + (Number(x.kg) || 0) * x.reps, 0);
    const x = a.extra || {};
    const field = (key, label, unit, ph) => `<label class="field"><span>${label} <em class="opt">optional</em></span>
      <span class="input-unit"><input class="input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
        data-input="finish-field" data-field="${key}" value="${x[key] == null ? '' : esc(x[key])}" placeholder="${ph}"><span class="unit">${unit}</span></span></label>`;

    return `<nav class="subnav"><a class="back" href="#/today">${icon('chev-l')} Workout</a></nav>
      <h1>Finish workout</h1>
      <p class="muted lead">${esc(a.workoutName)}</p>
      <section class="card stat-grid inner">
        <div class="stat"><span class="big num">${fmtNum(vol)}</span><span class="stat-label">kg total volume</span></div>
        <div class="stat"><span class="big num">${sets.length}</span><span class="stat-label">sets completed</span></div>
      </section>
      ${sets.length ? '' : '<p class="notice">No sets are ticked yet. Tap ✓ next to a set to count it.</p>'}
      <section class="section">
        <h2 class="section-title">From your Apple Watch</h2>
        <p class="muted">Type these in if you want to keep them.</p>
        ${field('durationMin', 'Duration', 'min', String(elapsedMin(a)))}
        ${field('calories', 'Calories', 'kcal', 'e.g. 320')}
        ${field('avgHr', 'Average heart rate', 'bpm', 'e.g. 128')}
      </section>
      <button type="button" class="btn btn-primary btn-block btn-lg" data-action="save-session">Save workout</button>`;
  }

  WT.inputs['finish-field'] = el => {
    const v = WT.ui.cleanNumber(el.value, false);
    if (v !== el.value) el.value = v;
    WT.store.update(s => {
      s.activeSession.extra = s.activeSession.extra || {};
      s.activeSession.extra[el.dataset.field] = v === '' ? '' : Number(v);
    }, { silent: true });
  };

  WT.actions['save-session'] = () => {
    const a = st().activeSession;
    if (!a) return;
    const x = a.extra || {};
    const has = k => x[k] !== '' && x[k] != null;
    const dur = has('durationMin') ? x.durationMin : elapsedMin(a);
    if (dur < 1 || dur > 600) return toast('Duration should be between 1 and 600 minutes.');
    if (has('calories') && x.calories > 5000) return toast('Calories look too high (max 5000).');
    if (has('avgHr') && (x.avgHr < 30 || x.avgHr > 230)) return toast('Heart rate should be between 30 and 230 bpm.');

    const session = D.buildSession(a, {
      durationMin: dur,
      calories: has('calories') ? x.calories : null,
      avgHr: has('avgHr') ? x.avgHr : null
    });
    if (!session.exercises.length) return toast('Tick ✓ on at least one set first.');
    WT.ui.stopTimer();
    WT.store.update(s => { s.sessions.push(session); s.activeSession = null; }, { silent: true });
    WT.go('#/session/' + session.id + '/new');
  };

  WT.screens.today = { render: renderToday, title: 'Today' };
  WT.screens.log = { render: renderLog, title: 'Log' };
  WT.screens.finish = { render: renderFinish, title: 'Finish workout' };
})(window.WT = window.WT || {});
