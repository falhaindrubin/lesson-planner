// Bring one class × subject's rekod up to the requested week.
//   - past rows (date <= today) and rows edited by the teacher: kept
//   - future rows not edited: rebuilt from the timetable, takwim, events and the rows before them
//   - weeks missing from the rekod up to the requested week: planned (taught, full attendance)
import { lessonsForWeek, byTime } from './scheduler.js';
import { planRows } from './rph-planner.js';
import { periodRange, range } from './util.js';

const keyOf = r => `${r.date} ${periodRange(r.periods)[0]}`;

// Edited by the teacher = Status or Catatan differs from the default. Attendance does not count:
// future PdP has not happened, and a changed Bil. murid must not lock generated rows.
function isEdited(r) {
  return r.status !== (r.kind === 'peperiksaan' ? '' : 'diajar') || r.note !== '';
}

function syncRekod({ rows, cls, classes, sp, spTime = null, calendar, versions, events, week, today, file = 'rekod' }) {
  const label = `${cls.classCode} ${cls.subject}`;
  if (!calendar.weeks.some(w => w.n === week)) throw new Error(`No week M${week} in the takwim`);
  if (cls.pupils == null) throw new Error(`${label}: Bil. murid is empty in the class file`);
  if (!versions.some(v => v.slots.some(s => s.classCode === cls.classCode && s.subject === cls.subject)))
    throw new Error(`${label}: no slot in the timetable (check Kelas and Subjek in the class file)`);
  // The week in the rekod must match the Tarikh according to the takwim; a typo stops the planning
  for (const r of rows) {
    const w = calendar.weeks.find(x => x.days.some(d => d.date === r.date));
    if (!w) throw new Error(`${file}:${r.line}: Tarikh ${r.date} is not a day in a school week`);
    if (w.n !== r.week) throw new Error(`${file}:${r.line}: Minggu M${r.week} does not match Tarikh ${r.date} (M${w.n})`);
  }
  const warnings = [];
  // A hand-blanked Status on a lesson counts as not taught; say so instead of staying silent
  for (const r of rows)
    if (r.line && r.kind !== 'peperiksaan' && r.status === '') warnings.push(`${file}:${r.line}: Status blank, counted as not taught`);
  if (!rows.length && sp.length && !cls.start) throw new Error(`${label}: rekod is empty and Mula is missing in the class file`);
  const kept = rows.filter(r => r.date <= today || isEdited(r));
  const lastWeek = rows.length ? Math.max(...rows.map(r => r.week)) : null;
  const ahead = rows.filter(r => r.date > today).map(r => r.week);
  const from = lastWeek == null ? week : Math.min(lastWeek + 1, ...ahead);
  const to = Math.max(week, lastWeek || 0);

  const have = new Set(kept.map(keyOf));
  const weeksInRekod = new Set(rows.map(r => r.week));
  const slots = new Set();
  const added = [];
  for (let n = from; n <= to; n++) {
    for (const l of lessonsForWeek({ calendar, versions, classes, events, week: n })) {
      if (l.classCode !== cls.classCode || l.subject !== cls.subject) continue;
      slots.add(keyOf(l));
      if (have.has(keyOf(l))) continue;
      if (l.date <= today && weeksInRekod.has(n)) continue; // a past PdP the teacher removed
      const exam = l.kind === 'peperiksaan';
      const { classCode: _c, subject: _s, ...r } = l;
      added.push({ ...r, sp: [], status: exam ? '' : 'diajar', attendance: exam ? null : cls.pupils, note: '', isNew: true });
    }
  }
  // Skipped weeks that have PdP (weeks that are all holiday do not count)
  const skipped = [...new Set(added.filter(r => lastWeek != null && r.week > lastWeek && r.week < week).map(r => r.week))];
  if (skipped.length) {
    const a = Math.min(...skipped), b = Math.max(...skipped);
    warnings.push(`${label}: M${a}${b > a ? `–M${b}` : ''} missing from the rekod; planned as well`);
  }
  for (const r of kept)
    if (r.date > today && r.week >= from && !slots.has(keyOf(r)))
      warnings.push(`${file}:${r.line}: ${r.date} period ${r.periods} is not in the timetable; row kept, please check`);
  if (!sp.length && added.some(r => r.kind !== 'peperiksaan')) warnings.push(`${label}: no DSKP; SP left blank`);

  const p = planRows({ rows: [...kept, ...added].sort(byTime), sp, spTime, start: cls.start, file });
  return {
    rows: p.rows.map(({ isNew: _n, line: _l, ...r }) => r),
    weeks: from <= to ? range(from, to) : [],
    warnings: [...warnings, ...p.warnings],
  };
}

export { syncRekod, isEdited };
