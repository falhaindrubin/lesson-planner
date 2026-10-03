// Calendar engine: classify every working day of the takwim for one form.
//   holiday — has Cuti / Perayaan text (except NOT_HOLIDAY): no PdP
//   exam    — an exam for that form in the Kurikulum column: no new PdP
//   pdp     — anything else (a meeting does not cancel PdP)
import { range } from './util.js';

// Cuti / Perayaan entries on working days that are NOT a holiday in Sabah
const NOT_HOLIDAY = [/HARI SARAWAK/i];

// An exam in the Kurikulum column -> the forms it concerns
function examForms(item) {
  let m;
  if ((m = item.match(/^PPT T(\d) *- *(\d)/i))) return range(+m[1], +m[2]);
  if (/^UBB/i.test(item)) return []; // UBBM/UBBI: language subjects only
  const f = [];
  if (/PAT TING\. ?4/i.test(item)) f.push(4);
  if (/UASA/i.test(item)) f.push(1, 2, 3);
  if (/PERCUBAAN SPM/i.test(item)) f.push(5);
  return f;
}

// Raw takwim -> calendar: every day { date, dayName, holiday ('' if not a holiday), exams: [{ name, forms }] }
function buildCalendar(takwim) {
  const day = d => ({
    date: d.date, dayName: d.dayName,
    holiday: d.holiday && !NOT_HOLIDAY.some(re => re.test(d.holiday)) ? d.holiday : '',
    exams: d.curriculum.split(';').map(s => s.trim()).filter(s => examForms(s).length)
      .map(s => ({ name: s, forms: examForms(s) })),
  });
  return {
    weeks: takwim.weeks.map(w => ({ n: w.n, start: w.start, days: w.days.map(day) })),
    gaps: takwim.gaps.map(day),
  };
}

// 'holiday' | 'exam' | 'pdp' for one day and form
function dayClass(d, form) {
  if (d.holiday) return 'holiday';
  return d.exams.some(e => e.forms.includes(form)) ? 'exam' : 'pdp';
}

// One week for a form -> { n, start, end, holidayDays: [day], examDays: [day], pdp: number of PdP days }
function weekFor(w, form) {
  const holidayDays = w.days.filter(d => dayClass(d, form) === 'holiday');
  const examDays = w.days.filter(d => dayClass(d, form) === 'exam');
  return {
    n: w.n, start: w.days[0].date, end: w.days[w.days.length - 1].date,
    holidayDays, examDays, pdp: w.days.length - holidayDays.length - examDays.length,
  };
}

// The form's exam blocks (consecutive weeks) -> [{ start, end, name }] (week numbers).
// First block = PPT, last block = final exam.
function examBlocks(calendar, form) {
  const blocks = [];
  for (const w of calendar.weeks) {
    const names = w.days.filter(d => dayClass(d, form) === 'exam')
      .flatMap(d => d.exams.filter(e => e.forms.includes(form)).map(e => e.name));
    if (!names.length) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.end === w.n - 1) last.end = w.n;
    else blocks.push({ start: w.n, end: w.n, name: names[0] });
  }
  return blocks;
}

// School breaks between two weeks -> [{ after: n, start, end, name }]
function breaks(calendar) {
  const out = [];
  for (const d of calendar.gaps) {
    const prev = [...calendar.weeks].reverse().find(w => w.days[0].date < d.date);
    if (!prev) continue;
    const last = out[out.length - 1];
    if (last && last.after === prev.n) last.end = d.date;
    else out.push({ after: prev.n, start: d.date, end: d.date, name: d.holiday.split(';')[0].trim() || 'CUTI' });
  }
  return out;
}

export { NOT_HOLIDAY, examForms, buildCalendar, dayClass, weekFor, examBlocks, breaks };
