// English wording of a ClassSummary (src/core/position.js) for the badges and the Classes dashboard
const titleCase = s => s.toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase());
const classLabel = s => `${s.classCode} ${titleCase(s.subjectName)}`;
const weeksText = n => `${n} week${n === 1 ? '' : 's'}`;

function positionWords(s) {
  if (!s.hasDskp) return { text: 'No DSKP', tone: 'none' };
  if (!s.hasRpt) return { text: 'No RPT', tone: 'none' };
  const p = s.position;
  if (p.status === 'finished') return { text: 'DSKP finished · revision', tone: 'ok' };
  if (p.status === 'notInRpt') return { text: `SP ${p.sp} not in RPT`, tone: 'warn' };
  if (p.status === 'onTrack') return { text: 'On track', tone: 'ok' };
  if (p.status === 'ahead') return { text: `${weeksText(p.weeks)} ahead`, tone: 'ahead' };
  return { text: `${weeksText(p.weeks)} behind`, tone: p.weeks >= 2 ? 'bad' : 'warn' };
}

function rptWeeksWords(s) {
  const w = s.position && s.position.rptWeeks;
  if (!w) return '';
  return w[1] > w[0] ? `M${w[0]}–M${w[1]}` : `M${w[0]}`;
}

const percentDone = s => (s.spTotal ? Math.round((s.spDone / s.spTotal) * 100) : 0);

function fitWords(s) {
  if (!s.fit) return null;
  const n = x => Math.round(x).toLocaleString('en-US');
  return `${classLabel(s)}: needs ${n(s.fit.need)} min for the remaining SPs, has ${n(s.fit.have)} min until M${s.fit.endWeek} — consider combining SPs`;
}

export { classLabel, positionWords, rptWeeksWords, percentDone, fitWords };
