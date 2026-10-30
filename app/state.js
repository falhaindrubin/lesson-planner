// App state and actions. Views read `state` and call these actions; every change ends in emit().
// Planning always goes through runWeek (W1); a failed run stores nothing and undoes the change (W4).
import * as C from '../src/core/index.js';
import * as store from './store.js';
import { dirOf, baseName, resolvePath, findFile, importKey } from './logic/paths.js';
import { applyMark } from './logic/marking.js';
import { diffRekod } from './logic/rekod-diff.js';

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

const state = {
  files: new Map(), profile: '', classFile: '', week: null, today: localToday(), tab: 'week',
  result: null, error: '', unsaved: {}, setup: { missing: [], errors: [] }, persisted: true, lastImport: null,
};
const listeners = new Set();
const onChange = fn => listeners.add(fn);
// A tab left open overnight: move `today` on at midnight and plan again
function refreshToday() {
  const t = localToday();
  if (t !== state.today) {
    state.today = t;
    const info = weekInfo();
    if (state.tab === 'today' && info && info.todayWeek != null) state.week = info.todayWeek;
    recalc();
  }
}
const emit = () => listeners.forEach(fn => fn());

const PARSERS = {
  takwim: t => C.parseTakwim(t), timetable: C.parseTimetable, events: C.parseEvents, dskp: t => C.parseDskp(t),
  activities: C.parseActivities, rpt: C.parseRpt, rekod: C.parseRekod, classes: C.parseClasses,
};

const classDir = () => dirOf(state.classFile);
const keyFor = rel => findFile([...state.files.keys()], resolvePath(classDir(), rel));
function read(rel) {
  const k = keyFor(rel);
  return k == null ? null : state.files.get(k);
}
const classes = () => C.parseClasses(state.files.get(state.classFile), state.classFile);

async function load() {
  await store.open();
  state.files = await store.allFiles();
  state.profile = (await store.getSetting('profile')) || '';
  state.classFile = (await store.getSetting('classFile')) || '';
  state.unsaved = (await store.getSetting('unsaved')) || {};
  state.week = (await store.getSetting('week')) || null;
  if (state.classFile && !state.files.has(state.classFile)) state.classFile = '';
  refreshSetup();
}

// Missing inputs and parse errors for the chosen class file (recomputed only when files change)
function refreshSetup() {
  const out = { missing: [], errors: [] };
  if (state.classFile) {
    try {
      for (const { path, role } of C.inputsOf(classes())) {
        let key;
        try { key = keyFor(path); } catch (e) { out.errors.push(e.message); continue; }
        if (key == null) { out.missing.push(resolvePath(classDir(), path)); continue; }
        try { PARSERS[role](state.files.get(key), key); } catch (e) { out.errors.push(e.message); }
      }
    } catch (e) { out.errors.push(e.message); }
  }
  state.setup = out;
}
const ready = () => !!state.classFile && !state.setup.missing.length && !state.setup.errors.length;

let calCache = { text: null, cal: null };
function weekInfo() {
  if (!ready()) return null;
  const K = classes();
  const text = read(K.takwim);
  if (text !== calCache.text) calCache = { text, cal: C.buildCalendar(C.parseTakwim(text)) };
  const cal = calCache.cal;
  return { weeks: cal.weeks.map(w => w.n), todayWeek: C.weekOfDate(cal, state.today), year: K.year };
}

function runFor(week) {
  return C.runWeek({ read, classText: state.files.get(state.classFile), classFile: state.classFile, week, today: state.today, teacher: state.profile });
}

// Store the rekod texts runWeek wrote (in memory now, IndexedDB right after drawing)
function keepRekod(result) {
  const changed = [];
  for (const w of result.writes.filter(x => x.kind === 'rekod')) {
    const key = keyFor(w.path) ?? resolvePath(classDir(), w.path);
    if (state.files.get(key) !== w.text) { state.files.set(key, w.text); changed.push([key, w.text]); }
  }
  return changed;
}
const persist = changed => (changed.length ? store.putFiles(changed) : Promise.resolve());

function recalc() {
  state.error = '';
  const info = weekInfo();
  if (!info) { state.result = null; emit(); return; }
  if (!info.weeks.includes(state.week)) state.week = info.todayWeek ?? info.weeks[0];
  let changed = [];
  try {
    state.result = runFor(state.week);
    changed = keepRekod(state.result);
  } catch (e) { state.result = null; state.error = e.message; }
  emit();
  persist(changed).catch(rollback);
}

