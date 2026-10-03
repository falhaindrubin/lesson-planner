// Copy the app into the public rph-mate checkout as "RPH Mate" (W11, W12). Only code is copied:
// app/ and src/core/, with allowed file types; nothing personal (no sample/, output/, docs/, .md data).
// The teacher reviews the printed list, then commits and pushes in rph-mate by hand.
//
//   node tools/release.js <path to rph-mate checkout> [--skip-tests]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD_NAME = 'RPH Mate';
const ALLOWED = new Set(['.js', '.html', '.css', '.webmanifest', '.svg', '.png']);
const FOLDERS = ['app', 'src/core'];

function copyDir(from, to, out) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b, out);
    else if (ALLOWED.has(path.extname(f))) { fs.copyFileSync(a, b); out.push(b); }
  }
}

function edit(file, fn) { fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8'))); }

function main(argv) {
  const target = argv.find(a => !a.startsWith('--'));
  if (!target) throw new Error('Usage: node tools/release.js <path to rph-mate checkout> [--skip-tests]');
  const dest = path.resolve(target);
  if (!fs.existsSync(path.join(dest, '.git'))) throw new Error(`Not a git checkout: ${dest}`);
  if (!argv.includes('--skip-tests')) {
    const t = spawnSync(process.execPath, [path.join(root, 'test', 'all.js')], { stdio: 'inherit' });
    if (t.status) throw new Error('Tests failed; nothing copied');
  }
  const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim() || 'nogit';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  for (const d of FOLDERS) fs.rmSync(path.join(dest, d), { recursive: true, force: true });
  const copied = [];
  for (const d of FOLDERS) copyDir(path.join(root, d), path.join(dest, d), copied);

  edit(path.join(dest, 'app/config.js'), t => t.replace(/export const APP_NAME = '[^']*';/, `export const APP_NAME = '${PROD_NAME}';`));
  edit(path.join(dest, 'app/manifest.webmanifest'), t => {
    const m = JSON.parse(t);
    m.name = m.short_name = PROD_NAME;
    return JSON.stringify(m, null, 2) + '\n';
  });
  edit(path.join(dest, 'app/sw.js'), t => t.replace(/const CACHE = '[^']*';/, `const CACHE = 'rph-mate-${date}-${sha}';`));

  const index = path.join(dest, 'index.html');
  if (!fs.existsSync(index))
    fs.writeFileSync(index, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=app/"><title>${PROD_NAME}</title><a href="app/">${PROD_NAME}</a>\n`);
  const readme = path.join(dest, 'README.md');
  if (!fs.existsSync(readme))
    fs.writeFileSync(readme, `# ${PROD_NAME}\n\nWeekly RPH planner for KSSM teachers. Open https://falhaindrubin.github.io/rph-mate/ in Chrome or Edge.\nYour files stay in your browser; nothing is uploaded.\n`);

  copied.forEach(f => console.log(path.relative(dest, f).replace(/\\/g, '/')));
  console.log(`\n${copied.length} files copied to ${dest} as ${PROD_NAME} (${date}-${sha}). Review, then commit and push there.`);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
