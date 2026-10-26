const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js');
const assembly=read('assembly.js');
const manifold=read('manifold.js');
const html=read('index.html');
const release=JSON.parse(read('RELEASE.json'));

for(const source of [app,assembly]){
  assert.match(source,/\['m³\/hr','US gpm','Imp gpm','L\/s','L\/min'\]/);
  assert.match(source,/\['Mtr','bar','kPa','psi','Ft'\]/);
  assert.match(source,/number\*\.227124707/);
  assert.match(source,/number\*\.2727654/);
  assert.match(source,/number\*3\.6/);
  assert.match(source,/number\*\.06/);
  assert.match(source,/number\*10\.19716213/);
  assert.match(source,/number\*\.1019716213/);
  assert.match(source,/number\*\.703249615/);
  assert.match(source,/number\*\.3048/);
  assert.match(source,/convertedCapacityValue/);
}

assert.match(html,/<select id="assemblyCapacityUnit"><option selected>m³\/hr<\/option><option>US gpm<\/option><option>Imp gpm<\/option><option>L\/s<\/option><option>L\/min<\/option><\/select>/);
assert.match(html,/<select id="assemblyHeadUnit"><option>Mtr<\/option><option>bar<\/option><option>kPa<\/option><option>psi<\/option><option>Ft<\/option><\/select>/);
assert.match(app,/class="print-system-desc-cell" colspan="4"/);
assert.doesNotMatch(app,/print-system-price-spacer/);
assert.doesNotMatch(app,/print-system-total-spacer/);
assert.match(manifold,/Isolation valves and flexible joints on the suction and discharge ports of each pump/);
assert.match(manifold,/const strainerText='Strainer'/);
assert.doesNotMatch(manifold,/Gate valves/);
assert.doesNotMatch(manifold,/Threaded strainer/);
assert.equal(release.version,'5.00.05');
assert.equal(release.baseline,'5.00.04');
assert.equal(release.new_database_migration_required,false);
assert.equal(read('VERSION.txt').trim(),'5.00.05');
assert.match(html,/v50005-version-lock\.js\?v=50005/);

console.log('PASS V5.00.05 KS-09..11 release regression');
