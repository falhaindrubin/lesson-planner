# Lesson Planner — Discussion Log

Living record of decisions. Updated as we talk; the spec comes later.

_Last updated: 2026-10-02_

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
- **Syllabus deadline** is a per-form setting (try these first, adjust later):

| Form | Syllabus done by | Teaching weeks left (before part-week losses) |
|---|---|---|
| 1–4 | end of **M30** (28 Aug, before Cuti Penggal 2) | Form 4 ≈ 27 (M1–M30 minus M6, M17, M18) · Form 1/2 ≈ 28 (minus M6, M18) |
| 5 | end of **M25** (24 Jul 2026; ~2 weeks before Percubaan SPM) | ≈ 22 (M1–M25 minus M6, M17, M18) — no Form 5 now; likely Matematik T5 in 2027 |

- Deadline = a fixed week per form, editable each year.
- Percubaan SPM is ignored for Form 1–4 but **matters for Form 5** (those weeks are exam weeks).

- **After the deadline until the final exam** (Form 1–4: M31 to PAT/UASA) → default: revision + catch-up buffer for classes that fell behind. Not used by the RPT. _(Default, not confirmed.)_
- **Post-exam weeks (M41–M43)** → excluded from the RPT.
- Meetings (Mesyuarat, Penyeliaan, Kemaskini IdME) are ignored — they don't cancel lessons.
- Hari Sarawak (22 Jul) is a normal school day in Sabah.

## Takwim 2026
Two sources, two layers:

| Layer | Source | Gives | Scope |
|---|---|---|---|
| 1. KPM calendar | `sample/Surat Siaran KPM Bil. 3 2025 - Kalendar Akademik 2026.pdf` (Kumpulan B, incl. Sabah) | Term dates, school breaks, KPM extra festive leave (Cuti Tambahan KPM) | Same for every Kumpulan B school; issued yearly |
| 2. School takwim | `sample/TAKWIM 2026.docx` (SM Lok Yuk) | Sabah state holidays, Cuti Peristiwa, exams, events | This school only |

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

**Rough teaching weeks:** see the syllabus-deadline table under Calendar. Note the SK T4 RPT spreads the syllabus to M40; with an M30 deadline the same content must fit ~27 weeks (4H is already ahead, so it fits in practice).

**Checks against the SK T4 RPT:** RPT plans teaching in M6 (actually a full holiday week) and dates M19 as 2025 (actually 8 Jun 2026). The app would catch both.

### History
- Import M12–M35 from the existing Sheets so the dashboard starts with this year's data.

## Findings from samples (`sample/`)
- Two aSc timetables (10.8.2026, 5.10.2026): slots move between versions; 2C dropped.
- SK T4 RPT 2026 (docx): plans time per SK ("3 MINGGU"), groups Standard Prestasi TP1–2 then TP3–6 — useful calibration for AI difficulty. Has errors the app should prevent (M19 dated 2025, malformed week numbers).
- DSKP PDFs (ASK T1, SK T4) have clean text; same table structure for both.
- ASK Sheet: `data` tab (Tajuk/SK/SP), chapter tabs with MINGGU column, week tabs in fixed blocks.

## Open
- [x] Takwim 2026 file (analysed 2026-10-02)
- [x] Form 5 cutoff: end of M25
- [ ] Yearly rollover: each year brings new classes/subjects (e.g. MAT T5 in 2027) — new year = new KPM calendar + takwim + class list, DSKPs reused
- [ ] M31 → final exam for Form 1–4: revision + catch-up buffer? (current default)
- [x] "X-Break" = school activity → treated as a flagged event day (same rule as other events)
- [ ] DSKP + a sample week for Matematik and PJPK (check same structure)
- [ ] Sheets for SK, MAT, PJPK (for history import)
- [ ] Exact markdown formats for DSKP / Jadual / Takwim (goes in spec)
- [ ] Sync approach and stack (goes in spec)
- [ ] Write the design spec — **on hold until I say go**
