# RPH Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command (`node src/cli/rph.js --kelas sample/kelas-2026.md --minggu 35`) writes the week's RPH pages for every class, keeps a per-class lesson log (rekod) the teacher edits, and prints each class's position against the frozen RPT.

**Architecture:** Pure functions in `src/core/` (parsers, scheduler, pacing planner, rekod sync, summary, renderers) with no I/O; one thin Node CLI in `src/cli/rph.js` that reads files, calls the core, and writes files only after every class succeeded. SP time comes from a new "Peruntukan SP" appendix in the generated RPT markdown, so an undisturbed class tracks the RPT exactly.

**Tech Stack:** Node 24, plain JavaScript (CommonJS), no dependencies, `node:assert` tests run with `node test/<file>.js`.

**Spec:** [docs/superpowers/specs/2026-10-03-rph-pipeline-design.md](../specs/2026-10-03-rph-pipeline-design.md) — read it before starting. Background: [docs/architecture.md](../../architecture.md) §4, [docs/discussion.md](../../discussion.md).

## Global Constraints

- Node 24, CommonJS (`require` / `module.exports`), **no dependencies**, no `package.json`.
- `src/core/` is pure: no `fs`, `path`, `process` or `console`. Only `src/cli/` does I/O.
- Code comments and every generated text (rekod, RPH, warnings, errors) are in **Bahasa Melayu**; docs are in English.
- Tests: `node test/<file>.js` with `node:assert`, against the real files in `sample/` (inline fixtures only for edge cases). `node test/semua.js` runs every test file. All must print `<name>: semua ujian lulus`.
- **Never print "bersambung" or "samb." on a lesson** (RPH page or rekod). The RPT table's existing "(samb.)" stays as it is.
- Parsers accept LF and CRLF. Errors name `file:line` where there is a line.
- Style of the existing code: 2-space indent, single quotes, semicolons, small functions, arrow helpers, short Malay comments.
- Shell: Git Bash on Windows; the repo path has a space (`/c/Users/Falhaind Rubin/projects/lesson-planner`), so quote paths. Run every command from the repo root.
- Commit messages end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Inputs the spec implies that are most likely to bite the teacher; each is pinned by a test in the owning task.

1. **Files saved with CRLF** by a Windows editor (rekod, kelas, jadual) parse exactly like LF — Task 2 (`test/jadual.js`), Task 3 (`test/kelas-acara.js`), Task 5 (`test/rekod.js`).
2. **Loosely typed rekod cells** — `Ditunda `, `DITUNDA`, `33/35`, `4.2.7 + 4.2.8`, pasted SP text — are read as meant; an unknown word (`tunda`) stops with `file:line` — Task 5.
3. **Running the CLI twice with nothing changed** leaves every rekod and HTML file byte-identical — Task 7 (`test/rekod-sync.js`) and Task 10 (`test/rph-cli.js`).
4. **A typo in one class's rekod** stops the run with `Ralat: <file>:<line>: …`, exit code 1, no stack trace, and **no file of any class changed** — Task 10.
5. **Rows pasted out of order, or a past lesson deleted** by the teacher: rows come back sorted; the deleted past lesson is not re-added — Task 7.

---

### Task 1: RPT "Peruntukan SP" appendix and RPT parser

**Files:**
- Modify: `src/core/render/rpt.js` (function `renderMd`, before the `## Amaran` line)
- Create: `src/core/parse/rpt.js`
- Modify: `src/core/index.js`
- Modify: `test/rpt.js` (append before the final `console.log`)
- Regenerate: `output/rpt-mat-t4-2026.md` (`.html` must not change)

**Interfaces:**
- Consumes: `plan()` result from `src/core/rpt-planner.js` — `p.rated[i].code`, `p.rated[i].panjang` (weeks, float).
- Produces: `parseRpt(md, fail) → { tamat: number, minggu: [{ n: number, sp: string[] }], peruntukan: Map<string, number> }`. `minggu[].sp` lists every SP code in that week's row, including "(samb.)" continuations.

- [ ] **Step 0: Commit pending work first**

The working tree has the earlier move from `rpt/` to `src/core/` and the design docs uncommitted. Check, then commit them on their own so this plan's commits stay clean:

```bash
git status --short
git add -A rpt src test sample/kesukaran-mat-t4.md README.md TODO.md docs output
git commit -m "Move RPT code to src/core; RPH pipeline design and plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Do not add `graphify-out/`. If `git status` shows nothing to commit, skip this step.

- [ ] **Step 1: Write the failing test**

In `test/rpt.js`, replace the last line `console.log('rpt: semua ujian lulus');` with:

```js
// Lampiran Peruntukan SP: minggu setiap SP, dibaca semula oleh parseRpt (untuk penjana RPH)
const mdMat = R.renderMd(m4, { subjek: 'Matematik', tahun: 2026, dskp: 'd', takwim: 't', kesukaran: 'k' });
const rpt = R.parseRpt(mdMat, 'rpt-mat');
assert.strictEqual(rpt.tamat, 34);
assert.strictEqual(rpt.peruntukan.size, 70);
assert.strictEqual(rpt.peruntukan.get('10.1.2'), 1.2);
assert.strictEqual(rpt.peruntukan.get('6.2.1'), Number(m4.rated.find(s => s.code === '6.2.1').panjang.toFixed(3)));
assert.deepStrictEqual(rpt.minggu.find(w => w.n === 20).sp, ['6.2.1', '6.2.2']);
assert.deepStrictEqual(rpt.minggu.find(w => w.n === 24).sp, ['7.2.2', '7.2.3', '7.2.4']); // termasuk (samb.)
assert.deepStrictEqual(rpt.minggu.find(w => w.n === 35).sp, []);
assert.throws(() => R.parseRpt(mdMat.split('## Peruntukan SP')[0], 'lama.md'), /lama\.md: tiada jadual "## Peruntukan SP"/);

console.log('rpt: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/rpt.js`
Expected: FAIL with `TypeError: R.parseRpt is not a function`

- [ ] **Step 3: Write the implementation**

In `src/core/render/rpt.js`, inside `renderMd`, insert these two lines directly above `  if (p.warnings.length) L.push('', '## Amaran', '', ...p.warnings.map(w => \`- ${w}\`));`:

```js
  L.push('', '## Peruntukan SP', '', 'Minggu takwim bagi setiap SP. Dibaca oleh penjana RPH untuk menentukan masa setiap SP.', '', '| SP | Minggu |', '|---|---|');
  for (const s of p.rated) L.push(`| ${s.code} | ${s.panjang.toFixed(3)} |`);
```

Create `src/core/parse/rpt.js`:

```js
// RPT.md (hasil src/cli/rpt.js) -> { tamat, minggu: [{ n, sp: [kod] }], peruntukan: Map(kod -> minggu) }
// RPT ialah salinan beku: penjana RPH membaca fail ini, bukan menjana RPT semula.
const SP_DALAM_SEL = /(?:\| |<br>)(\d+\.\d+\.\d+) /g;

function parseRpt(md, fail = 'rpt') {
  const t = md.match(/^- Sukatan tamat: M(\d+)/m);
  if (!t) throw new Error(`${fail}: tiada baris "- Sukatan tamat: M…"`);
  const minggu = [], peruntukan = new Map();
  let section = '';
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); continue; }
    let m;
    if (section === 'Rancangan' && (m = line.match(/^\| M(\d+) \|/)))
      minggu.push({ n: Number(m[1]), sp: [...line.matchAll(SP_DALAM_SEL)].map(x => x[1]) });
    else if (section === 'Peruntukan SP' && (m = line.match(/^\| (\d+\.\d+\.\d+) \| ([\d.]+) \|/)))
      peruntukan.set(m[1], Number(m[2]));
  }
  if (!peruntukan.size) throw new Error(`${fail}: tiada jadual "## Peruntukan SP"; jana semula RPT dengan src/cli/rpt.js`);
  return { tamat: Number(t[1]), minggu, peruntukan };
}

module.exports = { parseRpt };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./calendar'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/rpt.js`
Expected: `rpt: semua ujian lulus`

- [ ] **Step 5: Regenerate the Matematik T4 RPT and check only the appendix changed**

```bash
node src/cli/rpt.js --dskp sample/dskp-mat-t4.md --takwim sample/takwim-smly-2026.md --kesukaran sample/kesukaran-mat-t4.md --tingkatan 4 --out output/rpt-mat-t4-2026
git diff --stat output/
git diff output/rpt-mat-t4-2026.md | head -20
```

Expected: `output/rpt-mat-t4-2026.html` unchanged; the `.md` diff only adds `## Peruntukan SP` with 70 rows after the `## Rancangan` table (e.g. `| 6.2.1 | 0.549 |`, `| 10.1.2 | 1.200 |`).

- [ ] **Step 6: Commit**

```bash
git add src/core/render/rpt.js src/core/parse/rpt.js src/core/index.js test/rpt.js output/rpt-mat-t4-2026.md
git commit -m "Add Peruntukan SP appendix to RPT and parseRpt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Period helpers, Jadual parser, timetable resolver

**Files:**
- Modify: `src/core/util.js` (add helpers; whole file shown)
- Create: `src/core/parse/jadual.js`, `src/core/timetable.js`
- Modify: `src/core/index.js`
- Create: `test/jadual.js`, `test/semua.js`

**Interfaces:**
- Consumes: `cells`, `HARI_BEKERJA` from `src/core/util.js`.
- Produces (all exported from `src/core/index.js`):
  - `waktuRange(s: string) → [a, b]` (accepts `2–3`, `2-3`, `9`; throws `Waktu tidak sah: "<s>"`)
  - `fmtWaktu([a, b]) → '2–3'` or `'9'`; `minitMula(p) → minutes since midnight` (6:30 + 30p); `minitWaktu([a, b]) → (b − a + 1) × 30`
  - `jam12(min) → '1:00'`; `jam24(min) → '1300'`; `masaWaktu([a, b]) → '12:30–2:00'`; `fmtTarikh('2026-10-05') → '05/10/2026'`
  - `parseJadual(md, fail) → { berkuatKuasa: 'yyyy-mm-dd', slots: [{ hari, waktu: [a, b], masa, subjek, kelas, bilik }] }`
  - `versionFor(versions, tarikh) → version` (latest with `berkuatKuasa ≤ tarikh`; throws `Tiada jadual berkuat kuasa pada <tarikh>`)
  - `minitSeminggu(version, kelas, subjek) → number` (sum of that class × subject's slot minutes; tutorial slots have another code so are not counted)

- [ ] **Step 1: Write the failing tests**

Create `test/jadual.js`:

```js
// node test/jadual.js — jadual waktu 5.10.2026 sebenar dari sample/
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Waktu: 30 minit, waktu 0 = 6:30, jam 12 jam seperti aSc
assert.deepStrictEqual(R.waktuRange('2–3'), [2, 3]);
assert.deepStrictEqual(R.waktuRange('12-14'), [12, 14]);
assert.deepStrictEqual(R.waktuRange(' 9 '), [9, 9]);
assert.throws(() => R.waktuRange('3–2'), /Waktu tidak sah: "3–2"/);
assert.throws(() => R.waktuRange('pagi'), /Waktu tidak sah/);
assert.strictEqual(R.fmtWaktu([2, 3]), '2–3');
assert.strictEqual(R.fmtWaktu([9, 9]), '9');
assert.strictEqual(R.masaWaktu([2, 3]), '7:30–8:30');
assert.strictEqual(R.masaWaktu([12, 14]), '12:30–2:00');
assert.strictEqual(R.masaWaktu([10, 12]), '11:30–1:00');
assert.strictEqual(R.minitWaktu([7, 9]), 90);
assert.strictEqual(R.jam24(R.minitMula(3)), '0800');
assert.strictEqual(R.jam24(R.minitMula(15)), '1400');
assert.strictEqual(R.fmtTarikh('2026-10-05'), '05/10/2026');

// Jadual 5.10.2026: 12 slot kelas; slot B (Bukan kelas) diabaikan
const j = R.parseJadual(read('jwg-20261002.md'), 'jwg-20261002.md');
assert.strictEqual(j.berkuatKuasa, '2026-10-05');
assert.strictEqual(j.slots.length, 12);
assert.deepStrictEqual(j.slots[0], { hari: 'Isnin', waktu: [2, 3], masa: '7:30–8:30', subjek: 'M3', kelas: '4S', bilik: '' });
assert.deepStrictEqual(j.slots.find(s => s.subjek === 'SK' && s.hari === 'Selasa').waktu, [12, 14]);
assert.ok(!j.slots.some(s => s.hari === 'Jumaat' && s.waktu[0] === 9)); // tanda B
assert.strictEqual(j.slots.filter(s => s.subjek === 'TUTORIAL').length, 1);

// Masa yang tidak sepadan dengan Waktu ditolak dengan nombor baris
const salah = read('jwg-20261002.md').replace('| Isnin | 2–3 | 7:30–8:30 |', '| Isnin | 2–3 | 7:30–9:00 |');
assert.throws(() => R.parseJadual(salah, 'jwg.md'), /jwg\.md:\d+: Masa "7:30–9:00" tidak sepadan dengan Waktu 2–3 \(7:30–8:30\)/);
assert.throws(() => R.parseJadual('# x\n## Kelas\n', 'x.md'), /x\.md: tiada baris "- Berkuat kuasa/);
// CRLF (fail disimpan di Windows) dibaca sama
assert.deepStrictEqual(R.parseJadual(read('jwg-20261002.md').replace(/\n/g, '\r\n')), j);

// Penyelesai: versi terkini yang berkuat kuasa pada tarikh itu
const lama = { berkuatKuasa: '2026-08-10', slots: [{ hari: 'Isnin', waktu: [1, 2], masa: '7:00–8:00', subjek: 'M3', kelas: '4S', bilik: '' }] };
const versions = [j, lama]; // tertib dalam senarai tidak penting
assert.strictEqual(R.versionFor(versions, '2026-10-02'), lama);
assert.strictEqual(R.versionFor(versions, '2026-10-05'), j);
assert.strictEqual(R.versionFor(versions, '2026-12-01'), j);
assert.throws(() => R.versionFor(versions, '2026-08-07'), /Tiada jadual berkuat kuasa pada 2026-08-07/);

// Minit seminggu: 4S M3 = 60 + 60 + 90; 4H SK = 90 + 90 (tutorial tidak dikira)
assert.strictEqual(R.minitSeminggu(j, '4S', 'M3'), 210);
assert.strictEqual(R.minitSeminggu(j, '4H', 'SK'), 180);
assert.strictEqual(R.minitSeminggu(lama, '4S', 'M3'), 60);

console.log('jadual: semua ujian lulus');
```

Create `test/semua.js` (runs every test file):

```js
// node test/semua.js — jalankan semua fail ujian dalam test/
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'semua.js').sort())
  execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/jadual.js`
Expected: FAIL with `TypeError: R.waktuRange is not a function`

- [ ] **Step 3: Write the implementation**

Replace `src/core/util.js` with (existing functions unchanged; new helpers after `range`):

```js
// Fungsi kecil yang dikongsi oleh parser, kalendar dan renderer. Tiada I/O.

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const HARI_BEKERJA = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];

// '| a | b |' -> ['a', 'b']
function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
function fmtDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${BULAN[m - 1]}`;
}
function fmtRange(a, b) {
  const [, ma] = a.split('-'), [, mb] = b.split('-');
  return ma === mb ? `${Number(a.slice(8))}–${fmtDate(b)}` : `${fmtDate(a)} – ${fmtDate(b)}`;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Waktu jadual: 30 minit setiap satu, waktu 0 bermula 6:30.
// '2–3' -> [2, 3]; '9' -> [9, 9] (sempang biasa juga diterima)
function waktuRange(s) {
  const m = String(s).trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
  const a = m && Number(m[1]), b = m && (m[2] != null ? Number(m[2]) : a);
  if (!m || b < a) throw new Error(`Waktu tidak sah: "${s}"`);
  return [a, b];
}
const fmtWaktu = ([a, b]) => (a === b ? String(a) : `${a}–${b}`);
const minitMula = p => 6 * 60 + 30 + 30 * p; // minit dari tengah malam
const minitWaktu = ([a, b]) => (b - a + 1) * 30;
// Jam 12 jam seperti cetakan aSc (1:00 = 13:00) dan jam 24 jam seperti RPH (0800)
const jam12 = min => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')}`;
const jam24 = min => String(Math.floor(min / 60)).padStart(2, '0') + String(min % 60).padStart(2, '0');
const masaWaktu = ([a, b]) => `${jam12(minitMula(a))}–${jam12(minitMula(b + 1))}`;
// '2026-10-05' -> '05/10/2026'
const fmtTarikh = iso => iso.split('-').reverse().join('/');

module.exports = {
  BULAN, HARI_BEKERJA, cells, daysBetween, fmtDate, fmtRange, range,
  waktuRange, fmtWaktu, minitMula, minitWaktu, jam12, jam24, masaWaktu, fmtTarikh,
};
```

Create `src/core/parse/jadual.js`:

```js
// Jadual.md (aSc) -> { berkuatKuasa, slots: [{ hari, waktu: [a, b], masa, subjek, kelas, bilik }] }
// Hanya jadual di bawah '## Kelas' dibaca; satu baris = satu PdP.
// '## Bukan kelas' (tanda B dan lain-lain) bukan PdP dan diabaikan.
const { cells, HARI_BEKERJA, waktuRange, masaWaktu } = require('../util');

function parseJadual(md, fail = 'jadual') {
  const bk = md.match(/^- Berkuat kuasa: (\d{4}-\d\d-\d\d)/m);
  if (!bk) throw new Error(`${fail}: tiada baris "- Berkuat kuasa: yyyy-mm-dd"`);
  const slots = [];
  let section = '';
  md.split(/\r?\n/).forEach((line, i) => {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); return; }
    if (section !== 'Kelas' || !/^\|/.test(line) || /^\| *(Hari|-)/.test(line)) return;
    const at = `${fail}:${i + 1}`;
    const c = cells(line);
    if (c.length !== 6) throw new Error(`${at}: perlu 6 lajur (Hari, Waktu, Masa, Subjek, Kelas, Bilik), ada ${c.length}`);
    const [hari, w, masa, subjek, kelas, bilik] = c;
    if (!HARI_BEKERJA.includes(hari)) throw new Error(`${at}: hari tidak sah "${hari}"`);
    let waktu;
    try { waktu = waktuRange(w); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    if (masa !== masaWaktu(waktu)) throw new Error(`${at}: Masa "${masa}" tidak sepadan dengan Waktu ${w} (${masaWaktu(waktu)})`);
    if (!subjek || !kelas) throw new Error(`${at}: Subjek atau Kelas kosong`);
    slots.push({ hari, waktu, masa, subjek, kelas, bilik });
  });
  if (!slots.length) throw new Error(`${fail}: tiada slot di bawah "## Kelas"`);
  return { berkuatKuasa: bk[1], slots };
}

