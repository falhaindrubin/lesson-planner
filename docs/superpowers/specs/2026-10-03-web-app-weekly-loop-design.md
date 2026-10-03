# Web App, First Slice: Weekly RPH Loop — Design Spec

_2026-10-03 · Sub-project 3 of 3 (RPH pipeline → Progress → PWA app), first slice. Built before sub-project 2; this slice also brings a simple Classes dashboard forward from it. Decisions and reasons: [discussion.md](../../discussion.md) ("Web app — first slice"). The RPH engine this app reuses: [RPH pipeline spec](2026-10-03-rph-pipeline-design.md)._

## 1. Goal

A browser app, installable and usable offline, for the weekly routine: open a week, see and print its RPH pages, mark each lesson as taught, postponed or cancelled, and see whether each class is ahead of or behind the RPT. The CLI and the app plan with exactly the same code, so their rekod files and RPH pages are identical.

**In scope:**
- Core converted to ES modules and renamed to English.
- One shared week function, `runWeek`, used by the CLI and the app.
- Static PWA on GitHub Pages: the Files screen, the Week screen (layout A) and the Classes dashboard.
- Rekod stored in IndexedDB, with "Save rekod" export and a re-pick check.
- A4 page rule, two deferred fixes (UTF-8 BOM, blank Status), English CLI messages.

**Out of scope (later slices or sub-project 2):** Google Drive sync, more than one main device, RPT generation or freezing in the app, editing inputs or SPs inside the app, charts, history import from the Sheets, phone layout, downloading RPH HTML files, Progress beyond the dashboard in §7.

## 2. Language rules

| Thing | Language |
|---|---|
| App UI: buttons, labels, statuses, messages, errors | English |
| Code: file names, functions, variables, comments, CLI flags, CLI messages, core error messages | English |
| RPH and RPT content (what is printed) | Malay, unchanged |
| Markdown files: input formats, rekod files (headers, `diajar`/`ditunda`/`batal`, file names, intro text) | Malay, unchanged |
| Domain words kept as they are in code | RPH, RPT, SP, SK, DSKP, PdP, takwim, rekod |

Status mapping (app ↔ rekod): Taught ↔ `diajar`, Postponed ↔ `ditunda`, Cancelled ↔ `batal`, exam row ↔ blank.

## 3. Rules

| # | Rule |
|---|---|
| W1 | `runWeek` is the only planner. The CLI and the app are thin shells around it. |
| W2 | Same inputs → the app's rekod text is byte-for-byte what the CLI writes. |
| W3 | Every change (a mark, an attendance edit, a note) runs `runWeek` again at once. The coming weeks, the preview and the positions update live. |
| W4 | All-or-nothing: if `runWeek` fails, nothing is stored and the change is undone. |
| W5 | Postponed and Cancelled need a reason, typed by the teacher (free text), saved in Catatan. Taught: note optional. |
| W6 | Lessons are Taught by default (pipeline R11); the teacher marks only exceptions. |
| W7 | Rows dated ≤ today and rows with a changed Status or Catatan are kept; others are rebuilt (pipeline R12). "Today" is the device's local date. |
| W8 | Markdown is the source of truth. A re-picked rekod file **wins**, after the app lists the lessons that differ and the teacher confirms. |
| W9 | Each RPH lesson starts on a new A4 page. A lesson too long for one page continues on the next page(s). A table row is not split across pages unless it is taller than a page. |
| W10 | The app prints RPH pages; it does not write `output/*.html`. |

## 4. Architecture

```
src/core/                pure ES modules, English names, no I/O
  week.js        NEW     runWeek — the week orchestration moved out of src/cli/rph.js
  position.js            was kedudukan.js; returns numbers, no text
  …                      every other file renamed per §4.2
src/cli/                 Node shells: fs-backed read → runWeek → write files; English messages
  rph.js  rpt.js  simulate.js
app/                     static PWA, English UI, loads ../src/core/ directly (no build step)
  index.html  app.css
  main.js                start-up, tab switching, top bar
  store.js               IndexedDB: files, settings, unsaved flag
  inputs.js              Files screen: pick folders / drop files, resolve references, re-pick check
  week-view.js           Week screen: lesson cards, marking
  classes-view.js        Classes dashboard
  preview.js             RPH iframe, Print week, Open in new tab
  export.js              Save rekod (download)
  logic/                 pure modules tested in Node (§10.3)
    paths.js  rekod-diff.js  status.js  words.js  marking.js
  sw.js  manifest.webmanifest  icon.svg
test/                    node test/all.js runs every test file
package.json     NEW     { "type": "module" }, no dependencies
```

