// Jana RPT (Rancangan Pengajaran Tahunan) satu subjek daripada DSKP.md, Takwim.md
// dan fail kesukaran SP. SP diagihkan ikut kesukaran ke atas minggu PdP sebenar
// (tolak cuti dan peperiksaan tingkatan itu) sehingga minggu tamat sukatan.
//
//   node src/cli/rpt.js --dskp sample/dskp-mat-t4.md --takwim sample/takwim-smly-2026.md \
//     --kesukaran sample/kesukaran-mat-t4.md --tingkatan 4 --out output/rpt-mat-t4-2026
//
// Lalai: sukatan tamat sebelum peperiksaan akhir tingkatan itu (PAT / UASA; Percubaan SPM
// bagi Tingkatan 5), tolak minggu ulang kaji.
// --ulang-kaji <n>    minggu ulang kaji sebelum peperiksaan akhir (lalai 2, semua tingkatan)
// --tamat <minggu>    tetapkan minggu terakhir sukatan secara manual

const fs = require('fs');
const path = require('path');
const C = require('../core');

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  for (const k of ['dskp', 'takwim', 'kesukaran', 'tingkatan', 'out'])
    if (!a[k]) throw new Error(`Perlu --${k}`);
  const read = f => fs.readFileSync(f, 'utf8');
  const dskpMd = read(a.dskp), takwimMd = read(a.takwim);
  const subjek = a.subjek || (dskpMd.match(/^# DSKP (.+?) Tingkatan/m) || [])[1] || 'Subjek';
  const tahun = (takwimMd.match(/\| (\d{4})-\d\d-\d\d/) || [])[1];
  const p = C.plan({
    sp: C.parseDskp(dskpMd), kesukaran: C.parseKesukaran(read(a.kesukaran)),
    kalendar: C.buildCalendar(C.parseTakwim(takwimMd)),
    tingkatan: Number(a.tingkatan), tamat: a.tamat === 'akhir' ? 'akhir' : a.tamat ? Number(a.tamat) : undefined,
    ulangKaji: a['ulang-kaji'] != null ? Number(a['ulang-kaji']) : undefined,
  });
  const meta = { subjek, tahun, dskp: a.dskp, takwim: a.takwim, kesukaran: a.kesukaran };
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  fs.writeFileSync(a.out + '.md', C.renderMd(p, meta));
  fs.writeFileSync(a.out + '.html', C.renderHtml(p, meta));
  p.warnings.forEach(w => console.warn('Amaran:', w));
  console.log(`${a.out}.md, ${a.out}.html`);
}

main(process.argv.slice(2));
