// One week for every class in the class file: sync each rekod, build the RPH pages per subject,
// and summarise each class's position. Pure: every file comes through read(path), with paths
// exactly as written in the class file (relative to its folder). Used by the CLI and the app.
import { parseClasses } from './parse/classes.js';
import { parseTakwim } from './parse/takwim.js';
import { parseTimetable } from './parse/timetable.js';
import { parseEvents } from './parse/events.js';
import { parseDskp } from './parse/dskp.js';
import { parseRpt } from './parse/rpt.js';
import { parseActivities } from './parse/activities.js';
import { parseRekod } from './parse/rekod.js';
import { buildCalendar } from './calendar.js';
import { byTime, unplannedSlots } from './scheduler.js';
import { spTime, weeklyPdpMinutes } from './sp-time.js';
import { syncRekod } from './rekod-sync.js';
import { classSummary } from './position.js';
import { renderRekod } from './render/rekod.js';
import { renderRph } from './render/rph.js';

// Every input file the class file names, once each, with the parser role it needs
function inputsOf(K) {
  const out = [{ path: K.takwim, role: 'takwim' }, ...K.timetables.map(path => ({ path, role: 'timetable' })), { path: K.events, role: 'events' }];
  for (const c of K.classes) {
    if (c.dskp) out.push({ path: c.dskp, role: 'dskp' });
    out.push({ path: c.activities, role: 'activities' });
    if (c.rpt) out.push({ path: c.rpt, role: 'rpt' });
  }
  return [...new Map(out.map(x => [x.path, x])).values()];
}

const rekodPath = (K, cls) => `${K.rekod}/rekod-${cls.classCode}-${cls.subject}.md`;
const rphPath = (K, subject, n) => `${K.output}/${K.year}-M${n}-${subject}.html`;

function runWeek({ read, classText, classFile, week, today, teacher = '' }) {
  const need = p => {
    const t = read(p);
    if (t == null) throw new Error(`Missing file: ${p}`);
    return t;
  };
  const K = parseClasses(classText, classFile);
  const calendar = buildCalendar(parseTakwim(need(K.takwim)));
  const versions = K.timetables.map(f => parseTimetable(need(f), f));
  const events = parseEvents(need(K.events), K.events);
  const cache = new Map();
  const once = (f, fn) => {
    if (!cache.has(f)) cache.set(f, fn(need(f), f));
    return cache.get(f);
  };

  const writes = [], results = [], classes = [], warnings = [];
  const keys = new Set(); // 'SUBJECT|n'
  for (const cls of K.classes) {
    const sp = cls.dskp ? once(cls.dskp, parseDskp) : [];
    const rpt = cls.rpt ? once(cls.rpt, parseRpt) : null;
    const activities = once(cls.activities, parseActivities);
    // SP time: this class's real minutes in the RPT weeks where each SP sits
    const weeklyPdp = weeklyPdpMinutes({ calendar, versions, cls, classes: K.classes, events });
    const spt = rpt ? spTime({ rpt, sp, weeklyPdp }) : null;
    if (weeklyPdp.usedFallback)
      warnings.push(`${cls.classCode} ${cls.subject}: no timetable before ${weeklyPdp.earliest}; SP time for earlier weeks uses that timetable`);
    const file = rekodPath(K, cls);
    const text = read(file);
    const rows = text == null ? [] : parseRekod(text, file);
    const s = syncRekod({ rows, cls, classes: K.classes, sp, spTime: spt, calendar, versions, events, week, today, file });
    writes.push({ path: file, text: renderRekod(cls, K.year, s.rows), kind: 'rekod' });
    warnings.push(...s.warnings);
    results.push({ cls, sp, activities, rows: s.rows, rekod: file });
    for (const n of new Set([...s.weeks, week])) keys.add(`${cls.subject}|${n}`);
    classes.push(classSummary({ cls, rows: s.rows, sp, rpt, spTime: spt, weeklyPdp, calendar, versions, events, classes: K.classes, week }));
  }

  // One HTML per subject and week: all classes of that subject, by time; cancelled lessons have no page
  const rph = [];
  for (const key of [...keys].sort((x, y) => x.localeCompare(y))) {
    const [subject, n] = key.split('|');
    const pages = results.filter(h => h.cls.subject === subject)
      .flatMap(h => h.rows.filter(r => r.week === Number(n)).map(row => ({ cls: h.cls, row, sp: h.sp, activities: h.activities })));
    if (!pages.some(p => p.row.status !== 'batal')) continue;
    pages.sort((x, y) => byTime(x.row, y.row));
    const html = renderRph({ year: K.year, week: Number(n), teacher: teacher || K.teacher, pages });
    rph.push({ subject, week: Number(n), html });
    writes.push({ path: rphPath(K, subject, n), text: html, kind: 'rph' });
  }

  const lessons = results
    .flatMap(h => h.rows.filter(r => r.week === week).map(row => ({
      classCode: h.cls.classCode, subject: h.cls.subject, subjectName: h.cls.subjectName, pupils: h.cls.pupils, rekod: h.rekod, row,
    })))
    .sort((x, y) => byTime(x.row, y.row));
  const w = calendar.weeks.find(x => x.n === week);
  const days = w.days.map(d => ({ date: d.date, dayName: d.dayName, holiday: d.holiday, exams: d.exams.map(e => e.name) }));
  return { writes, rph, lessons, classes, days, unplanned: unplannedSlots(versions, K.classes), warnings };
}

export { inputsOf, rekodPath, rphPath, runWeek };
