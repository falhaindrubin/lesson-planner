# RPH Mate — UI/UX Design Brief

_2026-10-25 · For whoever designs or revisits the screens (the teacher, Claude, or a designer). Current screens: Phase 1, built from the approved "layout A" mockup and still to be revisited after first real use. Flows: [app-flow.md](app-flow.md)._

---

## 1. Who and when

- **One teacher**, at the end of a school week, on a **laptop** (Chrome or Edge, about 1366–1920 px wide), often offline or on a weak connection. Session goal: mark what happened, print next week, back up. Target **under 10 minutes**.
- A **tablet** (landscape, Chrome) to glance at today's lessons and RPH in class. Read-mostly.
- The teacher knows the domain deeply (SP codes, RPT, takwim) and does not need it explained. They need **certainty**: is this right, is it saved, is the class behind?

## 2. Design principles (in priority order)

1. **Responsiveness over aesthetics (W13).** A click must feel instant: cards and badges update in under 100 ms. No animations, transitions, web fonts or libraries that slow a click. The preview may follow a moment later.
2. **Exceptions only.** Every lesson is Taught by default. The screen should make the 1–2 exceptions per week fast and leave the rest alone.
3. **What you see is what prints.** The preview is the real RPH HTML in an iframe, not a look-alike.
4. **Never lose work silently.** Unsaved state is always visible; errors say what failed and that nothing was changed.
5. **Two languages, cleanly split.** Interface chrome in **English**; anything that goes on paper or into the rekod in **Malay**, unchanged (e.g. "PdP ditunda kerana: …", "PEPERIKSAAN", day names on the RPH).
6. **Calm and dense.** A working tool, not a landing page: system font, 14 px base, compact cards, colour used only for meaning.

## 3. Visual language (current tokens, `app/app.css`)

| Token | Value | Meaning |
|---|---|---|
| `--ok` | `#2e7d32` green | Taught · On track · DSKP finished · progress bar |
| `--ahead` | `#1565c0` blue | Weeks ahead · drop-zone hover |
| `--warn` | `#e65100` orange | Postponed · 1 week behind · unsaved changes |
| `--bad` | `#c62828` red | Cancelled · 2+ weeks behind · errors · unsaved > 7 days |
| `--muted` | `#666` | Secondary text, "No DSKP / No RPT" badges |
| `--line` | `#ccc` | Borders |
| `--bg` / `--fg` | `#fff` / `#111` | Page |

- Type: `system-ui`, 14 px / 1.4. Badges 12 px, white on colour, rounded pills.
- Cards: dashed grey border when no status, a solid 2 px border in the status colour once Taught / Postponed / Cancelled; exam cards and holiday labels grey-filled.
- Theme colour `#2e7d32`; icon `app/icon.svg`.
- **Gaps to close:** no dark mode; meaning is carried by colour plus text (badges have words), but card borders are colour-only, so keep the status word visible on the card; focus outlines are browser defaults.

## 4. Screens

### 4.1 Top bar (always visible, sticky)
`Lesson Planner (dev)` / `RPH Mate` · **◀ Week 36** `5–9 Oct 2026` **▶** · **Today** · tabs **Week | Classes | ⚙ Files** · spacer · badges `4S Matematik: On track` · `● Unsaved changes` · **Save rekod (2 files)**

- Badge tones: green on track, blue ahead, amber 1 week behind, red 2+ weeks behind, grey no DSKP / no RPT.
- Save rekod is disabled when nothing is unsaved; each click downloads one file.
- Hidden when printing.

