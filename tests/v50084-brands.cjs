'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require('jsdom');
const root=process.env.KEYSUITE_TEST_ROOT||path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://isolated.keysuite.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,doc=w.document,checks=[];
w.structuredClone=structuredClone;w.CSS={escape:v=>String(v)};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.alert=m=>{throw Error('Unexpected application alert: '+m)};w.confirm=()=>true;
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){} disconnect(){}};w.IntersectionObserver=w.ResizeObserver;
w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:s=>({width:String(s).length*6})});
w.fetch=()=>{throw Error('External requests forbidden')};w.KEYLARGO_LOGO_DATA='data:image/png;base64,';
w.KEYSUITE_ACCESS={email:'test@example.invalid',role:'owner',company_id:'isolated',quotation_prefix:'QA'};w.KEYSUITE_PROFILE={...w.KEYSUITE_ACCESS,display_name:'Isolated tester'};w.KEYSUITE_SECURE_DATA={categories:[],users:[]};
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),read=n=>fs.readFileSync(path.join(root,n),'utf8'),load=n=>run(read(n)),plain=x=>JSON.parse(JSON.stringify(x));
const pass=s=>{checks.push(s);console.log('PASS '+s)};
async function main(){
 for(const n of ['permissions.js','payment-terms.js','commercial-identity.js','app.js','assembly.js'])load(n);
 await new Promise(r=>setTimeout(r,20));
 const brands=[['bg','B.G.Reich'],['vec','VEC'],['mega','Megaflow'],['ok','O.K.Pump'],['tesk','TESK'],['blank','-'],['future','Future configured brand']].map(([id,brand_name])=>({id,brand_name}));
 const state={brands,selectedBrandId:'vec',selectedFamily:'CHC',selectedProductGroup:'CHC_G1'};
 w.KeySuiteV391=w.KeySuiteV40001={state,brandContext:(id=state.selectedBrandId,family=state.selectedFamily)=>{const b=brands.find(x=>x.id===id);if(!b)return null;return {id:b.id,name:b.brand_name,family,masterSeries:family,sellingSeries:family==='CHC'?'VMS':family,productGroup:state.selectedProductGroup}},stampRowBrand(){}};
 const I=w.KeySuiteCommercialIdentity;
 const incoming={model:'VMS 150-2-1',description:'B.G.Reich Vertical Multistage Pump Model: VMS 150-2-1\nc/w 30HP 2Pole IE2 Motor (415V / 3Ph / 50Hz)\nSuction & Discharge: DN125 x DN125',qty:1,unitPrice:16670,productFamily:'CHC',commercialIdentity:{brandId:'vec',brand:'VEC',series:'VMS',model:'VMS 150-2-1',hydraulic:{series:'CHC',model:'CHC 150-2-1'},pricing:{series:'CHC_G1',model:'CHC 150-2-1'}},pumpData:{model:'CHC 150-2-1',quotation_model:'VMS 150-2-1',family:'CHC'},pricingSource:{product_family:'CHC_G1',source_price:1234,brand_margin:0.08}};
 run("editingQuoteId=null;quotationStatus='new';setQuoteItems([])");
 w.KeySuiteApp.addExternalQuoteItem(plain(incoming));
 const got=run('getQuoteItems()[0]');
 if(process.env.EXPECT_BASELINE_DEFECT==='1'){assert(got.description.includes('B.G.Reich'),got.description);pass('V5.00.83 reproduces late-write regression: VEC snapshot -> raw B.G.Reich description');return}
 assert(got.description.startsWith('VEC Vertical Multistage Pump Model: VMS 150-2-1'),got.description);assert.deepEqual(plain(got.pricingSource),incoming.pricingSource);assert.equal(got.unitPrice,16670);
 pass('VEC VMS 150-2-1 actual external Quote handoff; identity survives raw row writes, price and source unchanged');
 const all=[];
 for(const b of brands)for(const family of ['CHC','BFI','ES','CR','KV','G','BGF','BSW','BSV','ISO','FUTURE_HYDRAULICS']){
  state.selectedBrandId=b.id;state.selectedFamily=family;const commercial=family==='CHC'?'VMS':family==='BFI'&&b.id==='blank'?'HMS':family;
  const identity=I.resolve({id:b.id,name:b.brand_name,family,masterSeries:family,sellingSeries:commercial},family+' 10-3T');
  const data={...plain(incoming),model:commercial+' 10-3T',commercialIdentity:identity,productFamily:family,pumpData:{model:family+' 10-3T',quotation_model:commercial+' 10-3T',family},description:'Capacity: 10 m³/hr @ 30 Mtr\nB.G.Reich Vertical Multistage Pump Model: '+family+' 10-3T'};
  run('setQuoteItems([])');w.KeySuiteApp.addExternalQuoteItem(data);const item=plain(run('getQuoteItems()[0]'));
  const expected=(b.brand_name==='-'?'':b.brand_name+' ')+'Vertical Multistage Pump Model: '+commercial+' 10-3T';assert(item.description.includes(expected),item.description);assert.deepEqual(item.pricingSource,data.pricingSource);assert.equal(item.unitPrice,data.unitPrice);all.push(item);
 }
 pass('77 brand/family combinations: configured B.G.Reich, VEC, Megaflow, O.K.Pump, TESK, brandless, future brand/series');
 // Pin the commercial selection before another navigation changes global selection.
 state.selectedBrandId='vec';state.selectedFamily='CHC';
 const selected=I.captureSelection({model:'CHC 150-2-1',family:'CHC',generation_code:'G1',keysuite_product_group_code:'CHC_G1'},null);
 state.selectedBrandId='bg';const after=I.stamp({model:'VMS 150-2-1',productFamily:'CHC',pumpData:selected,description:incoming.description});assert.equal(after.commercialIdentity.brand,'VEC');assert(after.description.startsWith('VEC '));assert.equal(after.pumpData.model,'CHC 150-2-1');
 const explicitBlank=I.stamp({brand:null,manualItem:true,model:'Manual item',description:'B.G.Reich Custom Pump'});assert.equal(explicitBlank.commercialIdentity.brand,'');assert(!explicitBlank.description.includes('B.G.Reich'));
 pass('Captured selector identity beats later global state; explicit null/empty brand stays brandless; hydraulic model unchanged');
 // A real CHC selector message follows the app listener used by the reported VEC case.
 state.selectedBrandId='vec';state.selectedFamily='CHC';
 w.KeySuitePricing={findPrice:()=>({product:{model:'CHC 150-2-1'},calc:{finalPrice:16670}}),quoteBlockReason:()=>'',applyPriceToQuoteRow:row=>{row.querySelector('.item-price').value='16670';row.dataset.pricingSource=JSON.stringify(incoming.pricingSource)},sourceSnapshot:()=>incoming.pricingSource};
 run("store.set('ks_customers',[{id:'customer',company:'Isolated customer',pricingCategoryId:'cat',contacts:[]}]);refreshCustomers();$('qCustomer').value='customer';quotationPricingCustomerId='customer';setQuoteItems([])");
 w.KeySuiteCHCSelection={getGeneration:()=> 'G1'};
 const payload={...incoming.pumpData,model:'CHC 150-2-1',base_model:'CHC 150-2-1',display_model:'CHC 150-2-1',quotation_model:'CHC 150-2-1',generation_code:'G1',motor_hp:30,motor_kw:22,motor_efficiency_class:'IE2',motor_phase:'3Ph',motor_voltage:415,connection:'DN125',flow_m3h:150,head_m:30,keysuite_material:'SS304 (Cast Iron Connection)',keysuite_seal:'Car/Cer',keysuite_elastomer:'Viton'};
 w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:doc.getElementById('selectorFrame').contentWindow,data:{type:'KEYSUITE_ADD_SELECTION',route:'quotation',payload}}));
 const routed=run('getQuoteItems()[0]');assert(routed.description.includes('VEC Vertical Multistage Pump Model: VMS 150-2-1'),routed.description);assert.equal(routed.unitPrice,16670);assert.equal(routed.pumpData.model,'CHC 150-2-1');
 pass('Actual CHC Selector message -> quotation: VEC VMS 150-2-1, source CHC, price 16670 preserved');
 // Exercise real assembly conversion and formatting, with an in-memory persistence boundary.
 run(read('assembly.js').replace('window.KeySuiteAssembly={',"window.__assembly84={normalizeItem,rebuildDescription,set:d=>{current=d;type=d.assembly_type;loaded=true;drafts=[d]}};window.KeySuiteAssembly={"));
 const vec=I.stamp({...plain(incoming),section:'pump',brand:'VEC',brandId:'vec'}),mega=I.stamp({...plain(incoming),section:'pump',commercialIdentity:I.resolve({id:'mega',name:'Megaflow',family:'ES',sellingSeries:'ES'},'ES 40-16'),model:'ES 40-16',pumpData:{model:'ES 40-16',motor_hp:7.5},description:'B.G.Reich End Suction Pump Model: ES 40-16\nSuction x Discharge: DN65 x DN40\nPump Material: CI / SS / SS / Mech Seal'});
 for(const kind of ['pumpset','system']){const d={id:'local-'+kind,assembly_type:kind,model_item:'Mixed test',customer_id:'customer',quote_qty:1,items:[vec,mega].map(x=>({...plain(x),section:kind==='system'?'pumpset':'pump',qty:1}))};const costs=JSON.stringify(d.items.map(x=>[x.qty,x.unitPrice,x.pricingSource?.source_price,x.pricingSource?.brand_margin]));w.__assembly84.rebuildDescription(d);assert(d.description.includes('VEC '),d.description);assert(d.description.includes('Megaflow '));assert.equal(JSON.stringify(d.items.map(x=>[x.qty,x.unitPrice,x.pricingSource?.source_price,x.pricingSource?.brand_margin])),costs);const normalized=w.__assembly84.normalizeItem(d.items[0],kind);assert.equal(normalized.commercialIdentity.brand,'VEC');}
 pass('Assembly, Pumpset and mixed System descriptions retain each component brand and unchanged BOM prices/quantities');
 for(const b of brands){const item={manualItem:true,brand:b.brand_name,model:'Manual assigned',description:'B.G.Reich Manual assigned product',qty:1,unitPrice:12};run('setQuoteItems([])');w.KeySuiteApp.addExternalQuoteItem(item);const saved=run('getQuoteItems()[0]');assert(saved.description.startsWith(b.brand_name==='-'?'Manual':b.brand_name+' '));}
 pass('Manual items with assigned configured brands use the shared resolver');
 // Save, secure history retrieval and reopen run against an isolated in-memory RPC implementation.
 const quoteRows=new Map();w.KeySuiteAuth={getClient:()=>({rpc:async(name,args)=>{if(name==='keysuite_save_quotation_v50037'){const q=structuredClone(args.p_quotation);quoteRows.set(q.id,q);return {data:{status:'saved',saved:q},error:null}}if(name==='keysuite_list_quotations_v42919')return {data:[...quoteRows.values()],error:null};return {data:null,error:null}}})};
 w.KeySuiteQuotationReferences={registerUsed:async()=>{}};w.allTestItems=[routed,...all.slice(0,8)].map((x,i)=>({...plain(x),internalRemark:'Item '+i+'\nMultiline remark'}));
 run("editingQuoteId=null;quotationStatus='new';setQuoteItems(allTestItems);setQuoteNoValue('QA-2611-0084');$('qDate').value='2026-11-22';quotationSyncMode='supabase';quotationReferenceAllocated=true");
 assert.equal(await run('saveQuote({silent:true})'),true);const saved=[...quoteRows.values()][0];assert(saved);await w.KeySuiteQuotationStore.load();w.savedId=saved.id;run('loadQuote(savedId)');const reopened=plain(run('getQuoteItems()'));assert.equal(reopened.length,w.allTestItems.length);for(let i=0;i<reopened.length;i++){assert.equal(reopened[i].description,saved.items[i].description);assert.deepEqual(reopened[i].commercialIdentity,saved.items[i].commercialIdentity);assert.equal(reopened[i].internalRemark,'Item '+i+'\nMultiline remark')}
 run('buildPrintQuotation()');const printed=doc.getElementById('printQuotationDocument').textContent;assert(printed.includes('VEC Vertical Multistage Pump Model: VMS 150-2-1'));assert(!printed.includes('Multiline remark'));
 pass('Actual save/history mock/reopen preserves identity, descriptions and internal remarks; print DOM has VEC model and keeps internal notes private');
 w.brandlessSnapshot={commercialIdentity:{brand:''},pricingSource:{v391_brand_name:'B.G.Reich'}};assert.equal(run('quoteItemBrands(brandlessSnapshot).length'),0);w.vecSnapshot={commercialIdentity:{brand:'VEC'},pricingSource:{v391_brand_name:'B.G.Reich'}};assert.deepEqual(plain(run('quoteItemBrands(vecSnapshot)')),['VEC']);
 pass('Quotation/PDF brand lists use commercial snapshots, including brandless items; pricing-source brand does not leak');
 // Load the real configuration resolver/wrapper without its network startup.
 let multi=read('v40001-multibrand.js').replace('function wrapApp(){','window.__wrap84=wrapApp;function wrapApp(){').replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();",'');
 run(multi);const real=w.KeySuiteV391;
 real.state.brands=brands.map(b=>({...b,active:true,brand_key:b.id==='bg'?'b.g.reich':b.id,brand_type:b.id==='bg'?'master':'oem'}));
 real.state.mappings=[['vec','CHC_G1','CHC','VMS'],['ok','CHC_G1','CHC','VMS'],['mega','ES','ES','ES'],['blank','BFI','BFI','HMS'],['bg','BFI','HMS','BFI'],['future','FUTURE_HYDRAULICS','MASTER_SRC','COMMERCIAL_NEW']].map(([brand_id,master_family,master_series,selling_series])=>({brand_id,master_family,master_series,selling_series,active:true}));
 w.KeySuiteAuthority={scopeEnforced:()=>false,isBrandSeriesAllowed:()=>true};w.KeySuiteV40001CustomerBrandSettings={isPriceAllowed:()=>true};
 for(const [id,family,group,source,target] of [['vec','CHC','CHC_G1','CHC 150-2-1','VMS 150-2-1'],['ok','CHC','CHC_G1','CHC 15-3','VMS 15-3'],['blank','BFI','BFI','BFI 10-3T','HMS 10-3T'],['bg','BFI','BFI','HMS 10-3T','BFI 10-3T'],['future','FUTURE_HYDRAULICS','FUTURE_HYDRAULICS','MASTER_SRC 10-3','COMMERCIAL_NEW 10-3']]){const ctx=real.brandContext(id,family,'SS304 (Cast Iron Connection)',group);assert(ctx,id+' real configuration resolves');assert.equal(I.resolve(ctx,source).model,target);}
 real.state.selectedBrandId='bg';real.state.selectedFamily='CHC';real.state.selectedProductGroup='CHC_G1';w.__wrap84();run("editingQuoteId=null;quotationStatus='new';setQuoteItems([])");
 w.KeySuiteApp.addExternalQuoteItem({...plain(incoming),pricingSource:{...incoming.pricingSource,carried_final_price:true}});const wrapped=run('getQuoteItems()[0]');assert(wrapped.description.startsWith('VEC '));assert.equal(wrapped.commercialIdentity.brand,'VEC');assert.equal(wrapped.unitPrice,16670);assert.equal(wrapped.pricingSource.source_price,1234);assert.equal(wrapped.pricingSource.brand_margin,.08);
 pass('Real configured mapping in both HMS/BFI directions, VEC/O.K.Pump and future series; legacy wrapper cannot overwrite captured VEC identity');
 console.log(JSON.stringify({checks,limitations:['No Safari/browser visual verification','Print DOM verified; actual PDF export not tested','Secure history used in-memory RPC; no production writes']},null,2));
}
main().then(()=>dom.window.close()).catch(e=>{console.error(e.stack);dom.window.close();process.exitCode=1});
