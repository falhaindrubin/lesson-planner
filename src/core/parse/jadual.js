// Jadual.md (aSc) -> { berkuatKuasa, slots: [{ hari, waktu: [a, b], masa, subjek, kelas, bilik }] }
// Hanya jadual di bawah '## Kelas' dibaca; satu baris = satu PdP.
// '## Bukan kelas' (tanda B dan lain-lain) bukan PdP dan diabaikan.
const { cells, HARI_BEKERJA, waktuRange, masaWaktu } = require('../util');

function parseJadual(md, fail = 'jadual') {
  const bk = md.match(/^- Berkuat kuasa: (\d{4}-\d\d-\d\d)/m);
  if (!bk) throw new Error(`${fail}: tiada baris "- Berkuat kuasa: yyyy-mm-dd"`);
  const slots = [];
  let section = '';
  md.split(/\r?\n/).forEach((line, i) => {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); return; }
    if (section !== 'Kelas' || !/^\|/.test(line) || /^\| *(Hari|-)/.test(line)) return;
    const at = `${fail}:${i + 1}`;
    const c = cells(line);
    if (c.length !== 6) throw new Error(`${at}: perlu 6 lajur (Hari, Waktu, Masa, Subjek, Kelas, Bilik), ada ${c.length}`);
    const [hari, w, masa, subjek, kelas, bilik] = c;
    if (!HARI_BEKERJA.includes(hari)) throw new Error(`${at}: hari tidak sah "${hari}"`);
    let waktu;
    try { waktu = waktuRange(w); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    if (masa !== masaWaktu(waktu)) throw new Error(`${at}: Masa "${masa}" tidak sepadan dengan Waktu ${w} (${masaWaktu(waktu)})`);
    if (!subjek || !kelas) throw new Error(`${at}: Subjek atau Kelas kosong`);
    slots.push({ hari, waktu, masa, subjek, kelas, bilik });
  });
  if (!slots.length) throw new Error(`${fail}: tiada slot di bawah "## Kelas"`);
  return { berkuatKuasa: bk[1], slots };
}

module.exports = { parseJadual };
