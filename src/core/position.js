// A class's position against the frozen RPT (the CLI and the app word it themselves; never printed on an RPH).
// Gap = (content minutes of the SPs already taught − PdP minutes scheduled in the PdP weeks
// before the requested week) ÷ the class's weekly minutes. A gap under 0.5 week = on track;
// otherwise rounded to weeks ahead / behind. Measured in minutes so that a partial week
// (e.g. M20: two holidays) does not blow up a small gap.
import { weekFor } from './calendar.js';
import { lessonsForWeek } from './scheduler.js';
import { planRows } from './rph-planner.js';
import { versionFor, weeklyMinutes } from './timetable.js';

function position({ rpt, calendar, form, sp, end, spTime, weeklyPdp, weekly, week }) {
  if (end.finished) return { status: 'finished' };
  const code = sp[end.idx].code;
  const span = rpt.weeks.filter(w => w.sp.includes(code)).map(w => w.n);
  if (!span.length) return { status: 'notInRpt', sp: code };
  let taught = 0;
  for (let i = 0; i < end.idx; i++) taught += spTime.get(sp[i].code) || 0;
  if (end.remaining != null) taught += (spTime.get(code) || 0) - end.remaining;
  const expected = calendar.weeks.filter(w => w.n < week && weekFor(w, form).pdp > 0).reduce((a, w) => a + weeklyPdp(w.n), 0);
  const gap = weekly ? (taught - expected) / weekly : 0;
  const status = Math.abs(gap) < 0.5 ? 'onTrack' : gap > 0 ? 'ahead' : 'behind';
  return { status, sp: code, rptWeeks: [Math.min(...span), Math.max(...span)], weeks: status === 'onTrack' ? 0 : Math.round(Math.abs(gap)) };
}

// Minutes needed for the remaining SPs vs the PdP minutes scheduled (lessons) until the RPT's last week
function fit({ sp, spTime, end, lessons }) {
  let need = 0;
  for (let i = end.idx; i < sp.length; i++)
    need += i === end.idx && end.remaining != null ? end.remaining : spTime.get(sp[i].code) || 0;
  return { need, have: lessons.reduce((a, l) => a + l.minutes, 0) };
}

// Position of one class × subject at the start of the requested week, as numbers.
// The CLI and the app word it themselves (never printed on an RPH).
function classSummary({ cls, rows, sp, rpt, spTime, weeklyPdp, calendar, versions, events, classes, week }) {
  const w = calendar.weeks.find(x => x.n === week);
  const base = {
    classCode: cls.classCode, subject: cls.subject, subjectName: cls.subjectName,
    hasDskp: sp.length > 0, hasRpt: !!rpt, spTotal: sp.length, spDone: 0, currentSp: null,
    finished: false, rptEnd: rpt ? rpt.end : null, position: null, fit: null,
  };
  if (!sp.length) return base;
  const { end } = planRows({ rows: rows.filter(r => r.week < week), sp, spTime: rpt ? spTime : null, start: cls.start });
  Object.assign(base, { spDone: end.finished ? sp.length : end.idx, currentSp: end.finished ? null : sp[end.idx].code, finished: end.finished });
  if (!rpt) return base;
  const weekly = weeklyMinutes(versionFor(versions, w.days[0].date), cls.classCode, cls.subject);
  base.position = position({ rpt, calendar, form: cls.form, sp, end, spTime, weeklyPdp, weekly, week });
  if (end.finished) return base;
  const lessons = [];
  for (let n = week; n <= rpt.end; n++)
    lessons.push(...lessonsForWeek({ calendar, versions, classes, events, week: n })
      .filter(l => l.classCode === cls.classCode && l.subject === cls.subject && l.kind === 'pdp'));
  const f = fit({ sp, spTime, end, lessons });
  // One period of slack: the 15-minute rule can add a little time
  if (f.need > f.have + 30) base.fit = { need: f.need, have: f.have, endWeek: rpt.end };
  return base;
}

export { position, fit, classSummary };
