// node test/app-logic.js — the app's pure modules (paths, statuses, wording, marking, rekod diff)
import assert from 'node:assert';
import { dirOf, baseName, resolvePath, findFile, importKey } from '../app/logic/paths.js';
import { STATUS_OPTIONS, statusLabel, needsReason } from '../app/logic/status.js';
import { classLabel, positionWords, rptWeeksWords, percentDone, fitWords } from '../app/logic/words.js';
import { applyMark } from '../app/logic/marking.js';
import { diffRekod, diffSummary } from '../app/logic/rekod-diff.js';

// paths
assert.strictEqual(dirOf('sample/kelas-2026.md'), 'sample');
assert.strictEqual(dirOf('kelas-2026.md'), '');
assert.strictEqual(baseName('output/simulasi-5S-M3/rekod-5S-M3.md'), 'rekod-5S-M3.md');
assert.strictEqual(resolvePath('sample', '../output/rpt-mat-t5-2026.md'), 'output/rpt-mat-t5-2026.md');
assert.strictEqual(resolvePath('sample', 'takwim-smly-2026.md'), 'sample/takwim-smly-2026.md');
assert.strictEqual(resolvePath('sample', '..\\output\\x.md'), 'output/x.md');
assert.strictEqual(resolvePath('', '../../x.md'), 'x.md'); // climbs above the picked folders: dropped
const stored = ['sample/kelas-2026.md', 'output/rpt-mat-t5-2026.md', 'x/rekod-5S-M3.md', 'y/rekod-5S-M3.md', 'acara-2026.md'];
assert.strictEqual(findFile(stored, 'output/rpt-mat-t5-2026.md'), 'output/rpt-mat-t5-2026.md');
assert.strictEqual(findFile(stored, 'sample/acara-2026.md'), 'acara-2026.md'); // dropped without a folder
assert.strictEqual(findFile(stored, 'sample/none.md'), null);
assert.throws(() => findFile(stored, 'z/rekod-5S-M3.md'), /More than one file named rekod-5S-M3\.md: x\/rekod-5S-M3\.md, y\/rekod-5S-M3\.md/);
assert.strictEqual(findFile(stored, 'x/rekod-5S-M3.md'), 'x/rekod-5S-M3.md'); // exact match wins over a clash

// importKey: a folder file whose name matches the only dropped (bare-name) file updates that file in place
assert.strictEqual(importKey(['rekod-5S-M3.md'], 'output/sim/rekod-5S-M3.md'), 'rekod-5S-M3.md');
assert.strictEqual(importKey(['rekod-5S-M3.md', 'x/rekod-5S-M3.md'], 'output/sim/rekod-5S-M3.md'), 'output/sim/rekod-5S-M3.md'); // ambiguous: keep own path
assert.strictEqual(importKey(['output/sim/rekod-5S-M3.md'], 'output/sim/rekod-5S-M3.md'), 'output/sim/rekod-5S-M3.md');
assert.strictEqual(importKey(['a.md'], 'sample/b.md'), 'sample/b.md');
assert.strictEqual(importKey(['x/rekod-5S-M3.md'], 'rekod-5S-M3.md'), 'x/rekod-5S-M3.md'); // dropped file replaces the one stored copy
assert.strictEqual(importKey([], 'new.md'), 'new.md');

// status
assert.deepStrictEqual(STATUS_OPTIONS.map(statusLabel), ['Taught', 'Postponed', 'Cancelled']);
assert.strictEqual(statusLabel(''), '');
assert.deepStrictEqual(STATUS_OPTIONS.map(needsReason), [false, true, true]);

// words
const S = o => ({ classCode: '5S', subject: 'M3', subjectName: 'MATEMATIK', hasDskp: true, hasRpt: true, spTotal: 70, spDone: 49,
  currentSp: '8.2.1', finished: false, rptEnd: 34, position: { status: 'onTrack', sp: '8.2.1', rptWeeks: [31, 31], weeks: 0 }, fit: null, ...o });
assert.strictEqual(classLabel(S()), '5S Matematik');
assert.strictEqual(classLabel(S({ subjectName: 'SAINS KOMPUTER' })), '5S Sains Komputer');
assert.deepStrictEqual(positionWords(S()), { text: 'On track', tone: 'ok' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'behind', sp: 'x', rptWeeks: [1, 1], weeks: 1 } })), { text: '1 week behind', tone: 'warn' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'behind', sp: 'x', rptWeeks: [1, 1], weeks: 3 } })), { text: '3 weeks behind', tone: 'bad' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'ahead', sp: 'x', rptWeeks: [1, 1], weeks: 5 } })), { text: '5 weeks ahead', tone: 'ahead' });
assert.deepStrictEqual(positionWords(S({ finished: true, position: { status: 'finished' } })), { text: 'DSKP finished · revision', tone: 'ok' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'notInRpt', sp: '9.9.9' } })), { text: 'SP 9.9.9 not in RPT', tone: 'warn' });
assert.deepStrictEqual(positionWords(S({ hasRpt: false, position: null })), { text: 'No RPT', tone: 'none' });
assert.deepStrictEqual(positionWords(S({ hasDskp: false, position: null })), { text: 'No DSKP', tone: 'none' });
assert.strictEqual(rptWeeksWords(S()), 'M31');
assert.strictEqual(rptWeeksWords(S({ position: { status: 'behind', sp: 'x', rptWeeks: [30, 31], weeks: 1 } })), 'M30–M31');
assert.strictEqual(rptWeeksWords(S({ hasRpt: false, position: null })), '');
assert.strictEqual(percentDone(S()), 70);
assert.strictEqual(percentDone(S({ spTotal: 0, spDone: 0 })), 0);
assert.strictEqual(fitWords(S()), null);
assert.strictEqual(fitWords(S({ fit: { need: 1240.4, have: 1050, endWeek: 34 } })),
  '5S Matematik: needs 1,240 min for the remaining SPs, has 1,050 min until M34 — consider combining SPs');

