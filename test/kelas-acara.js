// node test/kelas-acara.js — fail kelas dan acara 2026 sebenar dari sample/, data ujian semua kelas dari test/data/
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Fail kelas 2026 sebenar: Matematik T4, 4 Stanford sahaja, bermula awal tahun
const K1 = R.parseKelas(read('kelas-2026.md'), 'kelas-2026.md');
assert.strictEqual(K1.tahun, 2026);
assert.strictEqual(K1.guru, 'FALHAIND RUBIN');
assert.deepStrictEqual(K1.jadual, ['jwg-20260101-simulasi.md', 'jwg-20261002.md']);
assert.deepStrictEqual([K1.takwim, K1.acara, K1.rekod, K1.output], ['takwim-smly-2026.md', 'acara-2026.md', '../output/simulasi-4S-M3', '../output/simulasi-4S-M3']);
assert.strictEqual(K1.kelas.length, 1);
const s4 = K1.kelas[0];
assert.deepStrictEqual(
  [s4.kelas, s4.namaPenuh, s4.tingkatan, s4.subjek, s4.namaSubjek, s4.dskp, s4.rpt, s4.tutorial, s4.bilMurid, s4.mula],
  ['4S', '4 STANFORD', 4, 'M3', 'MATEMATIK', 'dskp-mat-t4.md', '../output/rpt-mat-t4-2026.md', '', 32, '1.1.1'],
);
// Jadual simulasi = salinan jadual 5.10.2026, berkuat kuasa dari 1 Jan
const sim = R.parseJadual(read('jwg-20260101-simulasi.md'));
assert.strictEqual(sim.berkuatKuasa, '2026-01-01');
assert.deepStrictEqual(sim.slots, R.parseJadual(read('jwg-20261002.md')).slots);

// Data ujian: semua 7 kelas × subjek (test/data/kelas-semua.md)
const K = R.parseKelas(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8'), 'kelas-semua.md');
assert.strictEqual(K.kelas.length, 7);
assert.strictEqual(K.kelas.find(k => k.kelas === '4H').tutorial, 'TUTORIAL');
// Setiap slot jadual ada baris dalam fail kelas (kod Subjek atau Tutorial)
const j = R.parseJadual(read('jwg-20261002.md'));
for (const s of j.slots)
  assert.ok(K.kelas.some(k => k.kelas === s.kelas && (k.subjek === s.subjek || k.tutorial === s.subjek)), `${s.subjek} ${s.kelas}`);

// Baris kelas dengan Bil. murid dan Mula; jadual beberapa versi dipisahkan koma; CRLF
const md = [
  '- Tahun: 2026', '- Guru: CIKGU', '- Takwim: t.md', '- Jadual: a.md, b.md', '- Acara: e.md', '- Rekod: r', '- Output: o',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  '| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | d.md | a.md | r.md |  | 35 | 6.2.1 |',
].join('\r\n');
const k2 = R.parseKelas(md, 'k.md');
assert.deepStrictEqual(k2.jadual, ['a.md', 'b.md']);
assert.deepStrictEqual([k2.kelas[0].bilMurid, k2.kelas[0].mula, k2.kelas[0].line], [35, '6.2.1', 10]);
assert.throws(() => R.parseKelas(md.replace('| 4 | M3', '| 6 | M3'), 'k.md'), /k\.md:10: Tingkatan "6" bukan 1–5/);
assert.throws(() => R.parseKelas(md.replace('| 35 |', '| 35 orang |'), 'k.md'), /k\.md:10: Bil\. murid "35 orang" bukan nombor/);
assert.throws(() => R.parseKelas(md.replace('| r.md |  |', '| r.md |'), 'k.md'), /k\.md:10: perlu 11 lajur/);
assert.throws(() => R.parseKelas(md.replace('- Acara: e.md', ''), 'k.md'), /k\.md: tiada baris "- Acara: …"/);

// Acara 2026: senarai pilihan guru; Batal kosong
const A = R.parseAcara(read('acara-2026.md'), 'acara-2026.md');
assert.strictEqual(A.acara.filter(a => a.nama === 'X-Break').length, 10);
assert.deepStrictEqual(A.acara.find(a => a.tarikh === '2026-10-12'), { tarikh: '2026-10-12', nama: 'X-Break', tingkatan: [] });
assert.deepStrictEqual(A.batal, []);

const A2 = R.parseAcara([
  '## Hari acara', '| Tarikh | Acara | Tingkatan |', '|---|---|---|', '| 2026-10-07 | Program Transformasi | 1 |', '| 2026-10-08 | Ceramah | 1, 2 |',
  '## Batal', '| Tarikh | Sasaran | Sebab |', '|---|---|---|', '| 2026-10-09 | 4S | Ujian SEGAK |', '| 2026-10-13 |  | Mesyuarat agung |',
].join('\n'));
assert.deepStrictEqual(A2.acara.map(a => a.tingkatan), [[1], [1, 2]]);
assert.deepStrictEqual(A2.batal, [
  { tarikh: '2026-10-09', sasaran: '4S', sebab: 'Ujian SEGAK' },
  { tarikh: '2026-10-13', sasaran: '', sebab: 'Mesyuarat agung' },
]);
assert.throws(() => R.parseAcara('## Hari acara\n| 2026-10-07 | X | 7 |', 'e.md'), /e\.md:2: Tingkatan "7" bukan 1–5/);
assert.throws(() => R.parseAcara('| 2026-10-07 | X | |', 'e.md'), /e\.md:1: baris tarikh di luar/);

console.log('kelas-acara: semua ujian lulus');
