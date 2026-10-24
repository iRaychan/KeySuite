-- Read-only checks after an approved migration. Run as the reviewing database owner.
select to_regclass('public.ks_keyhq_avatar_profiles_v42925') as profile_table;
select relrowsecurity from pg_class where oid=to_regclass('public.ks_keyhq_avatar_profiles_v42925');
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename='ks_keyhq_avatar_profiles_v42925';
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in ('keysuite_save_my_avatar_v42925','keysuite_keyhq_avatar_directory_v42925');
select grantee,column_name,privilege_type from information_schema.column_privileges where table_schema='public' and table_name='ks_keyhq_avatar_profiles_v42925' order by grantee,column_name,privilege_type;
select * from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ks_keyhq_avatar_profiles_v42925';
-- Expected: RLS true; self-only insert/update, company read; save SECURITY INVOKER;
-- authenticated INSERT(company_id,user_id,appearance), UPDATE(appearance), SELECT;
-- no authenticated DELETE, no anonymous grants; one publication row when enabled.
