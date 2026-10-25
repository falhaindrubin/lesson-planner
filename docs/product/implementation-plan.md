# RPH Mate — Implementation Plan (roadmap)

_2026-10-25 · Product-level plan from today to the full [PRD](prd.md). Each phase from Phase 2 on gets its own **brainstorm → spec → task plan** in `docs/superpowers/` before any code (project workflow: Sonnet builds from the plan, Opus reviews the whole branch). This file says what each phase delivers, in what order, and when it is done._

---

## 0. Where we are (2026-10-25)

| Phase | State |
|---|---|
| 0 — RPH pipeline (CLI) | **Done**, merged (PR #1) |
| 1 — Web app weekly loop | **Built**, merged locally to `main` and pushed; 13 test files pass; **never opened in a browser** |
| 1b — Browser check, release, real use | **Next** |
| 2 — Progress | Planned |
| 3 — Drive sync | Planned |
| 4 — RPT in the app | Planned |
| 5 — Later | Ideas |

Teacher inputs still missing: PJPK T2 DSKP; the SK, MAT and PJPK Sheets (history import); the other class rows in `kelas-2026.md`; a check of the Matematik T4 difficulty ratings and RPT.

## Phase 1b — Prove it in a browser, release, use it for real

**Goal:** the built app works in Chrome, is published as RPH Mate, and runs one real school week.

| # | Task | Done when |
|---|---|---|
| 1 | `node tools/serve.js`, open http://localhost:8080/app/, walk the manual checklist (web app spec §10.4, steps 1–9) with `sample/` + `output/` | Every step passes, or each failure is written down |
| 2 | Fix what breaks (systematic debugging; a test for each logic bug) | `node test/all.js` passes; the checklist passes |
| 3 | Fix the deferred minors most likely to bite in daily use: stale `today` (recompute on focus / at midnight), roll back memory on an IndexedDB write failure, handle a rejected import write, the duplicate exam event text, attribute escaping + `sandbox` on the RPH iframe | Tests added where the logic is pure |
| 4 | Create the public repo `falhaindrubin/rph-mate`; turn on GitHub Pages | Empty repo is served |
| 5 | `node tools/release.js ../rph-mate`; review the file list; commit and push by hand | https://falhaindrubin.github.io/rph-mate/ shows "RPH Mate" |
| 6 | Install as a PWA; reload offline; checklist step 10 | Opens offline with its data; the repo holds only `app/`, `src/core/`, `index.html`, `README.md` |
| 7 | Real setup: `kelas-2026.md` Rekod → `../rekod/2026`, Output → `../output/rph`, Mula → 4S's current SP; re-pick in the deployed app | Week shows the real lessons |
| 8 | One real week: mark, print, Save rekod; compare one printed RPH with the Sheets version | Teacher signs off, or a list of changes is written |
| 9 | Tablet check (landscape): readable, scrollable, print or share | Notes for the UI brief §6 |

**Exit:** the teacher uses RPH Mate instead of the Sheets for 4S Matematik. Update `docs/next-session.md`, `TODO.md` and the memory file.

## Phase 2 — Progress

**Goal:** every class in the app, with its real history, and a view of progress over time.

Prerequisites: the Sheets for SK, MAT and PJPK; the PJPK DSKP (optional: PJPK can run without SPs).

| # | Task |
|---|---|
| 1 | Brainstorm → spec (`docs/superpowers/specs/<date>-progress-design.md`) → plan |
| 2 | Add the other class rows (1S ASK, 4H SK + TUTORIAL, 2D/2J PK/PJ) with Bil. murid and Mula; check that the scheduler output matches the real timetable for one week |
| 3 | History import: Sheet export (CSV per subject) → past rekod rows (`src/core/import-history.js`, pure, tested against a real export); import preview on the Files screen; the CLI gets the same importer |
| 4 | Progress series: replay rekod with `planRows` per week → SPs done and gap per week (`position.js` extension, numbers only) |
| 5 | Progress screen: per-class chart (SPs completed vs RPT expectation), table of postponed/cancelled lessons with reasons |
| 6 | Opus whole-branch review → fixes → manual checklist → release |

**Exit:** 4H SK shows about 5 weeks ahead (known from the Sheets); every class has a history from M12.

## Phase 3 — Google Drive sync

**Goal:** laptop, desktop and tablet share the same data; Save rekod becomes optional.

| # | Task |
|---|---|
| 1 | Brainstorm: JSON store vs syncing the markdown files; Drive scope (`drive.file` vs `drive.appdata`); first-sync rules ([backend-schema.md §5](backend-schema.md#5-planned-google-drive-store-phase-3)) |
| 2 | Spec + plan; a Google Cloud project with an OAuth client for the github.io origin (teacher action) |
| 3 | IndexedDB version 2 migration (`meta`, `marks`, `deviceId`) with a test on an upgrade from version 1 |
| 4 | `app/sync.js`: sign-in (Google Identity Services), read/write the store file, per-record merge (pure merge function in `app/logic/merge.js`, Node-tested) |
| 5 | Sync triggers: on open, after changes (debounced), on `online`; status chip; offline queue |
| 6 | Second-device flow: Connect → download → ready with no folder picking |
| 7 | Conflict tests: two devices mark the same lesson; one offline for a week; input re-picked on one device |
| 8 | Review → checklist on two devices → release |

**Exit:** marking on the laptop shows on the tablet after one sync; no data lost in the conflict tests.

## Phase 4 — RPT in the app

**Goal:** the yearly RPT is generated, reviewed and frozen in the app.

| # | Task |
|---|---|
| 1 | Brainstorm → spec → plan |
| 2 | RPT tab: Generate from DSKP + takwim + kesukaran (the core `rpt-planner` is already pure); preview; print |
| 3 | Freeze: store `rpt-<subject>-<year>.md` in `files`, plus `settings.rpt` metadata (`frozenAt`, `sourceHash`); a warning when inputs change after freezing |
| 4 | Regenerate a frozen RPT: diff by week, confirmation, then replace; weekly planning re-reads it |
| 5 | Review → checklist → release |

**Exit:** the 2027 RPT for every subject is made in the app (December 2026 – January 2027).

## Phase 5 — Later (pick when needed)

- 2027 rollover helper: new takwim, class list, Matematik T5 DSKP if teaching Form 5; Lampiran C check.
- Editing the events file and Batal days in the app.
- AI-drafted activity text per SP, as a reviewable `aktiviti-<subject>-sp.md`, with no API key in the app.
- Phone "today" view.
- Remaining pipeline minors (non-atomic CLI writes, `--today` sanity check, Kehadiran text reduced to its number).

## Timeline (suggested)

| When | Phase |
|---|---|
| Late Oct 2026 (M38–M39) | 1b: browser check, release; the real week falls around exams, so pick a teaching week |
| Nov 2026 | 2: Progress (needs the Sheets) |
| Dec 2026 | 4: RPT in the app, in time for the 2027 RPTs |
| Jan–Feb 2027 | 3: Drive sync, once the 2027 routine starts on more than one device |

Phase 4 sits before Phase 3 because the 2027 RPTs are due at the start of the year, and sync is only needed once more than one device is used daily. Swap them if the tablet becomes a daily device sooner.

## Definition of done (every phase)

1. Spec and plan committed in `docs/superpowers/`.
2. `node test/all.js` passes; new rules each have a test and a `docs/discussion.md` entry.
3. Opus whole-branch review; Critical and Important findings fixed; minors listed in `docs/next-session.md`.
4. Manual browser checklist passed in Chrome (and on the tablet when relevant).
5. Released to `rph-mate` through `tools/release.js`.
6. `README.md`, `docs/architecture.md`, `TODO.md`, `docs/next-session.md` and these product docs updated.
