// IndexedDB: 'files' (path → text) and 'settings' (key → value). One database per origin.
const NAME = 'lesson-planner', VERSION = 1;
let db = null;

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('IndexedDB is not available')); return; }
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => { r.result.createObjectStore('files'); r.result.createObjectStore('settings'); };
    r.onsuccess = () => resolve((db = r.result));
    r.onerror = () => reject(r.error || new Error('IndexedDB could not be opened'));
  });
}

function run(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Storage write aborted'));
  });
}

async function allFiles() {
  const keys = await run('files', 'readonly', s => s.getAllKeys());
  const values = await run('files', 'readonly', s => s.getAll());
  return new Map(keys.map((k, i) => [k, values[i]]));
}
const putFiles = entries => run('files', 'readwrite', s => { for (const [k, v] of entries) s.put(v, k); return null; });
const getSetting = key => run('settings', 'readonly', s => s.get(key));
const setSetting = (key, value) => run('settings', 'readwrite', s => s.put(value, key));

export { open, allFiles, putFiles, getSetting, setSetting };
