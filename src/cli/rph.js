// Jana RPH seminggu bagi semua kelas dalam fail kelas dan kemas kini rekod setiap kelas × subjek.
//
//   node src/cli/rph.js --kelas sample/kelas-2026.md --minggu 35 [--hari-ini 2026-10-03]
//
// Fail kelas menamakan takwim, jadual, acara, folder rekod dan folder output (relatif kepada fail kelas).
// Baris rekod sebelum / pada hari ini tidak diubah. Baris selepas hari ini dibina semula
// kecuali jika guru mengubah Status, Kehadiran atau Catatan.
// Output: <Output>/<tahun>-M<n>-<SUBJEK>.html bagi setiap subjek dan minggu yang dirancang,
// kemudian amaran (stderr) dan satu baris kedudukan bagi setiap kelas.

const fs = require('fs');
const path = require('path');
const C = require('../core');

function hariIniTempatan() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.kelas || !a.minggu) throw new Error('Guna: node src/cli/rph.js --kelas <fail kelas> --minggu <n> [--hari-ini yyyy-mm-dd]');
  const minggu = Number(String(a.minggu).replace(/^M/i, ''));
  const hariIni = a['hari-ini'] || hariIniTempatan();
  if (!/^\d{4}-\d\d-\d\d$/.test(hariIni)) throw new Error(`--hari-ini "${hariIni}" bukan yyyy-mm-dd`);

  const failKelas = path.resolve(a.kelas);
  const dir = path.dirname(failKelas);
  const nama = f => path.relative(process.cwd(), f) || f;
  const baca = f => fs.readFileSync(path.resolve(dir, f), 'utf8');
  const K = C.parseKelas(fs.readFileSync(failKelas, 'utf8'), nama(failKelas));
  const kalendar = C.buildCalendar(C.parseTakwim(baca(K.takwim)));
  const versions = K.jadual.map(f => C.parseJadual(baca(f), f));
  const acara = C.parseAcara(baca(K.acara), K.acara);
  const rekodDir = path.resolve(dir, K.rekod), outDir = path.resolve(dir, K.output);

  const cache = new Map();
  const sekali = (f, fn) => {
    if (!cache.has(f)) cache.set(f, fn(baca(f), f));
    return cache.get(f);
  };

  // Semua fail ditulis selepas setiap kelas berjaya: ralat pada satu kelas tidak meninggalkan fail separuh siap
  const tulis = [];
  const halaman = new Map(); // 'SUBJEK|n' -> [{ kelas, row, sp, aktiviti }]
  const amaran = [], ringkasan = [];
  for (const k of K.kelas) {
    const sp = k.dskp ? sekali(k.dskp, C.parseDskp) : [];
    const rpt = k.rpt ? sekali(k.rpt, C.parseRpt) : null;
    const aktiviti = sekali(k.aktiviti, C.parseAktiviti);
    // Masa setiap SP: minit sebenar kelas ini dalam minggu RPT tempat SP itu diletakkan
    const minitMinggu = C.minitPdpMinggu({ kalendar, versions, kelas: k, semuaKelas: K.kelas, acara });
    const masaSp = rpt ? C.masaSp({ rpt, sp, minitMinggu }) : null;
    if (minitMinggu.lalai) amaran.push(`${k.kelas} ${k.subjek}: tiada jadual sebelum ${minitMinggu.awal}; masa SP bagi minggu lebih awal dikira dengan jadual itu`);
    const failRekod = path.join(rekodDir, `rekod-${k.kelas}-${k.subjek}.md`);
    const rows = fs.existsSync(failRekod) ? C.parseRekod(fs.readFileSync(failRekod, 'utf8'), nama(failRekod)) : [];
    const s = C.syncRekod({
      rows, kelas: k, semuaKelas: K.kelas, sp, masaSp,
      kalendar, versions, acara, minggu, hariIni, fail: nama(failRekod),
    });
    tulis.push([failRekod, C.renderRekod(k, K.tahun, s.rows)]);
    amaran.push(...s.warnings);
    for (const n of new Set([...s.minggu, minggu])) {
      const key = `${k.subjek}|${n}`;
      if (!halaman.has(key)) halaman.set(key, []);
      halaman.get(key).push(...s.rows.filter(r => r.minggu === n).map(row => ({ kelas: k, row, sp, aktiviti })));
    }
    const r = C.ringkasanKelas({ kelas: k, rows: s.rows, sp, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas: K.kelas, minggu });
    ringkasan.push(r.teks);
    amaran.push(...r.amaran);
  }

  for (const [key, pages] of [...halaman].sort(([x], [y]) => x.localeCompare(y))) {
    const [subjek, n] = key.split('|');
    if (!pages.some(p => p.row.status !== 'batal')) continue;
    pages.sort((x, y) => C.ikutMasa(x.row, y.row));
    const f = path.join(outDir, `${K.tahun}-M${n}-${subjek}.html`);
    tulis.push([f, C.renderRph({ tahun: K.tahun, minggu: Number(n), guru: K.guru, pages })]);
  }
  fs.mkdirSync(rekodDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [f, isi] of tulis) fs.writeFileSync(f, isi);
  tulis.filter(([f]) => f.startsWith(outDir)).forEach(([f]) => console.log(nama(f)));
  const tanpa = C.slotTanpaKelas(versions, K.kelas);
  if (tanpa.length) console.log(`Tidak dirancang (tiada dalam fail kelas): ${tanpa.join(', ')}`);
  amaran.forEach(w => console.warn('Amaran:', w));
  ringkasan.forEach(l => console.log(l));
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Ralat:', e.message);
  process.exit(1);
}
