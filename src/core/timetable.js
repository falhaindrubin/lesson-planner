// Timetable resolver: the timetable version in force on a date.
// A timetable change = a new file with its own effective date; old dates are never changed.
import { periodMinutes } from './util.js';

// The latest version with effectiveFrom <= date
function versionFor(versions, date) {
  let best = null;
  for (const v of versions) if (v.effectiveFrom <= date && (!best || v.effectiveFrom > best.effectiveFrom)) best = v;
  if (!best) throw new Error(`No timetable in force on ${date}`);
  return best;
}

// PdP minutes per week for a class × subject in one version (tutorial slots do not count)
function weeklyMinutes(version, classCode, subject) {
  return version.slots
    .filter(s => s.classCode === classCode && s.subject === subject)
    .reduce((a, s) => a + periodMinutes(s.periods), 0);
}

export { versionFor, weeklyMinutes };
