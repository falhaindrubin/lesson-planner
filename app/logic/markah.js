// markah-<kelas>-<kod>.md (a table: Nama, then one column per assessment, marks 0-100) -> what the Marks tab shows.
const cells = line => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const PASS = 40; // ponytail: one pass mark for every subject; make it a setting if a subject needs another
const GRADES = [[90, 'A+'], [80, 'A'], [70, 'A-'], [65, 'B+'], [60, 'B'], [55, 'C+'], [50, 'C'], [45, 'D'], [40, 'E'], [0, 'G']];
const gradeOf = m => GRADES.find(([min]) => m >= min)[1];

function parseMarkah(md) {
  const rows = md.split(/\r?\n/).filter(l => l.startsWith('|')).map(cells).filter(c => !c.every(x => /^:?-+:?$/.test(x)));
  if (rows.length < 2 || rows[0].length < 2) throw new Error('no marks table found (columns: Nama, then one per assessment)');
  const tests = rows[0].slice(1);
  const students = rows.slice(1).map(c => ({
    name: c[0],
    marks: tests.map((_, i) => {
      const v = c[i + 1];
      if (v == null || v === '' || /^(th|-)$/i.test(v)) return null; // blank, "TH" (tidak hadir) or "-" = no mark
      const n = Number(v);
      if (!(n >= 0 && n <= 100)) throw new Error(`${c[0]}, ${tests[i]}: "${v}" is not a mark from 0 to 100`);
      return n;
    }),
  }));
  return { tests, students };
}

// Per assessment: sat, average, pass share, grade counts; plus students to look at
// (failing the latest assessment, or down 15+ points from their previous mark)
function summarise({ tests, students }) {
  const per = tests.map((name, i) => {
    const m = students.map(s => s.marks[i]).filter(x => x != null);
    const grades = {};
    for (const x of m) grades[gradeOf(x)] = (grades[gradeOf(x)] || 0) + 1;
    return { name, sat: m.length, avg: m.length ? m.reduce((a, b) => a + b, 0) / m.length : null, pass: m.length ? m.filter(x => x >= PASS).length / m.length : null, grades };
  });
  const latest = per.reduce((a, p, i) => (p.sat ? i : a), -1);
  const watch = [];
  if (latest >= 0) for (const s of students) {
    const now = s.marks[latest], before = s.marks.slice(0, latest).reverse().find(x => x != null);
    if (now == null) continue;
    if (now < PASS) watch.push({ name: s.name, why: `${now} in ${tests[latest]} (below ${PASS})` });
    else if (before != null && before - now >= 15) watch.push({ name: s.name, why: `down ${before - now} points to ${now} in ${tests[latest]}` });
  }
  return { per, latest, watch };
}

export { parseMarkah, summarise, gradeOf, GRADES, PASS };
