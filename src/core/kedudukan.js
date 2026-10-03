// Kedudukan kelas berbanding RPT beku (dipaparkan oleh CLI sahaja, bukan pada RPH).
// Beza = (minit kandungan SP yang telah diajar − minit PdP yang dijadualkan dalam minggu PdP
// sebelum minggu diminta) ÷ minit seminggu kelas itu. Beza < 0.5 minggu = ikut RPT; selainnya
// dibundarkan kepada minggu ke depan / ke belakang. Diukur dalam minit supaya minggu separa
// (contoh M20: dua hari cuti) tidak membesarkan beza yang kecil.
import { weekFor } from './calendar.js';
import { lessonsForWeek } from './scheduler.js';
import { planRows } from './rph-planner.js';
import { versionFor, minitSeminggu } from './timetable.js';

function kedudukan({ rpt, kalendar, tingkatan, sp, akhir, masaSp, minitMinggu, seminggu, minggu }) {
  if (akhir.selesai) return { status: 'selesai' };
  const kod = sp[akhir.idx].code;
  const julat = rpt.minggu.filter(w => w.sp.includes(kod)).map(w => w.n);
  if (!julat.length) return { status: 'tiada', kod };
  let diajar = 0;
  for (let i = 0; i < akhir.idx; i++) diajar += masaSp.get(sp[i].code) || 0;
  if (akhir.sisa != null) diajar += (masaSp.get(kod) || 0) - akhir.sisa;
  const jangka = kalendar.weeks.filter(w => w.n < minggu && weekFor(w, tingkatan).pdp > 0).reduce((a, w) => a + minitMinggu(w.n), 0);
  const beza = seminggu ? (diajar - jangka) / seminggu : 0;
  const status = Math.abs(beza) < 0.5 ? 'ikut' : beza > 0 ? 'depan' : 'belakang';
  return { status, kod, julat: [Math.min(...julat), Math.max(...julat)], beza: status === 'ikut' ? 0 : Math.round(Math.abs(beza)) };
}

function teksKedudukan(label, k) {
  if (k.status === 'selesai') return `${label}: DSKP selesai · ulang kaji`;
  if (k.status === 'tiada') return `${label}: SP ${k.kod} tiada dalam RPT`;
  const rpt = `RPT M${k.julat[0]}${k.julat[1] > k.julat[0] ? `–M${k.julat[1]}` : ''}`;
  const kini = k.status === 'ikut' ? 'ikut RPT' : `${k.beza} minggu ke ${k.status}`;
  return `${label}: SP ${k.kod} · ${rpt} · ${kini}`;
}

// Minit untuk SP berbaki vs minit PdP yang dijadualkan (pelajaran) hingga minggu tamat sukatan
function muat({ sp, masaSp, akhir, pelajaran }) {
  let perlu = 0;
  for (let i = akhir.idx; i < sp.length; i++)
    perlu += i === akhir.idx && akhir.sisa != null ? akhir.sisa : masaSp.get(sp[i].code) || 0;
  return { perlu, ada: pelajaran.reduce((a, l) => a + l.minit, 0) };
}

// Satu baris ringkasan + amaran "tidak muat" bagi satu kelas × subjek pada awal minggu diminta
function ringkasanKelas({ kelas, rows, sp, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas, minggu }) {
  const w = kalendar.weeks.find(x => x.n === minggu);
  const seminggu = minitSeminggu(versionFor(versions, w.days[0].date), kelas.kelas, kelas.subjek);
  const label = `${kelas.kelas} ${kelas.subjek}`;
  if (!sp.length) return { teks: `${label}: tiada DSKP`, amaran: [] };
  const sebelum = rows.filter(r => r.minggu < minggu);
  const { akhir } = planRows({ rows: sebelum, sp, masaSp: rpt ? masaSp : null, mula: kelas.mula });
  if (!rpt) return { teks: `${label}: ${akhir.selesai ? 'DSKP selesai' : `SP ${sp[akhir.idx].code}`} · tiada RPT`, amaran: [] };
  const teks = teksKedudukan(label, kedudukan({ rpt, kalendar, tingkatan: kelas.tingkatan, sp, akhir, masaSp, minitMinggu, seminggu, minggu }));
  if (akhir.selesai) return { teks, amaran: [] };
  const pelajaran = [];
  for (let n = minggu; n <= rpt.tamat; n++)
    pelajaran.push(...lessonsForWeek({ kalendar, versions, kelas: semuaKelas, acara, minggu: n })
      .filter(l => l.kelas === kelas.kelas && l.subjek === kelas.subjek && l.jenis === 'pdp'));
  const m = muat({ sp, masaSp, akhir, pelajaran });
  const amaran = m.perlu > m.ada + 30 // satu waktu: peraturan 15 minit boleh menambah sedikit masa
    ? [`${label}: perlu ${Math.round(m.perlu)} minit untuk SP berbaki, ada ${m.ada} minit hingga M${rpt.tamat}; pertimbang gabung SP`]
    : [];
  return { teks, amaran };
}

export { kedudukan, teksKedudukan, muat, ringkasanKelas };
