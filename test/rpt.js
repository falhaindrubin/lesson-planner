// node test/rpt.js — guna takwim 2026 dan DSKP ASK T1 sebenar dari sample/
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');
const takwim = R.parseTakwim(read('takwim-smly-2026.md'));
const kalendar = R.buildCalendar(takwim);
const sp = R.parseDskp(read('dskp-ask-t1.md'));

// Takwim: 43 minggu, M1 = 12 Jan, M43 = 30 Nov
assert.strictEqual(takwim.weeks.length, 43);
assert.deepStrictEqual([takwim.weeks[0].n, takwim.weeks[0].mula], [1, '2026-01-12']);
assert.deepStrictEqual([takwim.weeks[42].n, takwim.weeks[42].mula], [43, '2026-11-30']);
takwim.weeks.forEach(w => assert.strictEqual(w.days.length, 5, `M${w.n}`));

// Peperiksaan ikut tingkatan
assert.deepStrictEqual(R.examForms('PPT T4 - 5'), [4, 5]);
assert.deepStrictEqual(R.examForms('PAT TING.4/UASA'), [4, 1, 2, 3]);
assert.deepStrictEqual(R.examForms('PEP. PERCUBAAN SPM'), [5]);
assert.deepStrictEqual(R.examForms('UBBM/UBBI PPT'), []);

// Enjin kalendar: kelas hari ikut tingkatan, blok peperiksaan, cuti penggal
const isnin17 = kalendar.weeks.find(w => w.n === 17).days[0];
assert.deepStrictEqual([R.dayClass(isnin17, 4), R.dayClass(isnin17, 1)], ['exam', 'pdp']); // PPT T4–5
assert.ok(kalendar.weeks.find(w => w.n === 25).days.every(d => R.dayClass(d, 4) === 'pdp')); // Hari Sarawak
assert.deepStrictEqual(R.examBlocks(kalendar, 4).map(b => [b.mula, b.akhir]), [[17, 18], [37, 38]]);
assert.deepStrictEqual(R.examBlocks(kalendar, 1).map(b => [b.mula, b.akhir]), [[18, 18], [38, 38]]);
assert.deepStrictEqual(R.breaks(kalendar).map(b => [b.selepas, b.mula, b.akhir]), [
  [10, '2026-03-23', '2026-03-27'], [18, '2026-05-25', '2026-06-05'],
  [30, '2026-08-31', '2026-09-04'], [43, '2026-12-07', '2026-12-31'],
]);

// DSKP ASK T1: 36 SP
assert.strictEqual(sp.length, 36);
assert.deepStrictEqual([sp[0].code, sp[0].sk.code, sp[0].bidang.code], ['1.1.1', '1.1', '1.0']);

const pdp = (p, n) => p.rows.find(r => r.n === n).pdp;
const none = { sp: new Map(), tajuk: new Map() };

// Minggu takwim penuh: Tingkatan 4 M1–M30 tolak M6, M17, M18 = 27 minggu
// (minggu cuti separa seperti M10, M11 dikira 1 minggu)
const t4 = R.plan({ sp, kesukaran: none, kalendar, tingkatan: 4, tamat: 30 });
assert.strictEqual(t4.jumlahKapasiti, 27);
assert.strictEqual(t4.rows.find(r => r.n === 11).kapasiti, 1); // 2/5 hari PdP
assert.strictEqual(pdp(t4, 6), 0);   // TBC + Cuti Tambahan KPM
assert.strictEqual(pdp(t4, 15), 4);  // Hari Pekerja 1 Mei
assert.strictEqual(pdp(t4, 17), 0);  // PPT T4–5
assert.strictEqual(pdp(t4, 25), 5);  // Hari Sarawak bukan cuti di Sabah

// Tingkatan 1: M17 bukan peperiksaan -> 28 minggu
const t1 = R.plan({ sp, kesukaran: none, kalendar, tingkatan: 1, tamat: 30 });
assert.strictEqual(t1.jumlahKapasiti, 28);
assert.strictEqual(pdp(t1, 17), 5);

// Agihan: semua SP ada, ikut tertib, dalam minggu PdP sebelum tamat sukatan
for (const p of [t1, t4]) {
  const seen = p.rows.flatMap(r => r.sp.filter(s => !s.samb).map(s => s.code));
  assert.deepStrictEqual(seen, sp.map(s => s.code));
  for (const r of p.rows) if (r.sp.length) assert.ok(r.n <= 30 && r.kapasiti > 0, `M${r.n}`);
}

