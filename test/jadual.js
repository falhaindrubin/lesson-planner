// node test/jadual.js — jadual waktu 5.10.2026 sebenar dari sample/
const fs = require('fs'), assert = require('assert');
const R = require('../src/core');
const read = f => fs.readFileSync(__dirname + '/../sample/' + f, 'utf8');

// Waktu: 30 minit, waktu 0 = 6:30, jam 12 jam seperti aSc
assert.deepStrictEqual(R.waktuRange('2–3'), [2, 3]);
assert.deepStrictEqual(R.waktuRange('12-14'), [12, 14]);
assert.deepStrictEqual(R.waktuRange(' 9 '), [9, 9]);
assert.throws(() => R.waktuRange('3–2'), /Waktu tidak sah: "3–2"/);
assert.throws(() => R.waktuRange('pagi'), /Waktu tidak sah/);
assert.strictEqual(R.fmtWaktu([2, 3]), '2–3');
assert.strictEqual(R.fmtWaktu([9, 9]), '9');
assert.strictEqual(R.masaWaktu([2, 3]), '7:30–8:30');
assert.strictEqual(R.masaWaktu([12, 14]), '12:30–2:00');
assert.strictEqual(R.masaWaktu([10, 12]), '11:30–1:00');
assert.strictEqual(R.minitWaktu([7, 9]), 90);
assert.strictEqual(R.jam24(R.minitMula(3)), '0800');
assert.strictEqual(R.jam24(R.minitMula(15)), '1400');
assert.strictEqual(R.fmtTarikh('2026-10-05'), '05/10/2026');

// Jadual 5.10.2026: 12 slot kelas; slot B (Bukan kelas) diabaikan
const j = R.parseJadual(read('jwg-20261002.md'), 'jwg-20261002.md');
assert.strictEqual(j.berkuatKuasa, '2026-10-05');
assert.strictEqual(j.slots.length, 12);
assert.deepStrictEqual(j.slots[0], { hari: 'Isnin', waktu: [2, 3], masa: '7:30–8:30', subjek: 'M3', kelas: '4S', bilik: '' });
assert.deepStrictEqual(j.slots.find(s => s.subjek === 'SK' && s.hari === 'Selasa').waktu, [12, 14]);
assert.ok(!j.slots.some(s => s.hari === 'Jumaat' && s.waktu[0] === 9)); // tanda B
assert.strictEqual(j.slots.filter(s => s.subjek === 'TUTORIAL').length, 1);

// Masa yang tidak sepadan dengan Waktu ditolak dengan nombor baris
const salah = read('jwg-20261002.md').replace('| Isnin | 2–3 | 7:30–8:30 |', '| Isnin | 2–3 | 7:30–9:00 |');
assert.throws(() => R.parseJadual(salah, 'jwg.md'), /jwg\.md:\d+: Masa "7:30–9:00" tidak sepadan dengan Waktu 2–3 \(7:30–8:30\)/);
assert.throws(() => R.parseJadual('# x\n## Kelas\n', 'x.md'), /x\.md: tiada baris "- Berkuat kuasa/);
// CRLF (fail disimpan di Windows) dibaca sama
assert.deepStrictEqual(R.parseJadual(read('jwg-20261002.md').replace(/\n/g, '\r\n')), j);

// Penyelesai: versi terkini yang berkuat kuasa pada tarikh itu
const lama = { berkuatKuasa: '2026-08-10', slots: [{ hari: 'Isnin', waktu: [1, 2], masa: '7:00–8:00', subjek: 'M3', kelas: '4S', bilik: '' }] };
const versions = [j, lama]; // tertib dalam senarai tidak penting
assert.strictEqual(R.versionFor(versions, '2026-10-02'), lama);
assert.strictEqual(R.versionFor(versions, '2026-10-05'), j);
assert.strictEqual(R.versionFor(versions, '2026-12-01'), j);
assert.throws(() => R.versionFor(versions, '2026-08-07'), /Tiada jadual berkuat kuasa pada 2026-08-07/);

// Minit seminggu: 4S M3 = 60 + 60 + 90; 4H SK = 90 + 90 (tutorial tidak dikira)
assert.strictEqual(R.minitSeminggu(j, '4S', 'M3'), 210);
assert.strictEqual(R.minitSeminggu(j, '4H', 'SK'), 180);
assert.strictEqual(R.minitSeminggu(lama, '4S', 'M3'), 60);

console.log('jadual: semua ujian lulus');