// marking
const rekod = [
  '# Rekod 5S M3 2026', '',
  '| Minggu | Tarikh | Hari | Waktu | Masa | Jenis | Acara | SP | Status | Kehadiran | Catatan |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  '| M35 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 7.1.1 | diajar | 35 |  |',
  '| M35 | 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | diajar | 35 |  |',
].join('\n') + '\n';
const tue = { date: '2026-10-06', periods: '1–2' };
const m1 = applyMark(rekod, tue, { status: 'ditunda', attendance: 35, note: 'Mesyuarat | guru' });
assert.ok(m1.includes('| M35 | 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | ditunda | 35 | Mesyuarat / guru |'));
assert.ok(m1.includes('| M35 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 7.1.1 | diajar | 35 |  |')); // other rows untouched
assert.throws(() => applyMark(rekod, tue, { status: 'batal', attendance: 35, note: '' }), /A reason is required for Postponed and Cancelled/);
assert.throws(() => applyMark(rekod, tue, { status: 'ditunda', attendance: 35, note: '   ' }), /A reason is required/);
assert.ok(applyMark(rekod, tue, { status: 'diajar', attendance: 30, note: '' }).includes('| 7.1.2 | diajar | 30 |  |'));
assert.ok(applyMark(rekod, tue, { status: 'diajar', attendance: null, note: 'Baik' }).includes('| 7.1.2 | diajar |  | Baik |'));
assert.throws(() => applyMark(rekod, { date: '2026-10-09', periods: '1–2' }, { status: 'diajar', attendance: 1, note: '' }), /No lesson on 2026-10-09 at period 1 in this rekod/);
// CRLF file (saved on Windows): the mark still applies
const crlf = rekod.replace(/\n/g, '\r\n');
assert.ok(applyMark(crlf, tue, { status: 'batal', attendance: 0, note: 'Cuti' }).includes('| 7.1.2 | batal | 0 | Cuti |'));
// A note with a line break is kept on one line
assert.ok(applyMark(rekod, tue, { status: 'diajar', attendance: 35, note: 'a\nb' }).includes('| 35 | a b |'));

// rekod diff
assert.deepStrictEqual(diffRekod(rekod, rekod, 'f.md'), []);
assert.deepStrictEqual(diffRekod(rekod, crlf, 'f.md'), []); // same rows, Windows line endings
const changed = rekod.replace('| 7.1.2 | diajar | 35 |  |', '| 7.1.2 | ditunda | 35 | Mesyuarat |')
  + '| M36 | 2026-10-12 | Isnin | 2–3 | 7:30–8:30 | pdp | X-Break | 7.1.3 | diajar | 35 |  |\n';
const d = diffRekod(rekod, changed, 'f.md');
assert.deepStrictEqual(d.map(x => x.label), ['M35 Tue', 'M36 Mon']);
assert.deepStrictEqual(d[0].stored, { status: 'diajar', sp: '7.1.2', attendance: 35, note: '' });
assert.deepStrictEqual(d[0].file, { status: 'ditunda', sp: '7.1.2', attendance: 35, note: 'Mesyuarat' });
assert.strictEqual(d[1].stored, null);
assert.strictEqual(diffSummary(d), '2 lessons differ: M35 Tue, M36 Mon');
assert.strictEqual(diffSummary(d.slice(0, 1)), '1 lesson differs: M35 Tue');
assert.throws(() => diffRekod(rekod, rekod.replace('| diajar | 35 |  |', '| tunda | 35 |  |'), 'f.md'), /f\.md:5: Status "tunda" not recognised/);

// diff with today: rows rebuilt by runWeek (future, not edited) are not differences; a future row's SP / attendance are not compared
const extra = '| M36 | 2026-10-12 | Isnin | 2–3 | 7:30–8:30 | pdp | X-Break | 7.1.3 | diajar | 35 |  |\n';
assert.strictEqual(diffRekod(rekod + extra, rekod, 'f.md').length, 1); // no today: strict
assert.deepStrictEqual(diffRekod(rekod + extra, rekod, 'f.md', '2026-10-07'), []);
assert.deepStrictEqual(diffRekod(rekod, rekod + extra, 'f.md', '2026-10-07'), []);
assert.strictEqual(diffRekod(rekod + extra, rekod, 'f.md', '2026-10-12').length, 1); // not future any more
const futureSp = rekod + extra.replace('7.1.3', '7.1.4').replace('| 35 |', '| 30 |');
assert.deepStrictEqual(diffRekod(rekod + extra, futureSp, 'f.md', '2026-10-07'), []);
const futureEdited = rekod + extra.replace('| diajar | 35 |  |', '| ditunda | 35 | Kursus |');
assert.strictEqual(diffRekod(rekod + extra, futureEdited, 'f.md', '2026-10-07').length, 1); // an edited future row still differs
assert.strictEqual(diffRekod(rekod, futureEdited, 'f.md', '2026-10-07').length, 1); // one-sided but edited
assert.strictEqual(diffRekod(rekod, rekod.replace('| 7.1.2 | diajar | 35 |  |', '| 7.1.2 | ditunda | 35 | Y |'), 'f.md', '2026-10-07').length, 1); // past rows always compared

console.log('app-logic: all tests passed');
