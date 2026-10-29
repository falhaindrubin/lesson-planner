# Next-session briefing

_Written 2026-10-03 at the end of the RPH pipeline session. Read this first; then [TODO.md](../TODO.md) (what the teacher must do) and [architecture.md](architecture.md) (where things live)._

## Update 2026-10-29 — repo cleanup, textbook markdown, headless browser check
**What happened this session.**
- **Repo:** the workspace held a stale outer git repo with this one nested inside, so VS Code showed `lesson-planner` under `lesson-planner`. The outer `.git` and its stale copies were deleted and this repo now sits at `projects/lesson-planner`. Three loose sample files moved into `sample/`.
- **`sample/bt-mat-t5.md`:** the Matematik T5 textbook (Pelangi 2020), turned from raw PDF text into structured markdown:
  - `*ms. N*` page markers
  - `## Bab`, `### 1.1` and `#### Contoh / Latih Kendiri / MobiLisasi Minda` headings
  - Jawapan, Glosari, Rujukan and Indeks sections
  - Limit: equations, matrices and diagrams stay scrambled (noted in the file header). Re-extract from the PDF if those are needed.
- **Quick fixes:**
  - `.gitattributes` (`* text=auto eol=lf`): stops regenerated output showing as modified on Windows
  - README status line updated
- **Phase 1b task 1 (browser check), run headless:** the Chrome extension wasn't connected, so headless Chrome was driven over the DevTools protocol (scripts were in the session scratchpad, not kept). Results against the web app spec §10.4:
  - Steps 1–7 and 9 **pass**. Save rekod output equals the CLI rekod byte for byte. A broken jadual is rejected with a line error. Printing gives one RPH per A4 page. No console errors.
  - Step 8 (offline) **fails on a first visit.** `app/sw.js` only caches what's fetched after it takes control, so after one online visit the cache is empty and an offline reload gives "site can't be reached". It works after a second online visit (41 files cached). Proved by killing the server, because CDP offline emulation doesn't cover service-worker fetches.
  - Planned fix: once `navigator.serviceWorker.ready`, the page posts the URLs it loaded (`location.href` plus `performance.getEntriesByType('resource')`), and the SW caches them with `cache.addAll`. Check: one online visit, then server killed, then reload works.
  - **Not exercised:**
    - SPs moving after Postpone: every simulation row is already marked, and marked rows are kept
    - A lesson longer than one page
    - The real print dialog and PWA install

**Next:** fix the first-visit offline bug, then Phase 1b tasks 3–6 (deferred minors, create `rph-mate`, release, install and check offline on the deployed URL).

## Update 2026-10-25 — product doc set
**What happened this session.** Briefing only, then a product doc set for the whole of RPH Mate (built Phase 0–1 + planned phases) in [docs/product/](product/): [PRD](product/prd.md), [TRD](product/trd.md), [app flow](product/app-flow.md) (Mermaid), [UI/UX brief](product/ui-ux-brief.md), [data schema](product/backend-schema.md) (IndexedDB, runtime objects, markdown formats, proposed Drive store), [implementation plan](product/implementation-plan.md) (phased roadmap). No code changed; the app is still unchecked in a browser.

**Choices made in the docs for the teacher to confirm:** phase order 1b (browser check, release, real week) → 2 Progress → 4 RPT in the app (for the 2027 RPTs in December) → 3 Drive sync; the Drive store format and merge rules are a **proposal** to settle in the Phase 3 brainstorm; the success target (weekly session < 10 min) and the month-by-month timeline are suggestions.

**Next:** unchanged — start Phase 1b in [implementation-plan.md](product/implementation-plan.md) (browser check first). Keep the product docs' status labels in step as phases finish.

## Update 2026-10-03 — web app first slice built and merged to `main`
**What happened this session.** Executed the 11-task plan (`docs/superpowers/plans/2026-10-03-web-app-weekly-loop.md`) inline (Sonnet), then one Opus whole-branch review. Core and CLI are now ES modules with English names (generated output proven byte-identical); `runWeek` in `src/core/week.js` is shared by the CLI and the app; the app is in `app/` (Week, Classes, Files screens, IndexedDB, Save rekod, service worker); `tools/serve.js` and `tools/release.js` (copies `app/` + `src/core/` to the public rph-mate repo as "RPH Mate"). Review found 1 Critical + 3 Important; all fixed (same-name drop/folder key, false rekod diffs on re-pick, lost click after typing, one-file Save rekod). `node test/all.js` → 13 files pass.

