// Tests the approval-required proposal ONLY in an in-memory PostgreSQL engine.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;
 create table ks_user_access(email text,company_id text,role text,active boolean);
 create table ks_role_permissions(company_id text,role text,permissions jsonb);
 create table ks_quotation_archive_v409(company_id text,quotation_no text,logical_id text,quote_data jsonb,updated_at timestamptz);
 create table ks_quotations(id text,company_id text,quotation_no text,quote_data jsonb,updated_at timestamptz);
 create function keysuite_current_email() returns text language sql stable set search_path=public as $$select current_setting('test.email',true)$$;
 create function keysuite_current_company_id() returns text language sql stable set search_path=public as $$select coalesce((select company_id from ks_user_access where email=keysuite_current_email() and active),'')$$;
 create function keysuite_permission_level(p_key text,p_role text default null) returns text language sql stable set search_path=public as $$select coalesce((select permissions->>p_key from ks_role_permissions where company_id=keysuite_current_company_id() and role=coalesce(p_role,(select role from ks_user_access where email=keysuite_current_email() and active))),'none')$$;
 insert into ks_user_access values ('one@example.invalid','company','admin',true),('two@example.invalid','company','user',true),('outside@example.invalid','outside','admin',true),('disabled@example.invalid','company','admin',false);
 insert into ks_role_permissions values ('company','admin','{"view_quotations":"full"}'),('company','user','{"view_quotations":"own"}'),('outside','admin','{"view_quotations":"full"}');
 insert into ks_quotations values ('one','company','QA-2611-0001','{"id":"one","createdByEmail":"one@example.invalid"}',now()),('two','company','QA-2611-0002','{"id":"two","createdByEmail":"two@example.invalid"}',now()),('outside','outside','QA-2611-0003','{"id":"outside","createdByEmail":"outside@example.invalid"}',now());
 insert into ks_quotation_archive_v409 values ('company','QA-2611-0001','one','{"id":"one","createdByEmail":"one@example.invalid"}',now()-interval '1 day');`);
 await db.exec(fs.readFileSync(path.join(__dirname,'../../proposals/V5.00.82_QUOTATION_VIEW_APPROVAL_REQUIRED.sql'),'utf8'));
 const actor=async email=>db.query("select set_config('test.email',$1,false)",[email]);
 const list=async company=>(await db.query('select * from keysuite_list_quotations_v42919($1)',[company])).rows;
 await actor('one@example.invalid');assert.equal((await list('company')).length,2);
 await db.exec(`update ks_role_permissions set permissions='{"view_quotations":"own"}' where role='admin' and company_id='company'`);assert.equal((await list('company')).length,1);
 for(const level of ['none','unknown']){await db.query("update ks_role_permissions set permissions=jsonb_build_object('view_quotations',$1::text) where role='admin' and company_id='company'",[level]);assert.equal((await list('company')).length,0)}
 await actor('two@example.invalid');const own=await list('company');assert.equal(own.length,1);assert.equal(Object.values(own[0])[0].id,'two');
 await assert.rejects(list('outside'),/another KeySuite company/);
 await actor('disabled@example.invalid');await assert.rejects(list('company'),/could not be determined/);
 await actor('outside@example.invalid');assert.equal((await list('outside')).length,1);await assert.rejects(list('company'),/another KeySuite company/);
 const grants=await db.query("select has_function_privilege('anon','keysuite_list_quotations_v42919(text)','execute') as anon_allowed, has_function_privilege('authenticated','keysuite_list_quotations_v42919(text)','execute') as authenticated_allowed");
 assert.equal(grants.rows[0].anon_allowed,false);assert.equal(grants.rows[0].authenticated_allowed,true);
 const output={result:'PASS',scope:'In-memory PostgreSQL only; actual production helper interfaces simulated',cases:['Full two creators','Own creator only','None/unknown denied','archive/current duplicate resolution','cross-company denied','inactive account denied','anon execute denied'],liveApplied:false};
 fs.writeFileSync(path.join(__dirname,'DATABASE_RESULTS.json'),JSON.stringify(output,null,2));console.log('PASS proposed history RPC: two users, Full/Own/None, deduplication, inactive/cross-company denial and grants; no production writes');
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
