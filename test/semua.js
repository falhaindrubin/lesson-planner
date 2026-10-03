// node test/semua.js — jalankan semua fail ujian dalam test/
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'semua.js').sort())
  execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
