// Difficulty file -> { sp: Map(code -> { value, reason }), topics: Map('10.0' -> fixed weeks) }
import { cells } from '../util.js';

function parseDifficulty(md) {
  const sp = new Map(), topics = new Map();
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\| *(\d+\.\d+\.\d+) *\| *([1-3]) *\|/)))
      sp.set(m[1], { value: Number(m[2]), reason: cells(line)[2] || '' });
    else if ((m = line.match(/^\| *(\d+\.0) *\| *(\d+(?:\.\d+)?) *\|/))) topics.set(m[1], Number(m[2]));
  }
  return { sp, topics };
}

export { parseDifficulty };
