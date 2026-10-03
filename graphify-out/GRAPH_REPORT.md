# Graph Report - lesson-planner  (2026-10-03)

## Corpus Check
- Corpus is ~38,931 words - fits in a single context window. You may not need a graph.

## Summary
- 267 nodes · 420 edges · 10 communities
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 124 edges (avg confidence: 0.89)
- Token cost: 221,473 input · 0 output

## Community Hubs (Navigation)
- Matematik T4 Syllabus SKs
- Tests and CLI Wiring
- RPT and RPH Design
- RPH Sample and Computing DSKPs
- Timetable and 2027 Breaks
- Calendar Engine and Principles
- Input Parsers and Data Model
- KPM Academic Calendars
- Matematik Topics T4 T5
- RPT Renderer

## God Nodes (most connected - your core abstractions)
1. `DSKP Matematik Tingkatan 4 dan 5` - 24 edges
2. `Kesukaran SP Matematik T4` - 22 edges
3. `DSKP Matematik Tingkatan 4` - 14 edges
4. `DSKP KSSM Matematik Tingkatan 4 dan 5` - 14 edges
5. `Takwim SM Lok Yuk 2026` - 12 edges
6. `Calendar engine component` - 11 edges
7. `RPT planner component` - 10 edges
8. `Takwim KPM 2027 (Kumpulan B, Sabah) DRAF` - 10 edges
9. `RPH ASK T1 M34 (Google Sheets printout)` - 9 edges
10. `Surat Siaran KPM Bil. 3/2025 - Kalendar Akademik 2026` - 9 edges

## Surprising Connections (you probably didn't know these)
- `DSKP Matematik T4+T5 conversion (127 SP)` --conceptually_related_to--> `parseDskp()`  [INFERRED]
  docs/discussion.md → src/core/parse/dskp.js
- `RPT planner component` --references--> `plan()`  [EXTRACTED]
  docs/architecture.md → src/core/rpt-planner.js
- `Stopgap: Apps Script RPH menu (Jana minggu seterusnya)` --semantically_similar_to--> `RPH generator component (planned)`  [INFERRED] [semantically similar]
  README.md → docs/architecture.md
- `Mat T4 Tajuk 2.0 Asas Nombor` --semantically_similar_to--> `ASK T1 SK 2.1 Sistem Nombor Perduaan`  [INFERRED] [semantically similar]
  sample/dskp-mat-t4-t5.pdf → sample/dskp-ask-t1.md
- `SK T4 SK 1.2 Algoritma` --semantically_similar_to--> `ASK T1 SK 3.1 Pembangunan Algoritma`  [INFERRED] [semantically similar]
  sample/Copy of DSKP SAINS KOMPUTER TINGKATAN 4.pdf → sample/dskp-ask-t1.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RPT planner scheduling rules** — docs_architecture_capacity_rule, docs_architecture_syllabus_end_rule, docs_architecture_split_at_ppt, docs_architecture_fixed_weeks_rule, docs_architecture_rpt_planner [EXTRACTED 1.00]
