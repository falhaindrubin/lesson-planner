# RPH Mate — Technical Requirements (TRD)

_2026-10-25 · How the product in the [PRD](prd.md) is built and must keep working. Component detail: [architecture.md](../architecture.md). Slice specs: [RPH pipeline](../superpowers/specs/2026-10-03-rph-pipeline-design.md), [web app weekly loop](../superpowers/specs/2026-10-03-web-app-weekly-loop-design.md)._

---

## 1. Architecture at a glance

```
            markdown inputs (sample/, output/, rekod/)
                    │                       ▲
          fs read   │                       │  Save rekod (download) / CLI write
                    ▼                       │
  ┌───────────── src/cli/ ─────────────┐    │     ┌──────────────── app/ (PWA) ────────────────┐
  │ rpt.js · rph.js · simulate.js      │    │     │ main · state · store(IndexedDB) · views    │
  │ thin shells: read → core → write   │    │     │ thin shell: stored files → core → redraw   │
  └───────────────┬────────────────────┘    │     └───────────────┬────────────────────────────┘
                  │                         │                     │
                  └──────────────► src/core/ (pure ES modules, no I/O) ◄──┘
                                   runWeek · parsers · calendar · scheduler
                                   rpt-planner · rph-planner · sp-time · rekod-sync
                                   position · renderers (RPT, rekod, RPH)
```

- **One planner** (`runWeek` in [src/core/week.js](../../src/core/week.js)) used by the CLI and the app (rule W1).
- **Pure core**: every file arrives through a `read(path) → string | null` callback; the core never touches the disk, the network or the clock (it is given `today`).
- **No build step, no dependencies, no framework.** The browser imports `src/core/index.js` as it is.
- **No server.** Static hosting (GitHub Pages); state lives in the browser, and from Phase 3 also in the teacher's Google Drive.

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Language | Plain JavaScript, ES modules | `package.json` has `"type": "module"` and no dependencies |
| Runtime | Node 24 (CLI, tests, tools); evergreen Chrome / Edge (app) | |
| UI | Hand-written DOM via template strings; one CSS file | Kept framework-free until screens need one |
| Storage | IndexedDB (`lesson-planner` database, version 1) | See [backend-schema.md](backend-schema.md) |
| Offline | Service worker, stale-while-revalidate cache | Off on localhost unless `?sw=1` |
| Printing | Browser print of self-contained HTML (A4) | No PDF library |
| Hosting | GitHub Pages from the public repo `falhaindrubin/rph-mate` | `https://falhaindrubin.github.io/rph-mate/` |
| Tests | `node test/all.js` (13 files, `node:assert`, real sample data) | |
| AI | None at runtime. Manual Claude use writes reviewable markdown (`kesukaran-*.md`) | |

## 3. Module map

| Path | Responsibility |
|---|---|
| `src/core/parse/` | One parser per markdown format: `dskp`, `takwim`, `difficulty`, `timetable`, `classes`, `events`, `activities`, `rpt`, `rekod`. They strip the BOM, accept LF and CRLF, and throw `file:line: message` |
| `src/core/calendar.js` | `buildCalendar`, per-form day class (holiday / exam / pdp), `weekFor`, `weekOfDate`, exam blocks |
| `src/core/timetable.js` | Timetable version in force on a date; weekly minutes per class × subject |
| `src/core/scheduler.js` | Lesson instances for one takwim week (pdp / tutorial / peperiksaan, event flags, Batal) |
| `src/core/sp-time.js` | Minutes per SP for a class, from the RPT's Peruntukan SP and the class's real weekly PdP minutes |
| `src/core/rph-planner.js` | `planRows`: pacing by minute replay (15-minute rules, ditunda/batal use no time, tutorial repeats, revision cycle) |
| `src/core/rekod-sync.js` | `syncRekod`: keep past and edited rows, rebuild future untouched rows, plan the weeks needed |
| `src/core/position.js` | `classSummary`: current SP, % done, ahead/behind in weeks, "won't fit" check — numbers only |
| `src/core/render/` | `renderRpt`, `renderRekod` (round-trips), `renderRph` (one A4 page per lesson) |
| `src/core/week.js` | `runWeek`, `inputsOf`, `rekodPath`, `rphPath` |
| `src/cli/` | `rpt.js`, `rph.js`, `simulate.js`; all-or-nothing writes; English messages |
| `app/state.js` | App state, actions (`importFiles`, `mark`, `setWeek`, `confirmRekod`, …); every change ends in `emit()` |
| `app/store.js` | IndexedDB wrapper: `files`, `settings` |
| `app/inputs.js` · `week-view.js` · `classes-view.js` · `preview.js` · `export.js` | Files screen, Week screen, Classes dashboard, RPH iframes, Save rekod |
| `app/logic/` | Pure, Node-tested helpers: `paths`, `rekod-diff`, `status`, `words`, `marking` |
| `tools/serve.js` · `tools/release.js` | Dev static server (port 8080); release copier to `rph-mate` |

## 4. Core contract: `runWeek`

```js
runWeek({ read, classText, classFile, week, today, teacher }) → {
  writes:    [{ path, text, kind: 'rekod' | 'rph' }],   // exactly what the CLI writes, in order
  rph:       [{ subject, week, html }],                  // printable pages per subject and week
  lessons:   [{ classCode, subject, subjectName, pupils, rekod, row }],  // the requested week, by time
  classes:   [ClassSummary],                             // position at the start of `week`
  days:      [{ date, dayName, holiday, exams: [name] }],
  unplanned: [string],                                   // timetable slots not in the class file
  warnings:  [string],
}
```

