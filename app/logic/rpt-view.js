// RPT.md (output of src/cli/rpt.js) -> what the RPT tab shows: topic blocks and one row per week.
// Reads the two tables as written; the RPT is not planned again.
const cells = line => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const list = c => (c ? c.split('<br>').map(x => x.trim()).filter(Boolean) : []);

function parseRptView(md) {
  const topics = [], weeks = [];
  let section = '';
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); continue; }
    if (!line.startsWith('|')) continue;
    const c = cells(line);
    if (section === 'Ringkasan' && /^\d+\.\d+ /.test(c[0])) {
      const span = (c[4] || '').match(/M(\d+)/);
      topics.push({ name: c[0], sp: Number(c[1]), weeks: Number(c[3]), first: span ? Number(span[1]) : null, span: c[4] });
    } else if (section === 'Rancangan' && /^(M\d+)?$/.test(c[0]) && c.length >= 6 && c[1] && !/^-+$/.test(c[0])) {
      const off = /^\*\*(.+)\*\*$/.exec(c[2]);
      weeks.push({ n: c[0] ? Number(c[0].slice(1)) : null, dates: c[1], off: off ? off[1] : '', topics: list(c[2]), standards: list(c[3]), sp: list(c[4]), note: list(c[5]) });
    }
  }
  if (!weeks.length) throw new Error('no "## Rancangan" table found in this RPT');
  return { topics, weeks };
}

export { parseRptView };
