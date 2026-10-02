// Jana RPH minggu seterusnya: salin tab M terakhir -> M(n+1), tarikh +7 hari,
// SP seterusnya dari tab `data`. Jika PdP ditunda, SP yang sama diulang.
// Pasang: Extensions > Apps Script, tampal fail ini, Save, muat semula sheet.

function onOpen() {
  SpreadsheetApp.getUi().createMenu('RPH')
    .addItem('Jana minggu seterusnya', 'janaMingguSeterusnya')
    .addToUi();
}

function janaMingguSeterusnya() {
  const ss = SpreadsheetApp.getActive();
  const weeks = ss.getSheets()
    .map(s => ({ s, n: Number((s.getName().match(/^M(\d+)$/) || [])[1]) }))
    .filter(w => w.n)
    .sort((a, b) => b.n - a.n);
  if (!weeks.length) throw new Error('Tiada tab M<nombor>.');
  const last = weeks[0];
  const n = last.n + 1;

  const sp = spList(ss.getSheetByName('data'));
  const sh = last.s.copyTo(ss).setName('M' + n);
  ss.setActiveSheet(sh);
  ss.moveActiveSheet(last.s.getIndex() + 1);

  // SP yang ditunda minggu lepas diajar dahulu, kemudian sambung selepas SP sesi terakhir
  const bs = blocks(sh);
  const old = bs.map(r => ({
    text: String(sh.getRange(r.sp, 4).getValue()),
    ditunda: sh.getRange(r.refl + 2, 4).getValue() === true,
  }));
  const queue = old.filter(o => o.ditunda).map(o => sp.find(x => x.code === firstCode(o.text))).filter(Boolean);
  let prev = lastCode(old[old.length - 1].text);
  for (const r of bs) {
    let next = queue.shift();
    if (!next) {
      next = nextSp(sp, prev);
      if (next) prev = next.code;
    }
    if (next) {
      const sk = String(sh.getRange(r.sp - 1, 4).getValue());
      sh.getRange(r.sp - 2, 4).setValue(next.tajuk);
      // Kekalkan teks SK sedia ada jika kodnya sama (elak tukar huruf besar/kecil)
      if (!sk.startsWith(next.sk.split(' ')[0] + ' ')) sh.getRange(r.sp - 1, 4).setValue(next.sk);
      sh.getRange(r.sp, 4).setValue(next.text);
      sh.getRange(r.obj + 1, 4).setValue(next.text);
    }
    sh.getRange(r.week, 4).setValue(n);
    const d = new Date(sh.getRange(r.week, 5).getValue());
    d.setDate(d.getDate() + 7);
    sh.getRange(r.week, 5).setValue(d);
    sh.getRange(r.refl, 4, 3, 1).setValues([[true], [false], [false]]);
    sh.getRange(r.refl + 2, 5).setValue('PdP ditunda kerana: ');
  }
}

// Baris label bagi setiap blok RPH dalam tab
function blocks(sh) {
  const col = sh.getRange(1, 2, sh.getLastRow(), 1).getValues().map(r => String(r[0]).trim());
  const out = [];
  col.forEach((v, i) => {
    if (v !== 'RANCANGAN PENGAJARAN HARIAN') return;
    const find = label => col.indexOf(label, i) + 1;
    out.push({
      week: find('MINGGU / TARIKH / HARI'),
      sp: find('STANDARD PEMBELAJARAN'),
      obj: find('OBJEKTIF PEMBELAJARAN'),
      refl: find('REFLEKSI'),
    });
  });
  return out;
}

function spList(data) {
  return data.getRange(3, 2, data.getLastRow() - 2, 3).getValues()
    .filter(r => r[2])
    .map(r => ({ tajuk: String(r[0]).trim(), sk: String(r[1]).trim(), text: String(r[2]).trim(), code: firstCode(r[2]) }));
}

const codes = s => String(s).match(/\d+\.\d+\.\d+/g) || [];
const firstCode = s => codes(s)[0];
const lastCode = s => codes(s).slice(-1)[0];

// ponytail: satu SP per sesi; tamat senarai -> ulang SP terakhir
function nextSp(list, code) {
  const i = list.findIndex(x => x.code === code);
  return i < 0 ? null : list[Math.min(i + 1, list.length - 1)];
}
