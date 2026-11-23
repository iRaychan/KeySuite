const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {as,rpc}=require('./v50051-db.cjs');
(async()=>{
 const {db}=await require('./v50086-db.cjs').fixture();
 const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261123091710_keystock_v104_pricelist_links.sql'),'utf8');
 const rollback=fs.readFileSync(path.join(__dirname,'../supabase/rollback_keystock_v104_before_use.sql'),'utf8');
 try{
  await db.exec('reset role');await db.exec(rollback);await as(db,'owner','test-links');
  assert.equal((await rpc(db,'state',{config_client:'v103',ledger_client:'v102'})).config_version,'v103');
  await db.exec('reset role');await db.exec(migration);await as(db,'owner','test-links');
  await rpc(db,'arrangement_save',{config_client:'v104',series_key:'ES',label:'Used setup'});
  await db.exec('reset role');await assert.rejects(db.exec(rollback),/automatic rollback refused/);await db.exec('rollback');
  assert.equal((await db.query("select count(*)::int n from keystock.groups where label='Used setup'")).rows[0].n,1);
  console.log('PASS rollback before use, reapply after rollback, and refusal after setup without data loss');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
