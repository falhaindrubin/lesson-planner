# Lesson Planner — Discussion Log

Living record of decisions. Updated as we talk; the spec comes later. How the parts fit together: [architecture.md](architecture.md).

_Last updated: 2026-10-03_

## Context
- Teacher: Falhaind Rubin, SM Lok Yuk, Kudat, Sabah. Curriculum: KSSM.
- Subjects / classes (timetable 5.10.2026):

| Code | Subject | Class |
|---|---|---|
| SK | Sains Komputer | 4H (4 Harvard), incl. a TUTORIAL slot |
| ASK | Asas Sains Komputer | 1S (1 Sapphire) |
| M3 | Matematik | 4S (4 Stanford) |
| PK / PJ | Pendidikan Kesihatan / Jasmani (PJPK) | 2D (Diamond), 2J (Jade); 2C (Crystal) dropped after 10.8.2026 |

- Current practice: one Google Sheet per subject, one tab per week (M12–M35), RPH typed by copying last week's tab and editing dates, times and SP by hand.
- Pain: timetable changes many times a year; updating every date, day and time is tedious.

## The flow
```
DSKP.md ──► SP list ──(AI rates difficulty)──► RPT per subject ──► RPH per lesson ──► PDF
                                                  ▲                    ▲
                                       Takwim.md + special dates   Jadual.md versions
                                                                   + actual progress
```

## Decisions

### Product
| Topic | Decision |
|---|---|
| Form | Web app, installable (PWA) |
| Users | Only me (single user, one account) |
| Devices | Laptop, desktop PC, tablet |
| Connectivity | Works offline, syncs when online |
| Step 1 (stopgap) | `apps-script/Code.gs` Apps Script "RPH > Jana minggu seterusnya" for the current Sheets (built, tested on ASK data) |

### Inputs (all markdown, converted by me)
| File | From | Notes |
|---|---|---|
| `DSKP.md` per subject | KPM DSKP PDF | Only the SK / SP / Standard Prestasi tables matter (~6 of ~50 pages). SP codes like `2.1.3` identify each SP. |
| `Jadual.md` per timetable version | aSc printout (school) | Footer date = effective-from date. PK/PJ fixed per slot. Periods are 30 min, period 0 = 6:30. |
| `Takwim.md` per year | KPM Kalendar Akademik (terms, KPM leave) + school takwim (state holidays, exams, events) | Two layers. See **Takwim 2026** below. |

### RPT (yearly plan)
- I make my own; panitia doesn't provide one. App generates it, one per **subject** (all classes of that subject share it).
- SPs spread over teaching weeks by **AI-rated difficulty**, avoiding takwim holidays, exams and special dates. I can override ratings.
- AI is used once per subject per year (only step needing internet).
- Once made, the RPT is **fixed**. It is the yardstick, not the driver.
- Output: a clear table (Minggu, date range, Tajuk, SK, SP, Catatan) as PDF. No school template required.

### RPH (lesson plan)
- Generated per lesson from the timetable version in force on that date + the class's **actual** progress (not the RPT).
- Postponed lesson (PdP ditunda) → its SP is taught first next time.
- TUTORIAL slot → own RPH, **repeats** that week's SP, doesn't advance.
- A lesson may cover more than one SP (e.g. 4.2.7 + 4.2.8).
- Activity text (Permulaan / Perkembangan / Penutup): fixed template per subject now; AI-written per SP later.
- Reflection and attendance: filled once a week on laptop.
- Output: PDF, one RPH per page, same layout as current Sheet RPH (see `sample/2026 - ASK T1 - Google Sheets M34A.pdf`).

### Dashboard
- SP **completed** = lesson held and not postponed.
- Shows % of SPs done per class/subject **and** weeks ahead/behind the RPT (both directions — 4H SK is really ~5 weeks ahead).

### Calendar
- Takwim file imported once per year, plus manual cancel for surprises (e.g. Ujian SEGAK).
- **Holidays** (cuti, cuti peristiwa, public holidays on weekdays) → no lessons, no RPH.
- **School events** on weekdays → RPH flagged "event day"; I decide whether to cancel.
- **Exams** → RPH still generated, marked "Peperiksaan", SP doesn't advance. Applies **per form** (PPT T4–5 in M17 doesn't touch Form 1/2).
- **Syllabus deadline** (decided 2026-10-02, replaces the earlier fixed M30 / M25): every form teaches up to its **final exam minus 2 revision weeks**. The final exam is the form's last exam block in the takwim: PAT (Form 4), UASA (Form 1–3), Percubaan SPM (Form 5). Computed from the takwim each year, so no per-form week to maintain.

