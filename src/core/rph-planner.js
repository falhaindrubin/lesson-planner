// Perancang RPH: isi SP bagi baris rekod baharu (baru: true) dan kira kedudukan kelas.
// Masa setiap SP (minit) daripada masaSp (src/core/masa-sp.js): minit sebenar kelas itu dalam
// minggu RPT tempat SP itu diletakkan. Tanpa RPT (masaSp null): satu SP satu PdP.
// SP diajar ikut tertib DSKP: SP ringan berkongsi satu PdP, SP berat merentas beberapa PdP
// (ditulis biasa pada setiap PdP — tiada tanda "bersambung").
//   - PdP diajar: minit PdP diberi kepada SP dalam sel ikut tertib; semua kecuali yang terakhir
//     selesai; yang terakhir mengambil baki dan selesai jika tinggal < MIN_SISA minit.
//   - ditunda / batal / peperiksaan / tutorial: tiada masa digunakan.
//   - tutorial baharu: ulang SP PdP diajar yang terakhir.
//   - DSKP habis: ulang kaji ikut tajuk, satu tajuk satu PdP (kod tajuk, contoh 1.0).
//   - Tanpa RPT: satu SP satu PdP; semua SP dalam baris diajar dikira selesai.
const MIN_SISA = 15;

const kodTajuk = k => /\.0$/.test(k);

function planRows({ rows, sp, masaSp = null, mula = '', fail = 'rekod' }) {
  const index = new Map(sp.map((s, i) => [s.code, i]));
  const tajuk = [...new Set(sp.map(s => s.bidang.code))];
  const warnings = [];
  let idx = mula ? index.get(mula) : 0;
  if (idx == null) throw new Error(`${fail}: SP Mula ${mula} tiada dalam DSKP`);
  let sisa = null;       // minit berbaki bagi sp[idx]; null = belum bermula
  let ulang = 0;         // bilangan PdP ulang kaji setakat ini
  let akhirDiajar = [];  // SP PdP diajar yang terakhir (untuk tutorial)

  const perlu = (i, r) => {
    if (!masaSp) return r.minit;
    const m = masaSp.get(sp[i].code);
    if (m == null) { warnings.push(`SP ${sp[i].code} tiada dalam Peruntukan SP; guna ${r.minit} minit`); return r.minit; }
    return m;
  };
  const baki = (i, r) => (i === idx && sisa != null ? sisa : perlu(i, r));

  // SP bagi PdP baharu, bermula dari kedudukan semasa (tidak mengubah keadaan)
  function jana(r) {
    if (idx >= sp.length) return [tajuk[ulang % tajuk.length]];
    const out = [];
    let ada = r.minit, i = idx, s = baki(idx, r);
    for (;;) {
      out.push(sp[i].code);
      if (s - ada >= MIN_SISA) break; // SP ini berterusan ke PdP seterusnya
      ada -= s;
      i++;
      if (i >= sp.length || ada < MIN_SISA) break;
      s = perlu(i, r);
    }
    return out;
  }

  // Kemas kini keadaan daripada satu PdP diajar (baharu atau sedia ada / diubah guru)
  function guna(r) {
    const kod = r.sp;
    if (!kod.length) return;
    if (kodTajuk(kod[0])) {
      for (const k of kod) if (!tajuk.includes(k)) throw new Error(`${fail}:${r.line}: tajuk ${k} tiada dalam DSKP`);
      ulang += kod.length;
      akhirDiajar = kod;
      return;
    }
    const is = kod.map(k => {
      const i = index.get(k);
      if (i == null) throw new Error(`${fail}:${r.line}: SP ${k} tiada dalam DSKP`);
      return i;
    });
    const last = is[is.length - 1];
    akhirDiajar = kod;
    // Tanpa RPT tiada SP yang merentas PdP: semua SP dalam baris selesai
    if (!masaSp) { idx = last + 1; sisa = null; return; }
    let ada = r.minit;
    for (const i of is.slice(0, -1)) ada -= baki(i, r);
    const s = baki(last, r) - Math.max(0, ada);
    if (s < MIN_SISA) { idx = last + 1; sisa = null; } else { idx = last; sisa = s; }
  }

  const out = rows.map(r0 => {
    const r = { ...r0 };
    if (r.baru) {
      if (r.jenis === 'pdp') r.sp = sp.length ? jana(r) : [];
      else if (r.jenis === 'tutorial') r.sp = [...akhirDiajar];
      else r.sp = [];
    }
    if (r.jenis === 'pdp' && r.status === 'diajar' && sp.length) guna(r);
    return r;
  });
  return { rows: out, warnings: [...new Set(warnings)], akhir: { idx, sisa, ulang, selesai: idx >= sp.length } };
}

module.exports = { MIN_SISA, planRows };
