// rekod-<class>-<subject>.md -> [PdP row]
// Written by src/cli/rph.js, edited by the teacher after teaching. Only table rows are read.
//   SP:        codes in the cell in order (n.n.n), or a topic code n.0 = revision
//   Status:    diajar / ditunda / batal (any case); blank for exams
//   Kehadiran: the first number is read ('33/35' -> 33)
import { cells, periodRange, periodMinutes } from '../util.js';

const KINDS = ['pdp', 'tutorial', 'peperiksaan'];
const STATUSES = ['diajar', 'ditunda', 'batal'];
const COLUMNS = 11;

const spCodes = s => String(s).match(/\b\d+\.\d+\.\d+\b|\b\d+\.0\b/g) || [];

function parseRekod(md, file = 'rekod') {
  const rows = [];
  md.split(/\r?\n/).forEach((line, i) => {
    if (!/^\| *M\d+ *\|/.test(line)) return;
    const at = `${file}:${i + 1}`;
    const c = cells(line);
    if (c.length !== COLUMNS) throw new Error(`${at}: needs ${COLUMNS} columns, has ${c.length}`);
    const [w, date, dayName, periodsText, time, kindText, event, sp, statusText, attended, note] = c;
    const kind = kindText.toLowerCase(), status = statusText.toLowerCase();
    if (!/^\d{4}-\d\d-\d\d$/.test(date)) throw new Error(`${at}: Tarikh "${date}" is not yyyy-mm-dd`);
    if (!KINDS.includes(kind)) throw new Error(`${at}: Jenis "${kindText}" not recognised (${KINDS.join(' / ')})`);
    if (status && !STATUSES.includes(status)) throw new Error(`${at}: Status "${statusText}" not recognised (${STATUSES.join(' / ')})`);
    let p;
    try { p = periodRange(periodsText); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    const codes = spCodes(sp);
    if (codes.some(k => /\.0$/.test(k)) && codes.some(k => !/\.0$/.test(k)))
      throw new Error(`${at}: do not mix revision topic codes and SP codes in one row ("${sp}")`);
    const a = attended.match(/^\d+/);
    rows.push({
      week: Number(w.trim().slice(1)), date, dayName, periods: periodsText, time, minutes: periodMinutes(p), kind, event,
      sp: codes, status, attendance: a ? Number(a[0]) : null, note, line: i + 1,
    });
  });
  return rows;
}

export { parseRekod, spCodes, KINDS, STATUSES };
