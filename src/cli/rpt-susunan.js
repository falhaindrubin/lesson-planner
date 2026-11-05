// RPT of PJ and PK from the teacher's own week-by-week order (not spread by difficulty).
// One block per row; a week can hold several blocks; PK and PJ are stacked inside the week.
//
//   node src/cli/rpt-susunan.js --takwim sample/takwim-smly-2026.md --form 2 --susunan sample/susunan-pjpk-t2.md \
//     --pj sample/dskp-pj-t2.md --pk sample/dskp-pk-t2.md --out output/rpt-pjpk-t2-2026

import fs from 'node:fs';
import path from 'node:path';
import * as C from '../core/index.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// DSKP -> Map(topic code -> { title, sp: Map(DSKP code -> { text, sk }) }); PJ keeps the DSKP code in "[x.y.z] text" / "(x.y)"
function index(md) {
  const out = new Map();
  for (const s of C.parseDskp(md)) {
    const t = out.get(s.topic.code) || { title: s.topic.title, sp: new Map() };
    const m = s.text.match(/^\[(\d+\.\d+\.\d+)\] (.+)/);
    const skm = s.sk.title.match(/^(.*) \((\d+\.\d+)\)$/);
    t.sp.set(m ? m[1] : s.code, { text: m ? m[2] : s.text, sk: skm ? `${skm[2]} ${skm[1]}` : `${s.sk.code} ${s.sk.title}` });
    out.set(s.topic.code, t);
  }
  return out;
}

function parseSusunan(md) {
  return md.split(/\r?\n/).filter(l => /^\| *\d{4}-\d\d-\d\d /.test(l)).map(l => {
    const [date, bidang, tajuk, sp] = C.cells(l);
    return { date, bidang, tajuk, sp: sp.split(';').map(x => x.trim()).filter(Boolean) };
  });
}

function block(b, dskp) {
  const free = b.tajuk.startsWith('*');
  const topic = free ? null : dskp[b.bidang].get(b.tajuk);
  if (!free && !topic) throw new Error(`${b.date} ${b.bidang}: tajuk ${b.tajuk} tiada dalam DSKP`);
  const sks = new Set(), sp = [];
  for (const x of b.sp) {
    const [code, own] = x.split(/ = /);
    let hit = own ? { text: own, sk: null } : (topic || [...dskp.PJ.values()].find(t => t.sp.has(code)) || { sp: new Map() }).sp.get(code);
    if (!hit) throw new Error(`${b.date} ${b.bidang} ${b.tajuk}: SP ${code} tiada dalam DSKP`);
    if (hit.sk) sks.add(hit.sk);
    sp.push(`${code} ${hit.text}`);
  }
  return { bidang: b.bidang, tajuk: free ? b.tajuk.slice(1) : topic.title, sk: [...sks], sp };
}

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  for (const k of ['takwim', 'form', 'susunan', 'pj', 'pk', 'out']) if (!a[k]) throw new Error(`--${k} is required`);
  const read = f => fs.readFileSync(f, 'utf8');
  const takwimMd = read(a.takwim), year = (takwimMd.match(/\| (\d{4})-\d\d-\d\d/) || [])[1];
  const cal = C.buildCalendar(C.parseTakwim(takwimMd)), form = Number(a.form);
  const dskp = { PJ: index(read(a.pj)), PK: index(read(a.pk)) };
  const blocks = parseSusunan(read(a.susunan)).map(b => ({ ...b, ...block(b, dskp) }));

  const lastDate = blocks.reduce((m, b) => (b.date > m ? b.date : m), '');
  const rows = [];
  const brk = C.breaks(cal);
  for (const w of cal.weeks) {
    const r = C.weekFor(w, form);
    const mine = blocks.filter(b => b.date >= r.start && b.date <= r.end).sort((x, y) => (x.bidang < y.bidang ? 1 : x.bidang > y.bidang ? -1 : 0)); // PK before PJ, as in the RPT
    const label = mine.length ? null : r.examDays.length && !r.pdp ? 'PEPERIKSAAN' : !r.pdp ? 'CUTI — TIADA PdP' : r.start > lastDate ? 'ULANG KAJI' : 'TIADA PdP DIRANCANG';
    rows.push({ week: `M${r.n}`, dates: C.fmtRange(r.start, r.end), blocks: mine, label });
    for (const b of brk.filter(b => b.after === r.n)) rows.push({ week: '', dates: C.fmtRange(b.start, b.end), blocks: [], label: b.name, gap: true });
  }
  const title = `RPT Pendidikan Jasmani dan Pendidikan Kesihatan Tingkatan ${form} ${year}`;
  const head = ['Minggu', 'Tarikh', 'Bidang', 'Tajuk / Standard Kandungan', 'Standard Pembelajaran'];

  const md = [`# ${title}`, '', `- Sumber: \`${a.susunan}\`, \`${a.pj}\`, \`${a.pk}\`, \`${a.takwim}\``, '', `| ${head.join(' | ')} |`, '|---|---|---|---|---|'];
  const cell = x => x.map(s => s.replace(/\|/g, '\\|')).join('<br>');
  for (const r of rows) {
    if (r.label) md.push(`| ${r.week} | ${r.dates} | **${r.label}** | | |`);
    else r.blocks.forEach((b, i) => md.push(`| ${i ? '' : r.week} | ${i ? '' : r.dates} | ${b.bidang} | **${b.tajuk}**<br>${cell(b.sk)} | ${cell(b.sp)} |`));
  }
  const html = rows.map(r => r.label
    ? `<tr class="${r.gap ? 'cuti' : 'kosong'}"><td>${esc(r.week)}</td><td>${esc(r.dates)}</td><td colspan="3"><b>${esc(r.label)}</b></td></tr>`
    : r.blocks.map((b, i) => `<tr>${i ? '' : `<td rowspan="${r.blocks.length}">${esc(r.week)}</td><td rowspan="${r.blocks.length}">${esc(r.dates)}</td>`}<td>${b.bidang}</td><td><b>${esc(b.tajuk)}</b><br>${b.sk.map(esc).join('<br>')}</td><td>${b.sp.map(esc).join('<br>')}</td></tr>`).join('\n')).join('\n');
  const page = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
body { font: 9.5pt/1.3 Arial, sans-serif; color: #000; background: #fff; margin: 16px; }
h1 { font-size: 13pt; text-align: center; margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; text-align: left; }
th { background: #ddd; }
tr { break-inside: avoid; }
tr.cuti td { background: #eee; text-align: center; }
tr.kosong td { background: #f6f6f6; }
td:nth-child(1), td:nth-child(2) { white-space: nowrap; }
</style></head><body>
<h1>${esc(title)}</h1>
<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>
${html}
</tbody></table></body></html>
`;
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  fs.writeFileSync(a.out + '.md', md.join('\n') + '\n');
  fs.writeFileSync(a.out + '.html', page);
  console.log(`${a.out}.md, ${a.out}.html (${blocks.length} blok)`);
}

main(process.argv.slice(2));
