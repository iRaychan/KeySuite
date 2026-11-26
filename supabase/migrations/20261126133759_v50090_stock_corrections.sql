begin;

alter table keystock.positions add column edit_revision integer not null default 0;

create table keystock.batch_correction_costs (
  audit_id bigint primary key references keystock.audit(id),
  previous_cost_myr numeric,
  corrected_cost_myr numeric
);
alter table keystock.batch_correction_costs enable row level security;
revoke all on keystock.batch_correction_costs from public,anon,authenticated;

create table keystock.historical_issue_configuration (
  company_id text not null,
  issue_id uuid not null,
  configuration_id uuid not null,
  primary key(company_id,issue_id),
  foreign key(company_id,issue_id) references keystock.stock_events(company_id,id),
  foreign key(company_id,configuration_id) references keystock.configurations(company_id,id)
);
alter table keystock.historical_issue_configuration enable row level security;
revoke all on keystock.historical_issue_configuration from public,anon,authenticated;

create or replace function keystock.ledger_permissions(c text, r text) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_object_agg(k,coalesce(
    (select permissions->>k='full' from public.ks_role_permissions where company_id::text=c and role=r),
    k='view_stock' or r='owner' or (r='admin' and k not in ('view_stock_cost','delete_stock_batch','edit_stock_batch'))))
  from unnest(array['view_stock','receive_stock','manage_stock_dropdowns','reserve_stock',
    'confirm_stock_out','adjust_stock','move_stock','view_stock_cost','delete_stock_batch','edit_stock_batch']) k
$$;

