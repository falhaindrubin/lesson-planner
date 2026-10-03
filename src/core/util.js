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

// Waktu jadual: 30 minit setiap satu, waktu 0 bermula 6:30.
// '2–3' -> [2, 3]; '9' -> [9, 9] (sempang biasa juga diterima)
function waktuRange(s) {
  const m = String(s).trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
  const a = m && Number(m[1]), b = m && (m[2] != null ? Number(m[2]) : a);
  if (!m || b < a) throw new Error(`Waktu tidak sah: "${s}"`);
  return [a, b];
}
const fmtWaktu = ([a, b]) => (a === b ? String(a) : `${a}–${b}`);
const minitMula = p => 6 * 60 + 30 + 30 * p; // minit dari tengah malam
const minitWaktu = ([a, b]) => (b - a + 1) * 30;
// Jam 12 jam seperti cetakan aSc (1:00 = 13:00) dan jam 24 jam seperti RPH (0800)
const jam12 = min => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')}`;
const jam24 = min => String(Math.floor(min / 60)).padStart(2, '0') + String(min % 60).padStart(2, '0');
const masaWaktu = ([a, b]) => `${jam12(minitMula(a))}–${jam12(minitMula(b + 1))}`;
// '2026-10-05' -> '05/10/2026'
const fmtTarikh = iso => iso.split('-').reverse().join('/');

module.exports = {
  BULAN, HARI_BEKERJA, cells, daysBetween, fmtDate, fmtRange, range,
  waktuRange, fmtWaktu, minitMula, minitWaktu, jam12, jam24, masaWaktu, fmtTarikh,
};
