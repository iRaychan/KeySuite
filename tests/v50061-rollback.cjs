const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {as,rpc}=require('./v50051-db.cjs');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261109231350_keystock_v103_series_options.sql'),'utf8');
const rollback=fs.readFileSync(path.join(__dirname,'../supabase/rollback_keystock_v103_before_use.sql'),'utf8');
// State lists have no ordering contract; compare their complete contents.
const canonical=value=>Array.isArray(value)?value.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,canonical(item)])):value;
(async()=>{
 const {db}=await require('./v50054-db.cjs').fixture();
 try{
  const before=await rpc(db,'state',{ledger_client:'v102'});
  await db.exec('reset role');await db.exec(migration);await db.exec(rollback);await as(db);
  assert.deepEqual(canonical(await rpc(db,'state',{ledger_client:'v102'})),canonical(before));
  await db.exec('reset role');await db.exec(migration);await as(db);
  await rpc(db,'series_option_save',{config_client:'v103',series_key:'ES',kind:'critical',label:'Keep this'});
  await db.exec('reset role');await assert.rejects(db.exec(rollback),/Rollback stopped/);
  await db.exec('rollback');await as(db);
  assert((await rpc(db,'state',{ledger_client:'v102',config_client:'v103'})).options.some(o=>o.label==='Keep this'));
  console.log('PASS: pre-use rollback restores original state; rollback after use refuses without losing data.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
