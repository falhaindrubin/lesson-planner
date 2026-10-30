// node test/week.js — runWeek on the real 2026 sample files, read from memory as the app does
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import * as R from '../src/core/index.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sample = f => fs.readFileSync(path.join(root, 'sample', f), 'utf8');

const calendar = R.buildCalendar(R.parseTakwim(sample('takwim-smly-2026.md')));
const plan = R.plan({ sp: R.parseDskp(sample('dskp-mat-t5.md')), difficulty: R.parseDifficulty(sample('kesukaran-mat-t5.md')), calendar, form: 5 });
const base = () => new Map([
  ['takwim.md', sample('takwim-smly-2026.md')], ['jwg-sim.md', sample('jwg-20260101-simulasi.md')], ['jwg.md', sample('jwg-20261005.md')],
  ['acara.md', sample('acara-2026.md')], ['dskp.md', sample('dskp-mat-t5.md')], ['aktiviti.md', sample('aktiviti-umum.md')],
  ['rpt.md', R.renderMd(plan, { subject: 'Matematik', year: 2026, dskp: 'd', takwim: 't', difficulty: 'k' })],
]);
// No "- Guru:" line: the name comes from the app's Profile
const classText = (start = '7.1.1') => ['- Tahun: 2026', '- Takwim: takwim.md', '- Jadual: jwg-sim.md, jwg.md', '- Acara: acara.md',
  '- Rekod: rekod', '- Output: out', '',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  `| 5S | 5 STANFORD | 5 | M3 | MATEMATIK | dskp.md | aktiviti.md | rpt.md |  | 35 | ${start} |`].join('\n');
