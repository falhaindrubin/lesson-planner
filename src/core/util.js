// Small helpers shared by the parsers, calendar and renderers. No I/O.

// Month and weekday names are file content (Malay), so the values stay Malay
const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const WEEKDAYS = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];

// Windows Notepad may save UTF-8 with a byte-order mark; it would break the first line's match
const stripBom = s => String(s).replace(/^﻿/, '');

// '| a | b |' -> ['a', 'b']
function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
function fmtDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
function fmtRange(a, b) {
  const [, ma] = a.split('-'), [, mb] = b.split('-');
  return ma === mb ? `${Number(a.slice(8))}–${fmtDate(b)}` : `${fmtDate(a)} – ${fmtDate(b)}`;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Timetable periods: 30 minutes each, period 0 starts at 6:30.
// '2–3' -> [2, 3]; '9' -> [9, 9] (a plain hyphen is accepted too)
function periodRange(s) {
  const m = String(s).trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
  const a = m && Number(m[1]), b = m && (m[2] != null ? Number(m[2]) : a);
  if (!m || b < a) throw new Error(`Invalid period: "${s}"`);
  return [a, b];
}
const fmtPeriods = ([a, b]) => (a === b ? String(a) : `${a}–${b}`);
const periodStart = p => 6 * 60 + 30 + 30 * p; // minutes after midnight
const periodMinutes = ([a, b]) => (b - a + 1) * 30;
// 12-hour clock as printed by aSc (1:00 = 13:00) and 24-hour clock as on the RPH (0800)
const clock12 = min => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')}`;
const clock24 = min => String(Math.floor(min / 60)).padStart(2, '0') + String(min % 60).padStart(2, '0');
const periodTime = ([a, b]) => `${clock12(periodStart(a))}–${clock12(periodStart(b + 1))}`;
// '2026-10-05' -> '05/10/2026'
const fmtDateDmy = iso => iso.split('-').reverse().join('/');

export {
  MONTHS, WEEKDAYS, stripBom, cells, daysBetween, fmtDate, fmtRange, range,
  periodRange, fmtPeriods, periodStart, periodMinutes, clock12, clock24, periodTime, fmtDateDmy,
};
