// Timetable.md (aSc) -> { effectiveFrom, slots: [{ dayName, periods: [a, b], time, subject, classCode, room }] }
// Only the table under '## Kelas' is read; one row = one PdP.
// '## Bukan kelas' (mark B and others) is not PdP and is ignored.
import { stripBom, cells, WEEKDAYS, periodRange, periodTime } from '../util.js';

function parseTimetable(md, file = 'timetable') {
  md = stripBom(md);
  const bk = md.match(/^- Berkuat kuasa: (\d{4}-\d\d-\d\d)/m);
  if (!bk) throw new Error(`${file}: missing line "- Berkuat kuasa: yyyy-mm-dd"`);
  const slots = [];
  let section = '';
  md.split(/\r?\n/).forEach((line, i) => {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); return; }
    if (section !== 'Kelas' || !/^\|/.test(line) || /^\| *(Hari|-)/.test(line)) return;
    const at = `${file}:${i + 1}`;
    const c = cells(line);
    if (c.length !== 6) throw new Error(`${at}: needs 6 columns (Hari, Waktu, Masa, Subjek, Kelas, Bilik), has ${c.length}`);
    const [dayName, p, time, subject, classCode, room] = c;
    if (!WEEKDAYS.includes(dayName)) throw new Error(`${at}: invalid day "${dayName}"`);
    let periods;
    try { periods = periodRange(p); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    if (time !== periodTime(periods)) throw new Error(`${at}: Masa "${time}" does not match Waktu ${p} (${periodTime(periods)})`);
    if (!subject || !classCode) throw new Error(`${at}: Subjek or Kelas is empty`);
    slots.push({ dayName, periods, time, subject, classCode, room });
  });
  if (!slots.length) throw new Error(`${file}: no slots under "## Kelas"`);
  return { effectiveFrom: bk[1], slots };
}

export { parseTimetable };
