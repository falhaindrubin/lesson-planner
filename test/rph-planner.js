// node test/rph-planner.js — pemadanan SP kepada PdP ikut masa daripada RPT
const assert = require('assert');
const R = require('../src/core');

// DSKP kecil: masa SP (minit) = 30, 60, 120, 10, 100
const mk = code => ({ code, text: `Teks ${code}`, sk: { code: code.split('.').slice(0, 2).join('.'), title: 'SK' }, bidang: { code: code.split('.')[0] + '.0', title: 'Tajuk' } });
const sp = ['1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.2.1'].map(mk);
const masaSp = new Map([['1.1.1', 30], ['1.1.2', 60], ['1.1.3', 120], ['1.1.4', 10], ['1.2.1', 100]]);
let hari = 0;
const pdp = (minit, extra = {}) => ({
  minggu: 35, tarikh: `2026-10-${String(5 + hari++).padStart(2, '0')}`, hari: 'Isnin', waktu: '1–2', masa: '', minit,
  jenis: 'pdp', acara: '', sp: [], status: 'diajar', kehadiran: 35, catatan: '', baru: true, ...extra,
});
const plan = (rows, o = {}) => R.planRows({ rows, sp, masaSp, mula: '1.1.1', fail: 'rekod.md', ...o });
const spOf = p => p.rows.map(r => r.sp.join(', '));

// Contoh kerja: SP ringan berkongsi PdP, SP berat merentas PdP, tiada tanda "bersambung"
const a = plan([pdp(60), pdp(60), pdp(90), pdp(60), pdp(60), pdp(60)]);
assert.deepStrictEqual(spOf(a), ['1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.3', '1.1.4, 1.2.1', '1.2.1', '1.0']);
assert.deepStrictEqual(a.akhir, { idx: 5, sisa: null, ulang: 1, selesai: true });
assert.deepStrictEqual(a.warnings, []);

// Baris yang dijana dimainkan semula kepada keadaan yang sama (bukan lagi baharu)
const replay = plan(a.rows.map(({ baru, ...r }) => r));
assert.deepStrictEqual(spOf(replay), spOf(a));
assert.deepStrictEqual(replay.akhir, a.akhir);

// Ditunda / batal tidak menggunakan masa: PdP seterusnya bermula di tempat yang sama
hari = 0;
const t = plan([pdp(60), pdp(60, { status: 'ditunda', baru: false, sp: ['1.1.2', '1.1.3'] }), pdp(90)]);
assert.deepStrictEqual(spOf(t), ['1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.2, 1.1.3']);
assert.deepStrictEqual([t.akhir.idx, t.akhir.sisa], [2, 60]); // 1.1.3: 120 − 60 minit
hari = 0;
const bt = plan([pdp(60), pdp(60, { status: 'batal' }), pdp(60)]);
assert.deepStrictEqual(spOf(bt).filter((_, i) => i !== 1), ['1.1.1, 1.1.2', '1.1.2, 1.1.3']);

// Peraturan 15 minit: tiada sambungan < 15 minit; tiada SP baharu jika < 15 minit tinggal
hari = 0;
const p15 = R.planRows({ rows: [pdp(60), pdp(60)], sp, masaSp: new Map([['1.1.1', 70], ['1.1.2', 50]]), mula: '1.1.1' });
assert.deepStrictEqual(spOf(p15), ['1.1.1', '1.1.2']); // 70 minit dalam 60 -> baki 10 dihabiskan
hari = 0;
const n15 = R.planRows({ rows: [pdp(60)], sp, masaSp: new Map([['1.1.1', 50], ['1.1.2', 60]]), mula: '1.1.1' });
assert.deepStrictEqual(spOf(n15), ['1.1.1']); // 50 minit, tinggal 10 -> tidak mula 1.1.2
assert.deepStrictEqual([n15.akhir.idx, n15.akhir.sisa], [1, null]);

