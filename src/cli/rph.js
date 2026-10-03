// Weekly RPH for every class in the class file; updates each class × subject rekod.
//
//   node src/cli/rph.js --classes sample/kelas-2026.md --week 35 [--today 2026-10-03]
//
// The class file names the takwim, timetables, events, rekod folder and output folder (relative to it).
// Rekod rows up to today are never changed; later rows are rebuilt unless the teacher changed
// Status or Catatan. Output: <Output>/<year>-M<n>-<SUBJECT>.html per subject and planned week,
// then warnings (stderr) and one position line per class.
import fs from 'node:fs';
import path from 'node:path';
import * as C from '../core/index.js';
import { summaryLine, fitWarning } from './text.js';

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.classes || !a.week) throw new Error('Usage: node src/cli/rph.js --classes <class file> --week <n> [--today yyyy-mm-dd]');
  const week = Number(String(a.week).replace(/^M/i, ''));
  const today = a.today || localToday();
  if (!/^\d{4}-\d\d-\d\d$/.test(today)) throw new Error(`--today "${today}" is not yyyy-mm-dd`);

  const classFile = path.resolve(a.classes);
  const dir = path.dirname(classFile);
  const shown = f => path.relative(process.cwd(), f) || f;
  const read = f => {
    const p = path.resolve(dir, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  };
  const r = C.runWeek({ read, classText: fs.readFileSync(classFile, 'utf8'), classFile: shown(classFile), week, today });

  // runWeek throws before returning anything, so a failed class never leaves half-written files
  for (const w of r.writes) {
    const p = path.resolve(dir, w.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, w.text);
  }
  r.writes.filter(w => w.kind === 'rph').forEach(w => console.log(shown(path.resolve(dir, w.path))));
  if (r.unplanned.length) console.log(`Not planned (not in the class file): ${r.unplanned.join(', ')}`);
  const warnings = [...r.warnings, ...r.classes.map(fitWarning).filter(Boolean)];
  warnings.forEach(w => console.warn('Warning:', w));
  r.classes.forEach(s => console.log(summaryLine(s)));
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
