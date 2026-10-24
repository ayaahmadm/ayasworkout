/* Settings: rest timer default, backup export/import, data info. */
(function (WT) {
  'use strict';
  const { esc, icon, fmtTime, toast } = WT.ui;
  const D = WT.data;
  const st = () => WT.store.get();

  function renderSettings() {
    const s = st();
    const updated = new Date(s.updatedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return `<nav class="subnav"><a class="back" href="#/today">${icon('chev-l')} Today</a></nav>
      <h1>Settings</h1>

      <section class="section"><h2 class="section-title">Rest timer</h2>
        <div class="card setting-row">
          <span class="grow"><span class="row-title">Default rest</span><span class="sub">Starts automatically when you tick a set</span></span>
          <div class="stepper compact">
            <button type="button" data-action="rest-step" data-d="-15" aria-label="15 seconds less">${icon('minus', 20)}</button>
            <span class="num stepper-value" aria-live="polite">${fmtTime(s.settings.restSeconds)}</span>
            <button type="button" data-action="rest-step" data-d="15" aria-label="15 seconds more">${icon('plus', 20)}</button>
          </div>
        </div>
      </section>

      <section class="section"><h2 class="section-title">Backup</h2>
        <p class="muted">Your data is stored only on this phone, in this browser. Export a backup now and then and save it to Files or iCloud Drive.</p>
        <div class="stack">
          <button type="button" class="btn btn-primary btn-block" data-action="export">${icon('download', 20)} Export backup</button>
          <label class="btn btn-soft btn-block file-btn">${icon('upload', 20)} Import backup
            <input class="visually-hidden" type="file" accept="application/json,.json" data-change="import-file"></label>
        </div>
      </section>

      <section class="section"><h2 class="section-title">Your data</h2>
        <div class="card">
          <dl class="facts">
            <div><dt>Exercises</dt><dd class="num">${s.exercises.length}</dd></div>
            <div><dt>Workouts</dt><dd class="num">${s.workouts.length}</dd></div>
            <div><dt>Sessions</dt><dd class="num">${s.sessions.length}</dd></div>
            <div><dt>Last saved</dt><dd>${esc(updated)}</dd></div>
            <div><dt>Data version</dt><dd>v${s.version}</dd></div>
          </dl>
        </div>
        <div class="stack mt">
          <button type="button" class="btn btn-soft btn-block" data-action="add-starters">Add starter exercises</button>
          <button type="button" class="btn btn-ghost btn-block danger-text" data-action="reset-all">Erase all data</button>
        </div>
      </section>`;
  }

  WT.actions['rest-step'] = el => WT.store.update(s => {
    s.settings.restSeconds = Math.min(600, Math.max(15, s.settings.restSeconds + Number(el.dataset.d)));
  });

  WT.actions.export = () => {
    WT.storage.exportBackup(st()).then(ok => { if (ok) toast('Backup ready'); });
  };

  WT.changes['import-file'] = el => {
    const file = el.files && el.files[0];
    el.value = '';
    if (!file) return;
    file.text().then(text => {
      const data = WT.storage.parseBackup(text);
      const msg = `Replace everything on this phone with this backup?\n\n${data.exercises.length} exercises, ${data.workouts.length} workouts, ${data.sessions.length} sessions.`;
      if (!confirm(msg)) return;
      WT.store.replace(data);
      toast('Backup imported');
    }).catch(err => toast(err.message || 'Could not read that file'));
  };

  WT.actions['add-starters'] = () => {
    const have = new Set(st().exercises.map(e => e.name.toLowerCase()));
    const add = D.sampleExercises().filter(e => !have.has(e.name.toLowerCase()));
    if (!add.length) return toast('You already have all the starter exercises');
    WT.store.update(s => { s.exercises.push(...add); });
    toast(`Added ${add.length} exercise${add.length === 1 ? '' : 's'}`);
  };

  WT.actions['reset-all'] = () => {
    if (!confirm('Erase all exercises, workouts and history from this phone?')) return;
    if (!confirm('Are you sure? Export a backup first if you might want this data again.')) return;
    WT.ui.stopTimer();
    WT.store.replace(WT.storage.emptyState());
    toast('All data erased');
    WT.go('#/today');
  };

  WT.screens.settings = { render: renderSettings, title: 'Settings' };
})(window.WT = window.WT || {});
