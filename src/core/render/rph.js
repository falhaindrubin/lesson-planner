// Renderer RPH: satu halaman A4 bagi setiap PdP, susun atur seperti RPH Google Sheets
// (sample/2026 - ASK T1 - Google Sheets M34A.pdf). PdP batal tidak dicetak.
// Tiada tanda "bersambung": SP yang merentas PdP ditulis biasa pada setiap PdP.
const { waktuRange, range, minitMula, jam24, fmtTarikh } = require('../util');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const uniq = xs => [...new Map(xs.map(x => [x.code, x])).values()];

function kandungan(row, sp) {
  const byCode = new Map(sp.map(s => [s.code, s]));
  const ulang = row.sp.length > 0 && row.sp.every(c => /\.0$/.test(c));
  const list = ulang ? sp.filter(s => row.sp.includes(s.bidang.code)) : row.sp.map(c => byCode.get(c)).filter(Boolean);
  return {
    ulang,
    tajuk: uniq(list.map(s => s.bidang)).map(b => `${b.code} ${b.title.toUpperCase()}`),
    sk: uniq(list.map(s => s.sk)).map(s => `${s.code} ${s.title}`),
    sp: list.map(s => `${s.code} ${s.text}`),
  };
}

function halaman({ tahun, minggu, guru, kelas: k, row, sp, aktiviti }) {
  const exam = row.jenis === 'peperiksaan';
  const c = kandungan(row, sp);
  const [a, b] = waktuRange(row.waktu);
  const masa = range(a, b).map(p => `${jam24(minitMula(p))} - ${jam24(minitMula(p + 1))}`);
  const baris = [
    ['NAMA GURU', [guru]],
    ['MATA PELAJARAN', [k.namaSubjek + (row.jenis === 'tutorial' ? ' (TUTORIAL)' : '')]],
    ['MINGGU / TARIKH / HARI', [`${row.minggu} ${fmtTarikh(row.tarikh)} ${row.hari.toUpperCase()}`]],
    ['TINGKATAN', [k.namaPenuh]],
    ['MASA', masa],
    ['KEHADIRAN', [`${row.kehadiran == null ? '' : row.kehadiran} / ${k.bilMurid}`]],
  ];
  if (row.acara) baris.push(['CATATAN', [exam ? `Peperiksaan: ${row.acara}` : `Hari acara: ${row.acara}`]]);
  if (exam) baris.push(['TAJUK', ['PEPERIKSAAN']]);
  else {
    const t = (c.ulang ? 'ULANG KAJI: ' : '') + c.tajuk.join(' / ');
    const p = row.minit - 10;
    const tanda = (on, teks) => `${on ? '☑' : '☐'} ${teks}`;
    const ditunda = row.status === 'ditunda';
    baris.push(
      ['TAJUK', [t]],
      ['STANDARD KANDUNGAN', c.sk],
      ['STANDARD PEMBELAJARAN', c.sp],
      ['OBJEKTIF PEMBELAJARAN', ['Murid dapat:', '', ...c.sp]],
      ['RINGKASAN AKTIVITI', [
        'Permulaan: (5 minit)', ...aktiviti.permulaan.map(x => `- ${x}`), '',
        `Perkembangan: (${p} minit)`, ...aktiviti.perkembangan.map(x => `- ${x}`), '',
        'Penutup: (5 minit)', ...aktiviti.penutup.map(x => `- ${x}`),
      ]],
      ['REFLEKSI', [
        tanda(!ditunda, 'Objektif tercapai. Semua murid mampu menguasai kemahiran yang dipelajari.'),
        tanda(false, 'Objektif tercapai oleh ___ orang murid sahaja. ___ orang murid diberikan latihan pengukuhan.'),
        tanda(ditunda, `PdP ditunda kerana: ${ditunda ? row.catatan : ''}`),
        ...(!ditunda && row.catatan ? ['', row.catatan] : []),
      ]],
    );
  }
  const tr = baris.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${v.map(x => (x ? esc(x) : '&nbsp;')).join('<br>')}</td></tr>`).join('\n');
  return `<section class="rph">
<div class="kepala"><span>${esc(`${tahun} - ${k.subjek} T${k.tingkatan}`)}</span><span>M${minggu}</span></div>
<h1>RANCANGAN PENGAJARAN HARIAN</h1>
<table>
${tr}
</table>
</section>`;
}

function renderRph({ tahun, minggu, guru, pages }) {
  const subjek = pages.length ? pages[0].kelas.subjek : '';
  const body = pages.filter(p => p.row.status !== 'batal').map(p => halaman({ tahun, minggu, guru, ...p })).join('\n');
  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${esc(`RPH ${tahun} ${subjek} M${minggu}`)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font: 10pt/1.35 Arial, sans-serif; color: #000; background: #fff; margin: 16px; }
.rph { break-after: page; page-break-after: always; }
.rph:last-child { break-after: auto; page-break-after: auto; }
.kepala { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 8px; }
h1 { font-size: 13pt; text-align: center; margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; text-align: left; }
th { width: 30%; background: #eee; font-weight: bold; }
</style></head><body>
${body}
</body></html>
`;
}

module.exports = { renderRph, kandungan };
