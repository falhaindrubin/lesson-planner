# RPH Mate — Data Schema

_2026-10-25 · RPH Mate has **no server and no database backend**. "Backend" here means everything the app stores and exchanges: the markdown files (source of truth), the browser's IndexedDB, the objects the core passes around, and the planned Google Drive store. Field names below are the real ones in the code._

---

## 1. Where data lives

| Layer | What | Authority | Status |
|---|---|---|---|
| Markdown files | Inputs and rekod, in `sample/`, `output/`, `rekod/` | **Source of truth** (PR5) | Built |
| IndexedDB `lesson-planner` | A copy of every picked `.md` plus app settings | Working copy in the browser | Built |
| Runtime objects | What `runWeek` and the parsers return | Derived, never stored | Built |
| Google Drive store | One file in the teacher's Drive | Sync copy across devices | Planned (Phase 3) |
| Frozen RPT snapshot | `rpt-<subject>-<form>-<year>.md` | Yardstick | Built as a file; in-app freeze Planned (Phase 4) |

## 2. IndexedDB (browser)

Database **`lesson-planner`**, version **1** ([app/store.js](../../app/store.js)). One database per origin, so the dev app (localhost) and RPH Mate (github.io) never share data.

### 2.1 Store `files` (out-of-line keys)
| Key | Value |
|---|---|
| path as picked, `/`-separated, e.g. `sample/kelas-2026.md`, `output/simulasi-4S-M3/rekod-4S-M3.md`; a dropped file is stored by its bare name | the file's full text (string) |

- Inputs are stored only after their parser accepts them.
- Rekod files are rewritten after every successful `runWeek` whose text changed; the text is exactly what `renderRekod` produces (byte-identical to the CLI).
- RPH HTML is **not** stored; it is rebuilt on demand.

### 2.2 Store `settings` (out-of-line keys)
| Key | Type | Meaning |
|---|---|---|
| `profile` | string | Teacher's name, printed as NAMA GURU (overrides the class file's `Guru:`) |
| `classFile` | string | Key in `files` of the chosen `kelas-*.md` |
| `week` | number | Last takwim week shown |
| `unsaved` | `{ [rekodPath]: 'yyyy-mm-dd' }` | Rekod changed since the last Save rekod → date of the first unsaved change (red after 7 days) |

### 2.3 Migrations
None yet. Phase 3 bumps to version 2 (see §5.3). `onupgradeneeded` must create only the missing stores and keep existing data.

## 3. Runtime objects

Produced by the pure core (`src/core/`); the app and CLI only read them.

### 3.1 Class file → `parseClasses`
```js
{ year: 2026, teacher: 'FALHAIND RUBIN', takwim: 'takwim-smly-2026.md',
  timetables: ['jwg-20260101-simulasi.md', 'jwg-20261005.md'], events: 'acara-2026.md',
  rekod: '../output/simulasi-4S-M3', output: '../output/simulasi-4S-M3',
  classes: [ClassRow] }

ClassRow = { classCode: '4S', fullName: '4 STANFORD', form: 4, subject: 'M3', subjectName: 'MATEMATIK',
             dskp: 'dskp-mat-t4.md', activities: 'aktiviti-umum.md', rpt: '../output/rpt-mat-t4-2026.md',
             tutorial: '', pupils: 32, start: '1.1.1', line: 17 }
```

### 3.2 Rekod row → `parseRekod`
```js
Row = { week: 36, date: '2026-10-05', dayName: 'Isnin', periods: '2–3', time: '7:30–8:30', minutes: 60,
        kind: 'pdp' | 'tutorial' | 'peperiksaan', event: '', sp: ['6.2.1', '6.2.2'],
        status: 'diajar' | 'ditunda' | 'batal' | '', attendance: 32 | null, note: '', line: 41 }
```
**Identity of a lesson:** `(rekod file, date, first period)`. Used by marking, the re-pick diff and (planned) sync.

**Edited row** (kept through future runs): Status differs from the default (`diajar`; blank for exams) **or** Catatan is not empty. Attendance doesn't count.

### 3.3 `runWeek` result
```js
{ writes:   [{ path, text, kind: 'rekod' | 'rph' }],
  rph:      [{ subject: 'M3', week: 36, html }],
  lessons:  [{ classCode, subject, subjectName, pupils, rekod /* path */, row: Row }],
  classes:  [ClassSummary],
  days:     [{ date, dayName, holiday /* name or '' */, exams: [name] }],
  unplanned:[ 'ASK 1S', … ],
  warnings: [ string ] }
```

