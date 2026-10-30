// Week screen (layout A): lesson cards on the left, RPH preview on the right.
// Cards redraw at once after a mark; the preview follows (W13).
import { state, mark, setTab } from './state.js';
import { STATUS_OPTIONS, statusLabel, needsReason } from './logic/status.js';
import { updatePreview, scrollToLesson } from './preview.js';
import { positionWords } from './logic/words.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dayDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const keyOf = l => `${l.rekod}|${l.row.date}|${l.row.periods}`;

let pendingReason = null;   // { key, status } while a Postponed / Cancelled reason is being typed
let cardError = null;       // { key, message }
let lastWeek = null, lastSp = new Map(), moved = new Set();

// opts.today: omit the date (Today screen); opts.next: eyebrow text for the next lesson; opts.chip: position pill
function card(l, i, opts = {}) {
  const r = l.row, k = keyOf(l);
  const when = `<b>${opts.today ? '' : `${esc(dayDate(r.date))} · `}${esc(r.time)}</b>`;
  const who = `${esc(l.classCode)} ${esc(l.subjectName)}${r.kind === 'tutorial' ? ' · Tutorial' : ''}`;
  const head = `<div class="card-head"><span>${when}</span><span class="who">${who}</span></div>${r.event ? `<div class="event">${esc(r.event)}</div>` : ''}`;
  if (r.kind === 'peperiksaan') return `<div class="card exam">${head}<div class="sp">Exam: ${esc(r.event)}</div></div>`;
  const status = pendingReason && pendingReason.key === k ? pendingReason.status : r.status;
  const reason = needsReason(status);
  const btn = s => `<button data-i="${i}" data-status="${s}" class="${status === s ? `on ${s}` : ''}">${statusLabel(s)}</button>`;
  const err = cardError && cardError.key === k ? `<div class="err">${esc(cardError.message)}</div>` : '';
  return `<div class="card ${esc(r.status)}${opts.next ? ' next' : ''}" data-i="${i}">
${opts.next ? `<div class="eyebrow">${esc(opts.next)}</div>` : ''}${head}
<div class="sp">SP ${esc(r.sp.join(', ') || '—')}${moved.has(k) ? ' <small>← SPs moved since last view</small>' : ''}${opts.chip ? ` <span class="badge tone-${opts.chip.tone}">${esc(opts.chip.text)}</span>` : ''}</div>
<div class="buttons">${STATUS_OPTIONS.map(btn).join('')}</div>
<div class="fields"><label>Attendance <input type="number" min="0" data-i="${i}" data-field="attendance" value="${r.attendance ?? ''}"> / ${l.pupils ?? ''}</label>
<label class="grow">${reason ? 'Reason (required)' : 'Notes'} <input data-i="${i}" data-field="note" value="${esc(r.note)}" ${reason ? 'placeholder="Type the reason"' : 'placeholder="optional"'}></label>
${pendingReason && pendingReason.key === k ? `<button data-i="${i}" data-act="saveReason">Save</button>` : ''}</div>
${err}</div>`;
}

function trackMoves(lessons) {
  if (lastWeek !== state.week) { lastWeek = state.week; lastSp = new Map(); moved = new Set(); }
  for (const l of lessons) {
    const k = keyOf(l), sp = l.row.sp.join(', ');
    if (lastSp.has(k) && lastSp.get(k) !== sp) moved.add(k);
    lastSp.set(k, sp);
  }
}

function drawCards(cards) {
  const r = state.result;
  const lessons = r ? r.lessons : [];
  trackMoves(lessons);
  const off = r ? r.days.filter(d => d.holiday) : [];
  cards.innerHTML = `${state.error ? `<div class="errorbar">${esc(state.error)}</div>` : ''}
${off.length ? `<div class="days">${off.map(d => `<span class="day off">${esc(dayDate(d.date))}: ${esc(d.holiday)}</span>`).join('')}</div>` : ''}
${lessons.length ? lessons.map(card).join('') : '<p class="note">No lessons this week.</p>'}
${r && r.warnings.length ? `<div class="warnings">${r.warnings.map(w => `<div>⚠ ${esc(w)}</div>`).join('')}</div>` : ''}`;
}

// mark() redraws synchronously on success, so clear the pending reason first and restore it on failure
function doMark(l, change) {
  const keep = pendingReason;
  pendingReason = null;
  cardError = null;
  const res = mark(l, change);
  if (!res.ok) {
    pendingReason = keep;
    cardError = { key: keyOf(l), message: res.error };
    redraw(); // a refused mark changes nothing else
  }
}

function onClick(e) {
  const b = e.target.closest('button');
  const cardEl = e.target.closest('.card[data-i]');
  if (!cardEl) return;
  const l = state.result.lessons[Number(cardEl.dataset.i)];
  const noteInput = cardEl.querySelector('[data-field="note"]');
  const att = cardEl.querySelector('[data-field="attendance"]').value;
  const attendance = att === '' ? null : Number(att);
  if (b && b.dataset.status) {
    const s = b.dataset.status;
    if (needsReason(s)) {
      pendingReason = { key: keyOf(l), status: s };
      cardError = null;
      redraw();
      document.querySelector(`.card[data-i="${cardEl.dataset.i}"] [data-field="note"]`).focus();
      return;
    }
    pendingReason = null;
    doMark(l, { status: s, attendance, note: noteInput.value });
    return;
  }
  if (b && b.dataset.act === 'toWeek') { setTab('week'); return; }
  if (b && b.dataset.act === 'saveReason') {
    doMark(l, { status: pendingReason.status, attendance, note: noteInput.value });
    return;
  }
  if (!b && !e.target.closest('input')) {
    // Clicking a card scrolls the preview to its page
    const index = state.result.lessons
      .filter(x => x.subject === l.subject && x.row.status !== 'batal')
      .indexOf(l);
    const pv = document.getElementById('previews');
    if (index >= 0 && pv) scrollToLesson(pv, l.subject, index);
  }
}

