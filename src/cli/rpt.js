// Generate the RPT (yearly teaching plan) of one subject from DSKP.md, Takwim.md
// and the SP difficulty file. SPs are spread by difficulty over the real PdP weeks
// (minus holidays and that form's exams) up to the end week of the syllabus.
//
//   node src/cli/rpt.js --dskp sample/dskp-mat-t5.md --takwim sample/takwim-smly-2026.md \
//     --difficulty sample/kesukaran-mat-t5.md --form 5 --out output/rpt-mat-t5-2026
//
// Default: the syllabus ends before that form's final exam (PAT / UASA; Percubaan SPM
// for Form 5), minus the revision weeks.
// --revision-weeks <n>  revision weeks before the final exam (default 2, all forms)
// --end <week|final>    set the last week of the syllabus by hand

import fs from 'node:fs';
import path from 'node:path';
import * as C from '../core/index.js';

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  for (const k of ['dskp', 'takwim', 'difficulty', 'form', 'out'])
    if (!a[k]) throw new Error(`--${k} is required`);
  const read = f => fs.readFileSync(f, 'utf8');
  const dskpMd = read(a.dskp), takwimMd = read(a.takwim);
  const subject = a.subject || (dskpMd.match(/^# DSKP (.+?) Tingkatan/m) || [])[1] || 'Subjek';
  const year = (takwimMd.match(/\| (\d{4})-\d\d-\d\d/) || [])[1];
  const p = C.plan({
    sp: C.parseDskp(dskpMd), difficulty: C.parseDifficulty(read(a.difficulty)),
    calendar: C.buildCalendar(C.parseTakwim(takwimMd)),
    form: Number(a.form), end: a.end === 'final' ? 'final' : a.end ? Number(a.end) : undefined,
    revisionWeeks: a['revision-weeks'] != null ? Number(a['revision-weeks']) : undefined,
  });
  const meta = { subject, year, dskp: a.dskp, takwim: a.takwim, difficulty: a.difficulty };
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  fs.writeFileSync(a.out + '.md', C.renderMd(p, meta));
  fs.writeFileSync(a.out + '.html', C.renderHtml(p, meta));
  p.warnings.forEach(w => console.warn('Warning:', w));
  console.log(`${a.out}.md, ${a.out}.html`);
}

main(process.argv.slice(2));
