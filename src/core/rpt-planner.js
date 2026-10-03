// RPT planner: spread the SPs over the takwim weeks for one form.
// Every week with at least one PdP day = 1 week (a full holiday / full exam week = 0).
// - The first half of the topics (rounded up) must be finished before the mid-year
//   exam (PPT); the other half after it.
// - Within each part, topics with fixed weeks take that capacity; the other topics
//   share the rest by SP difficulty.
// An SP is listed in every week it overlaps by at least MIN_OVERLAP weeks,
// or in its largest overlap week.
import { weekFor, examBlocks, breaks } from './calendar.js';

const MIN_OVERLAP = 0.2;
const REVISION_WEEKS = 2; // revision weeks before the final exam (for end 'final')

function plan({ sp, difficulty, calendar, form, end = 'final', revisionWeeks = REVISION_WEEKS }) {
  const warnings = [];
  const rated = sp.map(s => {
    const k = difficulty.sp.get(s.code);
    if (!k) warnings.push(`No difficulty for SP ${s.code}; using 2`);
    return { ...s, value: k ? k.value : 2, reason: k ? k.reason : '' };
  });
  for (const code of difficulty.sp.keys())
    if (!sp.some(s => s.code === code)) warnings.push(`Difficulty for SP ${code} is not in the DSKP`);
  for (const code of difficulty.topics.keys())
    if (!sp.some(s => s.topic.code === code)) warnings.push(`Fixed weeks for topic ${code} is not in the DSKP`);

  const exams = examBlocks(calendar, form);
  // 'final' = before the final exam of the year, minus the revision weeks
  if (end === 'final') {
    if (!exams.length) throw new Error(`No exam for Form ${form} in the takwim`);
    end = exams[exams.length - 1].start - 1 - revisionWeeks;
  }

  const rows = calendar.weeks.map(w => {
    const x = weekFor(w, form);
    return { ...x, capacity: x.n <= end && x.pdp > 0 ? 1 : 0, sp: [] };
  });

  const totalCapacity = rows.reduce((a, r) => a + r.capacity, 0);
  const totalValue = rated.reduce((a, s) => a + s.value, 0);
  if (!totalCapacity) throw new Error('No PdP weeks before the end week');
  const capacityUntil = n => rows.filter(r => r.n <= n).reduce((a, r) => a + r.capacity, 0);

  // Parts: [topics before the PPT] and [topics after the PPT], if the PPT falls before the end
  const topics = [...new Set(rated.map(s => s.topic.code))];
  const midYear = exams.length > 1 && exams[0].start <= end ? exams[0] : null;
  const cut = midYear ? Math.ceil(topics.length / 2) : topics.length;
  const parts = [
    { topics: topics.slice(0, cut), start: 0, end: midYear ? capacityUntil(midYear.start - 1) : totalCapacity },
    { topics: topics.slice(cut), start: midYear ? capacityUntil(midYear.start - 1) : totalCapacity, end: totalCapacity },
  ].filter(p => p.topics.length);

  // Length of every SP (in takwim weeks)
  for (const p of parts) {
    const sps = rated.filter(s => p.topics.includes(s.topic.code));
    const fixed = p.topics.filter(t => difficulty.topics.has(t));
    const fixedCapacity = fixed.reduce((a, t) => a + difficulty.topics.get(t), 0);
    const free = sps.filter(s => !fixed.includes(s.topic.code));
    const rest = p.end - p.start - fixedCapacity;
    if (rest < 0 || (rest === 0 && free.length)) throw new Error(`Fixed weeks (${fixedCapacity}) exceed the capacity of part ${p.topics[0]}–${p.topics[p.topics.length - 1]} (${(p.end - p.start).toFixed(1)})`);
    const scale = rest / (free.reduce((a, s) => a + s.value, 0) || 1);
    for (const s of sps) {
      const t = s.topic.code;
      s.length = fixed.includes(t)
        ? difficulty.topics.get(t) * s.value / sps.filter(x => x.topic.code === t).reduce((a, x) => a + x.value, 0)
        : s.value * scale;
    }
  }

  // Cumulative capacity at the start of every week
  let c = 0;
  const bounds = rows.map(r => { const b = [c, c + r.capacity]; c += r.capacity; return b; });
  let pos = 0;
  for (const s of rated) {
    const a = pos, b = (pos += s.length);
    const overlaps = bounds.map(([x, y], i) => ({ i, o: Math.min(b, y) - Math.max(a, x) })).filter(o => o.o > 1e-9);
    const best = overlaps.reduce((p, q) => (q.o > p.o ? q : p));
    const chosen = overlaps.filter(o => o.o >= MIN_OVERLAP - 1e-9 || o === best);
    chosen.forEach((o, k) => rows[o.i].sp.push({ ...s, cont: k > 0 }));
    s.weeks = chosen.map(o => rows[o.i].n);
  }

  return {
    rows, rated, breaks: breaks(calendar), end, form, totalCapacity, totalValue,
    warnings, exams, midYear, parts, fixed: difficulty.topics,
  };
}

export { MIN_OVERLAP, REVISION_WEEKS, plan };