### 3.4 `ClassSummary` → `classSummary` (as of the start of the week)
```js
{ classCode, subject, subjectName,
  hasDskp, hasRpt, spTotal, spDone, currentSp /* code or null */, finished, rptEnd /* week or null */,
  position: null | { status: 'finished' }
                 | { status: 'notInRpt', sp }
                 | { status: 'onTrack' | 'ahead' | 'behind', sp, rptWeeks: [from, to], weeks },
  fit: null | { need /* min */, have /* min */, endWeek } }
```
Position rule: gap = (content minutes taught − PdP minutes scheduled in teaching weeks so far) ÷ the class's weekly minutes; |gap| < 0.5 → on track, else rounded weeks ahead/behind. `fit` is set when `need > have + 30`.

### 3.5 Other parser outputs (short)
| Parser | Returns |
|---|---|
| `parseTakwim` | `{ weeks, gaps }` (raw columns; `buildCalendar` classifies days per form) |
| `parseTimetable` | `{ effectiveFrom, slots: [{ dayName, periods, time, subject, classCode, room }] }` |
| `parseEvents` | `{ eventDays: [{ date, name, forms: [n] }], cancellations: [{ date, target, reason }] }` |
| `parseDskp` | ordered SP list, each `{ topic, sk, code, text }` |
| `parseDifficulty` | `{ sp, topics }` (SP → 1–3 rating; topic → fixed weeks) |
| `parseRpt` | `{ end /* last syllabus week */, weeks: [{ n, sp: [code] }], allocation: Map(code → weeks) }` |
| `parseActivities` | `{ opening, development, closing }` (string arrays from Permulaan / Perkembangan / Penutup) |

## 4. Markdown file formats (source of truth)

