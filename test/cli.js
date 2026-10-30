// node test/cli.js — run src/cli/rph.js end to end in a temporary folder,
// with the real 2026 takwim, timetable, events, DSKP and Matematik T5 RPT.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as R from '../src/core/index.js';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sample = path.join(__dirname, '..', 'sample');
const cli = path.join(__dirname, '..', 'src', 'cli', 'rph.js');
const read = f => fs.readFileSync(path.join(sample, f), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rph-'));
const s = f => path.join(sample, f);

// Matematik T5 RPT with the Peruntukan SP appendix
const calendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const plan = R.plan({ sp: R.parseDskp(read('dskp-mat-t5.md')), difficulty: R.parseDifficulty(read('kesukaran-mat-t5.md')), calendar, form: 5 });
fs.writeFileSync(path.join(tmp, 'rpt-mat.md'), R.renderMd(plan, { subject: 'Matematik', year: 2026, dskp: 'd', takwim: 't', difficulty: 'k' }));
const act = s('aktiviti-umum.md');
fs.writeFileSync(path.join(tmp, 'kelas.md'), [
  '- Tahun: 2026', '- Guru: FALHAIND RUBIN', `- Takwim: ${s('takwim-smly-2026.md')}`, `- Jadual: ${s('jwg-20261002.md')}`,
  `- Acara: ${s('acara-2026.md')}`, '- Rekod: rekod', '- Output: out', '',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  `| 5S | 5 STANFORD | 5 | M3 | MATEMATIK | ${s('dskp-mat-t5.md')} | ${act} | rpt-mat.md |  | 35 | 7.1.1 |`,
  `| 1S | 1 SAPPHIRE | 1 | ASK | ASAS SAINS KOMPUTER | ${s('dskp-ask-t1.md')} | ${act} |  |  | 35 | 4.2.5 |`,
  `| 4H | 4 HARVARD | 4 | SK | SAINS KOMPUTER |  | ${act} |  | TUTORIAL | 30 |  |`,
  `| 2D | 2 DIAMOND | 2 | PK | PENDIDIKAN KESIHATAN |  | ${act} |  |  | 30 |  |`,
  `| 2J | 2 JADE | 2 | PK | PENDIDIKAN KESIHATAN |  | ${act} |  |  | 31 |  |`,
  `| 2D | 2 DIAMOND | 2 | PJ | PENDIDIKAN JASMANI |  | ${act} |  |  | 30 |  |`,
  `| 2J | 2 JADE | 2 | PJ | PENDIDIKAN JASMANI |  | ${act} |  |  | 31 |  |`,
].join('\n'));

const run = (...args) => {
  const r = spawnSync(process.execPath, [cli, '--classes', path.join(tmp, 'kelas.md'), ...args], { encoding: 'utf8', cwd: tmp });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const t = f => fs.readFileSync(path.join(tmp, f), 'utf8');
const snapshot = () => Object.fromEntries(['rekod', 'out'].flatMap(d => fs.readdirSync(path.join(tmp, d)).map(f => [`${d}/${f}`, t(`${d}/${f}`)])));

// First run: M35, today Saturday 3 Oct
const r1 = run('--week', 'M35', '--today', '2026-10-03');
assert.strictEqual(r1.code, 0, r1.err);
assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'out')).sort(),
  ['2026-M35-ASK.html', '2026-M35-M3.html', '2026-M35-PJ.html', '2026-M35-PK.html', '2026-M35-SK.html']);
assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'rekod')).sort(),
  ['rekod-1S-ASK.md', 'rekod-2D-PJ.md', 'rekod-2D-PK.md', 'rekod-2J-PJ.md', 'rekod-2J-PK.md', 'rekod-4H-SK.md', 'rekod-5S-M3.md']);

