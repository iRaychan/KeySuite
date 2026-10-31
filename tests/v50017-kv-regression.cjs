const fs=require('fs');
const path=require('path');
const vm=require('vm');
const crypto=require('crypto');
const assert=require('assert/strict');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

// Workbook import contract: only the 39 complete KV1 model rows are exposed.
global.window=global;
require(path.join(root,'supabase/functions/shared-kv/kv-data.js'));
require(path.join(root,'supabase/functions/shared-kv/kv-selector-core.js'));
require(path.join(root,'kv-price-data-v50017.js'));
const db=global.KeySuiteKVData,core=global.KeySuiteKVCore;
assert.equal(db.models.length,39);
assert.deepEqual([...new Set(db.models.map(row=>row.series))],['KV 1']);
assert.equal(db.models[0].model,'KV 1-20');
assert.equal(db.models.at(-1).model,'KV 1-400');
assert.ok(db.models.every(row=>row.motor_kw>0&&row.motor_hp>0&&row.connection&&row.dimensions&&Number.isFinite(row.dimensions.H)));
assert.deepEqual(Object.keys(db.curves),['KV 1']);

// Excel shutoff power must survive curve fitting exactly, including Q=0.
for(const [index,expected] of [[0,.088],[38,1.76]]){
  const result=core.evaluateModel(db,db.models[index],0,0,50);
  assert.ok(result);
  assert.ok(Math.abs(result.shutoff_power_kw-expected)<1e-12);
  assert.ok(Math.abs(core.fitValue(result.powerFit,0)-expected)<1e-12);
  assert.equal(new Set(result.headFit.pts.map(point=>point.x)).size,result.headFit.pts.length);
}
const selection=core.select(db,1,50,50);
assert.ok(selection.selected&&selection.candidates.length>0);
assert.ok(selection.selected.predHead>=50-.01);

// Integrated application surfaces and migration hooks.
const index=read('index.html'),app=read('app.js'),categories=read('categories.js'),migration=read('supabase/migrations/20261031143000_v50017_kv_integration.sql');
for(const id of ['selectorKv','selectorKvFrame','productKv','productKvSelectorFrame','kvPriceList','kvPriceRows'])assert.match(index,new RegExp(`id="${id}"`));
for(const script of ['shared-kv/kv-data.js','kv-price-data-v50017.js','kv-pricelist-v50017.js','kv-product-v50017.js'])assert.ok(index.includes(script));
assert.match(app,/KeySuiteKVProduct\?\.routeSelection/);
assert.match(categories,/keysuite_save_kv_category_rule_v50017/);
assert.match(read('v3944-categories.js'),/const products=\['CHC_G1','CHC_G2','CR','KV'/);
assert.match(migration,/ks_products_kv/);
assert.match(migration,/keysuite_save_kv_product_price_v50017/);
assert.match(migration,/keysuite_save_category_currency_selection_v41511/);
assert.match(migration,/'KV'/);
const shellSource=read('sw.js'),shellPaths=[...shellSource.matchAll(/'\.\/([^']+)'/g)].map(match=>match[1]).filter(item=>item!=='v42875-version-lock.js');
shellPaths.push('v50017-version-lock.js');
assert.deepEqual([...new Set(shellPaths.filter(file=>!fs.existsSync(path.join(root,file))))],[]);

// KV uses the established category/currency quotation calculation.
const element=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},closest(){return element()},setAttribute(){},removeAttribute(){},value:'',textContent:'',innerHTML:'',disabled:false});
const customer={id:'kv-customer',pricingCategoryId:'kv-category',distanceKm:0};
const category={id:'kv-category',productRules:{KV:{margin:.2,normal:0,rare:0,transport:0,currencies:['RMB']}}};
const context={console,setTimeout,clearTimeout,window:{addEventListener(){},KEYSUITE_ACCESS:{role:'owner'},KeySuiteComponents:{apply:calc=>calc},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer}},document:{readyState:'loading',addEventListener(){},getElementById(){return element()},querySelectorAll(){return []}},CustomEvent:function(){}};
vm.createContext(context);vm.runInContext(read('pricing.js'),context);
const priceProduct={...JSON.parse(JSON.stringify(global.KeySuiteKVPriceData?.models?.[0]||{})),id:'KV:KV 1-20',model:'KV 1-20',motor_kw:.37,motor_hp:.5,connection:'DN25 (G1¼)',pricesByCurrency:{USD:{KV:0},RMB:{KV:1000},MYR:{KV:0}},rarityByCurrency:{RMB:{KV:'many'}}};
context.window.KeySuitePricing.init({categories:[category],kvProducts:[priceProduct],motorProducts:[],productMultipliers:{KV:{USD:5.8,RMB:.65,MYR:1}},customerPricingRows:[]},{role:'owner'});
const priced=context.window.KeySuitePricing.findKvPrice('KV 1-20',{customer,category,motor_hp:.5,motor_kw:.37,pole:2,motor_efficiency_class:'IE3'});
assert.ok(priced);
assert.equal(priced.calc.sourceCurrency,'RMB');
assert.equal(priced.calc.finalPrice,820);
assert.equal(context.window.KeySuitePricing.quoteBlockReason(priced.calc),'');
assert.match(context.window.KeySuitePricing.kvDescription('KV 1-20',priceProduct,{motor_hp:.5,connection:priceProduct.connection}),/B\.G\.Reich Vertical Multistage Pump/);

// Frozen CR and quotation-PDF assets are byte-identical to V5.00.16.
const preserved={
  'pdf-optimization.js':'61cc19d460e70d4f8545783935beb7eb5e65c7890dc7f19523d1f3233a384614',
  'selector-cr/index.html':'224594e1ef5f5ecfcede14f332f82fcd60a2bce8bd9fa847ccfcf5aacf330898',
  'selector-cr/product.html':'6cb441dfa181be1128bb9dfa4c96b789b09fb2177b5f4ceb5ac930da1797b974',
  'supabase/functions/shared-cr/cr-data.js':'10984ca6fdfad41b86e26b8ed7ec3fc67da817eb224035a2565d6b29b7212315',
  'supabase/functions/shared-cr/cr-selector-core.js':'d70037885e50b64f574ec488fbda6c76ecd7594314573d61ff999076ae55e839',
  'cr-product.js':'77b8f4e656215919492d72b37a566ebaa90f41102d1d46da41bf21b688444cd9',
  'cr-price-data-v42854.js':'86fac315bbd8dce6fccd32fdf8c9ee898294fa497c776055c2184a5d6adcf7ca',
  'cr-pricelist-v42854.js':'ba1e0b2d5897646a72ae513cb1d1017ef0dd8ef56aa119ea82b9544d9e057e7a'
};
for(const [file,expected] of Object.entries(preserved))assert.equal(sha(read(file)),expected,`${file} changed`);
const printMarkup=index.slice(index.indexOf('<div id="printQuotationDocument"'),index.indexOf('<script src="config.js">'));
assert.equal(sha(printMarkup),'44641a3b87ec90cdfd342eaacf65f5b90dbde6f313df5269a76de431b34955ba');
assert.equal(JSON.parse(read('RELEASE.json')).frozen_quotation_pdf_version,'1.08');
assert.equal(read('VERSION.txt').trim(),'5.00.17');
assert.match(read('v50017-version-lock.js'),/const V='5\.00\.17'/);

console.log('PASS: KeySuite V5.00.17 KV integration regression contract');
