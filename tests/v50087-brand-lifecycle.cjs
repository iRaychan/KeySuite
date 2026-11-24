'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require('jsdom');
const root=process.env.KEYSUITE_TEST_ROOT||path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const dom=new JSDOM(read('index.html'),{url:'http://127.0.0.1:8840/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,doc=w.document;
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),load=n=>run(read(n)),plain=x=>JSON.parse(JSON.stringify(x)),checks=[];
const pass=s=>{checks.push(s);console.log('PASS '+s)};
w.structuredClone=structuredClone;w.CSS={escape:v=>String(v)};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.alert=m=>{throw Error('Unexpected alert '+m)};w.confirm=()=>true;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){} disconnect(){}};w.IntersectionObserver=w.ResizeObserver;
w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:s=>({width:String(s).length*6})});w.fetch=()=>{throw Error('External request blocked')};w.KEYLARGO_LOGO_DATA='data:image/png;base64,';
w.KEYSUITE_ACCESS={email:'test@example.invalid',role:'owner',company_id:'isolated',quotation_prefix:'QA'};w.KEYSUITE_PROFILE={...w.KEYSUITE_ACCESS,display_name:'Isolated tester'};w.KEYSUITE_SECURE_DATA={categories:[],users:[]};
async function main(){
 for(const n of ['permissions.js','payment-terms.js','commercial-identity.js','quotation-history-v50087.js','app.js','assembly.js','quotation-templates.js'])load(n);
 await new Promise(r=>setTimeout(r,20));
 run(read('v40001-multibrand.js').replace('function wrapApp(){','window.__wrap85=wrapApp;function wrapApp(){').replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();",''));
 const a=w.KeySuiteV40001,I=w.KeySuiteCommercialIdentity;
 const brands=[['bg','B.G.Reich'],['vec','VEC'],['ok','O.K.Pump'],['blank','-'],['mega','Megaflow'],['tesk','TESK'],['future','Future Brand']].map(([id,brand_name])=>({id,brand_name,brand_key:id==='bg'?'b.g.reich':id,brand_type:id==='bg'?'master':'oem',active:true,quotation_template_id:'tesk-template'}));
 a.state.brands=brands;a.state.mappings=[];a.state.series=[];
 for(const b of brands)for(const group of ['CHC_G1','CHC_G2'])a.state.mappings.push({brand_id:b.id,master_family:group,master_series:'CHC',selling_series:b.id==='bg'?'CHC':'VMS',active:true});
 for(const b of brands)for(const family of ['ES','BSW','CR','KV','BFI','BGF','ISO','FUTURE'])a.state.mappings.push({brand_id:b.id,master_family:family,master_series:family,selling_series:family==='FUTURE'?'NEXT':family,active:true});
 w.KeySuiteAuthority={scopeEnforced:()=>false,isBrandSeriesAllowed:()=>true};w.KeySuiteV40001CustomerBrandSettings={isPriceAllowed:()=>true};
 w.localStorage.setItem('ks_v218_quotation_templates_isolated',JSON.stringify([{id:'tesk-template',company_id:'isolated',template_name:'TESK',template_scope:'company',status:'active',settings:{companyName:'TESK Pump'}}]));
 await w.KeySuiteTemplates.init(w.KEYSUITE_ACCESS);w.KeySuiteTemplates.selectForCustomer('standard:isolated',{applyDefaults:false});
 const getTemplate=()=>w.KeySuiteTemplates.getSelectedId();assert.equal(getTemplate(),'standard:isolated');
 const source={product_family:'CHC_G1',source_price:1234,brand_margin:.08,carried_final_price:true};
 w.KeySuitePricing={findPrice:()=>({product:{model:'CHC 150-2-1'},calc:{finalPrice:16670}}),quoteBlockReason:()=>'',applyPriceToQuoteRow:row=>{row.querySelector('.item-price').value='16670';row.dataset.pricingSource=JSON.stringify(source)},sourceSnapshot:()=>source};
 run("store.set('ks_customers',[{id:'customer',company:'Isolated customer',pricingCategoryId:'cat',contacts:[]}]);refreshCustomers();$('qCustomer').value='customer';quotationPricingCustomerId='customer';editingQuoteId=null;quotationStatus='new';setQuoteItems([])");
 // Expose the existing Product List sender, not a replacement implementation.
 load('chc-g1-product-data-v41411.js');
 run(read('product.js').replace('function sendG1(model,action){','window.__sendG185=sendG1;function sendG1(model,action){'));
 w.postMessage=data=>w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:w,data}));
 w.__wrap85();
 const cases=[['vec','32-3','VEC Vertical Multistage Pump Model: VMS 32-3'],['blank','90-2','Vertical Multistage Pump Model: VMS 90-2'],['blank','10-4','Vertical Multistage Pump Model: VMS 10-4'],['blank','150-2-1','Vertical Multistage Pump Model: VMS 150-2-1'],['vec','150-2-1','VEC Vertical Multistage Pump Model: VMS 150-2-1'],['ok','15-3','O.K.Pump Vertical Multistage Pump Model: VMS 15-3'],['bg','10-4','B.G.Reich Vertical Multistage Pump Model: CHC 10-4']];
 const collected=[];
 for(const generation of ['G1','G2'])for(const [id,tail,expected] of cases){
  a.state.selectedBrandId=id;a.state.selectedFamily='CHC';a.state.selectedProductGroup='CHC_'+generation;
  const ctx=a.brandContext(id,'CHC','SS304 (Cast Iron Connection)','CHC_'+generation);
  assert.equal(I.resolve(ctx,'CHC '+tail).model,(id==='bg'?'CHC ':'VMS ')+tail);
  const frame=doc.getElementById('productSelectorFrame');frame.contentWindow.__KEYSUITE_MODEL_PRESENTATION_CONTEXT={...ctx,masterModel:'CHC '+tail,displayModel:I.resolve(ctx,'CHC '+tail).model};
  const payload={family:'CHC',model:'CHC '+tail,base_model:'CHC '+tail,quotation_model:'CHC '+tail,display_model:'CHC '+tail,generation_code:generation,motor_hp:30,motor_kw:22,motor_efficiency_class:'IE2',connection:'DN125',flow_m3h:150,head_m:30,raw_flow_text:'150',raw_head_text:'30',flow_unit:'m3h',head_unit:'m',keysuite_material:'SS304 (Cast Iron Connection)',keysuite_seal:'Car/Cer',keysuite_elastomer:'Viton'};
  w.KeySuiteCHCSelection={getGeneration:()=>generation};
  run('setQuoteItems([])');
  w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:frame.contentWindow,data:{type:'KEYSUITE_ADD_SELECTION',route:'quotation',payload}}));
  const curve=plain(run('getQuoteItems()[0]'));
  assert.equal(curve.description.split('\n').find(l=>l.includes('Pump Model:')),expected);assert.equal(curve.commercialIdentity.brand,id==='blank'?'':brands.find(b=>b.id===id).brand_name);assert.equal(curve.commercialIdentity.model,(id==='bg'?'CHC ':'VMS ')+tail);assert.equal(getTemplate(),'standard:isolated');assert.equal(curve.pumpData.head_m,30);assert.equal(curve.unitPrice,16670);
  if(generation==='G1'){
   // Actual Product List direct route has no duty; it must retain that legitimate difference.
   w.__sendG185('CHC '+tail,'add');
  }else{
   // C6 list uses the same iframe transport, with a separately selected 36 m duty.
   w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:frame.contentWindow,data:{type:'KEYSUITE_ADD_SELECTION',route:'quotation',payload:{...payload,head_m:36,raw_head_text:'36'}}}));
  }
  const items=plain(run('getQuoteItems()'));assert.equal(items.length,2);assert.equal(items[0].description,curve.description);assert.equal(items[1].description.split('\n').find(l=>l.includes('Pump Model:')),expected);assert.equal(items[1].commercialIdentity.brand,curve.commercialIdentity.brand);assert.equal(items[1].commercialIdentity.model,curve.commercialIdentity.model);assert.equal(getTemplate(),'standard:isolated');assert.equal(items[1].unitPrice,16670);
  assert.equal(items[1].pumpData.head_m,generation==='G1'?undefined:36);collected.push(...items);
 }

 // Exercise the real deferred manual-price dialog, which the previous suite skipped.
 load('manual-price-v50011.js');w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 const autoFind=w.KeySuitePricing.findPrice, autoBlock=w.KeySuitePricing.quoteBlockReason;
 const manualTraces=[];
 for(const [id,tail,expected] of cases)for(const entry of ['curve','list']){
  a.state.selectedBrandId=id;a.state.selectedFamily='CHC';a.state.selectedProductGroup='CHC_G1';
  const ctx=a.brandContext(id,'CHC','SS304 (Cast Iron Connection)','CHC_G1');
  const frame=doc.getElementById('productSelectorFrame');frame.contentWindow.__KEYSUITE_MODEL_PRESENTATION_CONTEXT={...ctx,masterModel:'CHC '+tail,displayModel:I.resolve(ctx,'CHC '+tail).model};
  w.KeySuitePricing.findPrice=()=>null;w.KeySuitePricing.quoteBlockReason=()=> 'Missing source price';
  run('setQuoteItems([])');
  if(entry==='list')w.__sendG185('CHC '+tail,'add');else w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:frame.contentWindow,data:{type:'KEYSUITE_ADD_SELECTION',route:'quotation',payload:{family:'CHC',model:'CHC '+tail,base_model:'CHC '+tail,quotation_model:'CHC '+tail,display_model:'CHC '+tail,generation_code:'G1',motor_hp:30,motor_kw:22,motor_efficiency_class:'IE2',connection:'DN125',flow_m3h:150,head_m:30,keysuite_material:'SS304 (Cast Iron Connection)'}}}));
  const dialog=doc.querySelector('dialog input[name="price"]')?.closest('dialog');assert(dialog,'manual price dialog');
  const preview=dialog.querySelector('pre').textContent;
  // Navigation while the dialog is open must not change the captured identity.
  a.state.selectedBrandId='bg';
  dialog.querySelector('input').value='10000';dialog.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const got=plain(run('getQuoteItems()[0]'));
  manualTraces.push({id,tail,entry,selected:ctx,preview,item:got,expected});
  if(process.env.RECORD_BASELINE==='1')continue;
  assert.equal(got.commercialIdentity.brand,id==='blank'?'':brands.find(b=>b.id===id).brand_name);
  assert.equal(got.commercialIdentity.model,(id==='bg'?'CHC ':'VMS ')+tail);
  assert.equal(got.description.split('\n').find(l=>l.includes('Pump Model:')),expected,JSON.stringify({id,tail,entry,got}));
  assert.equal(got.unitPrice,10000);assert.equal(got.pricingSource.manual_override,true);
 }
 fs.writeFileSync(path.join(__dirname,'v50087-brand-manual-traces.json'),JSON.stringify(manualTraces,null,2)+'\n');
 if(process.env.RECORD_BASELINE==='1'){console.log('BASELINE manual failures',manualTraces.filter(t=>t.item.description.split('\n').find(l=>l.includes('Pump Model:'))!==t.expected).map(t=>({brand:t.id,model:t.tail,entry:t.entry,actual:t.item.description})));return;}
 w.KeySuitePricing.findPrice=autoFind;w.KeySuitePricing.quoteBlockReason=autoBlock;
 pass('Real manual-price dialog: exact brand/model for Curve and List; captured identity survives navigation and preserves entered price');
 pass('All seven required identity cases through Curve messages and List paths across C4/C6; 28 items; selected duty differences, prices, sequential items and Keylargo template retained');
 // Explicit selected TESK template is equally stable.
 w.KeySuiteTemplates.selectForCustomer('tesk-template',{applyDefaults:false});a.state.selectedBrandId='vec';a.state.selectedFamily='CHC';a.state.selectedProductGroup='CHC_G1';
 run('setQuoteItems([])');w.__sendG185('CHC 150-2-1','add');assert.equal(getTemplate(),'tesk-template');pass('Adding a product also preserves an explicitly selected TESK template');
 for(const [id,family,raw,expected] of [['blank','ES','ES 40-16','ES 40-16'],['mega','BFI','BFI 10-3T','BFI 10-3T'],['future','FUTURE','FUTURE 10-3','NEXT 10-3'],['bg','CR','CRN 10-3','CRN 10-3']]){
  a.state.selectedBrandId=id;a.state.selectedFamily=family;a.state.selectedProductGroup=family;
  const data=I.captureSelection({family,model:raw});a.state.selectedBrandId='bg';
  const row=w.KeySuiteApp.addExternalQuoteItem({model:raw,productFamily:family,pumpData:data,qty:3,unitPrice:129.5,description:'B.G.Reich End Suction Pump Model: '+raw,pricingSource:{...source,product_family:family}});
  assert(row.querySelector('.item-description').value.includes('Model: '+expected));assert.equal(Number(row.querySelector('.item-qty').value),3);assert.equal(Number(row.querySelector('.item-price').value),129.5);if(id==='blank')assert(!row.querySelector('.item-description').value.includes('B.G.Reich'));collected.push(plain(run('getQuoteItems().at(-1)')));
 }
 pass('Brandless non-VMS, mixed other families, future brand/series and captured identity survive navigation; amounts and quantities preserved');
 for(const name of ['O.K.Pump','Megaflow','-','Future Brand']){
  const row=w.KeySuiteApp.addExternalQuoteItem({manualItem:true,brand:name,model:'Manual X',description:'Manual X',qty:2,unitPrice:50});assert(row.querySelector('.item-description').value.startsWith(name==='-'?'Manual X':name+' Manual X'));
 }
 pass('Manual items retain assigned commercial brands including brandless and future names');
 // Component identity and costing share the same resolver without touching source prices.
 a.state.selectedBrandId='bg';a.state.selectedFamily='CHC';a.state.selectedProductGroup='CHC_G2';
 assert.equal(I.forItem({model:'VMS 10-4',pumpData:{keysuite_brand_name:'-'},pricingSource:{v391_brand_id:'bg',product_family:'CHC'}}).brand,'');
 const explicit=I.captureSelection({family:'CHC',model:'CHC 15-3',keysuite_brand_id:'ok',keysuite_product_group_code:'CHC_G1'}, {__KEYSUITE_MODEL_PRESENTATION_CONTEXT:{id:'bg',family:'CHC',name:'B.G.Reich'}});
 assert.equal(explicit.commercialIdentity.brand,'O.K.Pump');
 for(const [family,key,model] of [['MOTOR','motorData','BM5-2'],['COUPLING','couplingData','UL-90'],['GWS','tankData','Tank-100']]){
  const item=I.stamp({brand:'Future Brand',model:'B.G.Reich '+family+' Model: '+model,description:'c/w\tB.G.Reich '+family+' Model: '+model,productFamily:family,[key]:{model},qty:2,unitPrice:99,pricingSource:{product_family:family,source_price:50,brand_margin:.1}});
  assert.equal(item.commercialIdentity.brand,'Future Brand');assert.equal(item.model,model);assert(item.description.startsWith('c/w\tFuture Brand '));assert.equal(item.pricingSource.source_price,50);assert.equal(item.pricingSource.brand_margin,.1);
 }
 run(read('costing-audit-v50032.js').replace('function itemsOf(input,bom){','window.__costItems85=itemsOf;function itemsOf(input,bom){'));
 const costInput={brand:'O.K.Pump',productFamily:'CHC',model:'CHC 15-3',description:'B.G.Reich Vertical Multistage Pump Model: CHC 15-3',pumpData:{keysuite_brand_id:'ok',quotation_model:'VMS 15-3'},pricingSource:{product_family:'CHC',source_price:555,brand_margin:.1}};
 const costBefore=JSON.stringify(costInput);const cost=w.__costItems85(costInput)[0];assert(cost.description.startsWith('O.K.Pump '));assert.equal(cost.commercialIdentity.model,'VMS 15-3');assert.equal(cost.pricingSource.source_price,555);assert.equal(JSON.stringify(costInput),costBefore);
 pass('Component Motor/Coupling/Tank identities, brandless source precedence, stale-frame protection and costing display preserve each brand without altering source/margin data');

 // Execute the G/BGF producers that previously assigned their catalogue brand directly.
 w.KeySuitePricing.findGPrice=()=>({calc:{finalPrice:16670}});w.KeySuitePricing.gPriceProblem=()=>'';
 w.KeySuiteGPerformance={hasCurve:()=>true,origin:()=> 'Australia'};
 load('g-data-v50068.js');load('g-series-v50068.js');
 a.state.selectedBrandId='future';a.state.selectedFamily='G';a.state.selectedProductGroup='G';
 a.state.mappings.push({brand_id:'future',master_family:'G',master_series:'G',selling_series:'GX',active:true});
 w.KeySuiteG.quote(w.KeySuiteG.models()[0]);
 let produced=plain(run('getQuoteItems().at(-1)'));assert.equal(produced.commercialIdentity.brand,'Future Brand');assert(produced.description.startsWith('Future Brand '));assert(produced.commercialIdentity.model.startsWith('GX'));
 w.KeySuitePricing.findBgfPrice=()=>({calc:{finalPrice:16670}});w.KeySuitePricing.bgfPriceProblem=()=>'';
 load('bgf-v50006.js');a.state.selectedBrandId='blank';a.state.selectedFamily='BGF';a.state.selectedProductGroup='BGF';
 w.KeySuiteBGF.quoteModel('BGF 350M');produced=plain(run('getQuoteItems().at(-1)'));assert.equal(produced.commercialIdentity.brand,'');assert(!produced.description.includes('B.G.Reich'));
 pass('Actual G and BGF product producers retain a future selling brand/series and intentional brandless selection');
 // Actual assembly formatters and isolated save boundary.
 run(read('assembly.js').replace('window.KeySuiteAssembly={','window.__assembly85={normalizeItem,rebuildDescription};window.KeySuiteAssembly={'));
 const components=[collected.find(x=>x.commercialIdentity.brand==='VEC'&&x.commercialIdentity.model==='VMS 150-2-1'),collected.find(x=>x.commercialIdentity.brand==='Megaflow')];
 for(const kind of ['pumpset','system'])for(const complete of [false,true]){
  const items=components.slice(0,complete?2:1).map(x=>({...plain(x),section:kind==='system'?'pumpset':'pump',qty:1}));
  const prices=JSON.stringify(items.map(x=>[x.qty,x.unitPrice,x.pricingSource.source_price,x.pricingSource.brand_margin]));
  const d={assembly_type:kind,items,model_item:'Fixture'};w.__assembly85.rebuildDescription(d);assert(d.description.includes('VEC '));if(complete)assert(d.description.includes('Megaflow '));assert.equal(JSON.stringify(items.map(x=>[x.qty,x.unitPrice,x.pricingSource.source_price,x.pricingSource.brand_margin])),prices);
  for(const item of items)assert.equal(w.__assembly85.normalizeItem(item,kind).commercialIdentity.brand,item.commercialIdentity.brand);
 }
 pass('Partial and mixed complete assembly/Pumpset/System formatter and normalization preserve each component identity and costing');

 // Complete and partial sets with distinct pump, motor, coupling and baseplate brands.
 const mixed=[{...plain(components[0]),section:'pump'},
 {section:'motor',brand:'Future Brand',productFamily:'MOTOR',model:'BM5-2',bomDescription:'BM5-2',description:'c/w\t5HP 2Pole Motor',motorData:{model:'BM5-2',hp:5,pole:2}},
 {section:'coupling',brand:'TESK',productFamily:'COUPLING',model:'F90',bomDescription:'F90',description:'c/w\tFlexible Coupling',couplingData:{model:'F90',selectionMode:'flexible'}},
 {section:'baseplate',brand:'-',productFamily:'BASEPLATE',model:'BP-90',bomDescription:'BP-90',description:'Baseplate',baseplateData:{model:'BP-90'}}].map(x=>({...x,qty:1,unitPrice:99,pricingSource:{product_family:x.productFamily||'CHC',source_price:50,brand_margin:.1}}));
 w.KeySuiteCoupling={assemblyDescription:()=> 'c/w\tBaseplate with Flexible Coupling'};
 for(const kind of ['pumpset','system'])for(const complete of [true,false]){
  const pumpDraft={assembly_type:'pumpset',items:plain(complete?mixed:mixed.slice(0,3)),model_item:'Mixed commercial components'};w.__assembly85.rebuildDescription(pumpDraft);
  const d=kind==='pumpset'?pumpDraft:{assembly_type:'system',items:[{section:'pumpset',model:'Mixed set',qty:2,unitPrice:396,description:pumpDraft.description,productFamily:'ASSEMBLY',pricingSource:{product_family:'ASSEMBLY',assembly_items:plain(pumpDraft.items)},pumpsetData:{bom:plain(pumpDraft.items)}}]};
  w.__assembly85.rebuildDescription(d);
  for(const model of ['VMS 150-2-1','BM5-2','F90'])assert(d.description.includes(model),JSON.stringify({kind,complete,missing:model,description:d.description,items:d.items}));
  assert(d.description.includes('Future Brand'),d.description);assert(d.description.includes('TESK'),d.description);
  if(complete)assert(d.description.includes('BP-90'),d.description);
  const leaves=kind==='system'?d.items[0].pumpsetData.bom:d.items;
  assert.equal(leaves[1].bomDescription,'Future Brand BM5-2');assert.equal(leaves[2].bomDescription,'TESK F90');
  assert(leaves.every(x=>x.unitPrice===99&&x.pricingSource.source_price===50&&x.pricingSource.brand_margin===.1));
  if(kind==='system')collected.push(plain(d.items[0]));
 }
 pass('Mixed-brand complete/partial Pumpset and System keep pump, motor, coupling and baseplate model identities and BOM labels');

 const savedRows=new Map();w.KeySuiteAuth={getClient:()=>({rpc:async(name,args)=>{if(name==='keysuite_save_quotation_v50037'){const q=structuredClone(args.p_quotation);savedRows.set(q.id,q);return {data:{status:'saved',saved:q},error:null}}if(name==='keysuite_history_page_v50087')return {data:{rows:[...savedRows.values()].map(q=>({...q,items:undefined,summaryOnly:true,itemCount:q.items.length})),recent:[],next_cursor:null,facets:{years:['2026'],users:[]},metrics:{count:savedRows.size,value:0}},error:null};if(name==='keysuite_history_document_v50087')return {data:{row_data:savedRows.get(args.p_id)},error:null};return {data:null,error:null}}})};w.KeySuiteQuotationReferences={registerUsed:async()=>{}};
 w.fixtureItems=[...collected,...manualTraces.map(t=>t.item)];w.KeySuiteTemplates.selectForCustomer('standard:isolated',{applyDefaults:false});
 run("editingQuoteId=null;quotationStatus='new';setQuoteItems(fixtureItems);setQuoteNoValue('QA-2611-0085');$('qDate').value='2026-11-22';quotationSyncMode='supabase';quotationReferenceAllocated=true");
 assert(await run('saveQuote({silent:true})'));const saved=[...savedRows.values()][0];assert.equal(saved.quotationTemplateId,'standard:isolated');await w.KeySuiteQuotationStore.load();w.savedId=saved.id;await run('loadQuote(savedId)');const reopened=plain(run('getQuoteItems()'));assert.equal(reopened.length,w.fixtureItems.length);for(let i=0;i<reopened.length;i++){assert.equal(reopened[i].description,saved.items[i].description);assert.deepEqual(reopened[i].commercialIdentity,saved.items[i].commercialIdentity);if(reopened[i].pumpsetData)assert.deepEqual(reopened[i].pumpsetData.bom,saved.items[i].pumpsetData.bom)}
 assert.equal(getTemplate(),'standard:isolated');run('buildPrintQuotation()');for(const x of reopened)if(x.commercialIdentity)assert(doc.getElementById('printQuotationDocument').textContent.includes(x.commercialIdentity.model));assert(doc.getElementById('printQuotationDocument').textContent.includes('Future Brand'));assert(doc.getElementById('printQuotationDocument').textContent.includes('TESK'));
 pass('Actual save/history RPC fixture and reopen retain identity and template; quotation print renderer matches all items');
 fs.writeFileSync(path.join(__dirname,'v50087-brand-lifecycle.json'),JSON.stringify({saved,reopened,printText:doc.getElementById('printQuotationDocument').textContent},null,2)+'\n');
 // Persist exact rendered DOM for real Chromium PDF generation; no app startup/network scripts.
 const review=dom.serialize().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,'');
 fs.writeFileSync(path.join(__dirname,'v50087-brand-review.html'),review);
 fs.writeFileSync(path.join(__dirname,'v50087-brand-results.json'),JSON.stringify({status:'PASS',checks,isolatedPersistence:true},null,2)+'\n');
}
main().then(()=>dom.window.close()).catch(e=>{console.error(e.stack);dom.window.close();process.exitCode=1});
