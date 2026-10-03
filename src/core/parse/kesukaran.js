// Fail kesukaran -> { sp: Map(code -> { nilai, sebab }), tajuk: Map('10.0' -> minggu tetap) }
import { cells } from '../util.js';

function parseKesukaran(md) {
  const sp = new Map(), tajuk = new Map();
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\| *(\d+\.\d+\.\d+) *\| *([1-3]) *\|/)))
      sp.set(m[1], { nilai: Number(m[2]), sebab: cells(line)[2] || '' });
    else if ((m = line.match(/^\| *(\d+\.0) *\| *(\d+(?:\.\d+)?) *\|/))) tajuk.set(m[1], Number(m[2]));
  }
  return { sp, tajuk };
}

export { parseKesukaran };
