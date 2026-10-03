// node test/rph-render.js — halaman RPH ikut susun atur RPH ASK T1 M34 (sample/)
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Templat aktiviti
const akt = R.parseAktiviti(read('aktiviti-umum.md'), 'aktiviti-umum.md');
assert.deepStrictEqual(akt.permulaan, ['Set induksi', 'Guru memberi situasi dan mengaitkan dengan tajuk pelajaran']);
assert.strictEqual(akt.perkembangan.length, 6);
assert.deepStrictEqual(akt.penutup, ['Guru membuat rumusan pelajaran hari ini.']);
assert.throws(() => R.parseAktiviti('## Permulaan\n- a\n## Penutup\n- c', 'a.md'), /a\.md: tiada senarai "- …" di bawah "## Perkembangan"/);

const ask = R.parseDskp(read('dskp-ask-t1.md'));
const kelas = { kelas: '1S', subjek: 'ASK', namaPenuh: '1 SAPPHIRE', tingkatan: 1, namaSubjek: 'ASAS SAINS KOMPUTER', bilMurid: 35 };
const row = (o = {}) => ({
  minggu: 34, tarikh: '2026-09-29', hari: 'Selasa', waktu: '3–4', masa: '8:00–9:00', minit: 60, jenis: 'pdp', acara: '',
  sp: ['4.2.7', '4.2.8'], status: 'diajar', kehadiran: 35, catatan: '', ...o,
});
const html = pages => R.renderRph({ tahun: 2026, minggu: 34, guru: 'FALHAIND RUBIN', pages: pages.map(r => ({ kelas, row: r, sp: ask, aktiviti: akt })) });
const teks = h => h.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ');

// Seperti contoh RPH ASK T1 M34
const h = teks(html([row()]));
for (const s of [
  '2026 - ASK T1', 'M34', 'RANCANGAN PENGAJARAN HARIAN',
  'NAMA GURU FALHAIND RUBIN', 'MATA PELAJARAN ASAS SAINS KOMPUTER',
  'MINGGU / TARIKH / HARI 34 29/09/2026 SELASA', 'TINGKATAN 1 SAPPHIRE',
  'MASA 0800 - 0830\n0830 - 0900', 'KEHADIRAN 35 / 35',
  'TAJUK 4.0 KOD ARAHAN', 'STANDARD KANDUNGAN 4.2 Kod Arahan HTML',
  '4.2.7 Menghasilkan pull down menu melalui atur cara HTML.\n4.2.8 Menghasilkan ruang komen melalui atur cara HTML.',
  'OBJEKTIF PEMBELAJARAN Murid dapat:',
  'Permulaan: (5 minit)\n- Set induksi', 'Perkembangan: (50 minit)', 'Penutup: (5 minit)\n- Guru membuat rumusan pelajaran hari ini.',
  '☑ Objektif tercapai. Semua murid mampu menguasai kemahiran yang dipelajari.', '☐ PdP ditunda kerana:',
]) assert.ok(h.includes(s), `tiada: ${s}`);
assert.ok(!/bersambung|samb\./i.test(h));
assert.ok(!h.includes('CATATAN'));
assert.strictEqual((html([row()]).match(/<section class="rph">/g) || []).length, 1);

// PdP 90 minit -> Perkembangan 80 minit; tutorial; hari acara; ditunda dengan sebab; batal tidak dicetak
const h2 = teks(html([
  row({ waktu: '7–9', minit: 90, jenis: 'tutorial', acara: 'X-Break' }),
  row({ status: 'ditunda', catatan: 'Mesyuarat guru' }),
  row({ status: 'batal' }),
  row({ catatan: 'Murid aktif' }),
]));
assert.strictEqual((h2.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 3);
assert.ok(h2.includes('Perkembangan: (80 minit)'));
assert.ok(h2.includes('MASA 1000 - 1030\n1030 - 1100\n1100 - 1130'));
assert.ok(h2.includes('MATA PELAJARAN ASAS SAINS KOMPUTER (TUTORIAL)'));
assert.ok(h2.includes('CATATAN Hari acara: X-Break'));
assert.ok(h2.includes('☐ Objektif tercapai. Semua murid') && h2.includes('☑ PdP ditunda kerana: Mesyuarat guru'));
assert.ok(h2.includes('Murid aktif'));

// Peperiksaan: tajuk PEPERIKSAAN, tiada SP / aktiviti / refleksi
const h3 = teks(html([row({ jenis: 'peperiksaan', acara: 'PAT TING.4/UASA', sp: [], status: '', kehadiran: null })]));
assert.ok(h3.includes('CATATAN Peperiksaan: PAT TING.4/UASA') && h3.includes('TAJUK PEPERIKSAAN'));
assert.ok(!h3.includes('RINGKASAN AKTIVITI') && !h3.includes('REFLEKSI'));
assert.ok(h3.includes('KEHADIRAN / 35'));

// Ulang kaji tajuk: semua SK dan SP tajuk itu
const h4 = teks(html([row({ sp: ['1.0'] })]));
assert.ok(h4.includes('TAJUK ULANG KAJI: 1.0 KONSEP ASAS PEMIKIRAN KOMPUTASIONAL'));
assert.ok(h4.includes('1.1.1 Menerangkan teknik Leraian') && h4.includes('1.1.5 Menentukan ciri-ciri kesamaan'));

// Tiada DSKP: medan kosong untuk diisi sendiri; teks dilepaskan (escape) untuk HTML
const h5 = html([row({ sp: [], catatan: '<b>x</b>' })]);
assert.ok(h5.includes('&lt;b&gt;x&lt;/b&gt;'));

console.log('rph-render: semua ujian lulus');
