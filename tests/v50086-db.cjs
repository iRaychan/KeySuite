const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID:id}=require('node:crypto');
const {as,rpc}=require('./v50051-db.cjs');
const migration=path.join(__dirname,'../supabase/migrations/20261123091710_keystock_v104_pricelist_links.sql');
async function fixture(){
 const f=await require('./v50061-db.cjs').fixture();
 await f.db.exec('reset role');await f.db.exec(fs.readFileSync(migration,'utf8'));
 await as(f.db,'owner','test-links');
 await rpc(f.db,'location',{label:'A01'});await rpc(f.db,'supplier',{label:'Test Supplier'});
 return f;
}
async function run(){
 const {db}=await fixture();
 const call=(action,p={})=>rpc(db,action,{config_client:'v104',ledger_client:'v102',...p});
 const state=()=>call('state');
 const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s)};
 try{
  let s=await state();const baseline=s;
  assert.equal(s.config_version,'v104');assert.equal(s.groups.length,0);assert.equal(s.series_mappings.length,0);
  await db.exec('reset role');await db.exec(fs.readFileSync(migration,'utf8'));await as(db,'owner','test-links');
  assert.deepEqual(await state(),s);pass('repeatable migration; no seed or inventory changes');
  const codes=[...new Set(s.catalog.filter(m=>m.family==='ES').flatMap(m=>m.choices.map(v=>v.code)))];assert(codes.includes('CI / BR / SS / MS')&&codes.includes('Duplex 2205'));
  pass('ES full material list read from existing Pricelist');
  const save=(series_key,kind,label,extra={})=>call('series_option_save',{series_key,kind,label,...extra});
  const critical=await save('ES','critical','Pump Casing'),normal=await save('ES','normal','Mechanical Seal');
  await save('ISO','critical','Pump Casing');await save('CHC_G1','critical','C4');await save('CHC_G2','critical','C6');
  await assert.rejects(save('ES','critical','  pump   casing '),/already exists/);
  await save('ES','critical','Casing',{id:critical.id,revision:1});await assert.rejects(save('ES','critical','Stale',{id:critical.id,revision:1}),/changed/);
  s=await state();
  await db.exec('reset role');
  for(const family of ['ES','ISO','CHC_G1','CHC_G2'])for(const model of s.catalog.filter(m=>m.family===family)){
   const gs=(await db.query('select * from keystock.effective_groups($1,$2)',['test-links',model.key])).rows;
   assert(gs.length&&gs.every(g=>g.series_key===family));
  }
  await as(db,'owner','test-links');pass('all models inherit once; ES/ISO and CHC C4/C6 independent; option rename and duplicates');
  const arrangement=async(series_key,label)=>call('arrangement_save',{series_key,label});
  const a=await arrangement('ES','Material'),b=await arrangement('ES','Seal');
  await assert.rejects(arrangement('ES',' material '),/Duplicate/);
  await arrangement('ISO','Material');
  const opt=(group_id,label)=>call('link_option_save',{series_key:'ES',group_id,label});
  const a1=await opt(a.id,'Bronze'),a2=await opt(a.id,'Stainless'),b1=await opt(b.id,'Mechanical');
  await assert.rejects(opt(a.id,' bronze '),/Duplicate/);
  await call('link_option_save',{series_key:'ES',group_id:a.id,id:a1.id,revision:1,label:'Bronze impeller'});
  await call('arrangement_save',{series_key:'ES',id:a.id,revision:1,label:'Impeller',sort_order:1});
  const selections={[a.id]:a1.id,[b.id]:b1.id},variant='CI / BR / SS / MS';
  const map=extra=>call('series_mapping_save',{series_key:'ES',selections,variant,...extra});
  await assert.rejects(map({selections:{[a.id]:a1.id}}),/every arrangement/);
  await assert.rejects(map({selections:{...selections,[b.id]:a1.id}}),/Invalid mapping option/);
  await assert.rejects(map({variant:'INVENTED'}),/not found/);
  const m=await map({});await assert.rejects(map({}),/Duplicate or ambiguous/);await assert.rejects(map({variant:'SS316'}),/Duplicate or ambiguous/);
  await map({id:m.id,revision:1});await assert.rejects(map({id:m.id,revision:1}),/changed/);
  s=await state();assert.equal(s.series_mappings[0].revision,2);assert.deepEqual(s.series_mappings[0].selections,selections);
  assert.equal(s.groups.filter(g=>g.series_key==='ES'&&g.kind==='linked').length,2);
  pass('arrangement and mapping CRUD, exact codes, invalid combinations, duplicate/ambiguity prevention, stale edits, persisted refresh');
  const model=s.catalog.find(m=>m.family==='ES'),ng=s.groups.find(g=>g.series_key==='ES'&&g.kind==='normal');
  const receive=(sels=selections,key=model.key,extra={})=>call('ledger_receive',{request_id:id(),family:'ES',supplier_id:s.suppliers[0].id,rows:[{item_key:key,location_id:s.locations[0].id,quantity:1,selections:sels,...extra}]});
  await assert.rejects(receive({[a.id]:a1.id}),/Select/);
  await assert.rejects(receive({...selections,[a.id]:a2.id}),/Missing mapping/);
  await assert.rejects(receive(selections,model.key,{variant:'SS316'}),/conflicts/);
  await receive({...selections,[ng.id]:[normal.id]});
  s=await state();assert.equal(s.configurations[0].variant,variant);assert.deepEqual(s.configurations[0].selections[ng.id],[normal.id]);
  await assert.rejects(call('link_option_delete',{series_key:'ES',group_id:a.id,id:a1.id,revision:2}),/referenced/);
  await assert.rejects(call('arrangement_delete',{series_key:'ES',id:a.id,revision:2}),/referenced/);
  await assert.rejects(call('series_option_delete',{series_key:'ES',kind:'normal',id:normal.id,revision:1}),/used by stock/);
  const model2=s.catalog.filter(m=>m.family==='ES')[1];
  await db.exec('reset role');await db.query("update public.ks_products_es set variants=variants - 0 where id=$1",[model2.key.slice(3)]);
  // Remove the exact mapped material only in the isolated fixture.
  await db.query("update public.ks_products_es set variants=(select jsonb_agg(v) from jsonb_array_elements(variants) v where v->>'material'<>$1) where id=$2",[variant,model2.key.slice(3)]);
  await as(db,'owner','test-links');await assert.rejects(receive(selections,model2.key),/not applicable/);
  pass('Stock Input exact resolution, Normal multi-select compatibility, missing/conflicting/inapplicable rejection, reference protection');
  await call('series_mapping_delete',{series_key:'ES',id:m.id,revision:2});
  await assert.rejects(receive(),/Missing mapping/);assert.equal((await state()).configurations[0].variant,variant);
  const unused=await opt(a.id,'Unused');await call('link_option_delete',{series_key:'ES',group_id:a.id,id:unused.id,revision:1});
  const unusedGroup=await arrangement('ES','Temporary');await call('arrangement_delete',{series_key:'ES',id:unusedGroup.id,revision:1});
  await call('series_option_delete',{series_key:'ES',kind:'critical',id:critical.id,revision:2});pass('safe deletion and immutable recorded stock identity');
  await as(db,'user','test-links',false);
  for(const action of ['arrangement_save','arrangement_delete','link_option_save','link_option_delete','series_mapping_save','series_mapping_delete','series_option_save'])await assert.rejects(call(action,{series_key:'ES',kind:'normal',label:'Denied'}),/permission required/);
  await assert.rejects(db.query('select * from keystock.series_mappings'),/permission denied/);
  await db.exec(`reset role;insert into public.ks_role_permissions values('test-links','user','{"manage_stock_dropdowns":"full","view_stock":"full"}')`);
  await as(db,'user','test-links',false);await arrangement('ISO','Delegated');
  await as(db,'owner','other-tenant');await assert.rejects(call('series_mapping_delete',{series_key:'ES',id:m.id,revision:3}),/unavailable/);assert.equal((await state()).series_mappings.length,0);
  await db.exec("reset role;set test.uid='';set role authenticated");await assert.rejects(state(),/Access denied/);
  await db.exec('reset role;set role anon');await assert.rejects(state(),/permission denied/);
  await db.exec('reset role');const privileges=(await db.query("select proname,has_function_privilege('authenticated',p.oid,'EXECUTE') allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='keystock'")).rows;
  assert(privileges.every(f=>f.allowed===(f.proname==='api')));pass('all mutations enforce permissions; delegated access, anonymous denial and tenant isolation');
  const report={status:'PASS',models:baseline.catalog.length,es_codes:codes,checks,production_changes:false};
  fs.writeFileSync(path.join(__dirname,'v50086-db-results.json'),JSON.stringify(report,null,2)+'\n');
 }finally{await db.close();}
}
module.exports={fixture};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
