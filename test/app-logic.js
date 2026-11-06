// node test/app-logic.js — the app's pure modules (paths, statuses, wording, marking, rekod diff)
import assert from 'node:assert';
import { dirOf, baseName, resolvePath, findFile, importKey } from '../app/logic/paths.js';
import { STATUS_OPTIONS, statusLabel, needsReason } from '../app/logic/status.js';
import { classLabel, positionWords, rptWeeksWords, percentDone, fitWords } from '../app/logic/words.js';
import { applyMark } from '../app/logic/marking.js';
import { parseRptView } from '../app/logic/rpt-view.js';
import { diffRekod, diffSummary } from '../app/logic/rekod-diff.js';
import { weekChip, weekGroups } from '../app/logic/week-pick.js';
import { clock, time24, dayNameOf, timetableGrid } from '../app/logic/timetable-grid.js';

// paths
assert.strictEqual(dirOf('sample/kelas-2026.md'), 'sample');
assert.strictEqual(dirOf('kelas-2026.md'), '');
assert.strictEqual(baseName('output/simulasi-4S-M3/rekod-4S-M3.md'), 'rekod-4S-M3.md');
assert.strictEqual(resolvePath('sample', '../output/rpt-mat-t4-2026.md'), 'output/rpt-mat-t4-2026.md');
assert.strictEqual(resolvePath('sample', 'takwim-smly-2026.md'), 'sample/takwim-smly-2026.md');
assert.strictEqual(resolvePath('sample', '..\\output\\x.md'), 'output/x.md');
assert.strictEqual(resolvePath('', '../../x.md'), 'x.md'); // climbs above the picked folders: dropped
const stored = ['sample/kelas-2026.md', 'output/rpt-mat-t4-2026.md', 'x/rekod-4S-M3.md', 'y/rekod-4S-M3.md', 'acara-2026.md'];
assert.strictEqual(findFile(stored, 'output/rpt-mat-t4-2026.md'), 'output/rpt-mat-t4-2026.md');
assert.strictEqual(findFile(stored, 'sample/acara-2026.md'), 'acara-2026.md'); // dropped without a folder
assert.strictEqual(findFile(stored, 'sample/none.md'), null);
assert.throws(() => findFile(stored, 'z/rekod-4S-M3.md'), /More than one file named rekod-4S-M3\.md: x\/rekod-4S-M3\.md, y\/rekod-4S-M3\.md/);
assert.strictEqual(findFile(stored, 'x/rekod-4S-M3.md'), 'x/rekod-4S-M3.md'); // exact match wins over a clash

// importKey: a folder file whose name matches the only dropped (bare-name) file updates that file in place
assert.strictEqual(importKey(['rekod-4S-M3.md'], 'output/sim/rekod-4S-M3.md'), 'rekod-4S-M3.md');
assert.strictEqual(importKey(['rekod-4S-M3.md', 'x/rekod-4S-M3.md'], 'output/sim/rekod-4S-M3.md'), 'output/sim/rekod-4S-M3.md'); // ambiguous: keep own path
assert.strictEqual(importKey(['output/sim/rekod-4S-M3.md'], 'output/sim/rekod-4S-M3.md'), 'output/sim/rekod-4S-M3.md');
assert.strictEqual(importKey(['a.md'], 'sample/b.md'), 'sample/b.md');
assert.strictEqual(importKey(['x/rekod-4S-M3.md'], 'rekod-4S-M3.md'), 'x/rekod-4S-M3.md'); // dropped file replaces the one stored copy
assert.strictEqual(importKey([], 'new.md'), 'new.md');

// status
assert.deepStrictEqual(STATUS_OPTIONS.map(statusLabel), ['Done', 'Postponed', 'Cancelled']);
assert.strictEqual(statusLabel(''), '');
assert.deepStrictEqual(STATUS_OPTIONS.map(needsReason), [false, true, true]);

// words
const S = o => ({ classCode: '4S', subject: 'M3', subjectName: 'MATEMATIK', hasDskp: true, hasRpt: true, spTotal: 70, spDone: 49,
  currentSp: '8.2.1', finished: false, rptEnd: 34, position: { status: 'onTrack', sp: '8.2.1', rptWeeks: [31, 31], weeks: 0 }, fit: null, ...o });
assert.strictEqual(classLabel(S()), '4S Matematik');
assert.strictEqual(classLabel(S({ subjectName: 'SAINS KOMPUTER' })), '4S Sains Komputer');
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
  '4S Matematik: needs 1,240 min for the remaining SPs, has 1,050 min until M34 — consider combining SPs');

