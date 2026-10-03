// node test/release.js — tools/release.js copies only app code into a git checkout, with the production name
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools', 'release.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
const run = (...a) => spawnSync(process.execPath, [tool, ...a], { encoding: 'utf8' });

// Not a git checkout: refused, nothing copied
const plain = path.join(tmp, 'plain');
fs.mkdirSync(plain);
const r0 = run(plain, '--skip-tests');
assert.strictEqual(r0.status, 1);
assert.match(r0.stderr, /Not a git checkout/);
assert.deepStrictEqual(fs.readdirSync(plain), []);

// A git checkout with a stale file from an earlier release
const target = path.join(tmp, 'rph-mate');
fs.mkdirSync(path.join(target, 'app'), { recursive: true });
assert.strictEqual(spawnSync('git', ['init', '-q', target]).status, 0);
fs.writeFileSync(path.join(target, 'app', 'old.js'), 'stale');
const r1 = run(target, '--skip-tests');
assert.strictEqual(r1.status, 0, r1.stderr);

const files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === '.git') continue; fs.statSync(p).isDirectory() ? walk(p) : files.push(path.relative(target, p).replace(/\\/g, '/')); } };
walk(target);
assert.ok(files.includes('app/index.html') && files.includes('app/state.js') && files.includes('app/logic/marking.js'));
assert.ok(files.includes('src/core/index.js') && files.includes('src/core/week.js'));
assert.ok(files.includes('index.html') && files.includes('README.md'));
assert.ok(!files.includes('app/old.js'), 'stale file not removed');
assert.ok(files.every(f => /^(app|src\/core)\//.test(f) || ['index.html', 'README.md'].includes(f)), files.join('\n'));
assert.ok(files.every(f => !f.endsWith('.md') || f === 'README.md'));
assert.ok(!files.some(f => f.startsWith('src/cli') || f.startsWith('sample') || f.startsWith('output') || f.startsWith('docs') || f.startsWith('test')));
assert.ok(fs.readFileSync(path.join(target, 'app/config.js'), 'utf8').includes("export const APP_NAME = 'RPH Mate';"));
const manifest = JSON.parse(fs.readFileSync(path.join(target, 'app/manifest.webmanifest'), 'utf8'));
assert.deepStrictEqual([manifest.name, manifest.short_name], ['RPH Mate', 'RPH Mate']);
assert.match(fs.readFileSync(path.join(target, 'app/sw.js'), 'utf8'), /const CACHE = 'rph-mate-\d{8}-[0-9a-f]+';/);
// The source repo is untouched
assert.ok(fs.readFileSync(path.join(root, 'app/config.js'), 'utf8').includes('Lesson Planner (dev)'));

fs.rmSync(tmp, { recursive: true, force: true });
console.log('release: all tests passed');
