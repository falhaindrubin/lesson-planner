# Next-session briefing

_Written 2026-10-03 at the end of the RPH pipeline session. Read this first; then [TODO.md](../TODO.md) (what the teacher must do) and [architecture.md](architecture.md) (where things live)._

## Where we are
- **Branch `rph-pipeline`** (pushed, 16 commits ahead of `main`, **pull request not opened yet**): https://github.com/falhaindrubin/lesson-planner/pull/new/rph-pipeline
- **Built and tested** (`node test/semua.js` → 10 files, all print "semua ujian lulus"):
  - `node src/cli/rpt.js …` — yearly RPT from DSKP + takwim + kesukaran. The RPT file now ends with an appendix **Peruntukan SP** (SP → weeks).
  - `node src/cli/rph.js --kelas sample/kelas-2026.md --minggu <n> [--hari-ini yyyy-mm-dd]` — writes `rekod-<kelas>-<subjek>.md` and one `<tahun>-M<n>-<SUBJEK>.html` (one RPH per A4 page) and prints each class's position against the RPT.
  - `node src/cli/simulasi.js --kelas sample/kelas-2026.md [--dari 1] [--hingga 43]` — replays the year week by week.
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
Minors: text in Kehadiran is reduced to its number on rewrite · blank Status on a lesson counts as not taught, silently · `--hari-ini` only regex-checked (a wrong year rewrites unedited past hand merges) · UTF-8 BOM breaks a kelas file whose first line is metadata · "files written" list also prints rekod files when Rekod and Output share a folder · bad Mula is reported against the rekod file · `simulasi.js` ignores a failed run · writes are not atomic if a file is locked.
Judgement calls kept as is: re-teaching an earlier SP by hand rewinds pacing · duplicate rows (same date + first period) print twice · tutorial before any taught lesson has no SP · two rows sharing one Tutorial code → only the first gets it · an all-batal week keeps its old HTML · Hari/Masa in the rekod aren't validated · `4.2.7–4.2.9` reads as 4.2.7 and 4.2.9 · blank Mula with only ditunda rows starts at the first SP.

## Suggested next steps (pick one with the teacher)
1. Open and merge the PR; teacher reviews the simulation and prints one RPH to PDF.
2. **Real use**: switch `sample/kelas-2026.md` to real folders and 4S's current SP; run it for a real week; fix what the teacher finds.
3. **Sub-project 2 (Progress)**: brainstorm → spec → plan. Needs the Google Sheets for SK, MAT, PJPK (links in `sample/links.txt`) for the history import, and the PJPK DSKP.
4. Optional cleanups from the deferred list (blank Status on a lesson and `--hari-ini` sanity check are the most likely to bite).

## Working notes for the next Claude session
- Workflow used: brainstorming → written spec → writing-plans → executing-plans (Sonnet 5.5 builds, Opus reviews). Specs/plans live in `docs/superpowers/`.
- Windows quirks: heredocs with `$`/backticks and Node one-liners with regexes lose escapes in Git Bash; write files with the Write/Edit tools. Git warns "LF will be replaced by CRLF" — harmless. `git add` pathspecs for deleted folders fail; stage by file.
- The user prefers Malay for generated documents and code comments, English for docs; one-line rules become general rules + a test + a discussion-log entry; ask when ambiguous; verify conversions against the source.
- Don't commit `graphify-out/` cache files; `output/simulasi-4S-M3/` is committed on purpose (the teacher reviews it).
