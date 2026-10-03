// Simulasi: jalankan src/cli/rph.js bagi setiap minggu M<dari>..M<hingga>, seolah-olah dijalankan
// pada hari Sabtu sebelum minggu itu, tanpa sebarang perubahan rekod oleh guru.
// Cetak satu baris ringkasan bagi setiap minggu dan kelas.
//
//   node src/cli/simulasi.js --kelas sample/kelas-2026.md [--dari 1] [--hingga 43]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as C from '../core/index.js';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!a.kelas) throw new Error('Guna: node src/cli/simulasi.js --kelas <fail kelas> [--dari 1] [--hingga 43]');
  const failKelas = path.resolve(a.kelas);
  const K = C.parseKelas(fs.readFileSync(failKelas, 'utf8'), a.kelas);
  const kalendar = C.buildCalendar(C.parseTakwim(fs.readFileSync(path.resolve(path.dirname(failKelas), K.takwim), 'utf8')));
  const dari = Number(a.dari || 1), hingga = Number(a.hingga || kalendar.weeks[kalendar.weeks.length - 1].n);
  const rph = path.join(__dirname, 'rph.js');
  for (const w of kalendar.weeks.filter(x => x.n >= dari && x.n <= hingga)) {
    const sabtu = new Date(Date.parse(w.mula) - 2 * 864e5).toISOString().slice(0, 10);
    const r = spawnSync(process.execPath, [rph, '--kelas', failKelas, '--minggu', String(w.n), '--hari-ini', sabtu], { encoding: 'utf8' });
    if (r.status) throw new Error(`M${w.n}: ${r.stderr.trim()}`);
    const label = new Set(K.kelas.map(k => `${k.kelas} ${k.subjek}`));
    const ringkasan = r.stdout.split('\n').filter(l => label.has(l.split(':')[0]));
    const amaran = r.stderr.split('\n').filter(l => l.startsWith('Amaran:') && !l.includes('tiada jadual sebelum'));
    for (const l of ringkasan) console.log(`M${w.n} (${sabtu}) ${l}`);
    for (const l of amaran) console.log(`M${w.n}   ${l}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Ralat:', e.message);
  process.exit(1);
}
