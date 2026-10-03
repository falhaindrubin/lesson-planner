// node test/rekod.js — read and write the PdP rekod of one class × subject
import assert from 'node:assert';
import * as R from '../src/core/index.js';

const cls = { classCode: '4S', subject: 'M3', fullName: '4 STANFORD', form: 4, subjectName: 'MATEMATIK' };
const rows = [
  { week: 35, date: '2026-10-05', dayName: 'Isnin', periods: '2–3', time: '7:30–8:30', minutes: 60, kind: 'pdp', event: '', sp: ['6.2.1'], status: 'diajar', attendance: 35, note: '' },
  { week: 35, date: '2026-10-07', dayName: 'Rabu', periods: '7–9', time: '10:00–11:30', minutes: 90, kind: 'pdp', event: '', sp: ['6.2.2', '6.2.3'], status: 'ditunda', attendance: 35, note: 'Mesyuarat' },
  { week: 37, date: '2026-10-19', dayName: 'Isnin', periods: '2–3', time: '7:30–8:30', minutes: 60, kind: 'peperiksaan', event: 'PAT TING. 4', sp: [], status: '', attendance: null, note: '' },
];
const md = R.renderRekod(cls, 2026, rows);
assert.ok(md.startsWith('# Rekod 4S M3 2026\n'));
assert.ok(md.includes('| M35 | 2026-10-07 | Rabu | 7–9 | 10:00–11:30 | pdp |  | 6.2.2, 6.2.3 | ditunda | 35 | Mesyuarat |\n'));
assert.ok(md.includes('| M37 | 2026-10-19 | Isnin | 2–3 | 7:30–8:30 | peperiksaan | PAT TING. 4 |  |  |  |  |\n'));

// Round trip: reading back = the original rows (+ line number); writing again = the same bytes
const back = R.parseRekod(md, 'rekod-4S-M3.md');
assert.deepStrictEqual(back.map(({ line, ...r }) => r), rows);
assert.deepStrictEqual(back.map(r => r.line), [10, 11, 12]);
assert.strictEqual(R.renderRekod(cls, 2026, back), md);

// A file saved with CRLF on Windows reads the same
assert.deepStrictEqual(R.parseRekod(md.replace(/\n/g, '\r\n')), back);

// The teacher types loosely: Status in capitals / spaces, Kehadiran '33/35', SP with various separators
const loose = md
  .replace('| 6.2.1 | diajar | 35 |', '| 6.2.1 Membuat konjektur | Diajar  | 33/35 |')
  .replace('| 6.2.2, 6.2.3 | ditunda |', '| 6.2.2 + 6.2.3 | DITUNDA |');
const l = R.parseRekod(loose);
assert.deepStrictEqual([l[0].sp, l[0].status, l[0].attendance], [['6.2.1'], 'diajar', 33]);
assert.deepStrictEqual([l[1].sp, l[1].status], [['6.2.2', '6.2.3'], 'ditunda']);
assert.deepStrictEqual(R.spCodes('4.2.7,4.2.8'), ['4.2.7', '4.2.8']);
assert.deepStrictEqual(R.spCodes('4.2.10 dan 4.2 Kod Arahan'), ['4.2.10']); // an SK code is not an SP
assert.deepStrictEqual(R.spCodes('Ulang kaji 1.0'), ['1.0']);

// A Catatan with '|' does not break the table
const pipe = R.renderRekod(cls, 2026, [{ ...rows[0], note: 'a | b' }]);
assert.strictEqual(R.parseRekod(pipe)[0].note, 'a / b');

// Errors carry the file name and line number
const bad = (from, to) => () => R.parseRekod(md.replace(from, to), 'rekod-4S-M3.md');
assert.throws(bad('| diajar | 35 |', '| tunda | 35 |'), /rekod-4S-M3\.md:10: Status "tunda" not recognised \(diajar \/ ditunda \/ batal\)/);
assert.throws(bad('| pdp |  | 6.2.1 |', '| kuliah |  | 6.2.1 |'), /rekod-4S-M3\.md:10: Jenis "kuliah" not recognised/);
assert.throws(bad('| 2026-10-05 |', '| 5/10/2026 |'), /rekod-4S-M3\.md:10: Tarikh "5\/10\/2026" is not yyyy-mm-dd/);
assert.throws(bad('| 6.2.1 | diajar |', '| 1.0, 6.2.1 | diajar |'), /rekod-4S-M3\.md:10: do not mix revision topic codes/);
assert.throws(bad('| 35 |  |\n| M35 | 2026-10-07', '| 35 |\n| M35 | 2026-10-07'), /rekod-4S-M3\.md:10: needs 11 columns, has 10/);
assert.deepStrictEqual(R.parseRekod('# Rekod kosong\n'), []);

console.log('rekod: all tests passed');
