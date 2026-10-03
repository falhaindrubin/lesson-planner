// Perancang RPT: agih SP ke atas minggu takwim bagi satu tingkatan.
// Setiap minggu yang ada sekurang-kurangnya satu hari PdP = 1 minggu (minggu cuti penuh /
// peperiksaan penuh = 0).
// - Separuh pertama tajuk (dibundarkan ke atas) mesti selesai sebelum peperiksaan
//   pertengahan tahun (PPT); separuh lagi selepasnya.
// - Dalam setiap bahagian, tajuk yang ada minggu tetap mengambil kapasiti itu; tajuk lain
//   berkongsi baki ikut kesukaran SP.
// SP disenaraikan dalam minggu yang bertindih sekurang-kurangnya MIN_OVERLAP minggu,
// atau minggu tindihan terbesarnya.
import { weekFor, examBlocks, breaks } from './calendar.js';

const MIN_OVERLAP = 0.2;
const ULANG_KAJI = 2; // minggu ulang kaji sebelum peperiksaan akhir (bagi tamat 'akhir')

function plan({ sp, kesukaran, kalendar, tingkatan, tamat = 'akhir', ulangKaji = ULANG_KAJI }) {
  const warnings = [];
  const rated = sp.map(s => {
    const k = kesukaran.sp.get(s.code);
    if (!k) warnings.push(`Tiada kesukaran untuk SP ${s.code}; guna 2`);
    return { ...s, nilai: k ? k.nilai : 2, sebab: k ? k.sebab : '' };
  });
  for (const code of kesukaran.sp.keys())
    if (!sp.some(s => s.code === code)) warnings.push(`Kesukaran untuk SP ${code} tiada dalam DSKP`);
  for (const code of kesukaran.tajuk.keys())
    if (!sp.some(s => s.bidang.code === code)) warnings.push(`Minggu tetap untuk tajuk ${code} tiada dalam DSKP`);

  const exams = examBlocks(kalendar, tingkatan);
  // 'akhir' = sebelum peperiksaan akhir tahun, tolak minggu ulang kaji
  if (tamat === 'akhir') {
    if (!exams.length) throw new Error(`Tiada peperiksaan untuk Tingkatan ${tingkatan} dalam takwim`);
    tamat = exams[exams.length - 1].mula - 1 - ulangKaji;
  }

  const rows = kalendar.weeks.map(w => {
    const x = weekFor(w, tingkatan);
    return { ...x, kapasiti: x.n <= tamat && x.pdp > 0 ? 1 : 0, sp: [] };
  });

  const jumlahKapasiti = rows.reduce((a, r) => a + r.kapasiti, 0);
  const jumlahNilai = rated.reduce((a, s) => a + s.nilai, 0);
  if (!jumlahKapasiti) throw new Error('Tiada minggu PdP sebelum minggu tamat sukatan');
  const kapasitiHingga = n => rows.filter(r => r.n <= n).reduce((a, r) => a + r.kapasiti, 0);

  // Bahagian: [tajuk sebelum PPT] dan [tajuk selepas PPT], jika PPT jatuh sebelum tamat
  const tajuk = [...new Set(rated.map(s => s.bidang.code))];
  const ppt = exams.length > 1 && exams[0].mula <= tamat ? exams[0] : null;
  const potong = ppt ? Math.ceil(tajuk.length / 2) : tajuk.length;
  const parts = [
    { tajuk: tajuk.slice(0, potong), mula: 0, akhir: ppt ? kapasitiHingga(ppt.mula - 1) : jumlahKapasiti },
    { tajuk: tajuk.slice(potong), mula: ppt ? kapasitiHingga(ppt.mula - 1) : jumlahKapasiti, akhir: jumlahKapasiti },
  ].filter(p => p.tajuk.length);

  // Panjang setiap SP (dalam minggu takwim)
  for (const p of parts) {
    const sps = rated.filter(s => p.tajuk.includes(s.bidang.code));
    const tetap = p.tajuk.filter(t => kesukaran.tajuk.has(t));
    const kapasitiTetap = tetap.reduce((a, t) => a + kesukaran.tajuk.get(t), 0);
    const bebas = sps.filter(s => !tetap.includes(s.bidang.code));
    const baki = p.akhir - p.mula - kapasitiTetap;
    if (baki < 0 || (baki === 0 && bebas.length)) throw new Error(`Minggu tetap (${kapasitiTetap}) melebihi kapasiti bahagian ${p.tajuk[0]}–${p.tajuk[p.tajuk.length - 1]} (${(p.akhir - p.mula).toFixed(1)})`);
    const skala = baki / (bebas.reduce((a, s) => a + s.nilai, 0) || 1);
    for (const s of sps) {
      const t = s.bidang.code;
      s.panjang = tetap.includes(t)
        ? kesukaran.tajuk.get(t) * s.nilai / sps.filter(x => x.bidang.code === t).reduce((a, x) => a + x.nilai, 0)
        : s.nilai * skala;
    }
  }

  // Kapasiti terkumpul pada awal setiap minggu
  let c = 0;
  const bounds = rows.map(r => { const b = [c, c + r.kapasiti]; c += r.kapasiti; return b; });
  let pos = 0;
  for (const s of rated) {
    const a = pos, b = (pos += s.panjang);
    const overlaps = bounds.map(([x, y], i) => ({ i, o: Math.min(b, y) - Math.max(a, x) })).filter(o => o.o > 1e-9);
    const best = overlaps.reduce((p, q) => (q.o > p.o ? q : p));
    const chosen = overlaps.filter(o => o.o >= MIN_OVERLAP - 1e-9 || o === best);
    chosen.forEach((o, k) => rows[o.i].sp.push({ ...s, samb: k > 0 }));
    s.minggu = chosen.map(o => rows[o.i].n);
  }

  return {
    rows, rated, breaks: breaks(kalendar), tamat, tingkatan, jumlahKapasiti, jumlahNilai,
    warnings, exams, ppt, parts, tetap: kesukaran.tajuk,
  };
}

export { MIN_OVERLAP, ULANG_KAJI, plan };
