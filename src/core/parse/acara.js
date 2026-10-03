// acara-<tahun>.md -> { acara: [{ tarikh, nama, tingkatan: [n] }], batal: [{ tarikh, sasaran, sebab }] }
// Hari acara: PdP ditandakan (guru buat keputusan). Tingkatan kosong = semua tingkatan.
// Batal: tiada PdP langsung. Sasaran kosong = semua; '4' = Tingkatan 4; '4S' = kelas 4S.
const { cells } = require('../util');

function parseAcara(md, fail = 'acara') {
  const out = { acara: [], batal: [] };
  let section = '';
  md.split(/\r?\n/).forEach((line, i) => {
    const at = `${fail}:${i + 1}`;
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); return; }
    if (!/^\| *\d{4}-\d\d-\d\d *\|/.test(line)) return;
    const [tarikh, a = '', b = ''] = cells(line);
    if (section === 'Hari acara') {
      const tingkatan = b ? b.split(/[,\s]+/).filter(Boolean).map(Number) : [];
      if (tingkatan.some(t => !(t >= 1 && t <= 5))) throw new Error(`${at}: Tingkatan "${b}" bukan 1–5`);
      if (!a) throw new Error(`${at}: nama acara kosong`);
      out.acara.push({ tarikh, nama: a, tingkatan });
    } else if (section === 'Batal') {
      out.batal.push({ tarikh, sasaran: a, sebab: b });
    } else throw new Error(`${at}: baris tarikh di luar "## Hari acara" atau "## Batal"`);
  });
  return out;
}

module.exports = { parseAcara };
