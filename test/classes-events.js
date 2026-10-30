// node test/classes-events.js — the real 2026 class and event files from sample/, all-classes test data from test/data/
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// The real 2026 class file: Matematik T4, 4 Stanford only, starting at the start of the year
const K1 = R.parseClasses(read('kelas-2026.md'), 'kelas-2026.md');
assert.strictEqual(K1.year, 2026);
assert.strictEqual(K1.teacher, 'FALHAIND RUBIN');
assert.deepStrictEqual(K1.timetables, ['jwg-20260101-simulasi.md', 'jwg-20261002.md']);
assert.deepStrictEqual([K1.takwim, K1.events, K1.rekod, K1.output], ['takwim-smly-2026.md', 'acara-2026.md', '../output/simulasi-5S-M3', '../output/simulasi-5S-M3']);
assert.strictEqual(K1.classes.length, 1);
const s4 = K1.classes[0];
assert.deepStrictEqual(
  [s4.classCode, s4.fullName, s4.form, s4.subject, s4.subjectName, s4.dskp, s4.rpt, s4.tutorial, s4.pupils, s4.start],
  ['5S', '5 STANFORD', 5, 'M3', 'MATEMATIK', 'dskp-mat-t5.md', '../output/rpt-mat-t5-2026.md', '', 32, '1.1.1'],
);
// Simulation timetable = copy of the 5.10.2026 timetable, in force from 1 Jan
const sim = R.parseTimetable(read('jwg-20260101-simulasi.md'));
assert.strictEqual(sim.effectiveFrom, '2026-01-01');
assert.deepStrictEqual(sim.slots, R.parseTimetable(read('jwg-20261002.md')).slots);

// Test data: all 7 class × subject rows (test/data/kelas-semua.md)
const K = R.parseClasses(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8'), 'kelas-semua.md');
assert.strictEqual(K.classes.length, 7);
assert.strictEqual(K.classes.find(c => c.classCode === '4H').tutorial, 'TUTORIAL');
// Every timetable slot has a row in the class file (Subjek or Tutorial code)
const j = R.parseTimetable(read('jwg-20261002.md'));
for (const s of j.slots)
  assert.ok(K.classes.some(c => c.classCode === s.classCode && (c.subject === s.subject || c.tutorial === s.subject)), `${s.subject} ${s.classCode}`);

// Class row with Bil. murid and Mula; several timetable versions separated by commas; CRLF
const md = [
  '- Tahun: 2026', '- Guru: CIKGU', '- Takwim: t.md', '- Jadual: a.md, b.md', '- Acara: e.md', '- Rekod: r', '- Output: o',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  '| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | d.md | a.md | r.md |  | 35 | 6.2.1 |',
].join('\r\n');
const k2 = R.parseClasses(md, 'k.md');
assert.deepStrictEqual(k2.timetables, ['a.md', 'b.md']);
assert.deepStrictEqual([k2.classes[0].pupils, k2.classes[0].start, k2.classes[0].line], [35, '6.2.1', 10]);
assert.throws(() => R.parseClasses(md.replace('| 4 | M3', '| 6 | M3'), 'k.md'), /k\.md:10: Tingkatan "6" is not 1–5/);
assert.throws(() => R.parseClasses(md.replace('| 35 |', '| 35 orang |'), 'k.md'), /k\.md:10: Bil\. murid "35 orang" is not a number/);
assert.throws(() => R.parseClasses(md.replace('| r.md |  |', '| r.md |'), 'k.md'), /k\.md:10: needs 11 columns/);
assert.throws(() => R.parseClasses(md.replace('- Acara: e.md', ''), 'k.md'), /k\.md: missing line "- Acara: …"/);

// Events 2026: the teacher's list of choices; Batal empty
const A = R.parseEvents(read('acara-2026.md'), 'acara-2026.md');
assert.strictEqual(A.eventDays.filter(a => a.name === 'X-Break').length, 10);
assert.deepStrictEqual(A.eventDays.find(a => a.date === '2026-10-12'), { date: '2026-10-12', name: 'X-Break', forms: [] });
assert.deepStrictEqual(A.cancellations, []);

const A2 = R.parseEvents([
  '## Hari acara', '| Tarikh | Acara | Tingkatan |', '|---|---|---|', '| 2026-10-07 | Program Transformasi | 1 |', '| 2026-10-08 | Ceramah | 1, 2 |',
  '## Batal', '| Tarikh | Sasaran | Sebab |', '|---|---|---|', '| 2026-10-09 | 4S | Ujian SEGAK |', '| 2026-10-13 |  | Mesyuarat agung |',
].join('\n'));
assert.deepStrictEqual(A2.eventDays.map(a => a.forms), [[1], [1, 2]]);
assert.deepStrictEqual(A2.cancellations, [
  { date: '2026-10-09', target: '4S', reason: 'Ujian SEGAK' },
  { date: '2026-10-13', target: '', reason: 'Mesyuarat agung' },
]);
assert.throws(() => R.parseEvents('## Hari acara\n| 2026-10-07 | X | 7 |', 'e.md'), /e\.md:2: Tingkatan "7" is not 1–5/);
assert.throws(() => R.parseEvents('| 2026-10-07 | X | |', 'e.md'), /e\.md:1: date row outside/);

console.log('classes-events: all tests passed');
