const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const path=require('path');

const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js');
const categories=read('categories.js');
const iso=read('iso-v50011.js');
const index=read('index.html');
const customer=read('v40001-customer-brand-settings.js');
const brands=read('v40001-multibrand.js');
const bgf=read('bgf-v50006.js');
const selectorIso=read('selector-iso/index.html');
const selectorEs=read('selector-es/index.html');

function loadFunction(source,name,context={}){
  const start=source.indexOf(`function ${name}(`);
  assert.notEqual(start,-1,`${name} must exist`);
  const next=source.indexOf('\nfunction ',start+1);
  const ctx=vm.createContext(context);
  vm.runInContext(source.slice(start,next<0?undefined:next),ctx);
  return ctx[name];
}

const historyContext={};
for(const name of ['canonicalQuotationNumber','quoteRevisionNumberFromNo','quotationHistoryTimestamp','quotationHistoryUpdatedTimestamp','quotationHistoryDate','quotationHistoryDateTimestamp','compareQuotationHistoryNewest']){
  const start=app.indexOf(`function ${name}(`),next=app.indexOf('\nfunction ',start+1);
  assert.notEqual(start,-1,`${name} must exist`);
  vm.runInContext(app.slice(start,next<0?undefined:next),vm.createContext(historyContext));
}
const sameDay=[
  {no:'RC-2610-0235-R1',date:'2026-10-01',revisionDate:'2026-10-29'},
  {no:'R-2610-0240',date:'2026-10-29'},
  {no:'RC-2610-0236-R1',date:'2026-10-01',revisionDate:'2026-10-29'},
  {no:'R-2610-0238',date:'2026-10-29'},
  {no:'R-2610-0239',date:'2026-10-29'},
  {no:'RC-2610-0235-R2',date:'2026-10-01',revisionDate:'2026-10-30'}
];
assert.deepEqual(sameDay.sort(historyContext.compareQuotationHistoryNewest).map(x=>x.no),['RC-2610-0235-R2','R-2610-0240','R-2610-0239','R-2610-0238','RC-2610-0236-R1','RC-2610-0235-R1']);

const brandContext={};
for(const name of ['compareBrandPriority','brandDisplayOrder']){
  const start=app.indexOf(`function ${name}(`),next=app.indexOf('\nfunction ',start+1);
  vm.runInContext(app.slice(start,next<0?undefined:next),vm.createContext(brandContext));
}
assert.deepEqual(Array.from(brandContext.brandDisplayOrder(['% Special','Zeta','Tesk','Keylargo','B.G.Reich','Alpha'])),['B.G.Reich','Keylargo','Tesk','Alpha','Zeta','% Special']);

assert.match(categories,/head\.innerHTML='<th>Category<\/th>'/);
assert.doesNotMatch(categories,/<th>Margin %<\/th>/);
assert.match(iso,/seriesFromModel/);
assert.match(iso,/data-iso-series/);
assert.match(iso,/>Curve<\/button>/);
assert.match(index,/id="isoProductSeriesList"/);
assert.match(index,/#selectorEs,#selectorCr,#selectorIso/);
assert.match(customer,/\['CHC_G1','CHC_G2','CR','BFI','BGF','ES','ISO'/);
assert.match(customer,/found\.delete\('GENERAL'\);found\.delete\('KEYLAB'\)/);
assert.match(brands,/f==='ISO'\?'selectorIso'/);
assert.match(brands,/\['CHC','CR','BFI','ES','ISO'\]/);
assert.match(bgf,/min-width:72px/);

const responsiveContract=html=>[
  /html,body\{width:100%;max-width:100%;min-width:0;overflow-x:hidden\}/,
  /body:not\(\.product-frame\)>\.layout\{display:grid;grid-template-columns:350px minmax\(0,1fr\)/,
  /body:not\(\.product-frame\) \.grid2\{display:grid;grid-template-columns:minmax\(0,1\.55fr\) minmax\(310px,1fr\)/,
  /@media\(max-width:1100px\)\{body:not\(\.product-frame\)>\.layout\{grid-template-columns:1fr\}/,
  /html\.macos-safari body\{zoom:1;width:100%;min-width:0\}/
].every(pattern=>pattern.test(html));
assert.ok(responsiveContract(selectorEs),'ES responsive contract must remain present');
assert.ok(responsiveContract(selectorIso),'ISO must match the ES responsive contract');

assert.equal(read('VERSION.txt').trim(),'5.00.14');
assert.match(read('v50014-version-lock.js'),/const V='5\.00\.14'/);
console.log('PASS: KeySuite V5.00.14 eight-requirement regression contract');
