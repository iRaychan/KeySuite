'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {as,rpc}=require('./v50051-db.cjs');

async function fixture(){
  const {db}=await require('./v50086-db.cjs').fixture();
  await db.exec('reset role;alter table ks_products_kv add column price_kvd_myr numeric,add column price_kvsd_myr numeric;alter table ks_products_es add column if not exists source_row integer,add column if not exists rarity text;create table ks_pricing_categories(id text,product_rules jsonb,is_active boolean,chc_margin numeric,transport numeric);grant select on ks_pricing_categories to authenticated;');
  const dir=path.join(__dirname,'../supabase/migrations');
  const apply=version=>db.exec(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.includes('_v'+version+'_'))),'utf8'));
  for(const version of ['50088','50089','50090'])await apply(version);
  await as(db,'owner','test-links');
  const baseline=await rpc(db,'state',{config_client:'v104',ledger_client:'v102'});
  await db.exec('reset role');
  await apply('50093');
  await as(db,'owner','test-links');
  assert.deepEqual(await rpc(db,'state',{config_client:'v104',ledger_client:'v102'}),baseline);
  return db;
}

async function run(){
  const db=await fixture();
  try{
    const tenant='test-links';
    const owner=()=>as(db,'owner',tenant);
    const call=(action,p={})=>rpc(db,action,{config_client:'v104',ledger_client:'v102',stock_client:'v105',request_id:randomUUID(),...p});
    const state=()=>call('state');
    let s=await state();
    assert.equal(s.config_version,'v105');
    const source=s.locations[0].id,supplier=s.suppliers[0].id;
    await call('location',{label:'Warehouse'});
    const destination=(await state()).locations.find(l=>l.label==='Warehouse').id;
    const pump=s.catalog.find(i=>i.family==='ES'&&i.model==='ES 32-13')||s.catalog.find(i=>i.family==='ES');
    const cr=s.catalog.find(i=>i.family==='CR');
    const receive=(product,quantity,cost,date,selections={},serials=[])=>call('ledger_receive',{
      family:product.family,supplier_id:supplier,date,rows:[{item_key:product.key,location_id:source,
        quantity,unit_cost_myr:cost,variant:product.choices[0]?.code||'',selections,serials}]
    });
    const findBatch=(data,cost)=>data.ledger.positions.find(p=>data.ledger.lots.find(l=>l.id===p.lot_id)?.unit_cost_myr===cost);
    const correction=(pos,quantity,extra={})=>({position:pos.id,expected_quantity:pos.quantity,revision:pos.edit_revision,
      corrected_quantity:quantity,reason:'Receiving count was entered incorrectly',...extra});
    await receive(pump,10,55,'2026-01-02');
    s=await state();
    let batch=findBatch(s,55);
    const original=s.ledger.events.find(e=>e.destination_id===batch.id);
    const originalLot=s.ledger.lots.find(l=>l.id===batch.lot_id);
    const first=correction(batch,3,{request_id:randomUUID()});
    await call('edit_batch',first);
    assert((await call('edit_batch',first)).already_saved);
    s=await state();batch=findBatch(s,55);
    assert.equal(batch.quantity,3);
    assert.equal(s.quantity_corrections[0].previous_stock_value,550);
    assert.equal(s.quantity_corrections[0].corrected_stock_value,165);
    assert.deepEqual(s.ledger.events.find(e=>e.id===original.id),original);
    assert.deepEqual(s.ledger.lots.find(l=>l.id===batch.lot_id),originalLot);
    await call('edit_batch',correction(batch,12));
    batch=findBatch(await state(),55);
    const move={position_id:batch.id,source_configuration:batch.configuration_id,source_location:source,
      batch_method:'manual',date:'2026-01-10',reason:'QA movement',reference:'QA-ISSUE'};
    await call('ledger_issue',{...move,quantity:4});
    batch=findBatch(await state(),55);
    await assert.rejects(call('edit_batch',correction(batch,3)),/transaction history/);
    await call('edit_batch',correction(batch,6));
    batch=findBatch(await state(),55);
    assert.equal(batch.quantity,2);
    assert.equal(batch.effective_quantity,6);
    await as(db,'admin',tenant);
    await assert.rejects(call('edit_batch',correction(batch,8)),/permission/);
    assert(!(await state()).quantity_corrections.some(r=>Object.hasOwn(r,'corrected_stock_value')));
    await owner();
    console.log('PASS 10 → 3, upward correction, partial issue reconciliation, replay, original receipt and FIFO, valuation and role.');

    await receive(pump,5,60,'2026-01-03');
    await receive(pump,8,65,'2026-01-04');
    const transfer={...move,location_id:destination,batch_method:'fifo',quantity:6,request_id:randomUUID()};
    await call('ledger_transfer',transfer);
    assert((await call('ledger_transfer',transfer)).already_saved);
    s=await state();
    const moves=s.ledger.events.filter(e=>e.request_id===transfer.request_id);
    assert.deepEqual(moves.map(e=>Number(e.quantity)).sort(),[2,4]);
    for(const e of moves){
      const dest=s.ledger.positions.find(p=>p.id===e.destination_id);
      const fromLot=s.ledger.lots.find(l=>l.id===dest.lot_id);
      assert([55,60].includes(fromLot.unit_cost_myr));
      assert.equal(dest.configuration_id,batch.configuration_id);
      if(fromLot.unit_cost_myr===55){
        assert.equal(dest.lot_id,batch.lot_id);
        assert.equal(fromLot.received_on,originalLot.received_on);
        assert.equal(fromLot.fifo_at,originalLot.fifo_at);
      }
    }
    const newest=s.ledger.positions.find(p=>p.location_id===source&&s.ledger.lots.find(l=>l.id===p.lot_id).unit_cost_myr===65);
    await call('ledger_transfer',{...transfer,request_id:randomUUID(),batch_method:'manual',position_id:newest.id,quantity:2});
    await assert.rejects(call('ledger_transfer',{...transfer,request_id:randomUUID(),batch_method:'manual',position_id:newest.id,quantity:10}),/Insufficient/);
    s=await state();
    assert.equal(s.ledger.positions.reduce((n,p)=>n+Number(p.quantity),0),15);
    const remainder=s.ledger.positions.find(p=>p.id===newest.id);
    assert.equal(remainder.quantity,6);
    await assert.rejects(call('edit_batch',correction(remainder,9)),/dependent movements/);
    console.log('PASS FIFO spans two batches, manual uses only the selected batch, quantity conserved, transfer-dependent correction rejected.');

    const group=async (series,kind,label)=>{
      const o=await call('series_option_save',{series_key:series,kind,label});
      return (await state()).options.find(x=>x.id===o.id);
    };
    const critical=await group(pump.family,'critical','Casing Material A');
    const normal=await group(pump.family,'normal','Square Housing');
    const arrangement=await call('arrangement_save',{series_key:pump.family,label:'Impeller material'});
    const material=await call('link_option_save',{series_key:pump.family,group_id:arrangement.id,label:'Bronze'});
    await call('series_mapping_save',{series_key:pump.family,variant:pump.choices[0].code,selections:{[arrangement.id]:material.id}});
    const part=async (series,label,group_ids)=>(await call('part_save',{series_key:series,label,units_per_pump:1,group_ids})).id;
    const casing=await part(pump.family,'Casing',[normal.group_id,critical.group_id]);
    const impeller=await part(pump.family,'Impeller',[arrangement.id]);
    await assert.rejects(part(pump.family,'  impeller  ',[arrangement.id]),/already exists/);
    const crGroup=await group(cr.family,'critical','Rotor');
    const rotor=await part(cr.family,'Rotor',[crGroup.group_id]);
    await assert.rejects(part(cr.family,'Cross-series',[normal.group_id]),/same series/);
    await receive(pump,2,99,'2026-01-05',{[normal.group_id]:[normal.id],[critical.group_id]:critical.id,[arrangement.id]:material.id});
    s=await state();
    const stock=findBatch(s,99);
    const remove=(part_id,extra={})=>call('ledger_cannibalise',{position_id:stock.id,part_id,part_revision:1,
      quantity:1,part_quantity:1,purpose:'spare',reason:'Parts supply',date:'2026-01-10',...extra});
    const req=randomUUID();
    await remove(impeller,{request_id:req});
    assert((await remove(impeller,{request_id:req})).already_saved);
    s=await state();
    const unit=s.incomplete_units.find(u=>u.position_id===stock.id);
    assert.equal(findBatch(s,99).incomplete,1);
    assert(!s.missing_components.some(m=>m.part_id===casing));
    assert.deepEqual(s.missing_components[0].specifications,{[arrangement.id]:material.id});
    await remove(casing,{unit_id:unit.id});
    await assert.rejects(remove(casing,{unit_id:unit.id}),/already missing/);
    await assert.rejects(call('edit_batch',correction(findBatch(await state(),99),3)),/incomplete stock/);
    s=await state();
    assert.equal(findBatch(s,99).incomplete,1);
    const missing=s.missing_components.find(p=>p.part_id===casing);
    assert.deepEqual(missing.specifications,{[critical.group_id]:critical.id,[normal.group_id]:[normal.id]});
    await remove(impeller);
    s=await state();
    assert.equal(findBatch(s,99).incomplete,2);
    assert.equal(findBatch(s,99).quantity,0);
    const costs=async()=>(await db.query('select public.keysuite_quotation_costs_v50088() data')).rows[0].data;
    assert(!(await costs()).some(c=>c.cost===99));
    const restore=(m,extra={})=>call('ledger_restore_parts',{missing_id:m.id,part_id:m.part_id,specifications:m.specifications,
      quantity:m.quantity,replacement_reference:'EX-42',reason:'Parts fitted',date:'2026-01-11',...extra});
    await assert.rejects(restore(missing,{quantity:2}),/must match/);
    await assert.rejects(restore(missing,{spare_source:s.missing_components.find(p=>p.part_id===impeller).id}),/same model, part and specifications/);
    const firstImpeller=s.missing_components.find(p=>p.part_id===impeller&&p.unit_id===unit.id);
    const secondImpeller=s.missing_components.find(p=>p.part_id===impeller&&p.unit_id!==unit.id);
    await restore(firstImpeller,{spare_source:secondImpeller.id});
    s=await state();assert.equal(findBatch(s,99).incomplete,2);
    assert.equal(s.missing_components.find(p=>p.id===secondImpeller.id).spare_available,0);
    await restore(missing);
    s=await state();assert.equal(findBatch(s,99).incomplete,1);assert.equal(findBatch(s,99).quantity,1);
    assert((await costs()).some(c=>c.cost===99&&c.available===1));
    await assert.rejects(restore(missing),/no longer missing/);
    await restore(secondImpeller);
    await call('part_retire',{id:impeller,series_key:pump.family,revision:1});
    await assert.rejects(remove(impeller),/active part/);
    s=await state();assert.equal(findBatch(s,99).incomplete,0);assert.equal(findBatch(s,99).quantity,2);
    assert(s.missing_components.every(m=>m.restored_event));
    assert.equal(s.ledger.lots.find(l=>l.id===stock.lot_id).unit_cost_myr,99);
    await receive(cr,2,77,'2026-01-05',{[crGroup.group_id]:crGroup.id});
    const crBatch=findBatch(await state(),77);
    await remove(rotor,{position_id:crBatch.id});
    assert.equal(findBatch(await state(),77).incomplete,1);
    const customer=randomUUID();
    await db.exec('reset role');
    await db.query("insert into public.ks_customers(id,company_id,company_name,status) values($1,$2,'Fixture customer','active')",[customer,tenant]);
    await owner();
    await call('ledger_reserve',{position_id:crBatch.id,configuration_id:crBatch.configuration_id,quantity:1,
      customer_id:customer,reason:'Customer order',reference:'QA-RES',date:'2026-01-10'});
    await assert.rejects(remove(rotor,{position_id:crBatch.id}),/unreserved/);
    await assert.rejects(call('edit_batch',correction(findBatch(await state(),77),3)),/active reservations/);
    await call('ledger_serial_policy',{scope:'product',subject:cr.key,required:true});
    await receive(cr,1,95,'2026-01-09',{},['CR-93-001']);
    const serialBatch=findBatch(await state(),95);
    await assert.rejects(call('edit_batch',correction(serialBatch,2)),/Serial-tracked/);
    await assert.rejects(remove(rotor,{position_id:serialBatch.id,serials:['wrong serial']}),/exact serials/);
    await remove(rotor,{position_id:serialBatch.id,serials:['CR-93-001']});
    s=await state();
    const serialUnit=s.incomplete_units.find(u=>u.position_id===serialBatch.id);
    assert.equal(serialUnit.serial,'CR-93-001');
    await restore(s.missing_components.find(m=>m.unit_id===serialUnit.id));
    assert.deepEqual(findBatch(await state(),95).serials,['CR-93-001']);
    await as(db,'owner','different-tenant');
    await assert.rejects(remove(rotor,{position_id:crBatch.id}),/source batch/);
    console.log('PASS ES and CR, linked and group specifications, units with multiple missing components, spare consumption, restoration, archived history, preserved cost and STOCK eligibility.');
    await db.exec('reset role');
    const supabase=path.join(__dirname,'../supabase');
    const reconcile=fs.readFileSync(path.join(supabase,'verification/keystock_v105_reconcile.sql'),'utf8');
    const checks=(await db.query(reconcile)).rows;
    assert(checks.length>=7&&checks.every(r=>Number(r.discrepancy_count)===0),JSON.stringify(checks));
    const rollback=fs.readFileSync(path.join(supabase,'rollback_keystock_v105_before_use.sql'),'utf8');
    await assert.rejects(db.exec(rollback),/stock records exist/);
    await db.exec('rollback');
    console.log('PASS reservation protection, serial identity through hold and restore, SQL reconciliation, and guarded rollback after use.');
    const clean=await fixture();
    try{
      await clean.exec('reset role');
      await clean.exec(rollback);
      await as(clean,'owner','test-links');
      assert.equal((await rpc(clean,'state',{config_client:'v104',ledger_client:'v102'})).config_version,'v104');
    }finally{await clean.close();}
    console.log('PASS rollback before use restores the previous API.');
  }finally{await db.close();}
}

module.exports={fixture};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
