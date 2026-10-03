// Paths of picked files: '/'-separated, relative to the picked folders' parent
// (e.g. 'sample/kelas-2026.md'). A dropped file has only its name.
const dirOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const baseName = p => p.slice(p.lastIndexOf('/') + 1);

// A path from the class file, relative to the class file's folder. '..' above the top is dropped,
// so a file outside the picked folders can still be found by its name (findFile).
function resolvePath(dir, rel) {
  const parts = dir ? dir.split('/') : [];
  for (const s of rel.replace(/\\/g, '/').split('/')) {
    if (s === '' || s === '.') continue;
    if (s === '..') parts.pop();
    else parts.push(s);
  }
  return parts.join('/');
}

// The stored path for a wanted path: exact match, else the only stored file with the same name.
// Two stored files with that name: an error naming both, never a silent pick.
function findFile(paths, wanted) {
  if (paths.includes(wanted)) return wanted;
  const same = paths.filter(p => baseName(p) === baseName(wanted));
  if (same.length > 1) throw new Error(`More than one file named ${baseName(wanted)}: ${same.join(', ')}`);
  return same[0] || null;
}

export { dirOf, baseName, resolvePath, findFile };
