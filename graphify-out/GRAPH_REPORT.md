# Graph Report - lesson-planner  (2026-10-03)

## Corpus Check
- 66 files · ~58,250 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 612 nodes · 966 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 162 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Calendar, scheduler and summary code
- DSKP Matematik T4
- RPH layout (ASK sample)
- Parsers and DSKP T4+T5
- Tests: rekod-sync
- Tests: rph-cli
- Timetable (jadual) 2026
- CLI: rph.js and simulasi.js
- Tests: rph-planner
- Tests: kedudukan
- Tests: rpt
- Input files and parsers
- Architecture principles and stack
- Rekod and progress rules
- Tests: scheduler
- Scheduler and calendar concepts
- Tests: rph-render
- RPT output and renderer
- KPM academic calendars
- Tests: kelas-acara
- Pacing and summary algorithms
- Tests: rekod
- Apps Script stopgap test
- Architecture overview and data model
- Tests: jadual
- Pacing rules (15-minute, ditunda)
- Simulation round and drift fix
- RPT planner rules
- PWA and offline-first
- Deterministic engine and AI
- parseAktiviti
- renderRekod
- Design spec (on hold)

## God Nodes (most connected - your core abstractions)
1. `Architecture` - 26 edges
2. `DSKP Matematik Tingkatan 4 dan 5` - 24 edges
3. `Kesukaran SP Matematik T4` - 22 edges
4. `RPH generator` - 19 edges
5. `cells()` - 15 edges
6. `DSKP Matematik Tingkatan 4` - 14 edges
7. `RPT planner` - 14 edges
8. `Input parsers` - 14 edges
9. `DSKP KSSM Matematik Tingkatan 4 dan 5` - 14 edges
10. `Calendar engine` - 13 edges

## Surprising Connections (you probably didn't know these)
- `RPT planner` --references--> `plan()`  [EXTRACTED]
  docs/architecture.md → src/core/rpt-planner.js
- `Input parsers` --references--> `parseDskp()`  [EXTRACTED]
  docs/architecture.md → src/core/parse/dskp.js
- `DSKP Matematik T4+T5 conversion (127 SP)` --conceptually_related_to--> `parseDskp()`  [INFERRED]
  docs/discussion.md → src/core/parse/dskp.js
- `Input parsers` --references--> `parseKesukaran()`  [EXTRACTED]
  docs/architecture.md → src/core/parse/kesukaran.js
- `Input parsers` --references--> `parseTakwim()`  [EXTRACTED]
  docs/architecture.md → src/core/parse/takwim.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Matematik Diskret topics in T4** — sample_dskp_mat_t4_tajuk_3_0, sample_dskp_mat_t4_tajuk_4_0, sample_dskp_mat_t4_tajuk_5_0, sample_dskp_mat_t4_t5_bidang_matematik_diskret [EXTRACTED 1.00]
