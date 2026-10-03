# Lesson Planner — Architecture

_Last updated: 2026-10-03 · Status: RPT and RPH pipeline built in `src/core/` and `src/cli/` (§4.4–4.6); stack decided (§9); dashboard and app shell not built yet._

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

### 4.1 Input parsers — _Built_

Each parser turns one markdown format into plain objects. Code: [src/core/parse/](../src/core/parse/) (`parseDskp`, `parseTakwim`, `parseKesukaran`). The takwim parser keeps column text raw; classifying days is the calendar engine's job.

| Input | Format (see sample) | Parsed into |
|---|---|---|
| DSKP | [sample/dskp-mat-t4.md](../sample/dskp-mat-t4.md): `## 1.0 Tajuk` → `### 1.1 SK` → SP table rows `\| 1.1.1 \| text \|`, TP table per SK (ASK) or per topic (Matematik) | Ordered SP list, each with its topic and SK |
| Takwim | [sample/takwim-smly-2026.md](../sample/takwim-smly-2026.md): one row per day; `Mn` on Mondays; columns Cuti / Perayaan, Pentadbiran, Kurikulum, HEM, Kokurikulum | Weeks (M1…Mn) of five weekdays + weekdays in breaks |
| Kesukaran | [sample/kesukaran-mat-t4.md](../sample/kesukaran-mat-t4.md): SP → 1–3 with reason; optional fixed weeks per topic | `{ sp: Map, tajuk: Map }` |
| Jadual | [sample/jwg-20261002.md](../sample/jwg-20261002.md) (**frozen format**): `Berkuat kuasa: yyyy-mm-dd` + `## Kelas` table (Hari, Waktu, Masa, Subjek, Kelas, Bilik); `## Bukan kelas` ignored. One row = one lesson | `{ berkuatKuasa, slots }` — `parse/jadual.js` |
| Kelas | `kelas-<tahun>.md`: Nama guru; one row per class × subject (Kelas, Nama penuh, Tingkatan, Subjek, DSKP, Aktiviti, RPT, Tutorial, Bil. murid, Mula = starting SP) | Class list — `parse/kelas.js` |
| Acara | `acara-<tahun>.md`: table **Hari acara** (Tarikh, Acara, Tingkatan — blank = all) and table **Batal** (Tarikh, Tingkatan/Kelas, Sebab) | Event days + known cancellations — `parse/acara.js` |
| Aktiviti | `aktiviti-<subjek>.md`: lists Permulaan / Perkembangan / Penutup | Activity template — `parse/aktiviti.js` |
| Rekod | `rekod-<kelas>-<subjek>.md`: one row per lesson (Minggu, Tarikh, Hari, Waktu, Jenis, SP, Status, Kehadiran, Refleksi/Sebab). Read **and written** by the CLI | Lesson history + outcomes — `parse/rekod.js`, written by `render/rekod.js`. Also: the RPT file itself is read by `parse/rpt.js` → `{ tamat, minggu, peruntukan }` |

Rules for all parsers: fail loudly on structure errors (e.g. SP outside its SK); warn on data gaps (e.g. SP without a rating → default 2).

### 4.2 Calendar engine — _Built_ ([src/core/calendar.js](../src/core/calendar.js))

Classifies every weekday for a given **form**. Two layers, applied in order:

1. **KPM layer** — terms, breaks, national holidays, Cuti Tambahan KPM (e.g. [sample/takwim-kpm-2027.md](../sample/takwim-kpm-2027.md)).
2. **School layer** — Sabah state holidays, Cuti Peristiwa, exams, events (e.g. the SM Lok Yuk takwim).
3. **Manual overrides** — event days and cancellations known ahead (e.g. Ujian SEGAK) from `acara-<tahun>.md`; in the app later. _Planned._

