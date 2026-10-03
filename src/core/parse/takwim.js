// Takwim.md -> { weeks: [{ n, mula, days }], gaps: [hari] }
// Hari bekerja sahaja, teks lajur disimpan mentah: { date, hari, cuti, kurikulum }.
// gaps = hari bekerja di luar minggu persekolahan (cuti penggal).
// Pengelasan hari (cuti / peperiksaan) dibuat oleh calendar.js, bukan di sini.
import { cells, daysBetween, HARI_BEKERJA } from '../util.js';

function parseTakwim(md) {
  const weeks = [];
  const gaps = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\| *(M\d+)? *\| *\d{4}-\d\d-\d\d/.test(line)) continue;
    const [minggu, date, hari, cuti, , kurikulum] = cells(line);
    if (minggu) weeks.push((cur = { n: Number(minggu.slice(1)), mula: date, days: [] }));
    if (!HARI_BEKERJA.includes(hari)) continue;
    const inWeek = cur && daysBetween(cur.mula, date) < 5;
    (inWeek ? cur.days : gaps).push({ date, hari, cuti, kurikulum });
  }
  return { weeks, gaps };
}

export { parseTakwim };
