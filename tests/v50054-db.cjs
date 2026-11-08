const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID: id} = require('node:crypto');
const {fixture: phase1} = require('./v50052-db.cjs');
const {as,rpc} = require('./v50051-db.cjs');

async function fixture() {
  const f = await phase1();
  const {db,source,selection,housing} = f;
  const a = id(), b = id(), customer = id(), otherCustomer = id();
  await rpc(db,'location',{id:a,label:'A01 / Rack 1'});
  await rpc(db,'location',{id:b,label:'B01 / Rack 2'});
  const previous = (await rpc(db,'state')).opening_balances.find(row => row.quantity===5);
  await rpc(db,'opening',{id:id(),corrects:previous.id,correction_reason:'Fixture verification',
    item_key:source,selections:{...selection,[housing.id]:housing.options[0].id},quantity:5,
    location_id:a,supplier:'Legacy Supplier',unit_cost_myr:100});
  const before = await rpc(db,'state');
  await db.exec(`reset role; create table public.ks_customers(id uuid primary key,company_id text,company_name text,status text);
    grant select on public.ks_customers to authenticated;
    alter table public.ks_customers enable row level security;
    create policy customers on public.ks_customers for select to authenticated
      using(company_id=public.keysuite_current_company_id());`);
  await db.query("insert into public.ks_customers values ($1,'test-a','Fixture Customer','active'),($2,'test-b','Other Customer','active')",
    [customer,otherCustomer]);
  const dir = path.join(__dirname,'../supabase/migrations');
  const migration = fs.readdirSync(dir).find(name => name.endsWith('_keystock_v102_ledger.sql'));
  await db.exec(fs.readFileSync(path.join(dir,migration),'utf8'));
  await as(db);
  return {...f,a,b,before,customer,otherCustomer};
}

