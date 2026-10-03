// RPT renderer: Markdown (for review / git diff) and printable HTML (A4 landscape).
// Everything written into the files stays Malay; only names in the code are English.
import { fmtDate, fmtRange } from '../util.js';

function notes(r, p) {
  const c = [];
  const byName = new Map();
  for (const d of r.holidayDays) byName.set(d.holiday, [...(byName.get(d.holiday) || []), d.date]);
  for (const [name, dates] of byName) c.push(`${dates.map(fmtDate).join(', ')}: ${name}`);
  const exams = [...new Set(r.examDays.flatMap(d => d.exams.filter(e => e.forms.includes(p.form)).map(e => e.name)))];
  if (exams.length) c.push(`Peperiksaan: ${exams.join(', ')}`);
  if (r.n <= p.end && r.pdp > 0 && r.pdp < 5) c.push(`${r.pdp}/5 hari PdP`);
  return c;
}

function label(r, p) {
  if (r.sp.length) return null;
  if (r.examDays.length && !r.pdp) return 'PEPERIKSAAN';
  if (!r.pdp) return 'CUTI — TIADA PdP';
  const lastExam = Math.max(0, ...p.rows.filter(x => x.examDays.length).map(x => x.n));
  if (r.n > p.end) return r.n < lastExam ? 'ULANG KAJI & PENGUKUHAN' : 'PASCA PEPERIKSAAN';
  return '';
}

function rowsOut(p) {
  const brk = p.breaks;
  const out = [];
  for (const r of p.rows) {
    const topics = [...new Map(r.sp.map(s => [s.topic.code, s.topic])).values()];
    const sk = [...new Map(r.sp.map(s => [s.sk.code, s.sk])).values()];
    out.push({
      week: `M${r.n}`, dates: fmtRange(r.start, r.end), label: label(r, p),
      topics: topics.map(b => `${b.code} ${b.title}`),
      sk: sk.map(s => `${s.code} ${s.title}`),
      sp: r.sp.map(s => `${s.code} ${s.text}${s.cont ? ' (samb.)' : ''}`),
      notes: notes(r, p),
    });
    for (const b of brk.filter(b => b.after === r.n))
      out.push({ week: '', dates: fmtRange(b.start, b.end), label: b.name, topics: [], sk: [], sp: [], notes: [] });
  }
  return out;
}

function summary(p) {
  const byTopic = new Map();
  for (const s of p.rated) {
    const x = byTopic.get(s.topic.code) || { topic: s.topic, sp: 0, value: 0, length: 0, weeks: new Set() };
    x.sp++; x.value += s.value; x.length += s.length; s.weeks.forEach(m => x.weeks.add(m));
    byTopic.set(s.topic.code, x);
  }
  return [...byTopic.values()].map(x => ({
    topic: `${x.topic.code} ${x.topic.title}`, sp: x.sp, value: x.value,
    equivalentWeeks: x.length.toFixed(1) + (p.fixed.has(x.topic.code) ? ' (tetap)' : ''),
    weeks: `M${Math.min(...x.weeks)}–M${Math.max(...x.weeks)}`,
  }));
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mdCell = a => a.map(s => s.replace(/\|/g, '\\|')).join('<br>');

// Summary of the spreading rules for the RPT's header
function rules(p) {
  const a = [`Sukatan tamat: M${p.end} · ${p.rated.length} SP · ${p.totalCapacity} minggu PdP`];
  if (p.midYear) a.push(`Tajuk ${p.parts[0].topics[0]}–${p.parts[0].topics[p.parts[0].topics.length - 1]} selesai sebelum ${p.midYear.name} (M${p.midYear.start})`);
  const last = p.exams[p.exams.length - 1];
  if (last && last.start - 1 > p.end)
    a.push(`Ulang kaji M${p.end + 1}–M${last.start - 1} sebelum ${last.name} (M${last.start})`);
  return a;
}

function renderMd(p, meta) {
  const L = [`# RPT ${meta.subject} Tingkatan ${p.form} ${meta.year}`, ''];
  L.push(`- Sumber: \`${meta.dskp}\`, \`${meta.takwim}\`, \`${meta.difficulty}\``);
  L.push(...rules(p).map(x => `- ${x}`));
  L.push('', '## Ringkasan', '', '| Tajuk | SP | Kesukaran | Agihan (minggu) | Minggu takwim |', '|---|---|---|---|---|');
  for (const x of summary(p)) L.push(`| ${x.topic} | ${x.sp} | ${x.value} | ${x.equivalentWeeks} | ${x.weeks} |`);
  L.push('', '## Rancangan', '', '| Minggu | Tarikh | Tajuk | Standard Kandungan | Standard Pembelajaran | Catatan |', '|---|---|---|---|---|---|');
  for (const r of rowsOut(p)) {
    const topic = r.label != null ? (r.label ? `**${r.label}**` : '') : mdCell(r.topics);
    L.push(`| ${r.week} | ${r.dates} | ${topic} | ${mdCell(r.sk)} | ${mdCell(r.sp)} | ${mdCell(r.notes)} |`);
  }
  L.push('', '## Peruntukan SP', '', 'Minggu takwim bagi setiap SP. Dibaca oleh penjana RPH untuk menentukan masa setiap SP.', '', '| SP | Minggu |', '|---|---|');
  for (const s of p.rated) L.push(`| ${s.code} | ${s.length.toFixed(3)} |`);
  if (p.warnings.length) L.push('', '## Amaran', '', ...p.warnings.map(w => `- ${w}`));
  return L.join('\n') + '\n';
}

function renderHtml(p, meta) {
  const title = `RPT ${meta.subject} Tingkatan ${p.form} ${meta.year}`;
  const td = a => `<td>${a.map(esc).join('<br>')}</td>`;
  const body = rowsOut(p).map(r => r.label != null
    ? `<tr class="${r.week ? 'kosong' : 'cuti'}"><td>${esc(r.week)}</td><td>${esc(r.dates)}</td><td colspan="3"><b>${esc(r.label)}</b></td>${td(r.notes)}</tr>`
    : `<tr><td>${esc(r.week)}</td><td>${esc(r.dates)}</td>${td(r.topics)}${td(r.sk)}${td(r.sp)}${td(r.notes)}</tr>`).join('\n');
  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
body { font: 10pt/1.35 Arial, sans-serif; color: #000; background: #fff; margin: 16px; }
h1 { font-size: 14pt; text-align: center; margin: 0 0 4px; }
p.meta { text-align: center; margin: 0 0 10px; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; text-align: left; }
th { background: #ddd; }
tr { break-inside: avoid; }
tr.cuti td { background: #eee; text-align: center; }
tr.kosong td { background: #f6f6f6; }
td:nth-child(1), td:nth-child(2) { white-space: nowrap; }
</style></head><body>
<h1>${esc(title)}</h1>
<p class="meta">${rules(p).map(esc).join('<br>')}</p>
<table><thead><tr><th>Minggu</th><th>Tarikh</th><th>Tajuk</th><th>Standard Kandungan</th><th>Standard Pembelajaran</th><th>Catatan</th></tr></thead>
<tbody>
${body}
</tbody></table></body></html>
`;
}

export { rowsOut, summary, rules, renderMd, renderHtml };
