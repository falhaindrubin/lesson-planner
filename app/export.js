// "Save rekod": download a rekod changed since the last save, exactly as stored (W2).
// One file per click: Chrome may block several downloads at once, and a flag is cleared only for a file
// that was handed to the browser, so a blocked download is never reported as saved.
// The teacher saves it over the file in the Rekod folder, so the CLI and git see it.
import { state, emit } from './state.js';
import { setSetting } from './store.js';
import { baseName } from './logic/paths.js';

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function saveRekod() {
  const path = Object.keys(state.unsaved).find(p => state.files.has(p));
  if (path) download(baseName(path), state.files.get(path));
  if (path) delete state.unsaved[path];
  else state.unsaved = {};
  await setSetting('unsaved', state.unsaved);
  emit();
}

export { saveRekod };
