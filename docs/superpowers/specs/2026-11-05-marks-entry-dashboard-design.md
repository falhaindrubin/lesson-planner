# Marks Entry and Class Dashboard — Design Spec

_2026-11-05 · A side feature of RPH Mate (see PRD §3 "Side features"). Replaces the read-only Marks tab built on 2026-11-03 with a tab where the teacher **types** marks and sees how every class is doing. Written from a brainstorm with the teacher; the teacher's own words and decisions are marked **Decided**, everything else is **My call** (open to correction)._

## 1. Intent

The teacher keeps results in one Google Sheet, "[PENTAKSIRAN] 2026": one sheet per class × subject, with mid-year and final marks, % and grade by formula, TP typed by hand, and a small summary block (average, grade counts). It works, but formulas break (`#REF!`, `#DIV/0!`), grade scales differ per sheet, and there is no view of all classes at once.

**Why now:** the app already knows the teacher's classes, and the teacher wants one place to see "how many classes I teach and how they perform", year by year.

**What success looks like:** after a test, the teacher opens the class's grid, types the raw marks down the column, and sees % and grade appear. On the dashboard every class has a card with its student count and performance. No formula to repair.

### Goals
- **M1 — Type marks fast.** One grid per class × subject, laid out like the Sheet. Tab/Enter moves down a column.
- **M2 — Grades without formulas.** % and grade are worked out by the app from the raw mark, "out of" value and the grading scale.
- **M3 — See every class at once.** A dashboard of cards, one per class × subject, for the chosen year.
- **M4 — Plain files, private.** Marks live in `markah-*.md` files the teacher can open, back up and keep out of git. Names only; nothing leaves the device (PRD G4–G6).

### Non-goals (first version)
- IC numbers (NO KP). **Decided:** names only for now.
- Following a student across years. **Decided:** each year starts fresh.
- Comparing years for the same class and subject (a later feature).
- Importing marks or student lists from the Sheet, except pasting names (§5.3).
- Report cards, official grading output, the Sheet's "PPSA" figure (its meaning is unknown, §10).
- Editing the grading scales in the app (the four scales are built in; §4).

### Anti-goals (a failure even if it works)
- The weekly RPH loop gets slower, or the Marks area gets in the way of Today / Week / RPT.
- Real student names or marks end up in git, the published `rph-mate` repo, or any service.
- The grade shown differs from what the Sheet's own scale table says for the same percentage.

## 2. Users and context

One teacher, laptop first, often offline. Classes in 2026 (from the Sheet): ASK 1S, PJPK 2D, 2J, 2C, MAT 1 UKM, GEO 2 UMS, MAT 4S, SK 4H. Some of these (2C, 1 UKM, 2 UMS) are not in `kelas-2026.md`; **My call:** the Marks area must not require a class to be in the class file (§6).

## 3. What the Sheet teaches us (facts read from the teacher's file)

- Per class sheet: `BIL`, `NAMA`, `NO KP`, then two assessments, each with **raw mark (x / N)**, **%**, **GRED**, **TP (PB)**. N differs: 70 (ASK), 40 (PJPK), 100 (MAT 1 UKM, SK), 80 (GEO). Assessment titles differ by subject: *Pentaksiran Pertengahan / Sumatif / Peperiksaan Pertengahan* then *Ujian Sesi Akhir / Peperiksaan Akhir Tahun*.
- **MAT 4S** has two papers per exam (K1 out of 40, K2 out of 100 mid-year; K1 out of 40, K2 out of 80 final) and a combined %. The combining rule is not in the file (§10, question 1).
- `TH` = tidak hadir (absent); `X` appears in the grade tables (treated as "no mark").
- The right-hand block counts grades A–F and TH per class and shows a "PPSA" value.
- **A formula error in the Sheet:** SK 4H's mid-year grade (C+) comes from the raw mark 58, not the percentage 73 (which is A-). The app grades from the percentage.

## 4. Grading scales

