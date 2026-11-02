const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');

const dataContext={globalThis:{}};vm.createContext(dataContext);vm.runInContext(read('supabase/functions/shared-kv/kv-data.js'),dataContext);
const kv=dataContext.globalThis.KeySuiteKVData;
assert.equal(kv.app_version,'5.00.31');assert.equal(kv.database_version,'261102-V1.3');assert.equal(kv.models.length,171);
assert.deepEqual([...new Set(kv.models.map(x=>x.series))],['KV 1','KV 2','KV 3','KV 4','KV 5']);
assert.equal(kv.models.filter(x=>x.series==='KV 4').length,29);assert.equal(kv.models.filter(x=>x.series==='KV 5').length,37);
assert(kv.models.every(x=>kv.curves[x.series]));assert(Object.values(kv.curves).every(c=>c.flow[0]===0));
assert.equal(kv.models.find(x=>x.model==='KV 2-310').dimensions.D1,259);assert.equal(kv.models.find(x=>x.model==='KV 5-380').connection,'DN32 (G1¼)');

const priceContext={window:{}};vm.createContext(priceContext);vm.runInContext(read('kv-price-data-v50017.js'),priceContext);
const rows=priceContext.window.KeySuiteKVPriceData.models;assert.equal(rows.length,171);
for(const row of rows)for(const currency of ['USD','RMB','MYR'])assert.deepEqual(Object.keys(row.pricesByCurrency[currency]),['KVC','KV','KVN']);

const customer={id:'c',pricingCategoryId:'cat'},category={id:'cat',productRules:{KV:{margin:0,normal:0,rare:0,transport:0,currencies:['USD'],useCommission:false,useSetDiscount:false,useFinalDiscount:false,useFuelCharge:false}}};
const el=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return el()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},value:'',innerHTML:''});
const pctx={console,setTimeout,clearTimeout,structuredClone,localStorage:{getItem(){return null},setItem(){}},window:{addEventListener(){},dispatchEvent(){},KeySuiteComponents:{apply:x=>x},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer}},document:{getElementById:el,querySelectorAll(){return[]},addEventListener(){},readyState:'loading'}};vm.createContext(pctx);vm.runInContext(read('pricing.js'),pctx);pctx.window.KeySuitePricing.init({categories:[category],kvProducts:[{id:'x',model:'KV 1-20',motor_hp:.5,motor_kw:.37,pricesByCurrency:{USD:{KVC:100,KV:200,KVN:300},RMB:{},MYR:{}},rarityByCurrency:{USD:{KVC:'common',KV:'common',KVN:'common'},RMB:{},MYR:{}}}],productMultipliers:{KV:{USD:1,RMB:1}},customerPricingRows:[]},{});
assert.equal(pctx.window.KeySuitePricing.findKvPrice('KV 1-20',{material:'KVC'}).calc.sourcePrice,100);
assert.equal(pctx.window.KeySuitePricing.findKvPrice('KV 1-20',{material:'KV'}).calc.sourcePrice,200);
assert.equal(pctx.window.KeySuitePricing.findKvPrice('KV 1-20',{material:'KVN'}).calc.sourcePrice,300);

const permissions=read('permissions.js'),roles=read('roles.js'),settings=read('v40001-customer-brand-settings.js'),es=read('selector-es/index.html'),bsw=read('bsw-v50027.js'),cost=read('costing-audit-v50031.js'),migration=read('supabase/migrations/20261102190000_v50031_kv_costing_audit.sql');
assert.match(permissions,/view_costing_breakdown=role==='owner'\?'full':'none'/);assert.match(roles,/View Costing Breakdown/);
assert.match(settings,/seen\.has\(e\.key\)/);assert.match(es,/Impeller Diameter: /);assert.match(es,/impeller_trimmed/);
assert.match(bsw,/addEventListener\('load'/);assert.match(cost,/Assembly<\/th><th colspan="3">Individual/);assert.match(cost,/keysuite_can_view_costing_breakdown_v50031/);
assert.match(migration,/Existing KV price\/rarity columns remain the KV book/);assert.match(migration,/keysuite_save_kv_product_price_v50031/);assert.match(migration,/keysuite_can_view_costing_breakdown_v50031/);
console.log('PASS V5.00.31: KV V1.3 completeness/curves/dimensions, independent variants, BSW readiness, duplicate suppression, ES trim, permission and DB enforcement.');
