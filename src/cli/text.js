// English wording of a ClassSummary for the CLI (the app words it in app/logic/words.js)
function positionText(p) {
  if (p.status === 'finished') return 'DSKP finished · revision';
  if (p.status === 'notInRpt') return `SP ${p.sp} not in RPT`;
  const rpt = `RPT M${p.rptWeeks[0]}${p.rptWeeks[1] > p.rptWeeks[0] ? `–M${p.rptWeeks[1]}` : ''}`;
  const now = p.status === 'onTrack' ? 'on track' : `${p.weeks} week${p.weeks === 1 ? '' : 's'} ${p.status}`;
  return `SP ${p.sp} · ${rpt} · ${now}`;
}

function summaryLine(s) {
  const label = `${s.classCode} ${s.subject}`;
  if (!s.hasDskp) return `${label}: no DSKP`;
  if (!s.hasRpt) return `${label}: ${s.finished ? 'DSKP finished' : `SP ${s.currentSp}`} · no RPT`;
  return `${label}: ${positionText(s.position)}`;
}

function fitWarning(s) {
  if (!s.fit) return null;
  return `${s.classCode} ${s.subject}: needs ${Math.round(s.fit.need)} min for the remaining SPs, has ${s.fit.have} min until M${s.fit.endWeek}; consider combining SPs`;
}

export { summaryLine, fitWarning };
