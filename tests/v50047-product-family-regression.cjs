'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(read('product-family-registry-v50047.js'),context);
const registry=context.window.KeySuiteProductFamilies;
const expected=['BASEPLATE','BFI','BGF','BSV','BSW','CHC_G1','CHC_G2','COUPLING','CR','ES','GWS','ISO','KEYPLC','KV','MANIFOLD','MOTOR'];
assert.deepEqual(Array.from(registry.list(),x=>x.code),expected);
assert.equal(registry.get('CHC').code,'CHC_G2');assert.equal(registry.label('ES','mapping'),'End Suction');

const index=read('index.html'),multi=read('v40001-multibrand.js'),categories=read('categories.js'),pricing=read('pricing.js');
assert(index.indexOf('product-family-registry-v50047.js')<index.indexOf('pricing.js?v=50047'));
assert(index.indexOf('product-family-registry-v50047.js')<index.indexOf('v41200-bootstrap.js?v=50047'));
assert(!index.includes('data-category-product="BSW"'),'Category family buttons must be generated from the registry');
assert(!index.includes('data-pricing-family="BSW"'),'Pricing family tabs must be generated from the registry');
assert(multi.includes('const options=priceGroupRegistry()'),'OEM mapping dropdown must use the shared registry');
assert(!multi.includes('PRICE_GROUP_OPTIONS'),'Legacy seven-item mapping list must be removed');
assert(categories.includes('KeySuiteProductFamilies?.list?.()'),'Category Management must use the shared registry');
assert(pricing.includes('KeySuiteProductFamilies?.list?.()'),'Category Compare/pricing tabs must use the shared registry');
assert(pricing.includes('BSV:{USD:5.8,RMB:.65,MYR:1}'),'BSV fallback multiplier must remain available before secure data loads');

const migration=read('supabase/migrations/20261107000300_v50047_product_family_registry.sql');
for(const code of expected)assert(migration.includes(`'${code}'`),`migration validator missing ${code}`);
assert(migration.includes("if v_group='CHC' then v_group:='CHC_G2'"),'legacy CHC alias must be preserved');
assert.equal(JSON.parse(read('RELEASE.json')).version,'5.00.47');
assert(index.includes("window.KEYSUITE_VERSION='5.00.47'"));
console.log(JSON.stringify({pass:true,families:expected,checks:31},null,2));
