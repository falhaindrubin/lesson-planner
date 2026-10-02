# Lesson Planner

A lesson-plan generator for a KSSM teacher (Malaysia). It turns the curriculum
(DSKP), the school calendar and the timetable into a yearly teaching plan (RPT)
and per-lesson plans (RPH), with a dashboard showing topic completion.

**Status:** requirements gathering. The design spec is not written yet.
Decisions so far live in [docs/discussion.md](docs/discussion.md).

## The idea
```
DSKP.md ──► SP list ──(AI rates difficulty)──► RPT per subject ──► RPH per lesson ──► PDF
                                                  ▲                    ▲
                                    KPM calendar + school takwim   timetable versions
                                                                   + actual progress
```

- **Timetable versions** have an effective-from date, so a timetable change never means re-typing dates and times.
- **RPT** is generated once per subject from DSKP difficulty and teaching weeks, then fixed as the yardstick.
- **RPH** follows each class's actual progress; postponed lessons carry their SP forward.
- **Dashboard** shows % of SPs done and weeks ahead/behind the RPT.
- Planned as an installable web app (PWA) that works offline and syncs across laptop, desktop and tablet.

## Repository layout
| Path | What |
|---|---|
| [TODO.md](TODO.md) | What I (the teacher) need to do next |
| [docs/discussion.md](docs/discussion.md) | Living log of every decision, findings from samples, open questions |
| [apps-script/](apps-script/) | Stopgap: Google Apps Script that generates next week's RPH tab in the existing Sheets |
| [sample/](sample/) | Real inputs used for analysis: DSKPs, aSc timetables, RPT, RPH PDF, school takwim, KPM academic calendar |

## Stopgap: Apps Script
Until the app exists, [apps-script/Code.gs](apps-script/Code.gs) adds a menu
**RPH → Jana minggu seterusnya** to a subject's Google Sheet. It copies the latest
`M<n>` tab to `M<n+1>`, moves dates forward 7 days, fills the next SP from the
`data` tab, and re-teaches postponed (PdP ditunda) SPs first.

Install: open the Sheet → Extensions → Apps Script → paste `Code.gs` → Save → reload the Sheet.

Test (Node, uses real ASK M34 data in `fx.json`):
```
node apps-script/test.js
```

Limits: class and times are copied from last week; holidays are not skipped;
one SP per session. The web app replaces all of this.
