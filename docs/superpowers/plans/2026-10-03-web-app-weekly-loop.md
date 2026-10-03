# Web App First Slice (Weekly RPH Loop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser app (PWA) for the weekly routine: open a week, view and print its RPH pages, mark lessons taught / postponed / cancelled, and see each class's position against the RPT. It plans with exactly the same core code as the CLI.

**Architecture:** First the core becomes ES modules and is renamed to English, with the whole-year 4S simulation as a byte-for-byte proof that nothing in planning changed. Then the CLI's week orchestration moves into one pure core function, `runWeek`, used by the CLI and the app. The app is plain JavaScript modules under `app/`. It imports `../src/core/index.js` directly, keeps files and rekod in IndexedDB, and is published as **RPH Mate** by copying `app/` and `src/core/` into a separate public repo.

**Tech Stack:** JavaScript ES modules, Node 24 (CLI, tests, `node:assert`), browser APIs (IndexedDB, service worker, web manifest, iframe printing). No dependencies, no build step, no framework.

**Spec:** [docs/superpowers/specs/2026-10-03-web-app-weekly-loop-design.md](../specs/2026-10-03-web-app-weekly-loop-design.md). Read it before starting; rules are cited as W1–W13.

**Plan details that refine the spec** (decided while planning; none changes behaviour the teacher sees):
- The ES-module conversion (Task 1) and the English rename (Task 2) are two commits, each with its own byte-for-byte proof, instead of one. A reviewer can then accept one and reject the other.
- `runWeek` takes the class file's text as `classText` (plus `classFile` for messages), and also returns `lessons`, the requested week's rows, which the Week screen needs.
- Past lessons are never shown as "unmarked": every lesson is Taught by default (pipeline rule R11). A hand-blanked Status gets a warning instead (Task 4).

## Global Constraints

- No npm dependencies and no build step; `package.json` holds only `{ "type": "module" }` plus name/private.
- Code language: English for file names, functions, variables, object fields, comments, CLI flags, CLI messages and core error messages.
- Domain words kept in code: RPH, RPT, SP, SK, DSKP, PdP, takwim, rekod.
- RPH and RPT content (what is printed) stays Malay, byte-for-byte unchanged unless a task says otherwise.
- Markdown formats stay Malay and unchanged: class file (`kelas-*.md`) headers/columns, takwim, jadual, acara, aktiviti, DSKP, kesukaran, RPT, rekod (headers, `diajar`/`ditunda`/`batal`, `pdp`/`tutorial`/`peperiksaan`, file names `rekod-<kelas>-<subjek>.md`, intro text).
- App UI is English. Status labels: Taught ↔ `diajar`, Postponed ↔ `ditunda`, Cancelled ↔ `batal`.
- The name **RPH Mate** appears only through `tools/release.js` (production). Development name: "Lesson Planner (dev)".
- Tests: `node test/all.js` runs every `test/*.js`; each file prints `<name>: all tests passed`.
- Responsiveness (W13): after a mark, cards, badges and dashboard update in under 100 ms; the RPH preview redraws afterwards.
- Windows: the repo path has a space (`/c/Users/Falhaind Rubin/projects/lesson-planner`); quote paths. Git warns "LF will be replaced by CRLF" — harmless. Because of `core.autocrlf=true`, `git status` shows regenerated files as modified even when identical; **always check sameness with `git diff --exit-code --quiet <paths>`** (exit 0 = identical content). Write files with the editor tools, not shell heredocs (backticks and `$` get mangled).

## Review Focus

1. A rekod or input file saved on Windows (CRLF line endings, or a UTF-8 BOM) is picked or re-picked: marks still apply, an identical re-pick reports no differences, and nothing is rejected. Tests: Task 5 (marking CRLF, diff CRLF), Task 4 (BOM).
2. Two picked folders contain a file with the same name (for example a `rekod-4S-M3.md` in both the simulation folder and a real rekod folder): the app must name the clash, never silently pick one. Test: Task 5 (`findFile` ambiguity).
3. A class file path climbs above the picked folders (`../../x.md`) or the files were dropped without folders: resolution falls back to a unique file name instead of failing. Test: Task 5 (`resolvePath` / `findFile`).
4. A reason made only of spaces for Postponed or Cancelled must be refused like an empty one. Test: Task 5 (`applyMark`).
5. Today falls in a school break between takwim weeks: the app must not crash; `weekOfDate` returns null and the app falls back to another week. Test: Task 3 (`weekOfDate` on a break date).

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `package.json` | Create (T1) | `"type": "module"` |
| `src/core/**/*.js` | Modify (T1, T2) | ES modules; English names (T2) |
| `src/core/kedudukan.js` → `position.js`, `masa-sp.js` → `sp-time.js`, `parse/kelas.js` → `parse/classes.js`, `parse/acara.js` → `parse/events.js`, `parse/aktiviti.js` → `parse/activities.js`, `parse/jadual.js` → `parse/timetable.js`, `parse/kesukaran.js` → `parse/difficulty.js` | Rename (T2) | — |
| `src/core/week.js` | Create (T3) | `runWeek`, `inputsOf`, `rekodPath`, `rphPath` |
| `src/core/calendar.js` | Modify (T3) | add `weekOfDate` |
| `src/cli/rph.js`, `rpt.js`, `simulasi.js` → `simulate.js`, `text.js` (new, T3) | Modify | thin shells, English messages |
| `test/*.js` | Modify/rename (T1, T2); `test/week.js` (T3), `test/app-logic.js` (T5), `test/release.js` (T10) | tests |
| `app/logic/paths.js`, `status.js`, `words.js`, `marking.js`, `rekod-diff.js` | Create (T5) | pure app logic, tested in Node |
| `app/index.html`, `app.css`, `config.js`, `store.js`, `state.js`, `main.js`, `inputs.js` | Create (T6) | shell, storage, controller, top bar, Files screen |
| `app/week-view.js`, `preview.js` | Create (T7) | Week screen, RPH preview |
| `app/classes-view.js` | Create (T8) | Classes dashboard |
| `app/export.js`, `sw.js`, `manifest.webmanifest`, `icon.svg` | Create (T9) | Save rekod, offline, install |
| `tools/serve.js` (T6), `tools/release.js` (T10) | Create | dev server, release |
| `output/simulasi-4S-M3/ringkasan.txt` | Regenerate (T2) | English summary lines |
| `output/simulasi-4S-M3/*.html` | Regenerate (T4) | one added CSS line (A4 rule) |
| `README.md`, `docs/architecture.md`, `docs/next-session.md`, `TODO.md`, `sample/kelas-2026.md` | Modify (T11) | docs and command names |

---

### Task 1: Convert core, CLI and tests to ES modules (no renames)

Pure syntax change. No identifier, message or behaviour changes. Every generated file must stay byte-for-byte identical, including `ringkasan.txt`.

**Files:**
- Create: `package.json`
- Modify: every file in `src/core/` (including `parse/`, `render/`), `src/cli/*.js`, `test/*.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/core/index.js` re-exports every module with `export * from './x.js'`; imports use explicit `.js` extensions. Later tasks import `* as C from '../src/core/index.js'`.

- [ ] **Step 1: Record the baseline proof commands (they must pass before and after)**

Run:
```bash
cd "/c/Users/Falhaind Rubin/projects/lesson-planner"
node test/semua.js
node src/cli/simulasi.js --kelas sample/kelas-2026.md > output/simulasi-4S-M3/ringkasan.txt
node src/cli/rpt.js --dskp sample/dskp-mat-t4.md --takwim sample/takwim-smly-2026.md --kesukaran sample/kesukaran-mat-t4.md --tingkatan 4 --out output/rpt-mat-t4-2026
git diff --exit-code --quiet output/ && echo IDENTICAL
```
Expected: all ten test files print `semua ujian lulus`; then `IDENTICAL`.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "lesson-planner",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 3: Convert every core module**

Rules, applied file by file:
- `const { a, b } = require('./x');` → `import { a, b } from './x.js';` (relative paths get `.js`; `'../util'` → `'../util.js'`).
- `module.exports = { a, b };` → `export { a, b };`
- No other edits. Comments stay as they are in this task.

`src/core/index.js` becomes:
```js
// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
export * from './util.js';
export * from './parse/dskp.js';
export * from './parse/kesukaran.js';
export * from './parse/takwim.js';
export * from './parse/rpt.js';
export * from './parse/jadual.js';
export * from './parse/kelas.js';
export * from './parse/acara.js';
export * from './parse/rekod.js';
export * from './parse/aktiviti.js';
export * from './calendar.js';
export * from './timetable.js';
export * from './scheduler.js';
export * from './rph-planner.js';
export * from './masa-sp.js';
export * from './rekod-sync.js';
export * from './kedudukan.js';
export * from './rpt-planner.js';
export * from './render/rpt.js';
export * from './render/rekod.js';
export * from './render/rph.js';
```

- [ ] **Step 4: Check that no export name is duplicated (duplicates are silently dropped by `export *`)**