-- A recorded Critical selection is a configuration attribute. Opening shortage
-- records continue to represent historical missing quantities independently.
create or replace function keystock.validate_selections(c text,k text,s jsonb,linked_only boolean default false) returns void
language plpgsql set search_path='' as $$
declare pair record; g keystock.groups%rowtype; legacy jsonb:=s;
begin
 if jsonb_typeof(s) is distinct from 'object' then raise exception 'Invalid selections'; end if;
 for pair in select * from jsonb_each(s) loop
  select * into g from keystock.effective_groups(c,k) where id::text=pair.key and not retired;
  if g.series_key is not null and (g.kind='linked' or (g.kind='critical' and not linked_only)) then
   if jsonb_typeof(pair.value)<>'string' or not exists(select 1 from keystock.options o where o.company_id=c
    and o.group_id=g.id and not o.retired and o.id::text=pair.value#>>'{}') then raise exception 'Invalid or retired configuration option'; end if;
   legacy:=legacy-pair.key;
  end if;
 end loop;
 for g in select * from keystock.effective_groups(c,k) where series_key is not null and kind='linked' and not retired loop
  if not s ? g.id::text then raise exception 'Select %',g.label; end if;
 end loop;
 perform keystock.validate_selections_v103(c,k,legacy,linked_only);
end $$;

create or replace function keystock.return_stock(c text, req uuid, p jsonb, d date) returns void
language plpgsql volatile set search_path='' as $$
declare e keystock.stock_events%rowtype; pos keystock.positions%rowtype;
  q numeric:=keystock.require_quantity(p->>'quantity'); target uuid; destination uuid;
  names text[]:=keystock.serial_list(p->'serials'); matched text[]; returned numeric;
begin
  select * into e from keystock.stock_events where company_id=c and id=(p->>'movement_id')::uuid and kind='issue';
  if not found then raise exception 'Select an original stock-out record'; end if;
  if d<e.effective_on then raise exception 'Return date cannot precede delivery'; end if;
  select coalesce(sum(quantity),0) into returned from keystock.stock_events where company_id=c and return_of=e.id;
  if q>e.quantity-returned then raise exception 'Quantity exceeds the unreturned delivery'; end if;
  select * into strict pos from keystock.positions where company_id=c and id=e.source_id;
  destination:=keystock.active_location(c,(p->>'location_id')::uuid);
  if nullif(trim(p->>'reason'),'') is null or nullif(trim(p->>'reference'),'') is null then
    raise exception 'Return reason and reference required';
  end if;
  select coalesce(array_agg(u.serial order by u.serial_key),'{}') into matched from keystock.serial_units u
    where u.company_id=c and u.issued_by_event=e.id and u.serial_key in (select lower(n) from unnest(names) n);
  if cardinality(names)<>cardinality(matched) or (cardinality(e.serials)>0 and cardinality(matched)<>q) then
    raise exception 'Return serials must match the original delivery and still be outstanding';
  end if;
  target:=keystock.position_add(c,pos.lot_id,coalesce((select configuration_id from keystock.historical_issue_configuration
    where company_id=c and issue_id=e.id),pos.configuration_id),destination,q);
  perform keystock.ledger_event(c,req,'return',d,null,target,q,matched,e.reservation_id,e.id,e.customer,
    trim(p->>'reason'),trim(p->>'reference'),coalesce(p->>'remark',''));
  update keystock.serial_units set position_id=target,issued_by_event=null where company_id=c and issued_by_event=e.id and serial=any(matched);
end $$;

create function keystock.correction_selection_snapshot(tenant text, selections jsonb) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_object_agg(g.id::text,jsonb_build_object('group',g.label,'options',opts.labels)),'{}')
 from jsonb_each(selections) selection
 join keystock.groups g on g.company_id=tenant and g.id::text=selection.key
 cross join lateral (
   select coalesce(jsonb_agg(o.label order by o.sort_order,o.id),'[]') labels from keystock.options o
   where o.company_id=tenant and o.group_id=g.id and
     (selection.value ? o.id::text or selection.value#>>'{}'=o.id::text)
 ) opts
$$;
revoke all on function keystock.correction_selection_snapshot(text,jsonb) from public,anon,authenticated;

alter function keystock.api(text,jsonb) rename to api_v50089;
revoke all on function keystock.api_v50089(text,jsonb) from public,anon,authenticated;

create function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 tenant text; permissions jsonb; reason text; old_pos keystock.positions%rowtype;
 old_lot keystock.lots%rowtype; old_config keystock.configurations%rowtype;
 selected_option keystock.options%rowtype; option_group keystock.groups%rowtype;
 new_location uuid; new_config uuid; new_cost numeric; new_remark text;
 before_values jsonb; after_values jsonb; linked_config boolean; correction_id bigint;
begin
 if p_action not in ('edit_batch','series_option_delete','link_option_delete') then
   return keystock.api_v50089(p_action,p);
 end if;
 if auth.uid() is null or public.keysuite_has_access() is not true then raise exception 'Access denied' using errcode='42501'; end if;
 tenant:=public.keysuite_current_company_id();
 if nullif(tenant,'') is null then raise exception 'Company required'; end if;
 permissions:=keystock.ledger_permissions(tenant,lower(public.keysuite_current_role()));
 if permissions->>'view_stock' is distinct from 'true' then raise exception 'View Stock permission required' using errcode='42501'; end if;
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>4000000 or p->>'config_client' is distinct from 'v104' then
   raise exception 'Invalid stock request. Refresh KeyStock.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('keystock:'||tenant,0));

 if p_action in ('series_option_delete','link_option_delete') then
   if permissions->>'manage_stock_dropdowns' is distinct from 'true' then raise exception 'Manage Dropdowns permission required' using errcode='42501'; end if;
   select * into selected_option from keystock.options where company_id=tenant and id=(p->>'id')::uuid and not retired;
   if not found then raise exception 'Option is unavailable. Refresh KeyStock.'; end if;
   select * into option_group from keystock.groups where company_id=tenant and id=selected_option.group_id
      and series_key=p->>'series_key' and not retired;
   if not found or (p_action='link_option_delete' and (option_group.kind<>'linked' or option_group.id is distinct from (p->>'group_id')::uuid))
      or (p_action='series_option_delete' and (option_group.kind not in ('normal','critical') or option_group.kind is distinct from p->>'kind')) then
     raise exception 'Option does not belong to this series and grouping';
   end if;
   if selected_option.revision is distinct from (p->>'revision')::integer then raise exception 'Option changed. Refresh KeyStock.'; end if;
   update keystock.options set retired=true,revision=revision+1 where company_id=tenant and id=selected_option.id;
   update keystock.series_mappings set retired=true,revision=revision+1 where company_id=tenant and not retired
      and selections->>option_group.id::text=selected_option.id::text;
   insert into keystock.audit(company_id,actor,action,detail) values(tenant,auth.uid(),p_action,
     jsonb_build_object('id',selected_option.id,'label',selected_option.label,'archived',true));
   return jsonb_build_object('id',selected_option.id,'retired',true);
 end if;

 if permissions->>'edit_stock_batch' is distinct from 'true' then raise exception 'Edit Stock Batch permission required' using errcode='42501'; end if;
 reason:=nullif(btrim(p->>'reason'),'');
 if reason is null then raise exception 'Correction reason required'; end if;
 if p ? 'unit_cost_myr' and permissions->>'view_stock_cost' is distinct from 'true' then
   raise exception 'View Stock Cost permission required' using errcode='42501';
 end if;
 select * into old_pos from keystock.positions where company_id=tenant and id=(p->>'position')::uuid and quantity>0 for update;
 if not found then raise exception 'Batch is unavailable. Refresh KeyStock.'; end if;
 if old_pos.edit_revision is distinct from (p->>'revision')::integer or old_pos.quantity is distinct from (p->>'expected_quantity')::numeric then
   raise exception 'Batch changed. Refresh before editing.';
 end if;
 if exists(select 1 from keystock.allocations where company_id=tenant and position_id=old_pos.id and remaining>0) then
   raise exception 'Release active reservations before correcting this batch';
 end if;
 select * into strict old_lot from keystock.lots where (company_id,id)=(tenant,old_pos.lot_id) for update;
 select * into strict old_config from keystock.configurations where (company_id,id)=(tenant,old_pos.configuration_id);
 new_location:=case when p?'location_id' then nullif(p->>'location_id','')::uuid else old_pos.location_id end;
 if new_location is distinct from old_pos.location_id and new_location is not null and not exists
   (select 1 from keystock.locations where company_id=tenant and id=new_location and not retired) then raise exception 'Select an active location'; end if;
 new_cost:=case when p?'unit_cost_myr' then (p->>'unit_cost_myr')::numeric else old_lot.unit_cost_myr end;
 new_remark:=coalesce(p->>'remark',old_lot.remarks);
 if (new_cost is distinct from old_lot.unit_cost_myr or new_remark is distinct from old_lot.remarks) and exists
   (select 1 from keystock.positions where company_id=tenant and lot_id=old_pos.lot_id and id<>old_pos.id and quantity>0) then
   raise exception 'This receiving lot has other active positions. Its shared cost and remark require a lot-level correction.';
 end if;
 new_config:=old_pos.configuration_id;
 if p?'selections' or p?'variant' then
   select exists(select 1 from keystock.effective_groups(tenant,old_config.item_key) where kind='linked' and not retired) into linked_config;
   new_config:=keystock.receipt_configuration(tenant,old_config.item_key,coalesce(p->'selections',old_config.selections),
     case when linked_config then '' else coalesce(p->>'variant',old_config.variant) end);
   if linked_config and exists(select 1 from keystock.configurations where company_id=tenant and id=new_config and variant='') then
     raise exception 'Select a mapped Pricelist configuration';
   end if;
 end if;
 if exists(select 1 from keystock.positions where company_id=tenant and lot_id=old_pos.lot_id and id<>old_pos.id
   and configuration_id=new_config and location_id is not distinct from new_location) then
   raise exception 'This lot already has a position at the selected configuration and location. Use the stock movement workflow.';
 end if;
 before_values:=to_jsonb(old_pos)||jsonb_build_object('variant',old_config.variant,'selections',old_config.selections,
   'remark',old_lot.remarks,'fifo_at',old_lot.fifo_at,
   'configuration_labels',keystock.correction_selection_snapshot(tenant,old_config.selections),
   'location_label',(select label from keystock.locations where company_id=tenant and id=old_pos.location_id));
 if new_config is distinct from old_pos.configuration_id then
   insert into keystock.historical_issue_configuration(company_id,issue_id,configuration_id)
   select tenant,e.id,old_pos.configuration_id from keystock.stock_events e
    where e.company_id=tenant and e.source_id=old_pos.id and e.kind='issue'
   on conflict do nothing;
 end if;
 update keystock.positions set configuration_id=new_config,location_id=new_location,edit_revision=edit_revision+1
   where company_id=tenant and id=old_pos.id returning to_jsonb(positions) into after_values;
 update keystock.lots set unit_cost_myr=new_cost,remarks=new_remark where company_id=tenant and id=old_lot.id;
 select after_values||jsonb_build_object('variant',cfg.variant,'selections',cfg.selections,
   'remark',new_remark,'fifo_at',old_lot.fifo_at,
   'configuration_labels',keystock.correction_selection_snapshot(tenant,cfg.selections),
   'location_label',(select label from keystock.locations where company_id=tenant and id=new_location))
   into after_values from keystock.configurations cfg where (cfg.company_id,cfg.id)=(tenant,new_config);
 insert into keystock.audit(company_id,actor,action,detail) values(tenant,auth.uid(),'edit_batch',
   jsonb_build_object('position',old_pos.id,'reason',reason,'before',before_values,'after',after_values))
   returning id into correction_id;
 insert into keystock.batch_correction_costs values(correction_id,old_lot.unit_cost_myr,new_cost);
 return jsonb_build_object('id',old_pos.id,'revision',old_pos.edit_revision+1);
end $$;

revoke all on function keystock.api(text,jsonb) from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
create or replace function public.keysuite_stock_v100(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select keystock.api(p_action,p_payload) $$;
notify pgrst,'reload schema';
commit;
