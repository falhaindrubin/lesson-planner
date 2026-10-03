// node test/rph-planner.js — matching SPs to PdP by the time from the RPT
import assert from 'node:assert';
import * as R from '../src/core/index.js';

// A small DSKP: SP time (minutes) = 30, 60, 120, 10, 100
const mk = code => ({ code, text: `Teks ${code}`, sk: { code: code.split('.').slice(0, 2).join('.'), title: 'SK' }, topic: { code: code.split('.')[0] + '.0', title: 'Tajuk' } });
const sp = ['1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.2.1'].map(mk);
const spTime = new Map([['1.1.1', 30], ['1.1.2', 60], ['1.1.3', 120], ['1.1.4', 10], ['1.2.1', 100]]);
let day = 0;
const pdp = (minutes, extra = {}) => ({
  week: 35, date: `2026-10-${String(5 + day++).padStart(2, '0')}`, dayName: 'Isnin', periods: '1–2', time: '', minutes,
  kind: 'pdp', event: '', sp: [], status: 'diajar', attendance: 35, note: '', isNew: true, ...extra,
});
const plan = (rows, o = {}) => R.planRows({ rows, sp, spTime, start: '1.1.1', file: 'rekod.md', ...o });
const spOf = p => p.rows.map(r => r.sp.join(', '));

// Worked example: light SPs share a PdP, heavy SPs span PdP, no "continued" mark
const a = plan([pdp(60), pdp(60), pdp(90), pdp(60), pdp(60), pdp(60)]);
assert.deepStrictEqual(spOf(a), ['1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.3', '1.1.4, 1.2.1', '1.2.1', '1.0']);
assert.deepStrictEqual(a.end, { idx: 5, remaining: null, revisions: 1, finished: true });
assert.deepStrictEqual(a.warnings, []);

// Generated rows replayed give the same state (no longer new)
const replay = plan(a.rows.map(({ isNew, ...r }) => r));
assert.deepStrictEqual(spOf(replay), spOf(a));
assert.deepStrictEqual(replay.end, a.end);

// Postponed / cancelled use no time: the next PdP starts in the same place
day = 0;
const t = plan([pdp(60), pdp(60, { status: 'ditunda', isNew: false, sp: ['1.1.2', '1.1.3'] }), pdp(90)]);
assert.deepStrictEqual(spOf(t), ['1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.2, 1.1.3']);
assert.deepStrictEqual([t.end.idx, t.end.remaining], [2, 60]); // 1.1.3: 120 − 60 minutes
day = 0;
const bt = plan([pdp(60), pdp(60, { status: 'batal' }), pdp(60)]);
assert.deepStrictEqual(spOf(bt).filter((_, i) => i !== 1), ['1.1.1, 1.1.2', '1.1.2, 1.1.3']);

// The 15-minute rule: no continuation under 15 minutes; no new SP if under 15 minutes are left
day = 0;
const p15 = R.planRows({ rows: [pdp(60), pdp(60)], sp, spTime: new Map([['1.1.1', 70], ['1.1.2', 50]]), start: '1.1.1' });
assert.deepStrictEqual(spOf(p15), ['1.1.1', '1.1.2']); // 70 minutes in 60 -> the remaining 10 is finished
day = 0;
const n15 = R.planRows({ rows: [pdp(60)], sp, spTime: new Map([['1.1.1', 50], ['1.1.2', 60]]), start: '1.1.1' });
assert.deepStrictEqual(spOf(n15), ['1.1.1']); // 50 minutes, 10 left -> 1.1.2 does not start
assert.deepStrictEqual([n15.end.idx, n15.end.remaining], [1, null]);

// Combined by the teacher: all but the last SP are finished; the last takes the remainder
day = 0;
const g = plan([pdp(60, { isNew: false, sp: ['1.1.1', '1.1.2', '1.1.3'] }), pdp(60)]);
assert.deepStrictEqual(spOf(g), ['1.1.1, 1.1.2, 1.1.3', '1.1.3']); // 1.1.3 not started: 120 minutes
assert.deepStrictEqual([g.end.idx, g.end.remaining], [2, 60]);
// The teacher repeats an old SP: the position follows that row
day = 0;
const u = plan([pdp(60), pdp(60, { isNew: false, sp: ['1.1.1'] }), pdp(60)]);
assert.deepStrictEqual(spOf(u)[2], '1.1.2'); // 1.1.2 starts again: the full 60 minutes

// Tutorial: repeats the SPs of the last taught PdP (not the postponed one); does not advance
day = 0;
const tut = plan([
  pdp(60),
  pdp(60, { kind: 'tutorial', minutes: 90 }),
  pdp(60, { status: 'ditunda', isNew: false, sp: ['1.1.2', '1.1.3'] }),
  pdp(90, { kind: 'tutorial' }),
  pdp(60),
]);
assert.deepStrictEqual(spOf(tut), ['1.1.1, 1.1.2', '1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.1, 1.1.2', '1.1.2, 1.1.3']);
// Exam: no SP, does not advance
day = 0;
const ex = plan([pdp(60, { kind: 'peperiksaan', status: '' }), pdp(60)]);
assert.deepStrictEqual(spOf(ex), ['', '1.1.1, 1.1.2']);

// Without an RPT: one SP per PdP; DSKP finished -> revision by topic, cycling
day = 0;
const sp2 = ['1.1.1', '2.1.1'].map(mk);
const nr = R.planRows({ rows: [pdp(60), pdp(90), pdp(60), pdp(60), pdp(60)], sp: sp2, start: '1.1.1' });
assert.deepStrictEqual(spOf(nr), ['1.1.1', '2.1.1', '1.0', '2.0', '1.0']);
assert.strictEqual(nr.end.revisions, 3);
// Without an RPT, combined by the teacher: all SPs in the row are finished (example RPH ASK: 4.2.7 + 4.2.8)
day = 0;
const sp3 = ['4.2.7', '4.2.8', '4.2.9'].map(mk);
const ng = R.planRows({ rows: [pdp(60, { isNew: false, sp: ['4.2.7', '4.2.8'] }), pdp(60)], sp: sp3, start: '4.2.7' });
assert.deepStrictEqual(spOf(ng), ['4.2.7, 4.2.8', '4.2.9']);

// Without a DSKP (PK / PJ): rows without SP
day = 0;
assert.deepStrictEqual(spOf(R.planRows({ rows: [pdp(60)], sp: [] })), ['']);

// Start is not the first SP; an SP missing from Peruntukan SP -> PdP time + warning
day = 0;
const m = R.planRows({ rows: [pdp(60)], sp, spTime: new Map([['1.1.1', 30]]), start: '1.1.4' });
assert.deepStrictEqual(spOf(m), ['1.1.4']);
assert.deepStrictEqual(m.warnings, ['SP 1.1.4 is not in Peruntukan SP; using 60 min']);

// Errors with line numbers
day = 0;
assert.throws(() => plan([pdp(60, { isNew: false, sp: ['9.9.9'], line: 12 })]), /rekod\.md:12: SP 9\.9\.9 is not in the DSKP/);
assert.throws(() => plan([pdp(60, { isNew: false, sp: ['7.0'], line: 13 })]), /rekod\.md:13: topic 7\.0 is not in the DSKP/);
assert.throws(() => plan([], { start: '9.9.9' }), /rekod\.md: SP Mula 9\.9\.9 is not in the DSKP/);

console.log('rph-planner: all tests passed');
