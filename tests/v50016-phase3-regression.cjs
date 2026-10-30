const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert/strict');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const element=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},closest(){return element()},removeAttribute(){},setAttribute(){},value:'',textContent:'',innerHTML:'',disabled:false});
const customer={id:'continuum',pricingCategoryId:'dealer-kill',distanceKm:39};
const category={id:'dealer-kill',productRules:{
  CR:{margin:.168,normal:.068,rare:.08,transport:50,currencies:['USD','RMB']},
  CHC_G1:{margin:.168,normal:.068,rare:.08,transport:50,currencies:['RMB']},
  CHC_G2:{margin:.168,normal:.068,rare:.08,transport:50,currencies:['RMB']},
  MOTOR:{margin:.138,normal:.038,rare:.068,transport:0,currencies:['RMB']}
}};
const context={console,setTimeout,clearTimeout,window:{addEventListener(){},KEYSUITE_ACCESS:{role:'owner'},KeySuiteComponents:{apply:calc=>calc},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer}},document:{readyState:'loading',addEventListener(){},getElementById(){return element()},querySelectorAll(){return []}},CustomEvent:function(){}};
vm.createContext(context);vm.runInContext(read('pricing.js'),context);
const api=context.window.KeySuitePricing;
const cr={id:'CR:CR 5-36',model:'CR 5-36',motor_hp:7.5,motor_kw:5.5,connection:'DN32',pricesByCurrency:{USD:{CR:0,CRS:0,CRN:0},RMB:{CR:3793,CRS:0,CRN:0},MYR:{CR:0,CRS:0,CRN:0}},rarityByCurrency:{RMB:{CR:'many',CRS:'common',CRN:'rare'}}};
const c4={id:'c4',model:'CHC 5-36',motor_hp:7.5,motor_kw:5.5,pole:2,pricesByCurrency:{RMB:{CHC:3793}},rarityByCurrency:{RMB:{CHC:'many'}}};
const c6={...c4,id:'c6'};
const multipliers={CR:{USD:5.8,RMB:.65,MYR:1},CHC_G1:{USD:5.8,RMB:.65,MYR:1},CHC_G2:{USD:5.8,RMB:.65,MYR:1},MOTOR:{USD:5.8,RMB:.834,MYR:1}};
const init=motorProducts=>api.init({categories:[category],crProducts:[cr],products:[c6],chcG1Products:[c4],motorProducts,productMultipliers:multipliers,customerPricingRows:[{customerId:'continuum',commission:.038,setDiscount:.068,finalDiscount:.088}]},{role:'owner'});

// 001: Normal View list editor uses Edit, integer 5→1 countdown, Done, and preserves 3-second rule editor.
const categories=read('categories.js'),index=read('index.html');
assert.match(index,/id="editCategoryList"[^>]*>Edit</);
assert.match(categories,/remaining=Math\.max\(1,5-Math\.floor\(elapsed\/1000\)\)/);
assert.match(categories,/setTimeout\(\(\)=>\{stop\(false\);setListEditing\(true\)\},5000\)/);
assert.match(categories,/listEditing\?'Done':'Edit'/);
assert.match(categories,/const idle='Hold 3s to Edit'/);
assert.match(categories,/keysuite_archive_pricing_category_v50015/);

// 004: all dynamically generated Compare View product tabs inherit weight 700.
const compare=read('v3944-categories.js');
assert.match(compare,/\.ks3942-product-tabs button\{font-weight:700\}/);
assert.deepEqual([...compare.matchAll(/const products=\[([^\]]+)\]/g)][0][1].match(/'[^']+'/g).map(x=>x.slice(1,-1)),['CHC_G1','CHC_G2','CR','BFI','BGF','ISO','ES','GWS','KEYPLC','MANIFOLD','MOTOR','COUPLING','BASEPLATE']);

