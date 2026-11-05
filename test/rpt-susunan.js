// node test/rpt-susunan.js — PJ + PK from the teacher's own order: every block of the susunan file lands in a week
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'susunan-')), 'rpt');
execFileSync(process.execPath, [path.join(root, 'src/cli/rpt-susunan.js'), '--takwim', 'sample/takwim-smly-2026.md', '--form', '2',
  '--susunan', 'sample/susunan-pjpk-t2.md', '--pj', 'sample/dskp-pj-t2.md', '--pk', 'sample/dskp-pk-t2.md', '--out', out], { cwd: root, stdio: 'pipe' });
const md = fs.readFileSync(out + '.md', 'utf8');
const blocks = fs.readFileSync(path.join(root, 'sample/susunan-pjpk-t2.md'), 'utf8').split('\n').filter(l => /^\| \d{4}-/.test(l)).length;
assert.equal(md.split('\n').filter(l => /\| (PJ|PK) \|/.test(l)).length, blocks);   // none dropped
assert.match(md, /\| M1 \| 12–16 Jan \| PK \| \*\*Kesihatan Diri dan Reproduktif\*\*/); // PK first week
assert.match(md, /\| M6 \| 16–20 Feb \| \*\*CUTI/);                                      // holiday week
console.log('rpt-susunan: all tests passed');