- **Computer science classes in Makmal Komputer** — sample_jwg_20261002_kelas_1s_ask, sample_jwg_20261002_kelas_4h_sains_komputer, sample_jwg_20261002_kelas_4h_tutorial, sample_jwg_20261002_makmal_komputer [EXTRACTED 1.00]
- **RPH generation inputs (DSKP + timetable + calendar -> RPH)** — sample_2026___ask_t1___google_sheets_m34a, sample_dskp_ask_t1, sample_falhaind_rubin___jwg___20260810, sample_surat_siaran_kpm_bil__3_2025___kalendar_akademik_2026 [INFERRED 0.85]
- **RPT Matematik T4 generator inputs** — sample_dskp_mat_t4_dskp_matematik_t4, sample_kesukaran_mat_t4_kesukaran_sp_mat_t4, sample_kesukaran_mat_t4_minggu_tetap_ikut_tajuk, sample_takwim_smly_2026_takwim_sm_lok_yuk_2026, sample_takwim_kpm_2027_takwim_kpm_2027, sample_jwg_20261002_jadual_waktu_guru [INFERRED 0.85]
- **KSSM DSKP documents sharing SK/SP/Standard Prestasi structure** — sample_dskp_ask_t1, sample_copy_of_dskp_sains_komputer_tingkatan_4, sample_dskp_mat_t4_t5, sample_dskp_ask_t1_sk_sp_sp_structure [INFERRED 0.95]
- **RPH pacing pipeline** — docs_architecture_lesson_scheduler, docs_architecture_rph_generator, docs_architecture_pacing_rule, docs_architecture_peruntukan_sp, docs_architecture_rekod_sync [EXTRACTED 1.00]
- **RPT planning rules** — docs_architecture_capacity_rule, docs_architecture_syllabus_end_rule, docs_architecture_ppt_split_rule, docs_architecture_fixed_weeks_rule, docs_architecture_rpt_planner [EXTRACTED 1.00]
- **Inputs for weekly RPH** — docs_architecture_jadual, docs_architecture_takwim, docs_architecture_kelas_file, docs_architecture_acara_file, docs_architecture_rekod [EXTRACTED 1.00]

## Communities (34 total, 4 thin omitted)

### Community 0 - "Calendar, scheduler and summary code"
Cohesion: 0.08
Nodes (39): c_users_falhaind_rubin_projects_lesson_planner_src_core_calendar_dayclass, c_users_falhaind_rubin_projects_lesson_planner_src_core_calendar_weekfor, kedudukan(), { lessonsForWeek }, muat(), { planRows }, ringkasanKelas(), teksKedudukan() (+31 more)

### Community 1 - "DSKP Matematik T4"
Cohesion: 0.08
Nodes (49): DSKP Matematik Tingkatan 4, Mat T4 SK 10.1 Perancangan dan Pengurusan Kewangan, Mat T4 SK 1.1 Fungsi dan Persamaan Kuadratik, Mat T4 SK 2.1 Asas Nombor, Mat T4 SK 3.1 Pernyataan, Mat T4 SK 3.2 Hujah, Mat T4 SK 4.1 Persilangan Set, Mat T4 SK 4.2 Kesatuan Set (+41 more)

### Community 2 - "RPH layout (ASK sample)"
Cohesion: 0.06
Nodes (46): RPH ASK T1 M34 (Google Sheets printout), Kelas 1 Sapphire, Objektif Pembelajaran (copied from SP), Refleksi template, Ringkasan Aktiviti (Permulaan/Perkembangan/Penutup), RPH field structure, DSKP KSSM Sains Komputer Tingkatan 4, SK T4 SK 1.2 Algoritma (+38 more)

### Community 3 - "Parsers and DSKP T4+T5"
Cohesion: 0.09
Nodes (31): DSKP Matematik T4+T5 conversion (127 SP), { cells }, parseAcara(), { cells }, parseDskp(), { cells, HARI_BEKERJA, waktuRange, masaWaktu }, parseJadual(), { cells } (+23 more)

### Community 4 - "Tests: rekod-sync"
Cohesion: 0.06
Nodes (31): acara, ask, assert, baharu, cutiRow, fs, ganti, kalendar (+23 more)

### Community 5 - "Tests: rph-cli"
Cohesion: 0.07
Nodes (29): ref_os, akt, assert, cli, fs, htmlPk, kalendar, kelasSim (+21 more)

### Community 6 - "Timetable (jadual) 2026"
Cohesion: 0.11
Nodes (27): Guru bertugas (B) Jumaat - bukan PdP, tiada RPH, Jadual Waktu Guru Falhaind Rubin (berkuat kuasa 2026-10-05), 1S Asas Sains Komputer (ASK), 2J/2D Pendidikan Kesihatan/Jasmani, 4H Sains Komputer (SK), 4H Tutorial Sains Komputer, Bilik M.K (Makmal Komputer?), SM Lok Yuk, Kudat, Sabah (+19 more)

