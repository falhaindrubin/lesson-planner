// RPT.md (output of src/cli/rpt.js) -> { end, weeks: [{ n, sp: [code] }], allocation: Map(code -> weeks) }
// The RPT is a frozen copy: the RPH generator reads this file, it does not plan the RPT again.
const SP_IN_CELL = /(?:\| |<br>)(\d+\.\d+\.\d+) /g;

function parseRpt(md, file = 'rpt') {
  const t = md.match(/^- Sukatan tamat: M(\d+)/m);
  if (!t) throw new Error(`${file}: missing line "- Sukatan tamat: M…"`);
  const weeks = [], allocation = new Map();
  let section = '';
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); continue; }
    let m;
    if (section === 'Rancangan' && (m = line.match(/^\| M(\d+) \|/)))
      weeks.push({ n: Number(m[1]), sp: [...line.matchAll(SP_IN_CELL)].map(x => x[1]) });
    else if (section === 'Peruntukan SP' && (m = line.match(/^\| (\d+\.\d+\.\d+) \| ([\d.]+) \|/)))
      allocation.set(m[1], Number(m[2]));
  }
  if (!allocation.size) throw new Error(`${file}: no "## Peruntukan SP" table; generate the RPT again with src/cli/rpt.js`);
  return { end: Number(t[1]), weeks, allocation };
}

export { parseRpt };
