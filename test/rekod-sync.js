// node test/rekod-sync.js — sync the rekod of 1S ASK and 5S M3 with the real 2026 takwim, timetable and events
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const calendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const versions = [R.parseTimetable(read('jwg-20261002.md'))];
const allClasses = R.parseClasses(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8')).classes.map(c => ({ ...c, pupils: 30 }));
const events = R.parseEvents(read('acara-2026.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const cls = { ...allClasses.find(c => c.classCode === '1S'), pupils: 35, start: '4.2.5' };

// 1S ASK, no RPT: one SP per PdP (Monday 8–9, Wednesday 11–12)
const sync = (rows, week, today, o = {}) => R.syncRekod({
  rows, cls, classes: allClasses, sp: ask, spTime: null,
  calendar, versions, events, week, today, file: 'rekod-1S-ASK.md', ...o,
});
const show = rows => rows.map(r => `M${r.week} ${r.date} ${r.kind} ${r.sp.join(',')} ${r.status} ${r.attendance}${r.event ? ' ' + r.event : ''}${r.note ? ' (' + r.note + ')' : ''}`);
const viaFile = rows => R.parseRekod(R.renderRekod(cls, 2026, rows), 'rekod-1S-ASK.md'); // like the CLI: write, read back

// Empty rekod: plan only the requested week
const s1 = sync([], 35, '2026-10-03');
assert.deepStrictEqual(show(s1.rows), [
  'M35 2026-10-05 pdp 4.2.5 diajar 35',
  'M35 2026-10-07 pdp 4.2.6 diajar 35',
]);
assert.deepStrictEqual(s1.weeks, [35]);
assert.deepStrictEqual(s1.warnings, []);

// Run again without changes: same rekod
const r1 = viaFile(s1.rows);
const s1b = sync(r1, 35, '2026-10-03');
assert.strictEqual(R.renderRekod(cls, 2026, s1b.rows), R.renderRekod(cls, 2026, s1.rows));

// Monday postponed (marked after teaching); week 36 planned on the evening of 5 Oct.
// Wednesday 7 Oct (future, not edited) is rebuilt: 4.2.5 is taught first.
r1[0].status = 'ditunda'; r1[0].note = 'Mesyuarat';
const s2 = sync(r1, 36, '2026-10-05');
assert.deepStrictEqual(show(s2.rows), [
  'M35 2026-10-05 pdp 4.2.5 ditunda 35 (Mesyuarat)',
  'M35 2026-10-07 pdp 4.2.5 diajar 35',
  'M36 2026-10-12 pdp 4.2.6 diajar 35 X-Break',
  'M36 2026-10-14 pdp 4.2.7 diajar 35',
]);
assert.deepStrictEqual(s2.weeks, [35, 36]);

// A future row edited by the teacher (Catatan filled) is kept with the teacher's SP
const r2 = viaFile(s2.rows);
r2[2].sp = ['4.2.6', '4.2.7']; r2[2].note = 'gabung';
const s3 = sync(r2, 36, '2026-10-05');
assert.deepStrictEqual(show(s3.rows).slice(2), [
  'M36 2026-10-12 pdp 4.2.6,4.2.7 diajar 35 X-Break (gabung)',
  'M36 2026-10-14 pdp 4.2.8 diajar 35',
]);
// Only the SP of a future row changed, no Catatan: rebuilt (cannot be detected)
const r2b = viaFile(s2.rows);
r2b[3].sp = ['1.1.1'];
assert.deepStrictEqual(sync(r2b, 36, '2026-10-05').rows[3].sp, ['4.2.7']);

// Skipped weeks are planned too (taught, full attendance) with a warning
const s4 = sync(viaFile(s1.rows), 37, '2026-10-17');
assert.deepStrictEqual(s4.rows.map(r => r.week), [35, 35, 36, 36, 37, 37]);
assert.deepStrictEqual(s4.warnings, ['1S ASK: M36 missing from the rekod; planned as well']);
assert.deepStrictEqual(sync(viaFile(s1.rows), 38, '2026-10-17').warnings, ['1S ASK: M36–M37 missing from the rekod; planned as well']);
// A full holiday week (M6) without PdP is not a skipped week
const m5 = sync([], 5, '2026-02-07', { cls: { ...cls, start: '1.1.1' }, versions: [{ ...versions[0], effectiveFrom: '2026-01-01' }] });
assert.deepStrictEqual(sync(viaFile(m5.rows), 7, '2026-02-21', { cls: { ...cls, start: '1.1.1' }, versions: [{ ...versions[0], effectiveFrom: '2026-01-01' }] }).warnings, []);
// M38: UASA -> exam, no SP, blank Status and Kehadiran
const s5 = sync(viaFile(s1.rows), 38, '2026-10-17');
assert.deepStrictEqual(show(s5.rows.filter(r => r.week === 38)), [
  'M38 2026-10-26 peperiksaan   null PAT TING.4/UASA',
  'M38 2026-10-28 peperiksaan   null PAT TING.4/UASA',
]);

// A past PdP removed by the teacher is not added again; rows out of order are sorted
const rr = viaFile(s1.rows);
const s6 = sync([rr[1]], 35, '2026-10-06'); // Monday 5 Oct removed; Wednesday still ahead
assert.deepStrictEqual(s6.rows.map(r => r.date), ['2026-10-07']);
const s7 = sync([rr[1], rr[0]], 35, '2026-10-03');
assert.deepStrictEqual(s7.rows.map(r => r.date), ['2026-10-05', '2026-10-07']);

// An edited future row whose slot is no longer in the timetable: kept + warning
const swap = { ...rr[1], date: '2026-10-06', dayName: 'Selasa', periods: '3–4', time: '8:00–9:00', note: 'kelas ganti', line: 11 };
const s8 = sync([rr[0], swap], 35, '2026-10-03');
assert.ok(s8.rows.some(r => r.note === 'kelas ganti'));
assert.ok(s8.warnings.includes('rekod-1S-ASK.md:11: 2026-10-06 period 3–4 is not in the timetable; row kept, please check'));

// No DSKP (PK): rows without SP + warning
const pk = { ...allClasses.find(c => c.classCode === '2D' && c.subject === 'PK'), pupils: 30 };
const s9 = sync([], 35, '2026-10-03', { cls: pk, sp: [] });
assert.deepStrictEqual(show(s9.rows), ['M35 2026-10-06 pdp  diajar 30']);
assert.deepStrictEqual(s9.warnings, ['2D PK: no DSKP; SP left blank']);

// Errors: Bil. murid empty; empty rekod without Mula
assert.throws(() => sync([], 35, '2026-10-03', { cls: { ...cls, pupils: null } }), /1S ASK: Bil\. murid is empty in the class file/);
assert.throws(() => sync([], 35, '2026-10-03', { cls: { ...cls, start: '' } }), /1S ASK: rekod is empty and Mula is missing in the class file/);

// Bil. murid changed after generating: untouched future rows are still rebuilt
// (Kehadiran does not lock future rows), so a postponement still shifts the next PdP
const old = viaFile(sync([], 35, '2026-10-03').rows);
old[0].status = 'ditunda'; old[0].note = 'Mesyuarat';
const fresh = sync(old, 35, '2026-10-05', { cls: { ...cls, pupils: 36 } });
assert.deepStrictEqual(show(fresh.rows), [
  'M35 2026-10-05 pdp 4.2.5 ditunda 35 (Mesyuarat)',
  'M35 2026-10-07 pdp 4.2.5 diajar 36',
]);
// A blank Kehadiran on a future PdP does not lock the row either
const blank = viaFile(sync([], 35, '2026-10-03').rows);
blank[1].attendance = null;
assert.strictEqual(sync(blank, 35, '2026-10-03').rows[1].attendance, 35);

// The week in the rekod must match the Tarikh (takwim): a typo M53 stops with file:line
const wrong = viaFile(sync([], 35, '2026-10-03').rows);
wrong[1].week = 53;
assert.throws(() => sync(wrong, 36, '2026-10-09'), /rekod-1S-ASK\.md:11: Minggu M53 does not match Tarikh 2026-10-07 \(M35\)/);
// A Tarikh outside the school weeks (term break) is refused too
const breakRow = viaFile(sync([], 35, '2026-10-03').rows);
breakRow[1].date = '2026-09-02';
assert.throws(() => sync(breakRow, 36, '2026-10-09'), /rekod-1S-ASK\.md:11: Tarikh 2026-09-02 is not a day in a school week/);

// A class without a slot in the timetable (e.g. a mistyped Subjek) stops with a clear message
assert.throws(() => sync([], 35, '2026-10-03', { cls: { ...cls, subject: 'MT3' } }), /1S MT3: no slot in the timetable/);

console.log('rekod-sync: all tests passed');
