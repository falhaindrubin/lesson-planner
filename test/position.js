// node test/position.js — SP time and position of 4S M3 against the real Matematik T4 2026 RPT
// (2026 class file: simulation timetable from 1 Jan + timetable 5.10.2026)
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const calendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const K = R.parseClasses(read('kelas-2026.md'));
const versions = K.timetables.map(f => R.parseTimetable(read(f)));
const events = R.parseEvents(read('acara-2026.md'));
const mat = R.parseDskp(read('dskp-mat-t4.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const plan = R.plan({ sp: mat, difficulty: R.parseDifficulty(read('kesukaran-mat-t4.md')), calendar, form: 4 });
const rpt = R.parseRpt(R.renderMd(plan, { subject: 'Matematik', year: 2026, dskp: 'd', takwim: 't', difficulty: 'k' }));
const s4 = K.classes[0];

// 4S's real PdP minutes per week: 210 usual; M11 150 (30 Mar, 2–3 Apr holiday); M20 60 (16–17 Jun holiday); M17 0 (PPT)
const weeklyPdp = R.weeklyPdpMinutes({ calendar, versions, cls: s4, classes: K.classes, events });
assert.deepStrictEqual([1, 11, 17, 20, 30, 32].map(weeklyPdp), [210, 150, 0, 60, 90, 120]);
assert.strictEqual(weeklyPdp.usedFallback, false);

// SP time: total = PdP minutes in all RPT weeks; an SP in a partial week gets less time
const spTime = R.spTime({ rpt, sp: mat, weeklyPdp });
const total = [...spTime.values()].reduce((a, b) => a + b, 0);
const capacity = rpt.weeks.filter(w => w.sp.length).reduce((a, w) => a + weeklyPdp(w.n), 0);
assert.strictEqual(capacity, 6090);
assert.ok(Math.abs(total - capacity) < 1, `${total}`);
assert.ok(Math.abs(spTime.get('6.2.2') - 0.275 * 60) < 1e-6); // entirely in M20 (60 minutes)
assert.ok(spTime.get('1.1.1') > spTime.get('6.2.2'));
// No timetable before 5 Oct: early weeks use the earliest timetable, flagged as fallback
const fallback = R.weeklyPdpMinutes({ calendar, versions: [R.parseTimetable(read('jwg-20261002.md'))], cls: s4, classes: K.classes, events });
assert.strictEqual(fallback(1), 210);
assert.deepStrictEqual([fallback.usedFallback, fallback.earliest], [true, '2026-10-05']);

// Position: SP 2.1.1 starts exactly at the start of M5 in the RPT
const at = c => ({ idx: mat.findIndex(s => s.code === c), remaining: null, revisions: 0, finished: false });
const k = (c, week) => R.position({ rpt, calendar, form: 4, sp: mat, end: at(c), spTime, weeklyPdp, weekly: 210, week });
assert.deepStrictEqual(k('2.1.1', 5), { status: 'onTrack', sp: '2.1.1', rptWeeks: [5, 5], weeks: 0 });
assert.strictEqual(R.positionText('4S M3', k('2.1.1', 5)), '4S M3: SP 2.1.1 · RPT M5 · on track');
assert.strictEqual(R.positionText('4S M3', k('2.1.1', 4)), '4S M3: SP 2.1.1 · RPT M5 · 1 week ahead');
// M6 is a full holiday and does not count: at M7 a class still on 2.1.1 is one week behind, not two
assert.strictEqual(R.positionText('4S M3', k('2.1.1', 7)), '4S M3: SP 2.1.1 · RPT M5 · 1 week behind');
// Half an SP already taught counts (remaining)
const half = { ...at('2.1.1'), remaining: spTime.get('2.1.1') / 2 };
assert.ok(R.position({ rpt, calendar, form: 4, sp: mat, end: half, spTime, weeklyPdp, weekly: 210, week: 5 }).status === 'onTrack');
// A partial week does not blow up a small gap: 6.2.1 (in M20, 60 minutes) at the start of M20 = on track
assert.strictEqual(k('6.2.1', 20).status, 'onTrack');
assert.strictEqual(R.positionText('4S M3', R.position({ rpt, calendar, form: 4, sp: mat, end: { finished: true }, week: 35 })), '4S M3: DSKP finished · revision');
assert.strictEqual(R.positionText('4S M3', R.position({ rpt: { ...rpt, weeks: [] }, calendar, form: 4, sp: mat, end: at('6.2.1'), spTime, weeklyPdp, weekly: 210, week: 35 })), '4S M3: SP 6.2.1 not in RPT');

// Class summary: early in the year on track, no warning
const base = { cls: s4, rows: [], sp: mat, rpt, spTime, weeklyPdp, calendar, versions, events, classes: K.classes };
assert.deepStrictEqual(R.classSummary({ ...base, week: 1 }), { text: '4S M3: SP 1.1.1 · RPT M1 · on track', warnings: [] });
// Still at 6.2.1 in M35: far behind and does not fit before the end of the syllabus (M34)
const r35 = R.classSummary({ ...base, cls: { ...s4, start: '6.2.1' }, week: 35 });
assert.strictEqual(r35.text, '4S M3: SP 6.2.1 · RPT M20 · 13 weeks behind');
assert.match(r35.warnings[0], /^4S M3: needs \d+ min for the remaining SPs, has 0 min until M34; consider combining SPs$/);
// Fit: the last SP 10.1.2 (249 minutes) in M35–M36 (420 minutes) -> no warning; from 9.1.1 it does not fit
assert.deepStrictEqual(R.classSummary({ ...base, cls: { ...s4, start: '10.1.2' }, rpt: { ...rpt, end: 36 }, week: 35 }).warnings, []);
assert.match(R.classSummary({ ...base, cls: { ...s4, start: '9.1.1' }, rpt: { ...rpt, end: 36 }, week: 35 }).warnings[0], /has 420 min until M36/);
assert.deepStrictEqual(R.fit({ sp: mat, spTime, end: { idx: mat.length - 1, remaining: 100 }, lessons: [{ minutes: 60 }] }), { need: 100, have: 60 });

// Without an RPT / without a DSKP
const s1 = { classCode: '1S', subject: 'ASK', form: 1, start: '4.2.5' };
assert.deepStrictEqual(R.classSummary({ ...base, cls: s1, sp: ask, rpt: null, spTime: null, week: 35 }), { text: '1S ASK: SP 4.2.5 · no RPT', warnings: [] });
assert.deepStrictEqual(R.classSummary({ ...base, cls: { classCode: '2D', subject: 'PK', form: 2 }, sp: [], rpt: null, spTime: null, week: 35 }), { text: '2D PK: no DSKP', warnings: [] });

console.log('position: all tests passed');
