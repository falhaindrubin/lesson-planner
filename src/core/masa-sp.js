// Masa setiap SP bagi satu kelas (minit), ikut kedudukan SP dalam RPT beku.
// SP menduduki selang [mula, mula + minggu] di atas minggu berkapasiti RPT (minggu yang ada SP),
// ikut tertib DSKP. Masa SP = jumlah tindihan dengan setiap minggu × minit PdP sebenar kelas itu
// dalam minggu tersebut. Minggu separa (cuti, Batal) memberi masa kurang, jadi kelas yang tidak
// terganggu sentiasa mengikut RPT; hanya PdP ditunda / batal dalam rekod membuat kelas ketinggalan.
const { lessonsForWeek } = require('./scheduler');
const { versionFor } = require('./timetable');

function masaSp({ rpt, sp, minitMinggu }) {
  const minggu = rpt.minggu.filter(w => w.sp.length).map(w => w.n);
  const out = new Map();
  let pos = 0;
  for (const s of sp) {
    const w = rpt.peruntukan.get(s.code);
    if (w == null) continue;
    let m = 0;
    minggu.forEach((n, i) => {
      const o = Math.min(pos + w, i + 1) - Math.max(pos, i);
      if (o > 0) m += o * minitMinggu(n);
    });
    out.set(s.code, m);
    pos += w;
  }
  return out;
}

// Minit PdP sebenar kelas × subjek dalam minggu n (tanpa cuti, peperiksaan, Batal dan tutorial).
// Minggu sebelum jadual pertama berkuat kuasa: guna jadual terawal (lalai = true).
function minitPdpMinggu({ kalendar, versions, kelas, semuaKelas, acara }) {
  const awal = versions.reduce((a, v) => (!a || v.berkuatKuasa < a.berkuatKuasa ? v : a), null);
  const pilihVersi = (vs, tarikh) => {
    if (vs.some(v => v.berkuatKuasa <= tarikh)) return versionFor(vs, tarikh);
    f.lalai = true;
    return awal;
  };
  const cache = new Map();
  const f = n => {
    if (!cache.has(n))
      cache.set(n, lessonsForWeek({ kalendar, versions, kelas: semuaKelas, acara, minggu: n, pilihVersi })
        .filter(l => l.kelas === kelas.kelas && l.subjek === kelas.subjek && l.jenis === 'pdp')
        .reduce((a, l) => a + l.minit, 0));
    return cache.get(n);
  };
  f.lalai = false;
  f.awal = awal && awal.berkuatKuasa;
  return f;
}

module.exports = { masaSp, minitPdpMinggu };
