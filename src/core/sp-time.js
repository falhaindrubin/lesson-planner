// Time of each SP for one class (minutes), by the SP's place in the frozen RPT.
// An SP occupies the span [start, start + weeks] over the RPT's capacity weeks (weeks that hold SPs),
// in DSKP order. SP time = overlap with each week × the class's real PdP minutes in that week.
// Partial weeks (holiday, Batal) give less time, so an undisturbed class always follows the RPT;
// only PdP marked ditunda / batal in the rekod makes a class fall behind.
import { lessonsForWeek } from './scheduler.js';
import { versionFor } from './timetable.js';

function spTime({ rpt, sp, weeklyPdp }) {
  const weeks = rpt.weeks.filter(w => w.sp.length).map(w => w.n);
  const out = new Map();
  let pos = 0;
  for (const s of sp) {
    const w = rpt.allocation.get(s.code);
    if (w == null) continue;
    let m = 0;
    weeks.forEach((n, i) => {
      const o = Math.min(pos + w, i + 1) - Math.max(pos, i);
      if (o > 0) m += o * weeklyPdp(n);
    });
    out.set(s.code, m);
    pos += w;
  }
  return out;
}

// The class × subject's real PdP minutes in week n (without holidays, exams, Batal and tutorials).
// Weeks before the first timetable takes effect use the earliest timetable (usedFallback = true).
function weeklyPdpMinutes({ calendar, versions, cls, classes, events }) {
  const earliest = versions.reduce((a, v) => (!a || v.effectiveFrom < a.effectiveFrom ? v : a), null);
  const pickVersion = (vs, date) => {
    if (vs.some(v => v.effectiveFrom <= date)) return versionFor(vs, date);
    f.usedFallback = true;
    return earliest;
  };
  const cache = new Map();
  const f = n => {
    if (!cache.has(n))
      cache.set(n, lessonsForWeek({ calendar, versions, classes, events, week: n, pickVersion })
        .filter(l => l.classCode === cls.classCode && l.subject === cls.subject && l.kind === 'pdp')
        .reduce((a, l) => a + l.minutes, 0));
    return cache.get(n);
  };
  f.usedFallback = false;
  f.earliest = earliest && earliest.effectiveFrom;
  return f;
}

export { spTime, weeklyPdpMinutes };
