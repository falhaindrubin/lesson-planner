// Apply the teacher's mark to one lesson in a rekod file's text. Only that row's Status,
// Kehadiran and Catatan cells change; runWeek then rebuilds the rest of the file.
import { cells, periodRange } from '../../src/core/index.js';
import { needsReason } from './status.js';

// '|' would break the table; a line break would break the row
const cell = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s*\r?\n\s*/g, ' ').trim();

function applyMark(text, { date, periods }, { status, attendance, note }) {
  if (needsReason(status) && !cell(note)) throw new Error('A reason is required for Postponed and Cancelled');
  const first = periodRange(periods)[0];
  let found = false;
  const out = text.split(/\r?\n/).map(line => {
    if (!/^\| *M\d+ *\|/.test(line)) return line;
    const c = cells(line);
    if (c[1] !== date || periodRange(c[3])[0] !== first) return line;
    found = true;
    c[8] = status;
    c[9] = attendance == null ? '' : String(attendance);
    c[10] = cell(note);
    return `| ${c.join(' | ')} |`;
  });
  if (!found) throw new Error(`No lesson on ${date} at period ${first} in this rekod`);
  return out.join('\n');
}

export { applyMark };
