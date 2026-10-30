// node test/rpt.js — uses the real 2026 takwim and DSKP ASK T1 from sample/
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');
const takwim = R.parseTakwim(read('takwim-smly-2026.md'));
const calendar = R.buildCalendar(takwim);
const sp = R.parseDskp(read('dskp-ask-t1.md'));

// Takwim: 43 weeks, M1 = 12 Jan, M43 = 30 Nov
assert.strictEqual(takwim.weeks.length, 43);
assert.deepStrictEqual([takwim.weeks[0].n, takwim.weeks[0].start], [1, '2026-01-12']);
assert.deepStrictEqual([takwim.weeks[42].n, takwim.weeks[42].start], [43, '2026-11-30']);
takwim.weeks.forEach(w => assert.strictEqual(w.days.length, 5, `M${w.n}`));

// Exams by form
assert.deepStrictEqual(R.examForms('PPT T4 - 5'), [4, 5]);
assert.deepStrictEqual(R.examForms('PAT TING.4/UASA'), [4, 1, 2, 3]);
assert.deepStrictEqual(R.examForms('PEP. PERCUBAAN SPM'), [5]);
assert.deepStrictEqual(R.examForms('UBBM/UBBI PPT'), []);

// Calendar engine: day class by form, exam blocks, school breaks
const monday17 = calendar.weeks.find(w => w.n === 17).days[0];
assert.deepStrictEqual([R.dayClass(monday17, 4), R.dayClass(monday17, 1)], ['exam', 'pdp']); // PPT T4–5
assert.ok(calendar.weeks.find(w => w.n === 25).days.every(d => R.dayClass(d, 4) === 'pdp')); // Hari Sarawak
assert.deepStrictEqual(R.examBlocks(calendar, 4).map(b => [b.start, b.end]), [[17, 18], [37, 38]]);
assert.deepStrictEqual(R.examBlocks(calendar, 1).map(b => [b.start, b.end]), [[18, 18], [38, 38]]);
assert.deepStrictEqual(R.breaks(calendar).map(b => [b.after, b.start, b.end]), [
  [10, '2026-03-23', '2026-03-27'], [18, '2026-05-25', '2026-06-05'],
  [30, '2026-08-31', '2026-09-04'], [43, '2026-12-07', '2026-12-31'],
]);

// DSKP ASK T1: 36 SP
assert.strictEqual(sp.length, 36);
assert.deepStrictEqual([sp[0].code, sp[0].sk.code, sp[0].topic.code], ['1.1.1', '1.1', '1.0']);

const pdp = (p, n) => p.rows.find(r => r.n === n).pdp;
const none = { sp: new Map(), topics: new Map() };

// Full takwim weeks: Form 4 M1–M30 minus M6, M17, M18 = 27 weeks
// (a part-holiday week like M10, M11 counts as 1 week)
const t4 = R.plan({ sp, difficulty: none, calendar, form: 4, end: 30 });
assert.strictEqual(t4.totalCapacity, 27);
assert.strictEqual(t4.rows.find(r => r.n === 11).capacity, 1); // 2/5 PdP days
assert.strictEqual(pdp(t4, 6), 0);   // TBC + Cuti Tambahan KPM
assert.strictEqual(pdp(t4, 15), 4);  // Hari Pekerja 1 May
assert.strictEqual(pdp(t4, 17), 0);  // PPT T4–5
assert.strictEqual(pdp(t4, 25), 5);  // Hari Sarawak is not a holiday in Sabah

// Form 1: M17 is not an exam -> 28 weeks
const t1 = R.plan({ sp, difficulty: none, calendar, form: 1, end: 30 });
assert.strictEqual(t1.totalCapacity, 28);
assert.strictEqual(pdp(t1, 17), 5);

