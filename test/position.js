// node test/position.js — SP time and position of 5S M3 against the real Matematik T5 2026 RPT
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
const mat = R.parseDskp(read('dskp-mat-t5.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const plan = R.plan({ sp: mat, difficulty: R.parseDifficulty(read('kesukaran-mat-t5.md')), calendar, form: 5 });
const rpt = R.parseRpt(R.renderMd(plan, { subject: 'Matematik', year: 2026, dskp: 'd', takwim: 't', difficulty: 'k' }));
const s4 = K.classes[0];

// 5S's real PdP minutes per week: 210 usual; M11 150 (30 Mar, 2–3 Apr holiday); M20 60 (16–17 Jun holiday); M17 0 (PPT); M30 0 (Percubaan SPM)
const weeklyPdp = R.weeklyPdpMinutes({ calendar, versions, cls: s4, classes: K.classes, events });
assert.deepStrictEqual([1, 11, 17, 20, 30, 32].map(weeklyPdp), [210, 150, 0, 60, 0, 120]);
assert.strictEqual(weeklyPdp.usedFallback, false);

// SP time: total = PdP minutes in all RPT weeks; an SP in a partial week gets less time
const spTime = R.spTime({ rpt, sp: mat, weeklyPdp });
const total = [...spTime.values()].reduce((a, b) => a + b, 0);
const capacity = rpt.weeks.filter(w => w.sp.length).reduce((a, w) => a + weeklyPdp(w.n), 0);
assert.strictEqual(capacity, 4410);
assert.ok(Math.abs(total - capacity) < 1, `${total}`);
assert.ok(Math.abs(spTime.get('5.4.2') - 39.69) < 1e-6); // one of five SPs sharing M21 (210 minutes)
assert.ok(spTime.get('1.1.1') > spTime.get('5.4.2'));
// No timetable before 5 Oct: early weeks use the earliest timetable, flagged as fallback
const fallback = R.weeklyPdpMinutes({ calendar, versions: [R.parseTimetable(read('jwg-20261005.md'))], cls: s4, classes: K.classes, events });
assert.strictEqual(fallback(1), 210);
assert.deepStrictEqual([fallback.usedFallback, fallback.earliest], [true, '2026-10-05']);

// Position: SP 2.1.1 starts exactly at the start of M7 in the RPT (the wording is the CLI's, tested in test/cli.js)
const at = c => ({ idx: mat.findIndex(s => s.code === c), remaining: null, revisions: 0, finished: false });
const k = (c, week) => R.position({ rpt, calendar, form: 5, sp: mat, end: at(c), spTime, weeklyPdp, weekly: 210, week });
assert.deepStrictEqual(k('2.1.1', 7), { status: 'onTrack', sp: '2.1.1', rptWeeks: [7, 7], weeks: 0 });
assert.deepStrictEqual(k('2.1.1', 5), { status: 'ahead', sp: '2.1.1', rptWeeks: [7, 7], weeks: 1 });
// M6 is a full holiday and does not count: at M6 a class on 2.1.1 is still on track, at M8 one week behind
assert.deepStrictEqual(k('2.1.1', 6), { status: 'onTrack', sp: '2.1.1', rptWeeks: [7, 7], weeks: 0 });
assert.deepStrictEqual(k('2.1.1', 8), { status: 'behind', sp: '2.1.1', rptWeeks: [7, 7], weeks: 1 });
assert.deepStrictEqual(R.position({ rpt, calendar, form: 5, sp: mat, end: { finished: true }, week: 35 }), { status: 'finished' });
assert.deepStrictEqual(R.position({ rpt: { ...rpt, weeks: [] }, calendar, form: 5, sp: mat, end: at('6.2.1'), spTime, weeklyPdp, weekly: 210, week: 35 }), { status: 'notInRpt', sp: '6.2.1' });
// Half an SP already taught counts (remaining)
const half = { ...at('2.1.1'), remaining: spTime.get('2.1.1') / 2 };
assert.ok(R.position({ rpt, calendar, form: 5, sp: mat, end: half, spTime, weeklyPdp, weekly: 210, week: 7 }).status === 'onTrack');
// 6.2.1 (M23) at the start of M23 = on track
assert.strictEqual(k('6.2.1', 23).status, 'onTrack');

// Class summary (numbers; the CLI and the app word them): early in the year on track, no warning
const base = { cls: s4, rows: [], sp: mat, rpt, spTime, weeklyPdp, calendar, versions, events, classes: K.classes };
const s1w = R.classSummary({ ...base, week: 1 });
assert.deepStrictEqual([s1w.classCode, s1w.currentSp, s1w.spDone, s1w.finished, s1w.rptEnd], ['5S', '1.1.1', 0, false, 25]);
assert.deepStrictEqual(s1w.position, { status: 'onTrack', sp: '1.1.1', rptWeeks: [1, 1], weeks: 0 });
assert.strictEqual(s1w.fit, null);
// Still at 6.2.1 in M35: far behind and does not fit before the end of the syllabus (M25)
const r35 = R.classSummary({ ...base, cls: { ...s4, start: '6.2.1' }, week: 35 });
assert.deepStrictEqual(r35.position, { status: 'behind', sp: '6.2.1', rptWeeks: [23, 23], weeks: 8 });
assert.deepStrictEqual([r35.fit.have, r35.fit.endWeek], [0, 25]);
assert.ok(r35.fit.need > 0);
// Fit: the last SP 8.1.2 (59 minutes) in M35–M36 (420 minutes) -> fits; from 6.2.1 (615 minutes) it does not
assert.strictEqual(R.classSummary({ ...base, cls: { ...s4, start: '8.1.2' }, rpt: { ...rpt, end: 36 }, week: 35 }).fit, null);
assert.strictEqual(R.classSummary({ ...base, cls: { ...s4, start: '6.2.1' }, rpt: { ...rpt, end: 36 }, week: 35 }).fit.have, 420);
assert.deepStrictEqual(R.fit({ sp: mat, spTime, end: { idx: mat.length - 1, remaining: 100 }, lessons: [{ minutes: 60 }] }), { need: 100, have: 60 });

// Without an RPT / without a DSKP
const s1 = { classCode: '1S', subject: 'ASK', subjectName: 'ASAS SAINS KOMPUTER', form: 1, start: '4.2.5' };
const noRpt = R.classSummary({ ...base, cls: s1, sp: ask, rpt: null, spTime: null, week: 35 });
assert.deepStrictEqual([noRpt.hasDskp, noRpt.hasRpt, noRpt.currentSp, noRpt.position, noRpt.fit, noRpt.rptEnd], [true, false, '4.2.5', null, null, null]);
const noDskp = R.classSummary({ ...base, cls: { classCode: '2D', subject: 'PK', form: 2 }, sp: [], rpt: null, spTime: null, week: 35 });
assert.deepStrictEqual([noDskp.hasDskp, noDskp.spTotal, noDskp.currentSp, noDskp.position], [false, 0, null, null]);

console.log('position: all tests passed');
