// "Save rekod": download every rekod changed since the last save, exactly as stored (W2).
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
  for (const path of Object.keys(state.unsaved)) if (state.files.has(path)) download(baseName(path), state.files.get(path));
  state.unsaved = {};
  await setSetting('unsaved', state.unsaved);
  emit();
}

export { saveRekod };
