# TODO

Things for **me (the teacher)** to do. Decisions and background: [docs/discussion.md](docs/discussion.md).

## Next session (2026-10-31 summary)
- [ ] **Try the live app** (https://falhaindrubin.github.io/rph-mate/): install it as a PWA, pick `sample/` and `output/`, try Today, Week and Print week, and tell Claude what still feels wrong or confusing
- [ ] Tell Claude **5S's current SP** (to set Mula for a real week of use)
- [ ] Choose **UI pass 2**: guided first-run setup, phone layout, Malay labels, or plainer wording than "SP"
- [ ] Claude: **release UI pass 1** to rph-mate (not released yet; the live site still has the old look)

## Now
- [x] Add the **DSKP for Matematik T4** to `sample/` (converted: `sample/ref/dskp-mat-t4.md`)
- [x] Sample data and tests switched from T4 4S to **T5 5S** (2026-10-30): `sample/dskp-mat-t5.md`, `sample/kesukaran-mat-t5.md`, 5S in the class file and timetables (2026 takwim and timetable stand in for 2027)
- [ ] Add the **DSKP for PJPK T2** to `sample/`
- [ ] Decide the **T5 squeeze**: topics 5.0–8.0 get only M19–M25 (topic 8.0 gets 0.4 weeks). Pin weeks for 8.0 in `sample/kesukaran-mat-t5.md`? Finish by end of July is already met (syllabus ends M25, 20–24 Jul)
- [ ] When you have them: send the **2027 school takwim and timetable** (the T5 plan borrows the 2026 ones)
- [ ] Check the **Matematik T5 RPT** (`output/rpt-mat-t5-2026.html`) and fix any difficulty ratings in `sample/kesukaran-mat-t5.md` (draft; T4 files kept for reference), then re-run `node src/cli/rpt.js ...` (and re-run the RPH simulation, since RPH timing reads the RPT file)
- [ ] Add **one week of RPH** for Matematik and PJPK (PDF or Sheet link) to check the layout matches ASK
- [ ] Share the **Google Sheets for SK, MAT and PJPK** (the links file was removed from the repo on 2026-10-30; send them again when ready) for the history import
- [x] Decide: **M31 → final exam** (Form 1–4) — revision before PAT is a must
- [x] Decide: default RPT end — final exam minus **2 revision weeks**, every form
- [ ] Review the 5S Matematik T5 simulation in `output/simulasi-5S-M3/` (`rekod-5S-M3.md`, the RPH HTML, `ringkasan.txt`)
- [ ] Add the other classes from `test/data/kelas-semua.md` to `sample/kelas-2026.md` with Bil. murid and Mula (ASK 1S, SK 4H, PK/PJ 2D 2J) — PK/PJ run without SP until their DSKP is added
- [ ] Check `sample/acara-2026.md` (events) and add Batal days you already know
- [ ] Optional: copy `sample/aktiviti-umum.md` per subject and point the Aktiviti column at it
- [ ] Optional: try the stopgap script ([apps-script/Code.gs](apps-script/Code.gs)) on the ASK Sheet for M36

## RPH pipeline (built 2026-10-03, branch `rph-pipeline`)
- [x] Say **"go"** for the design spec — RPH pipeline spec, plan and code done ([spec](docs/superpowers/specs/2026-10-03-rph-pipeline-design.md))
- [x] `rph-pipeline` merged to `main` (PR #1)
- [ ] Open a few files in `output/simulasi-5S-M3/2026-M*-M3.html` and **print one to PDF**: does it match your Sheets RPH?
- [x] Decide the **next sub-project** — the **web app** (see below)
- [ ] Decide on the deferred minors if any bother you (list in `docs/next-session.md`): e.g. blank Status on a lesson counts as "not taught"; text typed in Kehadiran is reduced to its number
- [ ] Switch to real use in a new week: set Rekod/Output to `../rekod/2026` and `../output/rph`, Mula to 5S's current SP, then `node src/cli/rph.js --classes sample/kelas-2026.md --week <n>`

## Web app (first slice built and merged to `main` 2026-10-03; details in [docs/next-session.md](docs/next-session.md))
- [x] **Try the app in the browser**: checked headless on 2026-10-29. Everything passed except offline after a first visit. Fixed and verified 2026-10-30 (the page hands the service worker its loaded files; one online visit now caches 41 files).
- [ ] Optional: click through it yourself (`node tools/serve.js` → http://localhost:8080/app/) and try **Print week** to a real PDF
- [x] Repo is **public**; public **rph-mate** repo created (2026-10-30)
- [x] Released `20261030-cc0d3a1` to https://falhaindrubin.github.io/rph-mate/ (GitHub Pages on); offline after one visit checked headless on the live URL (41 files cached)
- [ ] **Install it as a PWA** in Chrome/Edge from https://falhaindrubin.github.io/rph-mate/, pick `sample/` and `output/`, and try it (a new release now applies after you close all app windows)
- [x] UI pass 1 done 2026-10-31 (clean light theme, Today tab); committed, not yet released
- [ ] Decide the next sub-project: Phase 4 RPT in the app (suggested, for the 2027 RPTs) or Phase 2 Progress, then Drive sync

## After the spec
- [x] Convert **one of each** input to markdown and drop it in `sample/` (done early, 2026-10-02; recheck once the spec fixes the formats):
  - [x] ASK T1 DSKP → `sample/dskp-ask-t1.md`
  - [x] Timetable 5.10.2026 → `sample/jwg-20261005.md`
  - [x] Takwim 2026 → `sample/takwim-smly-2026.md`
- [ ] Review the test results, then convert the rest (other DSKPs, older timetable)

## Not needed
- Converting RPT, RPH PDF or the KPM calendar to markdown — reference only

## Later (next year)
- [x] 2027 KPM calendar → `sample/takwim-kpm-2027.md` (draft; some leave days estimated)
- [ ] 2027: get the full KPM circular with **Lampiran C** (Cuti Tambahan KPM) to confirm the estimated days
- [ ] 2027 rollover: school takwim (exam weeks) + class list; add **Matematik T5 DSKP** if teaching Form 5
