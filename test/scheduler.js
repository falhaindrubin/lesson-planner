// node test/scheduler.js — the real 2026 takwim, 5.10.2026 timetable, classes and events from sample/
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const calendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const versions = [R.parseTimetable(read('jwg-20261005.md'))];
const { classes } = R.parseClasses(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8'));
const events = R.parseEvents(read('acara-2026.md'));
const week = (n, e = events) => R.lessonsForWeek({ calendar, versions, classes, events: e, week: n });
const brief = l => `${l.dayName} ${l.periods} ${l.subject} ${l.classCode} ${l.kind}`;

// M35 (5–9 Oct): a normal week, 12 PdP in day and period order
const m35 = week(35);
assert.strictEqual(m35.length, 12);
assert.deepStrictEqual(m35.map(brief), [
  'Isnin 2–3 M3 5S pdp', 'Isnin 8–9 ASK 1S pdp',
  'Selasa 1–2 M3 5S pdp', 'Selasa 5–6 PK 2J pdp', 'Selasa 8–9 PK 2D pdp', 'Selasa 12–14 SK 4H pdp',
  'Rabu 7–9 M3 5S pdp', 'Rabu 11–12 ASK 1S pdp',
  'Khamis 1–3 SK 4H tutorial', 'Khamis 5–6 PJ 2D pdp', 'Khamis 10–12 SK 4H pdp',
  'Jumaat 2–3 PJ 2J pdp',
]);
assert.deepStrictEqual(m35[0], {
  week: 35, date: '2026-10-05', dayName: 'Isnin', classCode: '5S', subject: 'M3',
  periods: '2–3', time: '7:30–8:30', minutes: 60, kind: 'pdp', event: '',
});
assert.strictEqual(m35.find(l => l.kind === 'tutorial').minutes, 90);
assert.ok(m35.every(l => l.event === '')); // HEM programmes / meetings are not event days

// M36: Monday 12 Oct X-Break (all forms); UBBM/UBBI PAT is not an exam for my classes
const m36 = week(36);
assert.deepStrictEqual(m36.filter(l => l.dayName === 'Isnin').map(l => l.event), ['X-Break', 'X-Break']);
assert.ok(m36.every(l => l.kind !== 'peperiksaan'));

// M37: PAT Form 4 only -> 4H exams (including tutorial); 5S (Form 5, no exam now), 1S, 2D, 2J normal
const m37 = week(37);
assert.strictEqual(m37.length, 12);
for (const l of m37) assert.strictEqual(l.kind === 'peperiksaan', l.classCode === '4H', brief(l));
assert.strictEqual(m37.find(l => l.classCode === '4H').event, 'PAT TING. 4');

// M38: PAT T4 / UASA -> every class except Form 5 (5S) has an exam
const m38 = week(38);
for (const l of m38) assert.strictEqual(l.kind === 'peperiksaan', l.classCode !== '5S', brief(l));

// M39: Monday 2 Nov Cuti Peristiwa 4 -> no PdP on Monday
const m39 = week(39);
assert.strictEqual(m39.length, 10);
assert.ok(!m39.some(l => l.dayName === 'Isnin'));

// Batal: by class, by form, or everyone; event days by form
const e2 = {
  eventDays: [{ date: '2026-10-07', name: 'Program Transformasi', forms: [1] }],
  cancellations: [
    { date: '2026-10-05', target: '5S', reason: 'Ujian SEGAK' },
    { date: '2026-10-06', target: '2', reason: 'Lawatan' },
    { date: '2026-10-09', target: '', reason: 'Mesyuarat agung' },
  ],
};
const b = week(35, e2);
assert.deepStrictEqual(b.filter(l => l.dayName === 'Isnin').map(l => l.classCode), ['1S']);
assert.deepStrictEqual(b.filter(l => l.dayName === 'Selasa').map(l => l.classCode), ['5S', '4H']);
assert.ok(!b.some(l => l.dayName === 'Jumaat'));
assert.deepStrictEqual(b.filter(l => l.dayName === 'Rabu').map(l => [l.classCode, l.event]), [['5S', ''], ['1S', 'Program Transformasi']]);

// Only one subject in the class file: other slots are not planned and are listed for the CLI note
const one = classes.filter(c => c.classCode === '5S');
assert.deepStrictEqual(R.lessonsForWeek({ calendar, versions, classes: one, events, week: 35 }).map(brief),
  ['Isnin 2–3 M3 5S pdp', 'Selasa 1–2 M3 5S pdp', 'Rabu 7–9 M3 5S pdp']);
assert.deepStrictEqual(R.unplannedSlots(versions, one), ['ASK 1S', 'PK 2J', 'PK 2D', 'SK 4H', 'TUTORIAL 4H', 'PJ 2D', 'PJ 2J']);
assert.deepStrictEqual(R.unplannedSlots(versions, classes), []);

// Errors: a week outside the takwim; no timetable in force
assert.throws(() => week(50), /No week M50 in the takwim/);
assert.throws(() => week(34), /No timetable in force on 2026-09-28/);

console.log('scheduler: all tests passed');
