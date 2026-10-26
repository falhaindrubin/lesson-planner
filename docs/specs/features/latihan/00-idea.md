# Latihan (student exercises) — Idea

_2026-10-26, revised 2026-10-26 · Lite spec set for a major feature of Lesson Planner (RPH Mate). Related: [PRD](../../../product/prd.md) · [Implementation plan](../../../product/implementation-plan.md)._

## Idea statement

The teacher writes every exercise set by hand today, and each set costs preparation time and marking time. Latihan builds an exercise set from what a class has **actually been taught** (the SPs in that class's rekod). It draws on a question bank per subject that is drafted by AI outside the app, checked by the teacher, and loaded into the app. The teacher's own Apps Script turns the set into a **Google Forms quiz** and posts it **as a draft assignment in that class's Google Classroom**. **Marking happens entirely in Google Classroom.** After the deadline, the script sends a **class-level analysis** (participation and answers per SP) back to the app for the teacher's reflection on that topic. A second goal is to get students using Google Classroom regularly. No student names or individual results enter the app.

## Target users

- **The teacher** (single user, as for the rest of the app): builds sets, posts them, reads the analysis.
- **Students** (indirect): do the quiz in Google Classroom with their DELIMa accounts. They never use the app.

## MVP scope

1. **Question bank:** `latihan-<subject>-sp.md`, drafted by AI outside the app and loaded into the app. Each question has an SP code, TP level (1–6), type, answer, accepted variants where needed, a *penerangan*, and a `semak: ya` flag.
   - Types: multiple choice, checkboxes, exact short answer, **fill-in-the-code** (single-token blanks, all accepted variants listed) and **order-the-lines** (Forms grid).
   - A validator tool (no AI): the SP code exists in the DSKP file, TP is 1–6, the answer is among the options, there is exactly one answer where required, and there are no duplicates. The app uses only `semak: ya` questions.
2. **Build a set in the app:** choose a class and a range of taught SPs, set the TP mix, and export the set.
3. **Post to Classroom:** an Apps Script in the teacher's own Google account builds the Forms quiz (answer key, auto-marking) and creates it as a **draft** assignment in the right Classroom class, using a class → Classroom course mapping. The teacher checks it and presses Assign.
4. **Marking:** done entirely in Google Classroom / Forms.
5. **Analysis back:** after the deadline the teacher runs the script's analysis. It gives a file with **class-level data only**: submitted / class size, % correct per question, SP and TP, and the most common wrong answers. The teacher imports it into the app, where it shows with that topic for reflection. It can also suggest the RPH *refleksi* counts ("Objektif tercapai oleh x/y orang murid").
6. **Print fallback:** a print page (worksheet + skema) for emergencies only. Paper results are not part of the analysis.
7. The app counts sets per class (for success measure 2).
8. Built for any subject. Only the bank file is subject-specific.

**MVP subject:** chosen once the 2027 teaching load is known. Sains Komputer T4 if taught, else ASK T1, else whichever subject is taught.

## Out of scope

- The app itself signing into Google or calling the Classroom API. All Google work is done by the teacher's Apps Script.
- AI inside the app.
- Student names, per-student scores or answers in the app. Names stay in Classroom.
- Publishing or scheduling assignments automatically (drafts only).
- Editing questions in the app; the bank is edited as a file.
- Auto-marking open answers or full programs.
- Rich math notation in Forms (relevant once Matematik gets a bank).

## Success measures (after one term of real use)

1. Making a set, from the app to a draft in Classroom, takes **≤ 5 minutes**.
2. **≥ 1 set per class per SK (subtopic)**, counted by the app.
3. The Classroom submission rate is recorded **before launch** as a baseline. Target: **≥ 70%** of students submitting through Classroom by term end, read from the imported analysis.

## Roadmap position

1b → 2 Progress → 4 RPT in app → **Latihan** → 3 Drive sync. The bank is drafted once the 2027 teaching load is known. **Before the specs continue:** test whether DELIMa lets Apps Script use Classroom (W7).

## Weaknesses

| # | Weakness | Outcome |
|---|---|---|
| W1 | Building the bank moves the time cost from writing to checking | **resolved**: whole subject drafted up front once, reused across classes and years; one subject first |
| W1a | Review fatigue lets wrong answer keys through; marking is automatic, so a wrong key marks students wrong | **resolved**: validator + per-question `semak: ya` + *penerangan* with every answer |
| W2 | Whether students engage is unproven; access is mixed (lab and home) | **resolved**: quizzes in Classroom, print fallback for emergencies; measured by success measure 3 |
| W3 | Practical SPs (*menghasilkan atur cara*) can't be auto-marked | **resolved**: objective proxies plus fill-in-the-code and order-the-lines; Forms grid marking tested early |
| W4 | Paper copies need hand marking | **resolved**: print is fallback only; normal marking is in Classroom |
| W5 | The 2027 teaching load is unknown, so a bank could go unused | **resolved**: bank subject chosen once the load is known; the feature is subject-neutral |
| W6 | The analysis covers only Classroom submissions; students on paper (often weaker access) are left out, so percentages can look better than reality | **accepted risk**: always measured against class size (e.g. 24/35 submitted), so the gap stays visible |
| W7 | DELIMa admins may block Apps Script from Classroom; the Forms → Classroom marks sync may not work for API-created assignments | **open**: test on the teacher's DELIMa account before specs continue; if blocked, posting and analysis fall back to manual |
| W8 | Class-level analysis can't say *who* needs *latihan pengukuhan* | **accepted risk**: the teacher looks up names in Classroom; keeps the app free of student data (G5) |
| W9 | Automatic posting could put a mistake in front of a whole class | **resolved**: script posts drafts only; the teacher presses Assign |

## Verdict

**Survives**, pending W7. If the DELIMa test fails, revise points 3 and 5 to manual posting and manual analysis.
