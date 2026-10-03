// node test/rph-render.js — RPH pages in the layout of RPH ASK T1 M34 (sample/)
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Activities template
const act = R.parseActivities(read('aktiviti-umum.md'), 'aktiviti-umum.md');
assert.deepStrictEqual(act.opening, ['Set induksi', 'Guru memberi situasi dan mengaitkan dengan tajuk pelajaran']);
assert.strictEqual(act.development.length, 6);
assert.deepStrictEqual(act.closing, ['Guru membuat rumusan pelajaran hari ini.']);
assert.throws(() => R.parseActivities('## Permulaan\n- a\n## Penutup\n- c', 'a.md'), /a\.md: no "- …" list under "## Perkembangan"/);

const ask = R.parseDskp(read('dskp-ask-t1.md'));
const cls = { classCode: '1S', subject: 'ASK', fullName: '1 SAPPHIRE', form: 1, subjectName: 'ASAS SAINS KOMPUTER', pupils: 35 };
const row = (o = {}) => ({
  week: 34, date: '2026-09-29', dayName: 'Selasa', periods: '3–4', time: '8:00–9:00', minutes: 60, kind: 'pdp', event: '',
  sp: ['4.2.7', '4.2.8'], status: 'diajar', attendance: 35, note: '', ...o,
});
const html = pages => R.renderRph({ year: 2026, week: 34, teacher: 'FALHAIND RUBIN', pages: pages.map(r => ({ cls, row: r, sp: ask, activities: act })) });
const text = h => h.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ');

// Like the example RPH ASK T1 M34
const h = text(html([row()]));
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
]) assert.ok(h.includes(s), `missing: ${s}`);
assert.ok(!/bersambung|samb\./i.test(h));
assert.ok(!h.includes('CATATAN'));
assert.strictEqual((html([row()]).match(/<section class="rph">/g) || []).length, 1);

// 90-minute PdP -> Perkembangan 80 minutes; tutorial; event day; postponed with a reason; cancelled is not printed
const h2 = text(html([
  row({ periods: '7–9', minutes: 90, kind: 'tutorial', event: 'X-Break' }),
  row({ status: 'ditunda', note: 'Mesyuarat guru' }),
  row({ status: 'batal' }),
  row({ note: 'Murid aktif' }),
]));
assert.strictEqual((h2.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 3);
assert.ok(h2.includes('Perkembangan: (80 minit)'));
assert.ok(h2.includes('MASA 1000 - 1030\n1030 - 1100\n1100 - 1130'));
assert.ok(h2.includes('MATA PELAJARAN ASAS SAINS KOMPUTER (TUTORIAL)'));
assert.ok(h2.includes('CATATAN Hari acara: X-Break'));
assert.ok(h2.includes('☐ Objektif tercapai. Semua murid') && h2.includes('☑ PdP ditunda kerana: Mesyuarat guru'));
assert.ok(h2.includes('Murid aktif'));

// Exam: tajuk PEPERIKSAAN, no SP / activities / reflection
const h3 = text(html([row({ kind: 'peperiksaan', event: 'PAT TING.4/UASA', sp: [], status: '', attendance: null })]));
assert.ok(h3.includes('CATATAN Peperiksaan: PAT TING.4/UASA') && h3.includes('TAJUK PEPERIKSAAN'));
assert.ok(!h3.includes('RINGKASAN AKTIVITI') && !h3.includes('REFLEKSI'));
assert.ok(h3.includes('KEHADIRAN / 35'));

// Revision of a topic: every SK and SP of that topic
const h4 = text(html([row({ sp: ['1.0'] })]));
assert.ok(h4.includes('TAJUK ULANG KAJI: 1.0 KONSEP ASAS PEMIKIRAN KOMPUTASIONAL'));
assert.ok(h4.includes('1.1.1 Menerangkan teknik Leraian') && h4.includes('1.1.5 Menentukan ciri-ciri kesamaan'));

// No DSKP: blank fields to fill in by hand; text is escaped for HTML
const h5 = html([row({ sp: [], note: '<b>x</b>' })]);
assert.ok(h5.includes('&lt;b&gt;x&lt;/b&gt;'));

// A4 rule (W9): every lesson starts a page; a table row is not split across pages
const css = html([row()]);
assert.ok(css.includes('.rph { break-after: page; page-break-after: always; }'));
assert.ok(css.includes('tr { break-inside: avoid; page-break-inside: avoid; }'));

console.log('rph-render: all tests passed');
