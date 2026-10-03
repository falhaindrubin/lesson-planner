// Renderer RPT: Markdown (untuk semakan / git diff) dan HTML boleh cetak (A4 landskap).
const { fmtDate, fmtRange } = require('../util');

function catatan(r, p) {
  const c = [];
  const byNama = new Map();
  for (const d of r.cuti) byNama.set(d.cuti, [...(byNama.get(d.cuti) || []), d.date]);
  for (const [nama, dates] of byNama) c.push(`${dates.map(fmtDate).join(', ')}: ${nama}`);
  const exams = [...new Set(r.exam.flatMap(d => d.exam.filter(e => e.forms.includes(p.tingkatan)).map(e => e.nama)))];
  if (exams.length) c.push(`Peperiksaan: ${exams.join(', ')}`);
  if (r.n <= p.tamat && r.pdp > 0 && r.pdp < 5) c.push(`${r.pdp}/5 hari PdP`);
  return c;
}

function label(r, p) {
  if (r.sp.length) return null;
  if (r.exam.length && !r.pdp) return 'PEPERIKSAAN';
  if (!r.pdp) return 'CUTI — TIADA PdP';
  const lastExam = Math.max(0, ...p.rows.filter(x => x.exam.length).map(x => x.n));
  if (r.n > p.tamat) return r.n < lastExam ? 'ULANG KAJI & PENGUKUHAN' : 'PASCA PEPERIKSAAN';
  return '';
}

function rowsOut(p) {
  const brk = p.breaks;
  const out = [];
  for (const r of p.rows) {
    const bidang = [...new Map(r.sp.map(s => [s.bidang.code, s.bidang])).values()];
    const sk = [...new Map(r.sp.map(s => [s.sk.code, s.sk])).values()];
    out.push({
      minggu: `M${r.n}`, tarikh: fmtRange(r.mula, r.akhir), label: label(r, p),
      tajuk: bidang.map(b => `${b.code} ${b.title}`),
      sk: sk.map(s => `${s.code} ${s.title}`),
      sp: r.sp.map(s => `${s.code} ${s.text}${s.samb ? ' (samb.)' : ''}`),
      catatan: catatan(r, p),
    });
    for (const b of brk.filter(b => b.selepas === r.n))
      out.push({ minggu: '', tarikh: fmtRange(b.mula, b.akhir), label: b.nama, tajuk: [], sk: [], sp: [], catatan: [] });
  }
  return out;
}

function ringkasan(p) {
  const byBidang = new Map();
  for (const s of p.rated) {
    const x = byBidang.get(s.bidang.code) || { bidang: s.bidang, sp: 0, nilai: 0, panjang: 0, minggu: new Set() };
    x.sp++; x.nilai += s.nilai; x.panjang += s.panjang; s.minggu.forEach(m => x.minggu.add(m));
    byBidang.set(s.bidang.code, x);
  }
  return [...byBidang.values()].map(x => ({
    tajuk: `${x.bidang.code} ${x.bidang.title}`, sp: x.sp, nilai: x.nilai,
    mingguSetara: x.panjang.toFixed(1) + (p.tetap.has(x.bidang.code) ? ' (tetap)' : ''),
    minggu: `M${Math.min(...x.minggu)}–M${Math.max(...x.minggu)}`,
  }));
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mdCell = a => a.map(s => s.replace(/\|/g, '\\|')).join('<br>');

// Ringkasan peraturan agihan untuk kepala RPT
function aturan(p) {
  const a = [`Sukatan tamat: M${p.tamat} · ${p.rated.length} SP · ${p.jumlahKapasiti} minggu PdP`];
  if (p.ppt) a.push(`Tajuk ${p.parts[0].tajuk[0]}–${p.parts[0].tajuk[p.parts[0].tajuk.length - 1]} selesai sebelum ${p.ppt.nama} (M${p.ppt.mula})`);
  const akhir = p.exams[p.exams.length - 1];
  if (akhir && akhir.mula - 1 > p.tamat)
    a.push(`Ulang kaji M${p.tamat + 1}–M${akhir.mula - 1} sebelum ${akhir.nama} (M${akhir.mula})`);
  return a;
}

function renderMd(p, meta) {
  const L = [`# RPT ${meta.subjek} Tingkatan ${p.tingkatan} ${meta.tahun}`, ''];
  L.push(`- Sumber: \`${meta.dskp}\`, \`${meta.takwim}\`, \`${meta.kesukaran}\``);
  L.push(...aturan(p).map(x => `- ${x}`));
  L.push('', '## Ringkasan', '', '| Tajuk | SP | Kesukaran | Agihan (minggu) | Minggu takwim |', '|---|---|---|---|---|');
  for (const x of ringkasan(p)) L.push(`| ${x.tajuk} | ${x.sp} | ${x.nilai} | ${x.mingguSetara} | ${x.minggu} |`);
  L.push('', '## Rancangan', '', '| Minggu | Tarikh | Tajuk | Standard Kandungan | Standard Pembelajaran | Catatan |', '|---|---|---|---|---|---|');
  for (const r of rowsOut(p)) {
    const tajuk = r.label != null ? (r.label ? `**${r.label}**` : '') : mdCell(r.tajuk);
    L.push(`| ${r.minggu} | ${r.tarikh} | ${tajuk} | ${mdCell(r.sk)} | ${mdCell(r.sp)} | ${mdCell(r.catatan)} |`);
  }
  if (p.warnings.length) L.push('', '## Amaran', '', ...p.warnings.map(w => `- ${w}`));
  return L.join('\n') + '\n';
}

function renderHtml(p, meta) {
  const title = `RPT ${meta.subjek} Tingkatan ${p.tingkatan} ${meta.tahun}`;
  const td = a => `<td>${a.map(esc).join('<br>')}</td>`;
  const body = rowsOut(p).map(r => r.label != null
    ? `<tr class="${r.minggu ? 'kosong' : 'cuti'}"><td>${esc(r.minggu)}</td><td>${esc(r.tarikh)}</td><td colspan="3"><b>${esc(r.label)}</b></td>${td(r.catatan)}</tr>`
    : `<tr><td>${esc(r.minggu)}</td><td>${esc(r.tarikh)}</td>${td(r.tajuk)}${td(r.sk)}${td(r.sp)}${td(r.catatan)}</tr>`).join('\n');
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
<p class="meta">${aturan(p).map(esc).join('<br>')}</p>
<table><thead><tr><th>Minggu</th><th>Tarikh</th><th>Tajuk</th><th>Standard Kandungan</th><th>Standard Pembelajaran</th><th>Catatan</th></tr></thead>
<tbody>
${body}
</tbody></table></body></html>
`;
}

module.exports = { rowsOut, ringkasan, aturan, renderMd, renderHtml };
