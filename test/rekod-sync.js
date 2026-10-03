// node test/rekod-sync.js — selaras rekod 1S ASK dan 4S M3 dengan takwim, jadual dan acara 2026 sebenar
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const versions = [R.parseJadual(read('jwg-20261002.md'))];
const semuaKelas = R.parseKelas(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8')).kelas.map(k => ({ ...k, bilMurid: 30 }));
const acara = R.parseAcara(read('acara-2026.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const kelas = { ...semuaKelas.find(k => k.kelas === '1S'), bilMurid: 35, mula: '4.2.5' };

// 1S ASK, tiada RPT: satu SP satu PdP (Isnin 8–9, Rabu 11–12)
const sync = (rows, minggu, hariIni, o = {}) => R.syncRekod({
  rows, kelas, semuaKelas, sp: ask, masaSp: null,
  kalendar, versions, acara, minggu, hariIni, fail: 'rekod-1S-ASK.md', ...o,
});
const lihat = rows => rows.map(r => `M${r.minggu} ${r.tarikh} ${r.jenis} ${r.sp.join(',')} ${r.status} ${r.kehadiran}${r.acara ? ' ' + r.acara : ''}${r.catatan ? ' (' + r.catatan + ')' : ''}`);
const viaFail = rows => R.parseRekod(R.renderRekod(kelas, 2026, rows), 'rekod-1S-ASK.md'); // seperti CLI: tulis, baca semula

// Rekod kosong: rancang minggu diminta sahaja
const s1 = sync([], 35, '2026-10-03');
assert.deepStrictEqual(lihat(s1.rows), [
  'M35 2026-10-05 pdp 4.2.5 diajar 35',
  'M35 2026-10-07 pdp 4.2.6 diajar 35',
]);
assert.deepStrictEqual(s1.minggu, [35]);
assert.deepStrictEqual(s1.warnings, []);

// Dijalankan semula tanpa perubahan: rekod sama
const r1 = viaFail(s1.rows);
const s1b = sync(r1, 35, '2026-10-03');
assert.strictEqual(R.renderRekod(kelas, 2026, s1b.rows), R.renderRekod(kelas, 2026, s1.rows));

// Isnin ditunda (ditanda selepas mengajar); minggu 36 dirancang pada 5 Okt petang.
// Rabu 7 Okt (akan datang, belum diubah) dibina semula: 4.2.5 diajar dahulu.
r1[0].status = 'ditunda'; r1[0].catatan = 'Mesyuarat';
const s2 = sync(r1, 36, '2026-10-05');
assert.deepStrictEqual(lihat(s2.rows), [
  'M35 2026-10-05 pdp 4.2.5 ditunda 35 (Mesyuarat)',
  'M35 2026-10-07 pdp 4.2.5 diajar 35',
  'M36 2026-10-12 pdp 4.2.6 diajar 35 X-Break',
  'M36 2026-10-14 pdp 4.2.7 diajar 35',
]);
assert.deepStrictEqual(s2.minggu, [35, 36]);

// Baris akan datang yang diubah guru (Catatan diisi) dikekalkan dengan SP gurunya
const r2 = viaFail(s2.rows);
r2[2].sp = ['4.2.6', '4.2.7']; r2[2].catatan = 'gabung';
const s3 = sync(r2, 36, '2026-10-05');
assert.deepStrictEqual(lihat(s3.rows).slice(2), [
  'M36 2026-10-12 pdp 4.2.6,4.2.7 diajar 35 X-Break (gabung)',
  'M36 2026-10-14 pdp 4.2.8 diajar 35',
]);
// SP sahaja diubah tanpa Catatan pada baris akan datang: dibina semula (tidak dapat dikesan)
const r2b = viaFail(s2.rows);
r2b[3].sp = ['1.1.1'];
assert.deepStrictEqual(sync(r2b, 36, '2026-10-05').rows[3].sp, ['4.2.7']);

// Minggu yang terlangkau dirancang juga (diajar, kehadiran penuh) dengan amaran
const s4 = sync(viaFail(s1.rows), 37, '2026-10-17');
assert.deepStrictEqual(s4.rows.map(r => r.minggu), [35, 35, 36, 36, 37, 37]);
assert.deepStrictEqual(s4.warnings, ['1S ASK: M36 tiada dalam rekod; dirancang juga']);
assert.deepStrictEqual(sync(viaFail(s1.rows), 38, '2026-10-17').warnings, ['1S ASK: M36–M37 tiada dalam rekod; dirancang juga']);
// Minggu cuti penuh (M6) tanpa PdP bukan minggu terlangkau
const m5 = sync([], 5, '2026-02-07', { kelas: { ...kelas, mula: '1.1.1' }, versions: [{ ...versions[0], berkuatKuasa: '2026-01-01' }] });
assert.deepStrictEqual(sync(viaFail(m5.rows), 7, '2026-02-21', { kelas: { ...kelas, mula: '1.1.1' }, versions: [{ ...versions[0], berkuatKuasa: '2026-01-01' }] }).warnings, []);
// M38: UASA -> peperiksaan, tiada SP, Status dan Kehadiran kosong
const s5 = sync(viaFail(s1.rows), 38, '2026-10-17');
assert.deepStrictEqual(lihat(s5.rows.filter(r => r.minggu === 38)), [
  'M38 2026-10-26 peperiksaan   null PAT TING.4/UASA',
  'M38 2026-10-28 peperiksaan   null PAT TING.4/UASA',
]);

// PdP lepas yang dibuang guru tidak ditambah semula; baris tidak tersusun disusun semula
const rr = viaFail(s1.rows);
const s6 = sync([rr[1]], 35, '2026-10-06'); // Isnin 5 Okt dibuang; Rabu masih akan datang
assert.deepStrictEqual(s6.rows.map(r => r.tarikh), ['2026-10-07']);
const s7 = sync([rr[1], rr[0]], 35, '2026-10-03');
assert.deepStrictEqual(s7.rows.map(r => r.tarikh), ['2026-10-05', '2026-10-07']);

// Baris akan datang yang diubah tetapi slotnya tiada lagi dalam jadual: dikekalkan + amaran
const ganti = { ...rr[1], tarikh: '2026-10-06', hari: 'Selasa', waktu: '3–4', masa: '8:00–9:00', catatan: 'kelas ganti', line: 11 };
const s8 = sync([rr[0], ganti], 35, '2026-10-03');
assert.ok(s8.rows.some(r => r.catatan === 'kelas ganti'));
assert.ok(s8.warnings.includes('rekod-1S-ASK.md:11: 2026-10-06 waktu 3–4 tiada dalam jadual; baris dikekalkan, sila semak'));

// Tiada DSKP (PK): baris tanpa SP + amaran
const pk = { ...semuaKelas.find(k => k.kelas === '2D' && k.subjek === 'PK'), bilMurid: 30 };
const s9 = sync([], 35, '2026-10-03', { kelas: pk, sp: [] });
assert.deepStrictEqual(lihat(s9.rows), ['M35 2026-10-06 pdp  diajar 30']);
assert.deepStrictEqual(s9.warnings, ['2D PK: tiada DSKP; SP dibiarkan kosong']);

// Ralat: Bil. murid kosong; rekod kosong tanpa Mula
assert.throws(() => sync([], 35, '2026-10-03', { kelas: { ...kelas, bilMurid: null } }), /1S ASK: Bil\. murid kosong dalam fail kelas/);
assert.throws(() => sync([], 35, '2026-10-03', { kelas: { ...kelas, mula: '' } }), /1S ASK: rekod kosong dan Mula tiada dalam fail kelas/);

console.log('rekod-sync: semua ujian lulus');
