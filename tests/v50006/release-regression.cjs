const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js'),assembly=read('assembly.js'),manifold=read('manifold.js'),auth=read('auth.js'),bgf=read('bgf-v50006.js'),html=read('index.html'),messenger=read('keyhq-messenger.js'),sql=read('supabase/migrations/20261026190000_v50006_bgf_pricelist.sql'),release=JSON.parse(read('RELEASE.json'));

for(const model of ['BGF 350M','BGF 350E','BGF 400','BGF 500']){
  assert.match(bgf,new RegExp(model.replace(' ','\\s')));
  assert.match(sql,new RegExp(model.replace(' ','\\s')));
}
assert.match(bgf,/sourceModel:'BGF 550'/);
assert.match(sql,/'BGF 500','BGF 550',7,4,5\.5/);
assert.match(sql,/price_myr numeric not null default 0/);
assert.match(sql,/price_usd numeric not null default 0/);
assert.match(sql,/price_rmb numeric not null default 0/);
assert.match(sql,/enable row level security/);
assert.match(sql,/for update to authenticated/);
assert.match(sql,/with check/);
assert.doesNotMatch(sql,/security definer/i);
assert.match(auth,/from\('ks_products_bgf'\)/);
assert.match(auth,/KeySuiteBGF\?\.init/);
assert.match(html,/data-go="bgfPriceList"/);
assert.match(html,/<section id="bgfPriceList" class="page">/);
assert.match(html,/bgf-v50006\.js\?v=50006/);

assert.match(app,/QUOTE_DESCRIPTION_MIN_ROWS=5/);
assert.match(app,/Math\.max\(explicitHeight,area\.scrollHeight\)/);
assert.match(app,/<textarea class="item-description" rows="5">/);
assert.match(app,/normalizeDescriptionIndentation/);
assert.match(messenger,/installPageMessengerButtons/);
assert.match(messenger,/page\.querySelector\('\:scope > \.page-title-row \.page-note-access,\:scope > \.quote-head \.page-note-access'\)/);
assert.match(messenger,/for\(const current of \[button,\.\.\.pageButtons\]\)/);

// Preserve the V5.00.05 KS-09..11 functional invariants while superseding its version lock.
for(const source of [app,assembly]){
  assert.match(source,/\['m³\/hr','US gpm','Imp gpm','L\/s','L\/min'\]/);
  assert.match(source,/\['Mtr','bar','kPa','psi','Ft'\]/);
  assert.match(source,/number\*\.227124707/);assert.match(source,/number\*\.2727654/);assert.match(source,/number\*3\.6/);assert.match(source,/number\*\.06/);
  assert.match(source,/number\*10\.19716213/);assert.match(source,/number\*\.1019716213/);assert.match(source,/number\*\.703249615/);assert.match(source,/number\*\.3048/);
  assert.match(source,/convertedCapacityValue/);
}
assert.match(app,/class="print-system-desc-cell" colspan="4"/);assert.doesNotMatch(app,/print-system-price-spacer|print-system-total-spacer/);
assert.match(manifold,/Isolation valves and flexible joints on the suction and discharge ports of each pump/);assert.match(manifold,/const strainerText='Strainer'/);assert.doesNotMatch(manifold,/Gate valves|Threaded strainer/);

const workbook=fs.readFileSync(path.join(root,'source/004 - BGF -  261026 - V1.0.xlsx'));
assert.equal(crypto.createHash('sha256').update(workbook).digest('hex'),'592d495ad36f6734ee72aa4b7912acb1d69af113519b06514fe1ff35f0e339d3');
assert.equal(release.version,'5.00.06');
assert.equal(release.baseline,'5.00.05');
assert.equal(release.new_database_migration_required,true);
assert.equal(read('VERSION.txt').trim(),'5.00.06');
assert.match(html,/v50006-version-lock\.js\?v=50006/);
console.log('PASS V5.00.06 three-change release regression');
