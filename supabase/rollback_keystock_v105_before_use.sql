-- Staging only. Use with the V5.00.92 application and quiesce stock writers first.
-- This guards against dropping history or hiding incomplete pumps after use.
begin;
lock table keystock.parts_v105,keystock.incomplete_units_v105,keystock.receipt_corrections_v105,
  keystock.missing_components_v105,keystock.stock_events in access exclusive mode;
do $$ begin
  if exists(select 1 from keystock.parts_v105)
    or exists(select 1 from keystock.incomplete_units_v105)
    or exists(select 1 from keystock.receipt_corrections_v105)
    or exists(select 1 from keystock.stock_events where kind in ('cannibalise','restore_parts')) then
    raise exception 'V1.05 stock records exist. Preserve the migration and use a forward repair.';
  end if;
end $$;
drop function keystock.api(text,jsonb);
alter function keystock.api_v104(text,jsonb) rename to api;
grant execute on function keystock.api(text,jsonb) to authenticated;
create or replace function public.keysuite_stock_v100(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select keystock.api(p_action,p_payload) $$;
drop function keystock.state_v105(text,jsonb,boolean),keystock.manual_movement_v105(text,uuid,text,jsonb,date),
  keystock.restore_part_v105(text,uuid,jsonb,date),keystock.cannibalise_v105(text,uuid,jsonb,date),
  keystock.manage_part_v105(text,text,jsonb),keystock.correct_receipt_v105(text,jsonb),keystock.receipt_quantity_v105(text,uuid);
drop table keystock.missing_components_v105,keystock.incomplete_units_v105,keystock.part_groups_v105,
  keystock.parts_v105,keystock.receipt_corrections_v105;
drop index keystock.stock_events_company_id_destination_id_kind_idx,keystock.stock_events_company_id_source_id_kind_idx;
alter table keystock.stock_events drop constraint stock_events_kind_check;
alter table keystock.stock_events add constraint stock_events_kind_check
  check (kind in ('receive','reserve','release','issue','return','write_off','transfer','reconfigure','adjust'));
notify pgrst,'reload schema';
commit;