async function run() {
  const {db,source,selection,housing,a,b,before,customer,otherCustomer} = await fixture();
  const state = () => rpc(db,'state',{ledger_client:'v102'});
  const date = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
  const command = (action,p) => rpc(db,'ledger_'+action,{request_id:id(),date,...p});
  try {
    let s = await state();
    for (const key of ['opening_balances','mappings','purchase_costs','critical_quantities']) {
      assert.deepEqual(s[key],before[key],key);
    }
    assert.equal(s.ledger.positions.reduce((n,p)=>n+p.quantity,0),15);
    assert.equal(s.ledger.events.length,0);
    await assert.rejects(rpc(db,'state'),/Refresh into KeyStock V1.02/);
    assert.equal(s.ledger.lots.find(l=>l.unit_cost_myr===100).received_on,null);
    await assert.rejects(rpc(db,'opening',{}),/historical/);
    const round = {...selection,[housing.id]:housing.options[0].id};
    const batch = {item_key:source,location_id:a,quantity:3,selections:round,unit_cost_myr:120};
    const receipt = {family:'ES',supplier_id:s.suppliers[0].id,rows:[batch,{...batch,location_id:b,quantity:4}]};
    await assert.rejects(command('receive',{...receipt,rows:[batch,{...batch,quantity:0}]}),/positive/);
    assert.equal((await state()).ledger.events.length,0,'invalid second row rolls back first');
    const request_id = id();
    await command('receive',{...receipt,request_id});
    assert.equal((await command('receive',{...receipt,request_id})).already_saved,true);
    await assert.rejects(command('receive',{...receipt,request_id,reference:'Changed'}),/already used/);
    s = await state();
    const config = s.configurations.find(c=>c.item_key===source&&c.selections[housing.id]===housing.options[0].id).id;
    const opening = s.ledger.positions.find(p=>p.configuration_id===config&&p.quantity===5);
    const reserve = {configuration_id:config,quantity:4,customer_id:customer,reason:'Customer order',reference:'QT-01'};
    await assert.rejects(command('reserve',{...reserve,customer_id:otherCustomer}),/active KeySuite customer/);
    const reservation = (await command('reserve',reserve)).reservation_id;
    s = await state();
    assert.equal(s.ledger.positions.find(p=>p.id===opening.id).reserved,4,'FIFO reserves legacy lot first');
    await assert.rejects(command('write_off',{position_id:opening.id,quantity:5,reason:'Damage'}),/Insufficient/);
    await command('fulfill',{reservation_id:reservation,quantity:2,reference:'DO-1'});
    assert.equal((await state()).ledger.reservations.find(r=>r.id===reservation).fulfilled,2);
    await command('release',{reservation_id:reservation});
    s = await state();
    assert.equal(s.ledger.positions.find(p=>p.id===opening.id).quantity,3);
    assert.equal(s.ledger.positions.find(p=>p.id===opening.id).reserved,0);
    await command('transfer',{position_id:opening.id,location_id:b,quantity:1,reason:'Move bin',reference:'MOVE-1'});
    s = await state();
    const moved = s.ledger.positions.find(p=>p.lot_id===opening.lot_id&&p.location_id===b);
    assert.equal(moved.quantity,1);
    await command('reconfigure',{position_id:moved.id,group_id:housing.id,option_id:housing.options[1].id,
      quantity:1,reason:'Change housing',reference:'RC-1'});
    s = await state();
    const changed = s.ledger.positions.find(p=>p.lot_id===opening.lot_id&&p.location_id===b);
    const changedConfig = s.configurations.find(c=>c.id===changed.configuration_id);
    const originalConfig = s.configurations.find(c=>c.id===config);
    assert.equal(changedConfig.variant,originalConfig.variant);
    assert.deepEqual(changedConfig.selections,{...originalConfig.selections,[housing.id]:housing.options[1].id});
    assert.equal(s.ledger.lots.find(l=>l.id===changed.lot_id).unit_cost_myr,100);
    const issued = s.ledger.events.find(e=>e.kind==='issue');
    await command('return',{movement_id:issued.id,location_id:a,quantity:1,reason:'Return',reference:'RET-1'});
    await assert.rejects(command('return',{movement_id:issued.id,location_id:a,quantity:2,reason:'Return',reference:'RET-2'}),/unreturned/);
    await command('adjust',{position_id:opening.id,quantity:1,reason:'Recount',reference:'ADJ-1'});
    await command('write_off',{position_id:opening.id,quantity:1,reason:'Damage',reference:'WO-1'});

    const serialModel=s.catalog.find(m=>m.family==='ISO');
    await command('serial_policy',{scope:'series',subject:'ISO',required:true});
    const serialReceipt={family:'ISO',supplier_id:s.suppliers[0].id,
      rows:[{item_key:serialModel.key,quantity:2,location_id:a,unit_cost_myr:0}]};
    await assert.rejects(command('receive',serialReceipt),/one serial number per unit/);
    const serials=['SN-123','SN-124'];
    await command('receive',{...serialReceipt,rows:[{...serialReceipt.rows[0],serials}]});
    await assert.rejects(command('receive',{...serialReceipt,rows:[{...serialReceipt.rows[0],serials:['sn-123','Other']}]}),/duplicate key/);
    s = await state();
    const serialConfig=s.configurations.find(c=>c.item_key===serialModel.key).id;
    await assert.rejects(command('issue',{configuration_id:serialConfig,quantity:1,reason:'Issue',reference:'DO-2'}),/serials/);
    await command('issue',{configuration_id:serialConfig,quantity:1,reason:'Issue',reference:'DO-2',serials:['sn-123']});
    s = await state();
    const delivery = s.ledger.events.find(e=>e.kind==='issue'&&e.serials.includes('SN-123'));
    await command('return',{movement_id:delivery.id,location_id:b,quantity:1,reason:'Return',reference:'RET-3',serials:['SN-123']});
    await command('serial_policy',{scope:'product',subject:serialModel.key,required:false});
    await command('receive',{...serialReceipt,rows:[{...serialReceipt.rows[0],quantity:1}]});
    s = await state();
    assert.equal(s.ledger.events.filter(e=>e.serials.includes('SN-123')).length,3);
    assert.equal(s.ledger.positions.reduce((n,p)=>n+p.quantity,0),24);
    assert.deepEqual(s.opening_balances,before.opening_balances);
    assert.deepEqual(s.purchase_costs,before.purchase_costs);
    assert.deepEqual(s.mappings,before.mappings);
    assert(s.ledger.events.every(e=>e.actor&&e.recorded_at&&e.source_id!==e.destination_id));
    await as(db,'user','test-a',false);
    assert((await state()).ledger.lots.every(l=>!Object.hasOwn(l,'unit_cost_myr')));
    await assert.rejects(command('receive',receipt),/permission required/i);
    await assert.rejects(db.query('select * from keystock.positions'),/permission denied/);
    await as(db,'owner','test-b');
    assert.equal((await state()).ledger.positions.length,0);
    await assert.rejects(command('transfer',{position_id:opening.id,location_id:b,quantity:1,reason:'No'}),/unavailable/);
    await db.exec(`reset role;insert into public.ks_role_permissions values
      ('test-a','stock_specialist','{"manage_stock_dropdowns":"full"}'),
      ('test-a','user','{"view_stock":"none"}'),
      ('test-a','admin','{"receive_stock":"none","manage_stock_dropdowns":"none"}');`);
    await as(db,'stock_specialist','test-a',false);
    await rpc(db,'group',{item_key:serialModel.key,id:id(),kind:'normal',label:'Delegated group',options:[]});
    await command('serial_policy',{scope:'series',subject:'ISO',required:true});
    await assert.rejects(command('receive',receipt),/permission required/i);
    await as(db,'admin','test-a',true);
    await assert.rejects(command('receive',receipt),/permission required/i);
    await assert.rejects(rpc(db,'group',{item_key:serialModel.key}),/Manage Dropdowns permission required/i);
    await as(db,'user','test-a',false);
    await assert.rejects(state(),/View Stock permission required/);
    await db.exec('reset role;set role anon');
    await assert.rejects(state(),/permission denied/);
    await db.exec('reset role');
    const check=fs.readFileSync(path.join(__dirname,'../supabase/verification/keystock_v102_reconcile.sql'),'utf8');
    const {rows}=await db.query(check);
    assert.equal(rows.length,6);
    assert(rows.every(row=>Number(row.discrepancy_count)===0),JSON.stringify(rows));
    console.log('PASS: additive seed, inventory and cost preservation, receiving atomicity, retry, FIFO, reservation and partial fulfillment, release, transfer, reconfigure, return, adjustments, serial policy, audit and access controls.');
  } finally {
    await db.close();
  }
}
module.exports={fixture};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