### Community 7 - "CLI: rph.js and simulasi.js"
Cohesion: 0.10
Nodes (18): ref_child_process, ref_fs, ref_path, C, fs, hariIniTempatan(), main(), path (+10 more)

### Community 8 - "Tests: rph-planner"
Cohesion: 0.08
Nodes (19): a, assert, bt, ex, g, m, masaSp, n15 (+11 more)

### Community 9 - "Tests: kedudukan"
Cohesion: 0.10
Nodes (22): acara, ask, assert, at(), base, fs, jumlah, K (+14 more)

### Community 10 - "Tests: rpt"
Cohesion: 0.09
Nodes (18): assert, fs, k, kalendar, km, m4, mat, mdMat (+10 more)

### Community 11 - "Input files and parsers"
Cohesion: 0.16
Nodes (20): Acara file (event days + Batal), Aktiviti template file, Input parsers, Kelas file, Kesukaran (difficulty rating file), P3: Markdown files are the inputs, Markdown files are the inputs, File formats (+12 more)

### Community 12 - "Architecture principles and stack"
Cohesion: 0.17
Nodes (18): Calendar engine, P1/P2: Single user, offline first, P6: Pure core, thin shells, P7: The calendar is data, not code, Technology stack: plain JS PWA, IndexedDB, Drive JSON sync, Code moved from rpt/ to src/core/ (2026-10-03), Hari Sarawak is a normal school day in Sabah, SK T4 RPT 2026 errors (M6 holiday, M19 dated 2025) (+10 more)

### Community 13 - "Rekod and progress rules"
Cohesion: 0.15
Nodes (19): Minute replay of rekod, P5: RPT is a yardstick, RPH follows reality, Past rekod rows never re-derived, Exam lessons do not advance, Progress and dashboard, Class progress queue (postponed SP first), Rekod (per class x subject lesson log), Rekod sync (+11 more)

### Community 14 - "Tests: scheduler"
Cohesion: 0.11
Nodes (14): a2, acara, assert, b, fs, kalendar, { kelas }, m35 (+6 more)

### Community 15 - "Scheduler and calendar concepts"
Cohesion: 0.14
Nodes (16): Event days (hari acara), Jadual (timetable), Lesson scheduler, Calendar is data, not code, Split at PPT: half the topics before mid-year exam, Takwim (two layers: KPM + school), Timetable resolver, Discussion Log (+8 more)

### Community 16 - "Tests: rph-render"
Cohesion: 0.12
Nodes (11): akt, ask, assert, fs, h, h2, h3, h4 (+3 more)

### Community 17 - "RPT output and renderer"
Cohesion: 0.27
Nodes (13): RPT Matematik Tingkatan 4 2026 (printable HTML, A4 landscape), aturan(), catatan(), esc(), { fmtDate, fmtRange }, label(), mdCell(), renderHtml() (+5 more)

### Community 18 - "KPM academic calendars"
Cohesion: 0.21
Nodes (14): Minggu 34 (29/09/2026), Kalendar Akademik 2027 KPM (Lampiran B, Kumpulan B), Minggu persekolahan numbering (M1-M44), Penggal 1 2027 (84 days), Penggal 2 2027 (119 days), Surat Siaran KPM Bil. 3/2025 - Kalendar Akademik 2026, Cuti Akhir Persekolahan 2026 (05.12-31.12.2026), Cuti Penggal 1 2026 (21.03-29.03.2026) (+6 more)

### Community 19 - "Tests: kelas-acara"
Cohesion: 0.15
Nodes (11): A, A2, assert, fs, j, K, K1, k2 (+3 more)

### Community 20 - "Pacing and summary algorithms"
Cohesion: 0.27
Nodes (11): Ahead / behind summary, Ahead/behind measured in minutes, All-or-nothing CLI writes, masaSp (SP minutes from RPT weeks), planRows pacing algorithm, ringkasanKelas summary, rph.js CLI, RPH page layout (+3 more)

