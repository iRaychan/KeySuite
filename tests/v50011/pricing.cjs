const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const root=path.resolve(__dirname,'../..');
const element=()=>({setAttribute(){},removeAttribute(){},style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},closest(){return element()},value:'',textContent:'',innerHTML:''});
const customer={id:'test',pricingCategoryId:'test'};const ctx={console,setTimeout,clearTimeout,structuredClone,window:{addEventListener(){},KEYSUITE_ACCESS:{role:'owner'},KeySuiteApp:{getCustomers:()=>[customer],getPricingCustomer:()=>customer,getSelectedCustomer:()=>customer,isQuotationSealed:()=>false}},document:{readyState:'loading',addEventListener(){},getElementById:element,querySelectorAll:()=>[]},CustomEvent:function(){}};vm.createContext(ctx);for(const file of ['component-prices-v50011.js','pricing.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const c=ctx.window.KeySuiteComponents,p=ctx.window.KeySuitePricing;
assert.equal(c.group('CHCS 5-36'),'1_5');assert.equal(c.group('CR 320-8'),'320');assert.equal(c.group('CHC 6-10'),null);assert.equal(c.couplingToSeal[42],45);assert.equal(c.couplingToSeal[48],55);
c.loadForTest(c.defaults);assert.match(c.additions('CHC','CHC 5-36').error,/not entered/);
c.loadForTest(c.defaults.map(r=>({...r,price_myr:r.kind==='oring'?35:80})));
assert.equal(c.additions('ES','32-13',{shaft_mm:24}).total,115);assert.match(c.additions('ES','x',{shaft_mm:37}).error,/unavailable/);
const once=c.apply({finalPrice:100},'CHC','CHC 5-36');assert.equal(once.finalPrice,135);assert.equal(c.apply(once,'CHC','CHC 5-36').finalPrice,135);
const cat={id:'test',productRules:{CR:{margin:.2,transport:0,currencies:['RMB']},CHC_G1:{margin:.2,transport:0,currencies:['MYR']},CHC_G2:{margin:.2,transport:0,currencies:['MYR']}}};const product={id:'CR:CR 5-36',model:'CR 5-36',pricesByCurrency:{RMB:{CR:3793}},rarityByCurrency:{RMB:{CR:'many'}}};
p.init({categories:[cat],crProducts:[product],crSealAddons:[{material:'TuC / Tic',prices:{'CR 1 to CR 5':200}},{material:'Car / Sic',prices:{'CR 1 to CR 5':0}}],chcSealAddons:[{generation:'G1',minSeries:1,maxSeries:5,sicSicMyr:110,tcTcMyr:120},{generation:'G2',minSeries:1,maxSeries:5,sicSicMyr:210,tcTcMyr:220}],productMultipliers:{CR:{RMB:.65}}},{role:'owner'});
assert.equal(p.crSealAddon('CR 5-36','TuC / Tic'),200);assert.equal(p.chcSealAddon('CHC 5-36','SiC/SiC','G1'),110);assert.equal(p.chcSealAddon('CHC 5-36','SiC/SiC','G2'),210);
assert(p.findCrPrice('CR 5-36',{customer,category:cat}));assert.equal(p.findCrPrice('CRN 5-36',{customer,category:cat}),null);
assert.equal(p.pricingSourceBlockReason({manual_override:true,product_family:'CR'}),'');assert.equal(p.pricingSourceMarginBlockReason({manual_override:true,product_family:'CR'}),'');
let writes=0;ctx.document.querySelectorAll=()=>[{dataset:{pricingSource:JSON.stringify({manual_override:true,product_family:'CR'})},querySelector:()=>({set value(v){writes++}})}];p.refreshQuotePrices();assert.equal(writes,0);
const iso=require(path.join(root,'selector-iso/iso-data.js'));assert.equal(iso.pumps.length,37);assert.equal(new Set(iso.pumps.map(p=>p.model)).size,32);const curve=iso.pumps.find(p=>p.model==='150-125-400'&&p.rpm===1450);assert.equal(curve.multiplier,2);for(let i=0;i<curve.flow_lps.length;i++)for(let j=i+1;j<curve.flow_lps.length;j++)if(curve.flow_lps[i]===curve.flow_lps[j])assert.equal(curve.head_m[i],curve.head_m[j]);
console.log('PASS: component blanks, groups, mappings, no duplicate add-ons, generation prices, CR variants, manual-price preservation, ISO import');

for(const file of ['iso-products-v50011.js','v40205-motor-baseplate-data.js','v40205-motor-baseplate.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const isoSet=ctx.window.KEYSUITE_ES_PUMPSET_DIMENSION({family:'ISO',model:'100-80-160',motorHp:25,pole:2,efficiencyClass:'IE3'});assert(isoSet.available,JSON.stringify(isoSet));assert.equal(isoSet.pump.A,100);assert.equal(isoSet.pump.kg,68);assert(Number.isFinite(isoSet.dimensions.overall.estimatedPumpsetWeightKg));console.log('PASS: ISO independent dimensions with shared motor/baseplate sizing');

assert.match(c.additions('ES','x',{shaft_mm:24,elastomer:'NBR'}).error,/NBR/);
