// Fungsi kecil yang dikongsi oleh parser, kalendar dan renderer. Tiada I/O.

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const HARI_BEKERJA = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];

// '| a | b |' -> ['a', 'b']
function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
function fmtDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${BULAN[m - 1]}`;
}
function fmtRange(a, b) {
  const [, ma] = a.split('-'), [, mb] = b.split('-');
  return ma === mb ? `${Number(a.slice(8))}–${fmtDate(b)}` : `${fmtDate(a)} – ${fmtDate(b)}`;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

module.exports = { BULAN, HARI_BEKERJA, cells, daysBetween, fmtDate, fmtRange, range };
