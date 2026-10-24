-- Verify KeySuite V4.21.01 CHC G1 V1.1 model reconciliation.
select count(*) as g1_price_model_count from public.ks_products_chc_g1;
select model,source_row,source_workbook,chc_myr,chcs_myr,chcn_myr from public.ks_products_chc_g1 where model like 'CHC 200-%' order by source_row,model;
select model,source_row from public.ks_products_chc_g1 where model ilike '%60hz%' or model='CHC 5-6' order by source_row,model;
