// Differences between the browser's rekod and a re-picked rekod file, lesson by lesson
// (keyed by date and first period). Line endings and header text are ignored.
import { parseRekod, periodRange } from '../../src/core/index.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const first = r => periodRange(r.periods)[0];
const key = r => `${r.date} ${String(first(r)).padStart(2, '0')}`;
const view = r => ({ status: r.status, sp: r.sp.join(', '), attendance: r.attendance, note: r.note });
const same = (a, b) => JSON.stringify(view(a)) === JSON.stringify(view(b));

function diffRekod(storedText, fileText, file) {
  const a = new Map(parseRekod(storedText, 'stored rekod').map(r => [key(r), r]));
  const b = new Map(parseRekod(fileText, file).map(r => [key(r), r]));
  const out = [];
  for (const k of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(k), y = b.get(k);
    if (x && y && same(x, y)) continue;
    const r = x || y;
    out.push({
      label: `M${r.week} ${DAYS[new Date(`${r.date}T00:00:00Z`).getUTCDay()]}`,
      stored: x ? view(x) : null,
      file: y ? view(y) : null,
    });
  }
  return out;
}

const diffSummary = d => `${d.length} ${d.length === 1 ? 'lesson differs' : 'lessons differ'}: ${d.map(x => x.label).join(', ')}`;

export { diffRekod, diffSummary };
