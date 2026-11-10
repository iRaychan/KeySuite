const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID:id}=require('node:crypto');
const {as,rpc}=require('./v50051-db.cjs');
const migration=path.join(__dirname,'../supabase/migrations/20261109231350_keystock_v103_series_options.sql');
async function fixture(){
  const f=await require('./v50054-db.cjs').fixture();
  await f.db.exec('reset role');
  await f.db.exec(fs.readFileSync(migration,'utf8'));
  await as(f.db);
  return f;
}
async function run(){
 const {db}=await fixture();
 const call=(action,p={})=>rpc(db,action,{config_client:'v103',ledger_client:'v102',...p});
 const state=()=>call('state');
 const save=(series_key,kind,label,extra={})=>call('series_option_save',{series_key,kind,label,...extra});
 try{
  const before=await state();
  const legacyCounts=Object.fromEntries(['items','configurations','mappings','opening_balances','critical_quantities','purchase_costs'].map(k=>[k,before[k].length]));
  const a=await save('ES','critical','Pump Casing');
  await save('ES','critical','Shaft');
  const n=await save('ES','normal','Mechanical Seal');
  const n2=await save('ES','normal','Round Housing');
  await save('ISO','critical','Pump Casing');
  await save('CHC_G1','critical','C4 Casing');
  await save('CHC_G2','critical','C6 Casing');
  await assert.rejects(save('ES','critical','  pump   casing '),/already exists/);
  await assert.rejects(save('FAKE','normal','Invalid'),/Unknown/);
  await assert.rejects(save('ES','linked','Invalid'),/Critical or Normal/);
  await save('ES','critical','Pump Body',{id:a.id,revision:1});
  await assert.rejects(save('ES','critical','Conflict',{id:a.id,revision:1}),/changed/);
  await assert.rejects(save('ISO','critical','Wrong series',{id:a.id,revision:2}),/does not belong/);
  let s=await state();
  assert.equal(s.options.find(o=>o.id===a.id).label,'Pump Body');
  assert.equal(s.groups.filter(g=>g.series_key==='ES').length,2);
  for(const [k,v] of Object.entries(legacyCounts))assert.equal(s[k].length,v,`${k} unchanged by series setup`);
  assert.deepEqual(s.catalog,before.catalog);
  assert.deepEqual(s.ledger,before.ledger);
  await db.exec('reset role');
  for(const family of ['ES','ISO','CHC_G1','CHC_G2']){
   const models=s.catalog.filter(m=>m.family===family);
   for(const model of [models[0],models.at(-1)]){
    const groups=(await db.query('select * from keystock.effective_groups($1,$2)',['test-a',model.key])).rows;
    assert(groups.some(g=>g.series_key===family));
    assert(groups.every(g=>!g.series_key||g.series_key===family));
   }
  }
  await db.exec("insert into public.ks_products_chc_g1(id,model) values('v103-future','Future C4')");
  assert.equal((await db.query("select count(*)::int n from keystock.effective_groups('test-a','CHC_G1:v103-future') where series_key='CHC_G1'")).rows[0].n,1);
  await as(db);
  await assert.rejects(rpc(db,'state',{ledger_client:'v102'}),/V1.03/);
  const model=s.catalog.filter(m=>m.family==='ES').at(-1);
  const ng=s.groups.find(g=>g.series_key==='ES'&&g.kind==='normal');
  const selections={[ng.id]:[n2.id,n.id]};
  const receive=(sels)=>call('ledger_receive',{request_id:id(),family:'ES',supplier_id:s.suppliers[0].id,rows:[{item_key:model.key,location_id:s.locations[0].id,quantity:1,selections:sels}]});
  await receive(selections);
  await receive({[ng.id]:[n.id,n2.id,n.id]});
  s=await state();
  assert.equal(s.configurations.filter(c=>c.item_key===model.key).length,1,'array order/dedup canonical');
  await assert.rejects(receive({[ng.id]:[a.id]}),/mismatched/);
  await assert.rejects(call('series_option_delete',{series_key:'ES',kind:'normal',id:n.id,revision:1}),/used by stock/);
  const position=s.ledger.positions.find(p=>s.configurations.find(c=>c.id===p.configuration_id)?.item_key===model.key);
  await call('ledger_reconfigure',{request_id:id(),position_id:position.id,group_id:ng.id,option_id:n.id,quantity:1,reason:'Toggle feature'});
  s=await state();
  assert(s.configurations.some(c=>c.item_key===model.key&&JSON.stringify(c.selections[ng.id])===JSON.stringify([n2.id])));
  await call('series_option_delete',{series_key:'ES',kind:'critical',id:a.id,revision:2});
  assert((await state()).options.find(o=>o.id===a.id).retired);
  await as(db,'user','test-a',false);
  await assert.rejects(save('ES','critical','Forbidden'),/permission required/);
  await db.exec(`reset role;insert into public.ks_role_permissions values('test-a','user','{"manage_stock_dropdowns":"full","view_stock":"full"}')`);
  await as(db,'user','test-a',false);
  await save('ES','normal','Delegated option');
  await assert.rejects(db.query('select * from keystock.options'),/permission denied/);
  await as(db,'owner','test-b');
  assert.equal((await state()).groups.length,0);
  await assert.rejects(save('ES','normal','Cross tenant',{id:n.id,revision:1}),/unavailable/);
  await db.exec("reset role;set test.uid='';set role authenticated");
  await assert.rejects(state(),/Access denied/);
  await db.exec('reset role;set role anon');
  await assert.rejects(state(),/permission denied/);
  await db.exec('reset role');
  const access=(await db.query("select proname,has_function_privilege('authenticated',p.oid,'EXECUTE') allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='keystock'")).rows;
  assert(access.every(f=>f.allowed===(f.proname==='api')));
  console.log(JSON.stringify({passed:true,baselineModels:before.catalog.length,checks:['shared ES/ISO/C4/C6 inheritance','future models','stable rename IDs','duplicate normalization','stale edits','safe deletion','independent Normal selections','receiving canonicalization','reconfigure toggle','legacy inventory preserved','tenant isolation','delegated and denied permissions','anonymous denial','private helper privileges']},null,2));
 }finally{await db.close();}
}
module.exports={fixture};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
