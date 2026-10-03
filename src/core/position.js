// A class's position against the frozen RPT (shown by the CLI only, never on an RPH).
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

function positionText(label, p) {
  if (p.status === 'finished') return `${label}: DSKP finished · revision`;
  if (p.status === 'notInRpt') return `${label}: SP ${p.sp} not in RPT`;
  const rpt = `RPT M${p.rptWeeks[0]}${p.rptWeeks[1] > p.rptWeeks[0] ? `–M${p.rptWeeks[1]}` : ''}`;
  const now = p.status === 'onTrack' ? 'on track' : `${p.weeks} week${p.weeks === 1 ? '' : 's'} ${p.status}`;
  return `${label}: SP ${p.sp} · ${rpt} · ${now}`;
}

// Minutes needed for the remaining SPs vs the PdP minutes scheduled (lessons) until the RPT's last week
function fit({ sp, spTime, end, lessons }) {
  let need = 0;
  for (let i = end.idx; i < sp.length; i++)
    need += i === end.idx && end.remaining != null ? end.remaining : spTime.get(sp[i].code) || 0;
  return { need, have: lessons.reduce((a, l) => a + l.minutes, 0) };
}

// One summary line + "does not fit" warning for a class × subject at the start of the requested week
function classSummary({ cls, rows, sp, rpt, spTime, weeklyPdp, calendar, versions, events, classes, week }) {
  const w = calendar.weeks.find(x => x.n === week);
  const weekly = weeklyMinutes(versionFor(versions, w.days[0].date), cls.classCode, cls.subject);
  const label = `${cls.classCode} ${cls.subject}`;
  if (!sp.length) return { text: `${label}: no DSKP`, warnings: [] };
  const before = rows.filter(r => r.week < week);
  const { end } = planRows({ rows: before, sp, spTime: rpt ? spTime : null, start: cls.start });
  if (!rpt) return { text: `${label}: ${end.finished ? 'DSKP finished' : `SP ${sp[end.idx].code}`} · no RPT`, warnings: [] };
  const text = positionText(label, position({ rpt, calendar, form: cls.form, sp, end, spTime, weeklyPdp, weekly, week }));
  if (end.finished) return { text, warnings: [] };
  const lessons = [];
  for (let n = week; n <= rpt.end; n++)
    lessons.push(...lessonsForWeek({ calendar, versions, classes, events, week: n })
      .filter(l => l.classCode === cls.classCode && l.subject === cls.subject && l.kind === 'pdp'));
  const f = fit({ sp, spTime, end, lessons });
  const warnings = f.need > f.have + 30 // one period: the 15-minute rule can add a little time
    ? [`${label}: needs ${Math.round(f.need)} min for the remaining SPs, has ${f.have} min until M${rpt.end}; consider combining SPs`]
    : [];
  return { text, warnings };
}

export { position, positionText, fit, classSummary };
