-- Manual rollback only, before any series definitions have been saved.
-- This refuses to discard data. After use, retain V1.03 and correct forward,
-- or design an explicit data conversion from a verified backup.
begin;
lock table keystock.groups,keystock.options in access exclusive mode;
do $$ begin
  if exists(select 1 from keystock.groups where series_key is not null) then
    raise exception 'Rollback stopped: series data exists. Export and plan a reviewed conversion first.';
  end if;
end $$;
drop function keystock.api(text,jsonb);
alter function keystock.api_v102(text,jsonb) rename to api;
drop function keystock.reconfigured(text,uuid,uuid,uuid);
alter function keystock.reconfigured_v102(text,uuid,uuid,uuid) rename to reconfigured;
drop function keystock.receipt_configuration(text,text,jsonb,text);
alter function keystock.receipt_configuration_v102(text,text,jsonb,text) rename to receipt_configuration;
drop function keystock.validate_selections(text,text,jsonb,boolean);
alter function keystock.validate_selections_v102(text,text,jsonb,boolean) rename to validate_selections;
drop function keystock.effective_groups(text,text);
drop index keystock.groups_series_kind;
alter table keystock.groups drop constraint groups_scope;
alter table keystock.groups drop column series_key;
alter table keystock.groups alter column item_key set not null;
alter table keystock.options drop column revision;
grant execute on function keystock.api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