function onChangeField(e) {
  const input = e.target.closest('[data-field]');
  if (!input) return;
  const l = state.result.lessons[Number(input.dataset.i)];
  const cardEl = input.closest('.card');
  if (pendingReason && pendingReason.key === keyOf(l)) return; // saved with the Save button
  const att = cardEl.querySelector('[data-field="attendance"]').value;
  doMark(l, { status: l.row.status, attendance: att === '' ? null : Number(att), note: cardEl.querySelector('[data-field="note"]').value });
}

// Redraw whichever lesson list is on screen
const redraw = () => (document.getElementById('todaycards') ? drawToday(document.getElementById('todaycards')) : drawCards(document.getElementById('cards')));

// A button press must not blur the focused input first: the blur would commit and redraw the cards
// under the pointer, and the click would be lost. onClick reads the typed values itself.
function bindCards(box) {
  box.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  box.addEventListener('click', onClick);
  box.addEventListener('change', onChangeField);
}

// '7:30–8:30' -> [450, 510]; school times below 6 are afternoon
const minutes = t => { const [h, m] = t.split(':').map(Number); return (h < 6 ? h + 12 : h) * 60 + m; };
const span = time => time.split('–').map(minutes);
const wait = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

function drawToday(box) {
  const r = state.result;
  trackMoves(r ? r.lessons : []);
  const todays = r ? r.lessons.map((l, i) => [l, i]).filter(([l]) => l.row.date === state.today) : [];
  const d = new Date(), now = d.getHours() * 60 + d.getMinutes();
  const nextAt = todays.findIndex(([l]) => span(l.row.time)[1] > now);
  const title = new Date(`${state.today}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const chipFor = l => { const s = r.classes.find(c => c.classCode === l.classCode && c.subject === l.subject); return s ? positionWords(s) : null; };
  const one = ([l, i], opts) => card(l, i, { today: true, ...opts });
  let body;
  if (!todays.length) {
    const off = r && r.days.find(x => x.date === state.today && x.holiday);
    const later = r && r.lessons.find(l => l.row.date > state.today);
    body = `<div class="empty"><b>${off ? esc(off.holiday) : 'No lessons today'}</b>${off ? '<br>No lessons today.' : ''}
${later ? `<p class="note">Next lesson: ${esc(dayDate(later.row.date))} · ${esc(later.row.time)} · ${esc(later.classCode)} ${esc(later.subjectName)}</p>` : ''}</div>`;
  } else {
    const l0 = nextAt >= 0 ? todays[nextAt][0] : null;
    const [start, end] = l0 ? span(l0.row.time) : [0, 0];
    const label = !l0 ? '' : start > now ? `Next · in ${wait(start - now)}` : `Now · ends in ${wait(end - now)}`;
    const before = nextAt < 0 ? todays : todays.slice(0, nextAt);
    const after = nextAt < 0 ? [] : todays.slice(nextAt + 1);
    body = `${before.length ? `<div class="section-label">${nextAt < 0 ? 'Today · all lessons are over' : 'Earlier today'}</div>${before.map(x => one(x)).join('')}` : ''}
${l0 ? one(todays[nextAt], { next: label, chip: chipFor(l0) }) : ''}
${l0 ? '<div class="links"><button data-act="toWeek">Open the week and RPH preview</button></div>' : ''}
${after.length ? `<div class="section-label">Later today</div>${after.map(x => one(x)).join('')}` : ''}`;
  }
  box.innerHTML = `${state.error ? `<div class="errorbar">${esc(state.error)}</div>` : ''}
<h2>${esc(title)}</h2><div class="sub">Week ${state.week} · ${todays.length} lesson${todays.length === 1 ? '' : 's'} today</div>
${body}
${r && r.warnings.length ? `<div class="warnings">${r.warnings.map(w => `<div>⚠ ${esc(w)}</div>`).join('')}</div>` : ''}`;
}

function renderToday(view) {
  if (view.dataset.screen !== 'today') {
    view.dataset.screen = 'today';
    view.innerHTML = '<div class="today"><section id="todaycards"></section></div>';
    bindCards(view.querySelector('#todaycards'));
  }
  drawToday(view.querySelector('#todaycards'));
}

function renderWeek(view) {
  if (view.dataset.screen !== 'week') {
    view.dataset.screen = 'week';
    view.innerHTML = '<div class="week"><section id="cards"></section><section id="previews"></section></div>';
    bindCards(view.querySelector('#cards'));
  }
  drawCards(view.querySelector('#cards'));
  updatePreview(view.querySelector('#previews'), state.result ? state.result.rph.filter(p => p.week === state.week) : []);
}

export { renderWeek, renderToday };
