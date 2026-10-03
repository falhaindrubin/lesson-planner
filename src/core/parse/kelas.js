// kelas-<tahun>.md -> { tahun, guru, takwim, jadual: [fail], acara, rekod, output, kelas: [baris] }
// Satu baris = satu kelas × subjek. Laluan fail adalah relatif kepada folder fail kelas.
import { cells } from '../util.js';

const KEPALA = ['Tahun', 'Guru', 'Takwim', 'Jadual', 'Acara', 'Rekod', 'Output'];
const LAJUR = ['Kelas', 'Nama penuh', 'Tingkatan', 'Subjek', 'Nama subjek', 'DSKP', 'Aktiviti', 'RPT', 'Tutorial', 'Bil. murid', 'Mula'];

function parseKelas(md, fail = 'kelas') {
  const meta = {};
  const kelas = [];
  md.split(/\r?\n/).forEach((line, i) => {
    const at = `${fail}:${i + 1}`;
    const m = line.match(/^- (\w+): *(.*)$/);
    if (m && KEPALA.includes(m[1])) { meta[m[1]] = m[2].trim(); return; }
    if (!/^\|/.test(line) || /^\| *(Kelas|-)/.test(line)) return;
    const c = cells(line);
    if (c.length !== LAJUR.length) throw new Error(`${at}: perlu ${LAJUR.length} lajur (${LAJUR.join(', ')}), ada ${c.length}`);
    const [k, namaPenuh, tingkatan, subjek, namaSubjek, dskp, aktiviti, rpt, tutorial, bil, mula] = c;
    if (!/^[1-5]$/.test(tingkatan)) throw new Error(`${at}: Tingkatan "${tingkatan}" bukan 1–5`);
    if (!k || !subjek || !namaPenuh || !namaSubjek) throw new Error(`${at}: Kelas, Nama penuh, Subjek dan Nama subjek wajib`);
    if (!aktiviti) throw new Error(`${at}: Aktiviti wajib (fail templat aktiviti)`);
    if (bil && !/^\d+$/.test(bil)) throw new Error(`${at}: Bil. murid "${bil}" bukan nombor`);
    kelas.push({
      kelas: k, namaPenuh, tingkatan: Number(tingkatan), subjek, namaSubjek, dskp, aktiviti, rpt, tutorial,
      bilMurid: bil ? Number(bil) : null, mula, line: i + 1,
    });
  });
  for (const k of KEPALA) if (!meta[k]) throw new Error(`${fail}: tiada baris "- ${k}: …"`);
  if (!/^\d{4}$/.test(meta.Tahun)) throw new Error(`${fail}: Tahun "${meta.Tahun}" bukan tahun`);
  if (!kelas.length) throw new Error(`${fail}: tiada baris kelas`);
  return {
    tahun: Number(meta.Tahun), guru: meta.Guru, takwim: meta.Takwim,
    jadual: meta.Jadual.split(',').map(s => s.trim()).filter(Boolean),
    acara: meta.Acara, rekod: meta.Rekod, output: meta.Output, kelas,
  };
}

export { parseKelas };
