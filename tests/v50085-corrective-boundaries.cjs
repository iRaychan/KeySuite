'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const root=process.env.KEYSUITE_TEST_ROOT||path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'v50085-live-identity-config.json'),'utf8'));
const dom=new JSDOM(read('index.html'),{url:'https://isolated.invalid',runScripts:'outside-only'}),w=dom.window;
const run=s=>vm.runInContext(s,dom.getInternalVMContext());
run(read('commercial-identity.js'));run(read('chc-g1-product-data-v41411.js'));
run(read('v40001-multibrand.js').replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();",''));
w.KeySuiteAuthority={scopeEnforced:()=>false};const a=w.KeySuiteV40001,I=w.KeySuiteCommercialIdentity;
Object.assign(a.state,cfg);const cases=[['VEC','32-3'],['VEC','150-2-1'],['-','10-4'],['-','90-2'],['-','150-2-1'],['O.K. Pump','15-3'],['B.G.Reich','10-4']],traces=[];
for(const [name,tail]of cases){
 const brand=cfg.brands.find(b=>b.brand_name===name),record=w.KeySuiteCHCG1ProductData.byModel('CHC '+tail);assert(record,tail);
 Object.assign(a.state,{selectedBrandId:brand.id,selectedFamily:'CHC',selectedProductGroup:'CHC_G1'});
 const ctx=a.brandContext(brand.id,'CHC','SS304 (Cast Iron Connection)','CHC_G1');
 const raw={source:'KeyCHC-G1',family:'CHC',model:record.model,base_model:record.model,quotation_model:record.model,display_model:record.model,generation_code:'G1',keysuite_product_group_code:'CHC_G1',keysuite_material:'SS304 (Cast Iron Connection)',motor_hp:record.hp,motor_kw:record.kw,connection:record.connection};
 const captured=I.captureSelection(raw,{__KEYSUITE_MODEL_PRESENTATION_CONTEXT:{...ctx,masterModel:record.model,displayModel:I.resolve(ctx,record.model).model}});
 const expectedBrand=name==='-'?'':name,expectedModel=(name==='B.G.Reich'?'CHC ':'VMS ')+tail;
 assert.equal(captured.commercialIdentity.brand,expectedBrand);assert.equal(captured.commercialIdentity.model,expectedModel);
 assert.equal(captured.base_model,record.model);assert.equal(captured.motor_kw,record.kw);assert.equal(captured.connection,record.connection);
 const item={productFamily:'CHC',model:record.model,description:'B.G.Reich Vertical Multistage Pump Model: '+record.model,pumpData:captured,pricingSource:{product_family:'CHC_G1',v391_brand_id:cfg.brands.find(b=>b.brand_name==='B.G.Reich').id,v391_brand_name:'B.G.Reich',source_price:123,brand_margin:0.1},unitPrice:456,qty:2};
 const result=I.stamp(item);assert.equal(result.description,(expectedBrand?expectedBrand+' ':'')+'Vertical Multistage Pump Model: '+expectedModel);assert.equal(result.pricingSource,item.pricingSource);assert.equal(result.unitPrice,456);assert.equal(result.qty,2);
 // Legacy row without a snapshot must not obtain commercial identity from pricing.
 const legacy={...item,pumpData:{family:'CHC',model:record.model}};const recovered=I.stamp(legacy);
 if(process.env.RECORD_BASELINE!=='1'){assert.equal(recovered.commercialIdentity.brand,expectedBrand);assert.equal(recovered.commercialIdentity.model,expectedModel);}
 const staleName=I.captureSelection({...raw,keysuite_brand_id:brand.id,keysuite_brand_name:'B.G.Reich'});
 if(process.env.RECORD_BASELINE!=='1')assert.equal(staleName.commercialIdentity.brand,expectedBrand);
 traces.push({selectedCommercialBrand:name,selectedCommercialSeries:ctx.sellingSeries,selectedCommercialModel:expectedModel,sourceIdentifier:raw.source,sourceRecord:JSON.parse(JSON.stringify(record)),productFamilyMapping:cfg.mappings.filter(m=>m.brand_id===brand.id&&m.master_family==='CHC_G1'),quoteButtonPayload:raw,capturedPayload:JSON.parse(JSON.stringify(captured)),descriptionGenerationInputs:item,finalQuotationItem:result,legacySourceFallback:{actualBrand:recovered.commercialIdentity?.brand,actualModel:recovered.commercialIdentity?.model},legacySourceName:{actualBrand:staleName.commercialIdentity?.brand},expectedBrand,expectedModel});
}
// A genuine user edit remains a user edit; price entry alone does not set this flag.
const custom={manualItem:true,brand:'-',model:'Custom model',modelManuallyEdited:true,descriptionManuallyEdited:true,description:'Customer-approved custom wording',qty:3,unitPrice:12.34};
assert.equal(I.stamp(custom).description,custom.description);assert.equal(I.stamp(custom).model,custom.model);
const bg=cfg.brands.find(b=>b.brand_name==='B.G.Reich'),c6=a.brandContext(bg.id,'CHC','SS304 (Cast Iron Connection)','CHC_G2');
assert.equal(c6.brandSeries,'CHC C6');assert.equal(I.resolve(c6,'CHC 10-4').model,'CHC 10-4');
fs.writeFileSync(path.join(__dirname,process.env.RECORD_BASELINE==='1'?'v50085-corrective-boundaries-before.json':'v50085-corrective-boundaries-results.json'),JSON.stringify({status:'PASS',mode:process.env.RECORD_BASELINE==='1'?'baseline_observation':'corrected_assertions',cases:traces},null,2)+'\n');
console.log('PASS real read-only brand configuration + real C4 source records: 7 exact identities, conflicting pricing brand, stale source name, technical/pricing preservation and genuine manual edits');dom.window.close();
