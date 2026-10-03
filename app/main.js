// Start-up, top bar, banners and screen switching. Screens: Week, Classes, Files.
import { APP_NAME } from './config.js';
import { state, onChange, load, ready, weekInfo, recalc, setWeek, goToday, setTab } from './state.js';
import { renderFiles, esc } from './inputs.js';
import { renderWeek } from './week-view.js';
import { renderClasses } from './classes-view.js';
import { saveRekod } from './export.js';
import { positionWords, classLabel } from './logic/words.js';
import { daysBetween } from '../src/core/index.js';

document.title = APP_NAME;
const top = document.getElementById('top');
const banner = document.getElementById('banner');
const view = document.getElementById('view');

function weekDates() {
  const d = state.result && state.result.days;
  if (!d || !d.length) return '';
  const f = (iso, o) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
  return `${f(d[0].date, { day: 'numeric' })}–${f(d[d.length - 1].date, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function renderTop() {
  const info = weekInfo();
  const unsaved = Object.values(state.unsaved);
  const oldest = unsaved.length ? unsaved.sort()[0] : null;
  const old = oldest && daysBetween(oldest, state.today) > 7;
  const tab = (id, label) => `<button data-tab="${id}" class="${state.tab === id ? 'current' : ''}">${label}</button>`;
  top.innerHTML = `<span class="name">${esc(APP_NAME)}</span>
${info ? `<button data-act="prev" title="Previous week">◀</button> <b>Week ${state.week}</b> <span>${esc(weekDates())}</span>
<button data-act="next" title="Next week">▶</button> <button data-act="today">Today</button>
${info.todayWeek == null ? `<span class="note">Today is not in the ${info.year} takwim</span>` : ''}` : ''}
<nav>${tab('week', 'Week')}${tab('classes', 'Classes')}${tab('files', '⚙ Files')}</nav>
<span class="spacer"></span>
${(state.result ? state.result.classes : []).map(s => { const p = positionWords(s); return `<span class="badge tone-${p.tone}">${esc(classLabel(s))}: ${esc(p.text)}</span>`; }).join(' ')}
${unsaved.length ? `<span class="unsaved ${old ? 'old' : ''}">● Unsaved changes</span>` : ''}
<button data-act="save" ${unsaved.length ? '' : 'disabled'}>Save rekod${unsaved.length > 1 ? ` (${unsaved.length} files)` : ''}</button>`;
}

function renderBanner() {
  const out = [];
  if (!state.persisted) out.push('<p class="banner-warn">This browser may clear the app\'s data. Use Save rekod after each session.</p>');
  banner.innerHTML = out.join('');
}

function draw() {
  renderTop();
  renderBanner();
  if (state.tab === 'files' || !ready()) renderFiles(view);
  else if (state.tab === 'classes') renderClasses(view);
  else renderWeek(view);
}

// Keep the focus where it is on press; the click then commits a half-typed field itself (see below)
top.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
top.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const { tab, act } = b.dataset;
  // Commit a half-typed field first (its change event redraws the screen), then act
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  const info = weekInfo();
  if (tab) setTab(tab);
  else if (act === 'today') goToday();
  else if (act === 'save') saveRekod();
  else if (info && (act === 'prev' || act === 'next')) {
    const i = info.weeks.indexOf(state.week) + (act === 'next' ? 1 : -1);
    if (i >= 0 && i < info.weeks.length) setWeek(info.weeks[i]);
  }
});

async function start() {
  try { await load(); } catch (e) {
    document.body.innerHTML = `<p class="fatal">This browser cannot store data here (${esc(e.message)}). Open the app in a normal Chrome or Edge window, not a private one.</p>`;
    return;
  }
  if (navigator.storage && navigator.storage.persist) state.persisted = await navigator.storage.persist();
  // No service worker in development (it would serve stale files); '?sw=1' turns it on for an offline check
  const local = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
  if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js');
  // Open on the week containing today (§5.3); otherwise the last week shown
  const info = weekInfo();
  if (info && info.todayWeek != null) state.week = info.todayWeek;
  onChange(draw);
  recalc();
}

start();
