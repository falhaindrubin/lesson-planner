// Takwim.md -> { weeks: [{ n, start, days }], gaps: [day] }
// Working days only, column text kept raw: { date, dayName, holiday, curriculum }.
// gaps = working days outside the school weeks (term breaks).
// Classifying days (holiday / exam) is done by calendar.js, not here.
import { cells, daysBetween, WEEKDAYS } from '../util.js';

function parseTakwim(md) {
  const weeks = [];
  const gaps = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\| *(M\d+)? *\| *\d{4}-\d\d-\d\d/.test(line)) continue;
    const [week, date, dayName, holiday, , curriculum] = cells(line);
    if (week) weeks.push((cur = { n: Number(week.slice(1)), start: date, days: [] }));
    if (!WEEKDAYS.includes(dayName)) continue;
    const inWeek = cur && daysBetween(cur.start, date) < 5;
    (inWeek ? cur.days : gaps).push({ date, dayName, holiday, curriculum });
  }
  return { weeks, gaps };
}

export { parseTakwim };
