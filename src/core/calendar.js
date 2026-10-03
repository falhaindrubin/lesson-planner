// Enjin kalendar: kelaskan setiap hari bekerja takwim bagi satu tingkatan.
//   cuti — ada teks Cuti / Perayaan (kecuali BUKAN_CUTI): tiada PdP
//   exam — peperiksaan tingkatan itu dalam lajur Kurikulum: tiada PdP baharu
//   pdp  — selainnya (mesyuarat tidak membatalkan PdP)
import { range } from './util.js';

// Entri Cuti / Perayaan pada hari bekerja yang BUKAN cuti di Sabah
const BUKAN_CUTI = [/HARI SARAWAK/i];

// Peperiksaan dalam lajur Kurikulum -> senarai tingkatan yang terlibat
function examForms(item) {
  let m;
  if ((m = item.match(/^PPT T(\d) *- *(\d)/i))) return range(+m[1], +m[2]);
  if (/^UBB/i.test(item)) return []; // UBBM/UBBI: subjek bahasa sahaja
  const f = [];
  if (/PAT TING\. ?4/i.test(item)) f.push(4);
  if (/UASA/i.test(item)) f.push(1, 2, 3);
  if (/PERCUBAAN SPM/i.test(item)) f.push(5);
  return f;
}

// Takwim mentah -> kalendar: setiap hari { date, hari, cuti ('' jika bukan cuti), exam: [{ nama, forms }] }
function buildCalendar(takwim) {
  const day = d => ({
    date: d.date, hari: d.hari,
    cuti: d.cuti && !BUKAN_CUTI.some(re => re.test(d.cuti)) ? d.cuti : '',
    exam: d.kurikulum.split(';').map(s => s.trim()).filter(s => examForms(s).length)
      .map(s => ({ nama: s, forms: examForms(s) })),
  });
  return {
    weeks: takwim.weeks.map(w => ({ n: w.n, mula: w.mula, days: w.days.map(day) })),
    gaps: takwim.gaps.map(day),
  };
}

// 'cuti' | 'exam' | 'pdp' bagi satu hari dan tingkatan
function dayClass(d, tingkatan) {
  if (d.cuti) return 'cuti';
  return d.exam.some(e => e.forms.includes(tingkatan)) ? 'exam' : 'pdp';
}

// Satu minggu bagi tingkatan -> { n, mula, akhir, cuti: [hari], exam: [hari], pdp: bil. hari PdP }
function weekFor(w, tingkatan) {
  const cuti = w.days.filter(d => dayClass(d, tingkatan) === 'cuti');
  const exam = w.days.filter(d => dayClass(d, tingkatan) === 'exam');
  return {
    n: w.n, mula: w.days[0].date, akhir: w.days[w.days.length - 1].date,
    cuti, exam, pdp: w.days.length - cuti.length - exam.length,
  };
}

// Blok peperiksaan tingkatan itu (minggu berturutan) -> [{ mula, akhir, nama }] (nombor minggu).
// Blok pertama = PPT, blok terakhir = peperiksaan akhir.
function examBlocks(kalendar, tingkatan) {
  const blocks = [];
  for (const w of kalendar.weeks) {
    const names = w.days.filter(d => dayClass(d, tingkatan) === 'exam')
      .flatMap(d => d.exam.filter(e => e.forms.includes(tingkatan)).map(e => e.nama));
    if (!names.length) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.akhir === w.n - 1) last.akhir = w.n;
    else blocks.push({ mula: w.n, akhir: w.n, nama: names[0] });
  }
  return blocks;
}

// Cuti penggal di antara dua minggu -> [{ selepas: n, mula, akhir, nama }]
function breaks(kalendar) {
  const out = [];
  for (const d of kalendar.gaps) {
    const prev = [...kalendar.weeks].reverse().find(w => w.days[0].date < d.date);
    if (!prev) continue;
    const last = out[out.length - 1];
    if (last && last.selepas === prev.n) last.akhir = d.date;
    else out.push({ selepas: prev.n, mula: d.date, akhir: d.date, nama: d.cuti.split(';')[0].trim() || 'CUTI' });
  }
  return out;
}

export { BUKAN_CUTI, examForms, buildCalendar, dayClass, weekFor, examBlocks, breaks };