### Community 21 - "Tests: rekod"
Cohesion: 0.18
Nodes (9): assert, back, k, l, longgar, md, pipe, R (+1 more)

### Community 22 - "Apps Script stopgap test"
Cohesion: 0.20
Nodes (8): assert, ctx, fs, fx, sheets, ss, vm, ref_vm

### Community 23 - "Architecture overview and data model"
Cohesion: 0.44
Nodes (10): Architecture, Data model, DSKP (curriculum document), RPT is a yardstick, RPH follows reality, Renderers (Markdown, printable HTML), RPH (Rancangan Pengajaran Harian), RPT (Rancangan Pengajaran Tahunan), SP (Standard Pembelajaran, code t.s.n) (+2 more)

### Community 24 - "Tests: jadual"
Cohesion: 0.20
Nodes (8): ref_assert, assert, fs, j, lama, R, salah, versions

### Community 25 - "Pacing rules (15-minute, ditunda)"
Cohesion: 0.31
Nodes (9): Ditunda / batal consume no time, 15-minute rule, Pacing by RPT minutes, Peruntukan SP appendix, Tutorial repeats last diajar SP, No bersambung marker on lessons, Decision: scale SP time to fit RPT, Rules R1-R14 (+1 more)

### Community 26 - "Simulation round and drift fix"
Cohesion: 0.33
Nodes (7): Capacity = whole takwim weeks, Fix: SP time follows RPT actual weeks, Drift found: 2 weeks behind, Simulation round (4S Matematik), Bukan kelas (B marks), Jadual Waktu simulasi 2026-01-01, Simulation timetable copy

### Community 27 - "RPT planner rules"
Cohesion: 0.40
Nodes (6): Fixed weeks per topic, Half the topics before PPT, RPT planner, Syllabus end = final exam - 2 revision weeks, Ringkasan topic table, RPT generator CLI usage

### Community 28 - "PWA and offline-first"
Cohesion: 0.50
Nodes (4): Offline first, Pure core, thin shells, PWA app shell, Technology stack

### Community 29 - "Deterministic engine and AI"
Cohesion: 0.67
Nodes (3): AI assistant (manual), P4: Deterministic engine, Deterministic engine

## Knowledge Gaps
- **248 isolated node(s):** `assert`, `ctx`, `fs`, `fx`, `sheets` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 300 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture` connect `Architecture overview and data model` to `CLI: rph.js and simulasi.js`, `Tests: rpt`, `Input files and parsers`, `Architecture principles and stack`, `Rekod and progress rules`, `Scheduler and calendar concepts`, `Pacing and summary algorithms`, `RPT planner rules`, `PWA and offline-first`, `Deterministic engine and AI`?**
  _High betweenness centrality (0.328) - this node is a cross-community bridge._
- **Why does `Calendar engine` connect `Architecture principles and stack` to `RPT planner rules`, `Scheduler and calendar concepts`, `Architecture overview and data model`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Renderers (Markdown, printable HTML)` connect `Architecture overview and data model` to `RPT output and renderer`, `Pacing and summary algorithms`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `DSKP Matematik Tingkatan 4 dan 5` (e.g. with `Mat T4 10.0 Matematik Pengguna: Pengurusan Kewangan` and `Mat T4 1.0 Fungsi dan Persamaan Kuadratik dalam Satu Pemboleh Ubah`) actually correct?**
  _`DSKP Matematik Tingkatan 4 dan 5` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Kesukaran SP Matematik T4` (e.g. with `Mat T4 SK 10.1 Perancangan dan Pengurusan Kewangan` and `Mat T4 SK 1.1 Fungsi dan Persamaan Kuadratik`) actually correct?**
  _`Kesukaran SP Matematik T4` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `assert`, `ctx`, `fs` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Calendar, scheduler and summary code` be split into smaller, more focused modules?**
  _Cohesion score 0.07568027210884354 - nodes in this community are weakly interconnected._