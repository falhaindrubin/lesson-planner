// node rpt/test.js — guna takwim 2026 dan DSKP ASK T1 sebenar dari sample/
const fs = require('fs'), assert = require('assert');
const R = require('./rpt');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');
const takwim = R.parseTakwim(read('takwim-smly-2026.md'));
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

// DSKP ASK T1: 36 SP
assert.strictEqual(sp.length, 36);
assert.deepStrictEqual([sp[0].code, sp[0].sk.code, sp[0].bidang.code], ['1.1.1', '1.1', '1.0']);

const pdp = (p, n) => p.rows.find(r => r.n === n).pdp;
const none = { sp: new Map(), tajuk: new Map() };

// Minggu takwim penuh: Tingkatan 4 M1–M30 tolak M6, M17, M18 = 27 minggu
// (minggu cuti separa seperti M10, M11 dikira 1 minggu)
const t4 = R.plan({ sp, kesukaran: none, takwim, tingkatan: 4, tamat: 30 });
assert.strictEqual(t4.jumlahKapasiti, 27);
assert.strictEqual(t4.rows.find(r => r.n === 11).kapasiti, 1); // 2/5 hari PdP
assert.strictEqual(pdp(t4, 6), 0);   // TBC + Cuti Tambahan KPM
assert.strictEqual(pdp(t4, 15), 4);  // Hari Pekerja 1 Mei
assert.strictEqual(pdp(t4, 17), 0);  // PPT T4–5
assert.strictEqual(pdp(t4, 25), 5);  // Hari Sarawak bukan cuti di Sabah

// Tingkatan 1: M17 bukan peperiksaan -> 28 minggu
const t1 = R.plan({ sp, kesukaran: none, takwim, tingkatan: 1, tamat: 30 });
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
const t4a = R.plan({ sp, kesukaran: none, takwim, tingkatan: 4 });
assert.strictEqual(t4a.tamat, 34);
assert.strictEqual(t4a.jumlahKapasiti, 31); // 27 + M31–M34
for (const [f, n] of [[1, 35], [2, 35], [3, 35], [4, 34], [5, 25]])
  assert.strictEqual(R.plan({ sp, kesukaran: none, takwim, tingkatan: f }).tamat, n, `T${f}`);
assert.strictEqual(R.plan({ sp, kesukaran: none, takwim, tingkatan: 4, ulangKaji: 0 }).tamat, 36);
assert.ok(t4a.rows.find(r => r.n === 34).sp.length > 0);
assert.ok(!t4a.rows.find(r => r.n === 35).sp.length);

// Matematik T4: tajuk 1.0–5.0 sebelum PPT (M17), 10.0 tetap 2 minggu
const mat = R.parseDskp(read('dskp-mat-t4.md'));
const km = R.parseKesukaran(fs.readFileSync(__dirname + '/kesukaran-mat-t4.md', 'utf8'));
assert.strictEqual(km.sp.size, 70);
assert.strictEqual(km.tajuk.get('10.0'), 2);
const m4 = R.plan({ sp: mat, kesukaran: km, takwim, tingkatan: 4 });
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
const t1k = R.plan({ sp, kesukaran: k, takwim, tingkatan: 1, tamat: 30 });
const at = (p, c) => p.rated.find(s => s.code === c).minggu.length;
assert.ok(at(t1k, '1.1.1') >= at(t1, '1.1.1'));

console.log('rpt: semua ujian lulus');
