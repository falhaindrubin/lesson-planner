// Selaraskan rekod satu kelas × subjek hingga minggu diminta.
//   - baris lepas (tarikh <= hariIni) dan baris yang diubah guru: kekal
//   - baris akan datang yang belum diubah: dibina semula daripada jadual, takwim, acara dan baris sebelumnya
//   - minggu yang belum ada dalam rekod hingga minggu diminta: dirancang (diajar, kehadiran penuh)
const { lessonsForWeek, ikutMasa } = require('./scheduler');
const { planRows } = require('./rph-planner');
const { waktuRange, range } = require('./util');

const kunci = r => `${r.tarikh} ${waktuRange(r.waktu)[0]}`;

// Diubah guru = Status, Kehadiran atau Catatan berbeza daripada nilai lalai
function diubah(r, bilMurid) {
  const exam = r.jenis === 'peperiksaan';
  return r.status !== (exam ? '' : 'diajar') || r.catatan !== '' || r.kehadiran !== (exam ? null : bilMurid);
}

function syncRekod({ rows, kelas, semuaKelas, sp, masaSp = null, kalendar, versions, acara, minggu, hariIni, fail = 'rekod' }) {
  const label = `${kelas.kelas} ${kelas.subjek}`;
  if (!kalendar.weeks.some(w => w.n === minggu)) throw new Error(`Tiada minggu M${minggu} dalam takwim`);
  if (kelas.bilMurid == null) throw new Error(`${label}: Bil. murid kosong dalam fail kelas`);
  if (!rows.length && sp.length && !kelas.mula) throw new Error(`${label}: rekod kosong dan Mula tiada dalam fail kelas`);
  const warnings = [];
  const kekal = rows.filter(r => r.tarikh <= hariIni || diubah(r, kelas.bilMurid));
  const akhirRekod = rows.length ? Math.max(...rows.map(r => r.minggu)) : null;
  const depan = rows.filter(r => r.tarikh > hariIni).map(r => r.minggu);
  const dari = akhirRekod == null ? minggu : Math.min(akhirRekod + 1, ...depan);
  const hingga = Math.max(minggu, akhirRekod || 0);

  const ada = new Set(kekal.map(kunci));
  const mingguAda = new Set(rows.map(r => r.minggu));
  const slot = new Set();
  const baru = [];
  for (let n = dari; n <= hingga; n++) {
    for (const l of lessonsForWeek({ kalendar, versions, kelas: semuaKelas, acara, minggu: n })) {
      if (l.kelas !== kelas.kelas || l.subjek !== kelas.subjek) continue;
      slot.add(kunci(l));
      if (ada.has(kunci(l))) continue;
      if (l.tarikh <= hariIni && mingguAda.has(n)) continue; // PdP lepas yang dibuang oleh guru
      const exam = l.jenis === 'peperiksaan';
      const { kelas: _k, subjek: _s, ...r } = l;
      baru.push({ ...r, sp: [], status: exam ? '' : 'diajar', kehadiran: exam ? null : kelas.bilMurid, catatan: '', baru: true });
    }
  }
  // Minggu terlangkau yang ada PdP (minggu cuti penuh tidak dikira)
  const langkau = [...new Set(baru.filter(r => akhirRekod != null && r.minggu > akhirRekod && r.minggu < minggu).map(r => r.minggu))];
  if (langkau.length) {
    const a = Math.min(...langkau), b = Math.max(...langkau);
    warnings.push(`${label}: M${a}${b > a ? `–M${b}` : ''} tiada dalam rekod; dirancang juga`);
  }
  for (const r of kekal)
    if (r.tarikh > hariIni && r.minggu >= dari && !slot.has(kunci(r)))
      warnings.push(`${fail}:${r.line}: ${r.tarikh} waktu ${r.waktu} tiada dalam jadual; baris dikekalkan, sila semak`);
  if (!sp.length && baru.some(r => r.jenis !== 'peperiksaan')) warnings.push(`${label}: tiada DSKP; SP dibiarkan kosong`);

  const p = planRows({ rows: [...kekal, ...baru].sort(ikutMasa), sp, masaSp, mula: kelas.mula, fail });
  return {
    rows: p.rows.map(({ baru: _b, line: _l, ...r }) => r),
    minggu: dari <= hingga ? range(dari, hingga) : [],
    warnings: [...warnings, ...p.warnings],
  };
}

module.exports = { syncRekod, diubah };
