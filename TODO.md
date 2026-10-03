# TODO

Things for **me (the teacher)** to do. Decisions and background: [docs/discussion.md](docs/discussion.md).

## Now
- [x] Add the **DSKP for Matematik T4** to `sample/` (converted: `sample/dskp-mat-t4.md`)
- [ ] Add the **DSKP for PJPK T2** to `sample/`
- [ ] Check the **Matematik T4 RPT** (`output/rpt-mat-t4-2026.html`) and fix any difficulty ratings in `sample/kesukaran-mat-t4.md`, then re-run `node src/cli/rpt.js ...` (and re-run the RPH simulation, since RPH timing reads the RPT file)
- [ ] Add **one week of RPH** for Matematik and PJPK (PDF or Sheet link) to check the layout matches ASK
- [ ] Share the **Google Sheets for SK, MAT and PJPK** (links in `sample/links.txt`) for the history import
- [x] Decide: **M31 → final exam** (Form 1–4) — revision before PAT is a must
- [x] Decide: default RPT end — final exam minus **2 revision weeks**, every form
- [ ] Review the 4S Matematik simulation in `output/simulasi-4S-M3/` (`rekod-4S-M3.md`, the RPH HTML, `ringkasan.txt`)
- [ ] For real use: in `sample/kelas-2026.md` set Rekod to `../rekod/2026`, Output to `../output/rph` and Mula to 4S's current SP; add other classes from `test/data/kelas-semua.md` with Bil. murid and Mula
- [ ] Check `sample/acara-2026.md` (events) and add Batal days you already know
- [ ] Optional: copy `sample/aktiviti-umum.md` per subject and point the Aktiviti column at it
- [ ] Optional: try the stopgap script ([apps-script/Code.gs](apps-script/Code.gs)) on the ASK Sheet for M36

## When I'm ready
- [ ] Say **"go"** to start the design spec (data model, RPT algorithm, screens, sync, markdown formats)

## After the spec
- [x] Convert **one of each** input to markdown and drop it in `sample/` (done early, 2026-10-02; recheck once the spec fixes the formats):
  - [x] ASK T1 DSKP → `sample/dskp-ask-t1.md`
  - [x] Timetable 5.10.2026 → `sample/jwg-20261002.md`
  - [x] Takwim 2026 → `sample/takwim-smly-2026.md`
- [ ] Review the test results, then convert the rest (other DSKPs, older timetable)

## Not needed
- Converting RPT, RPH PDF or the KPM calendar to markdown — reference only

## Later (next year)
- [x] 2027 KPM calendar → `sample/takwim-kpm-2027.md` (draft; some leave days estimated)
- [ ] 2027: get the full KPM circular with **Lampiran C** (Cuti Tambahan KPM) to confirm the estimated days
- [ ] 2027 rollover: school takwim (exam weeks) + class list; add **Matematik T5 DSKP** if teaching Form 5
