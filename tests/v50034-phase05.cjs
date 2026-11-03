const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

// Verify the established gross-margin semantics, corrected order, and that a
// large fixed Trimming value stays in the running calculation.
const multi=fs.readFileSync('v40001-multibrand.js','utf8');
const start=multi.indexOf('function calculateWithBrandMargin');
const end=multi.indexOf('function applyBrandMargin',start);
assert(start>0&&end>start);
const brandContext={num:(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback},roundUp10:value=>Math.ceil((Number(value||0)-1e-9)/10)*10};
vm.createContext(brandContext);vm.runInContext(`${multi.slice(start,end)};this.calculateWithBrandMargin=calculateWithBrandMargin`,brandContext);
const source={base_myr:1000,motor_source_adjustment:-100,brand_margin:.1,margin:.2,normal:0,rare:0,rarity:'many',trimming:19950,transport:100,commission:.08,set_discount:0,final_discount:0,include_commission:true,include_set_discount:false,include_final_discount:false,include_fuel_charge:false};
const adjusted=brandContext.calculateWithBrandMargin(source,.1);
assert.equal(adjusted.adjustedBase,900);
assert.equal(adjusted.afterBrand,1000);
assert.equal(adjusted.marginPrice,1250);
assert.equal(adjusted.withTrimming,21200);
assert.equal(adjusted.withTransport,21300);
assert(Math.abs(adjusted.afterCommission-(21300/.92))<1e-9);
assert.equal(adjusted.final,23160);
assert(!multi.includes("text.replace(/(\\+\\s*Transport)/i"));

// Verify source-cost inspection does not need a customer or category.
let harness=fs.readFileSync('tests/v50010/pricing.cjs','utf8');harness=harness.slice(0,harness.indexOf('let found='));
harness+=`
c.window.KeySuiteComponents={apply:x=>x};
api.init({categories:[],esProducts:[{id:'es80-32',model:'ES 80-32',rarity:'common',variants:[{material:'CI / SS / SS / MS',priceUsd:300,priceRmb:null,priceMyr:1400}]}],productMultipliers:{ES:{USD:5.5,RMB:.65,MYR:1}},customerPricingRows:[]},{});
const cost=api.sourceCostOnly('ES','es80-32','CI / SS / SS / MS');
assert(cost);assert.equal(cost.availableCandidates.length,2);assert.equal(cost.sourceCurrency,'USD');assert.equal(cost.baseMyr,1650);assert.equal(cost.finalPrice,null);assert.equal(cost.pricingContextMissing,true);
`;
vm.runInNewContext(harness,{require,console,setTimeout,clearTimeout,assert},{filename:'v50034-source-only-fixture'});

const audit=fs.readFileSync('costing-audit-v50032.js','utf8');
assert(!audit.includes('Brand Margin (applied after Transport)'));
assert(audit.includes('Assembly running total'));
assert(audit.includes('Comparison route:'));
assert(audit.includes('Manual override retained'));
assert(audit.includes('Customer pricing not selected'));
assert.equal(fs.readFileSync('VERSION.txt','utf8').trim(),'5.00.34');
console.log('PASS V5.00.34 Phase 05: Brand Margin order/semantics, fixed Trimming, source-only audit, running traces, reconciliation and version');
