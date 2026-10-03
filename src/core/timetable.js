// Penyelesai jadual: versi jadual yang berkuat kuasa pada satu tarikh.
// Pertukaran jadual = fail baharu dengan tarikh berkuat kuasa sendiri; tarikh lama tidak diubah.
const { minitWaktu } = require('./util');

// Versi terkini dengan berkuatKuasa <= tarikh
function versionFor(versions, tarikh) {
  let best = null;
  for (const v of versions) if (v.berkuatKuasa <= tarikh && (!best || v.berkuatKuasa > best.berkuatKuasa)) best = v;
  if (!best) throw new Error(`Tiada jadual berkuat kuasa pada ${tarikh}`);
  return best;
}

// Minit PdP seminggu bagi kelas × subjek dalam satu versi (slot tutorial tidak dikira)
function minitSeminggu(version, kelas, subjek) {
  return version.slots
    .filter(s => s.kelas === kelas && s.subjek === subjek)
    .reduce((a, s) => a + minitWaktu(s.waktu), 0);
}

module.exports = { versionFor, minitSeminggu };