Four tables from the Sheet's `data` tab, built into the app. A grade is the highest band whose minimum is ≤ the percentage; `TH` and blank give no grade.

| Scale | Bands (minimum % → grade) |
|---|---|
| **PT3** | 0 F · 40 E · 50 D · 60 C · 70 B · 85 A |
| **SPM** | 0 G · 40 E · 45 D · 50 C · 55 C+ · 60 B · 65 B+ · 70 A- · 80 A · 90 A+ |
| **UASA-24** | 0 F · 20 E · 35 D · 50 C · 66 B · 82 A |
| **SMLY-MR** | 0 G · 40 E · 50 D · 60 C · 70 B · 85 A |

Each **test** (not each class) names its scale, because MAT 4S uses two scales in one year (mid-year G at 6%, final F at 7%). **My call:** a test with no scale named uses SPM for Form 4–5 and PT3 for Forms 1–3.

**Pass:** **My call:** a pass is 40% or more, for every scale (same as the existing tab). The UASA-24 table has E from 20%, so this may not match the teacher's meaning of "pass" there (§10, question 2).

**TP** (Tahap Penguasaan, 1–6) is **Decided: the teacher's professional judgment.** It is typed per student per test, never calculated. Blank is allowed.

## 5. Behaviour

### 5.1 Marks area, two screens
1. **Dashboard** (opens first): year switcher, one card per class × subject. **Decided: card per class** (mockup A).
2. **Class grid:** opened by clicking a card; back returns to the dashboard.

The existing tab name "Marks" stays.

