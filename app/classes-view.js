// Classes dashboard: one row per class × subject, as of the start of the week on the Week tab
import { state, setTab, goToday } from './state.js';
import { classLabel, positionWords, rptWeeksWords, percentDone, fitWords } from './logic/words.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function row(s, i) {
  const p = positionWords(s);
  const numbers = s.hasDskp && s.hasRpt && !s.finished;
  const pct = percentDone(s);
  return `<tr data-row="${i}">
<td>${esc(classLabel(s))}</td>
<td>${numbers ? esc(s.currentSp) : ''}</td>
<td>${s.hasDskp ? `<span class="bar"><span style="width:${pct}%"></span></span>${pct}%` : ''}</td>
<td>${numbers ? esc(rptWeeksWords(s)) : ''}</td>
<td><span class="badge tone-${p.tone}">${esc(p.text)}</span></td>
<td>${s.rptEnd ? `M${s.rptEnd}` : ''}</td></tr>`;
}

function renderClasses(view) {
  view.dataset.screen = 'classes';
  const list = state.result ? state.result.classes : [];
  const fits = list.map(fitWords).filter(Boolean);
  view.innerHTML = `<h2>Classes — as of Week ${state.week} (start of week)</h2>
${state.error ? `<div class="errorbar">${esc(state.error)}</div>` : ''}
<table class="classes"><thead><tr><th>Class</th><th>Current SP</th><th>DSKP done</th><th>RPT week of SP</th><th>Position</th><th>Ends</th></tr></thead>
<tbody>${list.map(row).join('')}</tbody></table>
${fits.map(f => `<p class="err">⚠ ${esc(f)}</p>`).join('')}`;
  view.querySelectorAll('tr[data-row]').forEach(tr => { tr.onclick = () => { setTab('week'); goToday(); }; });
}

export { renderClasses };