- **Planned RPH pipeline (timetable -> lessons -> RPH -> progress)** — docs_architecture_timetable_resolver, docs_architecture_lesson_scheduler, docs_architecture_rph_generator, docs_architecture_progress_dashboard [EXTRACTED 1.00]
- **Teacher-checked markdown inputs** — docs_architecture_dskp, docs_architecture_takwim, docs_architecture_jadual, docs_architecture_kesukaran [EXTRACTED 1.00]
- **RPT Matematik T4 generator inputs** — sample_dskp_mat_t4_dskp_matematik_t4, sample_kesukaran_mat_t4_kesukaran_sp_mat_t4, sample_kesukaran_mat_t4_minggu_tetap_ikut_tajuk, sample_takwim_smly_2026_takwim_sm_lok_yuk_2026, sample_takwim_kpm_2027_takwim_kpm_2027, sample_jwg_20261002_jadual_waktu_guru [INFERRED 0.85]
- **Matematik Diskret topics in T4** — sample_dskp_mat_t4_tajuk_3_0, sample_dskp_mat_t4_tajuk_4_0, sample_dskp_mat_t4_tajuk_5_0, sample_dskp_mat_t4_t5_bidang_matematik_diskret [EXTRACTED 1.00]
- **Computer science classes in Makmal Komputer** — sample_jwg_20261002_kelas_1s_ask, sample_jwg_20261002_kelas_4h_sains_komputer, sample_jwg_20261002_kelas_4h_tutorial, sample_jwg_20261002_makmal_komputer [EXTRACTED 1.00]
- **RPH generation inputs (DSKP + timetable + calendar -> RPH)** — sample_2026___ask_t1___google_sheets_m34a, sample_dskp_ask_t1, sample_falhaind_rubin___jwg___20260810, sample_surat_siaran_kpm_bil__3_2025___kalendar_akademik_2026 [INFERRED 0.85]
- **KSSM DSKP documents sharing SK/SP/Standard Prestasi structure** — sample_dskp_ask_t1, sample_copy_of_dskp_sains_komputer_tingkatan_4, sample_dskp_mat_t4_t5, sample_dskp_ask_t1_sk_sp_sp_structure [INFERRED 0.95]

## Communities (10 total, 0 thin omitted)

### Community 0 - "Matematik T4 Syllabus SKs"
Cohesion: 0.08
Nodes (49): DSKP Matematik Tingkatan 4, Mat T4 SK 10.1 Perancangan dan Pengurusan Kewangan, Mat T4 SK 1.1 Fungsi dan Persamaan Kuadratik, Mat T4 SK 2.1 Asas Nombor, Mat T4 SK 3.1 Pernyataan, Mat T4 SK 3.2 Hujah, Mat T4 SK 4.1 Persilangan Set, Mat T4 SK 4.2 Kesatuan Set (+41 more)

### Community 1 - "Tests and CLI Wiring"
Cohesion: 0.05
Nodes (30): assert, ctx, fs, fx, sheets, ss, vm, ref_assert (+22 more)

### Community 2 - "RPT and RPH Design"
Cohesion: 0.08
Nodes (35): AI assistant (manual difficulty draft), Lesson Planner Architecture, Capacity = whole takwim weeks with >=1 teaching day, Fixed weeks per topic (Matematik T4 topic 10.0 = 2), Jadual (timetable markdown), Kesukaran (difficulty ratings 1-3, fixed weeks per topic), Lesson scheduler component (planned), P4: Deterministic engine (+27 more)

### Community 3 - "RPH Sample and Computing DSKPs"
Cohesion: 0.10
Nodes (32): RPH ASK T1 M34 (Google Sheets printout), Kelas 1 Sapphire, Objektif Pembelajaran (copied from SP), Refleksi template, Ringkasan Aktiviti (Permulaan/Perkembangan/Penutup), RPH field structure, DSKP KSSM Sains Komputer Tingkatan 4, SK T4 SK 1.2 Algoritma (+24 more)

### Community 4 - "Timetable and 2027 Breaks"
Cohesion: 0.11
Nodes (27): Guru bertugas (B) Jumaat - bukan PdP, tiada RPH, Jadual Waktu Guru Falhaind Rubin (berkuat kuasa 2026-10-05), 1S Asas Sains Komputer (ASK), 2J/2D Pendidikan Kesihatan/Jasmani, 4H Sains Komputer (SK), 4H Tutorial Sains Komputer, Bilik M.K (Makmal Komputer?), SM Lok Yuk, Kudat, Sabah (+19 more)

### Community 5 - "Calendar Engine and Principles"
Cohesion: 0.13
Nodes (22): Calendar engine component, P1/P2: Single user, offline first, P6: Pure core, thin shells, P7: The calendar is data, not code, Technology stack: plain JS PWA, IndexedDB, Drive JSON sync, Takwim (two-layer calendar: KPM + school), Code moved from rpt/ to src/core/ (2026-10-03), Hari Sarawak is a normal school day in Sabah (+14 more)

