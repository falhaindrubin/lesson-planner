// node test/rph-cli.js — jalankan src/cli/rph.js hujung ke hujung dalam folder sementara,
// dengan takwim, jadual, acara, DSKP dan RPT Matematik T4 2026 sebenar.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { spawnSync } = require('child_process');
const R = require('../src/core');

const sample = path.join(__dirname, '..', 'sample');
const cli = path.join(__dirname, '..', 'src', 'cli', 'rph.js');
const read = f => fs.readFileSync(path.join(sample, f), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rph-'));
const s = f => path.join(sample, f);

// RPT Matematik T4 dengan lampiran Peruntukan SP
const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const plan = R.plan({ sp: R.parseDskp(read('dskp-mat-t4.md')), kesukaran: R.parseKesukaran(read('kesukaran-mat-t4.md')), kalendar, tingkatan: 4 });
fs.writeFileSync(path.join(tmp, 'rpt-mat.md'), R.renderMd(plan, { subjek: 'Matematik', tahun: 2026, dskp: 'd', takwim: 't', kesukaran: 'k' }));
const akt = s('aktiviti-umum.md');
fs.writeFileSync(path.join(tmp, 'kelas.md'), [
  '- Tahun: 2026', '- Guru: FALHAIND RUBIN', `- Takwim: ${s('takwim-smly-2026.md')}`, `- Jadual: ${s('jwg-20261002.md')}`,
  `- Acara: ${s('acara-2026.md')}`, '- Rekod: rekod', '- Output: out', '',
  '| Kelas | Nama penuh | Tingkatan | Subjek | Nama subjek | DSKP | Aktiviti | RPT | Tutorial | Bil. murid | Mula |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  `| 4S | 4 STANFORD | 4 | M3 | MATEMATIK | ${s('dskp-mat-t4.md')} | ${akt} | rpt-mat.md |  | 35 | 7.1.1 |`,
  `| 1S | 1 SAPPHIRE | 1 | ASK | ASAS SAINS KOMPUTER | ${s('dskp-ask-t1.md')} | ${akt} |  |  | 35 | 4.2.5 |`,
  `| 4H | 4 HARVARD | 4 | SK | SAINS KOMPUTER |  | ${akt} |  | TUTORIAL | 30 |  |`,
  `| 2D | 2 DIAMOND | 2 | PK | PENDIDIKAN KESIHATAN |  | ${akt} |  |  | 30 |  |`,
  `| 2J | 2 JADE | 2 | PK | PENDIDIKAN KESIHATAN |  | ${akt} |  |  | 31 |  |`,
  `| 2D | 2 DIAMOND | 2 | PJ | PENDIDIKAN JASMANI |  | ${akt} |  |  | 30 |  |`,
  `| 2J | 2 JADE | 2 | PJ | PENDIDIKAN JASMANI |  | ${akt} |  |  | 31 |  |`,
].join('\n'));

const run = (...args) => {
  const r = spawnSync(process.execPath, [cli, '--kelas', path.join(tmp, 'kelas.md'), ...args], { encoding: 'utf8', cwd: tmp });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const t = f => fs.readFileSync(path.join(tmp, f), 'utf8');
const snapshot = () => Object.fromEntries(['rekod', 'out'].flatMap(d => fs.readdirSync(path.join(tmp, d)).map(f => [`${d}/${f}`, t(`${d}/${f}`)])));

// Larian pertama: M35, hari ini Sabtu 3 Okt
const r1 = run('--minggu', 'M35', '--hari-ini', '2026-10-03');
assert.strictEqual(r1.code, 0, r1.err);
assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'out')).sort(),
  ['2026-M35-ASK.html', '2026-M35-M3.html', '2026-M35-PJ.html', '2026-M35-PK.html', '2026-M35-SK.html']);
assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'rekod')).sort(),
  ['rekod-1S-ASK.md', 'rekod-2D-PJ.md', 'rekod-2D-PK.md', 'rekod-2J-PJ.md', 'rekod-2J-PK.md', 'rekod-4H-SK.md', 'rekod-4S-M3.md']);

