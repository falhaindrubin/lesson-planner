// RPH renderer: one A4 page per PdP, laid out like the Google Sheets RPH
// (sample/2026 - ASK T1 - Google Sheets M34A.pdf). Cancelled PdP are not printed.
// No "continued" mark: an SP that spans PdP is written normally on every PdP.
// Everything printed is Malay file content and stays as it is.
import { periodRange, range, periodStart, clock24, fmtDateDmy } from '../util.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const uniq = xs => [...new Map(xs.map(x => [x.code, x])).values()];

function content(row, sp) {
  const byCode = new Map(sp.map(s => [s.code, s]));
  const revision = row.sp.length > 0 && row.sp.every(c => /\.0$/.test(c));
  const list = revision ? sp.filter(s => row.sp.includes(s.topic.code)) : row.sp.map(c => byCode.get(c)).filter(Boolean);
  return {
    revision,
    topics: uniq(list.map(s => s.topic)).map(b => `${b.code} ${b.title.toUpperCase()}`),
    sk: uniq(list.map(s => s.sk)).map(s => `${s.code} ${s.title}`),
    sp: list.map(s => `${s.code} ${s.text}`),
  };
}

function page({ year, week, teacher, cls, row, sp, activities }) {
  const exam = row.kind === 'peperiksaan';
  const c = content(row, sp);
  const [a, b] = periodRange(row.periods);
  const times = range(a, b).map(p => `${clock24(periodStart(p))} - ${clock24(periodStart(p + 1))}`);
  const lines = [
    ['NAMA GURU', [teacher || '']],
    ['MATA PELAJARAN', [cls.subjectName + (row.kind === 'tutorial' ? ' (TUTORIAL)' : '')]],
    ['MINGGU / TARIKH / HARI', [`${row.week} ${fmtDateDmy(row.date)} ${row.dayName.toUpperCase()}`]],
    ['TINGKATAN', [cls.fullName]],
    ['MASA', times],
    ['KEHADIRAN', [`${row.attendance == null ? '' : row.attendance} / ${cls.pupils}`]],
  ];
  if (row.event) lines.push(['CATATAN', [exam ? `Peperiksaan: ${row.event}` : `Hari acara: ${row.event}`]]);
  if (exam) lines.push(['TAJUK', ['PEPERIKSAAN']]);
  else {
    const t = (c.revision ? 'ULANG KAJI: ' : '') + c.topics.join(' / ');
    const p = row.minutes - 10;
    const mark = (on, text) => `${on ? '☑' : '☐'} ${text}`;
    const postponed = row.status === 'ditunda';
    lines.push(
      ['TAJUK', [t]],
      ['STANDARD KANDUNGAN', c.sk],
      ['STANDARD PEMBELAJARAN', c.sp],
      ['OBJEKTIF PEMBELAJARAN', ['Murid dapat:', '', ...c.sp]],
      ['RINGKASAN AKTIVITI', [
        'Permulaan: (5 minit)', ...activities.opening.map(x => `- ${x}`), '',
        `Perkembangan: (${p} minit)`, ...activities.development.map(x => `- ${x}`), '',
        'Penutup: (5 minit)', ...activities.closing.map(x => `- ${x}`),
      ]],
      ['REFLEKSI', [
        mark(!postponed, 'Objektif tercapai. Semua murid mampu menguasai kemahiran yang dipelajari.'),
        mark(false, 'Objektif tercapai oleh ___ orang murid sahaja. ___ orang murid diberikan latihan pengukuhan.'),
        mark(postponed, `PdP ditunda kerana: ${postponed ? row.note : ''}`),
        ...(!postponed && row.note ? ['', row.note] : []),
      ]],
    );
  }
  const tr = lines.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${v.map(x => (x ? esc(x) : '&nbsp;')).join('<br>')}</td></tr>`).join('\n');
  return `<section class="rph">
<div class="kepala"><span>${esc(`${year} - ${cls.subject} T${cls.form}`)}</span><span>M${week}</span></div>
<h1>RANCANGAN PENGAJARAN HARIAN</h1>
<table>
${tr}
</table>
</section>`;
}

function renderRph({ year, week, teacher, pages }) {
  const subject = pages.length ? pages[0].cls.subject : '';
  const body = pages.filter(p => p.row.status !== 'batal').map(p => page({ year, week, teacher, ...p })).join('\n');
  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${esc(`RPH ${year} ${subject} M${week}`)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font: 10pt/1.35 Arial, sans-serif; color: #000; background: #fff; margin: 16px; }
.rph { break-after: page; page-break-after: always; }
.rph:last-child { break-after: auto; page-break-after: auto; }
tr { break-inside: avoid; page-break-inside: avoid; }
.kepala { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 8px; }
h1 { font-size: 13pt; text-align: center; margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; text-align: left; }
th { width: 30%; background: #eee; font-weight: bold; }
</style></head><body>
${body}
</body></html>
`;
}

export { renderRph, content };
