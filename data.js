/* Data: constants, the in-memory store, and all workout calculations
 * (volume, estimated 1RM, personal records, weekly muscle summary). */
(function (WT) {
  'use strict';

  const MUSCLES = [
    ['chest', 'Chest'], ['shoulders', 'Shoulders'], ['biceps', 'Biceps'], ['triceps', 'Triceps'],
    ['forearms', 'Forearms'], ['abs', 'Abs'], ['obliques', 'Obliques'], ['traps', 'Traps'],
    ['lats', 'Lats'], ['lowerBack', 'Lower back'], ['glutes', 'Glutes'], ['quads', 'Quads'],
    ['hamstrings', 'Hamstrings'], ['calves', 'Calves'], ['adductors', 'Adductors']
  ].map(([id, label]) => ({ id, label }));
  const MUSCLE_LABEL = Object.fromEntries(MUSCLES.map(m => [m.id, m.label]));

  const DAYS = [
    ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
    ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']
  ].map(([key, label]) => ({ key, label, short: label.slice(0, 3) }));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const todayKey = (d = new Date()) => WT.storage.DAY_KEYS[(d.getDay() + 6) % 7];
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(n) || lo)));

  // ---------- Starter library (only used the very first time the app opens)
  function sampleExercises() {
    const howTo = name => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' proper form');
    return [
      ['Barbell Back Squat', ['quads', 'glutes'], ['hamstrings', 'adductors', 'lowerBack']],
      ['Romanian Deadlift', ['hamstrings', 'glutes'], ['lowerBack', 'forearms']],
      ['Bench Press', ['chest'], ['shoulders', 'triceps']],
      ['Overhead Press', ['shoulders'], ['triceps', 'traps']],
      ['Pull-Up', ['lats'], ['biceps', 'forearms']],
      ['Barbell Row', ['lats', 'traps'], ['biceps', 'lowerBack']],
      ['Hip Thrust', ['glutes'], ['hamstrings']],
      ['Walking Lunge', ['quads', 'glutes'], ['adductors', 'hamstrings']],
      ['Lying Leg Curl', ['hamstrings'], ['calves']],
      ['Lateral Raise', ['shoulders'], ['traps']],
      ['Dumbbell Curl', ['biceps'], ['forearms']],
      ['Triceps Pushdown', ['triceps'], []],
      ['Standing Calf Raise', ['calves'], []],
      ['Plank', ['abs'], ['obliques', 'shoulders']]
    ].map(([name, primary, secondary]) => ({
      id: uid(), name, primary, secondary, link: howTo(name), favorite: false, createdAt: new Date().toISOString()
    }));
  }

  // ---------- Store
  let state = WT.storage.load();
  if (!state) {
    state = WT.storage.emptyState();
    state.exercises = sampleExercises();
    WT.storage.save(state);
  }
  const listeners = [];

  const store = {
    get: () => state,
    // Mutate state inside fn, then save. { silent: true } skips re-rendering (used while typing).
    update(fn, opts) {
      fn(state);
      if (!WT.storage.save(state)) WT.ui.toast('Could not save. Is your storage full?');
      if (!(opts && opts.silent)) listeners.forEach(l => l());
    },
    replace(next) {
      state = next;
      WT.storage.save(state);
      listeners.forEach(l => l());
    },
    subscribe(fn) { listeners.push(fn); }
  };

  // ---------- Lookups
  const exerciseById = id => state.exercises.find(e => e.id === id) || null;
  const workoutById = id => state.workouts.find(w => w.id === id) || null;
  const workoutItems = w => (w.items || []).map(it => Object.assign({}, it, { exercise: exerciseById(it.exerciseId) })).filter(it => it.exercise);

  function sortedExercises(query) {
    const q = (query || '').trim().toLowerCase();
    return state.exercises
      .filter(e => !q || e.name.toLowerCase().includes(q) ||
        e.primary.concat(e.secondary).some(m => (MUSCLE_LABEL[m] || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.favorite - a.favorite) || a.name.localeCompare(b.name));
  }

  const sessionsAsc = () => state.sessions.slice().sort((a, b) => (a.date < b.date ? -1 : 1));

  // ---------- Calculations
  // Epley formula; a single rep is its own 1RM.
  const e1rm = (kg, reps) => (!kg || !reps ? 0 : reps === 1 ? kg : kg * (1 + reps / 30));
  const sessionVolume = s => s.exercises.reduce((t, e) => t + e.sets.reduce((a, x) => a + x.kg * x.reps, 0), 0);

  function setStats(sets) {
    let top = sets[0];
    let best = 0, maxReps = 0, volume = 0;
    sets.forEach(x => {
      if (x.kg > top.kg || (x.kg === top.kg && x.reps > top.reps)) top = x;
      best = Math.max(best, e1rm(x.kg, x.reps));
      maxReps = Math.max(maxReps, x.reps);
      volume += x.kg * x.reps;
    });
    return { topKg: top.kg, topReps: top.reps, e1rm: best, maxReps, volume };
  }

  // One row per saved session that includes the exercise, oldest first.
  function exerciseHistory(exId) {
    return sessionsAsc().map(s => {
      const ex = s.exercises.find(e => e.exerciseId === exId);
      if (!ex || !ex.sets.length) return null;
      return Object.assign({ sessionId: s.id, date: s.date, sets: ex.sets, isPR: s.prs.some(p => p.exerciseId === exId) }, setStats(ex.sets));
    }).filter(Boolean);
  }

  function bestBefore(exId, beforeIso) {
    const h = exerciseHistory(exId).filter(r => !beforeIso || r.date < beforeIso);
    if (!h.length) return null;
    return { maxKg: Math.max(...h.map(r => r.topKg)), bestE1rm: Math.max(...h.map(r => r.e1rm)) };
  }

  // A PR = heavier top weight or a higher estimated 1RM than any earlier session.
  // The first time an exercise is logged sets the baseline and is not counted as a PR.
  function detectPRs(session) {
    const out = [];
    session.exercises.forEach(ex => {
      const best = bestBefore(ex.exerciseId, session.date);
      if (!best) return;
      const s = setStats(ex.sets);
      const kinds = [];
      if (s.topKg > best.maxKg) kinds.push('weight');
      if (s.e1rm > best.bestE1rm + 0.01) kinds.push('e1rm');
      if (kinds.length) out.push({ exerciseId: ex.exerciseId, kinds, kg: s.topKg, reps: s.topReps, e1rm: Math.round(s.e1rm * 10) / 10 });
    });
    return out;
  }

  function personalRecords(exId) {
    const h = exerciseHistory(exId);
    if (!h.length) return null;
    const pick = f => h.reduce((b, r) => (f(r) > f(b) ? r : b), h[0]);
    const heavy = pick(r => r.topKg + r.topReps / 1000);
    const best = pick(r => r.e1rm);
    const vol = pick(r => r.volume);
    const reps = pick(r => r.maxReps);
    return {
      heaviest: { kg: heavy.topKg, reps: heavy.topReps, date: heavy.date },
      e1rm: { value: best.e1rm, date: best.date },
      volume: { value: vol.volume, date: vol.date },
      reps: { value: reps.maxReps, date: reps.date }
    };
  }

  function lastSets(exId) {
    const h = exerciseHistory(exId);
    return h.length ? h[h.length - 1].sets : [];
  }

  // Prefill from the last session; fall back to empty kg and the target reps.
  function prefillSets(exId, targetSets, targetReps) {
    const last = lastSets(exId);
    const n = Math.max(1, targetSets || last.length || 3);
    return Array.from({ length: n }, (_, i) => {
      const src = last[i] || last[last.length - 1];
      return { kg: src ? src.kg : '', reps: src ? src.reps : (targetReps || ''), done: false };
    });
  }

  function newActiveSession(w) {
    return {
      id: uid(),
      workoutId: w.id,
      workoutName: w.name,
      startedAt: new Date().toISOString(),
      extra: {},
      exercises: workoutItems(w).map(it => ({
        exerciseId: it.exerciseId,
        name: it.exercise.name,
        targetSets: it.targetSets,
        targetReps: it.targetReps,
        sets: prefillSets(it.exerciseId, it.targetSets, it.targetReps)
      }))
    };
  }

  // Turns the in-progress workout into a saved Session (only completed sets are kept).
  function buildSession(a, extra) {
    const session = {
      id: a.id,
      workoutId: a.workoutId,
      workoutName: a.workoutName,
      startedAt: a.startedAt,
      date: new Date().toISOString(),
      durationMin: extra.durationMin,
      calories: extra.calories,
      avgHr: extra.avgHr,
      exercises: a.exercises.map(e => {
        const def = exerciseById(e.exerciseId);
        return {
          exerciseId: e.exerciseId,
          name: def ? def.name : e.name,
          primary: def ? def.primary.slice() : [],
          secondary: def ? def.secondary.slice() : [],
          sets: e.sets.filter(x => x.done && x.reps > 0).map(x => ({ kg: Number(x.kg) || 0, reps: Number(x.reps) }))
        };
      }).filter(e => e.sets.length),
      prs: []
    };
    session.prs = detectPRs(session);
    session.volume = sessionVolume(session);
    return session;
  }

  function weekStart(d) {
    const x = new Date(d || Date.now());
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  function sessionCounts() {
    const ws = weekStart();
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    let week = 0, month = 0, weekVolume = 0;
    state.sessions.forEach(s => {
      const d = new Date(s.date);
      if (d >= ws) { week++; weekVolume += s.volume || 0; }
      if (d >= ms) month++;
    });
    return { week, month, weekVolume };
  }

  // Sets per muscle this week: a set counts fully for primary muscles, half for secondary.
  function weeklyMuscles() {
    const ws = weekStart();
    const m = {};
    MUSCLES.forEach(x => { m[x.id] = { id: x.id, label: x.label, primary: 0, secondary: 0, score: 0 }; });
    state.sessions.filter(s => new Date(s.date) >= ws).forEach(s => s.exercises.forEach(ex => {
      const def = exerciseById(ex.exerciseId) || ex;
      const n = ex.sets.length;
      (def.primary || []).forEach(id => { if (m[id]) { m[id].primary += n; m[id].score += n; } });
      (def.secondary || []).forEach(id => { if (m[id]) { m[id].secondary += n; m[id].score += n / 2; } });
    }));
    return Object.values(m).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  }

  // Exercises that appear in saved sessions, most recently trained first.
  function loggedExercises() {
    const seen = new Map();
    sessionsAsc().reverse().forEach(s => s.exercises.forEach(e => {
      if (!seen.has(e.exerciseId)) {
        const def = exerciseById(e.exerciseId);
        seen.set(e.exerciseId, { id: e.exerciseId, name: def ? def.name : e.name });
      }
    }));
    return Array.from(seen.values());
  }

  WT.store = store;
  WT.data = {
    MUSCLES, MUSCLE_LABEL, DAYS, uid, todayKey, clamp, sampleExercises,
    exerciseById, workoutById, workoutItems, sortedExercises, sessionsAsc,
    e1rm, sessionVolume, exerciseHistory, bestBefore, detectPRs, personalRecords,
    lastSets, prefillSets, newActiveSession, buildSession, sessionCounts, weeklyMuscles, loggedExercises
  };
})(window.WT = window.WT || {});