### 4.2 Week (layout A)
```
┌ cards (44%, min 320px) ─────────────────┐ ┌ preview (rest) ──────────────────────────┐
│ [Mon 5 Oct: Cuti …] (grey day labels)   │ │ RPH preview · M3   [Print week][Open tab]│
│ ┌─────────────────────────────────────┐ │ │ ┌──────────────────────────────────────┐ │
│ │ Mon 5 Oct · 7:30–8:30 · 4S Matematik│ │ │ │  A4 page, lesson 1                    │ │
│ │ SP 6.2.1, 6.2.2  ← SPs moved …      │ │ │ │                                      │ │
│ │ [Taught][Postponed][Cancelled]      │ │ │ └──────────────────────────────────────┘ │
│ │ Attendance [32] / 32                │ │ │ ┌──────────────────────────────────────┐ │
│ │ Notes [optional            ]        │ │ │ │  A4 page, lesson 2 …                  │ │
│ └─────────────────────────────────────┘ │ │                                          │
│ ⚠ warnings (small, muted)               │ └──────────────────────────────────────────┘
└─────────────────────────────────────────┘
```
- Card content: day and date · time · class and subject · "Tutorial" · the event name in italics · planned SPs · status buttons · attendance (pre-filled with the class size) / class size · Notes.
- Choosing Postponed or Cancelled turns Notes into **Reason (required)**, focuses it and shows **Save**; nothing is stored until it has text.
- Clicking a card's background scrolls the preview to that lesson's page.
- One preview per subject, stacked, when a week has several subjects.
- Errors: a red bar above the cards for a failed re-plan; inline red text on a card for a refused mark.

### 4.3 Classes
Table: **Class · Current SP · DSKP done (bar + %) · RPT week of SP · Position (badge) · Ends (M34)**. Below it, the "won't fit" warnings in red ("needs 1,240 min … has 1,050 min until M34 — consider combining SPs"). Clicking a row goes to the Week tab on the current week. The heading states the reference point: "as of Week 36 (start of week)".

### 4.4 Files
Sections in order: **Profile** (name → NAMA GURU) · **Your folders** (Pick a folder, Pick files, drop zone, "N files stored") · **Class file** (selector, Missing / error lines, "All files found. Open the Week tab.") · **Last import** (stored count, rejected files with errors, rekod conflicts as a side-by-side table with **Replace with the file** / **Keep the app's copy**).

### 4.5 System states
- Full-page message: storage unavailable (private window).
- Yellow banner: persistent storage refused.
- "Today is not in the 2026 takwim" note in the top bar.
- Empty states: "No lessons this week.", "No RPH pages this week.", "No kelas-*.md picked yet."

## 5. Interaction details that matter

- **No lost clicks:** pressing a button never blurs the focused field first (the redraw would move the button). Keep this behaviour in any redesign.
- **Keyboard:** fields commit on change (Tab or Enter). A redesign should add Enter-to-save for the Reason box and visible focus rings.
- **Copy style:** short, plain English, sentence case; numbers formatted `1,240 min`; week labels `M36` or `Week 36`; dates `Mon 5 Oct`.
- **Never use browser `alert` / `confirm`.** Confirmations are inline (as in the rekod conflict table).

## 6. Planned screens (to design when the phase starts)

| Phase | Screen | Brief |
|---|---|---|
| 1b | Week on tablet | Landscape at 1024 px: cards above or a toggle between Cards and Preview; larger touch targets (≥ 40 px) |
| 2 | **Progress** | Per class: line of SPs completed vs RPT expectation over weeks; table of postponed/cancelled lessons with reasons; import-history wizard (pick CSV → preview matches → confirm) |
| 3 | **Sync** | Files → "Google Drive" section (Connect, account, last synced); top-bar chip: Synced / Syncing / Offline / Needs sign-in; first-sync choice (upload this device / download from Drive) |
| 4 | **RPT** | Tab with the generated week table (Minggu, Tarikh, Tajuk, SK, SP, Catatan), status Draft / Frozen, Generate / Freeze / Print, and a diff before regenerating a frozen RPT |
| 5 | Phone | Today-only list view; marking only; no preview |

## 7. Open questions for the redesign
- After real use: is layout A right, or should the preview be on demand so cards get more room?
- Should Save rekod become one zip file, or wait for Drive sync to make it a backup button?
- A colour-blind check on the green/orange/red status set; is a shape or icon cue needed?
- Dark mode: worth it for a weekly, mostly daytime tool?
