// kelas-<year>.md -> { year, teacher, takwim, timetables: [file], events, rekod, output, classes: [row] }
// One row = one class × subject. File paths are relative to the class file's folder.
import { cells } from '../util.js';

const HEADERS = ['Tahun', 'Guru', 'Takwim', 'Jadual', 'Acara', 'Rekod', 'Output'];
const REQUIRED = HEADERS.filter(h => h !== 'Guru'); // the teacher's name may come from the app's Profile instead
const COLUMNS = ['Kelas', 'Nama penuh', 'Tingkatan', 'Subjek', 'Nama subjek', 'DSKP', 'Aktiviti', 'RPT', 'Tutorial', 'Bil. murid', 'Mula'];

function parseClasses(md, file = 'classes') {
  const meta = {};
  const classes = [];
  md.split(/\r?\n/).forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    const m = line.match(/^- (\w+): *(.*)$/);
    if (m && HEADERS.includes(m[1])) { meta[m[1]] = m[2].trim(); return; }
    if (!/^\|/.test(line) || /^\| *(Kelas|-)/.test(line)) return;
    const c = cells(line);
    if (c.length !== COLUMNS.length) throw new Error(`${at}: needs ${COLUMNS.length} columns (${COLUMNS.join(', ')}), has ${c.length}`);
    const [classCode, fullName, form, subject, subjectName, dskp, activities, rpt, tutorial, pupils, start] = c;
    if (!/^[1-5]$/.test(form)) throw new Error(`${at}: Tingkatan "${form}" is not 1–5`);
    if (!classCode || !subject || !fullName || !subjectName) throw new Error(`${at}: Kelas, Nama penuh, Subjek and Nama subjek are required`);
    if (!activities) throw new Error(`${at}: Aktiviti is required (an activities template file)`);
    if (pupils && !/^\d+$/.test(pupils)) throw new Error(`${at}: Bil. murid "${pupils}" is not a number`);
    classes.push({
      classCode, fullName, form: Number(form), subject, subjectName, dskp, activities, rpt, tutorial,
      pupils: pupils ? Number(pupils) : null, start, line: i + 1,
    });
  });
  for (const h of REQUIRED) if (!meta[h]) throw new Error(`${file}: missing line "- ${h}: …"`);
  if (!/^\d{4}$/.test(meta.Tahun)) throw new Error(`${file}: Tahun "${meta.Tahun}" is not a year`);
  if (!classes.length) throw new Error(`${file}: no class rows`);
  return {
    year: Number(meta.Tahun), teacher: meta.Guru || '', takwim: meta.Takwim,
    timetables: meta.Jadual.split(',').map(s => s.trim()).filter(Boolean),
    events: meta.Acara, rekod: meta.Rekod, output: meta.Output, classes,
  };
}

export { parseClasses };
