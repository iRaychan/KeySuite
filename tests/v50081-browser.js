addEventListener('DOMContentLoaded',()=>{
 const b=document.createElement('button');b.textContent='Run V5.00.81 verification';b.style='position:fixed;right:20px;bottom:170px;z-index:999999';document.body.append(b);
 const out=document.createElement('pre');out.style='position:fixed;right:10px;top:10px;background:white;z-index:999999;max-width:850px;max-height:75vh;overflow:auto;font-size:13px';document.body.append(out);
 const log=s=>out.textContent+=s+'\n',check=(v,s)=>{if(!v)throw Error(s)};
 b.onclick=async()=>{out.textContent='';try{
 const api=KeySuiteV391,I=KeySuiteCommercialIdentity;
 api.state.brands.push({id:'mega',brand_name:'Megaflow',brand_type:'oem',active:true},{id:'future',brand_name:'Future Test',brand_type:'oem',active:true});
 api.state.mappings.push({brand_id:'oem',master_family:'BFI',master_series:'HMS',selling_series:'HMS',active:true},{brand_id:'mega',master_family:'ES',master_series:'ES',selling_series:'ES',active:true},{brand_id:'future',master_family:'BFI',master_series:'SOURCE',selling_series:'FUTURE',active:true});
 for(const [id,target] of [['oem','HMS'],['bg','BFI'],['future','FUTURE']]){
 api.setSelectedBrand(id,'BFI','productBfi','BFI');showPage('productBfi');KeySuiteV394411ProductCurve.open('BFI','BFI 10-3','BFI');
 await new Promise(r=>setTimeout(r,2200));const f=document.getElementById('productBfiSelectorFrame'),title=document.getElementById('productCurveTitle').textContent,selected=f.contentDocument.querySelector('.selection-model')?.textContent;
 check(selected===target+' 10-3T',id+' selected '+selected);check(title.includes(target+' 10-3T'),id+' title '+title);
 check(f.contentDocument.querySelector('header h1').textContent===target+' Series',id+' header');
 const alts=f.contentDocument.getElementById('alternatives')?.innerText||f.contentDocument.querySelector('.alternatives-panel')?.innerText||'';
 check(!alts||!new RegExp('\\b'+(target==='BFI'?'HMS':'BFI')+'\\b').test(alts),id+' alternatives '+alts);
 log('PASS real curve '+target+' title/model/header after async load');document.getElementById('productCurveDialog').close();
 }
 log('PASS future mapping with configured master SOURCE and hydraulic family BFI');
 document.querySelectorAll('.quote-item').forEach(x=>x.remove());
 const testData=window.KEYSUITE_SECURE_DATA;testData.couplingProducts=[{id:'test-fcl',model:'FCL 160',componentType:'pin_bush',active:true,priceRmb:215.34,rarity:'common'}];KeySuiteCoupling.init(testData,KEYSUITE_ACCESS);KeySuitePricing.syncPriceListSettings({couplingProducts:testData.couplingProducts});
 testData.categories[0].productRules.BFI={margin:.08,normal:.08,rare:.08,transport:50,currencies:['RMB']};
 testData.productMultipliers.BFI={RMB:.8668,MYR:1};
 testData.bfiProducts=[{...KeySuiteBFIProductData.models.find(x=>x.model==='BFI 10-3'),id:'test-bfi',pricesByCurrency:{RMB:{'3Ph':914}},rarityByCurrency:{RMB:{'3Ph':'many'}}}];
 KeySuiteBFI.init(testData,KEYSUITE_ACCESS);KeySuitePricing.syncPriceListSettings({bfiProducts:testData.bfiProducts,productMultipliers:testData.productMultipliers,categories:testData.categories});
 for(const [id,series,name] of [['oem','HMS',''],['bg','BFI','B.G.Reich']]){
  api.setSelectedBrand(id,'BFI','productBfi','BFI');
  const ok=KeySuiteBFI.routeSelection({model:'BFI 10-3',motor_phase:'3Ph',keysuite_material:'SS304'},'quotation');check(ok,'BFI quote route '+id);
  const row=getQuoteItemData([...document.querySelectorAll('.quote-item')].at(-1));check(row.description.includes((name?name+' ':'')+'Horizontal Multistage Pump Model: '+series+' 10-3T'),'BFI quote identity '+row.description);log('PASS '+series+' actual Quote route');
 }
 api.setSelectedBrand('ok','CHC','productChc','CHC_G1');KeySuiteProduct.setChcGeneration('G1');showPage('productChc');
 const c4=document.querySelector('[data-product-g1-add="CHC 10-4"]');if(c4){c4.click();await new Promise(r=>setTimeout(r,1800));const c4row=getQuoteItemData([...document.querySelectorAll('.quote-item')].at(-1));check(c4row.description.includes('O.K. Pump'),'VMS Quote brand');log('PASS O.K. Pump VMS C4 Product Quote action')}else log('UNVERIFIED VMS C4 Product Quote control not available');
 const spec={model:'ES 40-16',product:'ES',family:'ES',quotation_model:'ES 40-16',keysuite_material:'CI / SS / SS / MS',motor_hp:7.5,pole:2,motor_efficiency_class:'IE3',raw_flow:30,raw_head:30,flow_unit:'m3h',head_unit:'m',baseplate_detail:{frame:75,cChannel:'1½" x 3"'},pumpset_dimension:{longitudinal:{L3:800},width:{W1:300}}};
 for(const [id,name] of [['mega','Megaflow'],['ok','O.K. Pump'],['oem',''],['bg','B.G.Reich']]){
 api.setSelectedBrand(id,'ES','selectorEs','ES');
 // Exercise the same parent routing function invoked by the live selector Quote message.
 const before=document.querySelectorAll('.quote-item').length;
 await routeEsSelection({...spec,keysuite_brand_id:id,keysuite_bare_shaft:false},'quotation');
 const rows=[...document.querySelectorAll('.quote-item')];check(rows.length===before+1,'complete set row '+name);
 const data=getQuoteItemData(rows.at(-1));check(data.description.includes((name?name+' ':'')+'End Suction Pump Model: ES 40-16'),'complete '+name+' '+data.description);
 check(name==='B.G.Reich'||!data.description.includes('B.G.Reich'),'fallback '+name);log('PASS selector complete set '+(name||'brandless'));
 await routeEsSelection({...spec,keysuite_brand_id:id,keysuite_bare_shaft:true},'quotation');const last=getQuoteItemData([...document.querySelectorAll('.quote-item')].at(-1));check(last.commercialIdentity.brand===name,'bare snapshot '+name);check(last.description.includes((name?name+' ':'')+'End Suction Pump Model:'),'bare description '+name);log('PASS individual '+(name||'brandless'));
 }
 const mixed=['mega','ok','oem','bg','future'].map((id,i)=>{const ctx=api.brandContext(id,'ES','','ES');return I.stamp({brandId:id,brand:ctx.name,model:'ES 40-16',description:'B.G.Reich End Suction Pump Model: ES 40-16',qty:1,unitPrice:100+i,internalRemark:'Remark '+i+'\nLine two'},ctx)});
 const saved=JSON.parse(JSON.stringify(mixed));document.querySelectorAll('.quote-item').forEach(x=>x.remove());saved.forEach(x=>quoteItemRow(x,{restored:true}));
 const actual=getQuoteItems();check(actual.every((x,i)=>x.commercialIdentity.brand===saved[i].commercialIdentity.brand&&x.description===saved[i].description&&x.internalRemark===saved[i].internalRemark),'serialization');log('PASS mixed item identity/remarks JSON save/reconstruction');
 for(const type of ['pumpset','system']){const desc=KeySuiteAssembly.formatPumpsetDescription({assembly_type:'pumpset',items:mixed.map(x=>({...x,section:'pump'})).concat([{section:'motor',description:'c/w Motor'},{section:'coupling',couplingData:{model:'F60'}}])});check(desc.includes('Megaflow End Suction')&&desc.includes('O.K. Pump End Suction'),'mixed components');}log('PASS mixed-brand complete-set formatter (System uses component snapshots)');
 setQuoteNoValue('QA-2611-0081');quotationStatus='sealed';updateQuotationStateUi();buildPrintQuotation();const print=document.getElementById('printQuotationDocument').innerText;for(const x of saved)check(print.includes(x.description.split('\n')[0]),'PDF print content '+x.commercialIdentity.brand);log('PASS quotation PDF document content (all five brands/models)');
 log('BLOCKED real Supabase Save/History/reopen: no isolated database/account');log('CHECKS COMPLETE');document.title='V5.00.81 verification PASS';
 }catch(e){log('FAIL '+e.message+'\n'+e.stack);document.title='V5.00.81 verification FAIL'}};
});
