const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs'),assert=require('assert');
(async()=>{const db=new PGlite();const sql=fs.readFileSync(process.argv[2],'utf8');let checks=0;
await db.exec(`create role anon; create role authenticated;create publication supabase_realtime; create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
create table public.ks_user_access(company_id text,email text,active boolean);
insert into auth.users values ('00000000-0000-0000-0000-000000000001','a@local.test'),('00000000-0000-0000-0000-000000000002','b@local.test'),('00000000-0000-0000-0000-000000000003','c@local.test'),('00000000-0000-0000-0000-000000000004','d@local.test');
insert into ks_user_access values ('one','a@local.test',true),('one','b@local.test',true),('two','c@local.test',true),('one','d@local.test',false);`);
await db.exec(`create table ks_keyhq_people_v42922(company_id text,user_email text,desk_no integer,avatar_hair_style text,avatar_clothing text);insert into ks_keyhq_people_v42922 values ('one','b@local.test',4,'curly','smart-casual');`);await db.exec(sql);await db.exec(sql);assert.equal((await db.query("select appearance->>'hair' hair from ks_keyhq_avatar_profiles_v42925 where user_id='00000000-0000-0000-0000-000000000002'")).rows[0].hair,'curly');checks++;
const p={gender:'female',face:'soft',body:'average',hair:'bob',hairColor:'#211a18',skin:'#e3ad82',outfit:'business',shoes:'black',accessory:'none'};
async function as(n){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-${String(n).padStart(12,'0')}',false)`)}
async function denied(query,args=[]){let failed=false;try{await db.query(query,args)}catch(e){failed=true}assert(failed,query);checks++}
async function save(company,obj=p){return db.query('select * from keysuite_save_my_avatar_v42925($1,$2::jsonb)',[company,JSON.stringify(obj)])}
await as(1);assert.equal((await save('one')).rows[0].revision,1);checks++;
assert.equal((await save('one',{...p,hair:'long'})).rows[0].revision,2);checks++;
assert.equal((await db.query("select * from keysuite_keyhq_avatar_directory_v42925('one')")).rows.length,2);checks++;
assert.equal((await db.query("select * from keysuite_keyhq_avatar_directory_v42925('two')")).rows.length,0);checks++;
await denied('select * from keysuite_save_my_avatar_v42925($1,$2::jsonb)',['two',JSON.stringify(p)]);
await denied('select * from keysuite_save_my_avatar_v42925($1,$2::jsonb)',['one',JSON.stringify({...p,role:'owner'})]);
await denied('select * from keysuite_save_my_avatar_v42925($1,$2::jsonb)',['one',JSON.stringify({...p,face:null})]);
await denied("update ks_keyhq_avatar_profiles_v42925 set user_id='00000000-0000-0000-0000-000000000002'");
await denied('delete from ks_keyhq_avatar_profiles_v42925');
await as(2);assert.equal((await db.query("update ks_keyhq_avatar_profiles_v42925 set appearance=$1::jsonb where user_id='00000000-0000-0000-0000-000000000001' returning *",[JSON.stringify(p)])).rows.length,0);checks++;
await denied('insert into ks_keyhq_avatar_profiles_v42925(company_id,user_id,appearance) values ($1,$2,$3::jsonb)',['one','00000000-0000-0000-0000-000000000001',JSON.stringify(p)]);
await save('one');checks++;
await as(3);assert.equal((await db.query('select * from ks_keyhq_avatar_profiles_v42925')).rows.length,0);checks++;
await as(4);await denied('select * from keysuite_save_my_avatar_v42925($1,$2::jsonb)',['one',JSON.stringify(p)]);
await db.exec('reset role;set role anon');await denied('select * from ks_keyhq_avatar_profiles_v42925');await denied("select * from keysuite_keyhq_avatar_directory_v42925('one')");
await db.exec('reset role');assert.equal((await db.query('select count(*) n from auth.users')).rows[0].n,4);checks++;
await db.exec(sql);assert.equal((await db.query("select appearance->>'hair' hair from ks_keyhq_avatar_profiles_v42925 where user_id='00000000-0000-0000-0000-000000000001'")).rows[0].hair,'long');assert.equal((await db.query('select desk_no from ks_keyhq_people_v42922')).rows[0].desk_no,4);checks+=2;assert.equal((await db.query("select count(*) n from pg_publication_tables where pubname='supabase_realtime' and tablename='ks_keyhq_avatar_profiles_v42925'")).rows[0].n,1);checks++;console.log(JSON.stringify({passed:checks,engine:'PGlite PostgreSQL',productionAccess:false}));await db.close();})().catch(e=>{console.error(e);process.exit(1)});
