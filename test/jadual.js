// node test/jadual.js — the real 5.10.2026 timetable from sample/
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Periods: 30 minutes, period 0 = 6:30, 12-hour clock as in aSc
assert.deepStrictEqual(R.periodRange('2–3'), [2, 3]);
assert.deepStrictEqual(R.periodRange('12-14'), [12, 14]);
assert.deepStrictEqual(R.periodRange(' 9 '), [9, 9]);
assert.throws(() => R.periodRange('3–2'), /Invalid period: "3–2"/);
assert.throws(() => R.periodRange('pagi'), /Invalid period/);
assert.strictEqual(R.fmtPeriods([2, 3]), '2–3');
assert.strictEqual(R.fmtPeriods([9, 9]), '9');
assert.strictEqual(R.periodTime([2, 3]), '7:30–8:30');
assert.strictEqual(R.periodTime([12, 14]), '12:30–2:00');
assert.strictEqual(R.periodTime([10, 12]), '11:30–1:00');
assert.strictEqual(R.periodMinutes([7, 9]), 90);
assert.strictEqual(R.clock24(R.periodStart(3)), '0800');
assert.strictEqual(R.clock24(R.periodStart(15)), '1400');
assert.strictEqual(R.fmtDateDmy('2026-10-05'), '05/10/2026');

// Timetable 5.10.2026: 12 class slots; B slots (Bukan kelas) are ignored
const j = R.parseTimetable(read('jwg-20261005.md'), 'jwg-20261005.md');
assert.strictEqual(j.effectiveFrom, '2026-10-05');
assert.strictEqual(j.slots.length, 12);
assert.deepStrictEqual(j.slots[0], { dayName: 'Isnin', periods: [2, 3], time: '7:30–8:30', subject: 'M3', classCode: '5S', room: '' });
assert.deepStrictEqual(j.slots.find(s => s.subject === 'SK' && s.dayName === 'Selasa').periods, [12, 14]);
assert.ok(!j.slots.some(s => s.dayName === 'Jumaat' && s.periods[0] === 9)); // mark B
assert.strictEqual(j.slots.filter(s => s.subject === 'TUTORIAL').length, 1);

// A time that does not match the period is refused, with the line number
const wrong = read('jwg-20261005.md').replace('| Isnin | 2–3 | 7:30–8:30 |', '| Isnin | 2–3 | 7:30–9:00 |');
assert.throws(() => R.parseTimetable(wrong, 'jwg.md'), /jwg\.md:\d+: Masa "7:30–9:00" does not match Waktu 2–3 \(7:30–8:30\)/);
assert.throws(() => R.parseTimetable('# x\n## Kelas\n', 'x.md'), /x\.md: missing line "- Berkuat kuasa/);
// CRLF (file saved on Windows) reads the same
assert.deepStrictEqual(R.parseTimetable(read('jwg-20261005.md').replace(/\n/g, '\r\n')), j);

// Resolver: the latest version in force on the date
const old = { effectiveFrom: '2026-08-10', slots: [{ dayName: 'Isnin', periods: [1, 2], time: '7:00–8:00', subject: 'M3', classCode: '5S', room: '' }] };
const versions = [j, old]; // order in the list does not matter
assert.strictEqual(R.versionFor(versions, '2026-10-02'), old);
assert.strictEqual(R.versionFor(versions, '2026-10-05'), j);
assert.strictEqual(R.versionFor(versions, '2026-12-01'), j);
assert.throws(() => R.versionFor(versions, '2026-08-07'), /No timetable in force on 2026-08-07/);

// Minutes per week: 5S M3 = 60 + 60 + 90; 4H SK = 90 + 90 (tutorial does not count)
assert.strictEqual(R.weeklyMinutes(j, '5S', 'M3'), 210);
assert.strictEqual(R.weeklyMinutes(j, '4H', 'SK'), 180);
assert.strictEqual(R.weeklyMinutes(old, '5S', 'M3'), 60);

console.log('jadual: all tests passed');