module.exports = { parseJadual };
```

Create `src/core/timetable.js`:

```js
// Penyelesai jadual: versi jadual yang berkuat kuasa pada satu tarikh.
// Pertukaran jadual = fail baharu dengan tarikh berkuat kuasa sendiri; tarikh lama tidak diubah.
const { minitWaktu } = require('./util');

// Versi terkini dengan berkuatKuasa <= tarikh
function versionFor(versions, tarikh) {
  let best = null;
  for (const v of versions) if (v.berkuatKuasa <= tarikh && (!best || v.berkuatKuasa > best.berkuatKuasa)) best = v;
  if (!best) throw new Error(`Tiada jadual berkuat kuasa pada ${tarikh}`);
  return best;
}

// Minit PdP seminggu bagi kelas × subjek dalam satu versi (slot tutorial tidak dikira)
function minitSeminggu(version, kelas, subjek) {
  return version.slots
    .filter(s => s.kelas === kelas && s.subjek === subjek)
    .reduce((a, s) => a + minitWaktu(s.waktu), 0);
}

module.exports = { versionFor, minitSeminggu };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: `jadual: semua ujian lulus` and `rpt: semua ujian lulus`

- [ ] **Step 5: Commit**

```bash
git add src/core/util.js src/core/parse/jadual.js src/core/timetable.js src/core/index.js test/jadual.js test/semua.js
git commit -m "Add Jadual parser, timetable resolver and period helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Class and event files

**Files:**
- Create: `src/core/parse/kelas.js`, `src/core/parse/acara.js`
- Create (or overwrite): `sample/kelas-2026.md` (4S Matematik only, simulated from M1), `sample/jwg-20260101-simulasi.md` (labelled copy of the 5.10.2026 timetable, valid from 1 Jan), `sample/acara-2026.md`
- Create: `test/data/kelas-semua.md` (all seven class × subject rows — test data)
- Modify: `src/core/index.js`
- Create: `test/kelas-acara.js`

**Interfaces:**
- Consumes: `cells` from util; `parseJadual` (test only).
- Produces:
  - `parseKelas(md, fail) → { tahun: number, guru, takwim, jadual: string[], acara, rekod, output, kelas: KelasRow[] }`
  - `KelasRow = { kelas, namaPenuh, tingkatan: number, subjek, namaSubjek, dskp, aktiviti, rpt, tutorial, bilMurid: number|null, mula, line }` (blank cells are `''`)
  - `parseAcara(md, fail) → { acara: [{ tarikh, nama, tingkatan: number[] }], batal: [{ tarikh, sasaran, sebab }] }` (`tingkatan: []` = all forms; `sasaran: ''` = everyone)

- [ ] **Step 1: Write the failing test**

Create `test/kelas-acara.js`:

```js
// node test/kelas-acara.js — fail kelas dan acara 2026 sebenar dari sample/, data ujian semua kelas dari test/data/
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Fail kelas 2026 sebenar: Matematik T4, 4 Stanford sahaja, bermula awal tahun
const K1 = R.parseKelas(read('kelas-2026.md'), 'kelas-2026.md');
assert.strictEqual(K1.tahun, 2026);
assert.strictEqual(K1.guru, 'FALHAIND RUBIN');
assert.deepStrictEqual(K1.jadual, ['jwg-20260101-simulasi.md', 'jwg-20261002.md']);
assert.deepStrictEqual([K1.takwim, K1.acara, K1.rekod, K1.output], ['takwim-smly-2026.md', 'acara-2026.md', '../output/simulasi-4S-M3', '../output/simulasi-4S-M3']);
assert.strictEqual(K1.kelas.length, 1);
const s4 = K1.kelas[0];
assert.deepStrictEqual(
  [s4.kelas, s4.namaPenuh, s4.tingkatan, s4.subjek, s4.namaSubjek, s4.dskp, s4.rpt, s4.tutorial, s4.bilMurid, s4.mula],
  ['4S', '4 STANFORD', 4, 'M3', 'MATEMATIK', 'dskp-mat-t4.md', '../output/rpt-mat-t4-2026.md', '', 32, '1.1.1'],
);
// Jadual simulasi = salinan jadual 5.10.2026, berkuat kuasa dari 1 Jan
const sim = R.parseJadual(read('jwg-20260101-simulasi.md'));
assert.strictEqual(sim.berkuatKuasa, '2026-01-01');
assert.deepStrictEqual(sim.slots, R.parseJadual(read('jwg-20261002.md')).slots);

