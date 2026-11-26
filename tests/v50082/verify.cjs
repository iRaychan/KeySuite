'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://isolated.keysuite.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,doc=w.document,log=[];
w.structuredClone=structuredClone;w.CSS={escape:v=>String(v).replace(/[^\w-]/g,'\\$&')};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.alert=message=>{throw Error('Unexpected application alert: '+message)};w.confirm=()=>true;
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.ResizeObserver=class{observe(){} disconnect(){}};w.IntersectionObserver=class{observe(){} disconnect(){}};
// Content assertion only. Font measurement is stubbed; this is not PDF/layout verification.
w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:text=>({width:String(text).length*6})});
w.fetch=()=>{throw Error('Network forbidden in isolated test')};
w.KEYSUITE_ACCESS={email:'one@example.invalid',company_id:'isolated',role:'admin',quotation_prefix:'QA'};
w.KEYSUITE_PROFILE={...w.KEYSUITE_ACCESS,display_name:'Tester'};w.KEYSUITE_SECURE_DATA={categories:[],users:[]};
w.KEYLARGO_LOGO_DATA='data:image/png;base64,';
const run=code=>vm.runInContext(code,dom.getInternalVMContext());
const load=name=>run(fs.readFileSync(path.join(root,name),'utf8')+'\n//# sourceURL='+name);
const pass=text=>{log.push('PASS '+text);console.log(log.at(-1))};
const plain=x=>JSON.parse(JSON.stringify(x));
async function main(){
 for(const file of ['permissions.js','payment-terms.js','commercial-identity.js','app.js','assembly.js','categories.js'])load(file);
 await new Promise(r=>setTimeout(r,30));
 // Real permission engine and all application entry points use two creators and a foreign company.
 const quotes=[{id:'one',no:'QA-2611-0001',createdByEmail:'ONE@example.invalid',companyId:'isolated',items:[]},{id:'two',no:'QA-2611-0002',createdByEmail:'two@example.invalid',companyId:'isolated',items:[]},{id:'foreign',createdByEmail:'one@example.invalid',companyId:'foreign',items:[]}];
 w.testQuotes=quotes;
 for(const [level,count] of [['full',2],['all',2],['own',1],['assigned',1],['none',0]]){
  w.KeySuitePermissions.merge({admin:{...w.KeySuitePermissions.DEFAULTS.admin,view_quotations:level,view_customers:'none',create_quotations:'none',delete_quotation_history:'none'}});
  assert.equal(run('visibleQuotationRows(testQuotes).length'),count);
  run("store.set('ks_quotes',testQuotes);secureQuotes=null");
  assert.equal(run('quotes().length'),count);assert.equal(run('filteredQuotes(testQuotes).length'),count);
  assert.equal(run('canDeleteQuotationHistory()'),false);assert.equal(run('canEditQuotation()'),false);
 }
 w.KeySuitePermissions.merge({admin:{...w.KeySuitePermissions.DEFAULTS.admin,view_quotations:'none'}});
 run("loadQuote('two')");assert.equal(run('editingQuoteId'),null);
 pass('Full/Own/None, legacy levels, two users, company boundary, direct load, customer independence and unchanged edit/delete rights');
 w.KeySuitePermissions.merge({admin:{...w.KeySuitePermissions.DEFAULTS.admin,manage_categories:'full'}});
 // Category filtering executes its actual handlers; editor text never gets re-filled.
 w.KEYSUITE_SECURE_DATA.categories=['Distributor','Alpha','Dealer','Beta','Delivery'].map((name,i)=>({id:'c'+i,name,productRules:{}}));
 w.KeySuiteCategories.init({},w.KEYSUITE_ACCESS);
 doc.querySelector('[data-category-open="c2"]').click();
 doc.getElementById('categoryNameInput').value='Unsaved Dealer wording';
 const filter=doc.getElementById('categoryPrefixFilter');
 for(const [prefix,expected] of [['A',['Alpha']],['b',['Beta']],['D',['Dealer','Delivery','Distributor']],['de',['Dealer','Delivery']],['X',[]],['',['Alpha','Beta','Dealer','Delivery','Distributor']]]){
  filter.value=prefix;filter.dispatchEvent(new w.Event('input'));
  assert.deepEqual([...doc.querySelectorAll('[data-category-open]')].map(x=>x.textContent.trim()),expected);
  assert.equal(doc.getElementById('categoryNameInput').value,'Unsaved Dealer wording');
 }
 doc.getElementById('categoryPrefixClear').click();assert.equal(filter.value,'');assert(doc.querySelector('[data-category-open="c2"]').classList.contains('active'));
 pass('Category prefix A/B/D/De, case, no matches, clear, A–Z, selection and unsaved editor retention');
 const termsCases=[['0','Cash before delivery'],['60 days PDC','60 days PDC'],['Cash','Cash'],['To be advised','To be advised'],['As usual','As usual'],['50% deposit, balance before delivery','50% deposit, balance before delivery']];
 for(const [value,expected] of termsCases)assert.equal(w.KeySuitePaymentTerms.format(value),expected);
 for(const option of ['','cash','advised','usual','custom']){
  const c={id:'customer',company:'Isolated customer',companyId:'isolated',contacts:[],terms:'60',pdc:true,termOption:option,customTerms:'50% deposit — balance 30 days'};
  w.customerCase=c;
  const payload=run('remoteCustomerPayload(customerCase)');w.remoteCase=payload;
  const restored=run('normalizeCustomerRecord(remoteCase)');
  assert.deepEqual([restored.terms,restored.pdc,restored.termOption,restored.customTerms],[c.terms,c.pdc,option,option?c.customTerms:'']);
  assert.equal(w.KeySuitePaymentTerms.format(restored),w.KeySuitePaymentTerms.format(c));
 }
 run("setCustomerTermsUi({terms:'60',termOption:'usual'})");
 const custom=doc.querySelector('[data-customer-term="custom"]');custom.checked=true;custom.dispatchEvent(new w.Event('change'));
 assert.equal(doc.querySelectorAll('[data-customer-term]:checked').length,1);assert.equal(doc.getElementById('customerCustomTermsWrap').hidden,false);
 const cash=doc.querySelector('[data-customer-term="cash"]');cash.checked=true;cash.dispatchEvent(new w.Event('change'));assert.equal(doc.querySelectorAll('[data-customer-term]:checked').length,1);assert.equal(doc.getElementById('customerTerms').value,'0');assert.equal(doc.getElementById('customerCustomTermsWrap').hidden,true);
 pass('Customer payment_terms payload/reopen codec, all modes, legacy credit/PDC, mutually exclusive controls and custom input');
 // Exercise the application save/retrieval functions with an in-memory transport only.
 const customerRows=new Map();w.KeySuiteAuth={getClient:()=>({from:table=>{assert.equal(table,'ks_customers');return {upsert:payload=>({select:()=>({single:async()=>{customerRows.set(payload.id,structuredClone(payload));return {data:structuredClone(customerRows.get(payload.id)),error:null}}})})}}})};
 run("customerSyncMode='supabase';secureCustomers=[]");
 for(const option of ['cash','advised','usual','custom']){
  w.customerCase={id:'00000000-0000-4000-8000-000000000082',company:'Isolated customer',companyId:'isolated',contacts:[],terms:'30',pdc:false,termOption:option,customTerms:'Deposit 25%, balance on delivery'};
  const saved=await run('saveCustomerRemote(customerCase)');assert.equal(saved.termOption,option);
  run('editCustomer(customerCase.id)');assert.equal(doc.querySelector('[data-customer-term]:checked').dataset.customerTerm,option);
  if(option==='custom')assert.equal(doc.getElementById('customerCustomTerms').value,w.customerCase.customTerms);
 }
 run("customerSyncMode='local'");w.KeySuiteAuth.getClient=()=>null;
 pass('Actual customer saveCustomerRemote -> serialized text -> normalize -> editCustomer reopen, using in-memory database transport');
 // Actual quote customer selection -> payment field; template defaults may not replace it.
 run("editingQuoteId=null;quotationStatus='new';store.set('ks_customers',[{id:'customer',company:'Isolated',terms:'0',termOption:'usual',contacts:[]}]);refreshCustomers();applyQuotationCustomerSelection('customer',{refreshPrices:false})");
 assert.equal(doc.getElementById('payment').value,'As usual');
 run("applyQuotationTemplateDefaults({settings:{payment:'Wrong template'}},true)");assert.equal(doc.getElementById('payment').value,'As usual');
 run("editingQuoteId='saved';$('payment').value='Saved historical terms';refreshQuotationContacts()");assert.equal(doc.getElementById('payment').value,'Saved historical terms');
 pass('New quotation inherits customer wording; template and customer refresh preserve saved payment snapshot');
 // Save and reopen the actual quotation through mocked secure history; customer edits must not change it.
 const quoteRows=new Map();w.KeySuiteAuth.ensureActiveSession=async()=>{};
 w.KeySuiteAuth.getClient=()=>({rpc:async(name,args)=>{
  if(name==='keysuite_save_quotation_v50037'){const q=structuredClone(args.p_quotation);quoteRows.set(q.id,q);return {data:{status:'saved',saved:q},error:null}}
  if(name==='keysuite_list_quotations_v42919')return {data:[...quoteRows.values()].map(x=>structuredClone(x)),error:null};
  return {data:null,error:null};
 }});
 w.KeySuiteQuotationReferences={registerUsed:async()=>{}};
 run("editingQuoteId=null;quotationStatus='new';store.set('ks_customers',[{id:'customer',company:'Isolated',terms:'0',termOption:'usual',pricingCategoryId:'c0',contacts:[]}]);refreshCustomers();applyQuotationCustomerSelection('customer',{refreshPrices:false});setQuoteItems([{manualItem:true,model:'Manual terms test',qty:1,unitPrice:100,description:'Terms snapshot'}]);setQuoteNoValue('QA-2611-0082');$('qDate').value='2026-11-20';quotationSyncMode='supabase';quotationReferenceAllocated=true");
 assert.equal(await run('saveQuote({silent:true})'),true);
 const savedQuote=[...quoteRows.values()][0];assert.equal(savedQuote.payment,'As usual');
 run("store.set('ks_customers',[{id:'customer',company:'Isolated',terms:'90',pricingCategoryId:'c0',contacts:[]}])");
 await w.KeySuiteQuotationStore.load();w.savedQuoteId=savedQuote.id;run('loadQuote(savedQuoteId);refreshAll()');
 assert.equal(doc.getElementById('payment').value,'As usual');run('buildPrintQuotation()');assert.equal(doc.getElementById('pPayment').textContent,'As usual');
 w.KeySuiteAuth.getClient=()=>null;
 pass('Actual quotation save -> secure-history mock -> reopen -> customer update -> refresh -> print preserves payment snapshot');
 // All eight real formatter configurations, with dynamic commercial branding and specifications.
 const pump={id:'p',section:'pump',qty:1,unitPrice:1000,model:'ES 40-16',productFamily:'ES',commercialIdentity:{brand:'Megaflow',model:'ES 40-16',series:'ES'},pumpData:{motor_hp:7.5,pole:2},pricingSource:{product_family:'ES',source_currency:'USD',source_price:100},description:'Megaflow End Suction Pump Model: ES 40-16\nSuction x Discharge: DN65 x DN40\nPump Material: CI / SS / SS / Mech Seal\n(Bare shaft pump only)'};
 const motor={id:'m',section:'motor',qty:1,unitPrice:500,motorData:{hp:7.5,pole:2},pricingSource:{source_currency:'RMB',source_price:100},description:'c/w\t7.5HP 2Pole IE3 Motor (415V / 3Ph / 50Hz) Model: ES 3BM7.5-2'};
 const coupling={id:'c',section:'coupling',qty:1,unitPrice:50,couplingData:{model:'F60'},pricingSource:{source_currency:'RMB',source_price:50},description:'c/w\tFlexible Coupling'};
 const baseplate={id:'b',section:'baseplate',qty:1,unitPrice:100,pricingSource:{raw_cost_myr:100},description:''};
 w.testComponents={pump,motor,coupling,baseplate};w.KeySuiteCoupling={assemblyDescription:()=> 'c/w\tBaseplate with Flexible Coupling'};
 const configs=[['A',['pump','baseplate'],'Motor & Flexible Coupling'],['B',['pump','motor'],'Baseplate & Flexible Coupling'],['C',['pump','motor','coupling'],'Baseplate'],['D',['pump','motor','baseplate'],'Flexible Coupling'],['E',['pump','coupling'],'Motor & Baseplate'],['F',['pump','coupling','baseplate'],'Motor'],['pump only',['pump'],null],['complete',['pump','motor','coupling','baseplate'],null]];
 w.results82=[];
 for(const [name,keys,missing] of configs){
  const d={assembly_type:'pumpset',items:keys.map(k=>structuredClone(w.testComponents[k]))};
  const before=JSON.stringify(d.items);const text=w.KeySuiteAssembly.formatPumpsetDescription(d);
  assert.match(text,/^Megaflow End Suction Pump Model: ES 40-16/);assert(!text.includes('B.G.Reich'));
  assert(text.includes('DN65 x DN40'));assert(text.includes('CI / SS / SS / Mech Seal'));
  if(missing)assert(text.endsWith(missing+' supply by Customer'),text);
  else assert(!text.includes('supply by Customer'));
  if(keys.includes('motor'))assert(text.includes(motor.description.split(' Model:')[0]));else assert(!text.includes('IE3 Motor'));
  assert(!text.includes('ES 3BM7.5-2'));
  if(['A','E','F'].includes(name))assert.match(text,/7\.5HP 2P(?:ole)? Motor/);
  if(name==='pump only')assert(text.includes('(Bare shaft pump only)'));
  // Sanitization may add legacy default seals; pricing, quantity and item membership remain unchanged.
  assert.deepEqual(d.items.map(i=>[i.id,i.qty,i.unitPrice,i.pricingSource.source_price,i.pricingSource.raw_cost_myr]),keys.map(k=>{const i=w.testComponents[k];return [i.id,i.qty,i.unitPrice,i.pricingSource.source_price,i.pricingSource.raw_cost_myr]}));
  w.results82.push({name,description:text,unitPrice:d.items.reduce((n,i)=>n+i.unitPrice*i.qty,0)});
 }
 pass('Six partial formats A–F, Pump only, Complete Pumpset, dynamic brand/specifications and unchanged component quantities/prices');
 for(const [family,brand,model] of [['ISO','O.K.Pump','ISO 65-40-160'],['CHC_G1','New Brand','VMS 10-4'],['BFI','','HMS 10-3T']]){
  const type=family==='ISO'?'End Suction':'Vertical Multistage',identity={brand,model,series:model.split(' ')[0]};
  const p={...structuredClone(pump),productFamily:family,model,commercialIdentity:identity,description:(brand?brand+' ':'')+type+' Pump Model: '+model+'\nSuction x Discharge: DN40 x DN40\nPump Material: SS304'};
  const text=w.KeySuiteAssembly.formatPumpsetDescription({assembly_type:'pumpset',items:[p,baseplate]});assert(text.startsWith((brand?brand+' ':'')+type+' Pump Model: '+model));assert(!text.includes('B.G.Reich'));
 }
 pass('Partial description identity also preserves ISO, VMS/new brand and brandless HMS without ES identity injection');
 // Use instrumented closure only in memory to call private validation and synchronizer functions.
 let source=fs.readFileSync(path.join(root,'assembly.js'),'utf8').replace('window.KeySuiteAssembly={',"window.__assembly82={missingPumpsetSourceCosts,syncAutomaticComponents,setDraft:d=>{current=d;type='pumpset';loaded=true;drafts=[d]}};window.KeySuiteAssembly={");
 run(source);
 for(const [,keys] of configs)assert.equal(w.__assembly82.missingPumpsetSourceCosts(keys.map(k=>w.testComponents[k])).length,0);
 assert.equal(w.__assembly82.missingPumpsetSourceCosts([{...pump,pricingSource:{}}]).length,1);
 assert.equal(w.__assembly82.missingPumpsetSourceCosts([pump,{...motor,pricingSource:{}},{...motor,id:'m2'}]).length,1);
 assert.equal(w.__assembly82.missingPumpsetSourceCosts([pump,{...motor,qty:0,pricingSource:{}}]).length,0);
 for(const [,keys] of configs){const d={assembly_type:'pumpset',items:keys.map(k=>structuredClone(w.testComponents[k]))};w.__assembly82.syncAutomaticComponents(d);assert.deepEqual(d.items.map(i=>i.id),keys.map(k=>w.testComponents[k].id))}
 pass('Selected-component-only cost validation, every selected row checked, zero-quantity omitted and no absent accessory inserted');
 w.KeySuiteApp.getPricingCustomerId=()=> 'customer';w.KeySuiteApp.selectCustomerForQuotation=async()=>true;
 for(const [name,keys] of configs){
  const d={id:'draft-'+name,assembly_type:'pumpset',customer_id:'customer',model_item:'ES 40-16',quote_qty:1,description:'',description_manual:false,items:keys.map(k=>structuredClone(w.testComponents[k]))};
  doc.getElementById('assemblyItems').innerHTML='';doc.getElementById('assemblyModelItem').value=d.model_item;doc.getElementById('assemblyQuoteQty').value='1';doc.getElementById('assemblyQuoteUnitPrice').value='';doc.getElementById('assemblyDescription').value='';
  w.__assembly82.setDraft(d);run("editingQuoteId=null;quotationStatus='new';setQuoteItems([])");
  await w.KeySuiteAssembly.toQuotation();
  const item=run('getQuoteItems()[0]');assert(item,'Quotation row missing '+name);assert.equal(item.unitPrice,keys.reduce((n,k)=>n+w.testComponents[k].unitPrice,0));
  assert.equal(item.description,w.results82.find(r=>r.name===name).description);assert.equal(item.pricingSource.carried_final_price,true);
 }
 pass('Actual Pumpset -> toQuotation for all eight configurations carries selected-component totals and exact descriptions');
 const allComponents=Object.values(w.testComponents).map(item=>structuredClone(item));
 const manuallyEdited={...motor,description:'c/w Motor (415V / 3Ph / 50Hz) Model: Customer spec',descriptionManuallyEdited:true};
 assert(w.KeySuiteAssembly.formatPumpsetDescription({assembly_type:'pumpset',items:[pump,manuallyEdited,coupling,baseplate]}).includes('Model: Customer spec'));
 const viaAssembly=plain(run('getQuoteItems()[0]'));
 run('setQuoteItems([])');
 assert(await w.KeySuiteAssembly.quotePumpsetSelection(allComponents,{model:'ES 40-16',qty:1}));
 const direct=plain(run('getQuoteItems()[0]'));
 assert.equal(direct.description,viaAssembly.description);
 assert.equal(direct.unitPrice,viaAssembly.unitPrice);
 assert(motor.description.includes('ES 3BM7.5-2'));
 pass('ES 40-16 direct complete-set and Assembly handoffs agree for the same BOM and prices. Internal motor code retained and manual wording preserved.');

 for(let mask=1;mask<16;mask++){
  const items=Object.values(w.testComponents).filter((_,index)=>mask&(1<<index)).map(x=>structuredClone(x));
  assert.equal(w.__assembly82.missingPumpsetSourceCosts(items).length,0);
  const d={assembly_type:'pumpset',items};w.__assembly82.syncAutomaticComponents(d);assert.equal(d.items.length,items.length);
 }
 pass('Every nonempty component subset (15) accepts valid selected source costs and retains its selected membership');
 // Real quotation rows and print DOM, not a PDF export.
 run("editingQuoteId=null;quotationStatus='new'");
 const descriptions=w.results82.map(x=>({manualItem:true,model:'ES 40-16 '+x.name,description:x.description,qty:1,unit:'set',unitPrice:x.unitPrice}));
 w.printItems82=descriptions;run('setQuoteItems(printItems82)');
 for(const term of ['Cash before delivery','Cash','To be advised','As usual','50% deposit — balance 30 days','60 days PDC']){
  doc.getElementById('payment').value=term;run('buildPrintQuotation()');assert.equal(doc.getElementById('pPayment').textContent,term);
  const print=doc.getElementById('printQuotationDocument').textContent;
  assert(print.includes('Megaflow End Suction Pump Model: ES 40-16'));assert(print.includes('Motor & Flexible Coupling supply by Customer'));
 }
 pass('Actual quotation print DOM contains all payment wordings and partial-set brand/model/customer-supply descriptions (PDF export NOT TESTED)');
 fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify({checks:log,descriptions:plain(w.results82),limits:['Safari/Chrome/WebKit launch unavailable','No actual PDF export','Live secure-history change awaiting approval; no DB writes'],at:new Date().toISOString()},null,2));
}
main().then(()=>{dom.window.close();console.log('PASS isolated application/DOM test suite')}).catch(e=>{console.error(e.stack);dom.window.close();process.exitCode=1});
