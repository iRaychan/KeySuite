const fs=require('fs'),assert=require('node:assert/strict'),{randomUUID}=require('crypto');
const {as,rpc}=require('./v50051-db.cjs');
const {JSDOM}=require('jsdom');
async function main(){
 const {db}=await require('./v50086-db.cjs').fixture();
 const sql=(s,p=[])=>db.query(s,p);
 const state=()=>rpc(db,'state',{config_client:'v104',ledger_client:'v102'});
 const run=(action,args)=>rpc(db,'ledger_'+action,{request_id:randomUUID(),config_client:'v104',ledger_client:'v102',...args});
 const get=async()=>(await sql('select public.keysuite_quotation_costs_v50088() as data')).rows[0].data;
 try{
 await db.exec('reset role;alter table ks_products_kv add column price_kvd_myr numeric,add column price_kvsd_myr numeric;alter table ks_products_es add column if not exists source_row integer,add column if not exists rarity text;create table ks_pricing_categories(id text,product_rules jsonb,is_active boolean,chc_margin numeric,transport numeric);grant select on ks_pricing_categories to authenticated;');
 const file=fs.readdirSync('../supabase/migrations').find(f=>f.includes('v50088'));
 await db.exec(fs.readFileSync('../supabase/migrations/'+file,'utf8'));
 await db.exec(fs.readFileSync('../supabase/migrations/20261125093807_v50089_keystock.sql','utf8'));
 await as(db,'owner','test-links');
 const s=await state(),model=s.catalog.find(r=>r.family==='KV'),key=model.key;
 assert.deepEqual(model.choices.map(c=>c.code),['KV','KVC','KVN','KVD','KVSD']);
 assert(!s.catalog.some(r=>['KVD','KVSD'].includes(r.family)));
 assert(!s.catalog.filter(r=>r.family==='ES').flatMap(r=>r.choices).some(c=>['CIBRSSMS','CIBRSSGP','CICISSDYNAMIC'].includes(c.code.toUpperCase().replace(/[^A-Z0-9]/g,''))));
 assert(s.catalog.some(r=>r.family==='ES'&&r.choices.some(c=>c.code==='SS316')));
 console.log('PASS KV five per-model choices and ES active catalogue');
 const receive=(quantity,cost)=>run('receive',{family:'KV',supplier_id:s.suppliers[0].id,rows:[{item_key:key,selections:{},variant:'KVD',location_id:s.locations[0].id,quantity,unit_cost_myr:cost}]});
 await receive(8,70);await receive(2,90);await receive(3,80);
 const first=(await get()).find(r=>r.item_key===key&&r.variant==='KVD'),issue=quantity=>run('issue',{configuration_id:first.id,quantity,reason:'Fixture issue',reference:randomUUID()});
 const check=async(q,c)=>{const row=(await get()).find(x=>x.id===first.id);assert.equal(row?.available||0,q);assert.equal(row?.cost??null,c);console.log('PASS remaining',q,'cost',c)};
 await check(13,90);
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window;
 try{
 const rule={currencies:['STOCK'],margin:.20},category={id:'cat',productRules:{KV:rule}};
 w.KEYSUITE_SECURE_DATA={categories:[category]};w.KeySuiteV391={state:{brands:[{id:'b',brand_name:first.brand}]},customerBrandMargin:()=>0};
 w.KeySuiteAuth={getClient:()=>({rpc:async()=>({data:await get()})})};
 for(const f of ['product-family-registry-v50047.js','stock-source-v50088.js','pricing.js'])w.eval(fs.readFileSync('../'+f,'utf8'));
 await w.KeySuiteStockCost.refresh();
 const book={USD:{KVD:75/5.8},RMB:{KVD:85/.65},MYR:{KVD:100}};
 const calc=(opts={})=>w.KeySuitePricing.calculatePrice(book,'KVD',category,'KV',{stockProductId:key.slice(3),customer:{id:'c'},v391_brand_id:'b',...opts});
 for(const [sources,base] of [['USD RMB',85],['USD RMB STOCK',90],['USD RMB MYR STOCK',100],['STOCK',90],['MYR STOCK',100],['MYR',100]]){
 rule.currencies=sources.split(' ');assert.equal(Math.round(calc().baseMyr),base);
 }
 rule.currencies=['STOCK'];assert.match(calc({qty:14}).stockWarning,/Insufficient/);
 assert.equal(calc({stockProductId:'wrong'}),null);assert.equal(calc({v391_brand_id:'other'}),null);
 rule.currencies=['STOCK','MYR'];assert.equal(calc({stockProductId:'wrong'}).baseMyr,100);
 await check(13,90);console.log('PASS six source comparisons, warnings, identity isolation and read-only costing');
 }finally{w.close()}
 await issue(8);await check(5,90);await issue(2);await check(3,80);await issue(1);await check(2,80);
 await receive(10,70);await check(12,80);await issue(2);await check(10,70);await issue(10);await check(0,null);
 await receive(1,77);await as(db,'owner','other');assert.deepEqual(await get(),[]);
 await as(db,'owner','test-links',false);assert.deepEqual(await get(),[]);console.log('PASS tenant and cost permissions');
 await require('./v50088-category.cjs')(db);
 await as(db,'owner','test-links');
 const categoryPage=new JSDOM(fs.readFileSync('../index.html','utf8'),{url:'https://isolated.invalid',runScripts:'outside-only'});
 try{
   const page=categoryPage.window,d=page.document;page.CSS={escape:String};page.KEYSUITE_ACCESS={role:'owner'};page.KEYSUITE_SECURE_DATA={categories:[]};page.KeySuitePermissions={level:()=>'full'};
   const client={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'new-stock-rule'}})}),or:()=>({order:async()=>({data:(await sql("select *,id category_name from ks_pricing_categories")).rows})})})}),rpc:async(name,p)=>{
     if(name==='keysuite_manage_pricing_category_v221'){await db.exec("reset role;insert into ks_pricing_categories(id,product_rules,is_active) values('new-stock-rule','{}',true)");await as(db,'owner','test-links');}
     else{assert.equal(name,'keysuite_category_rule_v50088');await sql('select public.keysuite_category_rule_v50088($1,$2,$3)',[p.p_category_id,p.p_product_code,JSON.stringify(p.p_rule)]);}
     return {error:null};
   }};page.KeySuiteAuth={getClient:()=>client};
   for(const file of ['product-family-registry-v50047.js','categories.js'])page.eval(fs.readFileSync('../'+file,'utf8'));
   page.KeySuiteCategories.init(null,page.KEYSUITE_ACCESS);d.getElementById('newPricingCategory').click();d.getElementById('categoryNameInput').value='new-stock-rule';d.getElementById('categoryCurrencySTOCK').checked=true;
   d.getElementById('categoryForm').dispatchEvent(new page.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,180));
   assert.deepEqual((await sql("select product_rules->'CHC_G2'->'currencies' sources from ks_pricing_categories where id='new-stock-rule'")).rows[0].sources,['STOCK']);
   console.log('PASS new category with STOCK only through Normal View, simulated legacy category creation, real isolated rule persistence');
 }finally{categoryPage.window.close()}
 const saved=(await sql("select product_rules->'CHC_G2' rule from ks_pricing_categories where id='D'")).rows[0].rule;
 assert(saved.currencies.includes('STOCK'));
 saved.currencies=saved.currencies.filter(c=>c!=='STOCK');
 await sql("select public.keysuite_category_rule_v50088('D','CHC_G2',$1)",[JSON.stringify(saved)]);
 await as(db,'viewer','test-links'); await as(db,'owner','test-links');
 assert.deepEqual((await sql("select product_rules->'CHC_G2'->'currencies' sources from ks_pricing_categories where id='D'")).rows[0].sources,saved.currencies);
 await assert.rejects(sql("update ks_pricing_categories set is_active=false where id='D'"),/permission denied/);
 await db.exec("reset role;alter table ks_pricing_categories add column company_id text;update ks_pricing_categories set company_id='test-links'");
 await as(db,'owner','other');
 await assert.rejects(sql("select public.keysuite_category_rule_v50088('D','CHC_G2',$1)",[JSON.stringify(saved)]),/no rows/);
 await as(db,'viewer','test-links',true);const denied=await state();assert.equal(denied.can_cost,false);assert.equal(denied.purchase_costs,undefined);
 assert(!denied.ledger.lots.some(l=>l.unit_cost_myr!=null));assert.deepEqual(await get(),[]);
 await assert.rejects(rpc(db,'cancel_batch',{reason:'fixture'}),/permission required/i);
 await assert.rejects(sql("select unit_cost_myr from keystock.lots"),/permission denied/);
 await as(db,'owner','test-links');
 console.log('PASS STOCK off after renewed auth context, owner direct table denial, cross-company save denial, restricted stock costs and cancellation');
 const record=variant=>({item_key:key,variant,selections:{},location_id:s.locations[0].id,quantity:1,unit_cost_myr:60});
 const original=await state();
 await assert.rejects(run('receive',{family:'KV',supplier_id:s.suppliers[0].id,shared_variant:'KVD',rows:[record('KVD'),record('KVN')]}),/Configuration mismatch/);
 assert.deepEqual((await state()).ledger,original.ledger);
 const customer=randomUUID();await db.exec('reset role');await sql("insert into ks_customers(id,company_id,company_name,status) values($1,'test-links','Reservation fixture','active')",[customer]);await as(db,'owner','test-links');
 const pos=original.ledger.positions.find(p=>p.configuration_id===first.id&&Number(p.quantity)>0);
 await assert.rejects(rpc(db,'cancel_batch',{position:pos.id,reason:'  '}),/reason required/);
 const reserved=await run('reserve',{configuration_id:first.id,quantity:1,customer_id:customer,reason:'Reserve for test',reference:'T'});
 await assert.rejects(rpc(db,'cancel_batch',{position:pos.id,reason:'Cancel fixture'}),/active reservations/);
 await run('release',{reservation_id:reserved.reservation_id});await receive(4,80);await issue(2);
 const consumed=(await state()).ledger.positions.find(p=>p.configuration_id===first.id&&Number(p.quantity)===3);
 await assert.rejects(rpc(db,'cancel_batch',{position:consumed.id,reason:'Cancel fixture'}),/controlled stock correction/);
 const otherModel=s.catalog.find(x=>x.key!==key&&x.family==='KV'&&x.choices.some(v=>v.code==='KVD'));
 assert(otherModel);
 await run('receive',{family:'KV',supplier_id:s.suppliers[0].id,shared_variant:'KVD',rows:[record('KVD'),{...record('KVD'),item_key:otherModel.key}]});
 assert((await get()).some(x=>x.item_key===otherModel.key&&x.cost===60));
 await db.exec("reset role;insert into ks_role_permissions values ('test-links','inspector','{\"view_stock\":\"full\",\"view_stock_cost\":\"full\",\"delete_stock_batch\":\"none\"}');");
 await as(db,'inspector','test-links');assert((await get()).length);await assert.rejects(rpc(db,'cancel_batch',{position:consumed.id,reason:'test'}),/permission required/i);
 await db.exec("reset role;update ks_role_permissions set permissions='{\"view_stock\":\"full\",\"view_stock_cost\":\"none\",\"delete_stock_batch\":\"full\"}' where role='inspector';");
 await as(db,'inspector','test-links');assert.deepEqual(await get(),[]);await assert.rejects(rpc(db,'cancel_batch',{position:consumed.id,reason:'test'}),/controlled stock correction/);
 await as(db,'owner','test-links');
 console.log('PASS shared configuration across two distinct models and independently assigned cost/cancel permissions');
 const master=await rpc(db,'delete_supplier',{id:s.suppliers[0].id});
 assert.equal(master.retired,true);assert.equal((await state()).suppliers.find(x=>x.id===s.suppliers[0].id).retired,true);
 await assert.rejects(receive(3,1),/active supplier/);
 console.log('PASS incompatible multi-row rollback, mandatory reason, reserved and consumed batch guards, historical supplier retention');
 const before=await state();await db.exec('reset role');await db.exec(fs.readFileSync('../supabase/rollback_v50089.sql','utf8'));
 await as(db,'owner','test-links');const after=await state();assert.deepEqual(before.ledger,after.ledger);assert.deepEqual(before.configurations,after.configurations);
 console.log('PASS rollback preserves transactions, configurations and valuation data');
 }finally{await db.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
