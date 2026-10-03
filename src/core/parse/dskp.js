// DSKP.md -> [{ bidang, sk, code, text }] ikut tertib DSKP
const { cells } = require('../util');

function parseDskp(md) {
  const sp = [];
  let bidang = null, sk = null;
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^## (\d+\.0) (.+)/))) bidang = { code: m[1], title: m[2].trim() };
    else if ((m = line.match(/^### (\d+\.\d+) (.+)/))) sk = { code: m[1], title: m[2].trim() };
    else if ((m = line.match(/^\| *(\d+\.\d+\.\d+) *\|/))) {
      if (!sk || !m[1].startsWith(sk.code + '.')) throw new Error(`SP ${m[1]} di luar SK ${sk && sk.code}`);
      sp.push({ bidang, sk, code: m[1], text: cells(line)[1] });
    }
  }
  if (!sp.length) throw new Error('Tiada SP dalam DSKP');
  return sp;
}

module.exports = { parseDskp };
