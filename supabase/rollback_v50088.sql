-- Restore the V5.00.87 application and its matching webhook together with this rollback.
-- Keep all saved rules, prices and historic data. Resolve any STOCK-only rules
-- before resuming quoting with a client that only understands three sources.
begin;
drop function public.keysuite_category_rule_v50088(text,text,jsonb,text);
drop function public.keysuite_quotation_costs_v50088();
drop function keystock.quotation_costs_v50088();
drop view public.keysuite_active_es_v50088;
drop function keystock.receipt_configuration(text,text,jsonb,text);
alter function keystock.receipt_configuration_v50087(text,text,jsonb,text) rename to receipt_configuration;
drop function keystock.catalog();
alter function keystock.catalog_v50087() rename to catalog;
notify pgrst,'reload schema';
commit;
