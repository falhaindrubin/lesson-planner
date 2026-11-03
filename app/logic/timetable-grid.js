// Weekly timetable for the Today screen: one row per school day on a time axis of periods.
// Each slot is one block from its first period to its last; times on the axis sit on the period
// boundaries (7:00, 7:30 ... 14:00), so a block's edges line up with its real start and end.
import { WEEKDAYS, periodStart } from '../../src/core/util.js';

// 24-hour clock without a leading zero: 450 -> '7:30', 840 -> '14:00'
const clock = min => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

// A timetable time range in the aSc 12-hour style ('12:30–2:00'; school hours below 6 are afternoon)
// -> 24-hour ('12:30–14:00')
const toMinutes = t => { const [h, m] = t.split(':').map(Number); return (h < 6 ? h + 12 : h) * 60 + m; };
const time24 = range => String(range).split('–').map(t => clock(toMinutes(t.trim()))).join('–');

// '2026-11-03' -> 'Selasa' (Saturday and Sunday -> '')
function dayNameOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5 ? WEEKDAYS[d - 1] : '';
}

// version: parseTimetable() result ->
// { first, last, periods: [n], marks: [{ col, time }], days: [{ name, today, blocks: [{ col, span, start, end, from, to, slot }] }] }
// col is 1-based within the period columns; marks has one more entry than periods (the end of the last period).
function timetableGrid(version, today) {
  const slots = version.slots;
  const first = Math.min(...slots.map(s => s.periods[0]));
  const last = Math.max(...slots.map(s => s.periods[1]));
  const todayName = dayNameOf(today);
  const periods = [];
  for (let n = first; n <= last; n++) periods.push(n);
  const marks = [];
  for (let n = first; n <= last + 1; n++) marks.push({ col: n - first + 1, time: clock(periodStart(n)) });
  const days = WEEKDAYS.map(name => ({
    name,
    today: name === todayName,
    blocks: slots.filter(s => s.dayName === name).sort((a, b) => a.periods[0] - b.periods[0]).map(s => ({
      col: s.periods[0] - first + 1,
      span: s.periods[1] - s.periods[0] + 1,
      start: periodStart(s.periods[0]), end: periodStart(s.periods[1] + 1),
      from: clock(periodStart(s.periods[0])), to: clock(periodStart(s.periods[1] + 1)),
      slot: s,
    })),
  }));
  return { first, last, periods, marks, days };
}

export { clock, time24, dayNameOf, timetableGrid };