Run (sums each module's exports and compares with what `index.js` exposes):
```bash
node --input-type=module -e "const idx = await import('./src/core/index.js'); const list = (await import('node:fs')).readFileSync('src/core/index.js', 'utf8').match(/'\.\/[^']+'/g).map(s => s.slice(3, -1)); let n = 0; for (const f of list) n += Object.keys(await import('./src/core/' + f)).length; console.log(n, Object.keys(idx).length);"
```
Expected: two equal numbers (about 70). If the first is larger, two modules export the same name; rename one.

- [ ] **Step 5: Convert the CLIs**

In `src/cli/rph.js`, `rpt.js`, `simulasi.js`:
- `const fs = require('fs');` → `import fs from 'node:fs';` (same for `path`, `child_process` → `import { spawnSync } from 'node:child_process';`)
- `const C = require('../core');` → `import * as C from '../core/index.js';`
- `simulasi.js` uses `__dirname`; add after the imports:
```js
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

- [ ] **Step 6: Convert the tests**

In every `test/*.js`:
- `const fs = require('fs'), assert = require('assert');` → `import fs from 'node:fs'; import assert from 'node:assert';` (and `os`, `path`, `child_process` likewise)
- `const R = require('../src/core');` → `import * as R from '../src/core/index.js';`
- Files that use `__dirname` add:
```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```
(skip the `path` import if the file already imports it).

`test/semua.js` becomes:
```js
// node test/semua.js — jalankan semua fail ujian dalam test/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'semua.js').sort())
  execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
```

- [ ] **Step 7: Run the proof again**

Run the four commands of Step 1.
Expected: all tests pass and `IDENTICAL`. If not identical, `git diff output/` shows what changed; fix the conversion, never the expected output.

- [ ] **Step 8: Commit**

```bash
git add package.json src test
git commit -m "Convert core, CLI and tests to ES modules (no behaviour change)"
```

---

### Task 2: Rename everything to English; English messages

Rename files, identifiers, object fields and comments to English; translate every thrown error, warning and CLI message to English. Markdown parsing and rendering are unchanged, so the simulation's rekod and HTML stay byte-for-byte identical. Only `ringkasan.txt` changes (English summary lines).

**Files:**
- Rename: `src/core/kedudukan.js` → `position.js`; `src/core/masa-sp.js` → `sp-time.js`; `src/core/parse/kelas.js` → `classes.js`; `parse/acara.js` → `events.js`; `parse/aktiviti.js` → `activities.js`; `parse/jadual.js` → `timetable.js`; `parse/kesukaran.js` → `difficulty.js`; `src/cli/simulasi.js` → `simulate.js`; `test/semua.js` → `all.js`; `test/kedudukan.js` → `position.js`; `test/kelas-acara.js` → `classes-events.js`; `test/rph-cli.js` → `cli.js`
- Modify: every file in `src/core/`, `src/cli/`, `test/`; `test/data/kelas-semua.md` is data and stays as is
- Regenerate: `output/simulasi-4S-M3/ringkasan.txt`

**Interfaces (the names every later task uses):**

Exports and data shapes after this task:

| Module | Exports | Shapes |
|---|---|---|
| `util.js` | `MONTHS` (values unchanged: Malay month abbreviations), `WEEKDAYS` (values unchanged: `Isnin`…`Jumaat`), `cells`, `daysBetween`, `fmtDate`, `fmtRange`, `range`, `periodRange` (was `waktuRange`), `fmtPeriods` (`fmtWaktu`), `periodStart` (`minitMula`), `periodMinutes` (`minitWaktu`), `clock12` (`jam12`), `clock24` (`jam24`), `periodTime` (`masaWaktu`), `fmtDateDmy` (`fmtTarikh`) | — |
| `parse/takwim.js` | `parseTakwim(md)` | `{ weeks: [{ n, start, days: [{ date, dayName, holiday, curriculum }] }], gaps: [day] }` |
| `calendar.js` | `NOT_HOLIDAY`, `examForms`, `buildCalendar`, `dayClass`, `weekFor`, `examBlocks`, `breaks` | calendar `{ weeks: [{ n, start, days }], gaps }`, day `{ date, dayName, holiday, exams: [{ name, forms }] }`; `dayClass` → `'holiday' \| 'exam' \| 'pdp'`; `weekFor` → `{ n, start, end, holidayDays, examDays, pdp }`; `examBlocks` → `[{ start, end, name }]`; `breaks` → `[{ after, start, end, name }]` |
| `parse/timetable.js` | `parseTimetable(md, file)` | `{ effectiveFrom, slots: [{ dayName, periods: [a, b], time, subject, classCode, room }] }` |
| `timetable.js` | `versionFor(versions, date)`, `weeklyMinutes(version, classCode, subject)` | — |
| `parse/classes.js` | `parseClasses(md, file)` | `{ year, teacher, takwim, timetables: [path], events, rekod, output, classes: [ClassRow] }`; ClassRow `{ classCode, fullName, form, subject, subjectName, dskp, activities, rpt, tutorial, pupils, start, line }` |
| `parse/events.js` | `parseEvents(md, file)` | `{ eventDays: [{ date, name, forms }], cancellations: [{ date, target, reason }] }` |
| `parse/activities.js` | `parseActivities(md, file)` | `{ opening: [text], development: [text], closing: [text] }` |
| `parse/dskp.js` | `parseDskp(md)` | `[{ topic: { code, title }, sk: { code, title }, code, text }]` |
| `parse/difficulty.js` | `parseDifficulty(md)` | `{ sp: Map(code → { value, reason }), topics: Map(code → weeks) }` |
| `parse/rpt.js` | `parseRpt(md, file)` | `{ end, weeks: [{ n, sp: [code] }], allocation: Map(code → weeks) }` |
| `parse/rekod.js` | `parseRekod(md, file)`, `spCodes`, `KINDS`, `STATUSES` | row `{ week, date, dayName, periods, time, minutes, kind, event, sp: [code], status, attendance, note, line }` (`periods` is the string `'2–3'`; `kind` values stay `pdp`/`tutorial`/`peperiksaan`; `status` values stay `diajar`/`ditunda`/`batal`/`''`) |
| `scheduler.js` | `lessonsForWeek({ calendar, versions, classes, events, week, pickVersion })`, `byTime`, `unplannedSlots(versions, classes)` | lesson `{ week, date, dayName, classCode, subject, periods, time, minutes, kind, event }` |
| `sp-time.js` | `spTime({ rpt, sp, weeklyPdp })` → `Map(code → minutes)`, `weeklyPdpMinutes({ calendar, versions, cls, classes, events })` → function `n → minutes` with `.usedFallback` and `.earliest` | — |
| `rph-planner.js` | `MIN_REMAINDER`, `planRows({ rows, sp, spTime, start, file })` | → `{ rows, warnings, end: { idx, remaining, revisions, finished } }`; new rows carry `isNew: true` |
| `rekod-sync.js` | `syncRekod({ rows, cls, classes, sp, spTime, calendar, versions, events, week, today, file })`, `isEdited` | → `{ rows, weeks: [n], warnings }` |
| `position.js` | `position({ rpt, calendar, form, sp, end, spTime, weeklyPdp, weekly, week })`, `positionText(label, p)`, `fit({ sp, spTime, end, lessons })`, `classSummary({ cls, rows, sp, rpt, spTime, weeklyPdp, calendar, versions, events, classes, week })` | `position` → `{ status: 'finished' }` \| `{ status: 'notInRpt', sp }` \| `{ status: 'onTrack' \| 'ahead' \| 'behind', sp, rptWeeks: [a, b], weeks }`; `fit` → `{ need, have }`; `classSummary` → `{ text, warnings }` (changes to numbers in Task 3) |
| `rpt-planner.js` | `MIN_OVERLAP`, `REVISION_WEEKS`, `plan({ sp, difficulty, calendar, form, end, revisionWeeks })` | result fields: `rows, rated, breaks, end, form, totalCapacity, totalValue, warnings, exams, midYear, parts: [{ topics, start, end }], fixed`; RPT rows `{ ...weekFor, capacity, sp }`, placed SPs carry `cont` (was `samb`), rated SPs carry `value, reason, length, weeks` |
| `render/rpt.js` | `rowsOut`, `summary` (was `ringkasan`), `rules` (was `aturan`), `renderMd(p, meta)`, `renderHtml(p, meta)` | `meta = { subject, year, dskp, takwim, difficulty }` |
| `render/rekod.js` | `renderRekod(cls, year, rows)` | — |
| `render/rph.js` | `renderRph({ year, week, teacher, pages: [{ cls, row, sp, activities }] })`, `content(row, sp)` | — |

Rules:
- Local variables and inner helpers are renamed to English in the same spirit (`kelas` row object → `cls`; `kalendar` → `calendar`; `minggu` → `week`; `tarikh` → `date`; `hariIni` → `today`; `fail` → `file`; `amaran` → `warnings`). Never use the reserved word `class` as a variable.
- Every comment is translated to English.
- Strings that are **file content** do not change: everything inside `render/rph.js`, `render/rpt.js`, `render/rekod.js` output, the Malay headings parsers match (`## Hari acara`, `## Batal`, `- Berkuat kuasa:`, `## Peruntukan SP`, `- Sukatan tamat:`, column names), and the Malay values (`diajar`, `peperiksaan`, `PEPERIKSAAN`, `CUTI — TIADA PdP`, …).
- Strings that are **messages** become English: every `throw new Error(...)`, every warning, every CLI line.

CLI flags:
- `rph.js`: `--classes <file> --week <n> [--today yyyy-mm-dd]`
- `simulate.js`: `--classes <file> [--from 1] [--to 43]`
- `rpt.js`: `--dskp --takwim --difficulty --form --out [--subject] [--end <week|final>] [--revision-weeks <n>]` (`--end final` replaces `--tamat akhir`)

CLI and summary wording (Task 3 moves this into the CLI; keep it exactly):

| Malay now | English |
|---|---|
| `Ralat: <msg>` (stderr) | `Error: <msg>` |
| `Amaran: <msg>` (stderr) | `Warning: <msg>` |
| `Tidak dirancang (tiada dalam fail kelas): a, b` | `Not planned (not in the class file): a, b` |
| `<label>: SP 7.1.1 · RPT M22 · 2 minggu ke belakang` | `<label>: SP 7.1.1 · RPT M22 · 2 weeks behind` (`1 week behind`, `3 weeks ahead`) |
| `· ikut RPT` | `· on track` |
| `<label>: DSKP selesai · ulang kaji` | `<label>: DSKP finished · revision` |
| `<label>: SP x tiada dalam RPT` | `<label>: SP x not in RPT` |
| `<label>: SP x · tiada RPT` / `<label>: DSKP selesai · tiada RPT` | `<label>: SP x · no RPT` / `<label>: DSKP finished · no RPT` |
| `<label>: tiada DSKP` | `<label>: no DSKP` |
| `<label>: perlu N minit untuk SP berbaki, ada M minit hingga M34; pertimbang gabung SP` | `<label>: needs N min for the remaining SPs, has M min until M34; consider combining SPs` |
| `<label>: tiada jadual sebelum D; masa SP bagi minggu lebih awal dikira dengan jadual itu` | `<label>: no timetable before D; SP time for earlier weeks uses that timetable` |
| `Tiada minggu M50 dalam takwim` | `No week M50 in the takwim` |
| `rekod/x.md:12: Status "tunda" tidak dikenali (diajar / ditunda / batal)` | `rekod/x.md:12: Status "tunda" not recognised (diajar / ditunda / batal)` |
| `<label>: tiada DSKP; SP dibiarkan kosong` | `<label>: no DSKP; SP left blank` |
| test success line `<name>: semua ujian lulus` | `<name>: all tests passed` |

`simulate.js` filters out the warning containing `no timetable before` (was `tiada jadual sebelum`), and looks for lines starting with `Warning:`.

The core's position wording in this task (`position.js`):
```js
// One summary line for a class × subject (CLI only; never printed on an RPH)
function positionText(label, p) {
  if (p.status === 'finished') return `${label}: DSKP finished · revision`;
  if (p.status === 'notInRpt') return `${label}: SP ${p.sp} not in RPT`;
  const rpt = `RPT M${p.rptWeeks[0]}${p.rptWeeks[1] > p.rptWeeks[0] ? `–M${p.rptWeeks[1]}` : ''}`;
  const now = p.status === 'onTrack' ? 'on track' : `${p.weeks} week${p.weeks === 1 ? '' : 's'} ${p.status}`;
  return `${label}: SP ${p.sp} · ${rpt} · ${now}`;
}
```

- [ ] **Step 1: Rename files with git**

```bash
cd "/c/Users/Falhaind Rubin/projects/lesson-planner"
git mv src/core/kedudukan.js src/core/position.js
git mv src/core/masa-sp.js src/core/sp-time.js
git mv src/core/parse/kelas.js src/core/parse/classes.js
git mv src/core/parse/acara.js src/core/parse/events.js
git mv src/core/parse/aktiviti.js src/core/parse/activities.js
git mv src/core/parse/jadual.js src/core/parse/timetable.js
git mv src/core/parse/kesukaran.js src/core/parse/difficulty.js
git mv src/cli/simulasi.js src/cli/simulate.js
git mv test/semua.js test/all.js
git mv test/kedudukan.js test/position.js
git mv test/kelas-acara.js test/classes-events.js
git mv test/rph-cli.js test/cli.js
```

- [ ] **Step 2: Rename inside the core, one module at a time, in dependency order**

Order: `util.js` → `parse/*` → `calendar.js` → `timetable.js` → `scheduler.js` → `sp-time.js` → `rph-planner.js` → `rekod-sync.js` → `position.js` → `rpt-planner.js` → `render/*` → `index.js`. Use the Interfaces table above for every export and field. `index.js` lists the new file names. In `test/all.js`, exclude `'all.js'` instead of `'semua.js'`.

- [ ] **Step 3: Rename the CLIs and translate their messages**

Apply the flags and wording tables above. Usage errors become, for example, `Usage: node src/cli/rph.js --classes <class file> --week <n> [--today yyyy-mm-dd]`.

- [ ] **Step 4: Rename the tests**

Update every test to the new names, fields, flags and English messages. Assertions keep the same meaning; only names and English message text change. Example from `test/cli.js`:
```js
assert.match(r1.out, /^4S M3: SP 7\.1\.1 · RPT M22 · \d+ weeks? behind$/m);
assert.match(r1.err, /Warning: 4S M3: no timetable before 2026-10-05; SP time for earlier weeks uses that timetable/);
assert.match(r3.err, /^Error: No week M50 in the takwim/m);
```
and the simulation expectation:
```js
assert.deepStrictEqual(sim.stdout.trim().split('\n'), [
  'M1 (2026-01-10) 4S M3: SP 1.1.1 · RPT M1 · on track',
  'M2 (2026-01-17) 4S M3: SP 1.1.3 · RPT M2 · on track',
  'M3 (2026-01-24) 4S M3: SP 1.1.5 · RPT M3 · on track',
  'M4 (2026-01-31) 4S M3: SP 1.1.7 · RPT M3 · on track',
  'M5 (2026-02-07) 4S M3: SP 2.1.1 · RPT M5 · on track',
]);
```

- [ ] **Step 5: Check no Malay identifiers remain**

Run:
```bash
grep -rnwE "kelas|kalendar|minggu|tarikh|hariIni|amaran|ringkasan|kedudukan|masaSp|catatan|kehadiran|jenis|acara|aktiviti|tingkatan|subjek|guru|tahun|mula|tamat" src/core src/cli test/*.js | grep -v "^\S*:\s*//" | grep -vE "'[^']*(kelas|minggu|tarikh|catatan|kehadiran|jenis|acara|aktiviti|tingkatan|subjek|guru|tahun|mula|tamat)[^']*'|\`[^\`]*\`|\"[^\"]*\"" | head -20
```
Expected: no lines (anything left is inside a string literal that is file content, which is allowed). Inspect any line printed and rename it.

- [ ] **Step 6: Run the proof**

```bash
node test/all.js
node src/cli/simulate.js --classes sample/kelas-2026.md > output/simulasi-4S-M3/ringkasan.txt
node src/cli/rpt.js --dskp sample/dskp-mat-t4.md --takwim sample/takwim-smly-2026.md --difficulty sample/kesukaran-mat-t4.md --form 4 --out output/rpt-mat-t4-2026
git diff --exit-code --quiet -- output/ ':!output/simulasi-4S-M3/ringkasan.txt' && echo IDENTICAL
head -3 output/simulasi-4S-M3/ringkasan.txt
```
Expected: every test prints `all tests passed`; `IDENTICAL`; the first summary line reads `M1 (2026-01-10) 4S M3: SP 1.1.1 · RPT M1 · on track`.

- [ ] **Step 7: Commit**

```bash
git add -A src test output/simulasi-4S-M3/ringkasan.txt
git commit -m "Rename core, CLI and tests to English; English messages (output unchanged)"
```

---

### Task 3: `runWeek` in the core; CLI on top of it; Profile name; `weekOfDate`

**Files:**
- Create: `src/core/week.js`, `src/cli/text.js`, `test/week.js`
- Modify: `src/core/position.js` (`classSummary` returns numbers; `positionText` moves to the CLI), `src/core/calendar.js` (`weekOfDate`), `src/core/parse/classes.js` (`Guru` optional), `src/core/render/rph.js` (blank teacher), `src/core/index.js`, `src/cli/rph.js`, `test/position.js`, `test/classes-events.js`

**Interfaces:**
- Consumes: Task 2 names.
- Produces:
```js
// src/core/week.js
inputsOf(K) → [{ path, role }]   // role: 'takwim' | 'timetable' | 'events' | 'dskp' | 'activities' | 'rpt'; unique by path
rekodPath(K, cls) → `${K.rekod}/rekod-${cls.classCode}-${cls.subject}.md`
rphPath(K, subject, n) → `${K.output}/${K.year}-M${n}-${subject}.html`
runWeek({ read, classText, classFile, week, today, teacher }) → {
  writes:    [{ path, text, kind: 'rekod' | 'rph' }],   // rekod first (class order), then rph sorted by 'SUBJECT|n'
  rph:       [{ subject, week, html }],
  lessons:   [{ classCode, subject, subjectName, pupils, rekod, row }],  // the requested week only, by time
  classes:   [ClassSummary],
  days:      [{ date, dayName, holiday, exams: [name] }],
  unplanned: [string],
  warnings:  [string],
}
// read(path) → string | null; paths are as written in the class file (relative to its folder).
// classText is the class file's text; classFile its name, used in messages.

// ClassSummary (src/core/position.js classSummary)
{ classCode, subject, subjectName, hasDskp, hasRpt, spTotal, spDone, currentSp, finished, rptEnd,
  position,   // null when !hasDskp or !hasRpt; else the position() result from Task 2
  fit }       // null when the remaining SPs fit; else { need, have, endWeek }

// src/core/calendar.js
weekOfDate(calendar, date) → n | null   // the week whose start ≤ date < start + 7 days

// src/cli/text.js
summaryLine(s: ClassSummary) → string
fitWarning(s: ClassSummary) → string | null
```

- [ ] **Step 1: Write the failing test `test/week.js`**

```js
// node test/week.js — runWeek on the real 2026 sample files, read from memory as the app does
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import * as R from '../src/core/index.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sample = f => fs.readFileSync(path.join(root, 'sample', f), 'utf8');

const calendar = R.buildCalendar(R.parseTakwim(sample('takwim-smly-2026.md')));
const plan = R.plan({ sp: R.parseDskp(sample('dskp-mat-t4.md')), difficulty: R.parseDifficulty(sample('kesukaran-mat-t4.md')), calendar, form: 4 });
const base = () => new Map([
  ['takwim.md', sample('takwim-smly-2026.md')], ['jwg-sim.md', sample('jwg-20260101-simulasi.md')], ['jwg.md', sample('jwg-20261002.md')],
  ['acara.md', sample('acara-2026.md')], ['dskp.md', sample('dskp-mat-t4.md')], ['aktiviti.md', sample('aktiviti-umum.md')],
  ['rpt.md', R.renderMd(plan, { subject: 'Matematik', year: 2026, dskp: 'd', takwim: 't', difficulty: 'k' })],
]);
// No "- Guru:" line: the name comes from the app's Profile
const classText = (mula = '7.1.1') => ['- Tahun: 2026', '- Takwim: takwim.md', '- Jadual: jwg-sim.md, jwg.md', '- Acara: acara.md',
  '- Rekod: rekod', '- Output: out', '',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  `| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | dskp.md | aktiviti.md | rpt.md |  | 35 | ${mula} |`].join('\n');
let files = base();
const read = p => (files.has(p) ? files.get(p) : null);
const run = (week, today, teacher) => {
  const r = R.runWeek({ read, classText: classText(), classFile: 'kelas.md', week, today, teacher });
  for (const w of r.writes) if (w.kind === 'rekod') files.set(w.path, w.text); // the app stores rekod writes
  return r;
};
const rekod = () => R.parseRekod(files.get('rekod/rekod-4S-M3.md'));
const pages = html => (html.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length;

// inputsOf: every referenced file once, with its role
const K = R.parseClasses(classText(), 'kelas.md');
assert.deepStrictEqual(R.inputsOf(K), [
  { path: 'takwim.md', role: 'takwim' }, { path: 'jwg-sim.md', role: 'timetable' }, { path: 'jwg.md', role: 'timetable' },
  { path: 'acara.md', role: 'events' }, { path: 'dskp.md', role: 'dskp' }, { path: 'aktiviti.md', role: 'activities' }, { path: 'rpt.md', role: 'rpt' },
]);
assert.strictEqual(K.teacher, '');

// Week 35 from an empty rekod, Saturday 3 Oct
const r1 = run(35, '2026-10-03', 'CIKGU CONTOH');
assert.deepStrictEqual(r1.writes.map(w => [w.path, w.kind]), [['rekod/rekod-4S-M3.md', 'rekod'], ['out/2026-M35-M3.html', 'rph']]);
assert.deepStrictEqual(r1.lessons.map(l => [l.row.date, l.row.sp.join(', '), l.rekod]), [
  ['2026-10-05', '7.1.1', 'rekod/rekod-4S-M3.md'], ['2026-10-06', '7.1.2', 'rekod/rekod-4S-M3.md'], ['2026-10-07', '7.1.2, 7.1.3', 'rekod/rekod-4S-M3.md'],
]);
assert.ok(r1.rph[0].html.includes('CIKGU CONTOH'));
assert.strictEqual(r1.days[0].date, '2026-10-05');
assert.strictEqual(r1.days.length, 5);
const s1 = r1.classes[0];
assert.deepStrictEqual([s1.classCode, s1.subject, s1.subjectName, s1.hasDskp, s1.hasRpt, s1.currentSp, s1.finished, s1.rptEnd],
  ['4S', 'M3', 'MATEMATIK', true, true, '7.1.1', false, 34]);
assert.strictEqual(s1.spDone, R.parseDskp(sample('dskp-mat-t4.md')).findIndex(s => s.code === '7.1.1'));
assert.strictEqual(s1.position.status, 'behind');
assert.deepStrictEqual(s1.position.rptWeeks, [22, 22]);
assert.deepStrictEqual([s1.fit.have, s1.fit.endWeek], [0, 34]);
// Blank teacher: NAMA GURU row is blank, not "undefined"
assert.ok(!run(35, '2026-10-03', '').rph[0].html.includes('undefined'));

// Postponed: Tuesday 6 Oct ditunda with a reason, then week 36 on the evening of 6 Oct
files.set('rekod/rekod-4S-M3.md', files.get('rekod/rekod-4S-M3.md')
  .replace('| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | diajar | 35 |  |', '| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | ditunda | 35 | Mesyuarat |'));
const r2 = run(36, '2026-10-06', 'CIKGU CONTOH');
assert.deepStrictEqual(rekod().find(r => r.date === '2026-10-07').sp, ['7.1.2']);
assert.ok(r2.rph.find(p => p.week === 35).html.includes('☑ PdP ditunda kerana: Mesyuarat'));

// Re-marked past lesson: Tuesday back to diajar on 8 Oct; Wednesday (past) is kept, Monday 12 Oct restarts at 7.1.3
files.set('rekod/rekod-4S-M3.md', files.get('rekod/rekod-4S-M3.md').replace('| 7.1.2 | ditunda | 35 | Mesyuarat |', '| 7.1.2 | diajar | 35 | Sudah diajar |'));
run(36, '2026-10-08', 'CIKGU CONTOH');
assert.deepStrictEqual(rekod().find(r => r.date === '2026-10-07').sp, ['7.1.2']);
assert.strictEqual(rekod().find(r => r.date === '2026-10-12').sp[0], '7.1.3');

// Cancelled: Monday 12 Oct batal → no page for it in M36
const before = pages(run(36, '2026-10-08', 'X').rph.find(p => p.week === 36).html);
files.set('rekod/rekod-4S-M3.md', files.get('rekod/rekod-4S-M3.md').replace(/(\| 2026-10-12 \|[^\n]*\| )diajar( \|[^|]*\|)[^|\n]*\|/, '$1batal$2 Kursus |'));
const r3 = run(36, '2026-10-08', 'X');
assert.strictEqual(pages(r3.rph.find(p => p.week === 36).html), before - 1);

// Exam week (M17, PPT for Form 4): exam rows only, no SPs
files = base();
const r4 = run(17, '2026-04-18', 'X');
assert.ok(r4.lessons.length > 0);
assert.ok(r4.lessons.every(l => l.row.kind === 'peperiksaan' && l.row.sp.length === 0));
assert.ok(r4.rph[0].html.includes('PEPERIKSAAN'));

// A week with no lessons for the class (M6): no lessons, no RPH
files = base();
const r5 = run(6, '2026-02-14', 'X');
assert.deepStrictEqual([r5.lessons.length, r5.rph.length], [0, 0]);

// Missing input: clear message, nothing returned
files = base();
files.delete('acara.md');
assert.throws(() => run(35, '2026-10-03', 'X'), /Missing file: acara\.md/);

// weekOfDate: Monday and Saturday of M1 → 1; a school-break day → null
assert.strictEqual(R.weekOfDate(calendar, '2026-01-12'), 1);
assert.strictEqual(R.weekOfDate(calendar, '2026-01-17'), 1);
assert.strictEqual(R.weekOfDate(calendar, calendar.gaps[0].date), null);

console.log('week: all tests passed');
```

- [ ] **Step 2: Run it to see it fail**

Run: `node test/week.js`
Expected: FAIL, `R.inputsOf is not a function` (or similar).

- [ ] **Step 3: Make `Guru` optional and the blank teacher safe**

In `src/core/parse/classes.js`, the required header list drops `Guru`:
```js
const HEADERS = ['Tahun', 'Guru', 'Takwim', 'Jadual', 'Acara', 'Rekod', 'Output'];
const REQUIRED = HEADERS.filter(h => h !== 'Guru'); // the teacher's name may come from the app's Profile instead
```
Use `REQUIRED` in the "missing line" check, and return `teacher: meta.Guru || ''`.

In `src/core/render/rph.js`, the NAMA GURU row uses `[teacher || '']` (a blank renders as `&nbsp;` as before). `test/week.js` covers both (`K.teacher === ''`, no `undefined` in the HTML).

- [ ] **Step 4: Add `weekOfDate` to `src/core/calendar.js`**

```js
// The takwim week containing a date (its Monday up to the following Sunday), or null in a school break
function weekOfDate(calendar, date) {
  const w = calendar.weeks.find(x => x.start <= date && daysBetween(x.start, date) < 7);
  return w ? w.n : null;
}
```
Import `daysBetween` from `./util.js` and export `weekOfDate`.

- [ ] **Step 5: `classSummary` returns numbers; `positionText` leaves the core**

In `src/core/position.js`, replace `classSummary` and delete `positionText` (it moves to `src/cli/text.js` in Step 7):
```js
// Position of one class × subject at the start of the requested week, as numbers.
// The CLI and the app word it themselves (never printed on an RPH).
function classSummary({ cls, rows, sp, rpt, spTime, weeklyPdp, calendar, versions, events, classes, week }) {
  const w = calendar.weeks.find(x => x.n === week);
  const base = {
    classCode: cls.classCode, subject: cls.subject, subjectName: cls.subjectName,
    hasDskp: sp.length > 0, hasRpt: !!rpt, spTotal: sp.length, spDone: 0, currentSp: null,
    finished: false, rptEnd: rpt ? rpt.end : null, position: null, fit: null,
  };
  if (!sp.length) return base;
  const { end } = planRows({ rows: rows.filter(r => r.week < week), sp, spTime: rpt ? spTime : null, start: cls.start });
  Object.assign(base, { spDone: end.finished ? sp.length : end.idx, currentSp: end.finished ? null : sp[end.idx].code, finished: end.finished });
  if (!rpt) return base;
  const weekly = weeklyMinutes(versionFor(versions, w.days[0].date), cls.classCode, cls.subject);
  base.position = position({ rpt, calendar, form: cls.form, sp, end, spTime, weeklyPdp, weekly, week });
  if (end.finished) return base;
  const lessons = [];
  for (let n = week; n <= rpt.end; n++)
    lessons.push(...lessonsForWeek({ calendar, versions, classes, events, week: n })
      .filter(l => l.classCode === cls.classCode && l.subject === cls.subject && l.kind === 'pdp'));
  const f = fit({ sp, spTime, end, lessons });
  // One period of slack: the 15-minute rule can add a little time
  if (f.need > f.have + 30) base.fit = { need: f.need, have: f.have, endWeek: rpt.end };
  return base;
}
```
This is the old `ringkasanKelas` logic returning fields instead of text; `position.js` already imports `planRows`, `lessonsForWeek`, `versionFor` and `weeklyMinutes` (keep those imports).

Update `test/position.js`: assertions on `classSummary(...).text` become assertions on fields, e.g. `assert.strictEqual(s.position.status, 'onTrack')`, `assert.deepStrictEqual(s.position.rptWeeks, [10, 10])`, `assert.ok(s.fit === null)`.

- [ ] **Step 6: Create `src/core/week.js`**

```js
// One week for every class in the class file: sync each rekod, build the RPH pages per subject,
// and summarise each class's position. Pure: every file comes through read(path), with paths
// exactly as written in the class file (relative to its folder). Used by the CLI and the app.
import { parseClasses } from './parse/classes.js';
import { parseTakwim } from './parse/takwim.js';
import { parseTimetable } from './parse/timetable.js';
import { parseEvents } from './parse/events.js';
import { parseDskp } from './parse/dskp.js';
import { parseRpt } from './parse/rpt.js';
import { parseActivities } from './parse/activities.js';
import { parseRekod } from './parse/rekod.js';
import { buildCalendar } from './calendar.js';
import { byTime, unplannedSlots } from './scheduler.js';
import { spTime, weeklyPdpMinutes } from './sp-time.js';
import { syncRekod } from './rekod-sync.js';
import { classSummary } from './position.js';
import { renderRekod } from './render/rekod.js';
import { renderRph } from './render/rph.js';

// Every input file the class file names, once each, with the parser role it needs
function inputsOf(K) {
  const out = [{ path: K.takwim, role: 'takwim' }, ...K.timetables.map(path => ({ path, role: 'timetable' })), { path: K.events, role: 'events' }];
  for (const c of K.classes) {
    if (c.dskp) out.push({ path: c.dskp, role: 'dskp' });
    out.push({ path: c.activities, role: 'activities' });
    if (c.rpt) out.push({ path: c.rpt, role: 'rpt' });
  }
  return [...new Map(out.map(x => [x.path, x])).values()];
}

const rekodPath = (K, cls) => `${K.rekod}/rekod-${cls.classCode}-${cls.subject}.md`;
const rphPath = (K, subject, n) => `${K.output}/${K.year}-M${n}-${subject}.html`;

function runWeek({ read, classText, classFile, week, today, teacher = '' }) {
  const need = p => {
    const t = read(p);
    if (t == null) throw new Error(`Missing file: ${p}`);
    return t;
  };
  const K = parseClasses(classText, classFile);
  const calendar = buildCalendar(parseTakwim(need(K.takwim)));
  const versions = K.timetables.map(f => parseTimetable(need(f), f));
  const events = parseEvents(need(K.events), K.events);
  const cache = new Map();
  const once = (f, fn) => {
    if (!cache.has(f)) cache.set(f, fn(need(f), f));
    return cache.get(f);
  };

  const writes = [], results = [], classes = [], warnings = [];
  const keys = new Set(); // 'SUBJECT|n'
  for (const cls of K.classes) {
    const sp = cls.dskp ? once(cls.dskp, parseDskp) : [];
    const rpt = cls.rpt ? once(cls.rpt, parseRpt) : null;
    const activities = once(cls.activities, parseActivities);
    // SP time: this class's real minutes in the RPT weeks where each SP sits
    const weeklyPdp = weeklyPdpMinutes({ calendar, versions, cls, classes: K.classes, events });
    const spt = rpt ? spTime({ rpt, sp, weeklyPdp }) : null;
    if (weeklyPdp.usedFallback)
      warnings.push(`${cls.classCode} ${cls.subject}: no timetable before ${weeklyPdp.earliest}; SP time for earlier weeks uses that timetable`);
    const file = rekodPath(K, cls);
    const text = read(file);
    const rows = text == null ? [] : parseRekod(text, file);
    const s = syncRekod({ rows, cls, classes: K.classes, sp, spTime: spt, calendar, versions, events, week, today, file });
    writes.push({ path: file, text: renderRekod(cls, K.year, s.rows), kind: 'rekod' });
    warnings.push(...s.warnings);
    results.push({ cls, sp, activities, rows: s.rows, rekod: file });
    for (const n of new Set([...s.weeks, week])) keys.add(`${cls.subject}|${n}`);
    classes.push(classSummary({ cls, rows: s.rows, sp, rpt, spTime: spt, weeklyPdp, calendar, versions, events, classes: K.classes, week }));
  }

  // One HTML per subject and week: all classes of that subject, by time; cancelled lessons have no page
  const rph = [];
  for (const key of [...keys].sort((x, y) => x.localeCompare(y))) {
    const [subject, n] = key.split('|');
    const pages = results.filter(h => h.cls.subject === subject)
      .flatMap(h => h.rows.filter(r => r.week === Number(n)).map(row => ({ cls: h.cls, row, sp: h.sp, activities: h.activities })));
    if (!pages.some(p => p.row.status !== 'batal')) continue;
    pages.sort((x, y) => byTime(x.row, y.row));
    const html = renderRph({ year: K.year, week: Number(n), teacher: teacher || K.teacher, pages });
    rph.push({ subject, week: Number(n), html });
    writes.push({ path: rphPath(K, subject, n), text: html, kind: 'rph' });
  }

  const lessons = results
    .flatMap(h => h.rows.filter(r => r.week === week).map(row => ({
      classCode: h.cls.classCode, subject: h.cls.subject, subjectName: h.cls.subjectName, pupils: h.cls.pupils, rekod: h.rekod, row,
    })))
    .sort((x, y) => byTime(x.row, y.row));
  const w = calendar.weeks.find(x => x.n === week);
  const days = w.days.map(d => ({ date: d.date, dayName: d.dayName, holiday: d.holiday, exams: d.exams.map(e => e.name) }));
  return { writes, rph, lessons, classes, days, unplanned: unplannedSlots(versions, K.classes), warnings };
}

export { inputsOf, rekodPath, rphPath, runWeek };
```
Add `export * from './week.js';` to `src/core/index.js`.

- [ ] **Step 7: Create `src/cli/text.js`**

```js
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
```

- [ ] **Step 8: Rewrite `src/cli/rph.js` on `runWeek`**

```js
// Weekly RPH for every class in the class file; updates each class × subject rekod.
//
//   node src/cli/rph.js --classes sample/kelas-2026.md --week 35 [--today 2026-10-03]
//
// The class file names the takwim, timetables, events, rekod folder and output folder (relative to it).
// Rekod rows up to today are never changed; later rows are rebuilt unless the teacher changed
// Status or Catatan. Output: <Output>/<year>-M<n>-<SUBJECT>.html per subject and planned week,
// then warnings (stderr) and one position line per class.
import fs from 'node:fs';
import path from 'node:path';
import * as C from '../core/index.js';
import { summaryLine, fitWarning } from './text.js';

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.classes || !a.week) throw new Error('Usage: node src/cli/rph.js --classes <class file> --week <n> [--today yyyy-mm-dd]');
  const week = Number(String(a.week).replace(/^M/i, ''));
  const today = a.today || localToday();
  if (!/^\d{4}-\d\d-\d\d$/.test(today)) throw new Error(`--today "${today}" is not yyyy-mm-dd`);

  const classFile = path.resolve(a.classes);
  const dir = path.dirname(classFile);
  const shown = f => path.relative(process.cwd(), f) || f;
  const read = f => {
    const p = path.resolve(dir, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  };
  const r = C.runWeek({ read, classText: fs.readFileSync(classFile, 'utf8'), classFile: shown(classFile), week, today });

  // runWeek throws before returning anything, so a failed class never leaves half-written files
  for (const w of r.writes) {
    const p = path.resolve(dir, w.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, w.text);
  }
  r.writes.filter(w => w.kind === 'rph').forEach(w => console.log(shown(path.resolve(dir, w.path))));
  if (r.unplanned.length) console.log(`Not planned (not in the class file): ${r.unplanned.join(', ')}`);
  const warnings = [...r.warnings, ...r.classes.map(fitWarning).filter(Boolean)];
  warnings.forEach(w => console.warn('Warning:', w));
  r.classes.forEach(s => console.log(summaryLine(s)));
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
```
Note: error messages now name rekod files relative to the class file's folder (`rekod/rekod-2J-PJ.md:12`). `test/cli.js` runs with `cwd` = that folder, so its expectations stay as they are.

- [ ] **Step 9: Run every test and the proof**

```bash
node test/all.js
node src/cli/simulate.js --classes sample/kelas-2026.md > output/simulasi-4S-M3/ringkasan.txt
git diff --exit-code --quiet output/ && echo IDENTICAL
```
Expected: all tests pass (including `week: all tests passed`); `IDENTICAL` (the rekod, HTML and English summary are unchanged by this task).

- [ ] **Step 10: Commit**

```bash
git add src test
git commit -m "Add runWeek (shared by CLI and app), numeric class summary, optional Guru, weekOfDate"
```

---

### Task 4: A4 row rule, UTF-8 BOM, blank-Status warning, timing

**Files:**
- Modify: `src/core/util.js` (`stripBom`), every parser in `src/core/parse/`, `src/core/rekod-sync.js`, `src/core/render/rph.js`, `test/week.js`, `test/rph-render.js`
- Regenerate: `output/simulasi-4S-M3/*.html` (one CSS line each)

**Interfaces:**
- Consumes: Task 3.
- Produces: `stripBom(text)` in `util.js`; every `parse*` accepts text with a leading BOM; `syncRekod` warnings may include `<file>:<line>: Status blank, counted as not taught`.

- [ ] **Step 1: Write the failing tests**

Append to `test/rph-render.js` (before its success line):
```js
// A4 rule (W9): every lesson starts a page; a table row is not split across pages
const css = html([row()]);
assert.ok(css.includes('.rph { break-after: page; page-break-after: always; }'));
assert.ok(css.includes('tr { break-inside: avoid; page-break-inside: avoid; }'));
```
Append to `test/week.js` (before its success line):
```js
// A pdp row whose Status was blanked by hand (Monday 5 Oct is 4S M3, periods 2–3): warned, counted as not taught
files = base();
files.set('rekod/rekod-4S-M3.md', '| M35 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 7.1.1 |  | 35 |  |\n');
assert.ok(run(35, '2026-10-06', 'X').warnings.includes('rekod/rekod-4S-M3.md:1: Status blank, counted as not taught'));

// UTF-8 BOM (Windows Notepad) is accepted in every input and in the class file
files = base();
for (const [k, v] of files) files.set(k, '﻿' + v);
const bom = R.runWeek({ read, classText: '﻿' + classText(), classFile: 'kelas.md', week: 35, today: '2026-10-03', teacher: 'X' });
assert.strictEqual(bom.lessons.length, 3);

// Responsiveness (W13): one week for one class plans in under 100 ms once warm
files = base();
run(35, '2026-10-03', 'X');
const t0 = performance.now();
run(35, '2026-10-03', 'X');
const ms = performance.now() - t0;
assert.ok(ms < 100, `runWeek took ${ms.toFixed(0)} ms`);
```

- [ ] **Step 2: Run them to see them fail**

Run: `node test/rph-render.js; node test/week.js`
Expected: `rph-render.js` FAILS on the CSS assertion; `week.js` FAILS on the blank-Status warning.

- [ ] **Step 3: Implement**

`src/core/util.js`:
```js
// Windows Notepad may save UTF-8 with a byte-order mark; it would break the first line's match
const stripBom = s => String(s).replace(/^﻿/, '');
```
`syncRekod` must emit this warning for rows read from the file only (rows with a `line`). Export `stripBom`. In every parser (`parseTakwim`, `parseTimetable`, `parseClasses`, `parseEvents`, `parseActivities`, `parseDskp`, `parseDifficulty`, `parseRpt`, `parseRekod`), make the first statement `md = stripBom(md);`.

`src/core/rekod-sync.js`, after the week/date check loop:
```js
  // A hand-blanked Status on a lesson counts as not taught; say so instead of staying silent
  for (const r of rows)
    if (r.line && r.kind !== 'peperiksaan' && r.status === '') warnings.push(`${file}:${r.line}: Status blank, counted as not taught`);
```
`src/core/render/rph.js`, in the `<style>` block, after the `.rph:last-child` line:
```css
tr { break-inside: avoid; page-break-inside: avoid; }
```

- [ ] **Step 4: Run every test**

Run: `node test/all.js`
Expected: all pass.

- [ ] **Step 5: Regenerate the simulation and check that only the CSS line changed**

```bash
node src/cli/simulate.js --classes sample/kelas-2026.md > output/simulasi-4S-M3/ringkasan.txt
git diff --exit-code --quiet output/simulasi-4S-M3/rekod-4S-M3.md output/simulasi-4S-M3/ringkasan.txt && echo REKOD-SAME
git diff --ignore-cr-at-eol output/simulasi-4S-M3/2026-M3-M3.html
```
Expected: `REKOD-SAME`; the HTML diff shows exactly one added line, `tr { break-inside: avoid; page-break-inside: avoid; }`.

- [ ] **Step 6: Commit**

```bash
git add src test output/simulasi-4S-M3
git commit -m "A4 rule (rows not split), accept UTF-8 BOM, warn on blank Status, timing test"
```

---

### Task 5: App logic modules (pure, tested in Node)

**Files:**
- Create: `app/logic/paths.js`, `app/logic/status.js`, `app/logic/words.js`, `app/logic/marking.js`, `app/logic/rekod-diff.js`, `test/app-logic.js`

**Interfaces:**
- Consumes: `cells`, `periodRange`, `parseRekod` from `src/core/index.js`; ClassSummary (Task 3).
- Produces:
```js
// paths.js
dirOf(path) → string; baseName(path) → string
resolvePath(dir, rel) → string                // '/'-joined; '..' above the top is dropped
findFile(paths, wanted) → string | null       // exact, else the one path with the same file name; throws on a clash
// status.js
STATUS_OPTIONS = ['diajar', 'ditunda', 'batal']
statusLabel(status) → 'Taught' | 'Postponed' | 'Cancelled' | ''
needsReason(status) → boolean
// words.js
classLabel(s) → '4S Matematik'
positionWords(s) → { text, tone }             // tone: 'ok' | 'ahead' | 'warn' | 'bad' | 'none'
rptWeeksWords(s) → 'M31' | 'M30–M31' | ''
percentDone(s) → 0..100
fitWords(s) → string | null
// marking.js
applyMark(text, { date, periods }, { status, attendance, note }) → text   // throws on missing reason / unknown lesson
// rekod-diff.js
diffRekod(storedText, fileText, file) → [{ label, stored: View | null, file: View | null }]
diffSummary(diff) → '3 lessons differ: M5 Mon, M5 Tue, M7 Wed'
// View = { status, sp, attendance, note }
```

- [ ] **Step 1: Write the failing test `test/app-logic.js`**

```js
// node test/app-logic.js — the app's pure modules (paths, statuses, wording, marking, rekod diff)
import assert from 'node:assert';
import { dirOf, baseName, resolvePath, findFile } from '../app/logic/paths.js';
import { STATUS_OPTIONS, statusLabel, needsReason } from '../app/logic/status.js';
import { classLabel, positionWords, rptWeeksWords, percentDone, fitWords } from '../app/logic/words.js';
import { applyMark } from '../app/logic/marking.js';
import { diffRekod, diffSummary } from '../app/logic/rekod-diff.js';

// paths
assert.strictEqual(dirOf('sample/kelas-2026.md'), 'sample');
assert.strictEqual(dirOf('kelas-2026.md'), '');
assert.strictEqual(baseName('output/simulasi-4S-M3/rekod-4S-M3.md'), 'rekod-4S-M3.md');
assert.strictEqual(resolvePath('sample', '../output/rpt-mat-t4-2026.md'), 'output/rpt-mat-t4-2026.md');
assert.strictEqual(resolvePath('sample', 'takwim-smly-2026.md'), 'sample/takwim-smly-2026.md');
assert.strictEqual(resolvePath('sample', '..\\output\\x.md'), 'output/x.md');
assert.strictEqual(resolvePath('', '../../x.md'), 'x.md'); // climbs above the picked folders: dropped
const stored = ['sample/kelas-2026.md', 'output/rpt-mat-t4-2026.md', 'x/rekod-4S-M3.md', 'y/rekod-4S-M3.md', 'acara-2026.md'];
assert.strictEqual(findFile(stored, 'output/rpt-mat-t4-2026.md'), 'output/rpt-mat-t4-2026.md');
assert.strictEqual(findFile(stored, 'sample/acara-2026.md'), 'acara-2026.md'); // dropped without a folder
assert.strictEqual(findFile(stored, 'sample/none.md'), null);
assert.throws(() => findFile(stored, 'z/rekod-4S-M3.md'), /More than one file named rekod-4S-M3\.md: x\/rekod-4S-M3\.md, y\/rekod-4S-M3\.md/);
assert.strictEqual(findFile(stored, 'x/rekod-4S-M3.md'), 'x/rekod-4S-M3.md'); // exact match wins over a clash

// status
assert.deepStrictEqual(STATUS_OPTIONS.map(statusLabel), ['Taught', 'Postponed', 'Cancelled']);
assert.strictEqual(statusLabel(''), '');
assert.deepStrictEqual(STATUS_OPTIONS.map(needsReason), [false, true, true]);

// words
const S = o => ({ classCode: '4S', subject: 'M3', subjectName: 'MATEMATIK', hasDskp: true, hasRpt: true, spTotal: 70, spDone: 49,
  currentSp: '8.2.1', finished: false, rptEnd: 34, position: { status: 'onTrack', sp: '8.2.1', rptWeeks: [31, 31], weeks: 0 }, fit: null, ...o });
assert.strictEqual(classLabel(S()), '4S Matematik');
assert.strictEqual(classLabel(S({ subjectName: 'SAINS KOMPUTER' })), '4S Sains Komputer');
assert.deepStrictEqual(positionWords(S()), { text: 'On track', tone: 'ok' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'behind', sp: 'x', rptWeeks: [1, 1], weeks: 1 } })), { text: '1 week behind', tone: 'warn' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'behind', sp: 'x', rptWeeks: [1, 1], weeks: 3 } })), { text: '3 weeks behind', tone: 'bad' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'ahead', sp: 'x', rptWeeks: [1, 1], weeks: 5 } })), { text: '5 weeks ahead', tone: 'ahead' });
assert.deepStrictEqual(positionWords(S({ finished: true, position: { status: 'finished' } })), { text: 'DSKP finished · revision', tone: 'ok' });
assert.deepStrictEqual(positionWords(S({ position: { status: 'notInRpt', sp: '9.9.9' } })), { text: 'SP 9.9.9 not in RPT', tone: 'warn' });
assert.deepStrictEqual(positionWords(S({ hasRpt: false, position: null })), { text: 'No RPT', tone: 'none' });
assert.deepStrictEqual(positionWords(S({ hasDskp: false, position: null })), { text: 'No DSKP', tone: 'none' });
assert.strictEqual(rptWeeksWords(S()), 'M31');
assert.strictEqual(rptWeeksWords(S({ position: { status: 'behind', sp: 'x', rptWeeks: [30, 31], weeks: 1 } })), 'M30–M31');
assert.strictEqual(rptWeeksWords(S({ hasRpt: false, position: null })), '');
assert.strictEqual(percentDone(S()), 70);
assert.strictEqual(percentDone(S({ spTotal: 0, spDone: 0 })), 0);
assert.strictEqual(fitWords(S()), null);
assert.strictEqual(fitWords(S({ fit: { need: 1240.4, have: 1050, endWeek: 34 } })),
  '4S Matematik: needs 1,240 min for the remaining SPs, has 1,050 min until M34 — consider combining SPs');

// marking
const rekod = [
  '# Rekod 4S M3 2026', '',
  '| Minggu | Tarikh | Hari | Waktu | Masa | Jenis | Acara | SP | Status | Kehadiran | Catatan |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  '| M35 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 7.1.1 | diajar | 35 |  |',
  '| M35 | 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | diajar | 35 |  |',
].join('\n') + '\n';
const tue = { date: '2026-10-06', periods: '1–2' };
const m1 = applyMark(rekod, tue, { status: 'ditunda', attendance: 35, note: 'Mesyuarat | guru' });
assert.ok(m1.includes('| M35 | 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | ditunda | 35 | Mesyuarat / guru |'));
assert.ok(m1.includes('| M35 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 7.1.1 | diajar | 35 |  |')); // other rows untouched
assert.throws(() => applyMark(rekod, tue, { status: 'batal', attendance: 35, note: '' }), /A reason is required for Postponed and Cancelled/);
assert.throws(() => applyMark(rekod, tue, { status: 'ditunda', attendance: 35, note: '   ' }), /A reason is required/);
assert.ok(applyMark(rekod, tue, { status: 'diajar', attendance: 30, note: '' }).includes('| 7.1.2 | diajar | 30 |  |'));
assert.ok(applyMark(rekod, tue, { status: 'diajar', attendance: null, note: 'Baik' }).includes('| 7.1.2 | diajar |  | Baik |'));
assert.throws(() => applyMark(rekod, { date: '2026-10-09', periods: '1–2' }, { status: 'diajar', attendance: 1, note: '' }), /No lesson on 2026-10-09 at period 1 in this rekod/);
// CRLF file (saved on Windows): the mark still applies
const crlf = rekod.replace(/\n/g, '\r\n');
assert.ok(applyMark(crlf, tue, { status: 'batal', attendance: 0, note: 'Cuti' }).includes('| 7.1.2 | batal | 0 | Cuti |'));
// A note with a line break is kept on one line
assert.ok(applyMark(rekod, tue, { status: 'diajar', attendance: 35, note: 'a\nb' }).includes('| 35 | a b |'));

// rekod diff
assert.deepStrictEqual(diffRekod(rekod, rekod, 'f.md'), []);
assert.deepStrictEqual(diffRekod(rekod, crlf, 'f.md'), []); // same rows, Windows line endings
const changed = rekod.replace('| 7.1.2 | diajar | 35 |  |', '| 7.1.2 | ditunda | 35 | Mesyuarat |')
  + '| M36 | 2026-10-12 | Isnin | 2–3 | 7:30–8:30 | pdp | X-Break | 7.1.3 | diajar | 35 |  |\n';
const d = diffRekod(rekod, changed, 'f.md');
assert.deepStrictEqual(d.map(x => x.label), ['M35 Tue', 'M36 Mon']);
assert.deepStrictEqual(d[0].stored, { status: 'diajar', sp: '7.1.2', attendance: 35, note: '' });
assert.deepStrictEqual(d[0].file, { status: 'ditunda', sp: '7.1.2', attendance: 35, note: 'Mesyuarat' });
assert.strictEqual(d[1].stored, null);
assert.strictEqual(diffSummary(d), '2 lessons differ: M35 Tue, M36 Mon');
assert.strictEqual(diffSummary(d.slice(0, 1)), '1 lesson differs: M35 Tue');
assert.throws(() => diffRekod(rekod, rekod.replace('| diajar | 35 |  |', '| tunda | 35 |  |'), 'f.md'), /f\.md:5: Status "tunda" not recognised/);

console.log('app-logic: all tests passed');
```

- [ ] **Step 2: Run it to see it fail**

Run: `node test/app-logic.js`
Expected: FAIL with `Cannot find module '.../app/logic/paths.js'`.

- [ ] **Step 3: Write `app/logic/paths.js`**

```js
// Paths of picked files: '/'-separated, relative to the picked folders' parent
// (e.g. 'sample/kelas-2026.md'). A dropped file has only its name.
const dirOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const baseName = p => p.slice(p.lastIndexOf('/') + 1);

// A path from the class file, relative to the class file's folder. '..' above the top is dropped,
// so a file outside the picked folders can still be found by its name (findFile).
function resolvePath(dir, rel) {
  const parts = dir ? dir.split('/') : [];
  for (const s of rel.replace(/\\/g, '/').split('/')) {
    if (s === '' || s === '.') continue;
    if (s === '..') parts.pop();
    else parts.push(s);
  }
  return parts.join('/');
}

// The stored path for a wanted path: exact match, else the only stored file with the same name.
// Two stored files with that name: an error naming both, never a silent pick.
function findFile(paths, wanted) {
  if (paths.includes(wanted)) return wanted;
  const same = paths.filter(p => baseName(p) === baseName(wanted));
  if (same.length > 1) throw new Error(`More than one file named ${baseName(wanted)}: ${same.join(', ')}`);
  return same[0] || null;
}

export { dirOf, baseName, resolvePath, findFile };
```

- [ ] **Step 4: Write `app/logic/status.js`**

```js
// Rekod status values (Malay, stored in the files) and their English labels in the app
const STATUS_OPTIONS = ['diajar', 'ditunda', 'batal'];
const LABELS = { diajar: 'Taught', ditunda: 'Postponed', batal: 'Cancelled' };

const statusLabel = s => LABELS[s] || '';
// Postponed and Cancelled need a reason typed by the teacher (W5)
const needsReason = s => s === 'ditunda' || s === 'batal';

export { STATUS_OPTIONS, statusLabel, needsReason };
```

- [ ] **Step 5: Write `app/logic/words.js`**

```js
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
```

- [ ] **Step 6: Write `app/logic/marking.js`**

```js
// Apply the teacher's mark to one lesson in a rekod file's text. Only that row's Status,
// Kehadiran and Catatan cells change; runWeek then rebuilds the rest of the file.
import { cells, periodRange } from '../../src/core/index.js';
import { needsReason } from './status.js';

// '|' would break the table; a line break would break the row
const cell = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s*\r?\n\s*/g, ' ').trim();

function applyMark(text, { date, periods }, { status, attendance, note }) {
  if (needsReason(status) && !cell(note)) throw new Error('A reason is required for Postponed and Cancelled');
  const first = periodRange(periods)[0];
  let found = false;
  const out = text.split(/\r?\n/).map(line => {
    if (!/^\| *M\d+ *\|/.test(line)) return line;
    const c = cells(line);
    if (c[1] !== date || periodRange(c[3])[0] !== first) return line;
    found = true;
    c[8] = status;
    c[9] = attendance == null ? '' : String(attendance);
    c[10] = cell(note);
    return `| ${c.join(' | ')} |`;
  });
  if (!found) throw new Error(`No lesson on ${date} at period ${first} in this rekod`);
  return out.join('\n');
}

export { applyMark };
```

- [ ] **Step 7: Write `app/logic/rekod-diff.js`**

```js
// Differences between the browser's rekod and a re-picked rekod file, lesson by lesson
// (keyed by date and first period). Line endings and header text are ignored.
import { parseRekod, periodRange } from '../../src/core/index.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const first = r => periodRange(r.periods)[0];
const key = r => `${r.date} ${String(first(r)).padStart(2, '0')}`;
const view = r => ({ status: r.status, sp: r.sp.join(', '), attendance: r.attendance, note: r.note });
const same = (a, b) => JSON.stringify(view(a)) === JSON.stringify(view(b));

function diffRekod(storedText, fileText, file) {
  const a = new Map(parseRekod(storedText, 'stored rekod').map(r => [key(r), r]));
  const b = new Map(parseRekod(fileText, file).map(r => [key(r), r]));
  const out = [];
  for (const k of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(k), y = b.get(k);
    if (x && y && same(x, y)) continue;
    const r = x || y;
    out.push({
      label: `M${r.week} ${DAYS[new Date(`${r.date}T00:00:00Z`).getUTCDay()]}`,
      stored: x ? view(x) : null,
      file: y ? view(y) : null,
    });
  }
  return out;
}

const diffSummary = d => `${d.length} ${d.length === 1 ? 'lesson differs' : 'lessons differ'}: ${d.map(x => x.label).join(', ')}`;

export { diffRekod, diffSummary };
```

- [ ] **Step 8: Run the tests**

Run: `node test/app-logic.js && node test/all.js`
Expected: `app-logic: all tests passed`, then every test passes.

- [ ] **Step 9: Commit**

```bash
git add app/logic test/app-logic.js
git commit -m "Add app logic: paths, statuses, wording, marking, rekod diff"
```

---

### Task 6: App shell, storage, controller, Files screen with Profile; dev server

**Files:**
- Create: `tools/serve.js`, `app/index.html`, `app/app.css`, `app/config.js`, `app/store.js`, `app/state.js`, `app/main.js`, `app/inputs.js`, `app/week-view.js` (stub), `app/classes-view.js` (stub)

**Interfaces:**
- Consumes: `src/core/index.js` (`parseClasses`, `parseTakwim`, `parseTimetable`, `parseEvents`, `parseDskp`, `parseActivities`, `parseRpt`, `parseRekod`, `buildCalendar`, `weekOfDate`, `inputsOf`, `runWeek`); Task 5 modules.
- Produces (used by Tasks 7–9):
```js
// app/state.js
state: { files: Map, profile, classFile, week, today, tab: 'week'|'classes'|'files', result, error, unsaved: { [path]: 'yyyy-mm-dd' }, setup: { missing, errors }, persisted, lastImport }
onChange(fn); emit()
load(); refreshSetup(); ready() → boolean
weekInfo() → { weeks: [n], todayWeek: n|null, year } | null
recalc(); setWeek(n); goToday(); setTab(tab)
setProfile(name); chooseClassFile(path)
importFiles([{ path, text }]) → { added, rejected: [{ path, error }], conflicts: [{ path, text, diff }] }
confirmRekod(conflict); dropConflict(conflict)
mark(lesson, { status, attendance, note }) → { ok: true } | { ok: false, error }
// app/store.js
open(); allFiles() → Map; putFiles([[path, text]]); getSetting(key); setSetting(key, value)
```

- [ ] **Step 1: `tools/serve.js`**

```js
// Local development server for the app (ES modules and service workers need http, not file://).
//   node tools/serve.js [port]   →   http://localhost:8080/app/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional second argument: another folder to serve (used to check a release copy)
const root = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 8080;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.md': 'text/markdown',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.join(root, url);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: url + '/' }).end(); return; }
    file = path.join(file, 'index.html');
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': `${TYPES[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Lesson Planner (dev): http://localhost:${port}/app/`));
```

- [ ] **Step 2: `app/config.js`, `app/index.html`, `app/app.css`**

`app/config.js`:
```js
// The release script (tools/release.js) replaces this name with the production name.
export const APP_NAME = 'Lesson Planner (dev)';
```
`app/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lesson Planner</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="app.css">
<script type="module" src="main.js"></script>
</head>
<body>
<header id="top"></header>
<div id="banner"></div>
<main id="view"></main>
</body>
</html>
```
`app/app.css` (plain on purpose, W13):
```css
:root { --ok: #2e7d32; --ahead: #1565c0; --warn: #e65100; --bad: #c62828; --muted: #666; --line: #ccc; --bg: #fff; --fg: #111; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.4 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
#top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--bg); z-index: 1; }
#top .name { font-weight: 600; margin-right: 8px; }
#top nav { display: flex; gap: 4px; margin-left: 8px; }
.spacer { flex: 1; }
button { font: inherit; padding: 3px 10px; border: 1px solid var(--line); border-radius: 4px; background: #f6f6f6; cursor: pointer; }
button.on { color: #fff; border-color: transparent; }
button.on.diajar { background: var(--ok); } button.on.ditunda { background: var(--warn); } button.on.batal { background: var(--bad); }
nav button.current { background: var(--fg); color: var(--bg); }
.badge { padding: 2px 8px; border-radius: 10px; color: #fff; font-size: 12px; }
.tone-ok { background: var(--ok); } .tone-ahead { background: var(--ahead); } .tone-warn { background: var(--warn); } .tone-bad { background: var(--bad); } .tone-none { background: var(--muted); }
.unsaved { color: var(--warn); } .unsaved.old { color: var(--bad); font-weight: 600; }
.note { color: var(--muted); }
#banner p { margin: 0; padding: 6px 12px; }
.banner-warn { background: #fff4d6; } .banner-error { background: #fde0e0; }
main { padding: 12px; }
.week { display: flex; gap: 12px; align-items: flex-start; }
#cards { width: 44%; min-width: 320px; }
#previews { flex: 1; min-width: 0; }
.card { border: 1px dashed var(--line); border-radius: 6px; padding: 8px; margin-bottom: 8px; }
.card.diajar { border: 2px solid var(--ok); } .card.ditunda { border: 2px solid var(--warn); } .card.batal { border: 2px solid var(--bad); }
.card.exam, .day.off { background: #eee; border: 1px solid var(--line); color: var(--muted); }
.card .sp { color: var(--muted); }
.card .buttons { margin: 6px 0; display: flex; gap: 4px; }
.card input { font: inherit; padding: 2px 4px; }
.card input[data-field="attendance"] { width: 4.5em; }
.card input[data-field="note"] { width: 60%; }
.card .err { color: var(--bad); }
.days { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.day.off { padding: 2px 8px; border-radius: 4px; }
.errorbar { background: #fde0e0; color: var(--bad); padding: 6px 8px; margin-bottom: 8px; border-radius: 4px; }
.warnings { color: var(--muted); font-size: 12px; }
.pv { margin-bottom: 12px; }
.pv header { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.pv iframe { width: 100%; height: 80vh; border: 1px solid var(--line); background: #777; }
table.classes { border-collapse: collapse; width: 100%; }
table.classes th, table.classes td { border-bottom: 1px solid var(--line); padding: 6px 8px; text-align: left; }
table.classes tr[data-row] { cursor: pointer; }
.bar { display: inline-block; width: 100px; height: 8px; background: #eee; border-radius: 4px; vertical-align: middle; margin-right: 6px; }
.bar span { display: block; height: 100%; background: var(--ok); border-radius: 4px; }
.files section { margin-bottom: 16px; }
.drop { border: 2px dashed var(--line); border-radius: 6px; padding: 16px; text-align: center; color: var(--muted); margin-top: 8px; }
.drop.over { border-color: var(--ahead); color: var(--ahead); }
.diff td, .diff th { padding: 2px 8px; border-bottom: 1px solid var(--line); }
.fatal { padding: 24px; font-size: 16px; }
@media print { #top, #banner { display: none; } }
```

- [ ] **Step 3: `app/store.js`**

```js
// IndexedDB: 'files' (path → text) and 'settings' (key → value). One database per origin.
const NAME = 'lesson-planner', VERSION = 1;
let db = null;

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('IndexedDB is not available')); return; }
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => { r.result.createObjectStore('files'); r.result.createObjectStore('settings'); };
    r.onsuccess = () => resolve((db = r.result));
    r.onerror = () => reject(r.error || new Error('IndexedDB could not be opened'));
  });
}

function run(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Storage write aborted'));
  });
}

async function allFiles() {
  const keys = await run('files', 'readonly', s => s.getAllKeys());
  const values = await run('files', 'readonly', s => s.getAll());
  return new Map(keys.map((k, i) => [k, values[i]]));
}
const putFiles = entries => run('files', 'readwrite', s => { for (const [k, v] of entries) s.put(v, k); return null; });
const getSetting = key => run('settings', 'readonly', s => s.get(key));
const setSetting = (key, value) => run('settings', 'readwrite', s => s.put(value, key));

export { open, allFiles, putFiles, getSetting, setSetting };
```

- [ ] **Step 4: `app/state.js` (the controller)**

```js
// App state and actions. Views read `state` and call these actions; every change ends in emit().
// Planning always goes through runWeek (W1); a failed run stores nothing and undoes the change (W4).
import * as C from '../src/core/index.js';
import * as store from './store.js';
import { dirOf, baseName, resolvePath, findFile } from './logic/paths.js';
import { applyMark } from './logic/marking.js';
import { diffRekod } from './logic/rekod-diff.js';

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

const state = {
  files: new Map(), profile: '', classFile: '', week: null, today: localToday(), tab: 'week',
  result: null, error: '', unsaved: {}, setup: { missing: [], errors: [] }, persisted: true, lastImport: null,
};
const listeners = new Set();
const onChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(fn => fn());

const PARSERS = {
  takwim: t => C.parseTakwim(t), timetable: C.parseTimetable, events: C.parseEvents, dskp: t => C.parseDskp(t),
  activities: C.parseActivities, rpt: C.parseRpt, rekod: C.parseRekod, classes: C.parseClasses,
};

const classDir = () => dirOf(state.classFile);
const keyFor = rel => findFile([...state.files.keys()], resolvePath(classDir(), rel));
function read(rel) {
  const k = keyFor(rel);
  return k == null ? null : state.files.get(k);
}
const classes = () => C.parseClasses(state.files.get(state.classFile), state.classFile);

async function load() {
  await store.open();
  state.files = await store.allFiles();
  state.profile = (await store.getSetting('profile')) || '';
  state.classFile = (await store.getSetting('classFile')) || '';
  state.unsaved = (await store.getSetting('unsaved')) || {};
  state.week = (await store.getSetting('week')) || null;
  if (state.classFile && !state.files.has(state.classFile)) state.classFile = '';
  refreshSetup();
}

// Missing inputs and parse errors for the chosen class file (recomputed only when files change)
function refreshSetup() {
  const out = { missing: [], errors: [] };
  if (state.classFile) {
    try {
      for (const { path, role } of C.inputsOf(classes())) {
        let key;
        try { key = keyFor(path); } catch (e) { out.errors.push(e.message); continue; }
        if (key == null) { out.missing.push(resolvePath(classDir(), path)); continue; }
        try { PARSERS[role](state.files.get(key), key); } catch (e) { out.errors.push(e.message); }
      }
    } catch (e) { out.errors.push(e.message); }
  }
  state.setup = out;
}
const ready = () => !!state.classFile && !state.setup.missing.length && !state.setup.errors.length;

let calCache = { text: null, cal: null };
function weekInfo() {
  if (!ready()) return null;
  const K = classes();
  const text = read(K.takwim);
  if (text !== calCache.text) calCache = { text, cal: C.buildCalendar(C.parseTakwim(text)) };
  const cal = calCache.cal;
  return { weeks: cal.weeks.map(w => w.n), todayWeek: C.weekOfDate(cal, state.today), year: K.year };
}

function runFor(week) {
  return C.runWeek({ read, classText: state.files.get(state.classFile), classFile: state.classFile, week, today: state.today, teacher: state.profile });
}

// Store the rekod texts runWeek wrote (in memory now, IndexedDB right after drawing)
function keepRekod(result) {
  const changed = [];
  for (const w of result.writes.filter(x => x.kind === 'rekod')) {
    const key = keyFor(w.path) ?? resolvePath(classDir(), w.path);
    if (state.files.get(key) !== w.text) { state.files.set(key, w.text); changed.push([key, w.text]); }
  }
  return changed;
}
const persist = changed => (changed.length ? store.putFiles(changed) : Promise.resolve());

function recalc() {
  state.error = '';
  const info = weekInfo();
  if (!info) { state.result = null; emit(); return; }
  if (!info.weeks.includes(state.week)) state.week = info.todayWeek ?? info.weeks[0];
  let changed = [];
  try {
    state.result = runFor(state.week);
    changed = keepRekod(state.result);
  } catch (e) { state.result = null; state.error = e.message; }
  emit();
  persist(changed).catch(e => { state.error = `Could not store the rekod: ${e.message}`; emit(); });
}

function setWeek(n) { state.week = n; store.setSetting('week', n); recalc(); }
function goToday() { const info = weekInfo(); if (info && info.todayWeek != null) setWeek(info.todayWeek); }
function setTab(tab) { state.tab = tab; emit(); }
async function setProfile(name) { state.profile = name.trim(); await store.setSetting('profile', state.profile); recalc(); }
async function chooseClassFile(path) { state.classFile = path; await store.setSetting('classFile', path); refreshSetup(); recalc(); }

// Parser role of a picked file, from its name or from the chosen class file's references
function roleOf(path) {
  if (/^kelas-.*\.md$/.test(baseName(path))) return 'classes';
  if (/^rekod-.*\.md$/.test(baseName(path))) return 'rekod';
  if (!state.classFile) return null;
  try {
    for (const x of C.inputsOf(classes()))
      if (resolvePath(classDir(), x.path) === path || baseName(x.path) === baseName(path)) return x.role;
  } catch { /* a broken class file is reported by refreshSetup */ }
  return null;
}

async function importFiles(list) {
  const res = { added: [], rejected: [], conflicts: [] };
  const accept = [];
  for (const { path, text } of list) {
    const role = roleOf(path);
    if (role) {
      try { PARSERS[role](text, path); } catch (e) { res.rejected.push({ path, error: e.message }); continue; }
    }
    // A file from a picked folder keeps its own path (two folders may hold the same name; W8 / Review Focus 2).
    // A dropped file has only its name: it replaces the stored file of that name, if there is exactly one.
    let key;
    try { key = path.includes('/') ? path : (findFile([...state.files.keys()], path) ?? path); } catch (e) { res.rejected.push({ path, error: e.message }); continue; }
    if (role === 'rekod' && state.files.has(key) && state.files.get(key) !== text) {
      const diff = diffRekod(state.files.get(key), text, path);
      if (diff.length) { res.conflicts.push({ path: key, text, diff }); continue; }
    }
    accept.push([key, text]);
  }
  await store.putFiles(accept);
  for (const [k, t] of accept) { state.files.set(k, t); res.added.push(k); }
  const classFiles = [...state.files.keys()].filter(p => /^kelas-.*\.md$/.test(baseName(p)));
  if (!state.classFile && classFiles.length === 1) { state.classFile = classFiles[0]; await store.setSetting('classFile', state.classFile); }
  state.lastImport = res;
  refreshSetup();
  recalc();
  return res;
}

// The re-picked rekod file wins (W8); its unsaved flag is cleared
async function confirmRekod(c) {
  await store.putFiles([[c.path, c.text]]);
  state.files.set(c.path, c.text);
  delete state.unsaved[c.path];
  await store.setSetting('unsaved', state.unsaved);
  state.lastImport.conflicts = state.lastImport.conflicts.filter(x => x !== c);
  refreshSetup();
  recalc();
}
function dropConflict(c) { state.lastImport.conflicts = state.lastImport.conflicts.filter(x => x !== c); emit(); }

// Mark one lesson: change its rekod row, run the week again, keep the result only if it succeeds
function mark(lesson, change) {
  const key = keyFor(lesson.rekod);
  const before = state.files.get(key);
  let text;
  try { text = applyMark(before, lesson.row, change); } catch (e) { return { ok: false, error: e.message }; }
  state.files.set(key, text);
  let result;
  try { result = runFor(state.week); } catch (e) {
    state.files.set(key, before);
    state.error = e.message;
    emit();
    return { ok: false, error: e.message };
  }
  state.error = '';
  state.result = result;
  const changed = keepRekod(result);
  if (!changed.some(([k]) => k === key)) changed.push([key, state.files.get(key)]);
  if (!state.unsaved[key]) state.unsaved[key] = state.today;
  emit();
  persist(changed).then(() => store.setSetting('unsaved', state.unsaved))
    .catch(e => { state.error = `Could not store the rekod: ${e.message}`; emit(); });
  return { ok: true };
}

export {
  state, onChange, emit, load, refreshSetup, ready, weekInfo, recalc, setWeek, goToday, setTab,
  setProfile, chooseClassFile, importFiles, confirmRekod, dropConflict, mark, localToday,
};
```

- [ ] **Step 5: `app/inputs.js` (Files screen)**

```js
// Files screen: Profile, folder picking / dropping, class file choice, setup status, re-pick conflicts
import { state, setProfile, chooseClassFile, importFiles, confirmRekod, dropConflict } from './state.js';
import { baseName } from './logic/paths.js';
import { diffSummary } from './logic/rekod-diff.js';
import { statusLabel } from './logic/status.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function readList(fileList) {
  const out = [];
  for (const f of fileList) if (f.name.endsWith('.md')) out.push({ path: f.webkitRelativePath || f.name, text: await f.text() });
  return out;
}

const side = v => (v ? `${esc(statusLabel(v.status) || v.status || '—')} · SP ${esc(v.sp || '—')} · ${esc(v.note || '')}` : '<i>not in this copy</i>');

function conflictHtml(c, i) {
  return `<div class="conflict"><p><b>${esc(baseName(c.path))}</b>: ${esc(diffSummary(c.diff))}</p>
<table class="diff"><tr><th>Lesson</th><th>In the app</th><th>In the file</th></tr>
${c.diff.map(d => `<tr><td>${esc(d.label)}</td><td>${side(d.stored)}</td><td>${side(d.file)}</td></tr>`).join('')}</table>
<p><button data-replace="${i}">Replace with the file</button> <button data-keep="${i}">Keep the app's copy</button></p></div>`;
}

function renderFiles(view) {
  view.dataset.screen = 'files';
  const classFiles = [...state.files.keys()].filter(p => /^kelas-.*\.md$/.test(baseName(p))).sort();
  const imp = state.lastImport;
  const s = state.setup;
  view.innerHTML = `<div class="files">
<h2>Files</h2>
<section><h3>Profile</h3>
<label>Your name (printed as NAMA GURU) <input id="profile" value="${esc(state.profile)}" placeholder="Your name"></label>
${state.profile ? '' : '<p class="note">No name yet: NAMA GURU will be blank on the RPH.</p>'}</section>
<section><h3>Your folders</h3>
<p>Pick your <code>sample</code> folder, then your <code>output</code> folder (or wherever your rekod and RPT live). Only .md files are read; they stay in this browser.</p>
<label><button type="button" id="pickFolder">Pick a folder</button><input type="file" id="folder" webkitdirectory multiple hidden></label>
<label><button type="button" id="pickFiles">Pick files</button><input type="file" id="files" accept=".md" multiple hidden></label>
<div id="drop" class="drop">Drop .md files here</div>
<p class="note">${state.files.size} files stored.</p></section>
<section><h3>Class file</h3>
${classFiles.length ? `<select id="classFile"><option value="">Choose…</option>${classFiles.map(p => `<option ${p === state.classFile ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : '<p class="note">No kelas-*.md picked yet.</p>'}
${s.missing.map(m => `<p class="err">Missing: ${esc(m)}</p>`).join('')}
${s.errors.map(m => `<p class="err">${esc(m)}</p>`).join('')}
${state.classFile && !s.missing.length && !s.errors.length ? '<p>All files found. Open the <b>Week</b> tab.</p>' : ''}</section>
${imp ? `<section><h3>Last import</h3><p>${imp.added.length} file(s) stored.</p>
${imp.rejected.map(r => `<p class="err">Rejected ${esc(r.path)}: ${esc(r.error)} (the stored copy, if any, is kept)</p>`).join('')}
${imp.conflicts.map(conflictHtml).join('')}</section>` : ''}
</div>`;

  const take = async fileList => importFiles(await readList(fileList));
  view.querySelector('#profile').onchange = e => setProfile(e.target.value);
  view.querySelector('#pickFolder').onclick = () => view.querySelector('#folder').click();
  view.querySelector('#pickFiles').onclick = () => view.querySelector('#files').click();
  view.querySelector('#folder').onchange = e => take(e.target.files);
  view.querySelector('#files').onchange = e => take(e.target.files);
  const drop = view.querySelector('#drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files); };
  const sel = view.querySelector('#classFile');
  if (sel) sel.onchange = e => e.target.value && chooseClassFile(e.target.value);
  view.querySelectorAll('[data-replace]').forEach(b => { b.onclick = () => confirmRekod(imp.conflicts[Number(b.dataset.replace)]); });
  view.querySelectorAll('[data-keep]').forEach(b => { b.onclick = () => dropConflict(imp.conflicts[Number(b.dataset.keep)]); });
}

export { renderFiles, esc };
```

- [ ] **Step 6: `app/main.js` (start-up, top bar, banners, screen switching) and view stubs**

```js
// Start-up, top bar, banners and screen switching. Screens: Week, Classes, Files.
import { APP_NAME } from './config.js';
import { state, onChange, load, ready, weekInfo, recalc, setWeek, goToday, setTab } from './state.js';
import { renderFiles, esc } from './inputs.js';
import { renderWeek } from './week-view.js';
import { renderClasses } from './classes-view.js';
import { saveRekod } from './export.js';
import { positionWords, classLabel } from './logic/words.js';
import { daysBetween } from '../src/core/index.js';

document.title = APP_NAME;
const top = document.getElementById('top');
const banner = document.getElementById('banner');
const view = document.getElementById('view');

function weekDates() {
  const d = state.result && state.result.days;
  if (!d || !d.length) return '';
  const f = (iso, o) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
  return `${f(d[0].date, { day: 'numeric' })}–${f(d[d.length - 1].date, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function renderTop() {
  const info = weekInfo();
  const unsaved = Object.values(state.unsaved);
  const oldest = unsaved.length ? unsaved.sort()[0] : null;
  const old = oldest && daysBetween(oldest, state.today) > 7;
  const tab = (id, label) => `<button data-tab="${id}" class="${state.tab === id ? 'current' : ''}">${label}</button>`;
  top.innerHTML = `<span class="name">${esc(APP_NAME)}</span>
${info ? `<button data-act="prev" title="Previous week">◀</button> <b>Week ${state.week}</b> <span>${esc(weekDates())}</span>
<button data-act="next" title="Next week">▶</button> <button data-act="today">Today</button>
${info.todayWeek == null ? `<span class="note">Today is not in the ${info.year} takwim</span>` : ''}` : ''}
<nav>${tab('week', 'Week')}${tab('classes', 'Classes')}${tab('files', '⚙ Files')}</nav>
<span class="spacer"></span>
${(state.result ? state.result.classes : []).map(s => { const p = positionWords(s); return `<span class="badge tone-${p.tone}">${esc(classLabel(s))}: ${esc(p.text)}</span>`; }).join(' ')}
${unsaved.length ? `<span class="unsaved ${old ? 'old' : ''}">● Unsaved changes</span>` : ''}
<button data-act="save" ${unsaved.length ? '' : 'disabled'}>Save rekod</button>`;
}

function renderBanner() {
  const out = [];
  if (!state.persisted) out.push('<p class="banner-warn">This browser may clear the app\'s data. Use Save rekod after each session.</p>');
  banner.innerHTML = out.join('');
}

function draw() {
  renderTop();
  renderBanner();
  if (state.tab === 'files' || !ready()) renderFiles(view);
  else if (state.tab === 'classes') renderClasses(view);
  else renderWeek(view);
}

top.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const info = weekInfo();
  if (b.dataset.tab) setTab(b.dataset.tab);
  else if (b.dataset.act === 'today') goToday();
  else if (b.dataset.act === 'save') saveRekod();
  else if (info && (b.dataset.act === 'prev' || b.dataset.act === 'next')) {
    const i = info.weeks.indexOf(state.week) + (b.dataset.act === 'next' ? 1 : -1);
    if (i >= 0 && i < info.weeks.length) setWeek(info.weeks[i]);
  }
});

async function start() {
  try { await load(); } catch (e) {
    document.body.innerHTML = `<p class="fatal">This browser cannot store data here (${esc(e.message)}). Open the app in a normal Chrome or Edge window, not a private one.</p>`;
    return;
  }
  if (navigator.storage && navigator.storage.persist) state.persisted = await navigator.storage.persist();
  // No service worker in development (it would serve stale files); '?sw=1' turns it on for an offline check
  const local = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
  if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js');
  // Open on the week containing today (§5.3); otherwise the last week shown
  const info = weekInfo();
  if (info && info.todayWeek != null) state.week = info.todayWeek;
  onChange(draw);
  recalc();
}

start();
```
Create stubs so the app loads before Tasks 7–9:

`app/week-view.js`:
```js
export function renderWeek(view) { view.dataset.screen = 'week'; view.textContent = 'Week screen: Task 7.'; }
```
`app/classes-view.js`:
```js
export function renderClasses(view) { view.dataset.screen = 'classes'; view.textContent = 'Classes dashboard: Task 8.'; }
```
`app/export.js`:
```js
export function saveRekod() {}
```

- [ ] **Step 7: Check that the app loads and the Files screen works**

Run: `node tools/serve.js` (leave it running), then open `http://localhost:8080/app/` in Chrome or Edge.
Expected:
1. The tab title is "Lesson Planner (dev)" and the Files screen shows.
2. Type a name in Profile, then reload: the name is still there.
3. Pick the `sample` folder, then the `output` folder: "All files found. Open the Week tab." appears (the class file is chosen automatically when there is only one).
4. Clicking **Week** shows "Week screen: Task 7." and the top bar shows the current week, its dates and the "4S Matematik: …" badge.
5. Pick `sample` again: no errors, and the stored-files count is unchanged.
6. In DevTools → Console: no errors.

Also run `node test/all.js`. Expected: all pass (the app files are not imported by Node tests except `app/logic`).

- [ ] **Step 8: Commit**

```bash
git add app tools/serve.js
git commit -m "App shell: IndexedDB store, controller, top bar, Files screen with Profile; dev server"
```

---

### Task 7: Week screen and RPH preview

**Files:**
- Create: `app/preview.js`
- Modify: `app/week-view.js` (replace the stub)

**Interfaces:**
- Consumes: `state`, `mark`, `setWeek` from `state.js`; `runWeek` result fields `lessons`, `days`, `rph`, `warnings`; `STATUS_OPTIONS`, `statusLabel`, `needsReason`.
- Produces: `updatePreview(box, rph)`, `scrollToLesson(subject, index)` in `preview.js`.

- [ ] **Step 1: `app/preview.js`**

```js
// RPH preview: one iframe per subject with the real printable HTML (what you see is what prints).
// Redrawn after the cards, so clicks stay fast (W13); unchanged HTML is not reloaded.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let shown = new Map(); // subject → html
let pending = 0;

function updatePreview(box, rph) {
  clearTimeout(pending);
  pending = setTimeout(() => draw(box, rph), 0);
}

function draw(box, rph) {
  if (!rph.length) { box.innerHTML = '<p class="note">No RPH pages this week.</p>'; shown = new Map(); return; }
  const subjects = rph.map(p => p.subject).join('|');
  if (box.dataset.subjects !== subjects) {
    box.dataset.subjects = subjects;
    box.innerHTML = rph.map(p => `<div class="pv" data-subject="${esc(p.subject)}">
<header><b>RPH preview · ${esc(p.subject)}</b><span class="spacer"></span>
<button data-print="${esc(p.subject)}">Print week</button> <button data-open="${esc(p.subject)}">Open in new tab</button></header>
<iframe title="RPH ${esc(p.subject)}"></iframe></div>`).join('');
    shown = new Map();
    box.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      const subject = b.dataset.print || b.dataset.open;
      const html = shown.get(subject);
      if (b.dataset.print) { const f = frame(box, subject); f.contentWindow.focus(); f.contentWindow.print(); }
      if (b.dataset.open && html) {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    };
  }
  for (const p of rph) {
    if (shown.get(p.subject) === p.html) continue;
    frame(box, p.subject).srcdoc = p.html;
    shown.set(p.subject, p.html);
  }
}

const frame = (box, subject) => box.querySelector(`.pv[data-subject="${CSS.escape(subject)}"] iframe`);

// Scroll a subject's preview to its index-th page (cancelled lessons have no page)
function scrollToLesson(box, subject, index) {
  const f = frame(box, subject);
  const page = f && f.contentDocument && f.contentDocument.querySelectorAll('section.rph')[index];
  if (page) page.scrollIntoView({ block: 'start' });
}

export { updatePreview, scrollToLesson };
```

- [ ] **Step 2: `app/week-view.js`**

```js
// Week screen (layout A): lesson cards on the left, RPH preview on the right.
// Cards redraw at once after a mark; the preview follows (W13).
import { state, mark } from './state.js';
import { STATUS_OPTIONS, statusLabel, needsReason } from './logic/status.js';
import { updatePreview, scrollToLesson } from './preview.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dayDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const keyOf = l => `${l.rekod}|${l.row.date}|${l.row.periods}`;

let pendingReason = null;   // { key, status } while a Postponed / Cancelled reason is being typed
let cardError = null;       // { key, message }
let lastWeek = null, lastSp = new Map(), moved = new Set();

function card(l, i) {
  const r = l.row, k = keyOf(l);
  const head = `<b>${esc(dayDate(r.date))}</b> · ${esc(r.time)} · ${esc(l.classCode)} ${esc(l.subjectName)}${r.kind === 'tutorial' ? ' · Tutorial' : ''}${r.event ? ` · <i>${esc(r.event)}</i>` : ''}`;
  if (r.kind === 'peperiksaan') return `<div class="card exam">${head}<br>Exam: ${esc(r.event)}</div>`;
  const status = pendingReason && pendingReason.key === k ? pendingReason.status : r.status;
  const reason = needsReason(status);
  const btn = s => `<button data-i="${i}" data-status="${s}" class="${status === s ? `on ${s}` : ''}">${statusLabel(s)}</button>`;
  const err = cardError && cardError.key === k ? `<div class="err">${esc(cardError.message)}</div>` : '';
  return `<div class="card ${esc(r.status)}" data-i="${i}">
<div>${head}</div>
<div class="sp">SP ${esc(r.sp.join(', ') || '—')}${moved.has(k) ? ' <small>← SPs moved since last view</small>' : ''}</div>
<div class="buttons">${STATUS_OPTIONS.map(btn).join('')}</div>
<label>Attendance <input type="number" min="0" data-i="${i}" data-field="attendance" value="${r.attendance ?? ''}"> / ${l.pupils ?? ''}</label>
<label>${reason ? 'Reason (required)' : 'Notes'} <input data-i="${i}" data-field="note" value="${esc(r.note)}" ${reason ? 'placeholder="Type the reason"' : 'placeholder="optional"'}></label>
${pendingReason && pendingReason.key === k ? `<button data-i="${i}" data-act="saveReason">Save</button>` : ''}
${err}</div>`;
}

function trackMoves(lessons) {
  if (lastWeek !== state.week) { lastWeek = state.week; lastSp = new Map(); moved = new Set(); }
  for (const l of lessons) {
    const k = keyOf(l), sp = l.row.sp.join(', ');
    if (lastSp.has(k) && lastSp.get(k) !== sp) moved.add(k);
    lastSp.set(k, sp);
  }
}

function drawCards(cards) {
  const r = state.result;
  const lessons = r ? r.lessons : [];
  trackMoves(lessons);
  const off = r ? r.days.filter(d => d.holiday) : [];
  cards.innerHTML = `${state.error ? `<div class="errorbar">${esc(state.error)}</div>` : ''}
${off.length ? `<div class="days">${off.map(d => `<span class="day off">${esc(dayDate(d.date))}: ${esc(d.holiday)}</span>`).join('')}</div>` : ''}
${lessons.length ? lessons.map(card).join('') : '<p class="note">No lessons this week.</p>'}
${r && r.warnings.length ? `<div class="warnings">${r.warnings.map(w => `<div>⚠ ${esc(w)}</div>`).join('')}</div>` : ''}`;
}

// mark() redraws synchronously on success, so clear the pending reason first and restore it on failure
function doMark(l, change) {
  const keep = pendingReason;
  pendingReason = null;
  cardError = null;
  const res = mark(l, change);
  if (!res.ok) {
    pendingReason = keep;
    cardError = { key: keyOf(l), message: res.error };
    drawCards(document.getElementById('cards')); // a refused mark changes nothing else
  }
}

function onClick(e) {
  const b = e.target.closest('button');
  const cardEl = e.target.closest('.card[data-i]');
  if (!cardEl) return;
  const l = state.result.lessons[Number(cardEl.dataset.i)];
  const noteInput = cardEl.querySelector('[data-field="note"]');
  const att = cardEl.querySelector('[data-field="attendance"]').value;
  const attendance = att === '' ? null : Number(att);
  if (b && b.dataset.status) {
    const s = b.dataset.status;
    if (needsReason(s)) {
      pendingReason = { key: keyOf(l), status: s };
      cardError = null;
      drawCards(document.getElementById('cards'));
      document.querySelector(`.card[data-i="${cardEl.dataset.i}"] [data-field="note"]`).focus();
      return;
    }
    pendingReason = null;
    doMark(l, { status: s, attendance, note: noteInput.value });
    return;
  }
  if (b && b.dataset.act === 'saveReason') {
    doMark(l, { status: pendingReason.status, attendance, note: noteInput.value });
    return;
  }
  if (!b && !e.target.closest('input')) {
    // Clicking a card scrolls the preview to its page
    const index = state.result.lessons
      .filter(x => x.subject === l.subject && x.row.status !== 'batal')
      .indexOf(l);
    if (index >= 0) scrollToLesson(document.getElementById('previews'), l.subject, index);
  }
}

function onChangeField(e) {
  const input = e.target.closest('[data-field]');
  if (!input) return;
  const l = state.result.lessons[Number(input.dataset.i)];
  const cardEl = input.closest('.card');
  if (pendingReason && pendingReason.key === keyOf(l)) return; // saved with the Save button
  const att = cardEl.querySelector('[data-field="attendance"]').value;
  doMark(l, { status: l.row.status, attendance: att === '' ? null : Number(att), note: cardEl.querySelector('[data-field="note"]').value });
}

function renderWeek(view) {
  if (view.dataset.screen !== 'week') {
    view.dataset.screen = 'week';
    view.innerHTML = '<div class="week"><section id="cards"></section><section id="previews"></section></div>';
    const cards = view.querySelector('#cards');
    cards.addEventListener('click', onClick);
    cards.addEventListener('change', onChangeField);
  }
  drawCards(view.querySelector('#cards'));
  updatePreview(view.querySelector('#previews'), state.result ? state.result.rph.filter(p => p.week === state.week) : []);
}

export { renderWeek };
```

- [ ] **Step 2b: Make the other screens reset the Week skeleton**

`renderFiles` and `renderClasses` already set `view.dataset.screen` to their own name, so returning to Week rebuilds the skeleton. Nothing else to change.

- [ ] **Step 3: Check in the browser**

With `node tools/serve.js` running, open `http://localhost:8080/app/`, Week tab, on week 35 (◀ ▶ to reach it):
1. Three cards (Mon, Tue, Wed) with SPs `7.1.1`, `7.1.2`, `7.1.2, 7.1.3` if the rekod is fresh; the preview shows three A4 pages in Malay.
2. Click **Postponed** on Tuesday: a required Reason box with a Save button appears; Save with an empty box shows "A reason is required for Postponed and Cancelled"; nothing changes.
3. Type "Mesyuarat" and Save: Tuesday turns orange; Wednesday's SP changes and shows "← SPs moved since last view"; the preview's Tuesday page shows "☑ PdP ditunda kerana: Mesyuarat"; the badge and "● Unsaved changes" update. The cards update with no visible delay.
4. Mark Monday **Cancelled** with a reason: its page leaves the preview.
5. Change Attendance on Monday to 30 and press Tab: the preview shows "KEHADIRAN 30 / 35".
6. Click a card: the preview scrolls to its page.
7. **Print week**: the print dialog shows one lesson per page. **Open in new tab**: a tab with the same pages.
8. Reload the page: the marks are still there.

- [ ] **Step 4: Commit**

```bash
git add app/week-view.js app/preview.js
git commit -m "Week screen: lesson cards with marking, live recalculation, RPH preview and printing"
```

---

### Task 8: Classes dashboard

**Files:**
- Modify: `app/classes-view.js` (replace the stub)

**Interfaces:**
- Consumes: `state.result.classes` (ClassSummary), `setTab`, `goToday`; `classLabel`, `positionWords`, `rptWeeksWords`, `percentDone`, `fitWords`.
- Produces: `renderClasses(view)`.

- [ ] **Step 1: Write `app/classes-view.js`**

```js
// Classes dashboard: one row per class × subject, as of the start of the week on the Week tab
import { state, setTab, goToday } from './state.js';
import { classLabel, positionWords, rptWeeksWords, percentDone, fitWords } from './logic/words.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function row(s, i) {
  const p = positionWords(s);
  const numbers = s.hasDskp && s.hasRpt && !s.finished;
  const pct = percentDone(s);
  return `<tr data-row="${i}">
<td>${esc(classLabel(s))}</td>
<td>${numbers ? esc(s.currentSp) : ''}</td>
<td>${s.hasDskp ? `<span class="bar"><span style="width:${pct}%"></span></span>${pct}%` : ''}</td>
<td>${numbers ? esc(rptWeeksWords(s)) : ''}</td>
<td><span class="badge tone-${p.tone}">${esc(p.text)}</span></td>
<td>${s.rptEnd ? `M${s.rptEnd}` : ''}</td></tr>`;
}

function renderClasses(view) {
  view.dataset.screen = 'classes';
  const list = state.result ? state.result.classes : [];
  const fits = list.map(fitWords).filter(Boolean);
  view.innerHTML = `<h2>Classes — as of Week ${state.week} (start of week)</h2>
${state.error ? `<div class="errorbar">${esc(state.error)}</div>` : ''}
<table class="classes"><thead><tr><th>Class</th><th>Current SP</th><th>DSKP done</th><th>RPT week of SP</th><th>Position</th><th>Ends</th></tr></thead>
<tbody>${list.map(row).join('')}</tbody></table>
${fits.map(f => `<p class="err">⚠ ${esc(f)}</p>`).join('')}`;
  view.querySelectorAll('tr[data-row]').forEach(tr => { tr.onclick = () => { setTab('week'); goToday(); }; });
}

export { renderClasses };
```

- [ ] **Step 2: Check in the browser**

1. **Classes** tab on week 31 shows one row: `4S Matematik`, a current SP, a bar with a %, an RPT week, a coloured Position badge and `M34`.
2. Go to Week, postpone a lesson, return to Classes: the numbers reflect it at once.
3. On week 36 (after M34) the row reads "DSKP finished · revision" with no current SP, or a "needs … min" warning below the table if the class is behind.
4. Click the row: the Week tab opens on the current week.

- [ ] **Step 3: Commit**

```bash
git add app/classes-view.js
git commit -m "Classes dashboard: current SP, DSKP done, RPT week, position, fit warning"
```

---

### Task 9: Save rekod, offline and install

**Files:**
- Modify: `app/export.js` (replace the stub)
- Create: `app/sw.js`, `app/manifest.webmanifest`, `app/icon.svg`

**Interfaces:**
- Consumes: `state`, `emit` from `state.js`; `store.setSetting`; `baseName`.
- Produces: `saveRekod()`; the service worker cache name line `const CACHE = 'lesson-planner-dev';` (rewritten by Task 10).

- [ ] **Step 1: `app/export.js`**

```js
// "Save rekod": download every rekod changed since the last save, exactly as stored (W2).
// The teacher saves it over the file in the Rekod folder, so the CLI and git see it.
import { state, emit } from './state.js';
import { setSetting } from './store.js';
import { baseName } from './logic/paths.js';

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function saveRekod() {
  for (const path of Object.keys(state.unsaved)) if (state.files.has(path)) download(baseName(path), state.files.get(path));
  state.unsaved = {};
  await setSetting('unsaved', state.unsaved);
  emit();
}

export { saveRekod };
```

- [ ] **Step 2: `app/sw.js`**

```js
// Offline support: serve from the cache at once, refresh the cache in the background.
// tools/release.js rewrites CACHE for each release so old caches are dropped.
const CACHE = 'lesson-planner-dev';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request);
    const fresh = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});
```

- [ ] **Step 3: `app/manifest.webmanifest` and `app/icon.svg`**

`app/manifest.webmanifest`:
```json
{
  "name": "Lesson Planner (dev)",
  "short_name": "Lesson Planner (dev)",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2e7d32",
  "icons": [{ "src": "icon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```
`app/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#2e7d32"/><rect x="16" y="12" width="32" height="40" rx="3" fill="#fff"/><path d="M22 24h20M22 32h20M22 40h12" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/></svg>
```

- [ ] **Step 4: Check in the browser**

1. Mark a lesson, click **Save rekod**: `rekod-4S-M3.md` downloads; the unsaved badge disappears.
2. The download is what the CLI writes (W2): running the CLI on it must leave it unchanged.
```bash
cp ~/Downloads/rekod-4S-M3.md output/simulasi-4S-M3/rekod-4S-M3.md
cp output/simulasi-4S-M3/rekod-4S-M3.md /tmp/app-rekod.md
node src/cli/rph.js --classes sample/kelas-2026.md --week <the week shown in the app> --today <today, yyyy-mm-dd>
cmp /tmp/app-rekod.md output/simulasi-4S-M3/rekod-4S-M3.md && echo SAME
git checkout -- output/
```
Expected: `SAME`.
3. Edit the saved file by hand (change one Status), re-pick it in Files: the conflict lists that lesson; **Replace with the file** applies it; **Keep the app's copy** leaves the app unchanged.
4. Re-pick a broken jadual (copy `jwg-20261002.md`, break a Masa cell, pick the copy under the same name): "Rejected …" appears and the app keeps working.
5. Offline check (service workers are off on localhost, so use the release build in Task 10's manual check).

- [ ] **Step 5: Commit**

```bash
git add app/export.js app/sw.js app/manifest.webmanifest app/icon.svg
git commit -m "Save rekod download, service worker for offline use, web manifest and icon"
```

---

### Task 10: Release script

**Files:**
- Create: `tools/release.js`, `test/release.js`

**Interfaces:**
- Consumes: `app/config.js` line `export const APP_NAME = '…';`, `app/manifest.webmanifest`, `app/sw.js` line `const CACHE = '…';`.
- Produces: `node tools/release.js <rph-mate checkout> [--skip-tests]`.

- [ ] **Step 1: Write the failing test `test/release.js`**

```js
// node test/release.js — tools/release.js copies only app code into a git checkout, with the production name
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools', 'release.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
const run = (...a) => spawnSync(process.execPath, [tool, ...a], { encoding: 'utf8' });

// Not a git checkout: refused, nothing copied
const plain = path.join(tmp, 'plain');
fs.mkdirSync(plain);
const r0 = run(plain, '--skip-tests');
assert.strictEqual(r0.status, 1);
assert.match(r0.stderr, /Not a git checkout/);
assert.deepStrictEqual(fs.readdirSync(plain), []);

// A git checkout with a stale file from an earlier release
const target = path.join(tmp, 'rph-mate');
fs.mkdirSync(path.join(target, 'app'), { recursive: true });
assert.strictEqual(spawnSync('git', ['init', '-q', target]).status, 0);
fs.writeFileSync(path.join(target, 'app', 'old.js'), 'stale');
const r1 = run(target, '--skip-tests');
assert.strictEqual(r1.status, 0, r1.stderr);

const files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === '.git') continue; fs.statSync(p).isDirectory() ? walk(p) : files.push(path.relative(target, p).replace(/\\/g, '/')); } };
walk(target);
assert.ok(files.includes('app/index.html') && files.includes('app/state.js') && files.includes('app/logic/marking.js'));
assert.ok(files.includes('src/core/index.js') && files.includes('src/core/week.js'));
assert.ok(files.includes('index.html') && files.includes('README.md'));
assert.ok(!files.includes('app/old.js'), 'stale file not removed');
assert.ok(files.every(f => /^(app|src\/core)\//.test(f) || ['index.html', 'README.md'].includes(f)), files.join('\n'));
assert.ok(files.every(f => !f.endsWith('.md') || f === 'README.md'));
assert.ok(!files.some(f => f.startsWith('src/cli') || f.startsWith('sample') || f.startsWith('output') || f.startsWith('docs') || f.startsWith('test')));
assert.ok(fs.readFileSync(path.join(target, 'app/config.js'), 'utf8').includes("export const APP_NAME = 'RPH Mate';"));
const manifest = JSON.parse(fs.readFileSync(path.join(target, 'app/manifest.webmanifest'), 'utf8'));
assert.deepStrictEqual([manifest.name, manifest.short_name], ['RPH Mate', 'RPH Mate']);
assert.match(fs.readFileSync(path.join(target, 'app/sw.js'), 'utf8'), /const CACHE = 'rph-mate-\d{8}-[0-9a-f]+';/);
// The source repo is untouched
assert.ok(fs.readFileSync(path.join(root, 'app/config.js'), 'utf8').includes('Lesson Planner (dev)'));

fs.rmSync(tmp, { recursive: true, force: true });
console.log('release: all tests passed');
```

- [ ] **Step 2: Run it to see it fail**

Run: `node test/release.js`
Expected: FAIL (`tools/release.js` does not exist; the spawned process exits non-zero).

- [ ] **Step 3: Write `tools/release.js`**

```js
// Copy the app into the public rph-mate checkout as "RPH Mate" (W11, W12). Only code is copied:
// app/ and src/core/, with allowed file types; nothing personal (no sample/, output/, docs/, .md data).
// The teacher reviews the printed list, then commits and pushes in rph-mate by hand.
//
//   node tools/release.js <path to rph-mate checkout> [--skip-tests]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD_NAME = 'RPH Mate';
const ALLOWED = new Set(['.js', '.html', '.css', '.webmanifest', '.svg', '.png']);
const FOLDERS = ['app', 'src/core'];

function copyDir(from, to, out) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b, out);
    else if (ALLOWED.has(path.extname(f))) { fs.copyFileSync(a, b); out.push(b); }
  }
}

function edit(file, fn) { fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8'))); }

function main(argv) {
  const target = argv.find(a => !a.startsWith('--'));
  if (!target) throw new Error('Usage: node tools/release.js <path to rph-mate checkout> [--skip-tests]');
  const dest = path.resolve(target);
  if (!fs.existsSync(path.join(dest, '.git'))) throw new Error(`Not a git checkout: ${dest}`);
  if (!argv.includes('--skip-tests')) {
    const t = spawnSync(process.execPath, [path.join(root, 'test', 'all.js')], { stdio: 'inherit' });
    if (t.status) throw new Error('Tests failed; nothing copied');
  }
  const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim() || 'nogit';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  for (const d of FOLDERS) fs.rmSync(path.join(dest, d), { recursive: true, force: true });
  const copied = [];
  for (const d of FOLDERS) copyDir(path.join(root, d), path.join(dest, d), copied);

  edit(path.join(dest, 'app/config.js'), t => t.replace(/export const APP_NAME = '[^']*';/, `export const APP_NAME = '${PROD_NAME}';`));
  edit(path.join(dest, 'app/manifest.webmanifest'), t => {
    const m = JSON.parse(t);
    m.name = m.short_name = PROD_NAME;
    return JSON.stringify(m, null, 2) + '\n';
  });
  edit(path.join(dest, 'app/sw.js'), t => t.replace(/const CACHE = '[^']*';/, `const CACHE = 'rph-mate-${date}-${sha}';`));

  const index = path.join(dest, 'index.html');
  if (!fs.existsSync(index))
    fs.writeFileSync(index, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=app/"><title>${PROD_NAME}</title><a href="app/">${PROD_NAME}</a>\n`);
  const readme = path.join(dest, 'README.md');
  if (!fs.existsSync(readme))
    fs.writeFileSync(readme, `# ${PROD_NAME}\n\nWeekly RPH planner for KSSM teachers. Open https://falhaindrubin.github.io/rph-mate/ in Chrome or Edge.\nYour files stay in your browser; nothing is uploaded.\n`);

  copied.forEach(f => console.log(path.relative(dest, f).replace(/\\/g, '/')));
  console.log(`\n${copied.length} files copied to ${dest} as ${PROD_NAME} (${date}-${sha}). Review, then commit and push there.`);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
```

- [ ] **Step 4: Run the tests**

Run: `node test/release.js && node test/all.js`
Expected: `release: all tests passed`, then every test passes.

- [ ] **Step 5: Manual offline check with a local release**

```bash
mkdir -p /tmp/rph-mate-check && git -C /tmp/rph-mate-check init -q
node tools/release.js /tmp/rph-mate-check --skip-tests
node tools/serve.js 8090 /tmp/rph-mate-check
```
Open `http://localhost:8090/app/?sw=1` (`?sw=1` turns the service worker on for localhost):
1. The tab title is "RPH Mate".
2. Pick the folders, open the Week tab, reload once (the service worker caches every file it served).
3. DevTools → Network → Offline; reload: the app opens with its data and the Week tab works.
4. Stop the server; delete `/tmp/rph-mate-check`.

- [ ] **Step 6: Commit**

```bash
git add tools/release.js test/release.js
git commit -m "Release script: copy app code to rph-mate as RPH Mate"
```

---

### Task 11: Docs and command names

**Files:**
- Modify: `README.md`, `docs/architecture.md` (§3 file names, §4 component file links, §9 status rows, §10 status), `docs/next-session.md`, `TODO.md`, `sample/kelas-2026.md` (the command in its Malay note: `node src/cli/simulate.js --classes sample/kelas-2026.md`), `docs/discussion.md` (one log entry: "Web app first slice built", with the date)

- [ ] **Step 1: Update every command and file name**

Search and replace across docs:
```bash
grep -rn "simulasi.js\|--kelas\|--minggu\|--hari-ini\|semua.js\|--kesukaran\|--tingkatan\|kedudukan.js\|masa-sp.js\|parse/kelas\|parse/acara\|parse/aktiviti\|parse/jadual\|parse/kesukaran" README.md docs/architecture.md docs/next-session.md TODO.md sample/kelas-2026.md
```
Expected after editing: no matches. (Old specs and plans in `docs/superpowers/` are history and stay unchanged.)

- [ ] **Step 2: README sections**

README gets a "Web app" section:
````markdown
## Web app (Lesson Planner; published as RPH Mate)
```
node tools/serve.js            # http://localhost:8080/app/
node tools/release.js ../rph-mate   # copy the app into the public rph-mate checkout
```
Pick your `sample/` and `output/` folders once on the Files screen and type your name in Profile. The Week tab shows the week's lessons and RPH pages; mark Taught / Postponed / Cancelled (a reason is required for the last two), print the week, and use **Save rekod** to download the updated `rekod-*.md` back into your Rekod folder. Details: [the spec](docs/superpowers/specs/2026-10-03-web-app-weekly-loop-design.md).
````
and the CLI commands use the new flags (`--classes`, `--week`, `--today`; `simulate.js`; `--difficulty --form` for `rpt.js`; `node test/all.js`).

- [ ] **Step 3: Run the tests one last time**

Run: `node test/all.js`
Expected: every test file prints `all tests passed`.

- [ ] **Step 4: Commit**

```bash
git add README.md docs TODO.md sample/kelas-2026.md
git commit -m "Docs: web app, English command names, next-session briefing"
```
