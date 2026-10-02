# Lesson Planner — Architecture

_Last updated: 2026-10-02 · Status: requirements done for RPT; RPH, dashboard and app shell not built yet._

This document describes how the system is put together: its parts, the data they share, and the rules each part enforces. **Why** each rule exists is recorded in [discussion.md](discussion.md); this file only says **where** it lives. Anything marked **Proposal** is not decided yet.

---

## 1. Purpose

One KSSM teacher (SM Lok Yuk, Kudat, Sabah) needs to produce, every year:

- an **RPT** (Rancangan Pengajaran Tahunan) per subject: which SPs are taught in which school week, and
- an **RPH** (Rancangan Pengajaran Harian) per lesson: the plan for one class period, printed as PDF,

and to see at any time how far each class is through the syllabus compared with the RPT.

The hard part is not writing plans. It is keeping dates, days, times and SPs right while the **timetable changes several times a year**, the calendar has holidays, exams and events that differ by form, and lessons get postponed.

## 2. Principles

| # | Principle | Consequence |
|---|---|---|
| P1 | **Single user, many devices** | No accounts, roles or sharing. Laptop, desktop and tablet hold the same data. |
| P2 | **Offline first** | Everything except the AI step works with no internet. Changes sync when a connection exists. |
| P3 | **Markdown files are the inputs** | DSKP, takwim, timetable and difficulty ratings are hand-checked `.md` files. The app parses them; it never scrapes PDFs. Source PDFs are kept in `sample/` for reference only. |
| P4 | **Deterministic engine** | Same inputs → same RPT and RPH. AI only *drafts* data (difficulty ratings, later activity text) that the teacher reviews and stores as a file. |
| P5 | **RPT is a yardstick, RPH follows reality** | The RPT is generated once and frozen. RPHs are driven by each class's **actual** progress, never by the RPT. |
| P6 | **Pure core, thin shells** | Parsing, planning and rendering are pure functions with no I/O. The same core runs in the Node CLI (today) and in the browser app (later). |
| P7 | **The calendar is data, not code** | Holidays, exams and breaks come from the takwim each year. No year-specific dates in code. |

## 3. System overview

```
                       ┌──────────────────────── INPUTS (markdown, checked by teacher) ───────────────────────┐
                       │  DSKP.md          Takwim.md (2 layers)        Jadual.md (versions)    Kesukaran.md    │
                       │  per subject      KPM + school, per year      effective-from date     per subject     │
                       └────┬──────────────────┬───────────────────────────┬───────────────────────┬───────────┘
                            │                  │                           │                       │
                            ▼                  ▼                           ▼                       │
                      ┌──────────┐     ┌───────────────┐          ┌─────────────────┐              │
                      │ Curriculum│     │ Calendar      │          │ Timetable       │              │
                      │ model     │     │ engine        │          │ resolver        │              │
                      └────┬─────┘     └──────┬────────┘          └────────┬────────┘              │
                           │                  │                            │                       │
                           │      ┌───────────┴─────────┐                  │                       │
                           ▼      ▼                     ▼                  ▼                       │
                      ┌──────────────────┐        ┌───────────────────────────┐                    │
   AI (once/subject) ─►│  RPT planner     │◄───────┼───────────────────────────┼────────────────────┘
   drafts Kesukaran   └───────┬──────────┘        │  Lesson scheduler          │
                              │ frozen RPT         │  (lesson instances)        │
                              ▼                    └─────────────┬─────────────┘
                      ┌──────────────────┐                       ▼
                      │  Progress &      │◄──────────── ┌──────────────────┐ ◄── teacher: held / ditunda /
                      │  dashboard       │   outcomes   │  RPH generator    │     batal, reflection, attendance
                      └──────────────────┘              └────────┬─────────┘
                                                                 ▼
                                               Renderers: Markdown · printable HTML → PDF
```

## 4. Components

Status: **Built** = working with tests · **Stopgap** = temporary tool · **Planned** = designed here, not built.

### 4.1 Input parsers — _Built (DSKP, Takwim, Kesukaran) · Planned (Jadual)_

Each parser turns one markdown format into plain objects. Code: [rpt/rpt.js](../rpt/rpt.js) (`parseDskp`, `parseTakwim`, `parseKesukaran`).

