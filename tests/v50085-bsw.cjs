'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'http://isolated.invalid',runScripts:'outside-only'}),w=dom.window;
w.structuredClone=structuredClone;const load=n=>vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),dom.getInternalVMContext()),plain=x=>JSON.parse(JSON.stringify(x));
const calls=[],alerts=[],routes=[];w.alert=s=>alerts.push(s);
w.KeySuiteApp={getPricingCustomer:()=>({id:'customer',pricingCategoryId:'cat'}),addExternalQuoteItem:item=>{routes.push('quotation');calls.push(w.KeySuiteCommercialIdentity.stamp(item));return {}}};w.KeySuiteAssembly={addItem:item=>calls.push(w.KeySuiteCommercialIdentity.stamp(item))};w.KeySuiteManualPrice={offer:item=>{routes.push('manual');calls.push(w.KeySuiteCommercialIdentity.stamp(item))}};
w.KeySuiteV40001={state:{selectedBrandId:'mega',selectedFamily:'BSW',selectedProductGroup:'BSW',brands:[{id:'mega',brand_name:'Megaflow'}]},brandContext:()=>({id:'mega',name:'Megaflow',family:'BSW',masterSeries:'BSW',sellingSeries:'BSW'})};
w.KEYSUITE_SECURE_DATA={categories:[{id:'cat'}],bswProducts:[]};
w.KeySuitePricing={calculatePrice:()=>({finalPrice:123,sourcePrice:100}),quoteBlockReason:()=>'',sourceSnapshot:()=>({product_family:'BSW',source_price:100})};
for(const n of ['commercial-identity.js','bsw-data-v50027.js','bsw-variants-v50036.js','bsw-v50027.js','bsw-pricing-v50036.js'])load(n);
const d=w.KeySuiteBSWData,variants=w.KEYSUITE_BSW_VARIANTS;assert.equal(d.catalogue.length,178);assert.equal(new Set(d.catalogue.map(m=>m.model)).size,178);assert.equal(d.models.length,8);assert.equal(Object.keys(d.curves).length,8);assert.equal(d.database_version,'261122-V1.3');
let checked=0;
for(const m of d.catalogue)for(const variant of ['M','MA','T','TA']){
 const phase=variant.startsWith('M')?'1Ph':'3Ph',auto=variant.endsWith('A'),available=variants[m.model][variant];
 const payload=w.KeySuiteBSW.payload(m.model,{phase,floatSwitch:auto}),before=calls.length,oldAlerts=alerts.length;
 assert.equal(payload.model,m.model+variant);assert.equal(payload.motor_phase,phase);assert.equal(payload.motor_voltage,phase==='1Ph'?240:415);assert.equal(payload.float_switch,auto);assert.deepEqual(plain(payload.dimensions),plain(m.dimensions));
 w.KeySuiteBSW.routeSelection(payload,'quotation');
 if(available){assert.equal(calls.length,before+1);const item=calls.at(-1);assert.equal(item.commercialIdentity.brand,'Megaflow');assert.equal(item.commercialIdentity.model,m.model+variant);assert(item.description.includes('Megaflow Submersible Pump Model: '+m.model+variant));assert.equal(item.unitPrice,123);assert.equal(item.pricingSource.source_price,100);checked++;}
 else{assert.equal(calls.length,before);assert.equal(alerts.length,oldAlerts+1)}
}
const model=d.models[0].model,p=w.KeySuiteBSW.payload(model,{phase:'1Ph',floatSwitch:true});p.flow_m3h=8;p.head_m=10;p.frequency_hz=55;
w.KeySuiteBSW.routeSelection(p,'assembly');assert.equal(calls.at(-1).pumpData.frequency_hz,55);assert.equal(calls.at(-1).pumpData.head_m,10);assert.equal(calls.at(-1).commercialIdentity.model,model+'MA');
// Zero/unset workbook prices remain unpriced, and cannot silently add a free quotation line.
w.KeySuitePricing.quoteBlockReason=()=> 'Missing source price';const before=calls.length;w.KeySuiteBSW.routeSelection(p,'quotation');assert.equal(calls.length,before+1);assert.equal(calls.at(-1).unitPrice,0);assert.equal(routes.at(-1),'manual'); // Goes to the isolated manual-price offer, not addExternalQuoteItem.
console.log('PASS BSW V1.3: 178 unique catalogue models, 8 complete curves, '+checked+' valid phase/float quotation variants, all unavailable variants rejected, dimensions, selected speed/duty, Assembly, source-price blocking');
fs.writeFileSync(path.join(__dirname,'v50085-bsw-results.json'),JSON.stringify({status:'PASS',models:178,curves:8,validVariants:checked,variantConfigurationsChecked:178*4,workbookPricesZeroOrUnavailable:true},null,2)+'\n');
dom.window.close();
