// Files screen: Profile, folder picking / dropping, class file choice, setup status, re-pick conflicts
import { state, setProfile, chooseClassFile, importFiles, confirmRekod, dropConflict } from './state.js';
import { baseName } from './logic/paths.js';
import { diffSummary } from './logic/rekod-diff.js';
import { statusLabel } from './logic/status.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function readList(fileList) {
  const out = [];
  for (const f of fileList) if (f.name.endsWith('.md')) out.push({ path: f.webkitRelativePath || f.name, text: await f.text() });
  return out;
}

const side = v => (v ? `${esc(statusLabel(v.status) || v.status || '—')} · SP ${esc(v.sp || '—')} · ${esc(v.note || '')}` : '<i>not in this copy</i>');

function conflictHtml(c, i) {
  return `<div class="conflict"><p><b>${esc(baseName(c.path))}</b>: ${esc(diffSummary(c.diff))}</p>
<table class="diff"><tr><th>Lesson</th><th>In the app</th><th>In the file</th></tr>
${c.diff.map(d => `<tr><td>${esc(d.label)}</td><td>${side(d.stored)}</td><td>${side(d.file)}</td></tr>`).join('')}</table>
<p><button data-replace="${i}">Replace with the file</button> <button data-keep="${i}">Keep the app's copy</button></p></div>`;
}

function renderFiles(view) {
  view.dataset.screen = 'files';
  const classFiles = [...state.files.keys()].filter(p => /^kelas-.*\.md$/.test(baseName(p))).sort();
  const imp = state.lastImport;
  const s = state.setup;
  view.innerHTML = `<div class="files">
<h2>Files</h2>
<section><h3>Profile</h3>
<label>Your name (printed as NAMA GURU) <input id="profile" value="${esc(state.profile)}" placeholder="Your name"></label>
${state.profile ? '' : '<p class="note">No name yet: NAMA GURU will be blank on the RPH.</p>'}</section>
<section><h3>Your folders</h3>
<p>Pick your <code>sample</code> folder, then your <code>output</code> folder (or wherever your rekod and RPT live). Only .md files are read; they stay in this browser.</p>
<label><button type="button" id="pickFolder">Pick a folder</button><input type="file" id="folder" webkitdirectory multiple hidden></label>
<label><button type="button" id="pickFiles">Pick files</button><input type="file" id="files" accept=".md" multiple hidden></label>
<div id="drop" class="drop">Drop .md files here</div>
<p class="note">${state.files.size} files stored.</p></section>
<section><h3>Class file</h3>
${classFiles.length ? `<select id="classFile"><option value="">Choose…</option>${classFiles.map(p => `<option ${p === state.classFile ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : '<p class="note">No kelas-*.md picked yet.</p>'}
${s.missing.map(m => `<p class="err">Missing: ${esc(m)}</p>`).join('')}
${s.errors.map(m => `<p class="err">${esc(m)}</p>`).join('')}
${state.classFile && !s.missing.length && !s.errors.length ? '<p>All files found. Open the <b>Week</b> tab.</p>' : ''}</section>
${imp ? `<section><h3>Last import</h3><p>${imp.added.length} file(s) stored.</p>
${imp.rejected.map(r => `<p class="err">Rejected ${esc(r.path)}: ${esc(r.error)} (the stored copy, if any, is kept)</p>`).join('')}
${imp.conflicts.map(conflictHtml).join('')}</section>` : ''}
</div>`;

  const take = async fileList => importFiles(await readList(fileList));
  view.querySelector('#profile').onchange = e => setProfile(e.target.value);
  view.querySelector('#pickFolder').onclick = () => view.querySelector('#folder').click();
  view.querySelector('#pickFiles').onclick = () => view.querySelector('#files').click();
  view.querySelector('#folder').onchange = e => take(e.target.files);
  view.querySelector('#files').onchange = e => take(e.target.files);
  const drop = view.querySelector('#drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files); };
  const sel = view.querySelector('#classFile');
  if (sel) sel.onchange = e => e.target.value && chooseClassFile(e.target.value);
  view.querySelectorAll('[data-replace]').forEach(b => { b.onclick = () => confirmRekod(imp.conflicts[Number(b.dataset.replace)]); });
  view.querySelectorAll('[data-keep]').forEach(b => { b.onclick = () => dropConflict(imp.conflicts[Number(b.dataset.keep)]); });
}

export { renderFiles, esc };