| Input | Format (see sample) | Parsed into |
|---|---|---|
| DSKP | [sample/dskp-mat-t4.md](../sample/dskp-mat-t4.md): `## 1.0 Tajuk` → `### 1.1 SK` → SP table rows `\| 1.1.1 \| text \|`, TP table per SK (ASK) or per topic (Matematik) | Ordered SP list, each with its topic and SK |
| Takwim | [sample/takwim-smly-2026.md](../sample/takwim-smly-2026.md): one row per day; `Mn` on Mondays; columns Cuti / Perayaan, Pentadbiran, Kurikulum, HEM, Kokurikulum | Weeks (M1…Mn) of five weekdays + weekdays in breaks |
| Kesukaran | [rpt/kesukaran-mat-t4.md](../rpt/kesukaran-mat-t4.md): SP → 1–3 with reason; optional fixed weeks per topic | `{ sp: Map, tajuk: Map }` |
| Jadual | [sample/jwg-20261002.md](../sample/jwg-20261002.md): effective-from date + rows (Hari, Waktu, Masa, Subjek, Kelas, Bilik) | Timetable version with slots — _parser planned_ |

Rules for all parsers: fail loudly on structure errors (e.g. SP outside its SK); warn on data gaps (e.g. SP without a rating → default 2).

### 4.2 Calendar engine — _Built (inside the RPT planner) · to be split out_

Classifies every weekday for a given **form**. Two layers, applied in order:

1. **KPM layer** — terms, breaks, national holidays, Cuti Tambahan KPM (e.g. [sample/takwim-kpm-2027.md](../sample/takwim-kpm-2027.md)).
2. **School layer** — Sabah state holidays, Cuti Peristiwa, exams, events (e.g. the SM Lok Yuk takwim).
3. **Manual overrides** — surprise cancellations (e.g. Ujian SEGAK) entered in the app. _Planned._

| Day class | How it is detected | Effect |
|---|---|---|
| Break / holiday | Any weekday text in **Cuti / Perayaan**, except entries listed as not-a-holiday in Sabah (Hari Sarawak) | No lessons, no RPH, zero RPT capacity |
| Exam (per form) | **Kurikulum** item mapped to forms: `PPT Ta - b`, `PAT TING.4`, `UASA` (T1–3), `PEP. PERCUBAAN SPM` (T5); `UBBM/UBBI` ignored | RPH generated and marked "Peperiksaan"; SP doesn't advance; zero RPT capacity |
| Event | Weekday activity in the school layer (Sukaneka, X-Break, …) | RPH flagged "event day"; teacher decides |
| Normal | Everything else (meetings are ignored) | Lesson as timetabled |

Derived per form: **exam blocks** (consecutive exam weeks). The first block is the mid-year exam (PPT); the last block is the final exam (PAT / UASA / Percubaan SPM).

### 4.3 RPT planner — _Built_ ([rpt/rpt.js](../rpt/rpt.js) `plan`, tests in [rpt/test.js](../rpt/test.js))

Input: SP list, ratings, calendar, form. Output: week-by-week plan.

1. **Capacity** counts whole **takwim weeks**: a week with at least one teaching day = 1 week; a week that is all holiday or all exam (for that form) = 0. Partial weeks are noted in Catatan (e.g. "3/5 hari PdP") but still count as one week.
2. **Syllabus end** = final exam's first week − 1 − revision weeks (default **2**, all forms). Weeks after it until the final exam are *Ulang kaji & pengukuhan*; weeks after the exam are *Pasca peperiksaan*.
3. **Split at PPT**: the first ⌈topics ÷ 2⌉ topics must fit before the mid-year exam; the rest go after it.
4. **Inside each half**: topics with **fixed weeks** take exactly that capacity; other SPs share the rest in proportion to their 1–3 rating. DSKP order is kept.
5. **Map to weeks**: each SP occupies a span of cumulative capacity; it is listed in every week it overlaps by ≥ 0.2 of a week (continuations marked "(samb.)").
6. **Freeze**: once the teacher accepts it, the RPT is stored as a snapshot (week → SPs). Later rating changes do not move it unless the teacher regenerates on purpose. _Freeze step planned; today the output files are the snapshot._

Fails on purpose when the takwim has no exam weeks (the split and revision rules need them), or when fixed weeks exceed a half's capacity.

### 4.4 Timetable resolver — _Planned_

- Holds every **timetable version** with its effective-from date (from the aSc footer).
- For a date, picks the latest version with effective-from ≤ date. A timetable change is a new file, never an edit of dates.
- Slots: 30-minute periods, period 0 = 6:30. Consecutive periods of the same subject and class merge into **one lesson** (the RPH sample shows 0800–0830 + 0830–0900 as one RPH).
- aSc "B" marks (after-school duty) are not lessons.

