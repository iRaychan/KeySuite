const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.resolve(__dirname,'..');
const element=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},closest(){return element()},removeAttribute(){},setAttribute(){},value:'',textContent:'',innerHTML:'',disabled:false});
const customer={id:'customer-cr',pricingCategoryId:'cat-cr',distanceKm:0};
const context={console,setTimeout,clearTimeout,window:{addEventListener(){},KEYSUITE_ACCESS:{role:'owner'},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer}},document:{readyState:'loading',addEventListener(){},getElementById(){return element()},querySelectorAll(){return []}},CustomEvent:function(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'cr-price-data-v42854.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'pricing.js'),'utf8'),context);
const category={id:'cat-cr',productRules:{CR:{margin:.2,normal:0,rare:0,transport:0,currencies:['RMB','MYR']},MOTOR:{margin:.2,currencies:['RMB','MYR']}}};
const product=context.window.KeySuiteCRPriceData.models.find(row=>row.model==='CR 2-7');
const api=context.window.KeySuitePricing;
api.init({categories:[category],crProducts:[product],motorProducts:[],productMultipliers:{CR:{USD:5.8,RMB:.65,MYR:1},MOTOR:{USD:5.8,RMB:.65,MYR:1}}},{role:'owner'});
const base=api.findCrPrice('CR 2-7',{customer,category,motor_hp:1,motor_kw:.75,pole:2,motor_efficiency_class:'IE2'});
assert(base,'CR package price must resolve');
assert.strictEqual(base.family,'CR');
assert.strictEqual(base.product.model,'CR 2-7');
assert.strictEqual(api.crSealAddon('CR 2-7','Sic / Sic'),250);
assert.strictEqual(api.crSealAddon('CR 32-4','TC / TC'),600);
api.syncPriceListSettings({crSealAddons:[
  {material:'Sic / Sic',prices:{'CR 1 to CR 5':275}},
  {material:'TuC / Tic',prices:{'CR 32 to CR 90':650}}
]});
assert.strictEqual(api.crSealAddon('CR 2-7','Sic / Sic'),275,'saved CR seal prices must override workbook defaults');
assert.strictEqual(api.crSealAddon('CR 32-4','TC / TC'),650,'saved CR TC price must override workbook defaults');
const sealed=api.findCrPrice('CR 2-7',{customer,category,motor_hp:1,motor_kw:.75,pole:2,motor_efficiency_class:'IE2',seal:'Sic / Sic'});
assert.strictEqual(sealed.calc.finalPrice,base.calc.finalPrice+275,'editable CR mechanical-seal add-on must be included');
assert.strictEqual(api.repriceSource(api.sourceSnapshot(sealed),'quotation',{customer,category}).calc.finalPrice,sealed.calc.finalPrice,'saved CR source must reprice consistently');
console.log('V4.28.58 CR pricing regression: PASS');
