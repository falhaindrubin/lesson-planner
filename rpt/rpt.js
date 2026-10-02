// Jana RPT (Rancangan Pengajaran Tahunan) satu subjek daripada DSKP.md, Takwim.md
// dan fail kesukaran SP. SP diagihkan ikut kesukaran ke atas minggu PdP sebenar
// (tolak cuti dan peperiksaan tingkatan itu) sehingga minggu tamat sukatan.
//
//   node rpt/rpt.js --dskp sample/dskp-mat-t4.md --takwim sample/takwim-smly-2026.md \
//     --kesukaran rpt/kesukaran-mat-t4.md --tingkatan 4 --out output/rpt-mat-t4-2026
//
// Lalai: sukatan tamat sebelum peperiksaan akhir tingkatan itu (PAT / UASA; Percubaan SPM
// bagi Tingkatan 5), tolak minggu ulang kaji.
// --ulang-kaji <n>    minggu ulang kaji sebelum peperiksaan akhir (lalai 2, semua tingkatan)
// --tamat <minggu>    tetapkan minggu terakhir sukatan secara manual

const fs = require('fs');
const path = require('path');

// Entri Cuti / Perayaan pada hari bekerja yang BUKAN cuti di Sabah
const BUKAN_CUTI = [/HARI SARAWAK/i];
const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const HARI_BEKERJA = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];

function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
}

// DSKP.md -> [{ bidang, sk, code, text }]
function parseDskp(md) {
  const sp = [];
  let bidang = null, sk = null;
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^## (\d+\.0) (.+)/))) bidang = { code: m[1], title: m[2].trim() };
    else if ((m = line.match(/^### (\d+\.\d+) (.+)/))) sk = { code: m[1], title: m[2].trim() };
    else if ((m = line.match(/^\| *(\d+\.\d+\.\d+) *\|/))) {
      if (!sk || !m[1].startsWith(sk.code + '.')) throw new Error(`SP ${m[1]} di luar SK ${sk && sk.code}`);
      sp.push({ bidang, sk, code: m[1], text: cells(line)[1] });
    }
  }
  if (!sp.length) throw new Error('Tiada SP dalam DSKP');
  return sp;
}

// Fail kesukaran -> { sp: Map(code -> { nilai, sebab }), tajuk: Map('10.0' -> minggu tetap) }
function parseKesukaran(md) {
  const sp = new Map(), tajuk = new Map();
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\| *(\d+\.\d+\.\d+) *\| *([1-3]) *\|/)))
      sp.set(m[1], { nilai: Number(m[2]), sebab: cells(line)[2] || '' });
    else if ((m = line.match(/^\| *(\d+\.0) *\| *(\d+(?:\.\d+)?) *\|/))) tajuk.set(m[1], Number(m[2]));
  }
  return { sp, tajuk };
}

