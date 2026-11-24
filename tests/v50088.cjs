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
 await db.exec('reset role;alter table ks_products_kv add column price_kvd_myr numeric,add column price_kvsd_myr numeric;alter table ks_products_es add column if not exists source_row integer,add column if not exists rarity text;create table ks_pricing_categories(id text,product_rules jsonb,is_active boolean,chc_margin numeric,transport numeric);grant select,update on ks_pricing_categories to authenticated;');
 const file=fs.readdirSync('../supabase/migrations').find(f=>f.includes('v50088'));
 await db.exec(fs.readFileSync('../supabase/migrations/'+file,'utf8'));
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
 const before=await state();await db.exec('reset role');await db.exec(fs.readFileSync('../supabase/rollback_v50088.sql','utf8'));
 await as(db,'owner','test-links');const after=await state();assert.deepEqual(before.ledger,after.ledger);assert.deepEqual(before.configurations,after.configurations);
 console.log('PASS rollback preserves transactions, configurations and valuation data');
 }finally{await db.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
