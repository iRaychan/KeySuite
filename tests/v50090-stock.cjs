'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {as,rpc}=require('./v50051-db.cjs');

(async()=>{
 const {db}=await require('./v50086-db.cjs').fixture();
 const migration=path.join(__dirname,'../supabase/migrations');
 try{
  await db.exec('reset role;alter table ks_products_kv add column price_kvd_myr numeric,add column price_kvsd_myr numeric;alter table ks_products_es add column if not exists source_row integer,add column if not exists rarity text;create table ks_pricing_categories(id text,product_rules jsonb,is_active boolean,chc_margin numeric,transport numeric);grant select on ks_pricing_categories to authenticated;');
  for(const version of ['50088','50089','50090']){
   const file=fs.readdirSync(migration).find(name=>name.includes('v'+version));
   await db.exec(fs.readFileSync(path.join(migration,file),'utf8'));
  }
  const tenant='test-links';
  const owner=()=>as(db,'owner',tenant);
  await owner();
  const call=(action,p={})=>rpc(db,action,{config_client:'v104',ledger_client:'v102',request_id:randomUUID(),...p});
  const state=()=>call('state');
  const initial=await state(), locations=initial.locations, supplier_id=initial.suppliers[0].id;
  const location_id=locations[0].id;
  await call('location',{label:'B02'});
  const secondLocation=(await state()).locations.find(l=>l.label==='B02').id;
  const product=initial.catalog.find(m=>m.family==='ES'&&m.model==='ES 32-13')||initial.catalog.find(m=>m.family==='ES');
  assert(product);
  const family=product.family, variant=product.choices[0].code, item_key=product.key;
  const option=(kind,label)=>call('series_option_save',{series_key:family,kind,label});
  const normal=await option('normal','Seal'),critical=await option('critical','Housing');
  const options=(await state()).options;
  const normalGroup=options.find(o=>o.id===normal.id).group_id, criticalGroup=options.find(o=>o.id===critical.id).group_id;
  const receive=(quantity,cost,selections={})=>call('ledger_receive',{family,supplier_id,rows:[{item_key,selections,variant,location_id,quantity,unit_cost_myr:cost}]});
  await receive(10,90,{[normalGroup]:[normal.id]});
  await receive(70,55);
  await receive(10,50);
  await receive(8,55);
  const getCosts=async()=>(await db.query('select public.keysuite_quotation_costs_v50088() data')).rows[0].data.filter(x=>x.item_key===item_key);
  assert.equal(Math.max(...(await getCosts()).map(r=>r.cost)),90);
  let s=await state();
  const batch=s.ledger.positions.find(p=>p.quantity===10&&s.ledger.lots.find(l=>l.id===p.lot_id).unit_cost_myr===90);
  const receiveEvent=s.ledger.events.find(e=>e.destination_id===batch.id);
  const payload={position:batch.id,revision:0,expected_quantity:10,location_id:secondLocation,unit_cost_myr:53,remark:'Corrected',selections:{[criticalGroup]:critical.id},variant,reason:'Receipt data entry correction'};
  await as(db,'admin',tenant);
  await assert.rejects(call('edit_batch',payload),/Edit Stock Batch/);
  await as(db,'owner','other-tenant');
  await assert.rejects(call('edit_batch',payload),/Batch is unavailable/);
  await owner();
  await call('series_option_delete',{series_key:family,kind:'normal',id:normal.id,revision:1});
  s=await state();
  assert(s.options.find(o=>o.id===normal.id).retired);
  assert.deepEqual(s.configurations.find(c=>c.id===batch.configuration_id).selections[normalGroup],[normal.id]);
  await assert.rejects(receive(1,100,{[normalGroup]:[normal.id]}),/retired|Invalid/);
  await assert.rejects(call('edit_batch',{...payload,reason:''}),/reason required/);
  const result=await call('edit_batch',payload);
  assert.equal(result.id,batch.id);
  assert.equal(result.revision,1);
  await assert.rejects(call('edit_batch',payload),/Batch changed/);
  s=await state();
  const edited=s.ledger.positions.find(p=>p.id===batch.id),lot=s.ledger.lots.find(l=>l.id===batch.lot_id);
  assert.equal(edited.location_id,secondLocation);assert.equal(edited.quantity,10);
  assert.equal(s.configurations.find(c=>c.id===edited.configuration_id).selections[criticalGroup],critical.id);
  assert.equal(lot.unit_cost_myr,53);assert.equal(lot.remarks,'Corrected');
  assert.deepEqual(s.ledger.events.find(e=>e.id===receiveEvent.id),receiveEvent);
  assert.equal(Math.max(...(await getCosts()).map(r=>r.cost)),55);
  const audit=s.audit.find(a=>a.action==='edit_batch');
  assert(audit.at&&audit.actor);assert.equal(audit.detail.reason,payload.reason);
  assert.equal(audit.detail.before.fifo_at,audit.detail.after.fifo_at);
  assert.equal(audit.detail.before.configuration_id,batch.configuration_id);
  assert.equal(audit.detail.after.configuration_id,edited.configuration_id);
  assert.equal(audit.detail.before.unit_cost_myr,undefined);
  await db.exec('reset role');
  const [{previous_cost_myr,corrected_cost_myr}]=(await db.query('select * from keystock.batch_correction_costs where audit_id=$1',[audit.id])).rows;
  assert.equal(Number(previous_cost_myr),90);assert.equal(Number(corrected_cost_myr),53);
  await owner();
  await call('series_option_delete',{series_key:family,kind:'critical',id:critical.id,revision:1});
  assert((await state()).options.find(o=>o.id===critical.id).retired);
  console.log('PASS atomic edit, durable audit, correct stock and cost, tenant and role guards, preserved historical Normal and Critical options');

  const arrangement=await call('arrangement_save',{series_key:family,label:'Seal design'});
  const linked=await call('link_option_save',{series_key:family,group_id:arrangement.id,label:'Original seal'});
  const selections={[arrangement.id]:linked.id};
  await call('series_mapping_save',{series_key:family,variant,selections});
  await receive(4,95,selections);
  await call('link_option_delete',{series_key:family,group_id:arrangement.id,id:linked.id,revision:1});
  s=await state();
  assert(s.series_mappings.find(m=>m.selections[arrangement.id]===linked.id).retired);
  assert(s.configurations.some(c=>c.selections[arrangement.id]===linked.id));
  await assert.rejects(receive(1,100,selections),/retired|Invalid/);
  console.log('PASS referenced Pricelist option archives its mapping and retains stock configuration');
  const customerId=randomUUID();
  await db.exec('reset role');
  await db.query("insert into public.ks_customers(id,company_id,company_name,status) values($1,'test-links','Fixture customer','active')",[customerId]);
  await owner();
  const booked=await call('ledger_reserve',{configuration_id:edited.configuration_id,quantity:1,customer_id:customerId,reason:'Fixture reservation',reference:'QA-RES'});
  assert(booked);
  await assert.rejects(call('edit_batch',{position:edited.id,revision:1,expected_quantity:10,reason:'Reserved stock'}),/Release active reservations/);
  console.log('PASS active reservation blocks correction');
  await db.exec("reset role;insert into ks_pricing_categories(id,product_rules,is_active) values('qa-trimming','{}',true);");
  await owner();
  const saveRule=(family,rule)=>db.query('select public.keysuite_category_rule_v50088($1,$2,$3)',['qa-trimming',family,JSON.stringify(rule)]);
  const initialRule={margin:.1,normal:0,rare:0,trimming:37.5,transport:50,currencies:['MYR'],useCommission:false,useSetDiscount:false,useFinalDiscount:false,useFuelCharge:false};
  await saveRule('ES',initialRule);
  await saveRule('ISO',initialRule);
  const readRules=async()=>(await db.query("select product_rules from ks_pricing_categories where id='qa-trimming'")).rows[0].product_rules;
  const categoryPage=new (require('jsdom').JSDOM)(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),{url:'https://isolated.invalid',runScripts:'outside-only'});
  try{
    const w=categoryPage.window,d=w.document,category={id:'qa-trimming',name:'Trimming test',productRules:await readRules()};
    w.KEYSUITE_ACCESS={role:'owner'};w.KEYSUITE_SECURE_DATA={categories:[category]};w.KeySuitePermissions={level:()=>'full'};
    w.KeySuiteAuth={getClient:()=>({rpc:async(name,p)=>{assert.equal(name,'keysuite_category_rule_v50088');await saveRule(p.p_product_code,p.p_rule);category.productRules=await readRules();return {error:null};}})};
    for(const file of ['product-family-registry-v50047.js','categories.js','v3944-categories.js','pricing.js'])w.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    d.querySelector('#ks3942CompareBtn').click();
    const show=family=>d.querySelector(`[data-ks3942-product="${family}"]`).click();
    const trimming=()=>d.querySelector('[data-f="trimming"]');
    show('CHC_G2');assert.equal(trimming(),null);
    show('ISO');assert.equal(trimming().value,'37.50');
    show('ES');assert.equal(trimming().value,'37.50');
    const labels=[...d.querySelectorAll('#ks3942Compare th')].map(n=>n.textContent);
    assert.deepEqual(labels.slice(7,10),['Rare %','Trimming RM','Transport RM']);
    assert(trimming().readOnly);
    d.querySelector('#ks3944CompareEdit').dispatchEvent(new w.Event('pointerdown',{cancelable:true}));
    await new Promise(r=>setTimeout(r,3100));
    assert(!trimming().readOnly);
    trimming().value='75.25';d.querySelector('#ks3942SaveCompare').click();
    for(let i=0;i<50&&trimming().value!=='75.25';i++)await new Promise(r=>setTimeout(r,20));
    for(let i=0;i<50&&!d.querySelector('#ks3942CompareMessage').textContent.includes('saved');i++)await new Promise(r=>setTimeout(r,20));
    assert.equal((await readRules()).ES.trimming,75.25);
    assert.equal(w.KeySuiteCategories.ruleFor(category,'ES').trimming,75.25);
    for(const pricingMode of ['quotation','assembly']){
      const calculated=w.KeySuitePricing.calculatePrice({MYR:{fixture:100}},'fixture',category,'ES',{customer:{id:'fixture'},pricingMode});
      assert.equal(calculated.trimming,75.25);
      assert.equal(calculated.withTrimming-calculated.afterRare,75.25);
    }
    console.log('PASS Category Compare loads, unlocks and saves trimming to the same rule used by Normal View, Assembly and Individual pricing');
  }finally{categoryPage.window.close();}

  const activeLink=await call('link_option_save',{series_key:family,group_id:arrangement.id,label:'New seal'});
  const activeNormal=await option('normal','Round Housing'),activeCritical=await option('critical','Housing checked');
  const zeroNormal=await option('normal','Square Housing');
  const mapped={[arrangement.id]:activeLink.id};
  await call('series_mapping_save',{series_key:family,variant,selections:mapped});
  await receive(3,65,{...mapped,[normalGroup]:[activeNormal.id],[criticalGroup]:activeCritical.id});
  await receive(2,65,{...mapped,[normalGroup]:[activeNormal.id]});
  const ui=new (require('jsdom').JSDOM)('<main></main><nav><button id="keyAiNavButton"></button></nav>',{url:'https://isolated.invalid',runScripts:'outside-only',pretendToBeVisual:true});
  try{
   const w=ui.window,d=w.document,baseAccess={company_id:tenant,email:'first@example.invalid',role:'owner'};
   w.KEYSUITE_ACCESS=baseAccess;w.structuredClone=structuredClone;
   w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
   w.KeySuitePermissions={level:()=> 'full'};
   w.KeySuiteApp={showPage:page=>w.dispatchEvent(new w.CustomEvent('KEYSUITE_PAGE_CHANGED',{detail:{page}}))};
   w.KeySuiteAuth={getClient:()=>({rpc:async(_name,args)=>({data:await call(args.p_action,args.p_payload)})})};
   w.eval(fs.readFileSync(path.join(__dirname,'../keystock-v100.js'),'utf8'));
   d.dispatchEvent(new w.Event('DOMContentLoaded'));
   await w.KeyStock.refresh();
   const status=()=>d.querySelector('#stockStatus');
   assert.equal(status().value,'');
   status().value='positive';status().dispatchEvent(new w.Event('change'));
   await w.KeyStock.refresh();assert.equal(status().value,'positive');
   w.KEYSUITE_ACCESS={...baseAccess,email:'second@example.invalid'};
   w.dispatchEvent(new w.CustomEvent('KEYSUITE_AUTH_CONTEXT_READY'));
   await w.KeyStock.refresh();assert.equal(status().value,'');
   w.KEYSUITE_ACCESS=baseAccess;
   w.dispatchEvent(new w.CustomEvent('KEYSUITE_AUTH_CONTEXT_READY'));
   await w.KeyStock.refresh();assert.equal(status().value,'positive');
   status().value='';status().dispatchEvent(new w.Event('change'));
   await w.KeyStock.refresh();assert.equal(status().value,'');
   console.log('PASS Stock Check status persists across refresh and sign-in, independently per user, and clears');
   d.querySelector(`[data-stock-detail="${item_key}"]`).click();
   const options=id=>d.querySelector(`[data-detail-option="${id}"]`);
   assert.match(options(activeNormal.id).textContent,/5$/);
   assert.match(options(zeroNormal.id).textContent,/0$/);
   assert.match(options(activeCritical.id).textContent,/3$/);
   options(activeNormal.id).click();
   assert.equal(options(activeNormal.id).getAttribute('aria-pressed'),'true');
   assert.equal(d.querySelector('[aria-label="Configuration stock"] tbody tr').cells[2].textContent,'5');
   assert.equal(d.querySelectorAll('[data-layout="batch-details"] tbody tr').length,2);
   options(activeCritical.id).click();
   assert.equal(d.querySelector('[aria-label="Configuration stock"] tbody tr').cells[2].textContent,'3');
   assert.equal(d.querySelectorAll('[data-layout="batch-details"] tbody tr').length,1);
   assert.equal(d.querySelector('.stock-detail-metrics div strong').textContent,'107');
   d.querySelector('[data-detail-kind="normal"][data-detail-option=""]').click();
   d.querySelector('[data-detail-kind="critical"][data-detail-option=""]').click();
   assert.equal(d.querySelector('[aria-label="Configuration stock"] tbody tr').cells[2].textContent,'107');
   assert.equal((await getCosts()).reduce((sum,row)=>sum+row.available,0),106);
   console.log('PASS Critical and Normal filters, zero counts, matching detail rows and overall quantities');

  }finally{ui.window.close();}


  const {JSDOM}=require('jsdom');
  const dom=new JSDOM('<body></body>',{runScripts:'outside-only',url:'https://isolated.invalid'});
  try{
   const w=dom.window,b=variant,rule={currencies:['STOCK'],margin:0},cat={id:'cat',productRules:{ES:rule}};
   w.KEYSUITE_SECURE_DATA={categories:[cat]};w.KeySuiteV391={state:{brands:[{id:'ok',brand_name:'O.K.Pump'},{id:'bg',brand_name:'B.G.Reich'}]},customerBrandMargin:(_,brand)=>brand==='ok'?0:.1};
   w.KeySuiteAuth={getClient:()=>({rpc:async()=>({data:await getCosts()})})};
   for(const f of ['product-family-registry-v50047.js','stock-source-v50088.js','pricing.js'])
    w.eval(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
   await w.KeySuiteStockCost.refresh();
   const book={USD:{[b]:150/5.5},RMB:{[b]:120/.65},MYR:{[b]:149}};
   const calc=(brand,options={})=>w.KeySuitePricing.calculatePrice(book,b,cat,'ES',{stockProductId:item_key.slice(3),customer:{id:'c'},keysuite_brand_id:brand,...options});
   assert.equal(calc('ok').baseMyr,95);assert.equal(calc('ok').afterBrand,95);assert(calc('bg').afterBrand>95);
   for(const [currencies,value] of [[['STOCK','MYR'],149],[['MYR'],149],[['STOCK'],95]]){
    rule.currencies=currencies;assert.equal(calc('ok').baseMyr,value);
   }
   assert.equal(calc('ok',{stockProductId:'wrong'}),null);
   rule.currencies=['STOCK','MYR'];
   assert.equal(calc('ok',{stockProductId:'wrong'}).baseMyr,149);
   const notice=w.document.querySelector('#stockCostNotice');
   assert.equal(notice.tagName,'DIV');
   w.dispatchEvent(new w.CustomEvent('KEYSUITE_PAGE_CHANGED'));
   assert.equal(notice.hidden,true);
   console.log('PASS mapped inventory shared across selling brands, zero margin, independent source selection and warning lifecycle');
  }finally{dom.window.close()}
  const highCost=(await getCosts()).find(row=>row.cost===95);
  await call('ledger_issue',{configuration_id:highCost.id,quantity:4,reason:'Deplete test batch',reference:'QA-ISSUE'});
  assert.equal(Math.max(...(await getCosts()).map(row=>row.cost)),65);
  console.log('PASS depletion removes the highest-cost eligible batch');
 }finally{await db.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