| Day class | How it is detected | Effect |
|---|---|---|
| Break / holiday | Any weekday text in **Cuti / Perayaan**, except entries listed as not-a-holiday in Sabah (Hari Sarawak) | No lessons, no RPH, zero RPT capacity |
| Exam (per form) | **Kurikulum** item mapped to forms: `PPT Ta - b`, `PAT TING.4`, `UASA` (T1–3), `PEP. PERCUBAAN SPM` (T5); `UBBM/UBBI` ignored | RPH generated and marked "Peperiksaan"; SP doesn't advance; zero RPT capacity |
| Event | Listed in `acara-<tahun>.md` (hand-picked; takwim columns are too noisy to detect from) | RPH flagged "event day"; teacher decides |
| Batal | Listed in the **Batal** table of `acara-<tahun>.md` | No lesson, no RPH |
| Normal | Everything else (meetings are ignored) | Lesson as timetabled |

Derived per form: **exam blocks** (consecutive exam weeks). The first block is the mid-year exam (PPT); the last block is the final exam (PAT / UASA / Percubaan SPM). Also derived: **breaks** between school weeks (Cuti Penggal etc.).

Functions: `buildCalendar` (raw takwim → classified days), `dayClass(day, form)` → cuti · exam · pdp, `weekFor(week, form)`, `examBlocks`, `breaks`. Event days and manual overrides are not classified yet.

### 4.3 RPT planner — _Built_ ([src/core/rpt-planner.js](../src/core/rpt-planner.js) `plan`, tests in [test/rpt.js](../test/rpt.js))

Input: SP list, ratings, calendar (from §4.2), form. Output: week-by-week plan. CLI: [src/cli/rpt.js](../src/cli/rpt.js).

1. **Capacity** counts whole **takwim weeks**: a week with at least one teaching day = 1 week; a week that is all holiday or all exam (for that form) = 0. Partial weeks are noted in Catatan (e.g. "3/5 hari PdP") but still count as one week.
2. **Syllabus end** = final exam's first week − 1 − revision weeks (default **2**, all forms). Weeks after it until the final exam are *Ulang kaji & pengukuhan*; weeks after the exam are *Pasca peperiksaan*.
3. **Split at PPT**: the first ⌈topics ÷ 2⌉ topics must fit before the mid-year exam; the rest go after it.
4. **Inside each half**: topics with **fixed weeks** take exactly that capacity; other SPs share the rest in proportion to their 1–3 rating. DSKP order is kept.
5. **Map to weeks**: each SP occupies a span of cumulative capacity; it is listed in every week it overlaps by ≥ 0.2 of a week (continuations marked "(samb.)").
6. **Peruntukan SP** (planned): the RPT file ends with an appendix table SP → weeks allocated; the RPH generator paces lessons from it.
7. **Freeze**: once the teacher accepts it, the RPT is stored as a snapshot (week → SPs). Later rating changes do not move it unless the teacher regenerates on purpose. _Freeze step planned; today the output files are the snapshot._

Fails on purpose when the takwim has no exam weeks (the split and revision rules need them), or when fixed weeks exceed a half's capacity.

### 4.4 Timetable resolver — _Built_ ([src/core/timetable.js](../src/core/timetable.js), [parse/jadual.js](../src/core/parse/jadual.js))

- Holds every **timetable version** with its effective-from date (`Berkuat kuasa:` line, from the aSc footer).
- For a date, picks the latest version with effective-from ≤ date; fails if none applies. A timetable change is a new file, never an edit of dates.
- Slots: 30-minute periods, period 0 = 6:30. Each `## Kelas` row is already **one lesson** (consecutive periods merged at conversion; the RPH sample shows 0800–0830 + 0830–0900 as one RPH). The parser fails if Masa doesn't match Waktu.
- aSc "B" marks (after-school duty) sit in `## Bukan kelas` and are not lessons.
- `parseJadual(md, fail) → { berkuatKuasa, slots: [{ hari, waktu: [a, b], masa, subjek, kelas, bilik }] }`; `versionFor(versions, tarikh)`; `minitSeminggu(version, kelas, subjek)`.

### 4.5 Lesson scheduler — _Built_ ([src/core/scheduler.js](../src/core/scheduler.js))

