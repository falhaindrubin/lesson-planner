// RPT tab: a strip of the year's topics (width = weeks) above one row per week. Read-only.
import { state, weekInfo, rptTexts } from './state.js';
import { parseRptView } from './logic/rpt-view.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COLORS = ['#3b82f6', '#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
let chosen = 0;

function renderRpt(view) {
  view.dataset.screen = 'rpt';
  const all = rptTexts();
  if (!all.length) { view.innerHTML = '<h2>RPT</h2><p class="empty">None of your classes has an RPT file yet. Add one with src/cli/rpt.js and pick it in Files.</p>'; return; }
  if (chosen >= all.length) chosen = 0;
  let rpt;
  try { rpt = parseRptView(all[chosen].text); } catch (e) { view.innerHTML = `<h2>RPT</h2><div class="errorbar">${esc(all[chosen].label)}: ${esc(e.message)}</div>`; return; }
  const info = weekInfo();
  const now = rpt.weeks.find(w => w.n != null && info && w.n === info.todayWeek);
  const nowTopics = now ? now.topics : [];
  view.innerHTML = `<h2>RPT${all.length > 1 ? ` <select data-pick>${all.map((r, i) => `<option value="${i}" ${i === chosen ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select>` : ` — ${esc(all[0].label)}`}</h2>
<div class="strip">${rpt.topics.map((t, i) => `<button data-topic="${esc(t.name)}" class="${nowTopics.includes(t.name) ? 'now' : ''}" style="flex:${t.weeks || 0.4};background:${COLORS[i % COLORS.length]}" title="${esc(t.name)} · ${esc(t.span)} · ${t.weeks} weeks · ${t.sp} SP">${esc(t.name.split(' ')[0])}</button>`).join('')}</div>
<table class="rpt"><thead><tr><th>Week</th><th>Dates</th><th>Topic</th><th>Content standard</th><th>SP</th><th></th></tr></thead><tbody>
${rpt.weeks.map(w => w.off
    ? `<tr class="off${w === now ? ' now' : ''}"${w === now ? ' id="rpt-now"' : ''}><td>${w.n ? `M${w.n}` : ''}${w === now ? ' ◀' : ''}</td><td>${esc(w.dates)}</td><td colspan="4">${esc(w.off)}${w.note.length ? ` <small>${esc(w.note.join(' · '))}</small>` : ''}</td></tr>`
    : `<tr ${w === now ? 'class="now" id="rpt-now"' : ''} data-topics="${esc(w.topics.join('|'))}"><td>M${w.n}${w === now ? ' ◀' : ''}</td><td>${esc(w.dates)}</td><td>${w.topics.map(esc).join('<br>')}</td><td>${w.standards.map(esc).join('<br>')}</td><td>${w.sp.map(esc).join('<br>')}</td><td><small>${esc(w.note.join(' · '))}</small></td></tr>`).join('')}
</tbody></table>`;
  const pick = view.querySelector('[data-pick]');
  if (pick) pick.onchange = () => { chosen = Number(pick.value); renderRpt(view); };
  view.querySelectorAll('.strip button').forEach(b => {
    b.onclick = () => { const tr = [...view.querySelectorAll("tr[data-topics]")].find(r => r.dataset.topics.split("|").includes(b.dataset.topic)); if (tr) tr.scrollIntoView({ block: "center", behavior: "smooth" }); };
  });
  const el = view.querySelector('#rpt-now');
  if (el) el.scrollIntoView({ block: "center" });
}

export { renderRpt };