### 4.5 Lesson scheduler — _Planned_

Produces **lesson instances**: for each school day × slot in the resolved timetable → `{ date, week, class, subject, periods, kind }`.

- `kind`: normal · exam · event-flagged · **tutorial** (TUTORIAL slot for 4H).
- Holidays produce no instances. Manual cancellations remove or mark instances.

### 4.6 RPH generator — _Planned (logic proven in the Apps Script stopgap)_

For each lesson instance, choose the SP(s) from the class's **progress queue**:

1. SPs from a postponed lesson (*PdP ditunda*) are taught first.
2. Otherwise continue after the last completed SP.
3. **Tutorial** lessons repeat that week's SP and do not advance.
4. **Exam** lessons are generated but carry no new SP.
5. A lesson may carry more than one SP (e.g. 4.2.7 + 4.2.8).

Fills the RPH layout of [sample/2026 - ASK T1 - Google Sheets M34A.pdf](../sample/): guru, subjek, minggu/tarikh/hari, tingkatan, masa, kehadiran, tajuk, SK, SP, objektif, ringkasan aktiviti (Permulaan / Perkembangan / Penutup — fixed template per subject now, AI per SP later), refleksi.

### 4.7 Progress & dashboard — _Planned_

- Teacher records each lesson's outcome once a week (laptop): **held**, **ditunda** (postponed) or **batal** (cancelled), plus reflection and attendance.
- An SP is **completed** when a lesson covering it was held and not postponed.
- Per class: % of SPs completed, and **weeks ahead/behind the RPT** (compare the last completed SP with the RPT week that plans it; both directions — 4H SK is about 5 weeks ahead).
- **History import**: weeks M12–M35 of 2026 from the existing Google Sheets seed the dashboard. _Needs the Sheets for SK, MAT, PJPK._

### 4.8 Renderers — _Built for RPT_

- Markdown (for review and git diffs) and self-contained printable HTML (A4 landscape for RPT; one RPH per page). PDF = browser print. No server-side PDF library.
- RPT columns: Minggu, Tarikh, Tajuk, Standard Kandungan, Standard Pembelajaran, Catatan (holidays, exams, partial weeks).

### 4.9 AI assistant — _Manual today_

- **Difficulty draft**: once per subject per year, AI reads the DSKP (SP text + Catatan) and writes `kesukaran-<subject>.md` with a 1–3 rating and a reason per SP. The teacher edits it; the planner only reads the file. Today this is done by Claude in a session; in the app it becomes one online call.
- **Activity text per SP**: later.
- The only component that needs internet. Its output is always a reviewable file, never a hidden input.

### 4.10 Stopgap: Apps Script — _Stopgap_ ([apps-script/Code.gs](../apps-script/Code.gs))

Menu **RPH → Jana minggu seterusnya** in each subject's Google Sheet: copies the latest week tab, moves dates +7 days, fills the next SP, re-teaches postponed SPs first. Retired when the app's RPH generator is live.

## 5. Data model

```
Year ─┬─ CalendarDay (date, week Mn | break, holiday?, exams[forms], events[])
      ├─ ExamBlock (form, first week, last week, name)        ← derived
      └─ TimetableVersion (effectiveFrom) ── Slot (weekday, periods, subject, class, room)

Subject ── DSKP ── Topic (1.0) ── SK (1.1) ── SP (1.1.1)
   │                  └── TP 1–6 (per topic or per SK)
   ├── Kesukaran (SP → 1–3, reason; Topic → fixed weeks)
   └── RPT (year, frozen snapshot: week → [SP])

Class (e.g. 4S, form 4) ── teaches ── Subject
   └── Lesson (date, periods, kind) ── RPH (SPs, activities)
                                   └── Outcome (held | ditunda | batal, reflection, attendance)
```

| Entity | Key | Notes |
|---|---|---|
| Year | `2026` | Owns one calendar (both layers) and the class list |
| CalendarDay | date | Week numbers continue across breaks (M1…M43 in 2026, M1…M44 in 2027) |
| Subject | code (`M3`, `ASK`, `SK`, `PK`/`PJ`) | DSKPs are reused across years |
| SP | code `t.s.n` | Unique within a DSKP; the link between RPT, RPH and progress |
| RPT | subject + year | One per **subject** (all classes of that subject share it) |
| Lesson | class + date + first period | Generated; never typed by hand |
| Outcome | lesson | The only data entered every week |

## 6. Rules and where they live