// marking
const rekod = [
  '# Rekod 4S M3 2026', '',
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

// Week bar jump list
{
  const day = (date, holiday = '') => ({ date, holiday });
  const weeks = [
    { n: 12, days: [day('2026-03-23'), day('2026-03-27')] },
    { n: 13, days: [day('2026-03-30'), day('2026-04-03')] },
    { n: 14, days: [day('2026-04-06', 'Cuti'), day('2026-04-07', 'Cuti')] },
  ];
  assert.deepStrictEqual(weekChip(weeks[1], 13), { n: 13, dates: '30 Mar–3 Apr', holiday: false, today: true });
  assert.deepStrictEqual(weekChip(weeks[2], 13), { n: 14, dates: '6–7 Apr', holiday: true, today: false });
  // Grouped by the month a week starts in (M13 starts in March)
  assert.deepStrictEqual(weekGroups(weeks, 13).map(g => [g.month, g.weeks.map(w => w.n)]), [['Mar', [12, 13]], ['Apr', [14]]]);
}

// Today timetable grid
{
  assert.deepStrictEqual(['2026-11-02', '2026-11-03', '2026-11-06', '2026-11-07'].map(dayNameOf), ['Isnin', 'Selasa', 'Jumaat', '']);
  const v = { effectiveFrom: '2026-10-05', slots: [
    { dayName: 'Isnin', periods: [2, 3], time: '7:30–8:30', subject: 'M3', classCode: '4S', room: '' },
    { dayName: 'Selasa', periods: [1, 2], time: '7:00–8:00', subject: 'M3', classCode: '4S', room: '' },
    { dayName: 'Selasa', periods: [5, 5], time: '9:00–9:30', subject: 'PK', classCode: '2J', room: '' },
  ] };
  const g = timetableGrid(v, '2026-11-03');
  assert.deepStrictEqual(g.periods, [1, 2, 3, 4, 5]);
  // Six boundary times for five periods, 24-hour, ending at the end of the last period
  assert.deepStrictEqual(g.marks.map(m => m.time), ['7:00', '7:30', '8:00', '8:30', '9:00', '9:30']);
  assert.deepStrictEqual(g.days.map(d => d.today), [false, true, false, false, false]);
  // Selasa: 1–2 one block at column 1 spanning 2, then PK at column 5; times are the real start and end
  assert.deepStrictEqual(g.days[1].blocks.map(b => [b.col, b.span, b.from, b.to, b.slot.subject]), [[1, 2, '7:00', '8:00', 'M3'], [5, 1, '9:00', '9:30', 'PK']]);
  // A class ending at period 14 ends at 14:00
  assert.strictEqual(clock(840), '14:00');
  // Card times from the aSc 12-hour style
  assert.strictEqual(time24('12:30–2:00'), '12:30–14:00');
  assert.strictEqual(time24('7:00–8:00'), '7:00–8:00');
}

console.log('app-logic: all tests passed');

// RPT view
{
  const md = ['## Ringkasan', '', '| Tajuk | SP | Kesukaran | Agihan (minggu) | Minggu takwim |', '|---|---|---|---|---|',
    '| 1.0 Ubahan | 9 | 18 | 5.0 | M1–M5 |', '', '## Rancangan', '',
    '| Minggu | Tarikh | Tajuk | Standard Kandungan | Standard Pembelajaran | Catatan |', '|---|---|---|---|---|---|',
    '| M1 | 12–16 Jan | 1.0 Ubahan | 1.1 Ubahan Langsung | 1.1.1 A.<br>1.1.2 B. |  |',
    '| M6 | 16–20 Feb | **CUTI — TIADA PdP** |  |  | 16 Feb: CUTI |',
    '|  | 23–27 Mac | **CUTI PENGGAL 1** |  |  |  |'].join('\n');
  const v = parseRptView(md);
  assert.deepStrictEqual(v.topics, [{ name: '1.0 Ubahan', sp: 9, weeks: 5, first: 1, span: 'M1–M5' }]);
  assert.strictEqual(v.weeks.length, 3);
  assert.deepStrictEqual(v.weeks[0], { n: 1, dates: '12–16 Jan', off: '', topics: ['1.0 Ubahan'], standards: ['1.1 Ubahan Langsung'], sp: ['1.1.1 A.', '1.1.2 B.'], note: [] });
  assert.strictEqual(v.weeks[1].off, 'CUTI — TIADA PdP');
  assert.strictEqual(v.weeks[2].n, null);
  assert.throws(() => parseRptView('# empty'), /Rancangan/);
}

// markah (Marks tab)
import fs from 'node:fs';
import { parseMarkah, summarise, gradeOf } from '../app/logic/markah.js';
const mk = parseMarkah(fs.readFileSync(new URL('./data/markah-4S-M3.md', import.meta.url), 'utf8'));
assert.deepStrictEqual(mk.tests, ['PA1', 'PPT', 'PAT']);
assert.strictEqual(mk.students.length, 6);
assert.deepStrictEqual(mk.students[3].marks, [60, 62, null]); // TH = no mark
const sm = summarise(mk);
assert.strictEqual(sm.latest, 2);
assert.strictEqual(sm.per[2].sat, 4);
assert.strictEqual(sm.per[0].avg, (78 + 92 + 45 + 60 + 85 + 50) / 6);
assert.deepStrictEqual(sm.watch.map(w => w.name), ['Chong', 'Farid']); // 30 fails; 66 -> 48 is down 18
assert.strictEqual(gradeOf(89.5) + gradeOf(90) + gradeOf(39), 'AA+G');
assert.throws(() => parseMarkah('| Nama | PA1 |\n|---|---|\n| Ali | 101 |'), /not a mark from 0 to 100/);
assert.throws(() => parseMarkah('nothing'), /no marks table/);
