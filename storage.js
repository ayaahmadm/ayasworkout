/* Storage: localStorage persistence, schema versioning, migrations and JSON backup.
 *
 * Everything lives under one key as a single JSON document:
 * {
 *   version: 1,                       // schema version, bumped on breaking changes
 *   exercises: Exercise[],            // { id, name, primary[], secondary[], link, favorite, createdAt }
 *   workouts: Workout[],              // { id, name, items: [{ exerciseId, targetSets, targetReps }] }
 *   plan: WeeklyPlan,                 // { days: { mon: { training, workoutId }, ... sun } }
 *   sessions: Session[],              // { id, workoutId, workoutName, startedAt, date, durationMin,
 *                                     //   calories, avgHr, volume, prs[], exercises: [{ exerciseId, name,
 *                                     //   primary[], secondary[], sets: SetLog[] }] }
 *                                     // SetLog = { kg, reps }
 *   activeSession: object | null,     // workout in progress (survives reloads)
 *   settings: { restSeconds },
 *   updatedAt: ISO string
 * }
 */
(function (WT) {
  'use strict';

  const KEY = 'workout-tracker';
  const SCHEMA_VERSION = 1;
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  function emptyState() {
    const days = {};
    DAY_KEYS.forEach(k => { days[k] = { training: false, workoutId: null }; });
    return {
      version: SCHEMA_VERSION,
      exercises: [],
      workouts: [],
      plan: { days },
      sessions: [],
      activeSession: null,
      settings: { restSeconds: 90 },
      updatedAt: new Date().toISOString()
    };
  }

  // Each entry upgrades data from version N to N + 1. Add new ones here when the schema changes,
  // e.g. 1: d => { d.exercises.forEach(e => { e.notes = ''; }); return d; }
  const MIGRATIONS = {};

  // Fill in anything missing so older or hand-edited data never crashes the app.
  function normalize(d) {
    const base = emptyState();
    const out = Object.assign(base, d);
    out.plan = { days: Object.assign(emptyState().plan.days, (d.plan && d.plan.days) || {}) };
    out.settings = Object.assign({ restSeconds: 90 }, d.settings || {});
    ['exercises', 'workouts', 'sessions'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
    out.exercises.forEach(e => {
      e.primary = Array.isArray(e.primary) ? e.primary : [];
      e.secondary = Array.isArray(e.secondary) ? e.secondary : [];
      e.favorite = !!e.favorite;
      e.link = e.link || '';
    });
    out.workouts.forEach(w => { w.items = Array.isArray(w.items) ? w.items : []; });
    out.sessions.forEach(s => { s.prs = Array.isArray(s.prs) ? s.prs : []; s.exercises = s.exercises || []; });
    return out;
  }

  function migrate(d) {
    let v = Number(d.version) || 1;
    if (v > SCHEMA_VERSION) throw new Error('This data comes from a newer version of the app.');
    while (v < SCHEMA_VERSION) {
      d = MIGRATIONS[v](d);
      v++;
    }
    d.version = SCHEMA_VERSION;
    return normalize(d);
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch (err) {
      // Never overwrite data we can't read: park it under a separate key first.
      console.error('Could not read saved data', err);
      try { localStorage.setItem(KEY + '.unreadable-' + Date.now(), raw); } catch (e) { /* ignore */ }
      return null;
    }
  }

  function save(state) {
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('Could not save', err);
      return false;
    }
  }

  function exportBackup(state) {
    const payload = Object.assign({ app: 'workout-tracker', exportedAt: new Date().toISOString() }, state);
    const json = JSON.stringify(payload, null, 2);
    const name = 'workout-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    const file = new File([json], name, { type: 'application/json' });

    // On iPhone the share sheet offers "Save to Files" (iCloud Drive), which is the most reliable route.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: name }).then(() => true, () => false);
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return Promise.resolve(true);
  }

  function parseBackup(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
    if (!d || typeof d !== 'object' || !Array.isArray(d.exercises) || !Array.isArray(d.sessions)) {
      throw new Error('That file does not look like a workout backup.');
    }
    delete d.app;
    delete d.exportedAt;
    return migrate(d);
  }

  WT.storage = { KEY, SCHEMA_VERSION, DAY_KEYS, emptyState, load, save, exportBackup, parseBackup };
})(window.WT = window.WT || {});
