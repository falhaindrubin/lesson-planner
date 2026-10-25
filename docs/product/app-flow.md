# RPH Mate — App Flow

_2026-10-25 · How the teacher moves through the app, and how data moves behind each step. Screens: [UI/UX brief](ui-ux-brief.md). Data: [backend-schema.md](backend-schema.md). Flowcharts use Mermaid (rendered on GitHub)._

Status: everything in §1–§6 is **Built, unchecked** (Phase 1). §7 is **Planned**.

---

## 1. Screen map

```mermaid
flowchart LR
  Start([Open app]) --> Gate{IndexedDB OK?}
  Gate -- no --> Fatal[Full-page message:<br/>use a normal Chrome/Edge window]
  Gate -- yes --> Ready{Class file chosen,<br/>no missing files,<br/>no parse errors?}
  Ready -- no --> Files[⚙ Files]
  Ready -- yes --> Week[Week]
  Week <--> Classes[Classes]
  Week <--> Files
  Classes <--> Files
  Classes -- click a row --> Week
```

- Three tabs: **Week**, **Classes**, **⚙ Files**. Until setup is complete, every tab shows Files.
- The top bar is always visible: app name · ◀ Week *n* (dates) ▶ · Today · tabs · one position badge per class · Unsaved changes · Save rekod.

## 2. First run (setup)

```mermaid
flowchart TD
  A[Files screen] --> B[Type name in Profile<br/>→ settings.profile]
  B --> C[Pick folder sample/]
  C --> D[Pick folder output/<br/>or drop .md files]
  D --> E{Each .md parses?}
  E -- no --> E1[Listed as rejected<br/>with file:line error] --> D
  E -- yes --> F[Stored in files:<br/>path → text]
  F --> G{How many kelas-*.md?}
  G -- one --> H[Chosen automatically]
  G -- several --> G1[Teacher picks one<br/>→ settings.classFile] --> H
  H --> I{All referenced files found?}
  I -- no --> I1[Missing: sample/acara-2026.md …<br/>Week and Classes locked] --> D
  I -- yes --> J[All files found.<br/>Open the Week tab]
```

Notes
- Only `.md` files are read; PDFs, DOCX and HTML in the folders are ignored.
- References in the class file (Takwim, Jadual, Acara, DSKP, Aktiviti, RPT) resolve against the class file's folder. A dropped file without a folder matches by name when the name is unique.
- A missing **rekod** file is not an error: the first run creates it.
- No name in Profile → NAMA GURU stays blank and the Files screen says so.

## 3. Weekly loop (the main flow)

```mermaid
flowchart TD
  O[Open app] --> W[Week opens on the takwim week<br/>containing today]
  W --> R1[runWeek: sync every rekod up to this week,<br/>render RPH, summarise classes]
  R1 --> V[Cards · day strip · RPH preview · badges]
  V --> M{Anything to mark?}
  M -- lesson taught as planned --> N[Nothing to do<br/>Taught is the default]
  M -- postponed/cancelled --> P[Click Postponed or Cancelled]
  P --> Q[Reason box appears, required]
  Q --> S[Type reason → Save]
  M -- attendance/notes --> T[Edit field → leaves field]
  S --> MK[mark]
  T --> MK
  MK --> V
  N --> NX[▶ next week]
  V --> NX
  NX --> PR[Print week / Open in new tab]
  PR --> SV[Save rekod → download<br/>rekod-4S-M3.md]
  SV --> FS[Teacher saves it over the file<br/>in the Rekod folder]
```

Typical session (laptop, end of week):
1. Open the app. It lands on this week.
2. For lessons that didn't happen as planned, choose **Postponed** or **Cancelled** and type the reason. Fix attendance where it differs from the class size.
3. Watch the following lessons' SPs move ("← SPs moved since last view") and the badge update.
4. **▶** to next week, check the cards, **Print week** (or Open in new tab → print to PDF).
5. **Save rekod** once per changed file, and save each download over the old rekod file.

## 4. Marking a lesson (detail)