Produces **lesson instances** for one school week: each school day × slot in the resolved timetable → `{ tarikh, hari, minggu, kelas, subjek, waktu, masa, minit, jenis, acara }`.

- `jenis`: **pdp** · **tutorial** (TUTORIAL slot for 4H) · **peperiksaan** (exam day for the class's form). Event days keep their `jenis` and carry the `acara` name as a flag.
- Holidays (per form) and **Batal** entries produce no instances. Slots of classes not in the class file are skipped (the CLI prints one note), so one subject can be planned on its own.
- `lessonsForWeek({ kalendar, versions, kelas, acara, minggu })`. The class file's `Tutorial` column names the jadual code (TUTORIAL) whose slots are tutorials of that class × subject.

### 4.6 RPH generator — _Built_ ([rph-planner.js](../src/core/rph-planner.js), [masa-sp.js](../src/core/masa-sp.js), [rekod-sync.js](../src/core/rekod-sync.js), [kedudukan.js](../src/core/kedudukan.js), [render/rph.js](../src/core/render/rph.js), tests in [test/](../test/))

For each lesson instance, choose the SP(s) from the class's **progress queue**, built from the full rekod history:

1. A **ditunda** or **batal** lesson consumes no time: the next lesson starts where the skipped one would have (its SPs are taught first).
2. Otherwise continue in DSKP order. The first lesson of a class starts at its **Mula** SP from the class file.
3. **Paced by the RPT**: each SP's time for a class = the class's **real minutes in the RPT weeks where the SP sits** — SPs laid in DSKP order over the RPT's capacity weeks using the appendix **Peruntukan SP**, each week contributing its overlap × the class's scheduled PdP minutes that week (`masa-sp.js`). Partial weeks give less time, so an undisturbed class tracks the RPT week by week. Lessons are filled in DSKP order, so light SPs share a lesson and heavy SPs span lessons (written plainly on each lesson; no "bersambung" / "samb." note). No continuation shorter than 15 min (finish it now); no new SP started with < 15 min left. Subjects without an RPT fall back to one SP per lesson with a warning.
4. **Reading the rekod** (minute replay, no marker): for each diajar row in date order, the lesson's minutes go to its listed SPs in order; all but the last are finished; the last takes the leftover and is finished when < 15 min of it remains. Hand edits (e.g. `4.2.7, 4.2.8`) follow the same rule.
5. **Tutorial** lessons repeat all SPs of the latest **diajar** pdp lesson of that class × subject before it (this week if any, else earlier) and do not advance.
6. **Peperiksaan** lessons are generated with no SP and do not advance.
7. New rows are written with Status **diajar** and Kehadiran = class size; the teacher edits only exceptions. An interrupted lesson is **ditunda** (its content is taught again from the start; no partial status).
8. **Past rows** (date ≤ today) are never re-derived. **Future untouched rows** (Status, Kehadiran and Catatan unchanged — to keep a future SP edit, write a note in Catatan) are rebuilt on every run from the current jadual, takwim, acara and queue; edited future rows are kept, flagged "slot tiada" if their slot disappeared.
9. **DSKP finished**: remaining lessons cycle through the topics, one per lesson ("Ulang kaji: 1.0 …"). A class still behind during the RPT's revision weeks keeps getting new SPs.
10. A subject with no DSKP yet (PK / PJ) gets rows without SP and a warning.

**Ahead / behind summary** (CLI only, not on the RPH): reads the frozen `rpt-<subjek>-<tahun>.md` named in the class file. Gap = (minutes of SP content taught − PdP minutes scheduled in teaching weeks so far) ÷ the class's normal weekly minutes; under half a week = ikut RPT, else n weeks ahead / behind. Measured in minutes so a short week (M20) doesn't inflate a small gap. `src/cli/simulasi.js` replays the year week by week to check an undisturbed class stays on the RPT. Warns when remaining SPs exceed remaining timetabled lessons before the syllabus end.

Fills the RPH layout of [sample/2026 - ASK T1 - Google Sheets M34A.pdf](../sample/): guru, subjek, minggu/tarikh/hari, tingkatan, masa, kehadiran, tajuk, SK, SP, objektif, ringkasan aktiviti (Permulaan 5 min / Perkembangan = lesson length − 10 / Penutup 5 min — fixed template per subject from `aktiviti-<subjek>.md`, AI per SP later), refleksi.

**CLI:** `node src/cli/rph.js --kelas sample/kelas-2026.md --minggu 36 [--hari-ini yyyy-mm-dd]`; `node src/cli/simulasi.js --kelas sample/kelas-2026.md` replays the year week by week. For each class × subject: plan any missing weeks up to that week, rebuild future untouched rows, write the rekod, render the affected weeks and print the ahead/behind summary. Output: `output/rph/<tahun>-M<n>-<SUBJEK>.html`, one RPH per A4 page. Core: `planRows`, `syncRekod`, `masaSp`, `ringkasanKelas`, `parseRekod` + `renderRekod` (round-trip without changing edited rows), `parseAktiviti`, `renderRph`.

### 4.7 Progress & dashboard — _Planned_

- Teacher records each lesson's outcome once a week (laptop): **diajar** (held, the default), **ditunda** (postponed) or **batal** (cancelled), plus reflection and attendance. Until the app exists this is done by editing `rekod-<kelas>-<subjek>.md`.
- An SP is **completed** when a lesson covering it was held and not postponed.
- Per class: % of SPs completed, and **weeks ahead/behind the RPT** (compare the last completed SP with the RPT week that plans it; both directions — 4H SK is about 5 weeks ahead).
- **History import**: weeks M12–M35 of 2026 from the existing Google Sheets seed the dashboard. _Needs the Sheets for SK, MAT, PJPK._

### 4.8 Renderers — _Built for RPT_ ([src/core/render/rpt.js](../src/core/render/rpt.js))

- Markdown (for review and git diffs) and self-contained printable HTML (A4 landscape for RPT; one RPH per page). PDF = browser print. No server-side PDF library.
- RPT columns: Minggu, Tarikh, Tajuk, Standard Kandungan, Standard Pembelajaran, Catatan (holidays, exams, partial weeks).

### 4.9 AI assistant — _Manual today_

- **Difficulty draft**: once per subject per year, AI reads the DSKP (SP text + Catatan) and writes `kesukaran-<subject>.md` with a 1–3 rating and a reason per SP. The teacher edits it; the planner only reads the file. Done by the teacher in Claude Code or claude.ai (subscription); the app has no AI call and needs no API key.
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
| Lesson | class + date + first period | Generated; never typed by hand. Stored as a rekod row; never re-derived once written |
| Outcome | lesson | The only data entered every week; same rekod row (Status, Kehadiran, Refleksi/Sebab) |
| Acara | date | Hand-picked event days and known cancellations, per year |

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
| Timetable version by effective-from date | Timetable resolver | Built |
| Postponed / cancelled SP taught first; tutorial repeats last SK SP; exam doesn't advance | RPH generator | Built |
| SP time paced from the RPT's actual weeks; split SPs unmarked (minute replay); hand edits respected | RPH generator | Built |
| RPT file carries a Peruntukan SP appendix (SP → weeks) | RPT renderer | Built |
| Unmarked lesson = diajar | RPH generator | Built |
| Past rekod rows never re-derived | RPH CLI | Built |
| Event days and known cancellations from a hand-picked list | Scheduler | Built |
| Perkembangan = lesson length − 10 min | RPH renderer | Built |
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
1. App generates the coming week's RPHs from the timetable in force, the calendar and each class's progress (until the app: `node src/cli/rph.js --kelas sample/kelas-2026.md --minggu <n>` appends rows to each rekod and writes one HTML per subject).
2. Teacher prints or views them; after teaching, records outcomes, reflection and attendance (until the app: edits only the exception rows in the rekod).
3. Dashboard updates % done and weeks ahead/behind.

## 8. Repository layout

| Path | Contents | Status |
|---|---|---|
| `docs/` | [discussion.md](discussion.md) (decisions), this file | — |
| `sample/` | Source PDFs/DOCX and their checked markdown (DSKP, takwim, timetable, difficulty ratings) | Inputs |
| `src/core/` | Pure core, no I/O: `parse/` (DSKP, takwim, kesukaran, RPT, jadual, kelas, acara, rekod, aktiviti), `calendar.js`, `timetable.js`, `scheduler.js`, `rpt-planner.js`, `rph-planner.js`, `masa-sp.js`, `rekod-sync.js`, `kedudukan.js`, `render/` (RPT, rekod, RPH), `util.js`; `index.js` exports all | Built |
| `src/cli/` | Node CLIs over the core (`rpt.js`, `rph.js`, `simulasi.js`) | Built |
| `src/ui/`, `src/store/` | PWA screens; IndexedDB + Drive sync | Planned |
| `test/` | Tests against real sample data (`rpt.js`) | Built |
| `output/` | Generated RPTs (`.md`, `.html`) | Generated |
| `apps-script/` | Google Sheets stopgap + test | Stopgap |

Conventions: Node 24, CommonJS, no dependencies so far; tests are plain `node <file>.js` with `assert` against real sample data; code comments and generated documents in Bahasa Melayu, docs in English.

## 9. Technology

Decided 2026-10-03.

| Concern | Stack | Status |
|---|---|---|
| Language | Plain JavaScript, CommonJS for now; pure functions in `src/core/`, no dependencies | In use |
| Runtime | Node 24 for CLIs and tests; the browser for the app (same core) | Node in use |
| Tests | `node test/<file>.js` with `node:assert`, against real files in `sample/` | In use |
| Inputs | Markdown files checked by the teacher | In use |
| Output | Markdown + self-contained printable HTML; PDF via browser print | In use |
| App shell | Installable PWA: static site + service worker, offline; no framework until screens need one | Planned |
| Local storage | IndexedDB in the browser (inputs, frozen RPTs, lessons, outcomes) | Planned |
| Sync | One JSON store file in the teacher's Google Drive, last-writer-wins per record with timestamps; no server | Planned |
| AI | Manual: Claude Code / claude.ai on the teacher's subscription writes `kesukaran-*.md`. No Claude API; the app never needs AI to run | In use |
| Stopgap | Google Apps Script in the existing Sheets | In use until RPH is built |

The core moves to ES modules when the browser app starts (a one-time change; browsers load ES modules natively).

## 10. Status and next steps

| Step | State |
|---|---|
| Inputs converted: DSKP ASK T1, DSKP Matematik T4, takwim 2026, KPM 2027 (draft), timetable 5.10.2026 | Done |
| RPT planner with calendar rules, tests, Matematik T4 2026 output | Done |
| Core split into `src/core/` (parsers, calendar engine, planner, renderer); stack decided | Done |
| Review difficulty ratings for Matematik T4 | Teacher |
| Design spec split into 3 sub-projects: RPH pipeline → Progress → PWA app | Decided |
| RPH pipeline spec (formats, components §4.4–4.6) | Done ([spec](superpowers/specs/2026-10-03-rph-pipeline-design.md)) |
| Jadual parser + timetable resolver + lesson scheduler | Done |
| RPH generator (port Apps Script logic, add tutorial/exam rules) + RPH renderer + rekod files | Done (4S Matematik simulated for the whole year) |
| Outcomes, progress, dashboard, history import from Sheets | After RPH |
| PWA shell, storage, sync | After the core is complete |

## 11. Open decisions

- Exact markdown formats for DSKP / Takwim — current samples are the de facto formats; freeze them in the spec. (Jadual frozen 2026-10-03.)
- RPH pipeline: built and simulated for 4S Matematik; see the spec for details.
- 2027: Lampiran C (confirm estimated Cuti Tambahan KPM days) and the school takwim (exam weeks).
- DSKP and a sample RPH week for PJPK; Sheets for SK, MAT, PJPK (history import).
