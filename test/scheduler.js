// node test/scheduler.js — takwim 2026, jadual 5.10.2026, kelas dan acara 2026 sebenar dari sample/
import fs from 'node:fs';
import assert from 'node:assert';
import * as R from '../src/core/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

const kalendar = R.buildCalendar(R.parseTakwim(read('takwim-smly-2026.md')));
const versions = [R.parseJadual(read('jwg-20261002.md'))];
const { kelas } = R.parseKelas(fs.readFileSync(__dirname + '/data/kelas-semua.md', 'utf8'));
const acara = R.parseAcara(read('acara-2026.md'));
const minggu = (n, a = acara) => R.lessonsForWeek({ kalendar, versions, kelas, acara: a, minggu: n });
const ringkas = l => `${l.hari} ${l.waktu} ${l.subjek} ${l.kelas} ${l.jenis}`;

// M35 (5–9 Okt): minggu biasa, 12 PdP ikut tertib hari dan waktu
const m35 = minggu(35);
assert.strictEqual(m35.length, 12);
assert.deepStrictEqual(m35.map(ringkas), [
  'Isnin 2–3 M3 4S pdp', 'Isnin 8–9 ASK 1S pdp',
  'Selasa 1–2 M3 4S pdp', 'Selasa 5–6 PK 2J pdp', 'Selasa 8–9 PK 2D pdp', 'Selasa 12–14 SK 4H pdp',
  'Rabu 7–9 M3 4S pdp', 'Rabu 11–12 ASK 1S pdp',
  'Khamis 1–3 SK 4H tutorial', 'Khamis 5–6 PJ 2D pdp', 'Khamis 10–12 SK 4H pdp',
  'Jumaat 2–3 PJ 2J pdp',
]);
assert.deepStrictEqual(m35[0], {
  minggu: 35, tarikh: '2026-10-05', hari: 'Isnin', kelas: '4S', subjek: 'M3',
  waktu: '2–3', masa: '7:30–8:30', minit: 60, jenis: 'pdp', acara: '',
});
assert.strictEqual(m35.find(l => l.jenis === 'tutorial').minit, 90);
assert.ok(m35.every(l => l.acara === '')); // program HEM / mesyuarat bukan hari acara

// M36: Isnin 12 Okt X-Break (semua tingkatan); UBBM/UBBI PAT bukan peperiksaan kelas saya
const m36 = minggu(36);
assert.deepStrictEqual(m36.filter(l => l.hari === 'Isnin').map(l => l.acara), ['X-Break', 'X-Break']);
assert.ok(m36.every(l => l.jenis !== 'peperiksaan'));

// M37: PAT Tingkatan 4 sahaja -> 4S dan 4H peperiksaan (termasuk tutorial); 1S, 2D, 2J biasa
const m37 = minggu(37);
assert.strictEqual(m37.length, 12);
for (const l of m37) assert.strictEqual(l.jenis === 'peperiksaan', ['4S', '4H'].includes(l.kelas), ringkas(l));
assert.strictEqual(m37.find(l => l.kelas === '4S').acara, 'PAT TING. 4');

// M38: PAT T4 / UASA -> semua kelas peperiksaan
assert.ok(minggu(38).every(l => l.jenis === 'peperiksaan'));

// M39: Isnin 2 Nov Cuti Peristiwa 4 -> tiada PdP Isnin
const m39 = minggu(39);
assert.strictEqual(m39.length, 10);
assert.ok(!m39.some(l => l.hari === 'Isnin'));

// Batal: ikut kelas, ikut tingkatan, atau semua; hari acara ikut tingkatan
const a2 = {
  acara: [{ tarikh: '2026-10-07', nama: 'Program Transformasi', tingkatan: [1] }],
  batal: [
    { tarikh: '2026-10-05', sasaran: '4S', sebab: 'Ujian SEGAK' },
    { tarikh: '2026-10-06', sasaran: '2', sebab: 'Lawatan' },
    { tarikh: '2026-10-09', sasaran: '', sebab: 'Mesyuarat agung' },
  ],
};
const b = minggu(35, a2);
assert.deepStrictEqual(b.filter(l => l.hari === 'Isnin').map(l => l.kelas), ['1S']);
assert.deepStrictEqual(b.filter(l => l.hari === 'Selasa').map(l => l.kelas), ['4S', '4H']);
assert.ok(!b.some(l => l.hari === 'Jumaat'));
assert.deepStrictEqual(b.filter(l => l.hari === 'Rabu').map(l => [l.kelas, l.acara]), [['4S', ''], ['1S', 'Program Transformasi']]);

// Satu subjek sahaja dalam fail kelas: slot lain tidak dirancang dan disenaraikan untuk nota CLI
const satu = kelas.filter(k => k.kelas === '4S');
assert.deepStrictEqual(R.lessonsForWeek({ kalendar, versions, kelas: satu, acara, minggu: 35 }).map(ringkas),
  ['Isnin 2–3 M3 4S pdp', 'Selasa 1–2 M3 4S pdp', 'Rabu 7–9 M3 4S pdp']);
assert.deepStrictEqual(R.slotTanpaKelas(versions, satu), ['ASK 1S', 'PK 2J', 'PK 2D', 'SK 4H', 'TUTORIAL 4H', 'PJ 2D', 'PJ 2J']);
assert.deepStrictEqual(R.slotTanpaKelas(versions, kelas), []);

// Ralat: minggu di luar takwim; tiada jadual berkuat kuasa
assert.throws(() => minggu(50), /Tiada minggu M50 dalam takwim/);
assert.throws(() => minggu(34), /Tiada jadual berkuat kuasa pada 2026-09-28/);

console.log('scheduler: semua ujian lulus');