// Lalai: sebelum peperiksaan akhir tolak 2 minggu ulang kaji, semua tingkatan.
// T4 hingga M34 (PAT M37); T1 hingga M35 (UASA M38); T5 hingga M25 (Percubaan SPM M28)
const t4a = R.plan({ sp, kesukaran: none, kalendar, tingkatan: 4 });
assert.strictEqual(t4a.tamat, 34);
assert.strictEqual(t4a.jumlahKapasiti, 31); // 27 + M31–M34
for (const [f, n] of [[1, 35], [2, 35], [3, 35], [4, 34], [5, 25]])
  assert.strictEqual(R.plan({ sp, kesukaran: none, kalendar, tingkatan: f }).tamat, n, `T${f}`);
assert.strictEqual(R.plan({ sp, kesukaran: none, kalendar, tingkatan: 4, ulangKaji: 0 }).tamat, 36);
assert.ok(t4a.rows.find(r => r.n === 34).sp.length > 0);
assert.ok(!t4a.rows.find(r => r.n === 35).sp.length);

// Matematik T4: tajuk 1.0–5.0 sebelum PPT (M17), 10.0 tetap 2 minggu
const mat = R.parseDskp(read('dskp-mat-t4.md'));
const km = R.parseKesukaran(read('kesukaran-mat-t4.md'));
assert.strictEqual(km.sp.size, 70);
assert.strictEqual(km.tajuk.get('10.0'), 2);
const m4 = R.plan({ sp: mat, kesukaran: km, kalendar, tingkatan: 4 });
assert.deepStrictEqual(m4.warnings, []);
assert.deepStrictEqual([m4.ppt.mula, m4.parts[0].tajuk], [17, ['1.0', '2.0', '3.0', '4.0', '5.0']]);
for (const s of m4.rated) {
  const sebelum = Number(s.bidang.code) <= 5;
  assert.ok(s.minggu.every(n => (sebelum ? n <= 16 : n >= 19 && n <= 34)), `${s.code} M${s.minggu}`);
}
const t10 = m4.rated.filter(s => s.bidang.code === '10.0').reduce((a, s) => a + s.panjang, 0);
assert.ok(Math.abs(t10 - 2) < 1e-9);

// Kesukaran mengubah agihan: SP sukar dapat lebih minggu
const k = R.parseKesukaran('| SP | Kesukaran | Sebab |\n|---|---|---|\n| 1.1.1 | 3 | x |\n| 1.1.2 | 1 | y |');
assert.deepStrictEqual(k.sp.get('1.1.1'), { nilai: 3, sebab: 'x' });
const t1k = R.plan({ sp, kesukaran: k, kalendar, tingkatan: 1, tamat: 30 });
const at = (p, c) => p.rated.find(s => s.code === c).minggu.length;
assert.ok(at(t1k, '1.1.1') >= at(t1, '1.1.1'));

// Lampiran Peruntukan SP: minggu setiap SP, dibaca semula oleh parseRpt (untuk penjana RPH)
const mdMat = R.renderMd(m4, { subjek: 'Matematik', tahun: 2026, dskp: 'd', takwim: 't', kesukaran: 'k' });
const rpt = R.parseRpt(mdMat, 'rpt-mat');
assert.strictEqual(rpt.tamat, 34);
assert.strictEqual(rpt.peruntukan.size, 70);
assert.strictEqual(rpt.peruntukan.get('10.1.2'), 1.2);
assert.strictEqual(rpt.peruntukan.get('6.2.1'), Number(m4.rated.find(s => s.code === '6.2.1').panjang.toFixed(3)));
assert.deepStrictEqual(rpt.minggu.find(w => w.n === 20).sp, ['6.2.1', '6.2.2']);
assert.deepStrictEqual(rpt.minggu.find(w => w.n === 24).sp, ['7.2.2', '7.2.3', '7.2.4']); // termasuk (samb.)
assert.deepStrictEqual(rpt.minggu.find(w => w.n === 35).sp, []);
assert.throws(() => R.parseRpt(mdMat.split('## Peruntukan SP')[0], 'lama.md'), /lama\.md: tiada jadual "## Peruntukan SP"/);

console.log('rpt: semua ujian lulus');