- Throws on the first error; the message names the file and line. Callers treat a throw as "nothing changed" (W4).
- Deterministic: the same `read` results, `week`, `today` and `teacher` give identical output (W2).
- Performance budget: about 30 ms for one class-week in Node (measured 2026-10-03); it must stay under 100 ms (W13).

Field shapes are in [backend-schema.md §3](backend-schema.md#3-runtime-objects).

## 5. App runtime behaviour

| Concern | Requirement |
|---|---|
| Start-up | Open IndexedDB (a failure shows a full-page message) → request `navigator.storage.persist()` → register the service worker (not on localhost) → open on the week containing today, else the last week shown |
| State | One `state` object; views are pure renders of it. `onChange(draw)` redraws the top bar, the banner and the current screen |
| Marking | `applyMark` edits one rekod row's Status, Kehadiran and Catatan → `runWeek` → on success keep the result and the rekod writes, set the unsaved flag, redraw, then write IndexedDB asynchronously; on a throw restore the old text and show the error |
| Click safety | A `mousedown` on a button calls `preventDefault` so a focused input doesn't blur and redraw under the pointer; click handlers read the typed values themselves |
| Preview | Redrawn on a `setTimeout(0)` after the cards; an iframe is reloaded only when its HTML changed |
| Import | Each picked `.md` is parsed by the parser for its role (from the file name or the class file's references); a file that fails to parse is rejected and the stored copy kept; a changed rekod goes through `diffRekod` first |
| Path resolution | Class-file paths resolve against the class file's folder; `..` above the top is dropped; a missing exact path falls back to a unique base name; two files with the same name are an error |
| Export | One download per click (Chrome blocks several at once); the unsaved flag is cleared only for the file handed to the browser |
| Offline | Cache name `lesson-planner-dev`; the release rewrites it to `rph-mate-<date>-<sha>`; `clients.claim` only (no `skipWaiting`: a release waits until the app windows close); old caches are deleted when the new worker activates |

## 6. Security and privacy

- **Data stays local.** No network calls at runtime other than same-origin fetches of app files. No analytics, fonts or CDNs.
- **Public repo hygiene.** `tools/release.js` copies only `app/` and `src/core/`, and only `.js .html .css .webmanifest .svg .png`. It refuses a target that isn't a git checkout and runs the tests first. Commit and push to `rph-mate` stay manual.
- **Rendering.** User text is escaped before going into HTML. Known gap: attribute escaping in some views misses quotes, and the RPH iframe has no `sandbox` (see §10).
- **Phase 3 (Drive).** OAuth with the narrowest scope that works (`drive.file` or `drive.appdata`); tokens kept in memory or IndexedDB, never in the repo; still no server.

## 7. Testing

| Layer | How |
|---|---|
| Core | `node test/all.js` runs parser, calendar, scheduler, planner, sync, position, render and `runWeek` tests against the real files in `sample/` |
| CLI | End-to-end run in a temp folder; a re-run is byte-identical; simulation output matches the committed `output/simulasi-4S-M3/` |
| App logic | `test/app-logic.js` covers `app/logic/*` in Node |
| Release | `test/release.js`: allowed file types only, production name written, non-git target refused |
| Browser | Manual checklist (web app spec §10.4), once per release. **Not done yet.** |

Every new rule gets a test and an entry in `docs/discussion.md` (project convention).

## 8. Build, run, release

```
node test/all.js                                   # all tests
node src/cli/rph.js --classes sample/kelas-2026.md --week 36 [--today 2026-10-25]
node tools/serve.js                                # http://localhost:8080/app/
node tools/release.js ../rph-mate                  # then review, commit, push in rph-mate
```

Windows notes: Git may show regenerated outputs as modified because of CRLF only (check with `git diff --exit-code --quiet <paths>`); write multi-line files with an editor rather than bash heredocs.

## 9. Constraints

- **Single user, one main device** until Phase 3.
- **Chrome / Edge only.** `webkitdirectory` folder picking and persistent storage behave best there.
- **No phone layout.** The Week screen needs about 900 px of width (cards at 44%, minimum 320 px, plus the preview).
- **Markdown formats are frozen** (pipeline spec §3). A format change means a parser change, a test and a discussion-log entry.

## 10. Known technical debt (deferred minors from the 2026-10-03 review)

| Item | Effect |
|---|---|
| Attendance edits on future lessons revert at once | Matches the CLI (Kehadiran doesn't lock a row) |
| Exam card prints the event twice | Cosmetic |
| `esc` misses quotes in attributes; RPH iframe has no `sandbox` | Hardening |
| `serve.js` prefix path check; `release.js` leaves the static `<title>` | Dev and cosmetic |
| Error paths are relative to the class file; a literal BOM char in a `util.js` regex | Readability |
| Spec names `needMinutes/haveMinutes` vs code `need/have` | Doc drift |

Pipeline minors (blank Status, `--today` sanity check, non-atomic writes, …) are listed in [next-session.md](../next-session.md).

## 11. Planned technical changes

| Phase | Change |
|---|---|
| 2 | History importer (Sheets export → rekod rows); progress series computed from rekod history with `planRows` (no new storage) |
| 3 | `sync.js`: Google Identity Services sign-in, a Drive store file, per-record merge; IndexedDB version 2 with record timestamps |
| 4 | RPT generation in the browser (`rpt-planner` is already pure); a frozen snapshot stored as markdown text in `files` plus metadata in `settings` |
