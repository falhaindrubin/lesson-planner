// acara-<year>.md -> { eventDays: [{ date, name, forms: [n] }], cancellations: [{ date, target, reason }] }
// Hari acara: PdP is flagged (the teacher decides). Empty forms = all forms.
// Batal: no PdP at all. Empty target = everyone; '4' = Form 4; '4S' = class 4S.
import { stripBom, cells } from '../util.js';

function parseEvents(md, file = 'events') {
  md = stripBom(md);
  const out = { eventDays: [], cancellations: [] };
  let section = '';
  md.split(/\r?\n/).forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); return; }
    if (!/^\| *\d{4}-\d\d-\d\d *\|/.test(line)) return;
    const [date, a = '', b = ''] = cells(line);
    if (section === 'Hari acara') {
      const forms = b ? b.split(/[,\s]+/).filter(Boolean).map(Number) : [];
      if (forms.some(t => !(t >= 1 && t <= 5))) throw new Error(`${at}: Tingkatan "${b}" is not 1–5`);
      if (!a) throw new Error(`${at}: event name is empty`);
      out.eventDays.push({ date, name: a, forms });
    } else if (section === 'Batal') {
      out.cancellations.push({ date, target: a, reason: b });
    } else throw new Error(`${at}: date row outside "## Hari acara" or "## Batal"`);
  });
  return out;
}

export { parseEvents };
