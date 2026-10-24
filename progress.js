/* Progress: per-exercise chart and PRs, weekly muscle summary, workout history and session detail. */
(function (WT) {
  'use strict';
  const { esc, icon, fmtKg, fmtNum, fmtDate, toast } = WT.ui;
  const D = WT.data;
  const st = () => WT.store.get();
  const r1 = n => Math.round(n * 10) / 10;

  let selected = null;

  function renderProgress(params) {
    const s = st();
    const head = '<header class="top"><h1>Progress</h1></header>';
    if (!s.sessions.length) {
      return head + WT.ui.emptyState('No workouts yet', 'Finish your first workout and your charts, records and muscle summary will show up here.',
        '<a class="btn btn-primary btn-block" href="#/today">Go to Today</a>', 'progress');
    }
    const c = D.sessionCounts();
    const logged = D.loggedExercises();
    if (params[0]) selected = params[0];
    if (!logged.some(x => x.id === selected)) selected = logged[0] && logged[0].id;

    const hist = D.exerciseHistory(selected);
    const pr = D.personalRecords(selected);
    const sessions = D.sessionsAsc().reverse().slice(0, 15);

    return `${head}
      <div class="stat-grid three">
        <div class="card stat"><span class="big num">${c.week}</span><span class="stat-label">this week</span></div>
        <div class="card stat"><span class="big num">${c.month}</span><span class="stat-label">this month</span></div>
        <div class="card stat"><span class="big num">${c.weekVolume >= 1000 ? r1(c.weekVolume / 1000) + '<small>t</small>' : fmtNum(c.weekVolume) + '<small>kg</small>'}</span><span class="stat-label">lifted this week</span></div>
      </div>

      <section class="section">
        <h2 class="section-title">Exercise</h2>
        <select class="input" data-change="progress-ex" aria-label="Choose exercise">
          ${logged.map(x => `<option value="${x.id}"${x.id === selected ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
        </select>

        <div class="card chart-card mt">
          <div class="legend chart-legend"><span><i class="line-blue"></i>Top weight (kg)</span><span><i class="line-pink"></i>Reps</span><span><i class="dot-pr"></i>PR</span></div>
          <canvas id="ex-chart" class="chart" role="img" aria-label="Top set weight and reps over time"></canvas>
          ${hist.length < 2 ? '<p class="muted small-text center">Log this exercise again to see a trend.</p>' : ''}
        </div>

        ${pr ? `<div class="pr-grid mt">
          <div class="card pr"><span class="stat-label">Heaviest</span><span class="big num">${fmtKg(pr.heaviest.kg)}<small>kg</small></span><span class="sub">× ${pr.heaviest.reps} · ${esc(fmtDate(pr.heaviest.date, { day: 'numeric', month: 'short' }))}</span></div>
          <div class="card pr"><span class="stat-label">Est. 1RM</span><span class="big num">${fmtKg(r1(pr.e1rm.value))}<small>kg</small></span><span class="sub">${esc(fmtDate(pr.e1rm.date, { day: 'numeric', month: 'short' }))}</span></div>
          <div class="card pr"><span class="stat-label">Best volume</span><span class="big num">${fmtNum(pr.volume.value)}<small>kg</small></span><span class="sub">in one session</span></div>
          <div class="card pr"><span class="stat-label">Most reps</span><span class="big num">${pr.reps.value}</span><span class="sub">in one set</span></div>
        </div>` : ''}

        <h3 class="sub-title">History</h3>
        <ul class="list">${hist.slice().reverse().slice(0, 8).map(h => `<li class="card hist">
          <div class="hist-top"><span class="sub">${esc(fmtDate(h.date))}</span>${h.isPR ? `<span class="badge">${icon('trophy', 14)} New PR</span>` : ''}</div>
          <div class="set-pills">${h.sets.map(x => `<span class="set-pill num">${fmtKg(x.kg)}×${x.reps}</span>`).join('')}</div>
          <div class="sub">Volume ${fmtNum(h.volume)} kg · est. 1RM ${fmtKg(r1(h.e1rm))} kg</div>
        </li>`).join('')}</ul>
      </section>

      ${weeklySection()}

      <section class="section">
        <h2 class="section-title">Workout history</h2>
        <ul class="list">${sessions.map(x => `<li><a class="row-link" href="#/session/${x.id}">
          <span class="grow"><span class="row-title">${esc(x.workoutName)}</span>
            <span class="sub">${esc(fmtDate(x.date))} · ${fmtNum(x.volume)} kg${x.durationMin ? ' · ' + x.durationMin + ' min' : ''}</span></span>
          ${x.prs.length ? '<span class="badge">PR</span>' : ''}${icon('chev-r')}</a></li>`).join('')}</ul>
      </section>`;
  }

  function weeklySection() {
    const muscles = D.weeklyMuscles();
    if (!muscles.length) {
      return `<section class="section"><h2 class="section-title">This week's muscles</h2>
        <p class="empty-inline">No workouts logged this week yet.</p></section>`;
    }
    const max = muscles[0].score;
    const top = muscles.slice(0, 3).map(m => m.id);
    const rest = muscles.slice(3).map(m => m.id);
    return `<section class="section"><h2 class="section-title">This week's muscles</h2>
      <div class="card">
        ${WT.diagram.render({ primary: top, secondary: rest, primaryLabel: 'Most trained', secondaryLabel: 'Also trained' })}
        <ul class="bars">${muscles.map(m => `<li>
          <span class="bar-label">${m.label}</span>
          <span class="bar"><span style="width:${Math.max(6, (m.score / max) * 100)}%"></span></span>
          <span class="bar-val num">${m.primary}${m.secondary ? `<small> +${m.secondary}</small>` : ''}</span>
        </li>`).join('')}</ul>
        <p class="muted small-text">Sets per muscle. The small number counts sets where it was a secondary muscle.</p>
      </div></section>`;
  }

  function mountProgress(root) {
    const cv = root.querySelector('#ex-chart');
    if (!cv) return;
    const h = D.exerciseHistory(selected);
    WT.charts.line(cv, {
      labels: h.map(r => fmtDate(r.date, { day: 'numeric', month: 'short' })),
      series: [
        { data: h.map(r => r.topKg), color: '#A6C9DD', axis: 'left', fill: true, pointStroke: '#441910', highlight: h.map(r => r.isPR) },
        { data: h.map(r => r.topReps), color: '#E098AC', axis: 'right', dashed: true }
      ]
    });
  }

  WT.changes['progress-ex'] = el => WT.go('#/progress/' + el.value);

  // ---------- Session detail
  function renderSession(params) {
    const s = st();
    const sess = s.sessions.find(x => x.id === params[0]);
    const isNew = params[1] === 'new';
    const back = isNew ? '<a class="back" href="#/today">Done</a>' : `<a class="back" href="#/progress">${icon('chev-l')} Progress</a>`;
    if (!sess) return `<nav class="subnav">${back}</nav>${WT.ui.emptyState('Session not found', 'It may have been deleted.', '', 'progress')}`;
    const prIds = sess.prs.map(p => p.exerciseId);
    const nameOf = id => { const e = sess.exercises.find(x => x.exerciseId === id); return e ? e.name : ''; };
    const sets = sess.exercises.reduce((t, e) => t + e.sets.length, 0);
    const stat = (v, label) => `<div class="stat"><span class="big num">${v}</span><span class="stat-label">${label}</span></div>`;

    return `<nav class="subnav">${back}</nav>
      ${isNew ? `<p class="eyebrow mt-lg">Workout saved</p>` : ''}
      <h1>${esc(sess.workoutName)}</h1>
      <p class="muted lead">${esc(fmtDate(sess.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>

      ${sess.prs.length ? `<section class="pr-banner" role="status">
        <span class="pr-icon">${icon('trophy', 30)}</span>
        <div><p class="pr-title">New PR${sess.prs.length > 1 ? 's' : ''}!</p>
          <ul>${sess.prs.map(p => `<li><strong>${esc(nameOf(p.exerciseId))}</strong>: ${fmtKg(p.kg)} kg × ${p.reps}${p.kinds.includes('e1rm') ? ` · est. 1RM ${fmtKg(p.e1rm)} kg` : ''}</li>`).join('')}</ul></div>
      </section>` : isNew ? '<p class="notice good">Nice work. Every session counts.</p>' : ''}

      <section class="card stat-grid inner">
        ${stat(fmtNum(sess.volume), 'kg total volume')}
        ${stat(sets, 'sets')}
        ${stat(sess.durationMin ? sess.durationMin + '<small>min</small>' : '–', 'duration')}
        ${stat(sess.calories ? sess.calories + '<small>kcal</small>' : '–', 'calories')}
        ${stat(sess.avgHr ? sess.avgHr + '<small>bpm</small>' : '–', 'avg heart rate')}
      </section>

      <section class="section"><h2 class="section-title">Exercises</h2>
        <ul class="list">${sess.exercises.map(e => {
          const vol = e.sets.reduce((t, x) => t + x.kg * x.reps, 0);
          const best = Math.max(...e.sets.map(x => D.e1rm(x.kg, x.reps)));
          return `<li class="card hist">
            <div class="hist-top"><span class="row-title">${esc(e.name)}</span>${prIds.includes(e.exerciseId) ? `<span class="badge">${icon('trophy', 14)} New PR</span>` : ''}</div>
            <div class="set-pills">${e.sets.map(x => `<span class="set-pill num">${fmtKg(x.kg)}×${x.reps}</span>`).join('')}</div>
            <div class="sub">Volume ${fmtNum(vol)} kg · est. 1RM ${fmtKg(r1(best))} kg</div></li>`;
        }).join('')}</ul></section>

      <div class="section stack">
        ${isNew ? '<a class="btn btn-primary btn-block btn-lg" href="#/today">Done</a>' : ''}
        <button type="button" class="btn btn-ghost btn-block danger-text" data-action="delete-session" data-id="${sess.id}">Delete session</button>
      </div>`;
  }

  WT.actions['delete-session'] = el => {
    if (!confirm('Delete this session? This can’t be undone unless you have a backup.')) return;
    WT.store.update(s => { s.sessions = s.sessions.filter(x => x.id !== el.dataset.id); }, { silent: true });
    toast('Session deleted');
    WT.go('#/progress');
  };

  WT.screens.progress = { render: renderProgress, mount: mountProgress, title: 'Progress' };
  WT.screens.session = { render: renderSession, title: 'Session' };
})(window.WT = window.WT || {});