**Not verified in a browser** (the Chrome extension was not connected): every manual step in plan Tasks 6–10, including the lost-click fix and the offline check. Start here: `node tools/serve.js`, open http://localhost:8080/app/, pick `sample/` and `output/`, walk the plan's Task 7 steps, then the release/offline check (Task 10 step 5).

**Windows quirks hit again:** bash heredocs with `
` or regexes mangle escapes — use the Write/Edit tools; `git diff` shows regenerated outputs as modified because of CRLF — check sameness with `git diff --exit-code --quiet <paths>`; `output/rpt-mat-t4-2026.md` shows as modified for that reason only (not committed).

**Deferred minors (from the review):** `today` computed once at load (stale overnight) · IndexedDB failure after a mark is not rolled back · rejected store write during import unhandled · attendance edits on future lessons revert at once (matches CLI) · exam card prints the event twice · `esc` misses quotes in attributes, RPH iframe has no `sandbox` · service worker `skipWaiting` can mix old/new modules after a release · `serve.js` prefix path check · `release.js` does not rewrite the static `<title>` · error paths are class-file-relative · literal BOM char in a `util.js` regex (use ﻿) · spec §4.3 field names `needMinutes/haveMinutes` vs code `need/have`.

## Suggested next steps
1. Browser check of the app (above); fix what breaks.
2. Create the public `rph-mate` repo, run `node tools/release.js ../rph-mate`, enable GitHub Pages, install as PWA; offline check.
3. Real use for a week (switch Rekod/Output to real folders, Mula to 4S's current SP).
4. Next sub-project: Progress (dashboard, history import) or Drive sync; brainstorm → spec → plan.
5. Pick from the deferred minors.

## History: RPH pipeline session (old Malay command names appear where quoted)
## Where we are
- **Branch `rph-pipeline`** (pushed, 16 commits ahead of `main`, **pull request not opened yet**): https://github.com/falhaindrubin/lesson-planner/pull/new/rph-pipeline
- **Built and tested** (`node test/all.js` → 10 files, all print "all tests passed"):
  - `node src/cli/rpt.js …` — yearly RPT from DSKP + takwim + kesukaran. The RPT file now ends with an appendix **Peruntukan SP** (SP → weeks).
  - `node src/cli/rph.js --classes sample/kelas-2026.md --week <n> [--today yyyy-mm-dd]` — writes `rekod-<kelas>-<subjek>.md` and one `<tahun>-M<n>-<SUBJEK>.html` (one RPH per A4 page) and prints each class's position against the RPT.
  - `node src/cli/simulate.js --classes sample/kelas-2026.md [--from 1] [--to 43]` — replays the year week by week.
- **Simulation of 4S Matematik** (whole 2026, Bil. murid 32, Mula 1.1.1) is in `output/simulasi-4S-M3/`: on the RPT every week M1–M34, DSKP done end of M34, revision M35–M36, PAT M37.
- **Graphify** graph is committed in `graphify-out/` (refreshed 2026-10-03; cache and machine paths ignored). `.graphifyignore` skips the simulation output and the plan file.

## How it works (one paragraph)
Inputs are hand-checked markdown: DSKP, takwim, jadual (timetable versions by effective date), `kelas-<tahun>.md` (class × subject rows), `acara-<tahun>.md` (event days + Batal), `aktiviti-*.md` (activity template). The scheduler lists each week's lessons per class (holidays/exams per form, Batal, event flags, tutorials). The pacing planner gives each lesson its SPs from the class's **rekod** history: each SP's time is the class's real minutes in the RPT weeks where the SP sits, so light SPs share a lesson and heavy SPs span lessons (no "bersambung" marker). ditunda/batal use no time, tutorial repeats the last taught SP, exams don't advance, DSKP finished → revision by topic. Every run rebuilds future untouched rows; past rows and rows with a Status or Catatan are kept. Files are written only if every class succeeded.

## Decisions worth remembering (full log: [discussion.md](discussion.md))
- RPT is the frozen yardstick; RPH follows actual progress; the CLI shows ahead/behind in minutes, shown as weeks (never on the RPH).
- Spec split into three sub-projects: **1 RPH pipeline (done)** → **2 Progress** (dashboard, history import from the Sheets) → **3 PWA app** (screens, IndexedDB, Drive sync, RPT freeze).
- Teacher focus for now: **Matematik T4, 4 Stanford** only; other timetable slots are skipped with one note.
- Kehadiran does not lock a future row (only Status or Catatan do). To keep a hand-edited SP on a future row, write a note in Catatan.

## Deferred (from the final review; none blocks use)
Minors: text in Kehadiran is reduced to its number on rewrite · blank Status on a lesson counts as not taught, silently · `--today` only regex-checked (a wrong year rewrites unedited past hand merges) · UTF-8 BOM breaks a kelas file whose first line is metadata · "files written" list also prints rekod files when Rekod and Output share a folder · bad Mula is reported against the rekod file · `simulate.js` ignores a failed run · writes are not atomic if a file is locked.
Judgement calls kept as is: re-teaching an earlier SP by hand rewinds pacing · duplicate rows (same date + first period) print twice · tutorial before any taught lesson has no SP · two rows sharing one Tutorial code → only the first gets it · an all-batal week keeps its old HTML · Hari/Masa in the rekod aren't validated · `4.2.7–4.2.9` reads as 4.2.7 and 4.2.9 · blank Mula with only ditunda rows starts at the first SP.

## Web app brainstorming (in progress — resume here)
The teacher chose the **web app** (sub-project 3, PWA) next. Brainstorming path: architectural (questions → design → written spec → plan). Answered so far:

| Question | Answer |
|---|---|
| First slice | Weekly RPH loop: pick a week, view/print its RPH pages, mark each lesson diajar / ditunda / batal with a reason, see ahead/behind |
| Inputs | Pick the `sample/` and `output/` folders (or drop the .md files) once; copied into browser storage; re-pick a file to update it; markdown stays the source of truth |
| Hosting | GitHub Pages (`https://falhaindrubin.github.io/lesson-planner/`); free only if the repo is public |
| Rekod | Kept in the browser (IndexedDB) with "Simpan rekod" export and import of `rekod-*.md`; one main device until Drive sync (later slice) |
| Main device | Laptop (tablet for viewing) |

Pending: the visual-companion offer (screen mockups in a browser tab) was made and not answered; then design the screens and data flow, write the spec in `docs/superpowers/specs/`, then the plan. Known prerequisite: `src/core` is CommonJS and must become ES modules for the browser (decided earlier as a one-time change).

## Suggested next steps (pick one with the teacher)
1. Open and merge the PR; teacher reviews the simulation and prints one RPH to PDF.
2. **Real use**: switch `sample/kelas-2026.md` to real folders and 4S's current SP; run it for a real week; fix what the teacher finds.
3. **Sub-project 2 (Progress)**: brainstorm → spec → plan. Needs the Google Sheets for SK, MAT, PJPK (links in `sample/links.txt`) for the history import, and the PJPK DSKP.
4. Optional cleanups from the deferred list (blank Status on a lesson and `--today` sanity check are the most likely to bite).

## Working notes for the next Claude session
- Workflow used: brainstorming → written spec → writing-plans → executing-plans (Sonnet 5.5 builds, Opus reviews). Specs/plans live in `docs/superpowers/`.
- Windows quirks: heredocs with `$`/backticks and Node one-liners with regexes lose escapes in Git Bash; write files with the Write/Edit tools. Git warns "LF will be replaced by CRLF" — harmless. `git add` pathspecs for deleted folders fail; stage by file.
- The user prefers Malay for generated documents and code comments, English for docs; one-line rules become general rules + a test + a discussion-log entry; ask when ambiguous; verify conversions against the source.
- Don't commit `graphify-out/` cache files; `output/simulasi-4S-M3/` is committed on purpose (the teacher reviews it).
