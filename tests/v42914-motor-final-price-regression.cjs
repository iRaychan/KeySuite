/* Run with: node tests/v42914-motor-final-price-regression.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const customer={id:'smartech',pricingCategoryId:'sarawak-distributor',distanceKm:48};
const element=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},closest(){return element()},removeAttribute(){},setAttribute(){},value:'',textContent:'',innerHTML:'',disabled:false});
const context={console,setTimeout,clearTimeout,window:{addEventListener(){},KEYSUITE_VERSION:'4.29.14',KEYSUITE_ACCESS:{role:'owner'},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer}},document:{readyState:'loading',addEventListener(){},getElementById(){return element()},querySelectorAll(){return []}},CustomEvent:function(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','pricing.js'),'utf8'),context);

const category={id:'sarawak-distributor',productRules:{CHC_G1:{margin:0,transport:0,currencies:['MYR']},MOTOR:{margin:.208,normal:.038,rare:0,transport:50,currencies:['RMB'],useCommission:true,useSetDiscount:true,useFinalDiscount:true,useFuelCharge:true}}};
const pump={id:'chc-8-4',model:'CHC 8-4',motor_hp:2,motor_kw:1.5,pole:2,pricesByCurrency:{MYR:{CHC:1750}},rarityByCurrency:{MYR:{CHC:'fixed'}}};
const motor=(efficiencyClass,price)=>({id:`motor-${efficiencyClass}`,model:`${efficiencyClass==='IE2'?'2BM':'4BM'}2-2`,hp:2,kw:1.5,pole:2,efficiencyClass,pricesByCurrency:{RMB:{MOTOR:price}},rarityByCurrency:{RMB:{MOTOR:'common'}}});
const data={categories:[category],products:[],chcG1Products:[pump],motorProducts:[motor('IE2',298),motor('IE4',547)],productMultipliers:{CHC_G1:{MYR:1},MOTOR:{RMB:.834}},fuel_price:5.17,fuel_base_price:2.10,fuel_efficiency:6.3,return_journey:true,customerPricingRows:[{customerId:'smartech',commission:0,setDiscount:.068,finalDiscount:.15}]};
const api=context.window.KeySuitePricing;
api.init(data,{role:'owner'});

const ie4=api.findPrice('CHC 8-4',{customer,category,generation_code:'G1',motor_hp:2,motor_kw:1.5,pole:2,motor_efficiency_class:'IE4'});
assert(ie4,'Smartech IE4 CHC quotation must resolve');
assert.strictEqual(ie4.calc.motorReplacement.includedMotorQuotedPrice,530,'included IE2 final must be RM530');
assert.strictEqual(ie4.calc.motorReplacement.replacementMotorQuotedPrice,870,'replacement IE4 final must be RM870');
assert.strictEqual(ie4.calc.motorReplacement.priceAdjustmentFinal,340,'motor adjustment must be RM340');
assert.strictEqual(ie4.calc.finalPrice,2090,'pump quote must be RM1,750 - RM530 + RM870 = RM2,090');

vm.runInContext(fs.readFileSync(path.join(__dirname,'..','v40001-multibrand.js'),'utf8'),context);
const source=api.sourceSnapshot(ie4);
const branded=context.window.KeySuiteV391.calculateWithBrandMargin(source,0);
assert.strictEqual(branded.final,2090,'brand pass must retain the motor-adjusted RM2,090 unit price');

console.log('V4.29.14 final-to-final motor replacement regression: PASS');