// 5S M3 (in RPT M23–M25, full week 210 minutes): each SP of 7.1.1–7.2.x takes about 59 minutes, so a 60-minute lesson
// holds one SP and the start of the next; Wednesday (90 minutes) holds 7.1.3 and 7.2.1
const m3 = R.parseRekod(t('rekod/rekod-5S-M3.md'));
assert.deepStrictEqual(m3.map(r => [r.date, r.sp.join(', '), r.status, r.attendance]), [
  ['2026-10-05', '7.1.1, 7.1.2', 'diajar', 35], ['2026-10-06', '7.1.2, 7.1.3', 'diajar', 35], ['2026-10-07', '7.1.3, 7.2.1', 'diajar', 35],
]);
// 1S ASK without an RPT: one SP per PdP; 4H SK without a DSKP: tutorial on Thursday
assert.deepStrictEqual(R.parseRekod(t('rekod/rekod-1S-ASK.md')).map(r => r.sp.join()), ['4.2.5', '4.2.6']);
assert.deepStrictEqual(R.parseRekod(t('rekod/rekod-4H-SK.md')).map(r => r.kind), ['pdp', 'tutorial', 'pdp']);
// HTML: one RPH per PdP; attendance by class
const htmlPk = t('out/2026-M35-PK.html');
assert.strictEqual((htmlPk.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 2);
assert.ok(htmlPk.includes('31 / 31') && htmlPk.includes('30 / 30'));
assert.ok(t('out/2026-M35-M3.html').includes('Perkembangan: (80 minit)'));
// Summary and warnings
assert.match(r1.out, /^5S M3: SP 7\.1\.1 · RPT M23 · \d+ weeks? behind$/m);
// Timetable only from 5 Oct: SP time of early weeks uses that timetable, with a warning
assert.match(r1.err, /Warning: 5S M3: no timetable before 2026-10-05; SP time for earlier weeks uses that timetable/);
assert.match(r1.out, /^1S ASK: SP 4\.2\.5 · no RPT$/m);
assert.match(r1.out, /^4H SK: no DSKP$/m);
assert.match(r1.err, /Warning: 5S M3: needs \d+ min for the remaining SPs, has 0 min until M25; consider combining SPs/);
assert.match(r1.err, /Warning: 2D PK: no DSKP; SP left blank/);

// Run again without changes: every file is the same byte for byte
const snap1 = snapshot();
assert.strictEqual(run('--week', '35', '--today', '2026-10-03').code, 0);
assert.deepStrictEqual(snapshot(), snap1);

// The teacher marks Tuesday 6 Oct ditunda (with a reason), then M36 is generated on the evening of 6 Oct
fs.writeFileSync(path.join(tmp, 'rekod/rekod-5S-M3.md'), t('rekod/rekod-5S-M3.md')
  .replace('| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2, 7.1.3 | diajar | 35 |  |', '| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2, 7.1.3 | ditunda | 35 | Mesyuarat |'));
const r2 = run('--week', '36', '--today', '2026-10-06');
assert.strictEqual(r2.code, 0, r2.err);
const m3b = R.parseRekod(t('rekod/rekod-5S-M3.md'));
// Wednesday 7 Oct is rebuilt: Tuesday's postponed SPs 7.1.2–7.1.3 are taught then, continuing at 7.2.1 on Monday
assert.deepStrictEqual(m3b.find(r => r.date === '2026-10-07').sp, ['7.1.2', '7.1.3']);
assert.deepStrictEqual(m3b.find(r => r.date === '2026-10-12').sp, ['7.2.1']);
assert.strictEqual(m3b.find(r => r.date === '2026-10-12').event, 'X-Break');
assert.ok(t('out/2026-M35-M3.html').includes('☑ PdP ditunda kerana: Mesyuarat'));
assert.ok(t('out/2026-M36-M3.html').includes('Hari acara: X-Break'));
assert.ok(!/bersambung|samb\./.test(t('out/2026-M36-M3.html')));

// Two classes of one subject (2D PJ Thursday, 2J PJ Friday): on Thursday 8 Oct only 2J still has a future M35 row,
// but the PJ M35 file must still hold the pages of both classes
assert.strictEqual(run('--week', '36', '--today', '2026-10-08').code, 0);
const pj35 = t('out/2026-M35-PJ.html');
assert.ok(pj35.includes('2 DIAMOND') && pj35.includes('2 JADE'), 'PJ M35 lost the page of one class');
assert.strictEqual((pj35.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 2);

// Errors: clear message, exit code 1, no stack trace
const r3 = run('--week', '50', '--today', '2026-10-06');
assert.strictEqual(r3.code, 1);
assert.match(r3.err, /^Error: No week M50 in the takwim/m);
assert.ok(!/at main/.test(r3.err));
// An error in one class: no file is written for any class
const snap2 = snapshot();
fs.writeFileSync(path.join(tmp, 'rekod/rekod-2J-PJ.md'), t('rekod/rekod-2J-PJ.md').replace('| diajar |', '| tunda |'));
const r4 = run('--week', '37', '--today', '2026-10-06');
assert.strictEqual(r4.code, 1);
assert.match(r4.err, /Error: rekod[\\/]rekod-2J-PJ\.md:\d+: Status "tunda" not recognised/);
const snap3 = snapshot();
assert.deepStrictEqual(Object.keys(snap3), Object.keys(snap2));
for (const f of Object.keys(snap2)) if (f !== 'rekod/rekod-2J-PJ.md') assert.strictEqual(snap3[f], snap2[f], f);

// Simulation at the start of the year (the real 2026 class file, 5S only): M1–M5 undisturbed always follow the RPT
const classSim = read('kelas-2026.md')
  .replace(/^- (Takwim|Jadual|Acara): (.*)$/gm, (_, k, v) => `- ${k}: ${v.split(', ').map(s).join(', ')}`)
  .replace(/^- Rekod: .*$/m, '- Rekod: sim').replace(/^- Output: .*$/m, '- Output: sim')
  .replace('| dskp-mat-t5.md | aktiviti-umum.md | ../output/rpt-mat-t5-2026.md |', `| ${s('dskp-mat-t5.md')} | ${act} | rpt-mat.md |`);
fs.writeFileSync(path.join(tmp, 'kelas-sim.md'), classSim);
const sim = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'cli', 'simulate.js'), '--classes', path.join(tmp, 'kelas-sim.md'), '--from', '1', '--to', '5'], { encoding: 'utf8', cwd: tmp });
assert.strictEqual(sim.status, 0, sim.stderr);
assert.deepStrictEqual(sim.stdout.trim().split('\n'), [
  'M1 (2026-01-10) 5S M3: SP 1.1.1 · RPT M1 · on track',
  'M2 (2026-01-17) 5S M3: SP 1.1.3 · RPT M2 · on track',
  'M3 (2026-01-24) 5S M3: SP 1.2.1 · RPT M3 · on track',
  'M4 (2026-01-31) 5S M3: SP 1.2.3 · RPT M3–M4 · on track',
  'M5 (2026-02-07) 5S M3: SP 1.3.1 · RPT M4 · on track',
]);
assert.strictEqual(R.parseRekod(t('sim/rekod-5S-M3.md')).length, 15);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('cli: all tests passed');