// Data ujian: semua 7 kelas × subjek (test/data/kelas-semua.md)
const K = R.parseKelas(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8'), 'kelas-semua.md');
assert.strictEqual(K.kelas.length, 7);
assert.strictEqual(K.kelas.find(k => k.kelas === '4H').tutorial, 'TUTORIAL');
// Setiap slot jadual ada baris dalam fail kelas (kod Subjek atau Tutorial)
const j = R.parseJadual(read('jwg-20261002.md'));
for (const s of j.slots)
  assert.ok(K.kelas.some(k => k.kelas === s.kelas && (k.subjek === s.subjek || k.tutorial === s.subjek)), `${s.subjek} ${s.kelas}`);

// Baris kelas dengan Bil. murid dan Mula; jadual beberapa versi dipisahkan koma; CRLF
const md = [
  '- Tahun: 2026', '- Guru: CIKGU', '- Takwim: t.md', '- Jadual: a.md, b.md', '- Acara: e.md', '- Rekod: r', '- Output: o',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  '| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | d.md | a.md | r.md |  | 35 | 6.2.1 |',
].join('\r\n');
const k2 = R.parseKelas(md, 'k.md');
assert.deepStrictEqual(k2.jadual, ['a.md', 'b.md']);
assert.deepStrictEqual([k2.kelas[0].bilMurid, k2.kelas[0].mula, k2.kelas[0].line], [35, '6.2.1', 10]);
assert.throws(() => R.parseKelas(md.replace('| 4 | M3', '| 6 | M3'), 'k.md'), /k\.md:10: Tingkatan "6" bukan 1–5/);
assert.throws(() => R.parseKelas(md.replace('| 35 |', '| 35 orang |'), 'k.md'), /k\.md:10: Bil\. murid "35 orang" bukan nombor/);
assert.throws(() => R.parseKelas(md.replace('| r.md |  |', '| r.md |'), 'k.md'), /k\.md:10: perlu 11 lajur/);
assert.throws(() => R.parseKelas(md.replace('- Acara: e.md', ''), 'k.md'), /k\.md: tiada baris "- Acara: …"/);

// Acara 2026: senarai pilihan guru; Batal kosong
const A = R.parseAcara(read('acara-2026.md'), 'acara-2026.md');
assert.strictEqual(A.acara.filter(a => a.nama === 'X-Break').length, 10);
assert.deepStrictEqual(A.acara.find(a => a.tarikh === '2026-10-12'), { tarikh: '2026-10-12', nama: 'X-Break', tingkatan: [] });
assert.deepStrictEqual(A.batal, []);

const A2 = R.parseAcara([
  '## Hari acara', '| Tarikh | Acara | Tingkatan |', '|---|---|---|', '| 2026-10-07 | Program Transformasi | 1 |', '| 2026-10-08 | Ceramah | 1, 2 |',
  '## Batal', '| Tarikh | Sasaran | Sebab |', '|---|---|---|', '| 2026-10-09 | 4S | Ujian SEGAK |', '| 2026-10-13 |  | Mesyuarat agung |',
].join('\n'));
assert.deepStrictEqual(A2.acara.map(a => a.tingkatan), [[1], [1, 2]]);
assert.deepStrictEqual(A2.batal, [
  { tarikh: '2026-10-09', sasaran: '4S', sebab: 'Ujian SEGAK' },
  { tarikh: '2026-10-13', sasaran: '', sebab: 'Mesyuarat agung' },
]);
assert.throws(() => R.parseAcara('## Hari acara\n| 2026-10-07 | X | 7 |', 'e.md'), /e\.md:2: Tingkatan "7" bukan 1–5/);
assert.throws(() => R.parseAcara('| 2026-10-07 | X | |', 'e.md'), /e\.md:1: baris tarikh di luar/);

console.log('kelas-acara: semua ujian lulus');
```

- [ ] **Step 2: Create the real data files**

These may already exist from the teacher's simulation (committed in Task 1 Step 0); overwrite them with exactly this content.

Create `sample/kelas-2026.md`:

```markdown
# Kelas 2026

- Tahun: 2026
- Guru: FALHAIND RUBIN
- Takwim: takwim-smly-2026.md
- Jadual: jwg-20260101-simulasi.md, jwg-20261002.md
- Acara: acara-2026.md
- Rekod: ../output/simulasi-4S-M3
- Output: ../output/simulasi-4S-M3

Satu baris bagi setiap kelas × subjek. **Subjek** = kod dalam jadual waktu. **Tutorial** = kod jadual yang menjadi tutorial kelas × subjek itu. **Mula** = SP pertama yang akan diajar (perlu jika ada DSKP dan rekod masih kosong). **Bil. murid** wajib sebelum kelas itu dirancang. Laluan fail relatif kepada folder fail ini.

Buat masa ini hanya **Matematik Tingkatan 4, 4 Stanford** dirancang, bermula awal tahun (M1, SP 1.1.1). Slot lain dalam jadual tidak dirancang. Jadual `jwg-20260101-simulasi.md` ialah salinan jadual 5.10.2026 untuk simulasi Januari – 4 Oktober; jadual sebenar berkuat kuasa mulai 5 Oktober.

**Simulasi:** rekod dan RPH ditulis ke `output/simulasi-4S-M3/`. Jalankan `node src/cli/simulasi.js --kelas sample/kelas-2026.md` untuk setahun penuh. Untuk penggunaan sebenar, tukar Rekod dan Output kepada `../rekod/2026` dan `../output/rph`, dan Mula kepada SP semasa kelas.

| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |
|---|---|---|---|---|---|---|---|---|---|---|
| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | dskp-mat-t4.md | aktiviti-umum.md | ../output/rpt-mat-t4-2026.md |  | 32 | 1.1.1 |
```

Create `sample/jwg-20260101-simulasi.md` (same `## Kelas` table as `jwg-20261002.md`; only the title, `Berkuat kuasa` and `Sumber` lines differ):

```markdown
# Jadual Waktu Guru: FALHAIND RUBIN — SIMULASI

- Sekolah: SM Lok Yuk, 89058 Kudat, Sabah
- Berkuat kuasa: 2026-01-01 (SIMULASI: salinan jadual 5.10.2026 untuk Januari – 4 Oktober 2026)
- Sumber: salinan `jwg-20261002.md`. Bukan jadual sebenar; gantikan dengan jadual yang ditukar daripada cetakan aSc jika perlu.
- Satu waktu = 30 minit. Waktu 0 bermula 6:30.

## Kelas

| Hari | Waktu | Masa | Subjek | Kelas | Bilik |
|---|---|---|---|---|---|
| Isnin | 2–3 | 7:30–8:30 | M3 | 4S | |
| Isnin | 8–9 | 10:30–11:30 | ASK | 1S | M.K |
| Selasa | 1–2 | 7:00–8:00 | M3 | 4S | |
| Selasa | 5–6 | 9:00–10:00 | PK | 2J | |
| Selasa | 8–9 | 10:30–11:30 | PK | 2D | |
| Selasa | 12–14 | 12:30–2:00 | SK | 4H | M.K |
| Rabu | 7–9 | 10:00–11:30 | M3 | 4S | |
| Rabu | 11–12 | 12:00–1:00 | ASK | 1S | M.K |
| Khamis | 1–3 | 7:00–8:30 | TUTORIAL | 4H | M.K |
| Khamis | 5–6 | 9:00–10:00 | PJ | 2D | |
| Khamis | 10–12 | 11:30–1:00 | SK | 4H | M.K |
| Jumaat | 2–3 | 7:30–8:30 | PJ | 2J | |

## Bukan kelas

| Hari | Waktu | Masa | Tanda | Maksud |
|---|---|---|---|---|
| Jumaat | 9 | 11:00–11:30 | B | Nota guru bertugas selepas tamat sekolah. Bukan PdP, tiada RPH. |

## Kod

| Kod | Maksud |
|---|---|
| M3 | Matematik |
| ASK | Asas Sains Komputer |
| SK | Sains Komputer |
| TUTORIAL | Tutorial Sains Komputer (4H) |
| PK / PJ | Pendidikan Kesihatan / Pendidikan Jasmani |
| M.K | Bilik yang dicetak pada slot (Makmal Komputer?) |

## Waktu

| Waktu | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mula | 6:30 | 7:00 | 7:30 | 8:00 | 8:30 | 9:00 | 9:30 | 10:00 | 10:30 | 11:00 | 11:30 | 12:00 | 12:30 | 1:00 | 1:30 | 2:00 | 2:30 | 3:00 | 3:30 |
```

Create `test/data/kelas-semua.md` (paths relative to `test/data/`):

```markdown
# Kelas 2026 — semua kelas (data ujian)

- Tahun: 2026
- Guru: FALHAIND RUBIN
- Takwim: ../../sample/takwim-smly-2026.md
- Jadual: ../../sample/jwg-20261002.md
- Acara: ../../sample/acara-2026.md
- Rekod: ../rekod/2026
- Output: ../output/rph

Satu baris bagi setiap kelas × subjek. **Subjek** = kod dalam jadual waktu. **Tutorial** = kod jadual yang menjadi tutorial kelas × subjek itu. **Mula** = SP pertama yang akan diajar (perlu jika ada DSKP dan rekod masih kosong). **Bil. murid** wajib sebelum kelas itu dirancang. Laluan fail relatif kepada folder fail ini.

| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |
|---|---|---|---|---|---|---|---|---|---|---|
| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | dskp-mat-t4.md | aktiviti-umum.md | ../output/rpt-mat-t4-2026.md |  |  |  |
| 1S | 1 SAPPHIRE | 1 | ASK | ASAS SAINS KOMPUTER | dskp-ask-t1.md | aktiviti-umum.md |  |  |  |  |
| 4H | 4 HARVARD | 4 | SK | SAINS KOMPUTER |  | aktiviti-umum.md |  | TUTORIAL |  |  |
| 2D | 2 DIAMOND | 2 | PK | PENDIDIKAN KESIHATAN |  | aktiviti-umum.md |  |  |  |  |
| 2J | 2 JADE | 2 | PK | PENDIDIKAN KESIHATAN |  | aktiviti-umum.md |  |  |  |  |
| 2D | 2 DIAMOND | 2 | PJ | PENDIDIKAN JASMANI |  | aktiviti-umum.md |  |  |  |  |
| 2J | 2 JADE | 2 | PJ | PENDIDIKAN JASMANI |  | aktiviti-umum.md |  |  |  |  |
```

Create `sample/acara-2026.md` (events listed in `docs/discussion.md` → "Weekday events to flag"):

```markdown
# Acara 2026 — SM Lok Yuk

- Sumber: takwim sekolah 2026 (`takwim-smly-2026.md`) dan senarai acara dalam `docs/discussion.md`
- **Hari acara**: PdP tetap dijana tetapi ditandakan; saya putuskan sama ada batal. Tingkatan kosong = semua.
- **Batal**: tiada PdP langsung pada hari itu bagi sasaran. Sasaran kosong = semua; `4` = Tingkatan 4; `4S` = kelas 4S.

## Hari acara

| Tarikh | Acara | Tingkatan |
|---|---|---|
| 2026-01-14 | Sukaneka |  |
| 2026-01-19 | X-Break |  |
| 2026-02-02 | X-Break |  |
| 2026-02-13 | Sambutan Tahun Baharu Cina |  |
| 2026-04-06 | X-Break |  |
| 2026-04-10 | Sambutan Hari Raya |  |
| 2026-04-16 | Kejohanan Olahraga |  |
| 2026-04-17 | Kejohanan Olahraga |  |
| 2026-04-29 | Karnival Koko / STEM |  |
| 2026-05-04 | X-Break |  |
| 2026-05-08 | Hari Guru & Kaamatan |  |
| 2026-06-08 | X-Break |  |
| 2026-06-10 | Merentas Desa |  |
| 2026-06-12 | Lok Yuk Day |  |
| 2026-06-18 | Dirgahayu MK / Festival Bot Naga |  |
| 2026-06-19 | Dirgahayu MK / Festival Bot Naga |  |
| 2026-07-03 | Perkhemahan |  |
| 2026-07-06 | X-Break |  |
| 2026-08-03 | X-Break |  |
| 2026-09-07 | X-Break |  |
| 2026-09-15 | Penangguhan Bulan Kebangsaan |  |
| 2026-09-18 | Zai Jian Jie Jie |  |
| 2026-09-25 | Mid-Autumn |  |
| 2026-10-02 | Majlis Graduasi |  |
| 2026-10-12 | X-Break |  |
| 2026-11-16 | X-Break |  |
| 2026-12-03 | Annual Dinner |  |

## Batal

| Tarikh | Sasaran | Sebab |
|---|---|---|
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node test/kelas-acara.js`
Expected: FAIL with `TypeError: R.parseKelas is not a function`

- [ ] **Step 4: Write the implementation**

Create `src/core/parse/kelas.js`:

```js
// kelas-<tahun>.md -> { tahun, guru, takwim, jadual: [fail], acara, rekod, output, kelas: [baris] }
// Satu baris = satu kelas × subjek. Laluan fail adalah relatif kepada folder fail kelas.
const { cells } = require('../util');

const KEPALA = ['Tahun', 'Guru', 'Takwim', 'Jadual', 'Acara', 'Rekod', 'Output'];
const LAJUR = ['Kelas', 'Nama penuh', 'Tingkatan', 'Subjek', 'Nama subjek', 'DSKP', 'Aktiviti', 'RPT', 'Tutorial', 'Bil. murid', 'Mula'];

function parseKelas(md, fail = 'kelas') {
  const meta = {};
  const kelas = [];
  md.split(/\r?\n/).forEach((line, i) => {
    const at = `${fail}:${i + 1}`;
    const m = line.match(/^- (\w+): *(.*)$/);
    if (m && KEPALA.includes(m[1])) { meta[m[1]] = m[2].trim(); return; }
    if (!/^\|/.test(line) || /^\| *(Kelas|-)/.test(line)) return;
    const c = cells(line);
    if (c.length !== LAJUR.length) throw new Error(`${at}: perlu ${LAJUR.length} lajur (${LAJUR.join(', ')}), ada ${c.length}`);
    const [k, namaPenuh, tingkatan, subjek, namaSubjek, dskp, aktiviti, rpt, tutorial, bil, mula] = c;
    if (!/^[1-5]$/.test(tingkatan)) throw new Error(`${at}: Tingkatan "${tingkatan}" bukan 1–5`);
    if (!k || !subjek || !namaPenuh || !namaSubjek) throw new Error(`${at}: Kelas, Nama penuh, Subjek dan Nama subjek wajib`);
    if (!aktiviti) throw new Error(`${at}: Aktiviti wajib (fail templat aktiviti)`);
    if (bil && !/^\d+$/.test(bil)) throw new Error(`${at}: Bil. murid "${bil}" bukan nombor`);
    kelas.push({
      kelas: k, namaPenuh, tingkatan: Number(tingkatan), subjek, namaSubjek, dskp, aktiviti, rpt, tutorial,
      bilMurid: bil ? Number(bil) : null, mula, line: i + 1,
    });
  });
  for (const k of KEPALA) if (!meta[k]) throw new Error(`${fail}: tiada baris "- ${k}: …"`);
  if (!/^\d{4}$/.test(meta.Tahun)) throw new Error(`${fail}: Tahun "${meta.Tahun}" bukan tahun`);
  if (!kelas.length) throw new Error(`${fail}: tiada baris kelas`);
  return {
    tahun: Number(meta.Tahun), guru: meta.Guru, takwim: meta.Takwim,
    jadual: meta.Jadual.split(',').map(s => s.trim()).filter(Boolean),
    acara: meta.Acara, rekod: meta.Rekod, output: meta.Output, kelas,
  };
}

module.exports = { parseKelas };
```

Create `src/core/parse/acara.js`:

```js
// acara-<tahun>.md -> { acara: [{ tarikh, nama, tingkatan: [n] }], batal: [{ tarikh, sasaran, sebab }] }
// Hari acara: PdP ditandakan (guru buat keputusan). Tingkatan kosong = semua tingkatan.
// Batal: tiada PdP langsung. Sasaran kosong = semua; '4' = Tingkatan 4; '4S' = kelas 4S.
const { cells } = require('../util');

function parseAcara(md, fail = 'acara') {
  const out = { acara: [], batal: [] };
  let section = '';
  md.split(/\r?\n/).forEach((line, i) => {
    const at = `${fail}:${i + 1}`;
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); return; }
    if (!/^\| *\d{4}-\d\d-\d\d *\|/.test(line)) return;
    const [tarikh, a = '', b = ''] = cells(line);
    if (section === 'Hari acara') {
      const tingkatan = b ? b.split(/[,\s]+/).filter(Boolean).map(Number) : [];
      if (tingkatan.some(t => !(t >= 1 && t <= 5))) throw new Error(`${at}: Tingkatan "${b}" bukan 1–5`);
      if (!a) throw new Error(`${at}: nama acara kosong`);
      out.acara.push({ tarikh, nama: a, tingkatan });
    } else if (section === 'Batal') {
      out.batal.push({ tarikh, sasaran: a, sebab: b });
    } else throw new Error(`${at}: baris tarikh di luar "## Hari acara" atau "## Batal"`);
  });
  return out;
}

module.exports = { parseAcara };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus` (`jadual`, `kelas-acara`, `rpt`).

- [ ] **Step 6: Commit**

```bash
git add src/core/parse/kelas.js src/core/parse/acara.js src/core/index.js sample/kelas-2026.md sample/jwg-20260101-simulasi.md sample/acara-2026.md test/data/kelas-semua.md test/kelas-acara.js
git commit -m "Add class list and event file formats with 2026 data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Lesson scheduler

**Files:**
- Create: `src/core/scheduler.js`
- Modify: `src/core/index.js`
- Create: `test/scheduler.js`

**Interfaces:**
- Consumes: `dayClass(day, tingkatan) → 'cuti'|'exam'|'pdp'` and `day.exam: [{ nama, forms }]` from `src/core/calendar.js` (`buildCalendar`); `versionFor`; `fmtWaktu`, `minitWaktu`, `waktuRange`; `KelasRow[]`; `parseAcara` result.
- Produces:
  - `lessonsForWeek({ kalendar, versions, kelas: KelasRow[], acara, minggu, pilihVersi = versionFor }) → Lesson[]` sorted by date then first period; slots of classes not in `kelas` are skipped; `pilihVersi(versions, tarikh)` lets Task 8 fall back to the earliest timetable
  - `Lesson = { minggu, tarikh, hari, kelas, subjek, waktu: '2–3', masa: '7:30–8:30', minit, jenis: 'pdp'|'tutorial'|'peperiksaan', acara: string }` — `subjek` is the class row's subject (a 4H TUTORIAL slot gives `subjek: 'SK', jenis: 'tutorial'`); `acara` = exam names or event names joined with `'; '`
  - `ikutMasa(a, b)` — sort comparator by `tarikh`, then first period of `waktu`
  - `slotTanpaKelas(versions, kelas) → string[]` — `'<subjek> <kelas>'` of timetable slots with no class row (for the CLI note)
  - Throws `Tiada minggu M<n> dalam takwim`; `Tiada jadual berkuat kuasa pada <date>` (from `versionFor`).

- [ ] **Step 1: Write the failing test**

Create `test/scheduler.js`:

```js
// node test/scheduler.js — takwim 2026, jadual 5.10.2026, kelas dan acara 2026 sebenar dari sample/
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const versions = [R.parseJadual(read('jwg-20261002.md'))];
const { kelas } = R.parseKelas(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8'));
const acara = R.parseAcara(read('acara-2026.md'));
const minggu = (n, a = acara) => R.lessonsForWeek({ kalendar, versions, kelas, acara: a, minggu: n });
const ringkas = l => `${l.hari} ${l.waktu} ${l.subjek} ${l.kelas} ${l.jenis}`;

// M35 (5–9 Okt): minggu biasa, 12 PdP ikut tertib hari dan waktu
const m35 = minggu(35);
assert.strictEqual(m35.length, 12);
assert.deepStrictEqual(m35.map(ringkas), [
  'Isnin 2–3 M3 4S pdp', 'Isnin 8–9 ASK 1S pdp',
  'Selasa 1–2 M3 4S pdp', 'Selasa 5–6 PK 2J pdp', 'Selasa 8–9 PK 2D pdp', 'Selasa 12–14 SK 4H pdp',
  'Rabu 7–9 M3 4S pdp', 'Rabu 11–12 ASK 1S pdp',
  'Khamis 1–3 SK 4H tutorial', 'Khamis 5–6 PJ 2D pdp', 'Khamis 10–12 SK 4H pdp',
  'Jumaat 2–3 PJ 2J pdp',
]);
assert.deepStrictEqual(m35[0], {
  minggu: 35, tarikh: '2026-10-05', hari: 'Isnin', kelas: '4S', subjek: 'M3',
  waktu: '2–3', masa: '7:30–8:30', minit: 60, jenis: 'pdp', acara: '',
});
assert.strictEqual(m35.find(l => l.jenis === 'tutorial').minit, 90);
assert.ok(m35.every(l => l.acara === '')); // program HEM / mesyuarat bukan hari acara

// M36: Isnin 12 Okt X-Break (semua tingkatan); UBBM/UBBI PAT bukan peperiksaan kelas saya
const m36 = minggu(36);
assert.deepStrictEqual(m36.filter(l => l.hari === 'Isnin').map(l => l.acara), ['X-Break', 'X-Break']);
assert.ok(m36.every(l => l.jenis !== 'peperiksaan'));

// M37: PAT Tingkatan 4 sahaja -> 4S dan 4H peperiksaan (termasuk tutorial); 1S, 2D, 2J biasa
const m37 = minggu(37);
assert.strictEqual(m37.length, 12);
for (const l of m37) assert.strictEqual(l.jenis === 'peperiksaan', ['4S', '4H'].includes(l.kelas), ringkas(l));
assert.strictEqual(m37.find(l => l.kelas === '4S').acara, 'PAT TING. 4');

// M38: PAT T4 / UASA -> semua kelas peperiksaan
assert.ok(minggu(38).every(l => l.jenis === 'peperiksaan'));

// M39: Isnin 2 Nov Cuti Peristiwa 4 -> tiada PdP Isnin
const m39 = minggu(39);
assert.strictEqual(m39.length, 10);
assert.ok(!m39.some(l => l.hari === 'Isnin'));

// Batal: ikut kelas, ikut tingkatan, atau semua; hari acara ikut tingkatan
const a2 = {
  acara: [{ tarikh: '2026-10-07', nama: 'Program Transformasi', tingkatan: [1] }],
  batal: [
    { tarikh: '2026-10-05', sasaran: '4S', sebab: 'Ujian SEGAK' },
    { tarikh: '2026-10-06', sasaran: '2', sebab: 'Lawatan' },
    { tarikh: '2026-10-09', sasaran: '', sebab: 'Mesyuarat agung' },
  ],
};
const b = minggu(35, a2);
assert.deepStrictEqual(b.filter(l => l.hari === 'Isnin').map(l => l.kelas), ['1S']);
assert.deepStrictEqual(b.filter(l => l.hari === 'Selasa').map(l => l.kelas), ['4S', '4H']);
assert.ok(!b.some(l => l.hari === 'Jumaat'));
assert.deepStrictEqual(b.filter(l => l.hari === 'Rabu').map(l => [l.kelas, l.acara]), [['4S', ''], ['1S', 'Program Transformasi']]);

// Satu subjek sahaja dalam fail kelas: slot lain tidak dirancang dan disenaraikan untuk nota CLI
const satu = kelas.filter(k => k.kelas === '4S');
assert.deepStrictEqual(R.lessonsForWeek({ kalendar, versions, kelas: satu, acara, minggu: 35 }).map(ringkas),
  ['Isnin 2–3 M3 4S pdp', 'Selasa 1–2 M3 4S pdp', 'Rabu 7–9 M3 4S pdp']);
assert.deepStrictEqual(R.slotTanpaKelas(versions, satu), ['ASK 1S', 'PK 2J', 'PK 2D', 'SK 4H', 'TUTORIAL 4H', 'PJ 2D', 'PJ 2J']);
assert.deepStrictEqual(R.slotTanpaKelas(versions, kelas), []);

// Ralat: minggu di luar takwim; tiada jadual berkuat kuasa
assert.throws(() => minggu(50), /Tiada minggu M50 dalam takwim/);
assert.throws(() => minggu(34), /Tiada jadual berkuat kuasa pada 2026-09-28/);

console.log('scheduler: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/scheduler.js`
Expected: FAIL with `TypeError: R.lessonsForWeek is not a function`

- [ ] **Step 3: Write the implementation**

Create `src/core/scheduler.js`:

```js
// Penjadual: satu minggu takwim -> senarai PdP bagi semua kelas × subjek dalam fail kelas.
//   cuti tingkatan itu atau Batal -> tiada PdP
//   peperiksaan tingkatan itu      -> jenis 'peperiksaan', acara = nama peperiksaan
//   hari acara                     -> PdP biasa, acara = nama acara (guru buat keputusan)
// Slot dengan kod Tutorial kelas itu -> jenis 'tutorial' bagi subjek kelas itu.
// Slot kelas × subjek yang tiada dalam fail kelas tidak dirancang (contoh: rancang satu subjek sahaja).
const { dayClass } = require('./calendar');
const { versionFor } = require('./timetable');
const { fmtWaktu, minitWaktu, waktuRange } = require('./util');

const ikutMasa = (a, b) => (a.tarikh < b.tarikh ? -1 : a.tarikh > b.tarikh ? 1 : waktuRange(a.waktu)[0] - waktuRange(b.waktu)[0]);

const kenaBatal = (b, tarikh, k) => b.tarikh === tarikh && (!b.sasaran || b.sasaran === String(k.tingkatan) || b.sasaran === k.kelas);

function lessonsForWeek({ kalendar, versions, kelas, acara, minggu, pilihVersi = versionFor }) {
  const w = kalendar.weeks.find(x => x.n === minggu);
  if (!w) throw new Error(`Tiada minggu M${minggu} dalam takwim`);
  const out = [];
  for (const d of w.days) {
    const v = pilihVersi(versions, d.date);
    for (const s of v.slots.filter(x => x.hari === d.hari)) {
      const k = kelas.find(x => x.kelas === s.kelas && (x.subjek === s.subjek || (x.tutorial && x.tutorial === s.subjek)));
      if (!k) continue; // kelas × subjek tiada dalam fail kelas: tidak dirancang (lihat slotTanpaKelas)
      const kelasHari = dayClass(d, k.tingkatan);
      if (kelasHari === 'cuti' || acara.batal.some(b => kenaBatal(b, d.date, k))) continue;
      const exam = kelasHari === 'exam' ? d.exam.filter(e => e.forms.includes(k.tingkatan)).map(e => e.nama) : [];
      const ev = acara.acara.filter(a => a.tarikh === d.date && (!a.tingkatan.length || a.tingkatan.includes(k.tingkatan))).map(a => a.nama);
      out.push({
        minggu, tarikh: d.date, hari: d.hari, kelas: k.kelas, subjek: k.subjek,
        waktu: fmtWaktu(s.waktu), masa: s.masa, minit: minitWaktu(s.waktu),
        jenis: exam.length ? 'peperiksaan' : s.subjek === k.subjek ? 'pdp' : 'tutorial',
        acara: [...exam, ...ev].join('; '),
      });
    }
  }
  return out.sort(ikutMasa);
}

// Slot jadual yang tiada baris dalam fail kelas -> ['ASK 1S', ...] (untuk nota CLI)
function slotTanpaKelas(versions, kelas) {
  const out = new Set();
  for (const v of versions)
    for (const s of v.slots)
      if (!kelas.some(x => x.kelas === s.kelas && (x.subjek === s.subjek || (x.tutorial && x.tutorial === s.subjek)))) out.add(`${s.subjek} ${s.kelas}`);
  return [...out];
}

module.exports = { lessonsForWeek, ikutMasa, slotTanpaKelas };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus`.

- [ ] **Step 5: Commit**

```bash
git add src/core/scheduler.js src/core/index.js test/scheduler.js
git commit -m "Add lesson scheduler (holidays, exams per form, events, Batal)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Rekod file: parse and render

**Files:**
- Create: `src/core/parse/rekod.js`, `src/core/render/rekod.js`
- Modify: `src/core/index.js`
- Create: `test/rekod.js`

**Interfaces:**
- Consumes: `cells`, `waktuRange`, `minitWaktu`.
- Produces:
  - `parseRekod(md, fail) → Row[]`, `Row = { minggu, tarikh, hari, waktu, masa, minit, jenis, acara, sp: string[], status: 'diajar'|'ditunda'|'batal'|'', kehadiran: number|null, catatan, line }`
  - `kodSel(cell) → string[]` (SP codes `n.n.n` and topic codes `n.0`, in order)
  - `renderRekod(kelasRow, tahun, rows) → md` (ignores `line`, `baru` and any extra fields); `parseRekod(renderRekod(...))` round-trips; `renderRekod(parseRekod(md))` is byte-stable.
  - `JENIS`, `STATUS` arrays.

- [ ] **Step 1: Write the failing test**

Create `test/rekod.js`:

```js
// node test/rekod.js — baca dan tulis rekod PdP satu kelas × subjek
const assert = require('assert');
const R = require('../src/core');

const k = { kelas: '4S', subjek: 'M3', namaPenuh: '4 STANFORD', tingkatan: 4, namaSubjek: 'MATEMATIK' };
const rows = [
  { minggu: 35, tarikh: '2026-10-05', hari: 'Isnin', waktu: '2–3', masa: '7:30–8:30', minit: 60, jenis: 'pdp', acara: '', sp: ['6.2.1'], status: 'diajar', kehadiran: 35, catatan: '' },
  { minggu: 35, tarikh: '2026-10-07', hari: 'Rabu', waktu: '7–9', masa: '10:00–11:30', minit: 90, jenis: 'pdp', acara: '', sp: ['6.2.2', '6.2.3'], status: 'ditunda', kehadiran: 35, catatan: 'Mesyuarat' },
  { minggu: 37, tarikh: '2026-10-19', hari: 'Isnin', waktu: '2–3', masa: '7:30–8:30', minit: 60, jenis: 'peperiksaan', acara: 'PAT TING. 4', sp: [], status: '', kehadiran: null, catatan: '' },
];
const md = R.renderRekod(k, 2026, rows);
assert.ok(md.startsWith('# Rekod 4S M3 2026\n'));
assert.ok(md.includes('| M35 | 2026-10-07 | Rabu | 7–9 | 10:00–11:30 | pdp |  | 6.2.2, 6.2.3 | ditunda | 35 | Mesyuarat |\n'));
assert.ok(md.includes('| M37 | 2026-10-19 | Isnin | 2–3 | 7:30–8:30 | peperiksaan | PAT TING. 4 |  |  |  |  |\n'));

// Pusingan: baca semula = baris asal (+ nombor baris); tulis semula = bait yang sama
const back = R.parseRekod(md, 'rekod-4S-M3.md');
assert.deepStrictEqual(back.map(({ line, ...r }) => r), rows);
assert.deepStrictEqual(back.map(r => r.line), [10, 11, 12]);
assert.strictEqual(R.renderRekod(k, 2026, back), md);

// Fail disimpan dengan CRLF di Windows dibaca sama
assert.deepStrictEqual(R.parseRekod(md.replace(/\n/g, '\r\n')), back);

// Guru menaip dengan longgar: Status huruf besar / ruang, Kehadiran '33/35', SP dengan pelbagai pemisah
const longgar = md
  .replace('| 6.2.1 | diajar | 35 |', '| 6.2.1 Membuat konjektur | Diajar  | 33/35 |')
  .replace('| 6.2.2, 6.2.3 | ditunda |', '| 6.2.2 + 6.2.3 | DITUNDA |');
const l = R.parseRekod(longgar);
assert.deepStrictEqual([l[0].sp, l[0].status, l[0].kehadiran], [['6.2.1'], 'diajar', 33]);
assert.deepStrictEqual([l[1].sp, l[1].status], [['6.2.2', '6.2.3'], 'ditunda']);
assert.deepStrictEqual(R.kodSel('4.2.7,4.2.8'), ['4.2.7', '4.2.8']);
assert.deepStrictEqual(R.kodSel('4.2.10 dan 4.2 Kod Arahan'), ['4.2.10']); // kod SK bukan SP
assert.deepStrictEqual(R.kodSel('Ulang kaji 1.0'), ['1.0']);

// Catatan dengan '|' tidak memecahkan jadual
const pipe = R.renderRekod(k, 2026, [{ ...rows[0], catatan: 'a | b' }]);
assert.strictEqual(R.parseRekod(pipe)[0].catatan, 'a / b');

// Ralat dengan nama fail dan nombor baris
const bad = (from, to) => () => R.parseRekod(md.replace(from, to), 'rekod-4S-M3.md');
assert.throws(bad('| diajar | 35 |', '| tunda | 35 |'), /rekod-4S-M3\.md:10: Status "tunda" tidak dikenali \(diajar \/ ditunda \/ batal\)/);
assert.throws(bad('| pdp |  | 6.2.1 |', '| kuliah |  | 6.2.1 |'), /rekod-4S-M3\.md:10: Jenis "kuliah" tidak dikenali/);
assert.throws(bad('| 2026-10-05 |', '| 5/10/2026 |'), /rekod-4S-M3\.md:10: Tarikh "5\/10\/2026" bukan yyyy-mm-dd/);
assert.throws(bad('| 6.2.1 | diajar |', '| 1.0, 6.2.1 | diajar |'), /rekod-4S-M3\.md:10: jangan campur kod tajuk/);
assert.throws(bad('| 35 |  |\n| M35 | 2026-10-07', '| 35 |\n| M35 | 2026-10-07'), /rekod-4S-M3\.md:10: perlu 11 lajur, ada 10/);
assert.deepStrictEqual(R.parseRekod('# Rekod kosong\n'), []);

console.log('rekod: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/rekod.js`
Expected: FAIL with `TypeError: R.renderRekod is not a function`

- [ ] **Step 3: Write the implementation**

Create `src/core/parse/rekod.js`:

```js
// rekod-<kelas>-<subjek>.md -> [baris PdP]
// Ditulis oleh src/cli/rph.js, diubah oleh guru selepas mengajar. Hanya baris jadual dibaca.
//   SP:        kod dalam sel ikut tertib (n.n.n), atau kod tajuk n.0 = ulang kaji
//   Status:    diajar / ditunda / batal (huruf besar atau kecil); kosong bagi peperiksaan
//   Kehadiran: nombor pertama dibaca ('33/35' -> 33)
const { cells, waktuRange, minitWaktu } = require('../util');

const JENIS = ['pdp', 'tutorial', 'peperiksaan'];
const STATUS = ['diajar', 'ditunda', 'batal'];
const LAJUR = 11;

const kodSel = s => String(s).match(/\b\d+\.\d+\.\d+\b|\b\d+\.0\b/g) || [];

function parseRekod(md, fail = 'rekod') {
  const rows = [];
  md.split(/\r?\n/).forEach((line, i) => {
    if (!/^\| *M\d+ *\|/.test(line)) return;
    const at = `${fail}:${i + 1}`;
    const c = cells(line);
    if (c.length !== LAJUR) throw new Error(`${at}: perlu ${LAJUR} lajur, ada ${c.length}`);
    const [m, tarikh, hari, waktu, masa, jenis, acara, sp, status, hadir, catatan] = c;
    const j = jenis.toLowerCase(), st = status.toLowerCase();
    if (!/^\d{4}-\d\d-\d\d$/.test(tarikh)) throw new Error(`${at}: Tarikh "${tarikh}" bukan yyyy-mm-dd`);
    if (!JENIS.includes(j)) throw new Error(`${at}: Jenis "${jenis}" tidak dikenali (${JENIS.join(' / ')})`);
    if (st && !STATUS.includes(st)) throw new Error(`${at}: Status "${status}" tidak dikenali (${STATUS.join(' / ')})`);
    let w;
    try { w = waktuRange(waktu); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    const kod = kodSel(sp);
    if (kod.some(k => /\.0$/.test(k)) && kod.some(k => !/\.0$/.test(k)))
      throw new Error(`${at}: jangan campur kod tajuk ulang kaji dan kod SP dalam satu baris ("${sp}")`);
    const h = hadir.match(/^\d+/);
    rows.push({
      minggu: Number(m.trim().slice(1)), tarikh, hari, waktu, masa, minit: minitWaktu(w), jenis: j, acara,
      sp: kod, status: st, kehadiran: h ? Number(h[0]) : null, catatan, line: i + 1,
    });
  });
  return rows;
}

module.exports = { parseRekod, kodSel, JENIS, STATUS };
```

Create `src/core/render/rekod.js`:

```js
// Renderer rekod: baris PdP -> rekod-<kelas>-<subjek>.md. Teks kepala dijana semula setiap kali;
// hanya baris jadual ialah data. Teks guru dalam Catatan dikekalkan ('|' ditukar kepada '/').
const sel = s => String(s == null ? '' : s).replace(/\|/g, '/');

function renderRekod(k, tahun, rows) {
  const L = [
    `# Rekod ${k.kelas} ${k.subjek} ${tahun}`, '',
    `- Kelas: ${k.namaPenuh} (Tingkatan ${k.tingkatan}) · ${k.namaSubjek}`,
    '- Status: **diajar** (lalai) · **ditunda** · **batal**. Tulis sebab atau refleksi dalam Catatan.',
    '- SP: satu atau lebih kod dipisahkan koma (contoh `4.2.7, 4.2.8`); kod tajuk (contoh `1.0`) = ulang kaji.',
    '- Baris selepas hari ini dibina semula setiap kali penjana dijalankan, kecuali jika Status, Kehadiran atau Catatan diubah. Untuk mengekalkan SP yang diubah pada baris akan datang, tulis nota dalam Catatan.',
    '',
    '| Minggu | Tarikh | Hari | Waktu | Masa | Jenis | Acara | SP | Status | Kehadiran | Catatan |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows)
    L.push(`| M${r.minggu} | ${r.tarikh} | ${r.hari} | ${r.waktu} | ${r.masa} | ${r.jenis} | ${sel(r.acara)} | ${r.sp.join(', ')} | ${r.status} | ${sel(r.kehadiran)} | ${sel(r.catatan)} |`);
  return L.join('\n') + '\n';
}

module.exports = { renderRekod };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./parse/rekod'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
  ...require('./render/rekod'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus`.

- [ ] **Step 5: Commit**

```bash
git add src/core/parse/rekod.js src/core/render/rekod.js src/core/index.js test/rekod.js
git commit -m "Add rekod file parser and renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Pacing planner (SPs per lesson from RPT time)

**Files:**
- Create: `src/core/rph-planner.js`
- Modify: `src/core/index.js`
- Create: `test/rph-planner.js`

**Interfaces:**
- Consumes: DSKP SP list from `parseDskp` (`[{ code, text, sk: { code, title }, bidang: { code, title } }]`); `Row` (Task 5) plus optional `baru: true` for rows to fill; `masaSp: Map<kod, minutes>|null` — each SP's teaching time for this class (built in Task 8 from the RPT; `null` = no RPT).
- Produces:
  - `planRows({ rows, sp, masaSp, mula, fail }) → { rows: Row[] (copies, sp filled where baru), warnings: string[], akhir: { idx, sisa: number|null, ulang, selesai: boolean } }`
  - `MIN_SISA = 15`
  - Rules (spec §5.2): generate for `baru` pdp rows; tutorial copies the latest diajar pdp row's SPs; peperiksaan `[]`; replay every diajar pdp row; ditunda / batal / tutorial / peperiksaan use no time; no RPT → one SP per lesson and every listed SP finished; DSKP done → topic codes cycling.
  - Throws `<fail>:<line>: SP <k> tiada dalam DSKP`, `<fail>:<line>: tajuk <k> tiada dalam DSKP`, `<fail>: SP Mula <k> tiada dalam DSKP`.

- [ ] **Step 1: Write the failing test**

Create `test/rph-planner.js`. The worked example uses SP times of 30, 60, 120, 10 and 100 minutes, so every expected value can be checked by hand:

```js
// node test/rph-planner.js — pemadanan SP kepada PdP ikut masa daripada RPT
const assert = require('assert');
const R = require('../src/core');

// DSKP kecil: masa SP (minit) = 30, 60, 120, 10, 100
const mk = code => ({ code, text: `Teks ${code}`, sk: { code: code.split('.').slice(0, 2).join('.'), title: 'SK' }, bidang: { code: code.split('.')[0] + '.0', title: 'Tajuk' } });
const sp = ['1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.2.1'].map(mk);
const masaSp = new Map([['1.1.1', 30], ['1.1.2', 60], ['1.1.3', 120], ['1.1.4', 10], ['1.2.1', 100]]);
let hari = 0;
const pdp = (minit, extra = {}) => ({
  minggu: 35, tarikh: `2026-10-${String(5 + hari++).padStart(2, '0')}`, hari: 'Isnin', waktu: '1–2', masa: '', minit,
  jenis: 'pdp', acara: '', sp: [], status: 'diajar', kehadiran: 35, catatan: '', baru: true, ...extra,
});
const plan = (rows, o = {}) => R.planRows({ rows, sp, masaSp, mula: '1.1.1', fail: 'rekod.md', ...o });
const spOf = p => p.rows.map(r => r.sp.join(', '));

// Contoh kerja: SP ringan berkongsi PdP, SP berat merentas PdP, tiada tanda "bersambung"
const a = plan([pdp(60), pdp(60), pdp(90), pdp(60), pdp(60), pdp(60)]);
assert.deepStrictEqual(spOf(a), ['1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.3', '1.1.4, 1.2.1', '1.2.1', '1.0']);
assert.deepStrictEqual(a.akhir, { idx: 5, sisa: null, ulang: 1, selesai: true });
assert.deepStrictEqual(a.warnings, []);

// Baris yang dijana dimainkan semula kepada keadaan yang sama (bukan lagi baharu)
const replay = plan(a.rows.map(({ baru, ...r }) => r));
assert.deepStrictEqual(spOf(replay), spOf(a));
assert.deepStrictEqual(replay.akhir, a.akhir);

// Ditunda / batal tidak menggunakan masa: PdP seterusnya bermula di tempat yang sama
hari = 0;
const t = plan([pdp(60), pdp(60, { status: 'ditunda', baru: false, sp: ['1.1.2', '1.1.3'] }), pdp(90)]);
assert.deepStrictEqual(spOf(t), ['1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.2, 1.1.3']);
assert.deepStrictEqual([t.akhir.idx, t.akhir.sisa], [2, 60]); // 1.1.3: 120 − 60 minit
hari = 0;
const bt = plan([pdp(60), pdp(60, { status: 'batal' }), pdp(60)]);
assert.deepStrictEqual(spOf(bt).filter((_, i) => i !== 1), ['1.1.1, 1.1.2', '1.1.2, 1.1.3']);

// Peraturan 15 minit: tiada sambungan < 15 minit; tiada SP baharu jika < 15 minit tinggal
hari = 0;
const p15 = R.planRows({ rows: [pdp(60), pdp(60)], sp, masaSp: new Map([['1.1.1', 70], ['1.1.2', 50]]), mula: '1.1.1' });
assert.deepStrictEqual(spOf(p15), ['1.1.1', '1.1.2']); // 70 minit dalam 60 -> baki 10 dihabiskan
hari = 0;
const n15 = R.planRows({ rows: [pdp(60)], sp, masaSp: new Map([['1.1.1', 50], ['1.1.2', 60]]), mula: '1.1.1' });
assert.deepStrictEqual(spOf(n15), ['1.1.1']); // 50 minit, tinggal 10 -> tidak mula 1.1.2
assert.deepStrictEqual([n15.akhir.idx, n15.akhir.sisa], [1, null]);

// Gabung oleh guru: semua kecuali SP terakhir selesai; yang terakhir ambil baki
hari = 0;
const g = plan([pdp(60, { baru: false, sp: ['1.1.1', '1.1.2', '1.1.3'] }), pdp(60)]);
assert.deepStrictEqual(spOf(g), ['1.1.1, 1.1.2, 1.1.3', '1.1.3']); // 1.1.3 belum bermula: 120 minit
assert.deepStrictEqual([g.akhir.idx, g.akhir.sisa], [2, 60]);
// Guru mengulang SP lama: kedudukan ikut baris itu
hari = 0;
const u = plan([pdp(60), pdp(60, { baru: false, sp: ['1.1.1'] }), pdp(60)]);
assert.deepStrictEqual(spOf(u)[2], '1.1.2'); // 1.1.2 bermula semula: 60 minit penuh

// Tutorial: ulang SP PdP diajar terakhir (bukan yang ditunda); tidak mara
hari = 0;
const tut = plan([
  pdp(60),
  pdp(60, { jenis: 'tutorial', minit: 90 }),
  pdp(60, { status: 'ditunda', baru: false, sp: ['1.1.2', '1.1.3'] }),
  pdp(90, { jenis: 'tutorial' }),
  pdp(60),
]);
assert.deepStrictEqual(spOf(tut), ['1.1.1, 1.1.2', '1.1.1, 1.1.2', '1.1.2, 1.1.3', '1.1.1, 1.1.2', '1.1.2, 1.1.3']);
// Peperiksaan: tiada SP, tidak mara
hari = 0;
const ex = plan([pdp(60, { jenis: 'peperiksaan', status: '' }), pdp(60)]);
assert.deepStrictEqual(spOf(ex), ['', '1.1.1, 1.1.2']);

// Tanpa RPT: satu SP satu PdP; DSKP habis -> ulang kaji ikut tajuk secara berkitar
hari = 0;
const sp2 = ['1.1.1', '2.1.1'].map(mk);
const nr = R.planRows({ rows: [pdp(60), pdp(90), pdp(60), pdp(60), pdp(60)], sp: sp2, mula: '1.1.1' });
assert.deepStrictEqual(spOf(nr), ['1.1.1', '2.1.1', '1.0', '2.0', '1.0']);
assert.strictEqual(nr.akhir.ulang, 3);
// Tanpa RPT, gabung oleh guru: semua SP dalam baris selesai (contoh RPH ASK: 4.2.7 + 4.2.8)
hari = 0;
const sp3 = ['4.2.7', '4.2.8', '4.2.9'].map(mk);
const ng = R.planRows({ rows: [pdp(60, { baru: false, sp: ['4.2.7', '4.2.8'] }), pdp(60)], sp: sp3, mula: '4.2.7' });
assert.deepStrictEqual(spOf(ng), ['4.2.7, 4.2.8', '4.2.9']);

// Tanpa DSKP (PK / PJ): baris tanpa SP
hari = 0;
assert.deepStrictEqual(spOf(R.planRows({ rows: [pdp(60)], sp: [] })), ['']);

// Mula bukan SP pertama; SP tiada dalam Peruntukan SP -> masa PdP + amaran
hari = 0;
const m = R.planRows({ rows: [pdp(60)], sp, masaSp: new Map([['1.1.1', 30]]), mula: '1.1.4' });
assert.deepStrictEqual(spOf(m), ['1.1.4']);
assert.deepStrictEqual(m.warnings, ['SP 1.1.4 tiada dalam Peruntukan SP; guna 60 minit']);

// Ralat dengan nombor baris
hari = 0;
assert.throws(() => plan([pdp(60, { baru: false, sp: ['9.9.9'], line: 12 })]), /rekod\.md:12: SP 9\.9\.9 tiada dalam DSKP/);
assert.throws(() => plan([pdp(60, { baru: false, sp: ['7.0'], line: 13 })]), /rekod\.md:13: tajuk 7\.0 tiada dalam DSKP/);
assert.throws(() => plan([], { mula: '9.9.9' }), /rekod\.md: SP Mula 9\.9\.9 tiada dalam DSKP/);

console.log('rph-planner: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/rph-planner.js`
Expected: FAIL with `TypeError: R.planRows is not a function`

- [ ] **Step 3: Write the implementation**

Create `src/core/rph-planner.js`:

```js
// Perancang RPH: isi SP bagi baris rekod baharu (baru: true) dan kira kedudukan kelas.
// Masa setiap SP (minit) daripada masaSp (src/core/masa-sp.js): minit sebenar kelas itu dalam
// minggu RPT tempat SP itu diletakkan. Tanpa RPT (masaSp null): satu SP satu PdP.
// SP diajar ikut tertib DSKP: SP ringan berkongsi satu PdP, SP berat merentas beberapa PdP
// (ditulis biasa pada setiap PdP — tiada tanda "bersambung").
//   - PdP diajar: minit PdP diberi kepada SP dalam sel ikut tertib; semua kecuali yang terakhir
//     selesai; yang terakhir mengambil baki dan selesai jika tinggal < MIN_SISA minit.
//   - ditunda / batal / peperiksaan / tutorial: tiada masa digunakan.
//   - tutorial baharu: ulang SP PdP diajar yang terakhir.
//   - DSKP habis: ulang kaji ikut tajuk, satu tajuk satu PdP (kod tajuk, contoh 1.0).
//   - Tanpa RPT: satu SP satu PdP; semua SP dalam baris diajar dikira selesai.
const MIN_SISA = 15;

const kodTajuk = k => /\.0$/.test(k);

function planRows({ rows, sp, masaSp = null, mula = '', fail = 'rekod' }) {
  const index = new Map(sp.map((s, i) => [s.code, i]));
  const tajuk = [...new Set(sp.map(s => s.bidang.code))];
  const warnings = [];
  let idx = mula ? index.get(mula) : 0;
  if (idx == null) throw new Error(`${fail}: SP Mula ${mula} tiada dalam DSKP`);
  let sisa = null;       // minit berbaki bagi sp[idx]; null = belum bermula
  let ulang = 0;         // bilangan PdP ulang kaji setakat ini
  let akhirDiajar = [];  // SP PdP diajar yang terakhir (untuk tutorial)

  const perlu = (i, r) => {
    if (!masaSp) return r.minit;
    const m = masaSp.get(sp[i].code);
    if (m == null) { warnings.push(`SP ${sp[i].code} tiada dalam Peruntukan SP; guna ${r.minit} minit`); return r.minit; }
    return m;
  };
  const baki = (i, r) => (i === idx && sisa != null ? sisa : perlu(i, r));

  // SP bagi PdP baharu, bermula dari kedudukan semasa (tidak mengubah keadaan)
  function jana(r) {
    if (idx >= sp.length) return [tajuk[ulang % tajuk.length]];
    const out = [];
    let ada = r.minit, i = idx, s = baki(idx, r);
    for (;;) {
      out.push(sp[i].code);
      if (s - ada >= MIN_SISA) break; // SP ini berterusan ke PdP seterusnya
      ada -= s;
      i++;
      if (i >= sp.length || ada < MIN_SISA) break;
      s = perlu(i, r);
    }
    return out;
  }

  // Kemas kini keadaan daripada satu PdP diajar (baharu atau sedia ada / diubah guru)
  function guna(r) {
    const kod = r.sp;
    if (!kod.length) return;
    if (kodTajuk(kod[0])) {
      for (const k of kod) if (!tajuk.includes(k)) throw new Error(`${fail}:${r.line}: tajuk ${k} tiada dalam DSKP`);
      ulang += kod.length;
      akhirDiajar = kod;
      return;
    }
    const is = kod.map(k => {
      const i = index.get(k);
      if (i == null) throw new Error(`${fail}:${r.line}: SP ${k} tiada dalam DSKP`);
      return i;
    });
    const last = is[is.length - 1];
    akhirDiajar = kod;
    // Tanpa RPT tiada SP yang merentas PdP: semua SP dalam baris selesai
    if (!masaSp) { idx = last + 1; sisa = null; return; }
    let ada = r.minit;
    for (const i of is.slice(0, -1)) ada -= baki(i, r);
    const s = baki(last, r) - Math.max(0, ada);
    if (s < MIN_SISA) { idx = last + 1; sisa = null; } else { idx = last; sisa = s; }
  }

  const out = rows.map(r0 => {
    const r = { ...r0 };
    if (r.baru) {
      if (r.jenis === 'pdp') r.sp = sp.length ? jana(r) : [];
      else if (r.jenis === 'tutorial') r.sp = [...akhirDiajar];
      else r.sp = [];
    }
    if (r.jenis === 'pdp' && r.status === 'diajar' && sp.length) guna(r);
    return r;
  });
  return { rows: out, warnings: [...new Set(warnings)], akhir: { idx, sisa, ulang, selesai: idx >= sp.length } };
}

module.exports = { MIN_SISA, planRows };
```

Why generate and replay agree: `jana` finishes an SP exactly when `remaining − ada < 15`, consuming `remaining`; `guna` gives all but the last SP their full remaining and the last `max(0, ada)`, finishing it when `< 15` is left — the same arithmetic, so a generated row replays to the same state (the test "Baris yang dijana dimainkan semula" pins this).

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./parse/rekod'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rph-planner'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
  ...require('./render/rekod'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus`.

- [ ] **Step 5: Commit**

```bash
git add src/core/rph-planner.js src/core/index.js test/rph-planner.js
git commit -m "Add RPH pacing planner (SP time from RPT, replay of rekod)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Rekod sync (keep past and edited rows, rebuild the rest)

**Files:**
- Create: `src/core/rekod-sync.js`
- Modify: `src/core/index.js`
- Create: `test/rekod-sync.js`

**Interfaces:**
- Consumes: `lessonsForWeek`, `ikutMasa` (Task 4); `planRows` (Task 6); `waktuRange`, `range`; `KelasRow`; `Row`.
- Produces:
  - `syncRekod({ rows, kelas, semuaKelas, sp, masaSp, kalendar, versions, acara, minggu, hariIni, fail }) → { rows: Row[] (no line / baru), minggu: number[] (weeks planned), warnings: string[] }` — the skipped-weeks warning names only weeks that have lessons (M6, a full holiday, is never "skipped")
  - `diubah(row, bilMurid) → boolean` (Status, Catatan or Kehadiran differ from the generated default)
  - Throws `Tiada minggu M<n> dalam takwim`, `<kelas> <subjek>: Bil. murid kosong dalam fail kelas`, `<kelas> <subjek>: rekod kosong dan Mula tiada dalam fail kelas`.

- [ ] **Step 1: Write the failing test**

Create `test/rekod-sync.js`:

```js
// node test/rekod-sync.js — selaras rekod 1S ASK dan 4S M3 dengan takwim, jadual dan acara 2026 sebenar
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const versions = [R.parseJadual(read('jwg-20261002.md'))];
const semuaKelas = R.parseKelas(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8')).kelas.map(k => ({ ...k, bilMurid: 30 }));
const acara = R.parseAcara(read('acara-2026.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const kelas = { ...semuaKelas.find(k => k.kelas === '1S'), bilMurid: 35, mula: '4.2.5' };

// 1S ASK, tiada RPT: satu SP satu PdP (Isnin 8–9, Rabu 11–12)
const sync = (rows, minggu, hariIni, o = {}) => R.syncRekod({
  rows, kelas, semuaKelas, sp: ask, masaSp: null,
  kalendar, versions, acara, minggu, hariIni, fail: 'rekod-1S-ASK.md', ...o,
});
const lihat = rows => rows.map(r => `M${r.minggu} ${r.tarikh} ${r.jenis} ${r.sp.join(',')} ${r.status} ${r.kehadiran}${r.acara ? ' ' + r.acara : ''}${r.catatan ? ' (' + r.catatan + ')' : ''}`);
const viaFail = rows => R.parseRekod(R.renderRekod(kelas, 2026, rows), 'rekod-1S-ASK.md'); // seperti CLI: tulis, baca semula

// Rekod kosong: rancang minggu diminta sahaja
const s1 = sync([], 35, '2026-10-03');
assert.deepStrictEqual(lihat(s1.rows), [
  'M35 2026-10-05 pdp 4.2.5 diajar 35',
  'M35 2026-10-07 pdp 4.2.6 diajar 35',
]);
assert.deepStrictEqual(s1.minggu, [35]);
assert.deepStrictEqual(s1.warnings, []);

// Dijalankan semula tanpa perubahan: rekod sama
const r1 = viaFail(s1.rows);
const s1b = sync(r1, 35, '2026-10-03');
assert.strictEqual(R.renderRekod(kelas, 2026, s1b.rows), R.renderRekod(kelas, 2026, s1.rows));

// Isnin ditunda (ditanda selepas mengajar); minggu 36 dirancang pada 5 Okt petang.
// Rabu 7 Okt (akan datang, belum diubah) dibina semula: 4.2.5 diajar dahulu.
r1[0].status = 'ditunda'; r1[0].catatan = 'Mesyuarat';
const s2 = sync(r1, 36, '2026-10-05');
assert.deepStrictEqual(lihat(s2.rows), [
  'M35 2026-10-05 pdp 4.2.5 ditunda 35 (Mesyuarat)',
  'M35 2026-10-07 pdp 4.2.5 diajar 35',
  'M36 2026-10-12 pdp 4.2.6 diajar 35 X-Break',
  'M36 2026-10-14 pdp 4.2.7 diajar 35',
]);
assert.deepStrictEqual(s2.minggu, [35, 36]);

// Baris akan datang yang diubah guru (Catatan diisi) dikekalkan dengan SP gurunya
const r2 = viaFail(s2.rows);
r2[2].sp = ['4.2.6', '4.2.7']; r2[2].catatan = 'gabung';
const s3 = sync(r2, 36, '2026-10-05');
assert.deepStrictEqual(lihat(s3.rows).slice(2), [
  'M36 2026-10-12 pdp 4.2.6,4.2.7 diajar 35 X-Break (gabung)',
  'M36 2026-10-14 pdp 4.2.8 diajar 35',
]);
// SP sahaja diubah tanpa Catatan pada baris akan datang: dibina semula (tidak dapat dikesan)
const r2b = viaFail(s2.rows);
r2b[3].sp = ['1.1.1'];
assert.deepStrictEqual(sync(r2b, 36, '2026-10-05').rows[3].sp, ['4.2.7']);

// Minggu yang terlangkau dirancang juga (diajar, kehadiran penuh) dengan amaran
const s4 = sync(viaFail(s1.rows), 37, '2026-10-17');
assert.deepStrictEqual(s4.rows.map(r => r.minggu), [35, 35, 36, 36, 37, 37]);
assert.deepStrictEqual(s4.warnings, ['1S ASK: M36 tiada dalam rekod; dirancang juga']);
assert.deepStrictEqual(sync(viaFail(s1.rows), 38, '2026-10-17').warnings, ['1S ASK: M36–M37 tiada dalam rekod; dirancang juga']);
// Minggu cuti penuh (M6) tanpa PdP bukan minggu terlangkau
const m5 = sync([], 5, '2026-02-07', { kelas: { ...kelas, mula: '1.1.1' }, versions: [{ ...versions[0], berkuatKuasa: '2026-01-01' }] });
assert.deepStrictEqual(sync(viaFail(m5.rows), 7, '2026-02-21', { kelas: { ...kelas, mula: '1.1.1' }, versions: [{ ...versions[0], berkuatKuasa: '2026-01-01' }] }).warnings, []);
// M38: UASA -> peperiksaan, tiada SP, Status dan Kehadiran kosong
const s5 = sync(viaFail(s1.rows), 38, '2026-10-17');
assert.deepStrictEqual(lihat(s5.rows.filter(r => r.minggu === 38)), [
  'M38 2026-10-26 peperiksaan   null PAT TING.4/UASA',
  'M38 2026-10-28 peperiksaan   null PAT TING.4/UASA',
]);

// PdP lepas yang dibuang guru tidak ditambah semula; baris tidak tersusun disusun semula
const rr = viaFail(s1.rows);
const s6 = sync([rr[1]], 35, '2026-10-06'); // Isnin 5 Okt dibuang; Rabu masih akan datang
assert.deepStrictEqual(s6.rows.map(r => r.tarikh), ['2026-10-07']);
const s7 = sync([rr[1], rr[0]], 35, '2026-10-03');
assert.deepStrictEqual(s7.rows.map(r => r.tarikh), ['2026-10-05', '2026-10-07']);

// Baris akan datang yang diubah tetapi slotnya tiada lagi dalam jadual: dikekalkan + amaran
const ganti = { ...rr[1], tarikh: '2026-10-06', hari: 'Selasa', waktu: '3–4', masa: '8:00–9:00', catatan: 'kelas ganti', line: 11 };
const s8 = sync([rr[0], ganti], 35, '2026-10-03');
assert.ok(s8.rows.some(r => r.catatan === 'kelas ganti'));
assert.ok(s8.warnings.includes('rekod-1S-ASK.md:11: 2026-10-06 waktu 3–4 tiada dalam jadual; baris dikekalkan, sila semak'));

// Tiada DSKP (PK): baris tanpa SP + amaran
const pk = { ...semuaKelas.find(k => k.kelas === '2D' && k.subjek === 'PK'), bilMurid: 30 };
const s9 = sync([], 35, '2026-10-03', { kelas: pk, sp: [] });
assert.deepStrictEqual(lihat(s9.rows), ['M35 2026-10-06 pdp  diajar 30']);
assert.deepStrictEqual(s9.warnings, ['2D PK: tiada DSKP; SP dibiarkan kosong']);

// Ralat: Bil. murid kosong; rekod kosong tanpa Mula
assert.throws(() => sync([], 35, '2026-10-03', { kelas: { ...kelas, bilMurid: null } }), /1S ASK: Bil\. murid kosong dalam fail kelas/);
assert.throws(() => sync([], 35, '2026-10-03', { kelas: { ...kelas, mula: '' } }), /1S ASK: rekod kosong dan Mula tiada dalam fail kelas/);

console.log('rekod-sync: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/rekod-sync.js`
Expected: FAIL with `TypeError: R.syncRekod is not a function`

- [ ] **Step 3: Write the implementation**

Create `src/core/rekod-sync.js`:

```js
// Selaraskan rekod satu kelas × subjek hingga minggu diminta.
//   - baris lepas (tarikh <= hariIni) dan baris yang diubah guru: kekal
//   - baris akan datang yang belum diubah: dibina semula daripada jadual, takwim, acara dan baris sebelumnya
//   - minggu yang belum ada dalam rekod hingga minggu diminta: dirancang (diajar, kehadiran penuh)
const { lessonsForWeek, ikutMasa } = require('./scheduler');
const { planRows } = require('./rph-planner');
const { waktuRange, range } = require('./util');

const kunci = r => `${r.tarikh} ${waktuRange(r.waktu)[0]}`;

// Diubah guru = Status, Kehadiran atau Catatan berbeza daripada nilai lalai
function diubah(r, bilMurid) {
  const exam = r.jenis === 'peperiksaan';
  return r.status !== (exam ? '' : 'diajar') || r.catatan !== '' || r.kehadiran !== (exam ? null : bilMurid);
}

function syncRekod({ rows, kelas, semuaKelas, sp, masaSp = null, kalendar, versions, acara, minggu, hariIni, fail = 'rekod' }) {
  const label = `${kelas.kelas} ${kelas.subjek}`;
  if (!kalendar.weeks.some(w => w.n === minggu)) throw new Error(`Tiada minggu M${minggu} dalam takwim`);
  if (kelas.bilMurid == null) throw new Error(`${label}: Bil. murid kosong dalam fail kelas`);
  if (!rows.length && sp.length && !kelas.mula) throw new Error(`${label}: rekod kosong dan Mula tiada dalam fail kelas`);
  const warnings = [];
  const kekal = rows.filter(r => r.tarikh <= hariIni || diubah(r, kelas.bilMurid));
  const akhirRekod = rows.length ? Math.max(...rows.map(r => r.minggu)) : null;
  const depan = rows.filter(r => r.tarikh > hariIni).map(r => r.minggu);
  const dari = akhirRekod == null ? minggu : Math.min(akhirRekod + 1, ...depan);
  const hingga = Math.max(minggu, akhirRekod || 0);

  const ada = new Set(kekal.map(kunci));
  const mingguAda = new Set(rows.map(r => r.minggu));
  const slot = new Set();
  const baru = [];
  for (let n = dari; n <= hingga; n++) {
    for (const l of lessonsForWeek({ kalendar, versions, kelas: semuaKelas, acara, minggu: n })) {
      if (l.kelas !== kelas.kelas || l.subjek !== kelas.subjek) continue;
      slot.add(kunci(l));
      if (ada.has(kunci(l))) continue;
      if (l.tarikh <= hariIni && mingguAda.has(n)) continue; // PdP lepas yang dibuang oleh guru
      const exam = l.jenis === 'peperiksaan';
      const { kelas: _k, subjek: _s, ...r } = l;
      baru.push({ ...r, sp: [], status: exam ? '' : 'diajar', kehadiran: exam ? null : kelas.bilMurid, catatan: '', baru: true });
    }
  }
  // Minggu terlangkau yang ada PdP (minggu cuti penuh tidak dikira)
  const langkau = [...new Set(baru.filter(r => akhirRekod != null && r.minggu > akhirRekod && r.minggu < minggu).map(r => r.minggu))];
  if (langkau.length) {
    const a = Math.min(...langkau), b = Math.max(...langkau);
    warnings.push(`${label}: M${a}${b > a ? `–M${b}` : ''} tiada dalam rekod; dirancang juga`);
  }
  for (const r of kekal)
    if (r.tarikh > hariIni && r.minggu >= dari && !slot.has(kunci(r)))
      warnings.push(`${fail}:${r.line}: ${r.tarikh} waktu ${r.waktu} tiada dalam jadual; baris dikekalkan, sila semak`);
  if (!sp.length && baru.some(r => r.jenis !== 'peperiksaan')) warnings.push(`${label}: tiada DSKP; SP dibiarkan kosong`);

  const p = planRows({ rows: [...kekal, ...baru].sort(ikutMasa), sp, masaSp, mula: kelas.mula, fail });
  return {
    rows: p.rows.map(({ baru: _b, line: _l, ...r }) => r),
    minggu: dari <= hingga ? range(dari, hingga) : [],
    warnings: [...warnings, ...p.warnings],
  };
}

module.exports = { syncRekod, diubah };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./parse/rekod'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rph-planner'),
  ...require('./rekod-sync'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
  ...require('./render/rekod'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus`.

- [ ] **Step 5: Commit**

```bash
git add src/core/rekod-sync.js src/core/index.js test/rekod-sync.js
git commit -m "Add rekod sync: keep past and edited rows, rebuild future rows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: SP time from the RPT's weeks, and the ahead / behind summary

**Files:**
- Create: `src/core/masa-sp.js`, `src/core/kedudukan.js`
- Modify: `src/core/index.js`
- Create: `test/kedudukan.js`

**Interfaces:**
- Consumes: `weekFor(week, tingkatan).pdp` (calendar); `lessonsForWeek` with `pilihVersi`, `versionFor`, `minitSeminggu` (Tasks 2, 4); `planRows`; `parseRpt` result.
- Produces:
  - `minitPdpMinggu({ kalendar, versions, kelas, semuaKelas, acara }) → f(n) → minutes` — the class's scheduled pdp minutes in week n (holidays, exams, Batal and tutorials removed); weeks before the first timetable use the earliest one and set `f.lalai = true`, `f.awal = '<date>'`
  - `masaSp({ rpt, sp, minitMinggu }) → Map<kod, minutes>` — SPs laid in DSKP order over the RPT's capacity weeks (RPT table weeks that list SPs); minutes = Σ overlap × `minitMinggu(week)`
  - `kedudukan({ rpt, kalendar, tingkatan, sp, akhir, masaSp, minitMinggu, seminggu, minggu }) → { status: 'ikut'|'depan'|'belakang'|'selesai'|'tiada', kod?, julat?: [a, b], beza?: number }` — beza = (minutes taught − minutes scheduled in teaching weeks before `minggu`) ÷ `seminggu`; |beza| < 0.5 → ikut
  - `teksKedudukan(label, k) → '4S M3: SP 2.1.1 · RPT M5 · ikut RPT'`
  - `muat({ sp, masaSp, akhir, pelajaran: Lesson[] }) → { perlu, ada }`
  - `ringkasanKelas({ kelas, rows, sp, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas, minggu }) → { teks: string, amaran: string[] }` (fit warning only when short by more than 30 minutes)

- [ ] **Step 1: Write the failing test**

Create `test/kedudukan.js`:

```js
// node test/kedudukan.js — masa SP dan kedudukan 4S M3 berbanding RPT Matematik T4 2026 sebenar
// (fail kelas 2026: jadual simulasi dari 1 Jan + jadual 5.10.2026)
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const K = R.parseKelas(read('kelas-2026.md'));
const versions = K.jadual.map(f => R.parseJadual(read(f)));
const acara = R.parseAcara(read('acara-2026.md'));
const mat = R.parseDskp(read('dskp-mat-t4.md'));
const ask = R.parseDskp(read('dskp-ask-t1.md'));
const plan = R.plan({ sp: mat, kesukaran: R.parseKesukaran(read('kesukaran-mat-t4.md')), kalendar, tingkatan: 4 });
const rpt = R.parseRpt(R.renderMd(plan, { subjek: 'Matematik', tahun: 2026, dskp: 'd', takwim: 't', kesukaran: 'k' }));
const s4 = K.kelas[0];

// Minit PdP sebenar 4S seminggu: 210 biasa; M11 150 (30 Mac, 2–3 Apr cuti); M20 60 (16–17 Jun cuti); M17 0 (PPT)
const minitMinggu = R.minitPdpMinggu({ kalendar, versions, kelas: s4, semuaKelas: K.kelas, acara });
assert.deepStrictEqual([1, 11, 17, 20, 30, 32].map(minitMinggu), [210, 150, 0, 60, 90, 120]);
assert.strictEqual(minitMinggu.lalai, false);

// Masa SP: jumlah = minit PdP dalam semua minggu RPT; SP dalam minggu separa mendapat masa kurang
const masaSp = R.masaSp({ rpt, sp: mat, minitMinggu });
const jumlah = [...masaSp.values()].reduce((a, b) => a + b, 0);
const kapasiti = rpt.minggu.filter(w => w.sp.length).reduce((a, w) => a + minitMinggu(w.n), 0);
assert.strictEqual(kapasiti, 6090);
assert.ok(Math.abs(jumlah - kapasiti) < 1, `${jumlah}`);
assert.ok(Math.abs(masaSp.get('6.2.2') - 0.275 * 60) < 1e-6); // seluruhnya dalam M20 (60 minit)
assert.ok(masaSp.get('1.1.1') > masaSp.get('6.2.2'));
// Tiada jadual sebelum 5 Okt: minggu awal guna jadual terawal, ditanda lalai
const lalai = R.minitPdpMinggu({ kalendar, versions: [R.parseJadual(read('jwg-20261002.md'))], kelas: s4, semuaKelas: K.kelas, acara });
assert.strictEqual(lalai(1), 210);
assert.deepStrictEqual([lalai.lalai, lalai.awal], [true, '2026-10-05']);

// Kedudukan: SP 2.1.1 bermula tepat pada awal M5 dalam RPT
const at = c => ({ idx: mat.findIndex(s => s.code === c), sisa: null, ulang: 0, selesai: false });
const k = (c, minggu) => R.kedudukan({ rpt, kalendar, tingkatan: 4, sp: mat, akhir: at(c), masaSp, minitMinggu, seminggu: 210, minggu });
assert.deepStrictEqual(k('2.1.1', 5), { status: 'ikut', kod: '2.1.1', julat: [5, 5], beza: 0 });
assert.strictEqual(R.teksKedudukan('4S M3', k('2.1.1', 5)), '4S M3: SP 2.1.1 · RPT M5 · ikut RPT');
assert.strictEqual(R.teksKedudukan('4S M3', k('2.1.1', 4)), '4S M3: SP 2.1.1 · RPT M5 · 1 minggu ke depan');
// M6 cuti penuh tidak dikira: pada M7 kelas yang masih di 2.1.1 ketinggalan satu minggu, bukan dua
assert.strictEqual(R.teksKedudukan('4S M3', k('2.1.1', 7)), '4S M3: SP 2.1.1 · RPT M5 · 1 minggu ke belakang');
// Separuh SP sudah diajar dikira (sisa)
const separuh = { ...at('2.1.1'), sisa: masaSp.get('2.1.1') / 2 };
assert.ok(R.kedudukan({ rpt, kalendar, tingkatan: 4, sp: mat, akhir: separuh, masaSp, minitMinggu, seminggu: 210, minggu: 5 }).status === 'ikut');
// Minggu separa tidak membesarkan beza kecil: 6.2.1 (dalam M20, 60 minit) pada awal M20 = ikut RPT
assert.strictEqual(k('6.2.1', 20).status, 'ikut');
assert.strictEqual(R.teksKedudukan('4S M3', R.kedudukan({ rpt, kalendar, tingkatan: 4, sp: mat, akhir: { selesai: true }, minggu: 35 })), '4S M3: DSKP selesai · ulang kaji');
assert.strictEqual(R.teksKedudukan('4S M3', R.kedudukan({ rpt: { ...rpt, minggu: [] }, kalendar, tingkatan: 4, sp: mat, akhir: at('6.2.1'), masaSp, minitMinggu, seminggu: 210, minggu: 35 })), '4S M3: SP 6.2.1 tiada dalam RPT');

// Ringkasan kelas: awal tahun ikut RPT, tiada amaran
const base = { kelas: s4, rows: [], sp: mat, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas: K.kelas };
assert.deepStrictEqual(R.ringkasanKelas({ ...base, minggu: 1 }), { teks: '4S M3: SP 1.1.1 · RPT M1 · ikut RPT', amaran: [] });
// Masih di 6.2.1 pada M35: jauh ketinggalan dan tidak muat sebelum tamat sukatan (M34)
const r35 = R.ringkasanKelas({ ...base, kelas: { ...s4, mula: '6.2.1' }, minggu: 35 });
assert.strictEqual(r35.teks, '4S M3: SP 6.2.1 · RPT M20 · 13 minggu ke belakang');
assert.match(r35.amaran[0], /^4S M3: perlu \d+ minit untuk SP berbaki, ada 0 minit hingga M34; pertimbang gabung SP$/);
// Muat: SP terakhir 10.1.2 (249 minit) dalam M35–M36 (420 minit) -> tiada amaran; dari 9.1.1 tidak muat
assert.deepStrictEqual(R.ringkasanKelas({ ...base, kelas: { ...s4, mula: '10.1.2' }, rpt: { ...rpt, tamat: 36 }, minggu: 35 }).amaran, []);
assert.match(R.ringkasanKelas({ ...base, kelas: { ...s4, mula: '9.1.1' }, rpt: { ...rpt, tamat: 36 }, minggu: 35 }).amaran[0], /ada 420 minit hingga M36/);
assert.deepStrictEqual(R.muat({ sp: mat, masaSp, akhir: { idx: mat.length - 1, sisa: 100 }, pelajaran: [{ minit: 60 }] }), { perlu: 100, ada: 60 });

// Tanpa RPT / tanpa DSKP
const s1 = { kelas: '1S', subjek: 'ASK', tingkatan: 1, mula: '4.2.5' };
assert.deepStrictEqual(R.ringkasanKelas({ ...base, kelas: s1, sp: ask, rpt: null, masaSp: null, minggu: 35 }), { teks: '1S ASK: SP 4.2.5 · tiada RPT', amaran: [] });
assert.deepStrictEqual(R.ringkasanKelas({ ...base, kelas: { kelas: '2D', subjek: 'PK', tingkatan: 2 }, sp: [], rpt: null, masaSp: null, minggu: 35 }), { teks: '2D PK: tiada DSKP', amaran: [] });

console.log('kedudukan: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kedudukan.js`
Expected: FAIL with `TypeError: R.kedudukan is not a function`

- [ ] **Step 3: Write the implementation**

Create `src/core/masa-sp.js`:

```js
// Masa setiap SP bagi satu kelas (minit), ikut kedudukan SP dalam RPT beku.
// SP menduduki selang [mula, mula + minggu] di atas minggu berkapasiti RPT (minggu yang ada SP),
// ikut tertib DSKP. Masa SP = jumlah tindihan dengan setiap minggu × minit PdP sebenar kelas itu
// dalam minggu tersebut. Minggu separa (cuti, Batal) memberi masa kurang, jadi kelas yang tidak
// terganggu sentiasa mengikut RPT; hanya PdP ditunda / batal dalam rekod membuat kelas ketinggalan.
const { lessonsForWeek } = require('./scheduler');
const { versionFor } = require('./timetable');

function masaSp({ rpt, sp, minitMinggu }) {
  const minggu = rpt.minggu.filter(w => w.sp.length).map(w => w.n);
  const out = new Map();
  let pos = 0;
  for (const s of sp) {
    const w = rpt.peruntukan.get(s.code);
    if (w == null) continue;
    let m = 0;
    minggu.forEach((n, i) => {
      const o = Math.min(pos + w, i + 1) - Math.max(pos, i);
      if (o > 0) m += o * minitMinggu(n);
    });
    out.set(s.code, m);
    pos += w;
  }
  return out;
}

// Minit PdP sebenar kelas × subjek dalam minggu n (tanpa cuti, peperiksaan, Batal dan tutorial).
// Minggu sebelum jadual pertama berkuat kuasa: guna jadual terawal (lalai = true).
function minitPdpMinggu({ kalendar, versions, kelas, semuaKelas, acara }) {
  const awal = versions.reduce((a, v) => (!a || v.berkuatKuasa < a.berkuatKuasa ? v : a), null);
  const pilihVersi = (vs, tarikh) => {
    if (vs.some(v => v.berkuatKuasa <= tarikh)) return versionFor(vs, tarikh);
    f.lalai = true;
    return awal;
  };
  const cache = new Map();
  const f = n => {
    if (!cache.has(n))
      cache.set(n, lessonsForWeek({ kalendar, versions, kelas: semuaKelas, acara, minggu: n, pilihVersi })
        .filter(l => l.kelas === kelas.kelas && l.subjek === kelas.subjek && l.jenis === 'pdp')
        .reduce((a, l) => a + l.minit, 0));
    return cache.get(n);
  };
  f.lalai = false;
  f.awal = awal && awal.berkuatKuasa;
  return f;
}

module.exports = { masaSp, minitPdpMinggu };
```

Create `src/core/kedudukan.js`:

```js
// Kedudukan kelas berbanding RPT beku (dipaparkan oleh CLI sahaja, bukan pada RPH).
// Beza = (minit kandungan SP yang telah diajar − minit PdP yang dijadualkan dalam minggu PdP
// sebelum minggu diminta) ÷ minit seminggu kelas itu. Beza < 0.5 minggu = ikut RPT; selainnya
// dibundarkan kepada minggu ke depan / ke belakang. Diukur dalam minit supaya minggu separa
// (contoh M20: dua hari cuti) tidak membesarkan beza yang kecil.
const { weekFor } = require('./calendar');
const { lessonsForWeek } = require('./scheduler');
const { planRows } = require('./rph-planner');
const { versionFor, minitSeminggu } = require('./timetable');

function kedudukan({ rpt, kalendar, tingkatan, sp, akhir, masaSp, minitMinggu, seminggu, minggu }) {
  if (akhir.selesai) return { status: 'selesai' };
  const kod = sp[akhir.idx].code;
  const julat = rpt.minggu.filter(w => w.sp.includes(kod)).map(w => w.n);
  if (!julat.length) return { status: 'tiada', kod };
  let diajar = 0;
  for (let i = 0; i < akhir.idx; i++) diajar += masaSp.get(sp[i].code) || 0;
  if (akhir.sisa != null) diajar += (masaSp.get(kod) || 0) - akhir.sisa;
  const jangka = kalendar.weeks.filter(w => w.n < minggu && weekFor(w, tingkatan).pdp > 0).reduce((a, w) => a + minitMinggu(w.n), 0);
  const beza = (diajar - jangka) / seminggu;
  const status = Math.abs(beza) < 0.5 ? 'ikut' : beza > 0 ? 'depan' : 'belakang';
  return { status, kod, julat: [Math.min(...julat), Math.max(...julat)], beza: status === 'ikut' ? 0 : Math.round(Math.abs(beza)) };
}

function teksKedudukan(label, k) {
  if (k.status === 'selesai') return `${label}: DSKP selesai · ulang kaji`;
  if (k.status === 'tiada') return `${label}: SP ${k.kod} tiada dalam RPT`;
  const rpt = `RPT M${k.julat[0]}${k.julat[1] > k.julat[0] ? `–M${k.julat[1]}` : ''}`;
  const kini = k.status === 'ikut' ? 'ikut RPT' : `${k.beza} minggu ke ${k.status}`;
  return `${label}: SP ${k.kod} · ${rpt} · ${kini}`;
}

// Minit untuk SP berbaki vs minit PdP yang dijadualkan (pelajaran) hingga minggu tamat sukatan
function muat({ sp, masaSp, akhir, pelajaran }) {
  let perlu = 0;
  for (let i = akhir.idx; i < sp.length; i++)
    perlu += i === akhir.idx && akhir.sisa != null ? akhir.sisa : masaSp.get(sp[i].code) || 0;
  return { perlu, ada: pelajaran.reduce((a, l) => a + l.minit, 0) };
}

// Satu baris ringkasan + amaran "tidak muat" bagi satu kelas × subjek pada awal minggu diminta
function ringkasanKelas({ kelas, rows, sp, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas, minggu }) {
  const w = kalendar.weeks.find(x => x.n === minggu);
  const seminggu = minitSeminggu(versionFor(versions, w.days[0].date), kelas.kelas, kelas.subjek);
  const label = `${kelas.kelas} ${kelas.subjek}`;
  if (!sp.length) return { teks: `${label}: tiada DSKP`, amaran: [] };
  const sebelum = rows.filter(r => r.minggu < minggu);
  const { akhir } = planRows({ rows: sebelum, sp, masaSp: rpt ? masaSp : null, mula: kelas.mula });
  if (!rpt) return { teks: `${label}: ${akhir.selesai ? 'DSKP selesai' : `SP ${sp[akhir.idx].code}`} · tiada RPT`, amaran: [] };
  const teks = teksKedudukan(label, kedudukan({ rpt, kalendar, tingkatan: kelas.tingkatan, sp, akhir, masaSp, minitMinggu, seminggu, minggu }));
  if (akhir.selesai) return { teks, amaran: [] };
  const pelajaran = [];
  for (let n = minggu; n <= rpt.tamat; n++)
    pelajaran.push(...lessonsForWeek({ kalendar, versions, kelas: semuaKelas, acara, minggu: n })
      .filter(l => l.kelas === kelas.kelas && l.subjek === kelas.subjek && l.jenis === 'pdp'));
  const m = muat({ sp, masaSp, akhir, pelajaran });
  const amaran = m.perlu > m.ada + 30 // satu waktu: peraturan 15 minit boleh menambah sedikit masa
    ? [`${label}: perlu ${Math.round(m.perlu)} minit untuk SP berbaki, ada ${m.ada} minit hingga M${rpt.tamat}; pertimbang gabung SP`]
    : [];
  return { teks, amaran };
}

module.exports = { kedudukan, teksKedudukan, muat, ringkasanKelas };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./parse/rekod'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rph-planner'),
  ...require('./masa-sp'),
  ...require('./rekod-sync'),
  ...require('./kedudukan'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
  ...require('./render/rekod'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus`.

- [ ] **Step 5: Commit**

```bash
git add src/core/masa-sp.js src/core/kedudukan.js src/core/index.js test/kedudukan.js
git commit -m "Add SP time from RPT weeks and ahead/behind summary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Activity template and RPH page renderer

**Files:**
- Create: `sample/aktiviti-umum.md`
- Create: `src/core/parse/aktiviti.js`, `src/core/render/rph.js`
- Modify: `src/core/index.js`
- Create: `test/rph-render.js`

**Interfaces:**
- Consumes: `waktuRange`, `range`, `minitMula`, `jam24`, `fmtTarikh`; `Row`; `KelasRow`; DSKP SP list.
- Produces:
  - `parseAktiviti(md, fail) → { permulaan: string[], perkembangan: string[], penutup: string[] }`
  - `renderRph({ tahun, minggu, guru, pages: [{ kelas: KelasRow, row: Row, sp, aktiviti }] }) → html` (one `<section class="rph">` per non-batal row, A4 portrait)
  - `kandungan(row, sp) → { ulang, tajuk: string[], sk: string[], sp: string[] }`

- [ ] **Step 1: Write the failing test**

Create `test/rph-render.js` (expected strings come from `sample/2026 - ASK T1 - Google Sheets M34A.pdf`):

```js
// node test/rph-render.js — halaman RPH ikut susun atur RPH ASK T1 M34 (sample/)
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Templat aktiviti
const akt = R.parseAktiviti(read('aktiviti-umum.md'), 'aktiviti-umum.md');
assert.deepStrictEqual(akt.permulaan, ['Set induksi', 'Guru memberi situasi dan mengaitkan dengan tajuk pelajaran']);
assert.strictEqual(akt.perkembangan.length, 6);
assert.deepStrictEqual(akt.penutup, ['Guru membuat rumusan pelajaran hari ini.']);
assert.throws(() => R.parseAktiviti('## Permulaan\n- a\n## Penutup\n- c', 'a.md'), /a\.md: tiada senarai "- …" di bawah "## Perkembangan"/);

const ask = R.parseDskp(read('dskp-ask-t1.md'));
const kelas = { kelas: '1S', subjek: 'ASK', namaPenuh: '1 SAPPHIRE', tingkatan: 1, namaSubjek: 'ASAS SAINS KOMPUTER', bilMurid: 35 };
const row = (o = {}) => ({
  minggu: 34, tarikh: '2026-09-29', hari: 'Selasa', waktu: '3–4', masa: '8:00–9:00', minit: 60, jenis: 'pdp', acara: '',
  sp: ['4.2.7', '4.2.8'], status: 'diajar', kehadiran: 35, catatan: '', ...o,
});
const html = pages => R.renderRph({ tahun: 2026, minggu: 34, guru: 'FALHAIND RUBIN', pages: pages.map(r => ({ kelas, row: r, sp: ask, aktiviti: akt })) });
const teks = h => h.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ');

// Seperti contoh RPH ASK T1 M34
const h = teks(html([row()]));
for (const s of [
  '2026 - ASK T1', 'M34', 'RANCANGAN PENGAJARAN HARIAN',
  'NAMA GURU FALHAIND RUBIN', 'MATA PELAJARAN ASAS SAINS KOMPUTER',
  'MINGGU / TARIKH / HARI 34 29/09/2026 SELASA', 'TINGKATAN 1 SAPPHIRE',
  'MASA 0800 - 0830\n0830 - 0900', 'KEHADIRAN 35 / 35',
  'TAJUK 4.0 KOD ARAHAN', 'STANDARD KANDUNGAN 4.2 Kod Arahan HTML',
  '4.2.7 Menghasilkan pull down menu melalui atur cara HTML.\n4.2.8 Menghasilkan ruang komen melalui atur cara HTML.',
  'OBJEKTIF PEMBELAJARAN Murid dapat:',
  'Permulaan: (5 minit)\n- Set induksi', 'Perkembangan: (50 minit)', 'Penutup: (5 minit)\n- Guru membuat rumusan pelajaran hari ini.',
  '☑ Objektif tercapai. Semua murid mampu menguasai kemahiran yang dipelajari.', '☐ PdP ditunda kerana:',
]) assert.ok(h.includes(s), `tiada: ${s}`);
assert.ok(!/bersambung|samb\./i.test(h));
assert.ok(!h.includes('CATATAN'));
assert.strictEqual((html([row()]).match(/<section class="rph">/g) || []).length, 1);

// PdP 90 minit -> Perkembangan 80 minit; tutorial; hari acara; ditunda dengan sebab; batal tidak dicetak
const h2 = teks(html([
  row({ waktu: '7–9', minit: 90, jenis: 'tutorial', acara: 'X-Break' }),
  row({ status: 'ditunda', catatan: 'Mesyuarat guru' }),
  row({ status: 'batal' }),
  row({ catatan: 'Murid aktif' }),
]));
assert.strictEqual((h2.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 3);
assert.ok(h2.includes('Perkembangan: (80 minit)'));
assert.ok(h2.includes('MASA 1000 - 1030\n1030 - 1100\n1100 - 1130'));
assert.ok(h2.includes('MATA PELAJARAN ASAS SAINS KOMPUTER (TUTORIAL)'));
assert.ok(h2.includes('CATATAN Hari acara: X-Break'));
assert.ok(h2.includes('☐ Objektif tercapai. Semua murid') && h2.includes('☑ PdP ditunda kerana: Mesyuarat guru'));
assert.ok(h2.includes('Murid aktif'));

// Peperiksaan: tajuk PEPERIKSAAN, tiada SP / aktiviti / refleksi
const h3 = teks(html([row({ jenis: 'peperiksaan', acara: 'PAT TING.4/UASA', sp: [], status: '', kehadiran: null })]));
assert.ok(h3.includes('CATATAN Peperiksaan: PAT TING.4/UASA') && h3.includes('TAJUK PEPERIKSAAN'));
assert.ok(!h3.includes('RINGKASAN AKTIVITI') && !h3.includes('REFLEKSI'));
assert.ok(h3.includes('KEHADIRAN / 35'));

// Ulang kaji tajuk: semua SK dan SP tajuk itu
const h4 = teks(html([row({ sp: ['1.0'] })]));
assert.ok(h4.includes('TAJUK ULANG KAJI: 1.0 KONSEP ASAS PEMIKIRAN KOMPUTASIONAL'));
assert.ok(h4.includes('1.1.1 Menerangkan teknik Leraian') && h4.includes('1.1.5 Menentukan ciri-ciri kesamaan'));

// Tiada DSKP: medan kosong untuk diisi sendiri; teks dilepaskan (escape) untuk HTML
const h5 = html([row({ sp: [], catatan: '<b>x</b>' })]);
assert.ok(h5.includes('&lt;b&gt;x&lt;/b&gt;'));

console.log('rph-render: semua ujian lulus');
```

- [ ] **Step 2: Create the activity template**

Create `sample/aktiviti-umum.md` (text copied from the ASK T1 M34 RPH):

```markdown
# Aktiviti PdP — templat umum

- Sumber: RPH ASK T1 M34 (`2026 - ASK T1 - Google Sheets M34A.pdf`)
- Masa tidak ditulis di sini: Permulaan 5 minit, Penutup 5 minit, Perkembangan = masa PdP − 10 minit.
- Satu baris `- ` = satu aktiviti. Boleh disalin dan diubah untuk satu subjek (contoh `aktiviti-mat.md`), kemudian tukar lajur Aktiviti dalam fail kelas.

## Permulaan

- Set induksi
- Guru memberi situasi dan mengaitkan dengan tajuk pelajaran

## Perkembangan

- Guru memberikan penerangan berkaitan tajuk.
- Guru memberikan contoh setelah menerangkan topik kepada murid.
- Murid dipilih secara rawak untuk mengulas dan memberikan tindak balas berkenaan topik perbincangan.
- Bersoal jawab dengan murid.
- Murid diberi latihan pengukuhan.
- Perbincangan bersama murid berdasarkan tugasan yang diberikan.

## Penutup

- Guru membuat rumusan pelajaran hari ini.
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node test/rph-render.js`
Expected: FAIL with `TypeError: R.parseAktiviti is not a function`

- [ ] **Step 4: Write the implementation**

Create `src/core/parse/aktiviti.js`:

```js
// aktiviti-*.md -> { permulaan: [teks], perkembangan: [teks], penutup: [teks] }
// Senarai '- ' di bawah '## Permulaan', '## Perkembangan', '## Penutup'. Masa dikira oleh renderer RPH.
const BAHAGIAN = ['Permulaan', 'Perkembangan', 'Penutup'];

function parseAktiviti(md, fail = 'aktiviti') {
  const out = { permulaan: [], perkembangan: [], penutup: [] };
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) { cur = BAHAGIAN.includes(h[1].trim()) ? h[1].trim().toLowerCase() : null; continue; }
    const m = line.match(/^- (.+)/);
    if (m && cur) out[cur].push(m[1].trim());
  }
  for (const b of BAHAGIAN) if (!out[b.toLowerCase()].length) throw new Error(`${fail}: tiada senarai "- …" di bawah "## ${b}"`);
  return out;
}

module.exports = { parseAktiviti };
```

Create `src/core/render/rph.js`:

```js
// Renderer RPH: satu halaman A4 bagi setiap PdP, susun atur seperti RPH Google Sheets
// (sample/2026 - ASK T1 - Google Sheets M34A.pdf). PdP batal tidak dicetak.
// Tiada tanda "bersambung": SP yang merentas PdP ditulis biasa pada setiap PdP.
const { waktuRange, range, minitMula, jam24, fmtTarikh } = require('../util');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const uniq = xs => [...new Map(xs.map(x => [x.code, x])).values()];

function kandungan(row, sp) {
  const byCode = new Map(sp.map(s => [s.code, s]));
  const ulang = row.sp.length > 0 && row.sp.every(c => /\.0$/.test(c));
  const list = ulang ? sp.filter(s => row.sp.includes(s.bidang.code)) : row.sp.map(c => byCode.get(c)).filter(Boolean);
  return {
    ulang,
    tajuk: uniq(list.map(s => s.bidang)).map(b => `${b.code} ${b.title.toUpperCase()}`),
    sk: uniq(list.map(s => s.sk)).map(s => `${s.code} ${s.title}`),
    sp: list.map(s => `${s.code} ${s.text}`),
  };
}

function halaman({ tahun, minggu, guru, kelas: k, row, sp, aktiviti }) {
  const exam = row.jenis === 'peperiksaan';
  const c = kandungan(row, sp);
  const [a, b] = waktuRange(row.waktu);
  const masa = range(a, b).map(p => `${jam24(minitMula(p))} - ${jam24(minitMula(p + 1))}`);
  const baris = [
    ['NAMA GURU', [guru]],
    ['MATA PELAJARAN', [k.namaSubjek + (row.jenis === 'tutorial' ? ' (TUTORIAL)' : '')]],
    ['MINGGU / TARIKH / HARI', [`${row.minggu} ${fmtTarikh(row.tarikh)} ${row.hari.toUpperCase()}`]],
    ['TINGKATAN', [k.namaPenuh]],
    ['MASA', masa],
    ['KEHADIRAN', [`${row.kehadiran == null ? '' : row.kehadiran} / ${k.bilMurid}`]],
  ];
  if (row.acara) baris.push(['CATATAN', [exam ? `Peperiksaan: ${row.acara}` : `Hari acara: ${row.acara}`]]);
  if (exam) baris.push(['TAJUK', ['PEPERIKSAAN']]);
  else {
    const t = (c.ulang ? 'ULANG KAJI: ' : '') + c.tajuk.join(' / ');
    const p = row.minit - 10;
    const tanda = (on, teks) => `${on ? '☑' : '☐'} ${teks}`;
    const ditunda = row.status === 'ditunda';
    baris.push(
      ['TAJUK', [t]],
      ['STANDARD KANDUNGAN', c.sk],
      ['STANDARD PEMBELAJARAN', c.sp],
      ['OBJEKTIF PEMBELAJARAN', ['Murid dapat:', '', ...c.sp]],
      ['RINGKASAN AKTIVITI', [
        'Permulaan: (5 minit)', ...aktiviti.permulaan.map(x => `- ${x}`), '',
        `Perkembangan: (${p} minit)`, ...aktiviti.perkembangan.map(x => `- ${x}`), '',
        'Penutup: (5 minit)', ...aktiviti.penutup.map(x => `- ${x}`),
      ]],
      ['REFLEKSI', [
        tanda(!ditunda, 'Objektif tercapai. Semua murid mampu menguasai kemahiran yang dipelajari.'),
        tanda(false, 'Objektif tercapai oleh ___ orang murid sahaja. ___ orang murid diberikan latihan pengukuhan.'),
        tanda(ditunda, `PdP ditunda kerana: ${ditunda ? row.catatan : ''}`),
        ...(!ditunda && row.catatan ? ['', row.catatan] : []),
      ]],
    );
  }
  const tr = baris.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${v.map(x => (x ? esc(x) : '&nbsp;')).join('<br>')}</td></tr>`).join('\n');
  return `<section class="rph">
<div class="kepala"><span>${esc(`${tahun} - ${k.subjek} T${k.tingkatan}`)}</span><span>M${minggu}</span></div>
<h1>RANCANGAN PENGAJARAN HARIAN</h1>
<table>
${tr}
</table>
</section>`;
}

function renderRph({ tahun, minggu, guru, pages }) {
  const subjek = pages.length ? pages[0].kelas.subjek : '';
  const body = pages.filter(p => p.row.status !== 'batal').map(p => halaman({ tahun, minggu, guru, ...p })).join('\n');
  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${esc(`RPH ${tahun} ${subjek} M${minggu}`)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font: 10pt/1.35 Arial, sans-serif; color: #000; background: #fff; margin: 16px; }
.rph { break-after: page; page-break-after: always; }
.rph:last-child { break-after: auto; page-break-after: auto; }
.kepala { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 8px; }
h1 { font-size: 13pt; text-align: center; margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; text-align: left; }
th { width: 30%; background: #eee; font-weight: bold; }
</style></head><body>
${body}
</body></html>
`;
}

module.exports = { renderRph, kandungan };
```

Replace `src/core/index.js` with:

```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./parse/rekod'),
  ...require('./parse/aktiviti'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rph-planner'),
  ...require('./masa-sp'),
  ...require('./rekod-sync'),
  ...require('./kedudukan'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
  ...require('./render/rekod'),
  ...require('./render/rph'),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node test/semua.js`
Expected: every file prints `semua ujian lulus`.

- [ ] **Step 6: Commit**

```bash
git add sample/aktiviti-umum.md src/core/parse/aktiviti.js src/core/render/rph.js src/core/index.js test/rph-render.js
git commit -m "Add activity template and RPH page renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: CLIs `src/cli/rph.js` and `src/cli/simulasi.js` (end to end)

**Files:**
- Create: `src/cli/rph.js`, `src/cli/simulasi.js`
- Create: `test/rph-cli.js`

**Interfaces:**
- Consumes: everything exported from `src/core` above.
- Produces:
  - `node src/cli/rph.js --kelas <file> --minggu <n|Mn> [--hari-ini yyyy-mm-dd]`. Writes `<Rekod>/rekod-<kelas>-<subjek>.md` and `<Output>/<tahun>-M<n>-<SUBJEK>.html` only after every class succeeded; prints HTML paths, `Tidak dirancang (tiada dalam fail kelas): …` when the timetable has other classes, then `Amaran: …` (stderr), then one summary line per class. On error: `Ralat: <message>` (stderr), exit 1.
  - `node src/cli/simulasi.js --kelas <file> [--dari 1] [--hingga 43]` — runs `rph.js` for each week as if on the Saturday before it; prints `M<n> (<Saturday>) <summary line>` and warnings.

- [ ] **Step 1: Write the failing test**

Create `test/rph-cli.js` (runs the CLI in a temp folder against the real samples):

```js
// node test/rph-cli.js — jalankan src/cli/rph.js hujung ke hujung dalam folder sementara,
// dengan takwim, jadual, acara, DSKP dan RPT Matematik T4 2026 sebenar.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { spawnSync } = require('child_process');
const R = require('../src/core');

const sample = path.join(__dirname, '..', 'sample');
const cli = path.join(__dirname, '..', 'src', 'cli', 'rph.js');
const read = f => fs.readFileSync(path.join(sample, f), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rph-'));
const s = f => path.join(sample, f);

// RPT Matematik T4 dengan lampiran Peruntukan SP
const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const plan = R.plan({ sp: R.parseDskp(read('dskp-mat-t4.md')), kesukaran: R.parseKesukaran(read('kesukaran-mat-t4.md')), kalendar, tingkatan: 4 });
fs.writeFileSync(path.join(tmp, 'rpt-mat.md'), R.renderMd(plan, { subjek: 'Matematik', tahun: 2026, dskp: 'd', takwim: 't', kesukaran: 'k' }));
const akt = s('aktiviti-umum.md');
fs.writeFileSync(path.join(tmp, 'kelas.md'), [
  '- Tahun: 2026', '- Guru: FALHAIND RUBIN', `- Takwim: ${s('takwim-smly-2026.md')}`, `- Jadual: ${s('jwg-20261002.md')}`,
  `- Acara: ${s('acara-2026.md')}`, '- Rekod: rekod', '- Output: out', '',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  `| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | ${s('dskp-mat-t4.md')} | ${akt} | rpt-mat.md |  | 35 | 7.1.1 |`,
  `| 1S | 1 SAPPHIRE | 1 | ASK | ASAS SAINS KOMPUTER | ${s('dskp-ask-t1.md')} | ${akt} |  |  | 35 | 4.2.5 |`,
  `| 4H | 4 HARVARD | 4 | SK | SAINS KOMPUTER |  | ${akt} |  | TUTORIAL | 30 |  |`,
  `| 2D | 2 DIAMOND | 2 | PK | PENDIDIKAN KESIHATAN |  | ${akt} |  |  | 30 |  |`,
  `| 2J | 2 JADE | 2 | PK | PENDIDIKAN KESIHATAN |  | ${akt} |  |  | 31 |  |`,
  `| 2D | 2 DIAMOND | 2 | PJ | PENDIDIKAN JASMANI |  | ${akt} |  |  | 30 |  |`,
  `| 2J | 2 JADE | 2 | PJ | PENDIDIKAN JASMANI |  | ${akt} |  |  | 31 |  |`,
].join('\n'));

const run = (...args) => {
  const r = spawnSync(process.execPath, [cli, '--kelas', path.join(tmp, 'kelas.md'), ...args], { encoding: 'utf8', cwd: tmp });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const t = f => fs.readFileSync(path.join(tmp, f), 'utf8');
const snapshot = () => Object.fromEntries(['rekod', 'out'].flatMap(d => fs.readdirSync(path.join(tmp, d)).map(f => [`${d}/${f}`, t(`${d}/${f}`)])));

// Larian pertama: M35, hari ini Sabtu 3 Okt
const r1 = run('--minggu', 'M35', '--hari-ini', '2026-10-03');
assert.strictEqual(r1.code, 0, r1.err);
assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'out')).sort(),
  ['2026-M35-ASK.html', '2026-M35-M3.html', '2026-M35-PJ.html', '2026-M35-PK.html', '2026-M35-SK.html']);
assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'rekod')).sort(),
  ['rekod-1S-ASK.md', 'rekod-2D-PJ.md', 'rekod-2D-PK.md', 'rekod-2J-PJ.md', 'rekod-2J-PK.md', 'rekod-4H-SK.md', 'rekod-4S-M3.md']);

// 4S M3 (dalam RPT M22–M23, minggu penuh 210 minit): 7.1.1 = 0.275 × 210 = 58 minit -> Isnin;
// 7.1.2 = 115 minit -> Selasa dan Rabu; Rabu (90 minit) juga mula 7.1.3
const m3 = R.parseRekod(t('rekod/rekod-4S-M3.md'));
assert.deepStrictEqual(m3.map(r => [r.tarikh, r.sp.join(', '), r.status, r.kehadiran]), [
  ['2026-10-05', '7.1.1', 'diajar', 35], ['2026-10-06', '7.1.2', 'diajar', 35], ['2026-10-07', '7.1.2, 7.1.3', 'diajar', 35],
]);
// 1S ASK tanpa RPT: satu SP satu PdP; 4H SK tanpa DSKP: tutorial Khamis
assert.deepStrictEqual(R.parseRekod(t('rekod/rekod-1S-ASK.md')).map(r => r.sp.join()), ['4.2.5', '4.2.6']);
assert.deepStrictEqual(R.parseRekod(t('rekod/rekod-4H-SK.md')).map(r => r.jenis), ['pdp', 'tutorial', 'pdp']);
// HTML: satu RPH bagi setiap PdP; kehadiran ikut kelas
const htmlPk = t('out/2026-M35-PK.html');
assert.strictEqual((htmlPk.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 2);
assert.ok(htmlPk.includes('31 / 31') && htmlPk.includes('30 / 30'));
assert.ok(t('out/2026-M35-M3.html').includes('Perkembangan: (80 minit)'));
// Ringkasan dan amaran
assert.match(r1.out, /^4S M3: SP 7\.1\.1 · RPT M22 · \d+ minggu ke belakang$/m);
// Jadual hanya dari 5 Okt: masa SP minggu awal dikira dengan jadual itu, dengan amaran
assert.match(r1.err, /Amaran: 4S M3: tiada jadual sebelum 2026-10-05; masa SP bagi minggu lebih awal dikira dengan jadual itu/);
assert.match(r1.out, /^1S ASK: SP 4\.2\.5 · tiada RPT$/m);
assert.match(r1.out, /^4H SK: tiada DSKP$/m);
assert.match(r1.err, /Amaran: 4S M3: perlu \d+ minit untuk SP berbaki, ada 0 minit hingga M34; pertimbang gabung SP/);
assert.match(r1.err, /Amaran: 2D PK: tiada DSKP; SP dibiarkan kosong/);

// Dijalankan semula tanpa perubahan: semua fail sama bait demi bait
const snap1 = snapshot();
assert.strictEqual(run('--minggu', '35', '--hari-ini', '2026-10-03').code, 0);
assert.deepStrictEqual(snapshot(), snap1);

// Guru tanda Selasa 6 Okt ditunda (dengan sebab), kemudian jana M36 pada petang 6 Okt
fs.writeFileSync(path.join(tmp, 'rekod/rekod-4S-M3.md'), t('rekod/rekod-4S-M3.md')
  .replace('| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | diajar | 35 |  |', '| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | ditunda | 35 | Mesyuarat |'));
const r2 = run('--minggu', '36', '--hari-ini', '2026-10-06');
assert.strictEqual(r2.code, 0, r2.err);
const m3b = R.parseRekod(t('rekod/rekod-4S-M3.md'));
// Rabu 7 Okt dibina semula: 7.1.2 (115 minit) diajar semula dari awal, berterusan ke Isnin
assert.deepStrictEqual(m3b.find(r => r.tarikh === '2026-10-07').sp, ['7.1.2']);
assert.deepStrictEqual(m3b.find(r => r.tarikh === '2026-10-12').sp, ['7.1.2', '7.1.3']);
assert.strictEqual(m3b.find(r => r.tarikh === '2026-10-12').acara, 'X-Break');
assert.ok(t('out/2026-M35-M3.html').includes('☑ PdP ditunda kerana: Mesyuarat'));
assert.ok(t('out/2026-M36-M3.html').includes('Hari acara: X-Break'));
assert.ok(!/bersambung|samb\./.test(t('out/2026-M36-M3.html')));

// Ralat: mesej jelas, kod keluar 1, tiada jejak tindanan
const r3 = run('--minggu', '50', '--hari-ini', '2026-10-06');
assert.strictEqual(r3.code, 1);
assert.match(r3.err, /^Ralat: Tiada minggu M50 dalam takwim/m);
assert.ok(!/at main/.test(r3.err));
// Ralat pada satu kelas: tiada fail ditulis untuk mana-mana kelas
const snap2 = snapshot();
fs.writeFileSync(path.join(tmp, 'rekod/rekod-2J-PJ.md'), t('rekod/rekod-2J-PJ.md').replace('| diajar |', '| tunda |'));
const r4 = run('--minggu', '37', '--hari-ini', '2026-10-06');
assert.strictEqual(r4.code, 1);
assert.match(r4.err, /Ralat: rekod[\\/]rekod-2J-PJ\.md:\d+: Status "tunda" tidak dikenali/);
const snap3 = snapshot();
assert.deepStrictEqual(Object.keys(snap3), Object.keys(snap2));
for (const f of Object.keys(snap2)) if (f !== 'rekod/rekod-2J-PJ.md') assert.strictEqual(snap3[f], snap2[f], f);

// Simulasi awal tahun (fail kelas 2026 sebenar, 4S sahaja): M1–M5 tanpa gangguan sentiasa ikut RPT
const kelasSim = read('kelas-2026.md')
  .replace(/^- (Takwim|Jadual|Acara): (.*)$/gm, (_, k, v) => `- ${k}: ${v.split(', ').map(s).join(', ')}`)
  .replace(/^- Rekod: .*$/m, '- Rekod: sim').replace(/^- Output: .*$/m, '- Output: sim')
  .replace('| dskp-mat-t4.md | aktiviti-umum.md | ../output/rpt-mat-t4-2026.md |', `| ${s('dskp-mat-t4.md')} | ${akt} | rpt-mat.md |`);
fs.writeFileSync(path.join(tmp, 'kelas-sim.md'), kelasSim);
const sim = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'cli', 'simulasi.js'), '--kelas', path.join(tmp, 'kelas-sim.md'), '--dari', '1', '--hingga', '5'], { encoding: 'utf8', cwd: tmp });
assert.strictEqual(sim.status, 0, sim.stderr);
assert.deepStrictEqual(sim.stdout.trim().split('\n'), [
  'M1 (2026-01-10) 4S M3: SP 1.1.1 · RPT M1 · ikut RPT',
  'M2 (2026-01-17) 4S M3: SP 1.1.3 · RPT M2 · ikut RPT',
  'M3 (2026-01-24) 4S M3: SP 1.1.5 · RPT M3 · ikut RPT',
  'M4 (2026-01-31) 4S M3: SP 1.1.7 · RPT M3 · ikut RPT',
  'M5 (2026-02-07) 4S M3: SP 2.1.1 · RPT M5 · ikut RPT',
]);
assert.strictEqual(R.parseRekod(t('sim/rekod-4S-M3.md')).length, 15);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('rph-cli: semua ujian lulus');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/rph-cli.js`
Expected: FAIL — `AssertionError` on `r1.code` (`1 !== 0`) with `Cannot find module` for `src/cli/rph.js`.

- [ ] **Step 3: Write the implementation**

Create `src/cli/rph.js`:

```js
// Jana RPH seminggu bagi semua kelas dalam fail kelas dan kemas kini rekod setiap kelas × subjek.
//
//   node src/cli/rph.js --kelas sample/kelas-2026.md --minggu 35 [--hari-ini 2026-10-03]
//
// Fail kelas menamakan takwim, jadual, acara, folder rekod dan folder output (relatif kepada fail kelas).
// Baris rekod sebelum / pada hari ini tidak diubah. Baris selepas hari ini dibina semula
// kecuali jika guru mengubah Status, Kehadiran atau Catatan.
// Output: <Output>/<tahun>-M<n>-<SUBJEK>.html bagi setiap subjek dan minggu yang dirancang,
// kemudian amaran (stderr) dan satu baris kedudukan bagi setiap kelas.

const fs = require('fs');
const path = require('path');
const C = require('../core');

function hariIniTempatan() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.kelas || !a.minggu) throw new Error('Guna: node src/cli/rph.js --kelas <fail kelas> --minggu <n> [--hari-ini yyyy-mm-dd]');
  const minggu = Number(String(a.minggu).replace(/^M/i, ''));
  const hariIni = a['hari-ini'] || hariIniTempatan();
  if (!/^\d{4}-\d\d-\d\d$/.test(hariIni)) throw new Error(`--hari-ini "${hariIni}" bukan yyyy-mm-dd`);

  const failKelas = path.resolve(a.kelas);
  const dir = path.dirname(failKelas);
  const nama = f => path.relative(process.cwd(), f) || f;
  const baca = f => fs.readFileSync(path.resolve(dir, f), 'utf8');
  const K = C.parseKelas(fs.readFileSync(failKelas, 'utf8'), nama(failKelas));
  const kalendar = C.buildCalendar(C.parseTakwim(baca(K.takwim)));
  const versions = K.jadual.map(f => C.parseJadual(baca(f), f));
  const acara = C.parseAcara(baca(K.acara), K.acara);
  const rekodDir = path.resolve(dir, K.rekod), outDir = path.resolve(dir, K.output);

  const cache = new Map();
  const sekali = (f, fn) => {
    if (!cache.has(f)) cache.set(f, fn(baca(f), f));
    return cache.get(f);
  };

  // Semua fail ditulis selepas setiap kelas berjaya: ralat pada satu kelas tidak meninggalkan fail separuh siap
  const tulis = [];
  const halaman = new Map(); // 'SUBJEK|n' -> [{ kelas, row, sp, aktiviti }]
  const amaran = [], ringkasan = [];
  for (const k of K.kelas) {
    const sp = k.dskp ? sekali(k.dskp, C.parseDskp) : [];
    const rpt = k.rpt ? sekali(k.rpt, C.parseRpt) : null;
    const aktiviti = sekali(k.aktiviti, C.parseAktiviti);
    // Masa setiap SP: minit sebenar kelas ini dalam minggu RPT tempat SP itu diletakkan
    const minitMinggu = C.minitPdpMinggu({ kalendar, versions, kelas: k, semuaKelas: K.kelas, acara });
    const masaSp = rpt ? C.masaSp({ rpt, sp, minitMinggu }) : null;
    if (minitMinggu.lalai) amaran.push(`${k.kelas} ${k.subjek}: tiada jadual sebelum ${minitMinggu.awal}; masa SP bagi minggu lebih awal dikira dengan jadual itu`);
    const failRekod = path.join(rekodDir, `rekod-${k.kelas}-${k.subjek}.md`);
    const rows = fs.existsSync(failRekod) ? C.parseRekod(fs.readFileSync(failRekod, 'utf8'), nama(failRekod)) : [];
    const s = C.syncRekod({
      rows, kelas: k, semuaKelas: K.kelas, sp, masaSp,
      kalendar, versions, acara, minggu, hariIni, fail: nama(failRekod),
    });
    tulis.push([failRekod, C.renderRekod(k, K.tahun, s.rows)]);
    amaran.push(...s.warnings);
    for (const n of new Set([...s.minggu, minggu])) {
      const key = `${k.subjek}|${n}`;
      if (!halaman.has(key)) halaman.set(key, []);
      halaman.get(key).push(...s.rows.filter(r => r.minggu === n).map(row => ({ kelas: k, row, sp, aktiviti })));
    }
    const r = C.ringkasanKelas({ kelas: k, rows: s.rows, sp, rpt, masaSp, minitMinggu, kalendar, versions, acara, semuaKelas: K.kelas, minggu });
    ringkasan.push(r.teks);
    amaran.push(...r.amaran);
  }

  for (const [key, pages] of [...halaman].sort(([x], [y]) => x.localeCompare(y))) {
    const [subjek, n] = key.split('|');
    if (!pages.some(p => p.row.status !== 'batal')) continue;
    pages.sort((x, y) => C.ikutMasa(x.row, y.row));
    const f = path.join(outDir, `${K.tahun}-M${n}-${subjek}.html`);
    tulis.push([f, C.renderRph({ tahun: K.tahun, minggu: Number(n), guru: K.guru, pages })]);
  }
  fs.mkdirSync(rekodDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [f, isi] of tulis) fs.writeFileSync(f, isi);
  tulis.filter(([f]) => f.startsWith(outDir)).forEach(([f]) => console.log(nama(f)));
  const tanpa = C.slotTanpaKelas(versions, K.kelas);
  if (tanpa.length) console.log(`Tidak dirancang (tiada dalam fail kelas): ${tanpa.join(', ')}`);
  amaran.forEach(w => console.warn('Amaran:', w));
  ringkasan.forEach(l => console.log(l));
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Ralat:', e.message);
  process.exit(1);
}
```

Create `src/cli/simulasi.js`:

```js
// Simulasi: jalankan src/cli/rph.js bagi setiap minggu M<dari>..M<hingga>, seolah-olah dijalankan
// pada hari Sabtu sebelum minggu itu, tanpa sebarang perubahan rekod oleh guru.
// Cetak satu baris ringkasan bagi setiap minggu dan kelas.
//
//   node src/cli/simulasi.js --kelas sample/kelas-2026.md [--dari 1] [--hingga 43]

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const C = require('../core');

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.kelas) throw new Error('Guna: node src/cli/simulasi.js --kelas <fail kelas> [--dari 1] [--hingga 43]');
  const failKelas = path.resolve(a.kelas);
  const K = C.parseKelas(fs.readFileSync(failKelas, 'utf8'), a.kelas);
  const kalendar = C.buildCalendar(C.parseTakwim(fs.readFileSync(path.resolve(path.dirname(failKelas), K.takwim), 'utf8')));
  const dari = Number(a.dari || 1), hingga = Number(a.hingga || kalendar.weeks[kalendar.weeks.length - 1].n);
  const rph = path.join(__dirname, 'rph.js');
  for (const w of kalendar.weeks.filter(x => x.n >= dari && x.n <= hingga)) {
    const sabtu = new Date(Date.parse(w.mula) - 2 * 864e5).toISOString().slice(0, 10);
    const r = spawnSync(process.execPath, [rph, '--kelas', failKelas, '--minggu', String(w.n), '--hari-ini', sabtu], { encoding: 'utf8' });
    if (r.status) throw new Error(`M${w.n}: ${r.stderr.trim()}`);
    const label = new Set(K.kelas.map(k => `${k.kelas} ${k.subjek}`));
    const ringkasan = r.stdout.split('\n').filter(l => label.has(l.split(':')[0]));
    const amaran = r.stderr.split('\n').filter(l => l.startsWith('Amaran:') && !l.includes('tiada jadual sebelum'));
    for (const l of ringkasan) console.log(`M${w.n} (${sabtu}) ${l}`);
    for (const l of amaran) console.log(`M${w.n}   ${l}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Ralat:', e.message);
  process.exit(1);
}
```

- [ ] **Step 4: Run all tests**

Run: `node test/semua.js`
Expected: all ten files print `semua ujian lulus` (`jadual`, `kedudukan`, `kelas-acara`, `rekod-sync`, `rekod`, `rph-cli`, `rph-planner`, `rph-render`, `rpt`, `scheduler`).

- [ ] **Step 5: Reproduce the teacher's full-year simulation (4S Matematik)**

`output/simulasi-4S-M3/` already holds the simulation the teacher reviewed (committed in Task 1 Step 0). Regenerate it and check nothing changed:

```bash
node src/cli/simulasi.js --kelas sample/kelas-2026.md > output/simulasi-4S-M3/ringkasan.txt
git status --short output/simulasi-4S-M3
grep -c "ikut RPT" output/simulasi-4S-M3/ringkasan.txt
```

Expected: `git status` prints nothing (43 files identical: `rekod-4S-M3.md`, 42 HTML, `ringkasan.txt`); `ikut RPT` count is `34` (M1–M34), and M35–M43 read `DSKP selesai · ulang kaji`. If anything differs, stop and report the diff — do not commit a changed simulation.

- [ ] **Step 6: Commit**

```bash
git add src/cli/rph.js src/cli/simulasi.js test/rph-cli.js
git commit -m "Add RPH CLI: weekly RPH pages, rekod files and RPT summary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Docs and teacher to-dos

**Files:**
- Modify: `docs/architecture.md`, `docs/discussion.md`, `README.md`, `TODO.md`

No code; the deliverable is docs that match what was built. Check each edit against the spec.

- [ ] **Step 1: `docs/architecture.md`**

- Status line (line 3): `RPH pipeline built (§4.4–4.6, CLI src/cli/rph.js); dashboard and app shell not built yet.`
- §4.1 table: change `_planned_` to built for Jadual, Kelas, Acara, Aktiviti, Rekod; add a row for the RPT appendix parser (`parse/rpt.js` → `{ tamat, minggu, peruntukan }`).
- §4.4–4.6 headings: `_Planned_` → `_Built_` with the file names (`timetable.js`, `scheduler.js`, `rph-planner.js`, `masa-sp.js`, `rekod-sync.js`, `kedudukan.js`, `render/rph.js`); in §4.6 rule 3 replace the SP-time sentence with "each SP's time = the class's real minutes in the RPT weeks where the SP sits (`masa-sp.js`)"; in the summary paragraph replace "counted in teaching weeks" with "measured in minutes, shown in weeks of the class's normal timetable"; remove every "**Proposal:**" label; change the CLI line to `node src/cli/rph.js --kelas sample/kelas-2026.md --minggu <n> [--hari-ini yyyy-mm-dd]`.
- §4.6 rule 4: append `Without an RPT every listed SP is finished.`; rule 8: replace "still exactly as generated" with "Status, Kehadiran and Catatan unchanged (to keep a future SP edit, write a note in Catatan)".
- §6 rules table: set Status to `Built` for every RPH row and for "RPT file carries a Peruntukan SP appendix".
- §8 layout: `src/cli/` → `rpt.js`, `rph.js`; add `rekod/<tahun>/` (rekod files, teacher-edited, committed) and `output/rph/` (generated RPH HTML).
- §10 status: mark "Jadual parser + timetable resolver + lesson scheduler" and "RPH generator … + rekod files" as `Done`.
- §11: remove the "RPH pipeline interfaces marked Proposal" line.

- [ ] **Step 2: `docs/discussion.md`**

Under "Design spec: split, RPH pipeline first", add a short "Built (yyyy-mm-dd of this commit)" paragraph: CLI commands (`rph.js`, `simulasi.js`); simulation of 4S Matematik in `output/simulasi-4S-M3/` (ikut RPT M1–M34); for real use rekod in `rekod/2026/` and RPH HTML in `output/rph/`; the clarifications found while planning (no-RPT merges count every SP finished; files are written only when every class succeeded; SP time from the RPT's actual weeks; unlisted classes skipped); future SP edits need a Catatan note. In "Open", tick `Write the design spec` for the RPH pipeline and the "Confirm RPH pipeline components" item.

- [ ] **Step 3: `README.md`**

Add a "Weekly RPH" section with the command, what it writes, and the weekly cycle (run on the weekend → print → after teaching, edit only exception rows: `ditunda` + reason, `batal`, Kehadiran, Catatan). Replace any `node rpt/rpt.js` with `node src/cli/rpt.js`.

- [ ] **Step 4: `TODO.md`**

Under "Now", add:
- `[ ] Review the 4S Matematik simulation in output/simulasi-4S-M3/ (rekod-4S-M3.md, RPH HTML, ringkasan.txt)`
- `[ ] For real use: in sample/kelas-2026.md set Rekod to ../rekod/2026, Output to ../output/rph and Mula to 4S's current SP; add other classes from test/data/kelas-semua.md with Bil. murid and Mula`
- `[ ] Check sample/acara-2026.md (events) and add Batal days you already know`
- `[ ] Optional: copy sample/aktiviti-umum.md per subject and point the Aktiviti column at it`
Change `node rpt/rpt.js ...` in the Matematik RPT item to `node src/cli/rpt.js ...`.

- [ ] **Step 5: Verify and commit**

Run: `node test/semua.js` (all pass) and `grep -n "Proposal" docs/architecture.md` (no RPH lines left).

```bash
git add docs/architecture.md docs/discussion.md README.md TODO.md
git commit -m "Docs: RPH pipeline built; teacher to-dos for the first run

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