// 005: CR material construction is centralized and produces one Material line.
assert.equal(api.crMaterialDescription('CR'),'SS304 (Cast Iron Connection) / Mechanical Seal');
assert.equal(api.crMaterialDescription('CRS'),'SS304 / Mechanical Seal');
assert.equal(api.crMaterialDescription('CRN'),'SS316 / Mechanical Seal');
for(const [model,expected] of [['CR 5-36','SS304 (Cast Iron Connection) / Mechanical Seal'],['CRS 5-36','SS304 / Mechanical Seal'],['CRN 5-36','SS316 / Mechanical Seal']]){
  const description=api.crDescription(model,cr,{motor_hp:7.5,pole:2,motor_efficiency_class:'IE3',connection:'DN32'});
  assert.equal((description.match(/^Material:/gm)||[]).length,1);
  assert.match(description,new RegExp(`Material: ${expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'m'));
}
assert.match(read('cr-product.js'),/KeySuitePricing\?\.crDescription/);
for(const selector of ['selector-cr/index.html','selector-cr/product.html']){
  const source=read(selector);
  assert.match(source,/motorEffClass:'IE3'/);
  assert.doesNotMatch(source,/motorEffClass:'IE2'/);
  assert.doesNotMatch(source,/motorEff\.value\|\|'IE2'/);
}

// 002, 003 and 006: standard package motors bypass Motor Pricelist lookup.
init([]);
const crStandard=api.findCrPrice('CR 5-36',{customer,category,motor_hp:7.5,motor_kw:5.5,pole:2,motor_efficiency_class:'IE3'});
assert.ok(crStandard,'CR standard IE3 must price without a Motor Pricelist row');
assert.equal(Number(crStandard.calc.baseMyr.toFixed(2)),2465.45);
assert.equal(crStandard.calc.sourceCurrency,'RMB');
assert.equal(crStandard.calc.motorReplacement,undefined);
assert.equal(api.quoteBlockReason(crStandard.calc),'');
const c4Standard=api.findPrice('CHC 5-36',{customer,category,generation_code:'G1',motor_hp:7.5,motor_kw:5.5,pole:2,motor_efficiency_class:'IE2'});
const c6Standard=api.findPrice('CHC 5-36',{customer,category,generation_code:'G2',motor_hp:7.5,motor_kw:5.5,pole:2,motor_efficiency_class:'IE3'});
assert.ok(c4Standard&&!c4Standard.calc.motorReplacement,'CHC C4 standard IE2 must use package price directly');
assert.ok(c6Standard&&!c6Standard.calc.motorReplacement,'CHC C6 standard IE3 must use package price directly');

// Non-standard substitutions still require exact included and replacement motors.
let changed=api.findCrPrice('CR 5-36',{customer,category,motor_hp:7.5,motor_kw:5.5,pole:2,motor_efficiency_class:'IE4'});
assert.match(api.quoteBlockReason(changed.calc),/Included motor price is missing for 7\.5 HP, 2-pole IE3/);
const motor=(efficiency,price)=>({id:`${efficiency}-7.5-2`,model:`${efficiency} 7.5HP 2P`,hp:7.5,kw:5.5,pole:2,efficiencyClass:efficiency,pricesByCurrency:{RMB:{MOTOR:price}},rarityByCurrency:{RMB:{MOTOR:'common'}}});
init([motor('IE3',750)]);
changed=api.findCrPrice('CR 5-36',{customer,category,motor_hp:7.5,motor_kw:5.5,pole:2,motor_efficiency_class:'IE4'});
assert.match(api.quoteBlockReason(changed.calc),/Replacement motor price is missing for 7\.5 HP, 2-pole IE4/);
init([motor('IE3',750),motor('IE4',900)]);
changed=api.findCrPrice('CR 5-36',{customer,category,motor_hp:7.5,motor_kw:5.5,pole:2,motor_efficiency_class:'IE4'});
assert.ok(changed.calc.motorReplacement);
assert.equal(api.quoteBlockReason(changed.calc),'');

// Version and frozen PDF contract.
assert.equal(read('VERSION.txt').trim(),'5.00.16');
assert.match(read('v50016-version-lock.js'),/const V='5\.00\.16'/);
assert.equal(JSON.parse(read('RELEASE.json')).frozen_quotation_pdf_version,'1.08');
assert.equal(JSON.parse(read('manifest.json')).name,'KeySuite V5.00.16');
console.log('PASS: KeySuite V5.00.16 Phase 3 regression contract (six improvements)');
