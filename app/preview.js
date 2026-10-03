// RPH preview: one iframe per subject with the real printable HTML (what you see is what prints).
// Redrawn after the cards, so clicks stay fast (W13); unchanged HTML is not reloaded.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let shown = new Map(); // subject → html
let pending = 0;

function updatePreview(box, rph) {
  clearTimeout(pending);
  pending = setTimeout(() => draw(box, rph), 0);
}

function draw(box, rph) {
  if (!rph.length) { box.innerHTML = '<p class="note">No RPH pages this week.</p>'; box.dataset.subjects = ''; shown = new Map(); return; }
  const subjects = rph.map(p => p.subject).join('|');
  if (box.dataset.subjects !== subjects) {
    box.dataset.subjects = subjects;
    box.innerHTML = rph.map(p => `<div class="pv" data-subject="${esc(p.subject)}">
<header><b>RPH preview · ${esc(p.subject)}</b><span class="spacer"></span>
<button data-print="${esc(p.subject)}">Print week</button> <button data-open="${esc(p.subject)}">Open in new tab</button></header>
<iframe title="RPH ${esc(p.subject)}"></iframe></div>`).join('');
    shown = new Map();
    box.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      const subject = b.dataset.print || b.dataset.open;
      const html = shown.get(subject);
      if (b.dataset.print) { const f = frame(box, subject); f.contentWindow.focus(); f.contentWindow.print(); }
      if (b.dataset.open && html) {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    };
  }
  for (const p of rph) {
    if (shown.get(p.subject) === p.html) continue;
    frame(box, p.subject).srcdoc = p.html;
    shown.set(p.subject, p.html);
  }
}

const frame = (box, subject) => box.querySelector(`.pv[data-subject="${CSS.escape(subject)}"] iframe`);

// Scroll a subject's preview to its index-th page (cancelled lessons have no page)
function scrollToLesson(box, subject, index) {
  const f = frame(box, subject);
  const page = f && f.contentDocument && f.contentDocument.querySelectorAll('section.rph')[index];
  if (page) page.scrollIntoView({ block: 'start' });
}

export { updatePreview, scrollToLesson };