All UTF-8, LF or CRLF, BOM tolerated. Table rows are `| a | b | … |`. Headers and values stay **Malay**. Full rules: [pipeline spec §3](../superpowers/specs/2026-10-03-rph-pipeline-design.md#3-file-formats).

| File | Key structure |
|---|---|
| `kelas-<year>.md` | Meta lines `- Tahun / Guru (optional) / Takwim / Jadual (comma list) / Acara / Rekod / Output`; table `Kelas · Nama penuh · Tingkatan · Subjek · Nama subjek · DSKP · Aktiviti · RPT · Tutorial · Bil. murid · Mula` |
| `jwg-<yyyymmdd>.md` (date = **effective date**, `Berkuat kuasa`) | `- Berkuat kuasa: yyyy-mm-dd`; table under `## Kelas`: `Hari · Waktu · Masa · Subjek · Kelas · Bilik` (one row = one lesson; Masa must match Waktu; period p starts 6:30 + 30p) |
| `takwim-<school>-<year>.md` | One row per day; `Mn` on Mondays; columns Cuti / Perayaan, Pentadbiran, Kurikulum, HEM, Kokurikulum |
| `acara-<year>.md` | `## Hari acara`: `Tarikh · Acara · Tingkatan`; `## Batal`: `Tarikh · Sasaran · Sebab` |
| `dskp-<subject>-<form>.md` | `## n.0 Tajuk` → `### n.n SK` → SP rows `\| n.n.n \| text \|` |
| `kesukaran-<subject>-<form>.md` | SP → 1–3 with a reason; optional fixed weeks per topic |
| `aktiviti-<name>.md` | Bullets under `## Permulaan`, `## Perkembangan`, `## Penutup` |
| `rpt-<subject>-<form>-<year>.md` | Week table + `Sukatan tamat` + appendix `## Peruntukan SP`: `SP · Minggu` (3 decimals) |
| `rekod-<class>-<code>.md` | Header text (regenerated) + table `Minggu · Tarikh · Hari · Waktu · Masa · Jenis · Acara · SP · Status · Kehadiran · Catatan` |

### File naming convention (decided 2026-10-30)

- **Lowercase, ASCII, hyphens, no spaces.** Malay prefixes: `kelas`, `acara`, `aktiviti`, `kesukaran`, `takwim`, `jwg`, `rekod`; `dskp`, `rpt` and `rph` are the standard acronyms.
- **`<subject>-<form>`** = a lowercase slug and the form, e.g. `mat-t5`, `ask-t1`, `sk-t4`, `pjpk-t2`. Used by DSKP, difficulty and RPT files (these are per subject and form, not per class).
- **`<code>`** = the timetable's subject code, e.g. `M3`, `ASK`, `SK`, `PK`, `PJ`. Used by rekod and RPH files, because the timetable and the class file use it. Mapping (also noted in `kelas-<year>.md`): M3 = mat, ASK = ask, SK = sk, PK and PJ = pjpk (one DSKP serves both rows).
- **`<class>`** = the class code from the timetable, e.g. `5S`.
- **Year** is in the name when the content depends on the year (takwim, acara, kelas, RPT), not when it doesn't (DSKP, difficulty).
- **Timetables** are named by their **effective date** (`jwg-20261005.md` is in force from 2026-10-05), not the print date.
- **A source PDF/DOCX takes the name of the `.md` converted from it** (`jwg-20261005.pdf` next to `jwg-20261005.md`). An RPH sample is `rph-<subject>-<form>-<year>-m<week><version>` (`rph-ask-t1-2026-m34a.pdf`). Not converted yet: same pattern with the original extension (`dskp-sk-t4.pdf`, `rpt-sk-t4-2026.docx`).
- **Takwim layers:** `takwim-smly-<year>.md` (school) and `takwim-kpm-<year>.md` (KPM calendar).
- **Generated RPH:** `<year>-M<week>-<code>.html`. **Folders:** live inputs in `sample/`; superseded or reference-only files in `sample/ref/` and `output/ref/`; the simulation in `output/simulasi-<class>-<code>/`; real use in `rekod/<year>` and `output/rph`.
- **What the code enforces:** only `kelas-*.md` and `rekod-*.md` (the app finds them by name) and the generated rekod/RPH names. Everything else is found through the class file.

Example rekod row:
```
| M36 | 2026-10-05 | Isnin | 2–3 | 7:30–8:30 | pdp |  | 6.2.1, 6.2.2 | ditunda | 30 | Mesyuarat panitia |
```

## 5. Planned: Google Drive store (Phase 3)

**Proposal — to be settled in the Phase 3 brainstorm.** Recorded direction (architecture §9): one JSON store file in the teacher's Drive, last-writer-wins per record with timestamps, no server.

### 5.1 File
`RPH Mate/rph-mate-store.json` (or in `appDataFolder`, hidden from the user — open question).

```json
{
  "schema": 1,
  "updatedAt": "2026-11-02T13:05:11.120Z",
  "files": {
    "sample/kelas-2026.md": { "text": "…", "updatedAt": "…", "device": "laptop-7f3a" }
  },
  "rekodRows": {
    "output/rekod/rekod-4S-M3.md|2026-10-05|2": {
      "status": "ditunda", "attendance": 30, "note": "Mesyuarat panitia",
      "updatedAt": "2026-10-09T08:12:00.000Z", "device": "laptop-7f3a"
    }
  },
  "settings": { "profile": { "value": "…", "updatedAt": "…" } }
}
```

### 5.2 Merge rules (proposal)
- **Inputs** (`files`): whole-file last-writer-wins by `updatedAt`.
- **Rekod**: merged **per lesson** on the teacher's edits only (Status, Kehadiran, Catatan), keyed `rekod|date|firstPeriod`; after merging, `runWeek` rebuilds the rekod text, so generated rows never conflict.
- **Settings**: per key last-writer-wins; `week` and `unsaved` stay per device and aren't synced.
- Deletions: tombstones (`"deleted": true`) for 30 days.

### 5.3 IndexedDB version 2 (proposal)
- New store `meta`: `{ path → { updatedAt, device } }` for `files`.
- New store `marks`: `{ 'rekod|date|firstPeriod' → { status, attendance, note, updatedAt, device } }`, written by `mark()` beside the rekod text.
- `settings.deviceId`, `settings.drive = { connected, lastSync, fileId }`.

### 5.4 Alternative considered
Sync the markdown files themselves into a Drive folder, readable by the CLI through Drive for desktop. It's simpler for the teacher to see, but merging rekod files concurrently is harder. Decide in Phase 3.

## 6. Planned: RPT freeze (Phase 4)

- The frozen RPT stays a markdown file (`rpt-<subject>-<form>-<year>.md`) stored in `files`, so the CLI and the app read the same thing.
- `settings.rpt = { [subject|year]: { frozenAt, sourceHash /* DSKP+takwim+kesukaran */ } }` lets the app warn when inputs changed after freezing, without moving the RPT.

## 7. Planned: progress history (Phase 2)

No new storage is needed: past progress is computed by replaying rekod rows with `planRows` week by week. The history import writes past rows into the rekod files (Status `diajar`/`ditunda`/`batal`, SP, Catatan from the Sheets), and those rows are then ordinary kept rows.
