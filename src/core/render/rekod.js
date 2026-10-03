// Renderer rekod: baris PdP -> rekod-<kelas>-<subjek>.md. Teks kepala dijana semula setiap kali;
// hanya baris jadual ialah data. Teks guru dalam Catatan dikekalkan ('|' ditukar kepada '/').
const sel = s => String(s == null ? '' : s).replace(/\|/g, '/');

function renderRekod(k, tahun, rows) {
  const L = [
    `# Rekod ${k.kelas} ${k.subjek} ${tahun}`, '',
    `- Kelas: ${k.namaPenuh} (Tingkatan ${k.tingkatan}) · ${k.namaSubjek}`,
    '- Status: **diajar** (lalai) · **ditunda** · **batal**. Tulis sebab atau refleksi dalam Catatan.',
    '- SP: satu atau lebih kod dipisahkan koma (contoh `4.2.7, 4.2.8`); kod tajuk (contoh `1.0`) = ulang kaji.',
    '- Baris selepas hari ini dibina semula setiap kali penjana dijalankan, kecuali jika Status atau Catatan diubah. Untuk mengekalkan SP yang diubah pada baris akan datang, tulis nota dalam Catatan.',
    '',
    '| Minggu | Tarikh | Hari | Waktu | Masa | Jenis | Acara | SP | Status | Kehadiran | Catatan |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows)
    L.push(`| M${r.minggu} | ${r.tarikh} | ${r.hari} | ${r.waktu} | ${r.masa} | ${r.jenis} | ${sel(r.acara)} | ${r.sp.join(', ')} | ${r.status} | ${sel(r.kehadiran)} | ${sel(r.catatan)} |`);
  return L.join('\n') + '\n';
}

module.exports = { renderRekod };