| Form | Final exam (2026) | Syllabus done by | Revision |
|---|---|---|---|
| 1–3 | UASA M38 | end of **M35** | M36–M37 |
| 4 | PAT T4 M37–M38 | end of **M34** | M35–M36 |
| 5 | Percubaan SPM M28 | end of **M25** | M26–M27 |

- **Revision before the final exam is a must** (confirmed 2026-10-02): **2 weeks for every form** for now (`--ulang-kaji <n>` to change; `--tamat <week>` to fix the end week by hand).
- Percubaan SPM is ignored for Form 1–4 but **matters for Form 5** (it is Form 5's final exam).
- **Half the topics must be done before PPT** (confirmed 2026-10-02): first ⌈topics ÷ 2⌉ topics fit before the mid-year exam, the rest after it. Counted by topic, not SP.
- **Fixed weeks per topic** can be set in the difficulty file; Matematik T4 topic 10.0 = **2 weeks** (confirmed).
- **Post-exam weeks (M41–M43)** → excluded from the RPT.
- Meetings (Mesyuarat, Penyeliaan, Kemaskini IdME) are ignored — they don't cancel lessons.
- Hari Sarawak (22 Jul) is a normal school day in Sabah.

## Takwim 2026
Two sources, two layers:

| Layer | Source | Gives | Scope |
|---|---|---|---|
| 1. KPM calendar | `sample/Surat Siaran KPM Bil. 3 2025 - Kalendar Akademik 2026.pdf` (Kumpulan B, incl. Sabah) | Term dates, school breaks, KPM extra festive leave (Cuti Tambahan KPM) | Same for every Kumpulan B school; issued yearly |
| 2. School takwim | `sample/takwim-smly-2026.docx` (SM Lok Yuk) | Sabah state holidays, Cuti Peristiwa, exams, events | This school only |

The app should take layer 1 first, then apply layer 2 on top.

**KPM figures (Kumpulan B):** 202 school days, 43 weeks (Penggal 1: 18 weeks / 82 days; Penggal 2: 25 weeks / 120 days). KPM day counts subtract Cuti Tambahan KPM but **not** state holidays (e.g. Hari Lahir TYT Sabah 30 Mar, Good Friday 3 Apr are still counted), so layer 2 is needed for real teaching days.

**Cross-check:** school takwim matches the KPM calendar on every term date and every Cuti Tambahan KPM day (16, 19–20 Feb; 19–20 Mar; 9–10 Nov). No conflicts.

School week Mon–Fri. M1 = 12 Jan, M43 = 30 Nov. Week numbers continue across breaks.

| Break | Dates |
|---|---|
| Cuti Penggal 1 | 21–29 Mar (between M10 and M11) |
| Cuti Pertengahan Tahun | 23 May – 7 Jun (between M18 and M19) |
| Cuti Penggal 2 | 29 Aug – 6 Sep (between M30 and M31) |
| Cuti Akhir Tahun | from 5 Dec (after M43) |

**Weekday holidays inside school weeks**

| Week | Dates | Reason |
|---|---|---|
| M6 | 16–20 Feb (whole week) | Tahun Baharu Cina + Cuti Tambahan KPM |
| M10 | 19–20 Mar | Cuti Tambahan KPM |
| M11 | 30 Mar | Hari Lahir TYT Sabah |
| M11 | 2–3 Apr | Cuti Peristiwa 1, Good Friday |
| M15 | 1 May | Hari Pekerja |
| M20 | 16–17 Jun | Cuti Peristiwa 2, Maal Hijrah |
| M30 | 24–25 Aug | Cuti Peristiwa 3, Maulidur Rasul |
| M32 | 16 Sep | Hari Malaysia |
| M39 | 2 Nov | Cuti Peristiwa 4 (All Souls' Day) |
| M40 | 9–10 Nov | Cuti Tambahan KPM |

**Exams affecting my classes**

| Week | Exam | Affects |
|---|---|---|
| M17 | PPT T4–5 | 4H, 4S |
| M18 | PPT T1–5 | all |
| M37 | PAT T4 | 4H, 4S |
| M38 | PAT T4 / UASA (T1–3) | all |

(UBBM/UBBI and Percubaan SPM are other forms/subjects — ignored.)

**Weekday events to flag** (may cancel lessons): Sukaneka 14 Jan · Sambutan TBC 13 Feb · Sambutan Hari Raya 10 Apr · Kejohanan Olahraga 16–17 Apr · Karnival Koko/STEM 29 Apr · Hari Guru & Kaamatan 8 May · Merentas Desa 10 Jun · Lok Yuk Day 12 Jun · Dirgahayu MK / Festival Bot Naga 18–19 Jun · Perkhemahan 3 Jul · Penangguhan Bulan Kebangsaan 15 Sep · Zai Jian Jie Jie 18 Sep · Mid-Autumn 25 Sep · Majlis Graduasi 2 Oct · Annual Dinner 3 Dec · **X-Break** (school activity, Mondays): 19 Jan, 2 Feb, 6 Apr, 4 May, 8 Jun, 6 Jul, 3 Aug, 7 Sep, 12 Oct, 16 Nov.

**Rough teaching weeks:** see the syllabus-deadline table under Calendar. Note the SK T4 RPT spreads the syllabus to M40, past PAT; with the M34 deadline the same content must fit 31 takwim weeks (4H is already ahead, so it fits in practice).

**Checks against the SK T4 RPT:** RPT plans teaching in M6 (actually a full holiday week) and dates M19 as 2025 (actually 8 Jun 2026). The app would catch both.

### RPT prototype (now `src/core/`, 2026-10-02)
First piece of the app: `node src/cli/rpt.js` builds an RPT from DSKP.md + Takwim.md + a difficulty file. Tried on **Matematik T4 2026** (`output/rpt-mat-t4-2026.md` / `.html`).
- **Difficulty** = relative teaching time per SP, 1 (light) / 2 / 3 (heavy), one file per subject (`sample/kesukaran-mat-t4.md`). AI drafts it with a reason per SP; I override by editing the number.
- **Capacity** = whole takwim weeks (decided 2026-10-02, replaces teaching days ÷ 5): any week with at least one teaching day counts as 1; full holiday / exam weeks count 0. Form 4 2026 = **31 weeks** (to M34).
- SPs keep DSKP order. Each SP gets capacity in proportion to its difficulty; an SP spilling into the next week is listed there too, marked "(samb.)", if it takes at least 0.2 of that week.
- After the deadline: "Ulang kaji & pengukuhan" until the form's final exam, then "Pasca peperiksaan".
- Takwim rule: any weekday entry in **Cuti / Perayaan** closes school, except Hari Sarawak.
- Output: markdown + printable HTML (A4 landscape; print to PDF from the browser).
- Matematik T4 2026 (`output/rpt-mat-t4-2026.*`): topics 1.0–5.0 by M16, PPT M17–M18, topics 6.0–10.0 in M19–M34, revision M35–M36, PAT M37.

### Stack and code layout (2026-10-03)
- Stack confirmed: plain JavaScript, no dependencies, Node 24 for CLI/tests; app = static PWA + service worker, IndexedDB, sync via one JSON file in Google Drive (no server). Details: architecture §9.
- AI stays manual (Claude Code / claude.ai on my subscription). No Claude API: AI is needed once per subject per year and only writes a file I review.
- Code moved from `rpt/` to `src/core/` to match the architecture: parsers, **calendar engine split out** (`calendar.js`), RPT planner, renderer; CLI in `src/cli/`, tests in `test/`. RPT output unchanged (checked against the previous output). Difficulty files now live in `sample/` with the other inputs.

### Design spec: split, RPH pipeline first (2026-10-03)
I said go on the spec. Split into three sub-projects, each with its own spec → plan → build:
1. **RPH pipeline** (core + CLI): Jadual parser, timetable resolver, lesson scheduler, RPH generator, RPH renderer — **first**, replaces the Apps Script stopgap soonest.
2. **Progress**: dashboard numbers, history import from Sheets.
3. **PWA app**: screens, IndexedDB, Drive sync, RPT freeze.

Decisions for the RPH pipeline:

| Topic | Decision |
|---|---|
| Recording outcomes (before the app) | One **rekod file per class × subject** (`rekod-<kelas>-<subjek>.md`), one row per lesson: Minggu, Tarikh, Hari, Waktu, Jenis, SP, Status, Kehadiran, Refleksi/Sebab. The CLI appends the coming week's rows; I edit them after teaching. The PWA later imports the same rows. |
| Rekod holds every lesson | Past rows are never re-derived. A later change to DSKP, timetable or takwim cannot rewrite past RPHs (RPH follows what really happened). Rejected: rekod with exceptions only (re-derives the past), JSON state file (not hand-editable). |
| Unmarked lessons | New rows are written as **diajar** with Kehadiran = class size (like the stopgap ticking "Objektif tercapai"). I only change exceptions to **ditunda** or **batal**. |
| SPs per lesson | ~~One SP per lesson~~ — **replaced 2026-10-03 by pacing from the RPT** (see "Pacing round" below). I can still override any row by hand. |
| Tutorial (4H) | Repeats the SP(s) of the **latest SK lesson before it** (Tuesday's, with the current timetable); if none that week, the most recent earlier one. Doesn't advance. |
| Activity durations | Permulaan 5 min, Penutup 5 min, Perkembangan = lesson length − 10 (60-min lesson → 5 / 50 / 5). Template per subject in `aktiviti-<subjek>.md`. |
| Event days | **Hand-picked list** in `acara-<tahun>.md` (Tarikh, Acara, Tingkatan — blank = all), not detected from takwim columns (too noisy: meetings, Ting 1 programmes). Same file has a **Batal** table for cancellations known ahead (e.g. Ujian SEGAK). |
| Class list | `kelas-<tahun>.md`: one row per class × subject (Kelas, Nama penuh, Tingkatan, Subjek, DSKP, Aktiviti, Bil. murid), teacher name, and each class's starting SP (**Mula**). |
| Output | One HTML file **per subject per week** (`output/rph/<tahun>-M<n>-<SUBJEK>.html`), one RPH per A4 page, same labels as the Sheets RPH. |
| PK / PJ | Scheduled as normal; until the PJPK DSKP is added their rows get no SP and the CLI warns. |
| Jadual format | `sample/jwg-20261002.md` frozen as the format: effective date from `Berkuat kuasa:`, `## Kelas` table parsed, `## Bukan kelas` ignored. |

Grilling round (2026-10-03):

| Topic | Decision |
|---|---|
| Interrupted lesson | Lesson cut short = **ditunda**: the whole SP is re-taught next lesson (next class or next week). No partial / "sambung" status. RPT stays fixed. |
| Ahead / behind (before the dashboard) | **CLI summary only**, one line per class after each run (e.g. `4S M3: SP 6.2.4 · RPT M34 · 2 minggu ke depan`). Nothing printed on the RPH. |
| How the gap is counted | **Teaching weeks only** (weeks with RPT capacity for that form); exam and holiday weeks don't count. |
| Reference point | The class's **next SP** and its span in the RPT: inside the span = ikut RPT (0); before = ahead; after = behind. |
| RPT source | Parse the generated **`rpt-<subjek>-<tahun>.md`** — it is the frozen snapshot. Editing kesukaran doesn't move it unless I regenerate on purpose. Class file names each class's RPT file; none → "tiada RPT". |
| Behind near the deadline | Warn only when remaining SPs > remaining timetabled lessons before the syllabus end ("pertimbang gabung SP"). The planner never merges by itself. |
| DSKP finished early | **Revision cycle by topic**: one topic per lesson, in order, "Ulang kaji: 1.0 …" with its SK/SPs. |
| In RPT revision weeks but still behind | RPH keeps teaching new SPs (RPH follows reality); shown as behind. |
| Late outcome edits / timetable or acara changes | Every run **re-plans future untouched rows** (date after today, still exactly as generated) from the current jadual, takwim, acara and queue. Edited future rows are kept; if their slot no longer exists they are flagged "slot tiada". Past rows never change. **`--semula` dropped.** `--hari-ini` overrides today. |
| Tutorial after a ditunda SK lesson | Repeat the **latest diajar** SK SP, not the postponed one. |

Pacing round (2026-10-03). My rules: the generated RPT is fixed; low-level SPs can be combined; RPHs follow the RPT's topic order; a skipped lesson is repeated in the next session; RPT stays on track, RPH shows real progress; DSKP markdown provided by me (AI-converted), difficulty assigned by AI and reviewed.

| Topic | Decision |
|---|---|
| How many SPs per lesson | **Paced by difficulty, in minutes**: light SPs share a lesson, heavy SPs span lessons. |
| Scale | **Scaled to fit the RPT**, not fixed minutes. Fixed 30 / 60 / 120 min would finish Matematik T4 by ~M24 (4,080 min ÷ 210 min/week ≈ 19½ weeks) while the RPT runs to M34. |
| SP time source | The RPT file gets an appendix **"Peruntukan SP"** (SP → weeks, e.g. 6.2.1 = 0.8). SP minutes for a class = weeks × the class's timetabled minutes per week (4S M3 = 210). So the 1 : 2 : 3 ratio, the PPT split and fixed topic weeks all come from the frozen RPT, and an undisturbed class tracks the RPT exactly. Needs the RPT generator change + regenerating `rpt-mat-t4-2026`. |
| Split SP | **No "bersambung" / "samb." on the lesson** (my rule): a split SP is written plainly on each lesson it spans, in the RPH and the rekod. No continuation of < 15 min (finish it now); no new SP started with < 15 min left in the lesson. |
| Ditunda / batal | Consumes no time: the next lesson starts where the skipped one would have. |
| Reading the rekod back | **Minute replay**, no marker: for each diajar row in date order, the lesson's minutes go to its listed SPs in order; all but the last are finished; the last takes the leftover and is finished when < 15 min of it remains. Hand edits follow the same rule. |
| Tutorial | Repeats all SPs of the latest diajar SK lesson. |
| No RPT yet (ASK, SK today) | Fallback one SP per lesson + warning "tiada RPT". |
| DSKP + difficulty | DSKP markdown from me (AI-converted); ratings stay in a **separate** `kesukaran-<subjek>.md` drafted by AI, reviewed by me — DSKP stays a clean copy of KPM text. |

Built (2026-10-03): `node src/cli/rph.js --kelas sample/kelas-2026.md --minggu <n>` writes the rekod and one RPH HTML per subject and week; `node src/cli/simulasi.js --kelas sample/kelas-2026.md` replays the year. Simulation of 4S Matematik is in `output/simulasi-4S-M3/` (ikut RPT M1–M34). For real use: rekod in `rekod/2026/`, HTML in `output/rph/`. Clarifications found while planning: with no RPT every SP listed in a diajar row counts as finished; files are written only when every class succeeded; SP time follows the RPT's actual weeks; classes not in the class file are skipped; to keep a future SP edit, write a note in Catatan.

Simulation round (2026-10-03). My rules: simulate the whole year as if it were early in the year; give me `kelas-2026.md`; focus on **Matematik T4, 4 Stanford** only.

| Topic | Decision |
|---|---|
| Class file | `sample/kelas-2026.md` = **4S Matematik only**, Bil. murid **32**, Mula **1.1.1**. Other classes are not planned; their timetable slots are skipped with one note. The 7-class list is kept as test data (`test/data/kelas-semua.md`). |
| Timetable for Jan–Oct | Only the 5.10.2026 timetable is converted, so `sample/jwg-20260101-simulasi.md` is a labelled copy of it, valid from 1 Jan. The real one takes over on 5 Oct. |
| Simulation output | `output/simulasi-4S-M3/`: full-year rekod, 42 weekly RPH files (M6 is a full holiday), `ringkasan.txt` (one summary line per week). Re-run with `node src/cli/simulasi.js --kelas sample/kelas-2026.md`. |
| Drift found | With SP time = weeks × 210 min, an undisturbed 4S fell **2 weeks behind** by M31 and finished in M36, because the RPT counts partial holiday weeks (M11, M20, M30, M32) as whole weeks. |
| Fix (my choice) | **SP time follows the RPT's actual weeks**: each SP gets 4S's real minutes in the RPT weeks where it sits (M20 has only 60 min). Now `ikut RPT` every week M1–M34, DSKP done end of M34, revision M35–M36, PAT M37. RPT file unchanged. |
| Ahead / behind | Measured in **minutes** (content taught − PdP minutes so far) and shown in weeks of 210 min, so a short week (M20) doesn't turn 10 minutes into "1 week ahead". Test: all three M10 lessons ditunda → `1 minggu ke belakang` from M11, "pertimbang gabung SP" warning, DSKP done in M35. |

### Web app — first slice (2026-10-03; spec: [web-app-weekly-loop-design.md](superpowers/specs/2026-10-03-web-app-weekly-loop-design.md))
| Topic | Decision |
|---|---|
| Next sub-project | The web app (PWA), before Progress |
| First slice | Weekly RPH loop: pick week → view/print RPH → mark diajar/ditunda/batal + reason → ahead/behind |
| Inputs | Pick `sample/` and `output/` folders once; copied into the browser; markdown stays the source of truth |
| Hosting | GitHub Pages (needs a public repo, or a paid plan) — see "Publishing" below |
| Rekod | In the browser, with export/import of `rekod-*.md`; Drive sync later |
| Main device | Laptop; tablet for viewing |
| Screen layout | Weekly screen = layout A: lesson cards with diajar/ditunda/batal on the left, live RPH preview on the right, Print below (2026-10-03, later session) |
| Language | **Everything in the app UI is English** (buttons, labels, statuses: taught / postponed / cancelled, messages). RPH and RPT content stay in Malay. Rekod files keep `diajar`/`ditunda`/`batal`; the app maps them (same session) |
| Recalculation | Live: every mark updates the coming weeks and ahead/behind immediately (same session) |
| Re-picked file vs browser | **The file wins, with a warning**: the app lists the lessons that differ (e.g. "3 lessons differ: M5 Mon, …") and asks to confirm before replacing (same session) |
| Code sharing | **Approach 1**: core becomes ES modules (CLI too, `"type": "module"`); the CLI's week orchestration moves into one pure core function used by both CLI and app; no build step, no framework; ahead/behind returned as numbers, each shell words it (CLI Malay, app English) (same session) |
| RPH pages | **Each lesson starts on a new A4 page.** A lesson too long for one page continues on the next page(s); the next lesson still starts on a fresh page. A table row is not split across pages unless it is taller than a page. Same in the app preview and in print (same session) |
| Code language | **All development terms in English**: files, functions, variables, comments. Existing Malay core and CLI are renamed during the ES-module conversion (e.g. `kedudukan.js` → `position.js`); tests prove behaviour unchanged. Markdown formats and Malay content unchanged; domain words (RPH, RPT, SP, DSKP, takwim, rekod, diajar/ditunda/batal) kept (same session) |
| CLI language | CLI messages (warnings, position line, errors) switch to **English**. Only RPT and RPH content stays Malay (same session) |
| Rekod file language | Rekod files **stay Malay** (headers, `diajar`/`ditunda`/`batal`, file name `rekod-*.md`); the app shows them in English. No conversion needed (same session) |
| Marking reasons | Postponed and Cancelled **require a reason**, typed by hand (free text, no preset list), saved in Catatan. Taught: note optional (same session) |
| RPH output in the app | **Print only** (or Save as PDF from the print dialog); the app writes no `output/*.html` files (same session) |
| Weekly screen detail | Mockup approved for now (revisit later). **"Open in new tab"** button shows the week's RPH pages in their own browser tab (print from there too); the side preview stays (same session) |
| Dashboard in first slice | **Yes, a simple Classes dashboard**: per class current SP, % DSKP done, weeks ahead/behind, RPT week of that SP, "won't fit before RPT ends" warning. Charts and Sheets history import stay in sub-project 2 (same session) |
| Personal data | Teacher name typed into the app's **Profile** (NAMA GURU); `Guru:` in the class file becomes optional. School files are picked locally and stay in the browser (same session) |
| Publishing | **Separate public repo `rph-mate`** holding only `app/` + `src/core/`, filled by `tools/release.js`; this repo stays private (its files and history hold personal data). Chosen over rewriting history or Cloudflare/Netlify (same session) |
| App name | **RPH Mate**, used **only in production** (the `rph-mate` repo and deployed app). Development stays "Lesson Planner"; the local app shows "Lesson Planner (dev)" (same session) |
| CLI | **Kept for now**: `rph.js` as a fallback while the app is new (drop after a few real weeks), `rpt.js` until the app makes RPTs, `simulate.js` for checks. Never published to `rph-mate` (same session) |
| Responsiveness | **Rule W13**: cards, badges and dashboard update in under 100 ms after a mark; the RPH preview redraws afterwards; nothing visual may slow a click. Measured ~30 ms planning per week in Node (same session) |

## Takwim 2027 (draft, layer 1 only)
`sample/kalendar-akademik-2027-kpm.pdf` is a one-page scan (Lampiran B only, no text layer). Converted to `sample/takwim-kpm-2027.md` (same format as the 2026 takwim; school columns empty).

- **44 weeks** (M1 = 4 Jan … M44 = 29 Nov), **203 KPM days** (Penggal 1: 19 weeks / 84 days; Penggal 2: 25 weeks / 119 days). School starts 8 days earlier than 2026.
- Breaks: Cuti Penggal 1 **6–14 Mar** (covers Hari Raya Aidilfitri 10–11 Mar) · Pertengahan 22 May – 6 Jun · Penggal 2 28 Aug – 5 Sep · Akhir from 4 Dec.
- KPM counts subtract national holidays + Cuti Tambahan KPM (checked against 2026). The 18 missing weekdays are filled as: national holidays (Haji 17 May, Wesak 20 May, Agong 7 Jun, Hari Malaysia 16 Sep, Deepavali 28 Oct) + **estimates** (5 Feb, 8–12 Feb, 18–19 + 21 May, 16 Aug, 27 + 29 Oct). Every Lampiran B row count matches.
- Likely full holiday weeks: **M6** (CNY) and **M19** (Haji + Wesak, last week before the mid-year break).
- Sabah state holidays in school weeks: Good Friday 26 Mar (M11), TYT 30 Mar (M12). Teaching days = 201.
- Still needed: Lampiran C of the 2027 circular (confirms the estimates) and the SM Lok Yuk takwim 2027 (exams, events, Cuti Peristiwa). Without exam weeks the RPT generator stops (PPT / revision rules need them).

### History
- Import M12–M35 from the existing Sheets so the dashboard starts with this year's data.

## Findings from samples (`sample/`)
- Two aSc timetables (10.8.2026, 5.10.2026): slots move between versions; 2C dropped.
- aSc "B" mark (e.g. Fri period 9) = after-school duty note, not a lesson → no RPH.
- SK T4 RPT 2026 (docx): plans time per SK ("3 MINGGU"), groups Standard Prestasi TP1–2 then TP3–6 — useful calibration for AI difficulty. Has errors the app should prevent (M19 dated 2025, malformed week numbers).
- DSKP PDFs (ASK T1, SK T4) have clean text; same table structure for both.
- DSKP Matematik T4 & T5: three columns (SK, SP, Catatan); Standard Prestasi given **per topic**; math symbols are missing from the PDF text layer (read from the page image). Form 4 = 10 topics, 26 SK, 70 SP. Two conversions exist: `sample/dskp-mat-t4.md` (Form 4 only, same heading levels as ASK; used by the RPT generator) and `sample/dskp-mat-t4-t5.md` (Form 4 + 5 with Catatan, 127 SP; for Matematik T5 in 2027 — headings are one level deeper, so the parser needs a small change before using it).
- Takwim: Hari Pekerja (Fri 1 May, M15) is a weekday holiday.
- ASK Sheet: `data` tab (Tajuk/SK/SP), chapter tabs with MINGGU column, week tabs in fixed blocks.

## Open
- [x] Takwim 2026 file (analysed 2026-10-02)
- [x] Form 5 cutoff: end of M25 (now derived: Percubaan SPM M28 minus 2 revision weeks)
- [ ] Yearly rollover: each year brings new classes/subjects (e.g. MAT T5 in 2027) — new year = new KPM calendar + takwim + class list, DSKPs reused. 2027 KPM layer drafted (`sample/takwim-kpm-2027.md`)
- [x] M31 → final exam for Form 1–4: revision before PAT is a must (2 weeks in the full-year RPT)
- [x] Default RPT end: final exam minus 2 revision weeks, every form
- [x] "X-Break" = school activity → treated as a flagged event day (same rule as other events)
- [ ] DSKP + a sample week for Matematik and PJPK (check same structure) — Matematik T4 DSKP done (`sample/dskp-mat-t4.md`); TP is per topic, not per SK
- [ ] Review AI difficulty ratings for Matematik T4 (`sample/kesukaran-mat-t4.md`)
- [ ] Sheets for SK, MAT, PJPK (for history import)
- [ ] Exact markdown formats for DSKP / Jadual / Takwim (goes in spec) — Jadual frozen 2026-10-03; new files (kelas, acara, aktiviti, rekod) defined for the RPH pipeline
- [x] Sync approach and stack — decided 2026-10-03 (see "Stack and code layout")
- [x] Write the design spec — RPH pipeline spec done: [docs/superpowers/specs/2026-10-03-rph-pipeline-design.md](superpowers/specs/2026-10-03-rph-pipeline-design.md). Progress and PWA specs still to come.
- [x] Confirm RPH pipeline components — built and tested (`Tutorial` and `RPT` columns in the class file; `--semula` dropped)
