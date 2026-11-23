begin;
-- Refuse a lossy downgrade. After use, restore a verified full database backup
-- in a maintenance window, including all stock changes since that backup.
do $$ begin
 if exists(select 1 from keystock.groups where series_key is not null and kind='linked')
  or exists(select 1 from keystock.series_mappings)
  or exists(select 1 from keystock.configurations cfg join keystock.catalog_v103() c on c.key=cfg.item_key
    where c.family='ES' and cfg.variant<>'' and not exists(select 1 from jsonb_array_elements(c.choices) v where v->>'code'=cfg.variant)) then
  raise exception 'V1.04 has been used. Restore the verified backup or prepare a reviewed data-preserving downgrade; automatic rollback refused';
 end if;
end $$;
drop function keystock.api(text,jsonb);
drop function keystock.receipt_configuration(text,text,jsonb,text);
drop function keystock.validate_selections(text,text,jsonb,boolean);
drop function keystock.resolve_series_link(text,text,jsonb);
drop function keystock.catalog();
alter function keystock.api_v103(text,jsonb) rename to api;
alter function keystock.receipt_configuration_v103(text,text,jsonb,text) rename to receipt_configuration;
alter function keystock.validate_selections_v103(text,text,jsonb,boolean) rename to validate_selections;
alter function keystock.catalog_v103() rename to catalog;
drop table keystock.series_mappings;
drop index keystock.groups_linked_name;
drop index keystock.groups_series_kind;
create unique index groups_series_kind on keystock.groups(company_id,series_key,kind) where series_key is not null;
alter table keystock.groups drop constraint groups_scope;
alter table keystock.groups add constraint groups_scope check (
 (item_key is not null and series_key is null) or
 (item_key is null and series_key is not null and kind in ('critical','normal')));
alter table keystock.groups drop column revision;
revoke all on all functions in schema keystock from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
