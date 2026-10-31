'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const kv=read('selector-kv/index.html');
const bgf=read('selector-bgf/index.html');
const kvProduct=read('kv-product-v50017.js');
const release=JSON.parse(read('RELEASE.json'));

assert.match(index,/KeySuite V5\.00\.22/);
assert.match(index,/selector-kv\/index\.html\?v=50022&amp;ks-visible=1&amp;ks-layout=42872&amp;ks-frame=KV/);
assert.match(index,/selector-bgf\/index\.html\?v=50022&amp;ks-visible=1&amp;ks-layout=42872&amp;ks-frame=BGF/);
assert.match(index,/productKvSelectorFrame[\s\S]*?selector-kv\/index\.html\?product=1&amp;v=50022/);
assert.match(index,/productBgfSelectorFrame[\s\S]*?selector-bgf\/index\.html\?product=1&amp;v=50022/);
assert.match(index,/v50022-version-lock\.js\?v=50022/);

for(const [name,source,count] of [['KV',kv,3],['BGF',bgf,2]]){
  assert.match(source,/grid-template-columns:auto minmax\(0,1fr\) auto/);
  assert.match(source,new RegExp(`grid-template-columns:repeat\\(${count},minmax\\(92px,118px\\)\\)`));
  assert.match(source,/overflow-wrap:anywhere/);
  assert.doesNotMatch(source,/macos-safari|navigator\.userAgent|zoom\s*:|transform\s*:\s*scale/);
  assert.doesNotMatch(source,/header\{[^}]*overflow-x:hidden/);
  assert.match(source,/id="flowUnit"/);
  assert.match(source,/id="headUnit"/);
  assert.match(source,/m³\/h[\s\S]*L\/min[\s\S]*L\/s[\s\S]*US GPM[\s\S]*IGPM/);
  assert.match(source,/>m<[\s\S]*>bar<[\s\S]*>ft<[\s\S]*>kPa<[\s\S]*>psi</);
  assert.match(source,/function flowToM3h\(value,unit\)/);
  assert.match(source,/function headToM\(value,unit\)/);
}
assert.match(kv,/id="printPage"[\s\S]*id="headerAssembly"[\s\S]*id="headerQuote"/);
assert.match(bgf,/id="printPage"[\s\S]*id="headerQuote"/);
assert.match(kv,/supabase\/functions\/shared-kv\/kv-data\.js\?v=50019/);
assert.match(kvProduct,/function cleanupCurve\(\)/);
assert.equal(release.version,'5.00.22');
assert.equal(release.baseline,'5.00.21');
assert.equal(release.new_database_migration_required,false);
assert.equal(release.frozen_quotation_pdf_version,'1.08');
console.log('V5.00.22 responsive selector regression checks passed.');
