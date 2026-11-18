addEventListener('DOMContentLoaded',()=>{
 const b=document.createElement('button');b.textContent='Run Phase 01 browser checks';b.style='position:fixed;right:10px;bottom:110px;z-index:99999';document.body.append(b);
 const out=document.createElement('pre');out.style='position:fixed;right:10px;top:10px;max-width:900px;max-height:40vh;overflow:auto;background:white;z-index:99999';document.body.append(out);
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),assert=(v,m)=>{if(!v)throw Error(m)};
 const results=[];const record=m=>{results.push(m);out.textContent=results.join('\n')};
 async function until(f,m){for(let i=0;i<80;i++){if(f())return;await wait(50)}throw Error(m)}
 b.onclick=async()=>{b.disabled=true;try{
   record('Running Safari tests');
   assert(brandedQuotationDescription('- Horizontal Multistage Pump Model: HMS 10-3T','-')==='Horizontal Multistage Pump Model: HMS 10-3T','Dash removal');
   assert(brandedQuotationDescription('B.G.Reich Pump','O.K.Pump')==='O.K.Pump Pump','Named brand');record('PASS brand description');
   const oldClient=KeySuiteAuth.getClient,oldSession=KeySuiteAuth.ensureActiveSession;
   let saves=0,lists=0,failList=false,deny=false,saved;
   const client={rpc:async(name,p)=>{if(name==='keysuite_save_quotation_v50037'){saves++;if(deny)return {error:{code:'42501',message:'Permission denied'}};saved=p.p_quotation;return {data:{status:'saved',operation:'updated',saved}}}lists++;return failList?{error:{code:'NETWORK',message:'Network unavailable'}}:{data:[saved]}}};
   const alerts=[],oldAlert=window.alert;window.alert=m=>alerts.push(String(m));
   KeySuiteAuth.getClient=()=>client;KeySuiteAuth.ensureActiveSession=async()=>({access_token:'isolated'});
   try{quotationSyncMode='error';const q={id:'phase01-safe-test',no:'QA-2611-0001',date:'2026-11-18',items:[]};let r=await saveQuoteRemote(q);assert(r.id===q.id&&saves===1,'Recovery from failed history');record('PASS save after history failure');failList=true;r=await saveQuoteRemote(q);assert(r.id===q.id&&saves===2,'Atomic save acknowledgement');record('PASS committed save with failed history refresh');deny=true;let blocked=false;try{await saveQuoteRemote(q)}catch{blocked=true}assert(blocked,'Permission rejection');record('PASS permission failure remains blocked');
   KeySuiteApp.addExternalQuoteItem({model:'SAFE-QA',description:'Isolated retry test',qty:1,unitPrice:1,manualItem:true});setQuoteNoValue('QA-2611-0002');document.getElementById('qDate').value='2026-11-18';const session=quotationSessionId;await saveQuote({silent:true});const draft=JSON.parse(localStorage.getItem(quotationDraftKey())||'null');assert(draft?.quotation?.id===session,'Failed UI save retains stable draft identity: '+alerts.join(' / '));deny=false;failList=false;const ok=await saveQuote({silent:true});assert(ok&&saved.id===session,'UI retry uses same ID: '+alerts.join(' / '));record('PASS Save UI retry retains draft and logical ID');
   }finally{KeySuiteAuth.getClient=oldClient;KeySuiteAuth.ensureActiveSession=oldSession;window.alert=oldAlert}
   showPage('productBfi');
   let count=Number(sessionStorage.getItem('qa79BfiCount')||0);
   for(const row of (count===63?[]:KeySuiteBFI.rows())){
     assert(KeySuiteV394411ProductCurve.open('BFI',row.model,'BFI'),'BFI open '+row.model);
     const f=document.getElementById('productBfiSelectorFrame');
     await until(()=>f.contentWindow.__KEYSUITE_CURRENT_SELECTION?.()?.base_model===row.model,'BFI model '+row.model);
     assert(f.contentDocument.querySelector('svg'),'BFI chart '+row.model);count++;
   }sessionStorage.setItem('qa79BfiCount',String(count));record('PASS BFI '+count+' models');
   document.getElementById('closeProductCurve').click();
   const api=KeySuiteV391,data=KEYSUITE_SECURE_DATA,cat=data.categories[0],p=structuredClone(KeySuiteBFI.rows().find(p=>p.model==='BFI 10-3'));
   p.pricesByCurrency={RMB:{'3Ph':914,'1Ph':null}};p.rarityByCurrency={RMB:{'3Ph':'many'}};
   cat.productRules.BFI={margin:.138,normal:.08,rare:.1,transport:50,trimming:0,currencies:['RMB']};data.productMultipliers.BFI={RMB:.8668,USD:1,MYR:1};data.bfiProducts=[p];KeySuitePricing.syncPriceListSettings({bfiProducts:[p],categories:data.categories,productMultipliers:data.productMultipliers});KeySuiteBFI.init(data,KEYSUITE_ACCESS);
   api.state.mappings.push({brand_id:'oem',master_family:'BFI',master_series:'BFI',selling_series:'HMS',active:true});api.setSelectedBrand('oem','BFI','productBfi','BFI');showPage('productBfi');await wait(200);KeySuiteBFI.renderProduct();
   const action=document.querySelector('#productBfi .product-model-actions'),item=KeySuiteCostingAudit.productItem(action);
   assert(item.pricingSource.product_family==='BFI','HMS resolves BFI family');assert(item.pricingSource.source_price===914,'HMS source price retained');assert(item.auditCalc.brandMargin===0,'HMS explicit zero margin');record('PASS HMS audit source BFI / RMB 914 / 0%');
   api.setSelectedBrand('bg','CR','productCr','CR');showPage('productCr');await wait(200);KeySuiteCRProduct.render();
   const control=document.getElementById('crProductMaterial');
   for(const material of ['CR','CRS','CRN']){
     control.value=material;KeySuiteV394411ProductCurve.open('CR','CR 10-4','CR');
     const f=document.getElementById('productCrSelectorFrame');await until(()=>f.contentDocument.querySelector('.selection-model')?.textContent===material+' 10-4','CR identity '+material);await wait(200);assert(f.contentDocument.querySelector('.selection-model').textContent===material+' 10-4','CR identity reverted '+material);
   }record('PASS CR material variants');
   document.getElementById('closeProductCurve').click();showPage('productEs');
   assert([...document.getElementById('esProductMaterial').options].some(o=>o.value==='Duplex 2205'),'ES 2205');assert([...document.getElementById('esProductMaterial').options].some(o=>o.value==='Duplex 2507'),'ES 2507');record('PASS ES duplex options');
   api.setSelectedBrand('bg','BSW','productBsw','BSW');showPage('productBsw');await wait(300);KeySuiteBSW.render();document.querySelector('[data-bsw-curve]').click();
   const f=document.getElementById('productBswSelectorFrame');await until(()=>f.contentWindow.__KEYSUITE_CURRENT_SELECTION?.()?.family==='BSW'&&getComputedStyle(f).display!=='none'&&getComputedStyle(f).opacity==='1','BSW loading');record('PASS BSW loading');
   const phase=f.contentDocument.getElementById('motorPhase');phase.value='1Ph';phase.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>/M(?:A)?$/.test(f.contentDocument.querySelector('.selection-model')?.textContent||'')&&document.getElementById('bswCurvePhase').value==='1Ph','BSW phase model');await wait(200);assert(getComputedStyle(f).display!=='none','BSW frame hidden');assert(f.contentWindow.__KEYSUITE_CURRENT_SELECTION().motor_voltage===240,'BSW voltage');assert(f.contentDocument.querySelector('header h1').textContent.includes('BSW'),'BSW header: '+f.contentDocument.querySelector('header h1').textContent);assert(getComputedStyle(f).visibility==='visible'&&f.getBoundingClientRect().width>100,'BSW not visible: '+getComputedStyle(f).visibility+' '+f.getBoundingClientRect().width);record('PASS BSW phase identity and visibility');
   const panel=document.getElementById('bswCurveConfiguration');assert(panel.getBoundingClientRect().height>30,'BSW top panel visible');
   const float=document.getElementById('bswCurveFloat');float.value='Yes';float.dispatchEvent(new Event('change',{bubbles:true}));await until(()=>/MA$/.test(f.contentDocument.querySelector('.selection-model')?.textContent||''),'BSW Auto variant');assert(f.contentWindow.__KEYSUITE_CURRENT_SELECTION().float_switch===true,'BSW Auto snapshot');record('PASS BSW top panel Auto identity');
   document.getElementById('closeProductCurve').click();showPage('bswPriceList');await wait(200);KeySuiteBSWPricing.render();
   const body=document.getElementById('bswPriceRows');assert(body.closest('table').querySelectorAll('thead th').length===6,'BSW price headings');
   for(const cell of body.querySelectorAll('td')){const price=cell.querySelector('.currency-price-input'),rarity=cell.querySelector('[data-rarity]');if(price&&rarity){const p=price.getBoundingClientRect(),r=rarity.getBoundingClientRect();assert(p.right<=r.left+1,'BSW input overlap')}}record('PASS BSW pricelist geometry');
   showPage('productIso');await wait(200);assert(['Duplex 2205','Duplex 2507'].every(m=>[...document.getElementById('isoMaterial').options].some(o=>o.value===m)),'ISO duplex product options');KeySuiteISO.renderPrices();const iso=document.querySelector('[data-iso-material]');assert(iso&&['Duplex 2205','Duplex 2507'].every(m=>[...iso.options].some(o=>o.value===m)),'ISO duplex pricelist options');record('PASS ISO independent duplex configurations');
   record('BROWSER CHECKS COMPLETE');document.title='Phase 01 browser checks passed';
   for(const [label,fn] of [['Review BSW curve',()=>{showPage('productBsw');KeySuiteBSW.render();document.querySelector('[data-bsw-curve]').click()}],['Review BSW prices',()=>{document.getElementById('productCurveDialog').close();showPage('bswPriceList');KeySuiteBSWPricing.render()}]]){const button=document.createElement('button');button.textContent=label;button.style='position:fixed;right:10px;bottom:'+(label.includes('prices')?170:140)+'px;z-index:99999';button.onclick=fn;document.body.append(button)}
 }catch(e){record('FAIL '+e.message+' '+e.stack);document.title='Phase 01 browser checks failed'}finally{b.disabled=false}};
});