The app is plain JavaScript with no framework. GitHub Pages serves the whole repository, so `app/index.html` imports `../src/core/index.js` as it is.

### 4.1 `runWeek`

```js
runWeek({ read, classFile, week, today }) → {
  writes:    [{ path, text, kind: 'rekod' | 'rph' }],  // what the CLI writes today, in the same order
  rph:       [{ subject, week, html }],                 // = the 'rph' writes, for the app preview
  classes:   [ClassSummary],                            // §7, one per class × subject, as of the start of `week`
  days:      [{ date, dayName, holiday, exams }],       // the requested week's days, for the Week screen
  unplanned: [string],                                  // timetable slots not in the class file
  warnings:  [string],
}
```

- `read(path) → string | null` reads a file by path. The CLI passes an `fs` reader. The app passes a reader over its stored files. Paths are relative to the class file's folder, as today.
- The body is the current loop in `src/cli/rph.js`, moved unchanged: parse inputs, compute SP time per class, `syncRekod`, summary, group RPH pages by subject and week, `renderRph`. Rekod paths come from the class file's Rekod folder, as today.
- It throws on the first error (W4). The message names the file and line, as the parsers do today.

### 4.2 Rename

The ES-module conversion and the rename happen together, in one commit, before any app code (§11). Planned file renames:

| Now | After |
|---|---|
| `core/kedudukan.js` | `core/position.js` |
| `core/masa-sp.js` | `core/sp-time.js` |
| `core/parse/kelas.js` | `core/parse/classes.js` |
| `core/parse/acara.js` | `core/parse/events.js` |
| `core/parse/aktiviti.js` | `core/parse/activities.js` |
| `core/parse/jadual.js` | `core/parse/timetable.js` |
| `core/parse/kesukaran.js` | `core/parse/difficulty.js` |
| `cli/simulasi.js` | `cli/simulate.js` |
| `test/semua.js` | `test/all.js` |
| `test/kedudukan.js`, `test/kelas-acara.js`, `test/rph-cli.js` | `test/position.js`, `test/classes-events.js`, `test/cli.js` |

The other files keep their names. Functions, variables, object fields and comments are all renamed to English, for example `ringkasanKelas` → `classSummary`, `syncRekod` → `syncRekod` (domain word), `minitSeminggu` → `weeklyMinutes`, row fields `tarikh`/`minggu`/`kehadiran`/`catatan` → `date`/`week`/`attendance`/`note`. The full map is written in the implementation plan. CLI flags become `--classes`, `--week`, `--today`, `--from`, `--to`.

Renaming never changes the markdown: parsers still read the Malay headers and values, and renderers still write them.

### 4.3 Position as numbers

`position()` returns `{ status: 'onTrack' | 'ahead' | 'behind' | 'finished' | 'notInRpt', sp, rptWeeks: [from, to], weeks }`, using the existing rule (under half a week = on track). The CLI words it in English (`4S M3: SP 3.2.2 · RPT M10 · on track`). The app words it in `logic/words.js`. The "won't fit" check returns `{ needMinutes, haveMinutes, endWeek }`.

## 5. Data flow

### 5.1 Storage (IndexedDB, one database)

| Store | Content |
|---|---|
| `files` | path → text, for every `.md` input and every rekod file (paths as picked, e.g. `sample/kelas-2026.md`, `output/simulasi-4S-M3/rekod-4S-M3.md`) |
| `settings` | class file path, last week shown, unsaved rekod paths |

Rekod is stored as **markdown text**, the same text the CLI writes. A mark parses the rekod, changes the row, renders it again with `renderRekod`, stores the text and runs `runWeek`. "Save rekod" downloads the stored text unchanged (W2).

On first start the app calls `navigator.storage.persist()`.

### 5.2 Setup (Files screen)

1. The teacher picks the `sample/` folder and the `output/` folder (`<input type="file" webkitdirectory>`), or drops `.md` files. Only `.md` files are read; PDFs, HTML and DOCX are ignored.
2. If more than one `kelas-*.md` is found, the teacher chooses one. It is remembered.
3. The app resolves every file the class file names (Takwim, Jadual, Acara, DSKP, Aktiviti, RPT, and the Rekod folder) relative to the class file's folder (`logic/paths.js`; `../output/x` from `sample/` → `output/x`). A dropped file without a folder matches by file name when that name is unique.
4. Missing files are listed ("Missing: sample/acara-2026.md"). The Week and Classes tabs stay locked until none are missing. A missing rekod file is not an error: it is created on the first run, as in the CLI.
5. Every file is parsed once on import. A file that fails is shown with its error and is not stored.

