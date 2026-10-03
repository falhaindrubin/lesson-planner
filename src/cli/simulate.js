// Simulation: run src/cli/rph.js for every week M<from>..M<to>, as if run
// on the Saturday before that week, with no changes to the rekod by the teacher.
// Prints one summary line per week and class.
//
//   node src/cli/simulate.js --classes sample/kelas-2026.md [--from 1] [--to 43]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as C from '../core/index.js';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.classes) throw new Error('Usage: node src/cli/simulate.js --classes <class file> [--from 1] [--to 43]');
  const classFile = path.resolve(a.classes);
  const K = C.parseClasses(fs.readFileSync(classFile, 'utf8'), a.classes);
  const calendar = C.buildCalendar(C.parseTakwim(fs.readFileSync(path.resolve(path.dirname(classFile), K.takwim), 'utf8')));
  const from = Number(a.from || 1), to = Number(a.to || calendar.weeks[calendar.weeks.length - 1].n);
  const rph = path.join(__dirname, 'rph.js');
  for (const w of calendar.weeks.filter(x => x.n >= from && x.n <= to)) {
    const saturday = new Date(Date.parse(w.start) - 2 * 864e5).toISOString().slice(0, 10);
    const r = spawnSync(process.execPath, [rph, '--classes', classFile, '--week', String(w.n), '--today', saturday], { encoding: 'utf8' });
    if (r.status) throw new Error(`M${w.n}: ${r.stderr.trim()}`);
    const labels = new Set(K.classes.map(c => `${c.classCode} ${c.subject}`));
    const summaries = r.stdout.split('\n').filter(l => labels.has(l.split(':')[0]));
    const warnings = r.stderr.split('\n').filter(l => l.startsWith('Warning:') && !l.includes('no timetable before'));
    for (const l of summaries) console.log(`M${w.n} (${saturday}) ${l}`);
    for (const l of warnings) console.log(`M${w.n}   ${l}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