// Spreading: every SP is there, in order, in PdP weeks before the end of the syllabus
for (const p of [t1, t4]) {
  const seen = p.rows.flatMap(r => r.sp.filter(s => !s.cont).map(s => s.code));
  assert.deepStrictEqual(seen, sp.map(s => s.code));
  for (const r of p.rows) if (r.sp.length) assert.ok(r.n <= 30 && r.capacity > 0, `M${r.n}`);
}

// Default: before the final exam minus 2 revision weeks, all forms.
// T4 until M34 (PAT M37); T1 until M35 (UASA M38); T5 until M25 (Percubaan SPM M28)
const t4a = R.plan({ sp, difficulty: none, calendar, form: 4 });
assert.strictEqual(t4a.end, 34);
assert.strictEqual(t4a.totalCapacity, 31); // 27 + M31–M34
for (const [f, n] of [[1, 35], [2, 35], [3, 35], [4, 34], [5, 25]])
  assert.strictEqual(R.plan({ sp, difficulty: none, calendar, form: f }).end, n, `T${f}`);
assert.strictEqual(R.plan({ sp, difficulty: none, calendar, form: 4, revisionWeeks: 0 }).end, 36);
assert.ok(t4a.rows.find(r => r.n === 34).sp.length > 0);
assert.ok(!t4a.rows.find(r => r.n === 35).sp.length);

// Matematik T5: topics 1.0–4.0 before the PPT (M17); the syllabus ends at M25, revision M26–M27 before Percubaan SPM (M28)
const mat = R.parseDskp(read('dskp-mat-t5.md'));
const km = R.parseDifficulty(read('kesukaran-mat-t5.md'));
assert.strictEqual(km.sp.size, 57);
assert.strictEqual(km.topics.size, 0); // no fixed-week topics
const m4 = R.plan({ sp: mat, difficulty: km, calendar, form: 5 });
assert.deepStrictEqual(m4.warnings, []);
assert.deepStrictEqual([m4.midYear.start, m4.parts[0].topics], [17, ['1.0', '2.0', '3.0', '4.0']]);
for (const s of m4.rated) {
  const before = Number(s.topic.code) <= 4;
  assert.ok(s.weeks.every(n => (before ? n <= 16 : n >= 19 && n <= 25)), `${s.code} M${s.weeks}`);
}

// Difficulty changes the spreading: a hard SP gets more weeks
const k = R.parseDifficulty('| SP | Kesukaran | Sebab |\n|---|---|---|\n| 1.1.1 | 3 | x |\n| 1.1.2 | 1 | y |');
assert.deepStrictEqual(k.sp.get('1.1.1'), { value: 3, reason: 'x' });
const t1k = R.plan({ sp, difficulty: k, calendar, form: 1, end: 30 });
const at = (p, c) => p.rated.find(s => s.code === c).weeks.length;
assert.ok(at(t1k, '1.1.1') >= at(t1, '1.1.1'));

// The Peruntukan SP appendix: weeks of every SP, read back by parseRpt (for the RPH generator)
const mdMat = R.renderMd(m4, { subject: 'Matematik', year: 2026, dskp: 'd', takwim: 't', difficulty: 'k' });
const rpt = R.parseRpt(mdMat, 'rpt-mat');
assert.strictEqual(rpt.end, 25);
assert.strictEqual(rpt.allocation.size, 57);
assert.strictEqual(rpt.allocation.get('6.2.1'), Number(m4.rated.find(s => s.code === '6.2.1').length.toFixed(3)));
assert.deepStrictEqual(rpt.weeks.find(w => w.n === 20).sp, ['5.2.3', '5.2.4', '5.2.5', '5.3.1']);
assert.deepStrictEqual(rpt.weeks.find(w => w.n === 24).sp, ['7.1.2', '7.1.3', '7.2.1', '7.2.2']); // including (samb.)
assert.deepStrictEqual(rpt.weeks.find(w => w.n === 35).sp, []);
assert.throws(() => R.parseRpt(mdMat.split('## Peruntukan SP')[0], 'lama.md'), /lama\.md: no "## Peruntukan SP" table/);

console.log('rpt: all tests passed');