```mermaid
sequenceDiagram
  actor T as Teacher
  participant V as Week view
  participant S as state.mark
  participant C as core runWeek
  participant DB as IndexedDB
  T->>V: click Postponed
  V->>V: show required Reason (nothing saved yet)
  T->>V: type reason, click Save
  V->>S: mark(lesson, {status:'ditunda', attendance, note})
  S->>S: applyMark → new rekod text (one row changed)
  S->>C: runWeek(week, today, teacher)
  alt runWeek throws
    C-->>S: error
    S->>S: restore old text
    S-->>V: red error bar, card keeps the pending reason
  else success
    C-->>S: writes, rph, lessons, classes
    S->>S: keep rekod writes, unsaved[path] = today
    S-->>V: redraw cards + badges (< 100 ms)
    V->>V: preview redraws next tick
    S->>DB: put changed files, then settings.unsaved
  end
```

Rules shown in this flow
- **Taught** applies at once. **Postponed / Cancelled** wait for a non-empty reason.
- Editing Attendance or Notes commits when the field loses focus (change event) and goes through the same `mark` path.
- Marking a **future** lesson is allowed (for example, cancelling ahead for an event). A changed Status or Catatan keeps that row through future runs.
- A **postponed** lesson keeps its RPH page with "PdP ditunda kerana: <reason>"; its SPs move to the next lesson. A **cancelled** lesson has no page; its SPs also move.

## 5. Re-picking files

```mermaid
flowchart TD
  A[Pick or drop a file again] --> B{Role}
  B -- input: takwim, jadual, acara,<br/>DSKP, aktiviti, RPT, kelas --> C{Parses?}
  C -- no --> C1[Rejected; old copy kept]
  C -- yes --> C2[Replaces stored copy → re-plan<br/>a new class file may report missing files]
  B -- rekod --> D{Same as stored?}
  D -- yes --> D1[Nothing to do]
  D -- differs --> E[diffRekod: past rows and edited future rows<br/>keyed by date + first period]
  E -- no real difference --> D1
  E -- differences --> F["3 lessons differ: M5 Mon, M5 Tue, M7 Wed<br/>side-by-side table"]
  F -- Replace with the file --> G[File wins; unsaved flag cleared → re-plan]
  F -- Keep the app's copy --> H[Nothing changes]
```

## 6. Edge flows

| Situation | What the teacher sees | What happens |
|---|---|---|
| Today isn't in the takwim (school break, another year) | Top bar: "Today is not in the 2026 takwim" | Opens on the last week shown; navigation still works |
| A week with no lessons for any class | "No lessons this week." | Holidays listed in the day strip |
| Every lesson in the week cancelled | "No RPH pages this week." | No HTML for that subject and week |
| Exam day for the class's form | Grey card "Exam: PAT TING. 4", no buttons | Lesson is in the rekod with a blank Status; SP doesn't advance |
| Persistent storage refused | Yellow banner: "This browser may clear the app's data…" | App works; the teacher must Save rekod often |
| Unsaved for more than 7 days | "● Unsaved changes" turns red | — |
| Private window / no IndexedDB | Full-page message | App doesn't start |
| `runWeek` error after an input change | Red bar above the cards | Result cleared until the input is fixed |

## 7. Planned flows

### 7.1 Release (developer, Phase 1b)
`node test/all.js` → `node tools/release.js ../rph-mate` → review the printed file list → commit and push in `rph-mate` → GitHub Pages serves `https://falhaindrubin.github.io/rph-mate/` → open in Chrome → Install → reload offline to check.

### 7.2 History import (Phase 2)
Files → **Import history** → pick an exported Sheet (CSV) per subject → preview the matched lessons (week, date, SP, status) → confirm → rows are merged into the rekod as past rows → the Progress view fills.

### 7.3 Drive sync (Phase 3)
Files → **Connect Google Drive** → Google sign-in (narrow scope) → first sync uploads the local store, or downloads it if one already exists → after that: on open, on each change (debounced) and on reconnect → a status chip in the top bar (Synced · Offline · Syncing · Conflict resolved). On a second device: open the app → Connect → download → ready, without picking any folders.

### 7.4 Yearly setup (Phase 4, December–January)
New takwim and class file → per subject: AI drafts `kesukaran-*.md` outside the app → in the app: **RPT** tab → Generate → review the week table → **Freeze** → weekly planning reads the frozen snapshot. Regenerating later shows a diff and needs confirmation.

### 7.5 Timetable change (any time; works today through file re-pick)
Convert the new aSc printout to `jwg-<date>.md` with its effective-from date → add it to the class file's `Jadual:` line → re-pick both → every future untouched lesson moves to the new slots; past lessons and edited rows stay; a kept future row whose slot disappeared is warned about.