// Gabung oleh guru: semua kecuali SP terakhir selesai; yang terakhir ambil baki
hari = 0;
const g = plan([pdp(60, { baru: false, sp: ['1.1.1', '1.1.2', '1.1.3'] }), pdp(60)]);
assert.deepStrictEqual(spOf(g), ['1.1.1, 1.1.2, 1.1.3', '1.1.3']); // 1.1.3 belum bermula: 120 minit
assert.deepStrictEqual([g.akhir.idx, g.akhir.sisa], [2, 60]);
// Guru mengulang SP lama: kedudukan ikut baris itu
hari = 0;
const u = plan([pdp(60), pdp(60, { baru: false, sp: ['1.1.1'] }), pdp(60)]);
assert.deepStrictEqual(spOf(u)[2], '1.1.2'); // 1.1.2 bermula semula: 60 minit penuh

// Tutorial: ulang SP PdP diajar terakhir (bukan yang ditunda); tidak mara
hari = 0;
const tut = plan([
  pdp(60),
  pdp(60, { jenis: 'tutorial', minit: 90 }),
  pdp(60, { status: 'ditunda', baru: false, sp: ['1.1.2', '1.1.3'] }),
  pdp(90, { jenis: 'tutorial' }),
  pdp(60),
]);
assert.deepStrictEqual(spOf(tut), ['1.1.1, 1.1.2', '1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.1, 1.1.2', '1.1.2, 1.1.3']);
// Peperiksaan: tiada SP, tidak mara
hari = 0;
const ex = plan([pdp(60, { jenis: 'peperiksaan', status: '' }), pdp(60)]);
assert.deepStrictEqual(spOf(ex), ['', '1.1.1, 1.1.2']);

// Tanpa RPT: satu SP satu PdP; DSKP habis -> ulang kaji ikut tajuk secara berkitar
hari = 0;
const sp2 = ['1.1.1', '2.1.1'].map(mk);
const nr = R.planRows({ rows: [pdp(60), pdp(90), pdp(60), pdp(60), pdp(60)], sp: sp2, mula: '1.1.1' });
assert.deepStrictEqual(spOf(nr), ['1.1.1', '2.1.1', '1.0', '2.0', '1.0']);
assert.strictEqual(nr.akhir.ulang, 3);
// Tanpa RPT, gabung oleh guru: semua SP dalam baris selesai (contoh RPH ASK: 4.2.7 + 4.2.8)
hari = 0;
const sp3 = ['4.2.7', '4.2.8', '4.2.9'].map(mk);
const ng = R.planRows({ rows: [pdp(60, { baru: false, sp: ['4.2.7', '4.2.8'] }), pdp(60)], sp: sp3, mula: '4.2.7' });
assert.deepStrictEqual(spOf(ng), ['4.2.7, 4.2.8', '4.2.9']);

// Tanpa DSKP (PK / PJ): baris tanpa SP
hari = 0;
assert.deepStrictEqual(spOf(R.planRows({ rows: [pdp(60)], sp: [] })), ['']);

// Mula bukan SP pertama; SP tiada dalam Peruntukan SP -> masa PdP + amaran
hari = 0;
const m = R.planRows({ rows: [pdp(60)], sp, masaSp: new Map([['1.1.1', 30]]), mula: '1.1.4' });
assert.deepStrictEqual(spOf(m), ['1.1.4']);
assert.deepStrictEqual(m.warnings, ['SP 1.1.4 tiada dalam Peruntukan SP; guna 60 minit']);

// Ralat dengan nombor baris
hari = 0;
assert.throws(() => plan([pdp(60, { baru: false, sp: ['9.9.9'], line: 12 })]), /rekod\.md:12: SP 9\.9\.9 tiada dalam DSKP/);
assert.throws(() => plan([pdp(60, { baru: false, sp: ['7.0'], line: 13 })]), /rekod\.md:13: tajuk 7\.0 tiada dalam DSKP/);
assert.throws(() => plan([], { mula: '9.9.9' }), /rekod\.md: SP Mula 9\.9\.9 tiada dalam DSKP/);

console.log('rph-planner: semua ujian lulus');
