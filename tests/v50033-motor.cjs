const fs=require('fs'),vm=require('vm'),assert=require('assert');
let harness=fs.readFileSync('tests/v50010/pricing.cjs','utf8');harness=harness.slice(0,harness.indexOf("let found="));
harness+=`
const rule33={margin:.2,normal:0,rare:0,transport:0,currencies:['RMB'],useCommission:false,useSetDiscount:false,useFinalDiscount:false,useFuelCharge:false};
c.window.KeySuiteComponents={apply:x=>x};
category.productRules={CHC_G1:rule33,MOTOR:rule33};
api.init({categories:[category],chcG1Products:[{id:'pump33',model:'CHC 8-6',hp:3,kw:2.2,pricesByCurrency:{RMB:{CHC:2000}}}],motorProducts:[{id:'motor33',model:'Test Motor',hp:3,pole:2,efficiencyClass:'IE2',pricesByCurrency:{RMB:{MOTOR:400}},price_rmb:400}],productMultipliers:{CHC_G1:{RMB:1},MOTOR:{RMB:1}},customerPricingRows:[]},{});
const complete=api.findPrice('CHC 8-6',{generation_code:'G1'}),bare=api.findPrice('CHC 8-6',{generation_code:'G1',bareShaft:true});
console.log(JSON.stringify({complete:complete?.calc.finalPrice,bare:bare?.calc.finalPrice,error:bare?.calc.motorPricingError}));
assert(complete&&bare);assert(!bare.calc.motorPricingError);assert(bare.calc.finalPrice<complete.calc.finalPrice);
const snap=api.sourceSnapshot(bare);assert.equal(api.repriceSource(snap).calc.finalPrice,bare.calc.finalPrice);
console.log('PASS bare-shaft source deduction, motor-inclusive complete pump, and snapshot repricing');
`;
vm.runInNewContext(harness,{require,console,setTimeout,clearTimeout},{filename:'v50033-fixture'});

