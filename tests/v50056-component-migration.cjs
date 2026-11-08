const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

async function run() {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
      create table public.ks_user_access(email text, active boolean, role text);`);
    await db.exec(fs.readFileSync(path.join(__dirname,'../proposals/pricing_v50011.sql'),'utf8'));
    const sql=fs.readFileSync(process.argv[2],'utf8');
    const table='public.ks_component_prices_v50011';
    const queryRows=async()=> (await db.query(`select * from ${table} order by family,kind,size_group,material`)).rows;
    await db.exec(`insert into ${table} values
      ('ES','seal','24','Car/Cer',0),('ES','seal','45','SiC/SiC',550),('ES','oring','55','EPDM',200),
      ('ISO','oring','32','EPDM',100),('ISO','seal','45','SiC/SiC',700),('CR','oring','320','EPDM',150);`);
    const before=await queryRows();
    const policies=async()=> (await db.query("select * from pg_policies where tablename='ks_component_prices_v50011' order by policyname")).rows;
    const beforePolicies=await policies();
    await db.exec(sql);
    const after=await queryRows();
    for(const old of before)assert(after.some(row=>JSON.stringify(row)===JSON.stringify(old)));
    assert.deepEqual(await policies(),beforePolicies);
    assert.equal(after.filter(row=>['Tungsten','NBR'].includes(row.material)&&row.price_myr===null).length,22);
    assert(after.filter(row=>row.size_group==='42').every(row=>row.price_myr===null));
    assert(after.filter(row=>row.size_group==='48').every(row=>row.price_myr===null));
    await db.exec(sql);
    assert.deepEqual(await queryRows(),after);
    await db.exec(`update ${table} set price_myr=0 where (family,kind,size_group,material)=('ISO','oring','42','NBR');
      update ${table} set price_myr=245 where (family,kind,size_group,material)=('ES','seal','48','Tungsten');`);
    assert((await queryRows()).some(row=>row.material==='NBR'&&Number(row.price_myr)===0&&row.price_myr!==null));
    assert((await queryRows()).some(row=>row.material==='Tungsten'&&Number(row.price_myr)===245));
    await assert.rejects(db.exec(`insert into ${table} values('ES','oring','75','NBR',0)`),/check constraint/);
    await assert.rejects(db.exec(`insert into ${table} values('ISO','seal','45','Tungsten',0)`),/check constraint/);
    console.log('PASS exact legacy values, policy preservation, new blank rows, explicit zero, rerun safety and rejection of invalid combinations.');
  } finally {
    await db.close();
  }
}

run().catch(error=>{console.error(error);process.exitCode=1;});
