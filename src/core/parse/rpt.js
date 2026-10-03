// RPT.md (hasil src/cli/rpt.js) -> { tamat, minggu: [{ n, sp: [kod] }], peruntukan: Map(kod -> minggu) }
// RPT ialah salinan beku: penjana RPH membaca fail ini, bukan menjana RPT semula.
const SP_DALAM_SEL = /(?:\| |<br>)(\d+\.\d+\.\d+) /g;

function parseRpt(md, fail = 'rpt') {
  const t = md.match(/^- Sukatan tamat: M(\d+)/m);
  if (!t) throw new Error(`${fail}: tiada baris "- Sukatan tamat: M…"`);
  const minggu = [], peruntukan = new Map();
  let section = '';
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); continue; }
    let m;
    if (section === 'Rancangan' && (m = line.match(/^\| M(\d+) \|/)))
      minggu.push({ n: Number(m[1]), sp: [...line.matchAll(SP_DALAM_SEL)].map(x => x[1]) });
    else if (section === 'Peruntukan SP' && (m = line.match(/^\| (\d+\.\d+\.\d+) \| ([\d.]+) \|/)))
      peruntukan.set(m[1], Number(m[2]));
  }
  if (!peruntukan.size) throw new Error(`${fail}: tiada jadual "## Peruntukan SP"; jana semula RPT dengan src/cli/rpt.js`);
  return { tamat: Number(t[1]), minggu, peruntukan };
}

module.exports = { parseRpt };
