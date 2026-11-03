// The week bar's jump panel: the takwim weeks grouped by the month they start in, one row per month
const fmt = (iso, o) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });

function rangeText(from, to) {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `${fmt(from, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })}–${fmt(to, { day: 'numeric', month: 'short' })}`;
}

// One week -> { n, dates: "23–27 Mar", holiday: every day a holiday, today: this week }
function weekChip(w, todayWeek) {
  const d = w.days;
  return {
    n: w.n,
    dates: d.length ? rangeText(d[0].date, d[d.length - 1].date) : '',
    holiday: d.length > 0 && d.every(x => x.holiday),
    today: w.n === todayWeek,
  };
}

// weeks: [{ n, days: [{ date, holiday }] }] (buildCalendar) -> [{ month: "Jan", weeks: [chip] }]
function weekGroups(weeks, todayWeek) {
  const out = [];
  for (const w of weeks) {
    const month = w.days.length ? fmt(w.days[0].date, { month: 'short' }) : '';
    const last = out[out.length - 1];
    if (last && last.month === month) last.weeks.push(weekChip(w, todayWeek));
    else out.push({ month, weeks: [weekChip(w, todayWeek)] });
  }
  return out;
}

export { weekChip, weekGroups };
