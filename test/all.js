// node test/all.js — run every test file in test/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'all.js').sort())
  execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