let files = base();
const read = p => (files.has(p) ? files.get(p) : null);
const run = (week, today, teacher) => {
  const r = R.runWeek({ read, classText: classText(), classFile: 'kelas.md', week, today, teacher });
  for (const w of r.writes) if (w.kind === 'rekod') files.set(w.path, w.text); // the app stores rekod writes
  return r;
};
const rekod = () => R.parseRekod(files.get('rekod/rekod-5S-M3.md'));
const pages = html => (html.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length;

// inputsOf: every referenced file once, with its role
const K = R.parseClasses(classText(), 'kelas.md');
assert.deepStrictEqual(R.inputsOf(K), [
  { path: 'takwim.md', role: 'takwim' }, { path: 'jwg-sim.md', role: 'timetable' }, { path: 'jwg.md', role: 'timetable' },
  { path: 'acara.md', role: 'events' }, { path: 'dskp.md', role: 'dskp' }, { path: 'aktiviti.md', role: 'activities' }, { path: 'rpt.md', role: 'rpt' },
]);
assert.strictEqual(K.teacher, '');

// Week 35 from an empty rekod, Saturday 3 Oct
const r1 = run(35, '2026-10-03', 'CIKGU CONTOH');
assert.deepStrictEqual(r1.writes.map(w => [w.path, w.kind]), [['rekod/rekod-5S-M3.md', 'rekod'], ['out/2026-M35-M3.html', 'rph']]);
assert.deepStrictEqual(r1.lessons.map(l => [l.row.date, l.row.sp.join(', '), l.rekod]), [
  ['2026-10-05', '7.1.1, 7.1.2', 'rekod/rekod-5S-M3.md'], ['2026-10-06', '7.1.2, 7.1.3', 'rekod/rekod-5S-M3.md'], ['2026-10-07', '7.1.3, 7.2.1', 'rekod/rekod-5S-M3.md'],
]);
assert.ok(r1.rph[0].html.includes('CIKGU CONTOH'));
assert.strictEqual(r1.days[0].date, '2026-10-05');
assert.strictEqual(r1.days.length, 5);
const s1 = r1.classes[0];
assert.deepStrictEqual([s1.classCode, s1.subject, s1.subjectName, s1.hasDskp, s1.hasRpt, s1.currentSp, s1.finished, s1.rptEnd],
  ['5S', 'M3', 'MATEMATIK', true, true, '7.1.1', false, 25]);
assert.strictEqual(s1.spDone, R.parseDskp(sample('dskp-mat-t5.md')).findIndex(s => s.code === '7.1.1'));
assert.strictEqual(s1.position.status, 'behind');
assert.deepStrictEqual(s1.position.rptWeeks, [23, 23]);
assert.deepStrictEqual([s1.fit.have, s1.fit.endWeek], [0, 25]);
// Blank teacher: NAMA GURU row is blank, not "undefined"
assert.ok(!run(35, '2026-10-03', '').rph[0].html.includes('undefined'));

// Postponed: Tuesday 6 Oct ditunda with a reason, then week 36 on the evening of 6 Oct
files.set('rekod/rekod-5S-M3.md', files.get('rekod/rekod-5S-M3.md')
  .replace('| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2, 7.1.3 | diajar | 35 |  |', '| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2, 7.1.3 | ditunda | 35 | Mesyuarat |'));
const r2 = run(36, '2026-10-06', 'CIKGU CONTOH');
assert.deepStrictEqual(rekod().find(r => r.date === '2026-10-07').sp, ['7.1.2', '7.1.3']);
assert.ok(r2.rph.find(p => p.week === 35).html.includes('☑ PdP ditunda kerana: Mesyuarat'));

// Re-marked past lesson: Tuesday back to diajar on 8 Oct; Wednesday (past) is kept, Monday 12 Oct continues at 7.2.1
files.set('rekod/rekod-5S-M3.md', files.get('rekod/rekod-5S-M3.md').replace('| 7.1.2, 7.1.3 | ditunda | 35 | Mesyuarat |', '| 7.1.2, 7.1.3 | diajar | 35 | Sudah diajar |'));
run(36, '2026-10-08', 'CIKGU CONTOH');
assert.deepStrictEqual(rekod().find(r => r.date === '2026-10-07').sp, ['7.1.2', '7.1.3']);
assert.strictEqual(rekod().find(r => r.date === '2026-10-12').sp[0], '7.2.1');

// Cancelled: Monday 12 Oct batal → no page for it in M36
const before = pages(run(36, '2026-10-08', 'X').rph.find(p => p.week === 36).html);
files.set('rekod/rekod-5S-M3.md', files.get('rekod/rekod-5S-M3.md').replace(/(\| 2026-10-12 \|[^\n]*\| )diajar( \|[^|]*\|)[^|\n]*\|/, '$1batal$2 Kursus |'));
const r3 = run(36, '2026-10-08', 'X');
assert.strictEqual(pages(r3.rph.find(p => p.week === 36).html), before - 1);

// Exam week (M17, PPT for Forms 4–5): exam rows only, no SPs
files = base();
const r4 = run(17, '2026-04-18', 'X');
assert.ok(r4.lessons.length > 0);
assert.ok(r4.lessons.every(l => l.row.kind === 'peperiksaan' && l.row.sp.length === 0));
assert.ok(r4.rph[0].html.includes('PEPERIKSAAN'));

// A week with no lessons for the class (M6): no lessons, no RPH
files = base();
const r5 = run(6, '2026-02-14', 'X');
assert.deepStrictEqual([r5.lessons.length, r5.rph.length], [0, 0]);

// Missing input: clear message, nothing returned
files = base();
files.delete('acara.md');
assert.throws(() => run(35, '2026-10-03', 'X'), /Missing file: acara\.md/);

// weekOfDate: Monday and Saturday of M1 → 1; a school-break day → null
assert.strictEqual(R.weekOfDate(calendar, '2026-01-12'), 1);
assert.strictEqual(R.weekOfDate(calendar, '2026-01-17'), 1);
assert.strictEqual(R.weekOfDate(calendar, calendar.gaps[0].date), null);

// A pdp row whose Status was blanked by hand (Monday 5 Oct is 5S M3, periods 2–3): warned, counted as not taught
files = base();
files.set('rekod/rekod-5S-M3.md', '| M35 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 7.1.1 |  | 35 |  |\n');
assert.ok(run(35, '2026-10-06', 'X').warnings.includes('rekod/rekod-5S-M3.md:1: Status blank, counted as not taught'));

// UTF-8 BOM (Windows Notepad) is accepted in every input and in the class file
files = base();
for (const [k, v] of files) files.set(k, '﻿' + v);
const bom = R.runWeek({ read, classText: '﻿' + classText(), classFile: 'kelas.md', week: 35, today: '2026-10-03', teacher: 'X' });
assert.strictEqual(bom.lessons.length, 3);

// Responsiveness (W13): one week for one class plans in under 100 ms once warm
files = base();
run(35, '2026-10-03', 'X');
const t0 = performance.now();
run(35, '2026-10-03', 'X');
const ms = performance.now() - t0;
assert.ok(ms < 100, `runWeek took ${ms.toFixed(0)} ms`);

console.log('week: all tests passed');