| Rule | Component | Status |
|---|---|---|
| Weekday Cuti / Perayaan entry closes school, except Hari Sarawak | Calendar | Built |
| Exams apply per form; UBBM/UBBI ignored | Calendar | Built |
| Meetings don't cancel lessons | Calendar | Built (ignored by design) |
| Capacity = whole takwim weeks with ≥ 1 teaching day | RPT planner | Built |
| Syllabus ends at final exam − 2 revision weeks, every form | RPT planner | Built |
| Half the topics before PPT | RPT planner | Built |
| Fixed weeks per topic (Matematik T4 topic 10.0 = 2) | RPT planner | Built |
| RPT frozen once accepted | RPT store | Planned |
| Timetable version by effective-from date | Timetable resolver | Planned |
| Postponed SP taught first; tutorial repeats; exam doesn't advance | RPH generator | Planned (stopgap has postponed + next SP) |
| SP completed = held and not postponed | Progress | Planned |

## 7. Main flows

**Yearly setup (December / January)**
1. Convert the KPM calendar → `takwim-kpm-<year>.md`; add the school takwim layer when released.
2. Enter classes and subjects; add any new DSKP (e.g. Matematik T5 for 2027).
3. Per subject: AI drafts `kesukaran-*.md` → teacher reviews → generate RPT → check → **freeze**.

**Timetable change (several times a year)**
1. Convert the new aSc printout → `jwg-<date>.md` with its effective-from date.
2. Lessons from that date are re-derived; past lessons and outcomes are untouched.

**Weekly cycle**
1. App generates the coming week's RPHs from the timetable in force, the calendar and each class's progress.
2. Teacher prints or views them; after teaching, records outcomes, reflection and attendance.
3. Dashboard updates % done and weeks ahead/behind.

## 8. Repository layout

| Path | Contents | Status |
|---|---|---|
| `docs/` | [discussion.md](discussion.md) (decisions), this file | — |
| `sample/` | Source PDFs/DOCX and their checked markdown (DSKP, takwim, timetable) | Inputs |
| `rpt/` | RPT core + CLI (`rpt.js`), tests (`test.js`), difficulty files | Built |
| `output/` | Generated RPTs (`.md`, `.html`) | Generated |
| `apps-script/` | Google Sheets stopgap + test | Stopgap |
| `src/` | **Proposal**: the app — `core/` (parsers, calendar, planner, scheduler, RPH; moved out of `rpt/`), `ui/`, `store/` | Planned |

Conventions: Node 24, CommonJS, no dependencies so far; tests are plain `node <file>.js` with `assert` against real sample data; code comments and generated documents in Bahasa Melayu, docs in English.

## 9. Technology

| Concern | Decided | Proposal (open) |
|---|---|---|
| Core logic | Plain JavaScript, pure functions, no dependencies | Keep; share between CLI and browser |
| Inputs | Markdown files checked by the teacher | — |
| Output | Markdown + printable HTML; PDF via browser print | — |
| App shell | Installable PWA, offline | Static site + service worker; no framework until screens need one |
| Local storage | — | IndexedDB in the browser (inputs, frozen RPTs, lessons, outcomes) |
| Sync | Must work across laptop / desktop / tablet | One JSON store file in the teacher's Google Drive (already used for the Sheets): last-writer-wins per record with timestamps. Avoids running a server. |
| AI | Once per subject per year | Claude API call from the app, result saved as `kesukaran-*.md` |

## 10. Status and next steps

| Step | State |
|---|---|
| Inputs converted: DSKP ASK T1, DSKP Matematik T4, takwim 2026, KPM 2027 (draft), timetable 5.10.2026 | Done |
| RPT planner with calendar rules, tests, Matematik T4 2026 output | Done |
| Review difficulty ratings for Matematik T4 | Teacher |
| Jadual parser + timetable resolver + lesson scheduler | Next |
| RPH generator (port Apps Script logic, add tutorial/exam rules) + RPH renderer | Next |
| Outcomes, progress, dashboard, history import from Sheets | After RPH |
| PWA shell, storage, sync | After the core is complete |

## 11. Open decisions

- Sync approach and app stack (§9 proposals) — confirm before building the shell.
- Exact markdown formats for DSKP / Jadual / Takwim — current samples are the de facto formats; freeze them in the spec.
- 2027: Lampiran C (confirm estimated Cuti Tambahan KPM days) and the school takwim (exam weeks).
- DSKP and a sample RPH week for PJPK; Sheets for SK, MAT, PJPK (history import).
