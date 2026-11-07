-- Read-only verification after applying 20261107000300_v50047_product_family_registry.sql.
select pg_get_functiondef('public.keysuite_save_oem_series_mapping_v41503(jsonb)'::regprocedure) as function_definition;
select master_family,count(*) as mapping_count
from public.ks_oem_brand_family_map
group by master_family order by master_family;
select product_group,count(*) as series_count
from public.ks_oem_brand_series
group by product_group order by product_group;