// Peperiksaan dalam lajur Kurikulum -> senarai tingkatan yang terlibat
function examForms(item) {
  let m;
  if ((m = item.match(/^PPT T(\d) *- *(\d)/i))) return range(+m[1], +m[2]);
  if (/^UBB/i.test(item)) return []; // UBBM/UBBI: subjek bahasa sahaja
  const f = [];
  if (/PAT TING\. ?4/i.test(item)) f.push(4);
  if (/UASA/i.test(item)) f.push(1, 2, 3);
  if (/PERCUBAAN SPM/i.test(item)) f.push(5);
  return f;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Takwim.md -> [{ n, mula, days: [{ date, hari, cuti, exam }] }] (hari bekerja sahaja)
// dan cuti penggal di antara minggu.
function parseTakwim(md) {
  const weeks = [];
  const gaps = []; // hari bekerja di luar minggu persekolahan
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\| *(M\d+)? *\| *\d{4}-\d\d-\d\d/.test(line)) continue;
    const [minggu, date, hari, cuti, , kurikulum] = cells(line);
    if (minggu) weeks.push((cur = { n: Number(minggu.slice(1)), mula: date, days: [] }));
    if (!HARI_BEKERJA.includes(hari)) continue;
    const inWeek = cur && daysBetween(cur.mula, date) < 5;
    const exam = kurikulum.split(';').map(s => s.trim()).filter(s => examForms(s).length)
      .map(s => ({ nama: s, forms: examForms(s) }));
    const d = { date, hari, cuti: cuti && !BUKAN_CUTI.some(re => re.test(cuti)) ? cuti : '', exam };
    (inWeek ? cur.days : gaps).push(d);
  }
  return { weeks, gaps };
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
function fmtDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${BULAN[m - 1]}`;
}
function fmtRange(a, b) {
  const [, ma] = a.split('-'), [, mb] = b.split('-');
  return ma === mb ? `${Number(a.slice(8))}–${fmtDate(b)}` : `${fmtDate(a)} – ${fmtDate(b)}`;
}

// Agih SP ke atas minggu takwim. Setiap minggu yang ada sekurang-kurangnya satu hari PdP
// = 1 minggu (minggu cuti penuh / peperiksaan penuh = 0).
// - Separuh pertama tajuk (dibundarkan ke atas) mesti selesai sebelum peperiksaan
//   pertengahan tahun (PPT); separuh lagi selepasnya.
// - Dalam setiap bahagian, tajuk yang ada minggu tetap mengambil kapasiti itu; tajuk lain
//   berkongsi baki ikut kesukaran SP.
// SP disenaraikan dalam minggu yang bertindih sekurang-kurangnya MIN_OVERLAP minggu,
// atau minggu tindihan terbesarnya.
const MIN_OVERLAP = 0.2;
const ULANG_KAJI = 2; // minggu ulang kaji sebelum peperiksaan akhir (bagi tamat 'akhir')

// Blok peperiksaan tingkatan itu -> [{ mula, akhir, nama }] (nombor minggu)
function examBlocks(takwim, tingkatan) {
  const blocks = [];
  for (const w of takwim.weeks) {
    const names = w.days.filter(d => !d.cuti).flatMap(d => d.exam.filter(e => e.forms.includes(tingkatan)).map(e => e.nama));
    if (!names.length) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.akhir === w.n - 1) last.akhir = w.n;
    else blocks.push({ mula: w.n, akhir: w.n, nama: names[0] });
  }
  return blocks;
}

function plan({ sp, kesukaran, takwim, tingkatan, tamat = 'akhir', ulangKaji = ULANG_KAJI }) {
  const warnings = [];
  const rated = sp.map(s => {
    const k = kesukaran.sp.get(s.code);
    if (!k) warnings.push(`Tiada kesukaran untuk SP ${s.code}; guna 2`);
    return { ...s, nilai: k ? k.nilai : 2, sebab: k ? k.sebab : '' };
  });
  for (const code of kesukaran.sp.keys())
    if (!sp.some(s => s.code === code)) warnings.push(`Kesukaran untuk SP ${code} tiada dalam DSKP`);
  for (const code of kesukaran.tajuk.keys())
    if (!sp.some(s => s.bidang.code === code)) warnings.push(`Minggu tetap untuk tajuk ${code} tiada dalam DSKP`);

  const exams = examBlocks(takwim, tingkatan);
  // 'akhir' = sebelum peperiksaan akhir tahun, tolak minggu ulang kaji
  if (tamat === 'akhir') {
    if (!exams.length) throw new Error(`Tiada peperiksaan untuk Tingkatan ${tingkatan} dalam takwim`);
    tamat = exams[exams.length - 1].mula - 1 - ulangKaji;
  }

  const rows = takwim.weeks.map(w => {
    const cuti = w.days.filter(d => d.cuti);
    const exam = w.days.filter(d => !d.cuti && d.exam.some(e => e.forms.includes(tingkatan)));
    const pdp = w.days.filter(d => !d.cuti && !exam.includes(d)).length;
    return {
      n: w.n, mula: w.days[0].date, akhir: w.days[w.days.length - 1].date,
      cuti, exam, pdp, kapasiti: w.n <= tamat && pdp > 0 ? 1 : 0, sp: [],
    };
  });

  const jumlahKapasiti = rows.reduce((a, r) => a + r.kapasiti, 0);
  const jumlahNilai = rated.reduce((a, s) => a + s.nilai, 0);
  if (!jumlahKapasiti) throw new Error('Tiada minggu PdP sebelum minggu tamat sukatan');
  const kapasitiHingga = n => rows.filter(r => r.n <= n).reduce((a, r) => a + r.kapasiti, 0);

  // Bahagian: [tajuk sebelum PPT] dan [tajuk selepas PPT], jika PPT jatuh sebelum tamat
  const tajuk = [...new Set(rated.map(s => s.bidang.code))];
  const ppt = exams.length > 1 && exams[0].mula <= tamat ? exams[0] : null;
  const potong = ppt ? Math.ceil(tajuk.length / 2) : tajuk.length;
  const parts = [
    { tajuk: tajuk.slice(0, potong), mula: 0, akhir: ppt ? kapasitiHingga(ppt.mula - 1) : jumlahKapasiti },
    { tajuk: tajuk.slice(potong), mula: ppt ? kapasitiHingga(ppt.mula - 1) : jumlahKapasiti, akhir: jumlahKapasiti },
  ].filter(p => p.tajuk.length);

  // Panjang setiap SP (dalam minggu takwim)
  for (const p of parts) {
    const sps = rated.filter(s => p.tajuk.includes(s.bidang.code));
    const tetap = p.tajuk.filter(t => kesukaran.tajuk.has(t));
    const kapasitiTetap = tetap.reduce((a, t) => a + kesukaran.tajuk.get(t), 0);
    const bebas = sps.filter(s => !tetap.includes(s.bidang.code));
    const baki = p.akhir - p.mula - kapasitiTetap;
    if (baki < 0 || (baki === 0 && bebas.length)) throw new Error(`Minggu tetap (${kapasitiTetap}) melebihi kapasiti bahagian ${p.tajuk[0]}–${p.tajuk[p.tajuk.length - 1]} (${(p.akhir - p.mula).toFixed(1)})`);
    const skala = baki / (bebas.reduce((a, s) => a + s.nilai, 0) || 1);
    for (const s of sps) {
      const t = s.bidang.code;
      s.panjang = tetap.includes(t)
        ? kesukaran.tajuk.get(t) * s.nilai / sps.filter(x => x.bidang.code === t).reduce((a, x) => a + x.nilai, 0)
        : s.nilai * skala;
    }
  }

  // Kapasiti terkumpul pada awal setiap minggu
  let c = 0;
  const bounds = rows.map(r => { const b = [c, c + r.kapasiti]; c += r.kapasiti; return b; });
  let pos = 0;
  for (const s of rated) {
    const a = pos, b = (pos += s.panjang);
    const overlaps = bounds.map(([x, y], i) => ({ i, o: Math.min(b, y) - Math.max(a, x) })).filter(o => o.o > 1e-9);
    const best = overlaps.reduce((p, q) => (q.o > p.o ? q : p));
    const chosen = overlaps.filter(o => o.o >= MIN_OVERLAP - 1e-9 || o === best);
    chosen.forEach((o, k) => rows[o.i].sp.push({ ...s, samb: k > 0 }));
    s.minggu = chosen.map(o => rows[o.i].n);
  }

  return { rows, rated, gaps: takwim.gaps, tamat, tingkatan, jumlahKapasiti, jumlahNilai, warnings, exams, ppt, parts, tetap: kesukaran.tajuk };
}

// Cuti penggal di antara dua minggu -> { selepas: n, mula, akhir, nama }
function breaks(p) {
  const out = [];
  for (const d of p.gaps) {
    const prev = [...p.rows].reverse().find(r => r.mula < d.date);
    if (!prev) continue;
    const last = out[out.length - 1];
    if (last && last.selepas === prev.n) last.akhir = d.date;
    else out.push({ selepas: prev.n, mula: d.date, akhir: d.date, nama: d.cuti.split(';')[0].trim() || 'CUTI' });
  }
  return out;
}

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
  const brk = breaks(p);
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

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  for (const k of ['dskp', 'takwim', 'kesukaran', 'tingkatan', 'out'])
    if (!a[k]) throw new Error(`Perlu --${k}`);
  const read = f => fs.readFileSync(f, 'utf8');
  const dskpMd = read(a.dskp);
  const subjek = a.subjek || (dskpMd.match(/^# DSKP (.+?) Tingkatan/m) || [])[1] || 'Subjek';
  const tahun = (read(a.takwim).match(/\| (\d{4})-\d\d-\d\d/) || [])[1];
  const p = plan({
    sp: parseDskp(dskpMd), kesukaran: parseKesukaran(read(a.kesukaran)), takwim: parseTakwim(read(a.takwim)),
    tingkatan: Number(a.tingkatan), tamat: a.tamat === 'akhir' ? 'akhir' : a.tamat ? Number(a.tamat) : undefined,
    ulangKaji: a['ulang-kaji'] != null ? Number(a['ulang-kaji']) : undefined,
  });
  const meta = { subjek, tahun, dskp: a.dskp, takwim: a.takwim, kesukaran: a.kesukaran };
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  fs.writeFileSync(a.out + '.md', renderMd(p, meta));
  fs.writeFileSync(a.out + '.html', renderHtml(p, meta));
  p.warnings.forEach(w => console.warn('Amaran:', w));
  console.log(`${a.out}.md, ${a.out}.html`);
}

module.exports = { parseDskp, parseKesukaran, parseTakwim, examForms, plan, renderMd, renderHtml };
if (require.main === module) main(process.argv.slice(2));
