// node test/rekod.js — baca dan tulis rekod PdP satu kelas × subjek
const assert = require('assert');
const R = require('../src/core');

const k = { kelas: '4S', subjek: 'M3', namaPenuh: '4 STANFORD', tingkatan: 4, namaSubjek: 'MATEMATIK' };
const rows = [
  { minggu: 35, tarikh: '2026-10-05', hari: 'Isnin', waktu: '2–3', masa: '7:30–8:30', minit: 60, jenis: 'pdp', acara: '', sp: ['6.2.1'], status: 'diajar', kehadiran: 35, catatan: '' },
  { minggu: 35, tarikh: '2026-10-07', hari: 'Rabu', waktu: '7–9', masa: '10:00–11:30', minit: 90, jenis: 'pdp', acara: '', sp: ['6.2.2', '6.2.3'], status: 'ditunda', kehadiran: 35, catatan: 'Mesyuarat' },
  { minggu: 37, tarikh: '2026-10-19', hari: 'Isnin', waktu: '2–3', masa: '7:30–8:30', minit: 60, jenis: 'peperiksaan', acara: 'PAT TING. 4', sp: [], status: '', kehadiran: null, catatan: '' },
];
const md = R.renderRekod(k, 2026, rows);
assert.ok(md.startsWith('# Rekod 4S M3 2026\n'));
assert.ok(md.includes('| M35 | 2026-10-07 | Rabu | 7–9 | 10:00–11:30 | pdp |  | 6.2.2, 6.2.3 | ditunda | 35 | Mesyuarat |\n'));
assert.ok(md.includes('| M37 | 2026-10-19 | Isnin | 2–3 | 7:30–8:30 | peperiksaan | PAT TING. 4 |  |  |  |  |\n'));

// Pusingan: baca semula = baris asal (+ nombor baris); tulis semula = bait yang sama
const back = R.parseRekod(md, 'rekod-4S-M3.md');
assert.deepStrictEqual(back.map(({ line, ...r }) => r), rows);
assert.deepStrictEqual(back.map(r => r.line), [10, 11, 12]);
assert.strictEqual(R.renderRekod(k, 2026, back), md);

// Fail disimpan dengan CRLF di Windows dibaca sama
assert.deepStrictEqual(R.parseRekod(md.replace(/\n/g, '\r\n')), back);

// Guru menaip dengan longgar: Status huruf besar / ruang, Kehadiran '33/35', SP dengan pelbagai pemisah
const longgar = md
  .replace('| 6.2.1 | diajar | 35 |', '| 6.2.1 Membuat konjektur | Diajar  | 33/35 |')
  .replace('| 6.2.2, 6.2.3 | ditunda |', '| 6.2.2 + 6.2.3 | DITUNDA |');
const l = R.parseRekod(longgar);
assert.deepStrictEqual([l[0].sp, l[0].status, l[0].kehadiran], [['6.2.1'], 'diajar', 33]);
assert.deepStrictEqual([l[1].sp, l[1].status], [['6.2.2', '6.2.3'], 'ditunda']);
assert.deepStrictEqual(R.kodSel('4.2.7,4.2.8'), ['4.2.7', '4.2.8']);
assert.deepStrictEqual(R.kodSel('4.2.10 dan 4.2 Kod Arahan'), ['4.2.10']); // kod SK bukan SP
assert.deepStrictEqual(R.kodSel('Ulang kaji 1.0'), ['1.0']);

// Catatan dengan '|' tidak memecahkan jadual
const pipe = R.renderRekod(k, 2026, [{ ...rows[0], catatan: 'a | b' }]);
assert.strictEqual(R.parseRekod(pipe)[0].catatan, 'a / b');

// Ralat dengan nama fail dan nombor baris
const bad = (from, to) => () => R.parseRekod(md.replace(from, to), 'rekod-4S-M3.md');
assert.throws(bad('| diajar | 35 |', '| tunda | 35 |'), /rekod-4S-M3\.md:10: Status "tunda" tidak dikenali \(diajar \/ ditunda \/ batal\)/);
assert.throws(bad('| pdp |  | 6.2.1 |', '| kuliah |  | 6.2.1 |'), /rekod-4S-M3\.md:10: Jenis "kuliah" tidak dikenali/);
assert.throws(bad('| 2026-10-05 |', '| 5/10/2026 |'), /rekod-4S-M3\.md:10: Tarikh "5\/10\/2026" bukan yyyy-mm-dd/);
assert.throws(bad('| 6.2.1 | diajar |', '| 1.0, 6.2.1 | diajar |'), /rekod-4S-M3\.md:10: jangan campur kod tajuk/);
assert.throws(bad('| 35 |  |\n| M35 | 2026-10-07', '| 35 |\n| M35 | 2026-10-07'), /rekod-4S-M3\.md:10: perlu 11 lajur, ada 10/);
assert.deepStrictEqual(R.parseRekod('# Rekod kosong\n'), []);

console.log('rekod: semua ujian lulus');
