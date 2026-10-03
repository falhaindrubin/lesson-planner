// Differences between the browser's rekod and a re-picked rekod file, lesson by lesson
// (keyed by date and first period). Line endings and header text are ignored.
import { parseRekod, periodRange, isEdited } from '../../src/core/index.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const first = r => periodRange(r.periods)[0];
const key = r => `${r.date} ${String(first(r)).padStart(2, '0')}`;
const view = r => ({ status: r.status, sp: r.sp.join(', '), attendance: r.attendance, note: r.note });
const same = (a, b) => JSON.stringify(view(a)) === JSON.stringify(view(b));

// With `today`, rows after today that the teacher has not edited are rebuilt by runWeek on every run, so
// they are not differences: such a row present on one side only is skipped, and when both sides have it only
// Status and Catatan are compared (SP and attendance of a future row are rebuilt).
const sameFuture = (a, b) => a.status === b.status && a.note === b.note;

function diffRekod(storedText, fileText, file, today) {
  const a = new Map(parseRekod(storedText, 'stored rekod').map(r => [key(r), r]));
  const b = new Map(parseRekod(fileText, file).map(r => [key(r), r]));
  const out = [];
  for (const k of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(k), y = b.get(k);
    const future = today && (x || y).date > today;
    if (future && ((x && y) ? sameFuture(x, y) : !isEdited(x || y))) continue;
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