// 4S M3 (dalam RPT M22–M23, minggu penuh 210 minit): 7.1.1 = 0.275 × 210 = 58 minit -> Isnin;
// 7.1.2 = 115 minit -> Selasa dan Rabu; Rabu (90 minit) juga mula 7.1.3
const m3 = R.parseRekod(t('rekod/rekod-4S-M3.md'));
assert.deepStrictEqual(m3.map(r => [r.tarikh, r.sp.join(', '), r.status, r.kehadiran]), [
  ['2026-10-05', '7.1.1', 'diajar', 35], ['2026-10-06', '7.1.2', 'diajar', 35], ['2026-10-07', '7.1.2, 7.1.3', 'diajar', 35],
]);
// 1S ASK tanpa RPT: satu SP satu PdP; 4H SK tanpa DSKP: tutorial Khamis
assert.deepStrictEqual(R.parseRekod(t('rekod/rekod-1S-ASK.md')).map(r => r.sp.join()), ['4.2.5', '4.2.6']);
assert.deepStrictEqual(R.parseRekod(t('rekod/rekod-4H-SK.md')).map(r => r.jenis), ['pdp', 'tutorial', 'pdp']);
// HTML: satu RPH bagi setiap PdP; kehadiran ikut kelas
const htmlPk = t('out/2026-M35-PK.html');
assert.strictEqual((htmlPk.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 2);
assert.ok(htmlPk.includes('31 / 31') && htmlPk.includes('30 / 30'));
assert.ok(t('out/2026-M35-M3.html').includes('Perkembangan: (80 minit)'));
// Ringkasan dan amaran
assert.match(r1.out, /^4S M3: SP 7\.1\.1 · RPT M22 · \d+ minggu ke belakang$/m);
// Jadual hanya dari 5 Okt: masa SP minggu awal dikira dengan jadual itu, dengan amaran
assert.match(r1.err, /Amaran: 4S M3: tiada jadual sebelum 2026-10-05; masa SP bagi minggu lebih awal dikira dengan jadual itu/);
assert.match(r1.out, /^1S ASK: SP 4\.2\.5 · tiada RPT$/m);
assert.match(r1.out, /^4H SK: tiada DSKP$/m);
assert.match(r1.err, /Amaran: 4S M3: perlu \d+ minit untuk SP berbaki, ada 0 minit hingga M34; pertimbang gabung SP/);
assert.match(r1.err, /Amaran: 2D PK: tiada DSKP; SP dibiarkan kosong/);

// Dijalankan semula tanpa perubahan: semua fail sama bait demi bait
const snap1 = snapshot();
assert.strictEqual(run('--minggu', '35', '--hari-ini', '2026-10-03').code, 0);
assert.deepStrictEqual(snapshot(), snap1);

// Guru tanda Selasa 6 Okt ditunda (dengan sebab), kemudian jana M36 pada petang 6 Okt
fs.writeFileSync(path.join(tmp, 'rekod/rekod-4S-M3.md'), t('rekod/rekod-4S-M3.md')
  .replace('| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | diajar | 35 |  |', '| 2026-10-06 | Selasa | 1–2 | 7:00–8:00 | pdp |  | 7.1.2 | ditunda | 35 | Mesyuarat |'));
const r2 = run('--minggu', '36', '--hari-ini', '2026-10-06');
assert.strictEqual(r2.code, 0, r2.err);
const m3b = R.parseRekod(t('rekod/rekod-4S-M3.md'));
// Rabu 7 Okt dibina semula: 7.1.2 (115 minit) diajar semula dari awal, berterusan ke Isnin
assert.deepStrictEqual(m3b.find(r => r.tarikh === '2026-10-07').sp, ['7.1.2']);
assert.deepStrictEqual(m3b.find(r => r.tarikh === '2026-10-12').sp, ['7.1.2', '7.1.3']);
assert.strictEqual(m3b.find(r => r.tarikh === '2026-10-12').acara, 'X-Break');
assert.ok(t('out/2026-M35-M3.html').includes('☑ PdP ditunda kerana: Mesyuarat'));
assert.ok(t('out/2026-M36-M3.html').includes('Hari acara: X-Break'));
assert.ok(!/bersambung|samb\./.test(t('out/2026-M36-M3.html')));

// Dua kelas satu subjek (2D PJ Khamis, 2J PJ Jumaat): pada Khamis 8 Okt hanya 2J masih ada baris M35 akan
// datang, tetapi fail PJ M35 mesti tetap memuatkan halaman kedua-dua kelas
assert.strictEqual(run('--minggu', '36', '--hari-ini', '2026-10-08').code, 0);
const pj35 = t('out/2026-M35-PJ.html');
assert.ok(pj35.includes('2 DIAMOND') && pj35.includes('2 JADE'), 'PJ M35 hilang halaman satu kelas');
assert.strictEqual((pj35.match(/RANCANGAN PENGAJARAN HARIAN/g) || []).length, 2);

// Ralat: mesej jelas, kod keluar 1, tiada jejak tindanan
const r3 = run('--minggu', '50', '--hari-ini', '2026-10-06');
assert.strictEqual(r3.code, 1);
assert.match(r3.err, /^Ralat: Tiada minggu M50 dalam takwim/m);
assert.ok(!/at main/.test(r3.err));
// Ralat pada satu kelas: tiada fail ditulis untuk mana-mana kelas
const snap2 = snapshot();
fs.writeFileSync(path.join(tmp, 'rekod/rekod-2J-PJ.md'), t('rekod/rekod-2J-PJ.md').replace('| diajar |', '| tunda |'));
const r4 = run('--minggu', '37', '--hari-ini', '2026-10-06');
assert.strictEqual(r4.code, 1);
assert.match(r4.err, /Ralat: rekod[\\/]rekod-2J-PJ\.md:\d+: Status "tunda" tidak dikenali/);
const snap3 = snapshot();
assert.deepStrictEqual(Object.keys(snap3), Object.keys(snap2));
for (const f of Object.keys(snap2)) if (f !== 'rekod/rekod-2J-PJ.md') assert.strictEqual(snap3[f], snap2[f], f);

// Simulasi awal tahun (fail kelas 2026 sebenar, 4S sahaja): M1–M5 tanpa gangguan sentiasa ikut RPT
const kelasSim = read('kelas-2026.md')
  .replace(/^- (Takwim|Jadual|Acara): (.*)$/gm, (_, k, v) => `- ${k}: ${v.split(', ').map(s).join(', ')}`)
  .replace(/^- Rekod: .*$/m, '- Rekod: sim').replace(/^- Output: .*$/m, '- Output: sim')
  .replace('| dskp-mat-t4.md | aktiviti-umum.md | ../output/rpt-mat-t4-2026.md |', `| ${s('dskp-mat-t4.md')} | ${akt} | rpt-mat.md |`);
fs.writeFileSync(path.join(tmp, 'kelas-sim.md'), kelasSim);
const sim = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'cli', 'simulasi.js'), '--kelas', path.join(tmp, 'kelas-sim.md'), '--dari', '1', '--hingga', '5'], { encoding: 'utf8', cwd: tmp });
assert.strictEqual(sim.status, 0, sim.stderr);
assert.deepStrictEqual(sim.stdout.trim().split('\n'), [
  'M1 (2026-01-10) 4S M3: SP 1.1.1 · RPT M1 · ikut RPT',
  'M2 (2026-01-17) 4S M3: SP 1.1.3 · RPT M2 · ikut RPT',
  'M3 (2026-01-24) 4S M3: SP 1.1.5 · RPT M3 · ikut RPT',
  'M4 (2026-01-31) 4S M3: SP 1.1.7 · RPT M3 · ikut RPT',
  'M5 (2026-02-07) 4S M3: SP 2.1.1 · RPT M5 · ikut RPT',
]);
assert.strictEqual(R.parseRekod(t('sim/rekod-4S-M3.md')).length, 15);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('rph-cli: semua ujian lulus');
