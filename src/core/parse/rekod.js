// rekod-<kelas>-<subjek>.md -> [baris PdP]
// Ditulis oleh src/cli/rph.js, diubah oleh guru selepas mengajar. Hanya baris jadual dibaca.
//   SP:        kod dalam sel ikut tertib (n.n.n), atau kod tajuk n.0 = ulang kaji
//   Status:    diajar / ditunda / batal (huruf besar atau kecil); kosong bagi peperiksaan
//   Kehadiran: nombor pertama dibaca ('33/35' -> 33)
const { cells, waktuRange, minitWaktu } = require('../util');

const JENIS = ['pdp', 'tutorial', 'peperiksaan'];
const STATUS = ['diajar', 'ditunda', 'batal'];
const LAJUR = 11;

const kodSel = s => String(s).match(/\b\d+\.\d+\.\d+\b|\b\d+\.0\b/g) || [];

function parseRekod(md, fail = 'rekod') {
  const rows = [];
  md.split(/\r?\n/).forEach((line, i) => {
    if (!/^\| *M\d+ *\|/.test(line)) return;
    const at = `${fail}:${i + 1}`;
    const c = cells(line);
    if (c.length !== LAJUR) throw new Error(`${at}: perlu ${LAJUR} lajur, ada ${c.length}`);
    const [m, tarikh, hari, waktu, masa, jenis, acara, sp, status, hadir, catatan] = c;
    const j = jenis.toLowerCase(), st = status.toLowerCase();
    if (!/^\d{4}-\d\d-\d\d$/.test(tarikh)) throw new Error(`${at}: Tarikh "${tarikh}" bukan yyyy-mm-dd`);
    if (!JENIS.includes(j)) throw new Error(`${at}: Jenis "${jenis}" tidak dikenali (${JENIS.join(' / ')})`);
    if (st && !STATUS.includes(st)) throw new Error(`${at}: Status "${status}" tidak dikenali (${STATUS.join(' / ')})`);
    let w;
    try { w = waktuRange(waktu); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    const kod = kodSel(sp);
    if (kod.some(k => /\.0$/.test(k)) && kod.some(k => !/\.0$/.test(k)))
      throw new Error(`${at}: jangan campur kod tajuk ulang kaji dan kod SP dalam satu baris ("${sp}")`);
    const h = hadir.match(/^\d+/);
    rows.push({
      minggu: Number(m.trim().slice(1)), tarikh, hari, waktu, masa, minit: minitWaktu(w), jenis: j, acara,
      sp: kod, status: st, kehadiran: h ? Number(h[0]) : null, catatan, line: i + 1,
    });
  });
  return rows;
}

module.exports = { parseRekod, kodSel, JENIS, STATUS };
