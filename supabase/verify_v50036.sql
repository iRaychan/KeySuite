-- Read-only checks after applying the two V5.00.36 migrations.
select count(*) as valid_bsw_variants from public.ks_bsw_variant_availability_v50036; -- 378
select count(*) as phantom_variants from public.ks_bsw_variant_availability_v50036 where model='BSW 50F40-2' and variant in ('M','MA'); -- 0
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('ks_customer_remarks_v50036','ks_bsw_variant_prices_v50036','ks_bsw_variant_availability_v50036'); -- all true
select has_table_privilege('anon','public.ks_customer_remarks_v50036','SELECT') as anonymous_remarks_access,has_table_privilege('authenticated','public.ks_customer_remarks_v50036','UPDATE') as remarks_update,has_table_privilege('authenticated','public.ks_customer_remarks_v50036','DELETE') as remarks_delete; -- all false
select policyname,qual,with_check from pg_policies where schemaname='public' and tablename in ('ks_customer_remarks_v50036','ks_bsw_variant_prices_v50036');
-- Authenticated acceptance: assigned user sees/adds remarks only for customers
-- visible through ks_customers RLS. Unassigned/cross-company customer ids must
-- return no remarks and reject INSERT. Owner BSW edits succeed, non-owner edits
-- fail; inserting (BSW 50F40-2,M) fails FK validation. Do this in staging.