### 5.3 Opening a week

- The app opens on the takwim week that contains today. If none does (holiday break or another year), it opens on the last week shown, and the top bar says "Today is not in the 2026 takwim".
- ◀ ▶ move one takwim week. "Today" returns to the current week.
- Showing week *n* calls `runWeek({ week: n, today })`. As in the CLI, this plans rekod rows up to week *n*; those rows are rebuilt later unless marked (W7).

### 5.4 Marking

- The Taught / Postponed / Cancelled buttons, Attendance and Notes edit the row (`logic/marking.js`).
- Choosing Postponed or Cancelled shows a required Reason box. Nothing is saved until the reason has text (W5).
- Each saved change: update the rekod text → `runWeek` → store the new rekod writes → mark that rekod as unsaved → redraw. If `runWeek` throws, the old text stays, and the error is shown (W4).
- Future lessons can be marked too (for example, cancelling ahead for an event). As in the CLI, a changed Status or Catatan keeps the row.

### 5.5 Save rekod

"Save rekod" downloads every unsaved rekod as `rekod-<kelas>-<subjek>.md` (one download per file) and clears the unsaved flag. The teacher saves it over the file in the Rekod folder, so the CLI and git see it.

### 5.6 Re-picking files

- **An input file** (takwim, jadual, acara, DSKP, aktiviti, RPT, class file): if it parses, it replaces the stored copy and the current week is recalculated. If it doesn't parse, it is rejected and the old copy stays.
- **A rekod file**: `logic/rekod-diff.js` compares its rows with the stored rows, keyed by date and first period. If any differ, the app shows "3 lessons differ: M5 Mon, M5 Tue, M7 Wed" with each side's Status, SP and Catatan, and asks "Replace with the file?" On confirm, the file wins (W8) and the unsaved flag for that rekod is cleared. On cancel, nothing changes.

## 6. Week screen (layout A)

Mockup approved for now and to be revisited later (`.superpowers/brainstorm/…/week-screen-detail.html`, not committed).

- **Top bar:** ◀ Week *n* (dates) ▶, Today · **Week** / **Classes** tabs · one position badge per class (green on track, amber 1 week, red 2+ weeks behind; blue ahead) · "● Unsaved changes" + **Save rekod** · ⚙ **Files**.
- **Left, lesson cards** in time order, one per rekod row of the week:
  - day, date, time, class and subject, planned SPs, the Acara flag if any, "Tutorial" for tutorials
  - Taught / Postponed / Cancelled, the current one highlighted
  - Attendance (pre-filled with the class size) / class size
  - Notes, which become a required **Reason** when Postponed or Cancelled is chosen
  - a line "SPs moved since last view" when a recalculation changed this card's SPs
  - exam rows: a grey card with the exam name and no buttons
- **Day strip:** holidays and non-school days of the week from `days`, as grey labels ("Cuti Tahun Baru Cina").
- **Right, RPH preview:** an iframe with the subject's `rph` HTML for this week (all A4 pages; W9). Clicking a card scrolls the preview to its page. Above it: **Print week** (prints the iframe) and **Open in new tab** (opens the same HTML as a blob URL; it can be printed from there). A week with more than one subject shows one preview per subject, one after the other.
- As in the CLI, a postponed lesson keeps its page with "PdP ditunda kerana: <reason>" in Refleksi; a cancelled lesson has no page.
- A week where every lesson is cancelled shows "No RPH pages this week".

## 7. Classes dashboard

One row per class × subject in the class file, as of the start of the week shown on the Week tab:

