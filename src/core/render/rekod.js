// Rekod renderer: PdP rows -> rekod-<class>-<subject>.md. The header text is regenerated every time;
// only the table rows are data. The teacher's text in Catatan is kept ('|' becomes '/').
// The text written to the file stays Malay.
const cell = s => String(s == null ? '' : s).replace(/\|/g, '/');

function renderRekod(cls, year, rows) {
  const L = [
    `# Rekod ${cls.classCode} ${cls.subject} ${year}`, '',
    `- Kelas: ${cls.fullName} (Tingkatan ${cls.form}) · ${cls.subjectName}`,
    '- Status: **diajar** (lalai) · **ditunda** · **batal**. Tulis sebab atau refleksi dalam Catatan.',
    '- SP: satu atau lebih kod dipisahkan koma (contoh `4.2.7, 4.2.8`); kod tajuk (contoh `1.0`) = ulang kaji.',
    '- Baris selepas hari ini dibina semula setiap kali penjana dijalankan, kecuali jika Status atau Catatan diubah. Untuk mengekalkan SP yang diubah pada baris akan datang, tulis nota dalam Catatan.',
    '',
    '| Minggu | Tarikh | Hari | Waktu | Masa | Jenis | Acara | SP | Status | Kehadiran | Catatan |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows)
    L.push(`| M${r.week} | ${r.date} | ${r.dayName} | ${r.periods} | ${r.time} | ${r.kind} | ${cell(r.event)} | ${r.sp.join(', ')} | ${r.status} | ${cell(r.attendance)} | ${cell(r.note)} |`);
  return L.join('\n') + '\n';
}

export { renderRekod };
