// aktiviti-*.md -> { permulaan: [teks], perkembangan: [teks], penutup: [teks] }
// Senarai '- ' di bawah '## Permulaan', '## Perkembangan', '## Penutup'. Masa dikira oleh renderer RPH.
const BAHAGIAN = ['Permulaan', 'Perkembangan', 'Penutup'];

function parseAktiviti(md, fail = 'aktiviti') {
  const out = { permulaan: [], perkembangan: [], penutup: [] };
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { cur = BAHAGIAN.includes(h[1].trim()) ? h[1].trim().toLowerCase() : null; continue; }
    const m = line.match(/^- (.+)/);
    if (m && cur) out[cur].push(m[1].trim());
  }
  for (const b of BAHAGIAN) if (!out[b.toLowerCase()].length) throw new Error(`${fail}: tiada senarai "- …" di bawah "## ${b}"`);
  return out;
}

export { parseAktiviti };
