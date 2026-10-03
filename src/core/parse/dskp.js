// DSKP.md -> [{ topic, sk, code, text }] in DSKP order
import { cells } from '../util.js';

function parseDskp(md) {
  const sp = [];
  let topic = null, sk = null;
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^## (\d+\.0) (.+)/))) topic = { code: m[1], title: m[2].trim() };
    else if ((m = line.match(/^### (\d+\.\d+) (.+)/))) sk = { code: m[1], title: m[2].trim() };
    else if ((m = line.match(/^\| *(\d+\.\d+\.\d+) *\|/))) {
      if (!sk || !m[1].startsWith(sk.code + '.')) throw new Error(`SP ${m[1]} is outside SK ${sk && sk.code}`);
      sp.push({ topic, sk, code: m[1], text: cells(line)[1] });
    }
  }
  if (!sp.length) throw new Error('No SP in the DSKP');
  return sp;
}

export { parseDskp };
