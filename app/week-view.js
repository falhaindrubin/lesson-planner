// Week screen (layout A): lesson cards on the left, RPH preview on the right.
// Cards redraw at once after a mark; the preview follows (W13).
import { state, mark } from './state.js';
import { STATUS_OPTIONS, statusLabel, needsReason } from './logic/status.js';
import { updatePreview, scrollToLesson } from './preview.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dayDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const keyOf = l => `${l.rekod}|${l.row.date}|${l.row.periods}`;

let pendingReason = null;   // { key, status } while a Postponed / Cancelled reason is being typed
let cardError = null;       // { key, message }
let lastWeek = null, lastSp = new Map(), moved = new Set();

function card(l, i) {
  const r = l.row, k = keyOf(l);
  const head = `<b>${esc(dayDate(r.date))}</b> · ${esc(r.time)} · ${esc(l.classCode)} ${esc(l.subjectName)}${r.kind === 'tutorial' ? ' · Tutorial' : ''}${r.event ? ` · <i>${esc(r.event)}</i>` : ''}`;
  if (r.kind === 'peperiksaan') return `<div class="card exam">${head}<br>Exam: ${esc(r.event)}</div>`;
  const status = pendingReason && pendingReason.key === k ? pendingReason.status : r.status;
  const reason = needsReason(status);
  const btn = s => `<button data-i="${i}" data-status="${s}" class="${status === s ? `on ${s}` : ''}">${statusLabel(s)}</button>`;
  const err = cardError && cardError.key === k ? `<div class="err">${esc(cardError.message)}</div>` : '';
  return `<div class="card ${esc(r.status)}" data-i="${i}">
<div>${head}</div>
<div class="sp">SP ${esc(r.sp.join(', ') || '—')}${moved.has(k) ? ' <small>← SPs moved since last view</small>' : ''}</div>
<div class="buttons">${STATUS_OPTIONS.map(btn).join('')}</div>
<label>Attendance <input type="number" min="0" data-i="${i}" data-field="attendance" value="${r.attendance ?? ''}"> / ${l.pupils ?? ''}</label>
<label>${reason ? 'Reason (required)' : 'Notes'} <input data-i="${i}" data-field="note" value="${esc(r.note)}" ${reason ? 'placeholder="Type the reason"' : 'placeholder="optional"'}></label>
${pendingReason && pendingReason.key === k ? `<button data-i="${i}" data-act="saveReason">Save</button>` : ''}
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
    drawCards(document.getElementById('cards')); // a refused mark changes nothing else
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
      drawCards(document.getElementById('cards'));
      document.querySelector(`.card[data-i="${cardEl.dataset.i}"] [data-field="note"]`).focus();
      return;
    }
    pendingReason = null;
    doMark(l, { status: s, attendance, note: noteInput.value });
    return;
  }
  if (b && b.dataset.act === 'saveReason') {
    doMark(l, { status: pendingReason.status, attendance, note: noteInput.value });
    return;
  }
  if (!b && !e.target.closest('input')) {
    // Clicking a card scrolls the preview to its page
    const index = state.result.lessons
      .filter(x => x.subject === l.subject && x.row.status !== 'batal')
      .indexOf(l);
    if (index >= 0) scrollToLesson(document.getElementById('previews'), l.subject, index);
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

function renderWeek(view) {
  if (view.dataset.screen !== 'week') {
    view.dataset.screen = 'week';
    view.innerHTML = '<div class="week"><section id="cards"></section><section id="previews"></section></div>';
    const cards = view.querySelector('#cards');
    // A button press must not blur the focused input first: the blur would commit and redraw the cards
    // under the pointer, and the click would be lost. onClick reads the typed values itself.
    cards.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    cards.addEventListener('click', onClick);
    cards.addEventListener('change', onChangeField);
  }
  drawCards(view.querySelector('#cards'));
  updatePreview(view.querySelector('#previews'), state.result ? state.result.rph.filter(p => p.week === state.week) : []);
}

export { renderWeek };