// A failed storage write: go back to what is stored, so the screen never shows a change that would be lost on reload
async function rollback(e) {
  const msg = `Could not store the rekod (${e.message}); showing what is saved.`;
  try {
    state.files = await store.allFiles();
    state.unsaved = (await store.getSetting('unsaved')) || {};
    refreshSetup();
    state.result = runFor(state.week);
    state.error = msg;
  } catch { state.result = null; state.error = msg; }
  emit();
}

function setWeek(n) { state.week = n; store.setSetting('week', n); recalc(); }
function goToday() { const info = weekInfo(); if (info && info.todayWeek != null) setWeek(info.todayWeek); }
function setTab(tab) { state.tab = tab; emit(); }
async function setProfile(name) { state.profile = name.trim(); await store.setSetting('profile', state.profile); recalc(); }
async function chooseClassFile(path) { state.classFile = path; await store.setSetting('classFile', path); refreshSetup(); recalc(); }

// Parser role of a picked file, from its name or from the chosen class file's references
function roleOf(path) {
  if (/^kelas-.*\.md$/.test(baseName(path))) return 'classes';
  if (/^rekod-.*\.md$/.test(baseName(path))) return 'rekod';
  if (!state.classFile) return null;
  try {
    for (const x of C.inputsOf(classes()))
      if (resolvePath(classDir(), x.path) === path || baseName(x.path) === baseName(path)) return x.role;
  } catch { /* a broken class file is reported by refreshSetup */ }
  return null;
}

async function importFiles(list) {
  const res = { added: [], rejected: [], conflicts: [] };
  const accept = [];
  for (const { path, text } of list) {
    const role = roleOf(path);
    if (role) {
      try { PARSERS[role](text, path); } catch (e) { res.rejected.push({ path, error: e.message }); continue; }
    }
    // See importKey: folder files keep their path; a drop (or a folder file matching the one dropped copy) updates that copy.
    let key;
    try { key = importKey([...state.files.keys()], path); } catch (e) { res.rejected.push({ path, error: e.message }); continue; }
    if (role === 'rekod' && state.files.has(key) && state.files.get(key) !== text) {
      const diff = diffRekod(state.files.get(key), text, path, state.today);
      if (diff.length) { res.conflicts.push({ path: key, text, diff }); continue; }
    }
    accept.push([key, text]);
  }
  await store.putFiles(accept);
  for (const [k, t] of accept) { state.files.set(k, t); res.added.push(k); }
  const classFiles = [...state.files.keys()].filter(p => /^kelas-.*\.md$/.test(baseName(p)));
  if (!state.classFile && classFiles.length === 1) { state.classFile = classFiles[0]; await store.setSetting('classFile', state.classFile); }
  state.lastImport = res;
  refreshSetup();
  recalc();
  return res;
}

// The re-picked rekod file wins (W8); its unsaved flag is cleared
async function confirmRekod(c) {
  await store.putFiles([[c.path, c.text]]);
  state.files.set(c.path, c.text);
  delete state.unsaved[c.path];
  await store.setSetting('unsaved', state.unsaved);
  state.lastImport.conflicts = state.lastImport.conflicts.filter(x => x !== c);
  refreshSetup();
  recalc();
}
function dropConflict(c) { state.lastImport.conflicts = state.lastImport.conflicts.filter(x => x !== c); emit(); }

// Mark one lesson: change its rekod row, run the week again, keep the result only if it succeeds
function mark(lesson, change) {
  const key = keyFor(lesson.rekod);
  const before = state.files.get(key);
  let text;
  try { text = applyMark(before, lesson.row, change); } catch (e) { return { ok: false, error: e.message }; }
  state.files.set(key, text);
  let result;
  try { result = runFor(state.week); } catch (e) {
    state.files.set(key, before);
    state.error = e.message;
    emit();
    return { ok: false, error: e.message };
  }
  state.error = '';
  state.result = result;
  const changed = keepRekod(result);
  if (!changed.some(([k]) => k === key)) changed.push([key, state.files.get(key)]);
  if (!state.unsaved[key]) state.unsaved[key] = state.today;
  emit();
  // Flag first: a failure in between leaves a harmless extra "unsaved" flag, never a hidden unsaved change
  store.setSetting('unsaved', state.unsaved).then(() => persist(changed)).catch(rollback);
  return { ok: true };
}

export {
  state, onChange, emit, load, refreshSetup, ready, weekInfo, recalc, setWeek, goToday, setTab,
  setProfile, chooseClassFile, importFiles, confirmRekod, dropConflict, mark, localToday, refreshToday,
};