### Community 6 - "Input Parsers and Data Model"
Cohesion: 0.16
Nodes (16): Data model (Year, CalendarDay, Subject, SP, Lesson, Outcome), DSKP (curriculum document), Input parsers component, P3: Markdown files are the inputs, SP (Standard Pembelajaran, code t.s.n), DSKP Matematik T4+T5 conversion (127 SP), { cells }, parseDskp() (+8 more)

### Community 7 - "KPM Academic Calendars"
Cohesion: 0.21
Nodes (14): Minggu 34 (29/09/2026), Kalendar Akademik 2027 KPM (Lampiran B, Kumpulan B), Minggu persekolahan numbering (M1-M44), Penggal 1 2027 (84 days), Penggal 2 2027 (119 days), Surat Siaran KPM Bil. 3/2025 - Kalendar Akademik 2026, Cuti Akhir Persekolahan 2026 (05.12-31.12.2026), Cuti Penggal 1 2026 (21.03-29.03.2026) (+6 more)

### Community 8 - "Matematik Topics T4 T5"
Cohesion: 0.14
Nodes (14): ASK T1 SK 2.1 Sistem Nombor Perduaan, DSKP KSSM Matematik Tingkatan 4 dan 5, Bidang Pembelajaran Matematik, Mat T4 Tajuk 10.0 Matematik Pengguna: Pengurusan Kewangan, Mat T4 Tajuk 1.0 Fungsi dan Persamaan Kuadratik dalam Satu Pemboleh Ubah, Mat T4 Tajuk 2.0 Asas Nombor, Mat T4 Tajuk 3.0 Penaakulan Logik, Mat T4 Tajuk 4.0 Operasi Set (+6 more)

### Community 9 - "RPT Renderer"
Cohesion: 0.31
Nodes (12): aturan(), catatan(), esc(), { fmtDate, fmtRange }, label(), mdCell(), renderHtml(), renderMd() (+4 more)

## Knowledge Gaps
- **67 isolated node(s):** `fs`, `vm`, `assert`, `fx`, `sheets` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 85 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lesson Planner Architecture` connect `RPT and RPH Design` to `Tests and CLI Wiring`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `DSKP Matematik Tingkatan 4 dan 5` (e.g. with `Mat T4 10.0 Matematik Pengguna: Pengurusan Kewangan` and `Mat T4 1.0 Fungsi dan Persamaan Kuadratik dalam Satu Pemboleh Ubah`) actually correct?**
  _`DSKP Matematik Tingkatan 4 dan 5` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Kesukaran SP Matematik T4` (e.g. with `Mat T4 SK 10.1 Perancangan dan Pengurusan Kewangan` and `Mat T4 SK 1.1 Fungsi dan Persamaan Kuadratik`) actually correct?**
  _`Kesukaran SP Matematik T4` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DSKP Matematik Tingkatan 4` (e.g. with `4S Matematik (M3)` and `PAT Tingkatan 4 / UASA (M36-M38)`) actually correct?**
  _`DSKP Matematik Tingkatan 4` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DSKP KSSM Matematik Tingkatan 4 dan 5` (e.g. with `Standard Kandungan / Standard Pembelajaran / Standard Prestasi structure` and `Timetable subject codes (ASK, SK, M3, PJ, PK, M.K, TUTORIAL, B)`) actually correct?**
  _`DSKP KSSM Matematik Tingkatan 4 dan 5` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Takwim SM Lok Yuk 2026` (e.g. with `Takwim KPM 2027 (Kumpulan B, Sabah) DRAF` and `Cuti Tambahan KPM`) actually correct?**
  _`Takwim SM Lok Yuk 2026` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `vm`, `assert` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._