### 5.2 Dashboard card
Shows, for one class × subject in the chosen year (**Decided**: students, performance; the exact fields are **My call**):
- class and subject (e.g. `1S · ASK`) and student count;
- the **latest test's average %** and its name;
- a **grade bar** (counts per grade of the latest test, in the scale's colours low→high);
- **pass rate** of the latest test;
- the **change in average** since the earlier test (▲/▼ points) when two tests have marks;
- "Final not taken yet" when the last test has no marks; the number of students below the pass mark in red.
A card with no marks at all says "No marks yet". Cards are sorted by form, then class, then subject.

### 5.3 Class grid (**Decided: one grid like the Sheet**, mockup A)
- Header: class, subject, year, student count.
- Rows: `Bil`, `Nama`, then per test four cells: **Mark** (typed), **%** (shown), **Gred** (shown), **TP** (typed).
- **Typing:** Tab/Enter go down the column; arrow keys move; `TH` or `-` means no mark. A mark over the test's "out of" or below 0, or text that is not a number, is refused with a red cell and a short reason; the value is not stored.
- **Live results:** % and grade update as you type. A summary under the grid per test: students who sat, average %, pass rate, grade counts, TH count.
- **Tests:** added, renamed, removed and given an "out of" and a scale in a small panel above the grid. Removing a test with marks asks first.
- **Students:** names are **pasted** once per class (a text box: one name per line, or two or more columns copied from a sheet). Rows that look like an IC number (digits with dashes, or 12 digits) and any `NO KP`/`BIL` columns are **dropped**, and the app says so. Students can be added, renamed or removed one by one. Removing a student with marks asks first.
- **Unsaved:** every change is kept in the browser at once and flagged unsaved, like the rekod (§7).

## 6. Data

### 6.1 File: `markah-<kelas>-<kod>.md` (one per class × subject × year)
**My call:** the year goes in the file, not the name, so the existing naming convention is kept; the teacher keeps each year's files in a year folder (`markah/2026/`). The app reads the year from the file.

```
# Markah 1S ASK 2026

- Tahun: 2026
- Kelas: 1S
- Subjek: ASK

## Ujian

| Kod | Nama | Daripada | Skala |
|---|---|---|---|
| PPT | Pentaksiran Pertengahan | 70 | PT3 |
| PAT | Ujian Sesi Akhir | 70 | PT3 |

## Murid

| Nama | PPT | PPT TP | PAT | PAT TP |
|---|---|---|---|---|
| AMIR BIN HASSAN | 44 | 4 | 37 | 5 |
| CHIN WEI LIANG | 47 | 4 | TH |  |
```

- Marks are raw (not %). `TH` or `-` or blank = no mark. TP is an integer 1–6 or blank.
- Header text is Malay, like the other files (PRD language rules); the app UI stays English.
- Only names; no IC column (a file with a `NO KP` column is read but the column is ignored and a warning shown).

### 6.2 The old format still works
`markah-5S-M3.md` as built on 2026-11-03 (a `Nama` table with one column per test, marks 0–100, no `## Ujian`) keeps loading, shown as a read-only class with "out of 100", SPM scale, no TP, no year (grouped under "No year"). The first edit upgrades the file to the new format. `test/data/markah-5S-M3.md` stays as the old-format test.

### 6.3 Year, class and subject
Identity of a card = `Tahun` + `Kelas` + `Subjek` from the file. The code in `Subjek` is the timetable code (ASK, SK, M3, PJ, PK) **or** any short text for subjects the RPH side does not know (GEO, MAT). The Marks area never reads the class file.

## 7. Saving
Exactly the rekod pattern already in the app (`app/export.js`, `state.unsaved`, the red unsaved flag after 7 days): the file text is stored in IndexedDB with the other files, a change marks it unsaved, and **Save** downloads the one changed file for the teacher to put back in the `markah/` folder. No new storage, no new permission.

**New:** a new class creates a new file in the same store; its download name is `markah-<kelas>-<kod>.md`. If two files claim the same year + class + subject, the app shows both and asks which to keep (no silent merge).

## 8. Privacy rules (G5)
- Names only. IC numbers are dropped on paste (§5.3).
- Real `markah-*.md` files are **git-ignored** (everything except `test/data/`); add this to `.gitignore`. The release script (`tools/release.js`) must never copy a markah file.
- All test data uses made-up names (the existing convention).

## 9. Files and code (for orientation; the builder decides the detail)
Existing and reused: `app/markah-view.js`, `app/logic/markah.js` (parser and statistics), `app/export.js`, `app/state.js` (files, unsaved), `test/app-logic.js`, `test/data/markah-5S-M3.md`.
New: scale tables and grade lookup (pure, tested), the new-format parser/writer, the card and grid views, the paste cleaner. The pass mark and scales are constants in one place.

## 10. Questions that only the teacher can answer
1. **MAT 4S (two papers):** how is the combined % worked out from K1 and K2? Until known, **My call:** one column per paper, no combined % for that sheet.
2. **Pass:** is 40% right for every scale, or is "pass" a grade (e.g. D and above, or E and above)? Until known, 40% for all.
3. **PPSA:** what is it and should the card show it? Until known, not shown.
4. **Is MAT 4S's mid-year G (6%) on SPM and its final F (7%) on PT3** or UASA-24? Until known, the teacher picks the scale per test.

## 11. Left to the builder
Exact layout, colours, keyboard details, the paste box wording, error message text, how the year switcher is built, and how the grid scrolls for 45+ students; the plan must keep the weekly screens untouched and the tests green.

## 12. Acceptance (what "done" looks like)
- A new class can be created, names pasted (IC numbers dropped), two tests defined, marks and TP typed, and the file saved and re-opened with identical content.
- For every row in the Sheet's `data` tab, a percentage on a band edge gets the grade the Sheet gives (tested per scale).
- The dashboard lists every file's class for the chosen year; the year switcher shows only years that have files.
- The old `markah-5S-M3.md` still opens, and upgrades on first edit.
- No real marks file can be committed or released.
- The existing tests still pass (on 2026-11-05 `cli`, `position`, `rpt` and `week` already failed because `sample/dskp-mat-t5.md` had moved to `sample/ref/`; that is unrelated and must be settled first), plus new tests for scales, parser/writer round trip and the paste cleaner.