| Column | Source |
|---|---|
| Class | `4S Matematik` (class code + subject name) |
| Current SP | the next SP to teach; a half-taught SP is still current |
| DSKP done | SPs fully taught ÷ all SPs in the DSKP, as a bar and a % (postponed or cancelled lessons don't count) |
| RPT week of SP | `M31` or `M30–M31` |
| Position | On track / *N* weeks ahead / *N* weeks behind |
| Ends | the RPT's last syllabus week (`M34`) |

- Below the table: the "won't fit" warning per class ("4S Matematik: needs 1,240 min for the remaining SPs, has 1,050 min until M34 — consider combining SPs").
- In place of the numbers: "DSKP finished · revision", "No RPT", "No DSKP".
- Clicking a row opens the Week tab on the current week.
- Marking a lesson updates the dashboard at once (W3).

`ClassSummary` = `{ class, subject, subjectName, currentSp, spDone, spTotal, position (§4.3), fit, finished, hasRpt, hasDskp }`.

## 8. A4 pages (W9)

`render/rph.js` already puts a page break after each lesson. Added: `tr { break-inside: avoid; }`. This changes the RPH HTML, so it lands **after** the byte-for-byte check of §10.1. A row taller than a page still splits, because browsers ignore `avoid` when a row can't fit. A continuation page does not repeat the header rows.

## 9. Errors and warnings

| Situation | Behaviour |
|---|---|
| Input file has an error | Files screen shows the file, the line and the message. On re-pick, the bad file is rejected and the last good copy stays. |
| Referenced file missing | Listed on the Files screen; the Week and Classes tabs are locked. |
| `runWeek` throws after a change | The change is undone, nothing is stored, and the error is shown in a red bar above the cards. |
| A pdp or tutorial row has a blank Status (hand edit) | Warning, in the app and the CLI: "rekod-4S-M3.md:24: Status blank, counted as not taught". Fixes a deferred issue. |
| File starts with a UTF-8 BOM | Stripped by every parser (core), so the app and the CLI both accept it. Fixes a deferred issue. |
| Today not in the takwim | Top-bar note; navigation still works. |
| IndexedDB unavailable (private window) | A full-page message: the app cannot store anything here. |
| Persistent storage refused | A yellow banner: "This browser may clear the app's data. Use Save rekod after each session." |
| Rekod not saved for more than 7 days | The unsaved badge turns red. |
| Warnings from `runWeek` | Listed under the cards, in English. |

## 10. Testing

### 10.1 Rename and ES modules: proof of no change
- Every existing test, converted, passes (`node test/all.js`).
- Run `node src/cli/simulate.js --classes sample/kelas-2026.md` with the committed `output/simulasi-4S-M3/` as the starting point. Every `rekod-4S-M3.md` and `2026-M*-M3.html` must be **byte-for-byte identical** to the committed files (`git diff --exit-code` on those files). Only `ringkasan.txt` changes, because CLI messages are now English.

### 10.2 `runWeek`
- The CLI built on `runWeek` passes the same check as §10.1.
- New tests on the sample files: a postponed lesson, a cancelled lesson, a re-marked past lesson, an exam week, a week with no lessons for the class, a `read` that returns `null` for a missing input (clear error).
- BOM and blank-Status tests (§9).
- Page-break CSS test (§8).

### 10.3 App logic (Node, no browser)
`app/logic/` holds pure modules, tested with `node:assert` like the core:
- `paths.js`: resolving `../output/x`, basename fallback, ambiguity
- `rekod-diff.js`: same / changed / added / removed rows
- `status.js`: `diajar` ↔ Taught and back, exam rows
- `words.js`: position and fit wording
- `marking.js`: applying a mark to rekod text; reason required; the text round-trips through `renderRekod`

### 10.4 Manual checklist (Chrome or Edge, once per release)
1. Pick `sample/` and `output/`; all files found, none missing.
2. Week opens on today's week; ◀ ▶ and Today work.
3. Mark Tuesday Postponed: Reason required; Wednesday's SPs move; the preview shows "PdP ditunda kerana: …"; the badge and dashboard update.
4. Cancel a lesson: its page disappears from the preview.
5. Save rekod; the downloaded file equals what `node src/cli/rph.js` writes for the same marks.
6. Edit that file by hand and re-pick it: the differences are listed; confirm replaces.
7. Print week and Open in new tab: one lesson per page; a long lesson continues on the next page.
8. Reload offline: the app opens with its data.
9. Re-pick a broken jadual: rejected, the old one kept.

## 11. Build order

1. ES modules + English rename + English CLI messages, with §10.1 passing. One commit.
2. `runWeek` in `core/week.js`; the CLI uses it; §10.2.
3. A4 rule, BOM, blank-Status warning.
4. `app/logic/` with tests.
5. App shell: storage, Files screen.
6. Week screen and preview.
7. Classes dashboard.
8. Save rekod, re-pick check, service worker, manifest; §10.4.
9. Docs: README, architecture §9–10, next-session.

## 12. Open items for the teacher

- **GitHub Pages needs the repository to be public** (or a paid plan). A public repository also publishes everything committed in `sample/` and `output/`: the timetable, the takwim, your name and the source PDFs. Decide before step 8: make it public as is, move personal files out first, or host elsewhere. The app itself never uploads your files; they stay in your browser.
- The weekly screen design is approved for now, to be revisited after first use.
