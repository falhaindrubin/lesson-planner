// RPH planner: fill in the SP of new rekod rows (isNew: true) and work out where the class stands.
// Time of each SP (minutes) comes from spTime (src/core/sp-time.js): the class's real minutes in the
// RPT weeks where the SP sits. Without an RPT (spTime null): one SP per PdP.
// SPs are taught in DSKP order: light SPs share one PdP, heavy SPs span several PdP
// (written normally on every PdP — there is no "continued" mark).
//   - a taught PdP: its minutes go to the SPs in the cell in order; all but the last are
//     finished; the last takes the remainder and is finished if less than MIN_REMAINDER minutes are left.
//   - ditunda / batal / peperiksaan / tutorial: no time is used.
//   - a new tutorial: repeats the SPs of the last taught PdP.
//   - DSKP finished: revision by topic, one topic per PdP (topic code, e.g. 1.0).
//   - Without an RPT: one SP per PdP; every SP in a taught row counts as finished.
const MIN_REMAINDER = 15;

const isTopicCode = k => /\.0$/.test(k);

function planRows({ rows, sp, spTime = null, start = '', file = 'rekod' }) {
  const index = new Map(sp.map((s, i) => [s.code, i]));
  const topics = [...new Set(sp.map(s => s.topic.code))];
  const warnings = [];
  let idx = start ? index.get(start) : 0;
  if (idx == null) throw new Error(`${file}: SP Mula ${start} is not in the DSKP`);
  let remaining = null;   // minutes left for sp[idx]; null = not started
  let revisions = 0;      // revision PdP so far
  let lastTaught = [];    // SPs of the last taught PdP (for tutorials)

  const needed = (i, r) => {
    if (!spTime) return r.minutes;
    const m = spTime.get(sp[i].code);
    if (m == null) { warnings.push(`SP ${sp[i].code} is not in Peruntukan SP; using ${r.minutes} min`); return r.minutes; }
    return m;
  };
  const left = (i, r) => (i === idx && remaining != null ? remaining : needed(i, r));

  // SPs for a new PdP, starting from the current position (does not change state)
  function generate(r) {
    if (idx >= sp.length) return [topics[revisions % topics.length]];
    const out = [];
    let have = r.minutes, i = idx, s = left(idx, r);
    for (;;) {
      out.push(sp[i].code);
      if (s - have >= MIN_REMAINDER) break; // this SP continues into the next PdP
      have -= s;
      i++;
      if (i >= sp.length || have < MIN_REMAINDER) break;
      s = needed(i, r);
    }
    return out;
  }

  // Update the state from one taught PdP (new, or existing / edited by the teacher)
  function use(r) {
    const codes = r.sp;
    if (!codes.length) return;
    if (isTopicCode(codes[0])) {
      for (const k of codes) if (!topics.includes(k)) throw new Error(`${file}:${r.line}: topic ${k} is not in the DSKP`);
      revisions += codes.length;
      lastTaught = codes;
      return;
    }
    const is = codes.map(k => {
      const i = index.get(k);
      if (i == null) throw new Error(`${file}:${r.line}: SP ${k} is not in the DSKP`);
      return i;
    });
    const last = is[is.length - 1];
    lastTaught = codes;
    // Without an RPT no SP spans PdP: every SP in the row is finished
    if (!spTime) { idx = last + 1; remaining = null; return; }
    let have = r.minutes;
    for (const i of is.slice(0, -1)) have -= left(i, r);
    const s = left(last, r) - Math.max(0, have);
    if (s < MIN_REMAINDER) { idx = last + 1; remaining = null; } else { idx = last; remaining = s; }
  }

  const out = rows.map(r0 => {
    const r = { ...r0 };
    if (r.isNew) {
      if (r.kind === 'pdp') r.sp = sp.length ? generate(r) : [];
      else if (r.kind === 'tutorial') r.sp = [...lastTaught];
      else r.sp = [];
    }
    if (r.kind === 'pdp' && r.status === 'diajar' && sp.length) use(r);
    return r;
  });
  return { rows: out, warnings: [...new Set(warnings)], end: { idx, remaining, revisions, finished: idx >= sp.length } };
}

export { MIN_REMAINDER, planRows };
