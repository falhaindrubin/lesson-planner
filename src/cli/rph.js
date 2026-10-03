// Weekly RPH for every class in the class file; updates each class × subject rekod.
//
//   node src/cli/rph.js --classes sample/kelas-2026.md --week 35 [--today 2026-10-03]
//
// The class file names the takwim, timetables, events, rekod folder and output folder (relative to it).
// Rekod rows up to today are never changed; later rows are rebuilt unless the teacher changed
// Status, Attendance or Catatan.
// Output: <Output>/<year>-M<n>-<SUBJECT>.html per subject and planned week,
// then warnings (stderr) and one position line per class.

import fs from 'node:fs';
import path from 'node:path';
import * as C from '../core/index.js';

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.classes || !a.week) throw new Error('Usage: node src/cli/rph.js --classes <class file> --week <n> [--today yyyy-mm-dd]');
  const week = Number(String(a.week).replace(/^M/i, ''));
  const today = a.today || localToday();
  if (!/^\d{4}-\d\d-\d\d$/.test(today)) throw new Error(`--today "${today}" is not yyyy-mm-dd`);

  const classFile = path.resolve(a.classes);
  const dir = path.dirname(classFile);
  const shown = f => path.relative(process.cwd(), f) || f;
  const read = f => fs.readFileSync(path.resolve(dir, f), 'utf8');
  const K = C.parseClasses(fs.readFileSync(classFile, 'utf8'), shown(classFile));
  const calendar = C.buildCalendar(C.parseTakwim(read(K.takwim)));
  const versions = K.timetables.map(f => C.parseTimetable(read(f), f));
  const events = C.parseEvents(read(K.events), K.events);
  const rekodDir = path.resolve(dir, K.rekod), outDir = path.resolve(dir, K.output);

  const cache = new Map();
  const once = (f, fn) => {
    if (!cache.has(f)) cache.set(f, fn(read(f), f));
    return cache.get(f);
  };

  // Every file is written after all classes succeeded: an error in one class leaves no half-written files
  const writes = [];
  // The HTML file is shared by all classes of a subject: collect every class first, then write each
  // (subject, week) planned by any class with the rows of all classes of that subject
  const results = [];
  const keys = new Set(); // 'SUBJECT|n'
  const warnings = [], summaries = [];
  for (const cls of K.classes) {
    const sp = cls.dskp ? once(cls.dskp, C.parseDskp) : [];
    const rpt = cls.rpt ? once(cls.rpt, C.parseRpt) : null;
    const activities = once(cls.activities, C.parseActivities);
    // Time of each SP: this class's real minutes in the RPT weeks where the SP sits
    const weeklyPdp = C.weeklyPdpMinutes({ calendar, versions, cls, classes: K.classes, events });
    const spTime = rpt ? C.spTime({ rpt, sp, weeklyPdp }) : null;
    if (weeklyPdp.usedFallback) warnings.push(`${cls.classCode} ${cls.subject}: no timetable before ${weeklyPdp.earliest}; SP time for earlier weeks uses that timetable`);
    const rekodFile = path.join(rekodDir, `rekod-${cls.classCode}-${cls.subject}.md`);
    const rows = fs.existsSync(rekodFile) ? C.parseRekod(fs.readFileSync(rekodFile, 'utf8'), shown(rekodFile)) : [];
    const s = C.syncRekod({
      rows, cls, classes: K.classes, sp, spTime,
      calendar, versions, events, week, today, file: shown(rekodFile),
    });
    writes.push([rekodFile, C.renderRekod(cls, K.year, s.rows)]);
    warnings.push(...s.warnings);
    results.push({ cls, sp, activities, rows: s.rows });
    for (const n of new Set([...s.weeks, week])) keys.add(`${cls.subject}|${n}`);
    const r = C.classSummary({ cls, rows: s.rows, sp, rpt, spTime, weeklyPdp, calendar, versions, events, classes: K.classes, week });
    summaries.push(r.text);
    warnings.push(...r.warnings);
  }

  for (const key of [...keys].sort((x, y) => x.localeCompare(y))) {
    const [subject, n] = key.split('|');
    const pages = results.filter(h => h.cls.subject === subject)
      .flatMap(h => h.rows.filter(r => r.week === Number(n)).map(row => ({ cls: h.cls, row, sp: h.sp, activities: h.activities })));
    if (!pages.some(p => p.row.status !== 'batal')) continue;
    pages.sort((x, y) => C.byTime(x.row, y.row));
    const f = path.join(outDir, `${K.year}-M${n}-${subject}.html`);
    writes.push([f, C.renderRph({ year: K.year, week: Number(n), teacher: K.teacher, pages })]);
  }
  fs.mkdirSync(rekodDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [f, text] of writes) fs.writeFileSync(f, text);
  writes.filter(([f]) => f.startsWith(outDir)).forEach(([f]) => console.log(shown(f)));
  const unplanned = C.unplannedSlots(versions, K.classes);
  if (unplanned.length) console.log(`Not planned (not in the class file): ${unplanned.join(', ')}`);
  warnings.forEach(w => console.warn('Warning:', w));
  summaries.forEach(l => console.log(l));
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
