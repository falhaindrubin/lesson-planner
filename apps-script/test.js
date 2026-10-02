const fs=require('fs'),vm=require('vm'),assert=require('assert');
const fx=JSON.parse(fs.readFileSync(__dirname+'/fx.json','utf8'));
function sheet(name,g){g=g.map(r=>r.slice());return{name,g,getName(){return this.name},setName(n){this.name=n;return this},getIndex:()=>1,getLastRow:()=>g.length,
 copyTo(){return sheet(name,g)},
 getRange(r,c,nr=1,nc=1){const s=this;return{getValue:()=>{let v=g[r-1][c-1];return c==5&&typeof v=='string'&&/^\d{4}-/.test(v)?new Date(v):v},
  getValues:()=>g.slice(r-1,r-1+nr).map(x=>x.slice(c-1,c-1+nc)),
  setValue(v){g[r-1][c-1]=v},setValues(vs){vs.forEach((x,i)=>x.forEach((v,j)=>g[r-1+i][c-1+j]=v))}}}}}
let sheets=[sheet('data',fx.data),sheet('M34',fx.M34)];
const ss={getSheets:()=>sheets,getSheetByName:n=>sheets.find(s=>s.getName()==n),setActiveSheet(s){sheets.push(s)},moveActiveSheet(){}};
const ctx={SpreadsheetApp:{getActive:()=>ss},Date,String,Number,Math,Error};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[2]||__dirname+'/Code.gs','utf8'),ctx);
// Case 1: normal -> M34 taught 4.2.7+4.2.8, so M35 gets 4.2.9, 4.2.10
vm.runInContext('janaMingguSeterusnya()',ctx);
let m=ss.getSheetByName('M35').g;
assert.match(m[14][3],/^4\.2\.9 /);assert.match(m[17][3],/^4\.2\.9 /);assert.match(m[43][3],/^4\.2\.10 /);
assert.equal(m[5][3],35);assert.equal(m[5][4].toDateString(),new Date('2026-10-06T00:00').toDateString());
assert.equal(m[13][3],'4.2 Kod Arahan HTML'); // SK case kept
assert.deepEqual([m[25][3],m[26][3],m[27][3]],[true,false,false]);
// Case 2: first session ditunda -> 4.2.7 retaught first, second continues after 4.2.8
sheets=[sheet('data',fx.data),sheet('M34',fx.M34)];
ss.getSheetByName('M34').g[27][3]=true;
vm.runInContext('janaMingguSeterusnya()',ctx);
m=ss.getSheetByName('M35').g;
assert.match(m[14][3],/^4\.2\.7 /);assert.match(m[43][3],/^4\.2\.9 /);
// Case 3: M36 continues after M35's LAST session (4.2.9), not its first
vm.runInContext('janaMingguSeterusnya()',ctx);m=ss.getSheetByName('M36').g;assert.match(m[14][3],/^4.2.10 /);assert.equal(m[5][3],36);
console.log('OK');
