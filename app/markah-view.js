// Marks tab: pick a markah-*.md; averages per assessment, grade spread of the latest, students to look at, all marks. Read-only.
import { state } from './state.js';
import { baseName } from './logic/paths.js';
import { parseMarkah, summarise, GRADES, PASS } from './logic/markah.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let chosen = '';

function renderMarkah(view) {
  view.dataset.screen = 'markah';
  const files = [...state.files.keys()].filter(p => /^markah-.*\.md$/.test(baseName(p))).sort();
  if (!files.length) { view.innerHTML = '<h2>Marks</h2><p class="empty">No marks file yet. Make <code>markah-5S-M3.md</code> (a table: Nama, then one column per assessment, marks 0–100) and pick it in Files.</p>'; return; }
  if (!files.includes(chosen)) chosen = files[0];
  let data;
  try { data = parseMarkah(state.files.get(chosen)); } catch (e) { view.innerHTML = `<h2>Marks</h2><div class="errorbar">${esc(baseName(chosen))}: ${esc(e.message)}</div>`; return; }
  const { per, latest, watch } = summarise(data);
  const L = latest >= 0 ? per[latest] : null;
  const peak = Math.max(1, ...GRADES.map(([, g]) => (L ? L.grades[g] || 0 : 0)));
  view.innerHTML = `<h2>Marks${files.length > 1 ? ` <select data-pick>${files.map(f => `<option value="${esc(f)}" ${f === chosen ? 'selected' : ''}>${esc(baseName(f))}</option>`).join('')}</select>` : ` — ${esc(baseName(chosen))}`}</h2>
${L ? `<div class="tiles"><div><b>${data.students.length}</b>students</div><div><b>${L.avg.toFixed(1)}</b>average, ${esc(L.name)}</div><div><b>${Math.round(L.pass * 100)}%</b>passed (${PASS}+)</div><div class="${watch.length ? 'bad' : ''}"><b>${watch.length}</b>to look at</div></div>` : '<p class="note">No marks entered yet.</p>'}
<section class="mk"><h3>Average per assessment</h3>
${per.map(p => `<div class="mkrow"><span>${esc(p.name)}</span><span class="bar"><span style="width:${p.avg ?? 0}%"></span></span><span>${p.avg == null ? '—' : p.avg.toFixed(1)}</span><small>${p.sat}/${data.students.length} sat${p.pass == null ? '' : ` · ${Math.round(p.pass * 100)}% passed`}</small></div>`).join('')}</section>
${L ? `<section class="mk"><h3>Grades, ${esc(L.name)}</h3><div class="grades">${GRADES.map(([, g]) => `<div title="${g}: ${L.grades[g] || 0}"><i style="height:${((L.grades[g] || 0) / peak) * 80}px"></i><b>${L.grades[g] || 0}</b>${g}</div>`).join('')}</div></section>` : ''}
${watch.length ? `<section class="mk"><h3>To look at</h3>${watch.map(w => `<p class="err"><b>${esc(w.name)}</b>: ${esc(w.why)}</p>`).join('')}</section>` : ''}
<table class="classes"><thead><tr><th>Name</th>${data.tests.map(t => `<th>${esc(t)}</th>`).join('')}</tr></thead>
<tbody>${data.students.map(s => `<tr><td>${esc(s.name)}</td>${s.marks.map(m => `<td${m != null && m < PASS ? ' class="err"' : ''}>${m ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const pick = view.querySelector('[data-pick]');
  if (pick) pick.onchange = () => { chosen = pick.value; renderMarkah(view); };
}

export { renderMarkah };
