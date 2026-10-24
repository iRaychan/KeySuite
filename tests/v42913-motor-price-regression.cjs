/* Run with: node tests/v42913-motor-price-regression.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const customer={id:'customer-1',pricingCategoryId:'cat-1',distanceKm:0};
const element=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},closest(){return element()},removeAttribute(){},setAttribute(){},value:'',textContent:'',innerHTML:'',disabled:false});
const context={console,setTimeout,clearTimeout,window:{addEventListener(){},KEYSUITE_ACCESS:{role:'owner'},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer}},document:{readyState:'loading',addEventListener(){},getElementById(){return element()},querySelectorAll(){return []}},CustomEvent:function(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','pricing.js'),'utf8'),context);

const category={id:'cat-1',productRules:{CHC_G1:{margin:.2,transport:0,currencies:['MYR']},MOTOR:{margin:.2,transport:0,currencies:['MYR']}}};
const pump={id:'chc-8-4',model:'CHC 8-4',motor_hp:2,motor_kw:1.5,pole:2,pricesByCurrency:{MYR:{CHC:1000}},rarityByCurrency:{MYR:{CHC:'many'}}};
const motor=(efficiencyClass,price)=>({id:`motor-${efficiencyClass}`,model:`${efficiencyClass==='IE2'?'2BM':'4BM'}2-2`,hp:2,kw:1.5,pole:2,efficiencyClass,pricesByCurrency:{MYR:{MOTOR:price}},rarityByCurrency:{MYR:{MOTOR:'many'}}});
const api=context.window.KeySuitePricing;

api.init({categories:[category],products:[],chcG1Products:[pump],motorProducts:[motor('IE2',200),motor('IE4',200)],productMultipliers:{CHC_G1:{MYR:1},MOTOR:{MYR:1}}},{role:'owner'});
const invalid=api.findPrice('CHC 8-4',{customer,category,generation_code:'G1',motor_hp:2,motor_kw:1.5,pole:2,motor_efficiency_class:'IE4'});
assert(invalid?.calc?.motorPricingError,'same-source-price IE4 upgrade must carry an actionable pricing error');
assert.match(api.quoteBlockReason(invalid.calc),/Update the Motor Price List/);

api.init({categories:[category],products:[],chcG1Products:[pump],motorProducts:[motor('IE2',200),motor('IE4',260)],productMultipliers:{CHC_G1:{MYR:1},MOTOR:{MYR:1}}},{role:'owner'});
const ie2=api.findPrice('CHC 8-4',{customer,category,generation_code:'G1',motor_hp:2,motor_kw:1.5,pole:2,motor_efficiency_class:'IE2'});
const ie4=api.findPrice('CHC 8-4',{customer,category,generation_code:'G1',motor_hp:2,motor_kw:1.5,pole:2,motor_efficiency_class:'IE4'});
assert(ie2&&ie4,'both CHC 8-4 motor selections must resolve');
assert(ie4.calc.finalPrice>ie2.calc.finalPrice,'a higher-priced IE4 motor must increase the quotation price');
assert.strictEqual(ie4.calc.motorReplacement.includedMotorModel,'2BM2-2');
assert.strictEqual(ie4.calc.motorReplacement.replacementMotorModel,'4BM2-2');
assert.strictEqual(ie4.calc.motorReplacement.priceAdjustmentFinal,ie4.calc.finalPrice-ie4.calc.preMotorReplacementPrice);

console.log('V4.29.13 CHC motor price-change regression: PASS');
