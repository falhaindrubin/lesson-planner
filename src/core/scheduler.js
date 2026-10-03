// Penjadual: satu minggu takwim -> senarai PdP bagi semua kelas × subjek dalam fail kelas.
//   cuti tingkatan itu atau Batal -> tiada PdP
//   peperiksaan tingkatan itu      -> jenis 'peperiksaan', acara = nama peperiksaan
//   hari acara                     -> PdP biasa, acara = nama acara (guru buat keputusan)
// Slot dengan kod Tutorial kelas itu -> jenis 'tutorial' bagi subjek kelas itu.
// Slot kelas × subjek yang tiada dalam fail kelas tidak dirancang (contoh: rancang satu subjek sahaja).
import { dayClass } from './calendar.js';
import { versionFor } from './timetable.js';
import { fmtWaktu, minitWaktu, waktuRange } from './util.js';

const ikutMasa = (a, b) => (a.tarikh < b.tarikh ? -1 : a.tarikh > b.tarikh ? 1 : waktuRange(a.waktu)[0] - waktuRange(b.waktu)[0]);

const kenaBatal = (b, tarikh, k) => b.tarikh === tarikh && (!b.sasaran || b.sasaran === String(k.tingkatan) || b.sasaran === k.kelas);

function lessonsForWeek({ kalendar, versions, kelas, acara, minggu, pilihVersi = versionFor }) {
  const w = kalendar.weeks.find(x => x.n === minggu);
  if (!w) throw new Error(`Tiada minggu M${minggu} dalam takwim`);
  const out = [];
  for (const d of w.days) {
    const v = pilihVersi(versions, d.date);
    for (const s of v.slots.filter(x => x.hari === d.hari)) {
      const k = kelas.find(x => x.kelas === s.kelas && (x.subjek === s.subjek || (x.tutorial && x.tutorial === s.subjek)));
      if (!k) continue; // kelas × subjek tiada dalam fail kelas: tidak dirancang (lihat slotTanpaKelas)
      const kelasHari = dayClass(d, k.tingkatan);
      if (kelasHari === 'cuti' || acara.batal.some(b => kenaBatal(b, d.date, k))) continue;
      const exam = kelasHari === 'exam' ? d.exam.filter(e => e.forms.includes(k.tingkatan)).map(e => e.nama) : [];
      const ev = acara.acara.filter(a => a.tarikh === d.date && (!a.tingkatan.length || a.tingkatan.includes(k.tingkatan))).map(a => a.nama);
      out.push({
        minggu, tarikh: d.date, hari: d.hari, kelas: k.kelas, subjek: k.subjek,
        waktu: fmtWaktu(s.waktu), masa: s.masa, minit: minitWaktu(s.waktu),
        jenis: exam.length ? 'peperiksaan' : s.subjek === k.subjek ? 'pdp' : 'tutorial',
        acara: [...exam, ...ev].join('; '),
      });
    }
  }
  return out.sort(ikutMasa);
}

// Slot jadual yang tiada baris dalam fail kelas -> ['ASK 1S', ...] (untuk nota CLI)
function slotTanpaKelas(versions, kelas) {
  const out = new Set();
  for (const v of versions)
    for (const s of v.slots)
      if (!kelas.some(x => x.kelas === s.kelas && (x.subjek === s.subjek || (x.tutorial && x.tutorial === s.subjek)))) out.add(`${s.subjek} ${s.kelas}`);
  return [...out];
}

export { lessonsForWeek, ikutMasa, slotTanpaKelas };
