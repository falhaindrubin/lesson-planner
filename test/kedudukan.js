// node test/kedudukan.js — masa SP dan kedudukan 4S M3 berbanding RPT Matematik T4 2026 sebenar
// (fail kelas 2026: jadual simulasi dari 1 Jan + jadual 5.10.2026)
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const K = R.parseKelas(read('kelas-2026.md'));
const versions = K.jadual.map(f => R.parseJadual(read(f)));
const acara = R.parseAcara(read('acara-2026.md'));
const mat = R.parseDskp(read('dskp-mat-t4.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const plan = R.plan({ sp: mat, kesukaran: R.parseKesukaran(read('kesukaran-mat-t4.md')), kalendar, tingkatan: 4 });
const rpt = R.parseRpt(R.renderMd(plan, { subjek: 'Matematik', tahun: 2026, dskp: 'd', takwim: 't', kesukaran: 'k' }));
const s4 = K.kelas[0];

// Minit PdP sebenar 4S seminggu: 210 biasa; M11 150 (30 Mac, 2–3 Apr cuti); M20 60 (16–17 Jun cuti); M17 0 (PPT)
const minitMinggu = R.minitPdpMinggu({ kalendar, versions, kelas: s4, semuaKelas: K.kelas, acara });
assert.deepStrictEqual([1, 11, 17, 20, 30, 32].map(minitMinggu), [210, 150, 0, 60, 90, 120]);
assert.strictEqual(minitMinggu.lalai, false);

// Masa SP: jumlah = minit PdP dalam semua minggu RPT; SP dalam minggu separa mendapat masa kurang
const masaSp = R.masaSp({ rpt, sp: mat, minitMinggu });
const jumlah = [...masaSp.values()].reduce((a, b) => a + b, 0);
const kapasiti = rpt.minggu.filter(w => w.sp.length).reduce((a, w) => a + minitMinggu(w.n), 0);
assert.strictEqual(kapasiti, 6090);
assert.ok(Math.abs(jumlah - kapasiti) < 1, `${jumlah}`);
assert.ok(Math.abs(masaSp.get('6.2.2') - 0.275 * 60) < 1e-6); // seluruhnya dalam M20 (60 minit)
assert.ok(masaSp.get('1.1.1') > masaSp.get('6.2.2'));
// Tiada jadual sebelum 5 Okt: minggu awal guna jadual terawal, ditanda lalai
const lalai = R.minitPdpMinggu({ kalendar, versions: [R.parseJadual(read('jwg-20261002.md'))], kelas: s4, semuaKelas: K.kelas, acara });
assert.strictEqual(lalai(1), 210);
assert.deepStrictEqual([lalai.lalai, lalai.awal], [true, '2026-10-05']);

// Kedudukan: SP 2.1.1 bermula tepat pada awal M5 dalam RPT
const at = c => ({ idx: mat.findIndex(s => s.code === c), sisa: null, ulang: 0, selesai: false });
const k = (c, minggu) => R.kedudukan({ rpt, kalendar, tingkatan: 4, sp: mat, akhir: at(c), masaSp, minitMinggu, seminggu: 210, minggu });
assert.deepStrictEqual(k('2.1.1', 5), { status: 'ikut', kod: '2.1.1', julat: [5, 5], beza: 0 });
assert.strictEqual(R.teksKedudukan('4S M3', k('2.1.1', 5)), '4S M3: SP 2.1.1 · RPT M5 · ikut RPT');
assert.strictEqual(R.teksKedudukan('4S M3', k('2.1.1', 4)), '4S M3: SP 2.1.1 · RPT M5 · 1 minggu ke depan');
// M6 cuti penuh tidak dikira: pada M7 kelas yang masih di 2.1.1 ketinggalan satu minggu, bukan dua
assert.strictEqual(R.teksKedudukan('4S M3', k('2.1.1', 7)), '4S M3: SP 2.1.1 · RPT M5 · 1 minggu ke belakang');
// Separuh SP sudah diajar dikira (sisa)
const separuh = { ...at('2.1.1'), sisa: masaSp.get('2.1.1') / 2 };
assert.ok(R.kedudukan({ rpt, kalendar, tingkatan: 4, sp: mat, akhir: separuh, masaSp, minitMinggu, seminggu: 210, minggu: 5 }).status === 'ikut');
// Minggu separa tidak membesarkan beza kecil: 6.2.1 (dalam M20, 60 minit) pada awal M20 = ikut RPT
assert.strictEqual(k('6.2.1', 20).status, 'ikut');
assert.strictEqual(R.teksKedudukan('4S M3', R.kedudukan({ rpt, kalendar, tingkatan: 4, sp: mat, akhir: { selesai: true }, minggu: 35 })), '4S M3: DSKP selesai · ulang kaji');
assert.strictEqual(R.teksKedudukan('4S M3', R.kedudukan({ rpt: { ...rpt, minggu: [] }, kalendar, tingkatan: 4, sp: mat, akhir: at('6.2.1'), masaSp, minitMinggu, seminggu: 210, minggu: 35 })), '4S M3: SP 6.2.1 tiada dalam RPT');

// Ringkasan kelas: awal tahun ikut RPT, tiada amaran
const base = { kelas: s4, rows: [], sp: mat, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas: K.kelas };
assert.deepStrictEqual(R.ringkasanKelas({ ...base, minggu: 1 }), { teks: '4S M3: SP 1.1.1 · RPT M1 · ikut RPT', amaran: [] });
// Masih di 6.2.1 pada M35: jauh ketinggalan dan tidak muat sebelum tamat sukatan (M34)
const r35 = R.ringkasanKelas({ ...base, kelas: { ...s4, mula: '6.2.1' }, minggu: 35 });
assert.strictEqual(r35.teks, '4S M3: SP 6.2.1 · RPT M20 · 13 minggu ke belakang');
assert.match(r35.amaran[0], /^4S M3: perlu \d+ minit untuk SP berbaki, ada 0 minit hingga M34; pertimbang gabung SP$/);
// Muat: SP terakhir 10.1.2 (249 minit) dalam M35–M36 (420 minit) -> tiada amaran; dari 9.1.1 tidak muat
assert.deepStrictEqual(R.ringkasanKelas({ ...base, kelas: { ...s4, mula: '10.1.2' }, rpt: { ...rpt, tamat: 36 }, minggu: 35 }).amaran, []);
assert.match(R.ringkasanKelas({ ...base, kelas: { ...s4, mula: '9.1.1' }, rpt: { ...rpt, tamat: 36 }, minggu: 35 }).amaran[0], /ada 420 minit hingga M36/);
assert.deepStrictEqual(R.muat({ sp: mat, masaSp, akhir: { idx: mat.length - 1, sisa: 100 }, pelajaran: [{ minit: 60 }] }), { perlu: 100, ada: 60 });

// Tanpa RPT / tanpa DSKP
const s1 = { kelas: '1S', subjek: 'ASK', tingkatan: 1, mula: '4.2.5' };
assert.deepStrictEqual(R.ringkasanKelas({ ...base, kelas: s1, sp: ask, rpt: null, masaSp: null, minggu: 35 }), { teks: '1S ASK: SP 4.2.5 · tiada RPT', amaran: [] });
assert.deepStrictEqual(R.ringkasanKelas({ ...base, kelas: { kelas: '2D', subjek: 'PK', tingkatan: 2 }, sp: [], rpt: null, masaSp: null, minggu: 35 }), { teks: '2D PK: tiada DSKP', amaran: [] });

console.log('kedudukan: semua ujian lulus');
