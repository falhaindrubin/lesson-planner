// Scheduler: one takwim week -> the PdP lessons of every class × subject in the class file.
//   holiday for that form, or Batal -> no PdP
//   exam for that form              -> kind 'peperiksaan', event = the exam's name
//   event day                       -> normal PdP, event = the event's name (the teacher decides)
// A slot with the class's Tutorial code -> kind 'tutorial' for that class's subject.
// Class × subject slots missing from the class file are not planned (e.g. planning one subject only).
import { dayClass } from './calendar.js';
import { versionFor } from './timetable.js';
import { fmtPeriods, periodMinutes, periodRange } from './util.js';

const byTime = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : periodRange(a.periods)[0] - periodRange(b.periods)[0]);

const isCancelled = (c, date, cls) => c.date === date && (!c.target || c.target === String(cls.form) || c.target === cls.classCode);

const inClassFile = (classes, s) => classes.find(x => x.classCode === s.classCode && (x.subject === s.subject || (x.tutorial && x.tutorial === s.subject)));

function lessonsForWeek({ calendar, versions, classes, events, week, pickVersion = versionFor }) {
  const w = calendar.weeks.find(x => x.n === week);
  if (!w) throw new Error(`No week M${week} in the takwim`);
  const out = [];
  for (const d of w.days) {
    const v = pickVersion(versions, d.date);
    for (const s of v.slots.filter(x => x.dayName === d.dayName)) {
      const cls = inClassFile(classes, s);
      if (!cls) continue; // class × subject not in the class file: not planned (see unplannedSlots)
      const dayKind = dayClass(d, cls.form);
      if (dayKind === 'holiday' || events.cancellations.some(c => isCancelled(c, d.date, cls))) continue;
      const exam = dayKind === 'exam' ? d.exams.filter(e => e.forms.includes(cls.form)).map(e => e.name) : [];
      const ev = events.eventDays.filter(a => a.date === d.date && (!a.forms.length || a.forms.includes(cls.form))).map(a => a.name);
      out.push({
        week, date: d.date, dayName: d.dayName, classCode: cls.classCode, subject: cls.subject,
        periods: fmtPeriods(s.periods), time: s.time, minutes: periodMinutes(s.periods),
        kind: exam.length ? 'peperiksaan' : s.subject === cls.subject ? 'pdp' : 'tutorial',
        event: [...exam, ...ev].join('; '),
      });
    }
  }
  return out.sort(byTime);
}

// Timetable slots with no row in the class file -> ['ASK 1S', ...] (for the CLI note)
function unplannedSlots(versions, classes) {
  const out = new Set();
  for (const v of versions)
    for (const s of v.slots)
      if (!inClassFile(classes, s)) out.add(`${s.subject} ${s.classCode}`);
  return [...out];
}

export { lessonsForWeek, byTime, unplannedSlots };
