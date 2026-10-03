// aktiviti-*.md -> { opening: [text], development: [text], closing: [text] }
// '- ' lists under '## Permulaan', '## Perkembangan', '## Penutup'. Times are worked out by the RPH renderer.
import { stripBom } from '../util.js';
const SECTIONS = [['Permulaan', 'opening'], ['Perkembangan', 'development'], ['Penutup', 'closing']];

function parseActivities(md, file = 'activities') {
  md = stripBom(md);
  const out = { opening: [], development: [], closing: [] };
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { cur = (SECTIONS.find(([heading]) => heading === h[1].trim()) || [])[1] || null; continue; }
    const m = line.match(/^- (.+)/);
    if (m && cur) out[cur].push(m[1].trim());
  }
  for (const [heading, key] of SECTIONS) if (!out[key].length) throw new Error(`${file}: no "- …" list under "## ${heading}"`);
  return out;
}

export { parseActivities };
