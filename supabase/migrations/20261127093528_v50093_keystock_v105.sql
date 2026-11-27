begin;

-- Incomplete units remain attached to their original position and lot. The
-- position balance is the complete-stock pool used by the existing ledger.
create table keystock.parts_v105 (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  series_key text not null,
  label text not null,
  units_per_pump integer not null check (units_per_pump between 1 and 10000),
  revision integer not null default 1,
  retired boolean not null default false,
  primary key (company_id,id)
);
create unique index on keystock.parts_v105(company_id,series_key,lower(label));

create table keystock.part_groups_v105 (
  company_id text not null,
  part_id uuid not null,
  group_id uuid not null,
  primary key (company_id,part_id,group_id),
  foreign key (company_id,part_id) references keystock.parts_v105,
  foreign key (company_id,group_id) references keystock.groups(company_id,id)
);
create index on keystock.part_groups_v105(company_id,group_id);

create table keystock.incomplete_units_v105 (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  position_id uuid not null,
  configuration_id uuid not null,
  location_id uuid,
  serial_key text,
  closed_at timestamptz,
  primary key (company_id,id),
  foreign key (company_id,position_id) references keystock.positions,
  foreign key (company_id,configuration_id) references keystock.configurations,
  foreign key (company_id,location_id) references keystock.locations,
  foreign key (company_id,serial_key) references keystock.serial_units
);
create index on keystock.incomplete_units_v105(company_id,position_id) where closed_at is null;
create unique index on keystock.incomplete_units_v105(company_id,serial_key) where closed_at is null and serial_key is not null;

create table keystock.missing_components_v105 (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  unit_id uuid not null,
  part_id uuid not null,
  part_label text not null,
  specifications jsonb not null,
  specification_labels jsonb not null,
  quantity integer not null check (quantity>0),
  purpose text not null check (purpose in ('customer','repair','spare')),
  removed_event uuid not null,
  restored_event uuid,
  spare_source uuid,
  primary key (company_id,id),
  foreign key (company_id,unit_id) references keystock.incomplete_units_v105,
  foreign key (company_id,part_id) references keystock.parts_v105,
  foreign key (company_id,removed_event) references keystock.stock_events,
  foreign key (company_id,restored_event) references keystock.stock_events,
  foreign key (company_id,spare_source) references keystock.missing_components_v105,
  check (spare_source is null or restored_event is not null)
);
create unique index on keystock.missing_components_v105(company_id,unit_id,part_id) where restored_event is null;
create index on keystock.missing_components_v105(company_id,unit_id);
create index on keystock.missing_components_v105(company_id,spare_source) where spare_source is not null;

create table keystock.receipt_corrections_v105 (
  audit_id bigint primary key references keystock.audit(id),
  company_id text not null,
  position_id uuid not null,
  lot_id uuid not null,
  original_quantity numeric not null,
  previous_quantity numeric not null,
  corrected_quantity numeric not null,
  previous_stock_value numeric,
  corrected_stock_value numeric,
  foreign key (company_id,position_id) references keystock.positions,
  foreign key (company_id,lot_id) references keystock.lots
);
create index on keystock.receipt_corrections_v105(company_id,position_id,audit_id desc);
create index on keystock.stock_events(company_id,destination_id,kind);
create index on keystock.stock_events(company_id,source_id,kind);

do $$ declare t text; begin
  foreach t in array array['parts_v105','part_groups_v105','incomplete_units_v105','missing_components_v105','receipt_corrections_v105'] loop
    execute format('alter table keystock.%I enable row level security',t);
    execute format('revoke all on keystock.%I from public, anon, authenticated',t);
  end loop;
end $$;

alter table keystock.stock_events drop constraint stock_events_kind_check;
alter table keystock.stock_events add constraint stock_events_kind_check
  check (kind in ('receive','reserve','release','issue','return','write_off','transfer','reconfigure','adjust','cannibalise','restore_parts'));

create function keystock.receipt_quantity_v105(c text, pos uuid) returns numeric
language sql stable set search_path='' as $$
  select coalesce(
    (select corrected_quantity from keystock.receipt_corrections_v105
      where company_id=c and position_id=pos order by audit_id desc limit 1),
    (select quantity from keystock.stock_events
      where company_id=c and destination_id=pos and kind='receive' limit 1))
$$;

create function keystock.correct_receipt_v105(c text, p jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare
  pos keystock.positions%rowtype; lot keystock.lots%rowtype;
  original numeric; previous numeric; corrected numeric; issued numeric; remaining numeric;
  answer jsonb; audit_key bigint; new_cost numeric;
begin
  select * into pos from keystock.positions where company_id=c and id=(p->>'position')::uuid for update;
  if not found then raise exception 'Batch is unavailable. Refresh KeyStock.'; end if;
  if pos.edit_revision is distinct from (p->>'revision')::integer
    or pos.quantity is distinct from (p->>'expected_quantity')::numeric then
    raise exception 'Batch changed. Refresh before editing.';
  end if;
  select quantity into original from keystock.stock_events
    where company_id=c and kind='receive' and destination_id=pos.id;
  previous:=keystock.receipt_quantity_v105(c,pos.id);
  corrected:=(p->>'corrected_quantity')::numeric;
  if original is null or corrected is null or not (corrected>=0 and corrected<1000000000000) then
    raise exception 'Enter a valid corrected receiving quantity for an original purchase batch';
  end if;
  if nullif(btrim(p->>'reason'),'') is null then raise exception 'Correction reason required'; end if;
  select * into strict lot from keystock.lots where company_id=c and id=pos.lot_id;
  if lot.serialised then raise exception 'Serial-tracked receiving quantities require serial reconciliation'; end if;
  if exists(select 1 from keystock.allocations a where a.company_id=c and a.position_id=pos.id and a.remaining>0) then
    raise exception 'Release active reservations before correcting this batch';
  end if;
  if exists(select 1 from keystock.incomplete_units_v105 u join keystock.positions x
      on (x.company_id,x.id)=(u.company_id,u.position_id)
      where x.company_id=c and x.lot_id=pos.lot_id and u.closed_at is null)
    or exists(select 1 from keystock.stock_events where company_id=c and (source_id=pos.id or destination_id=pos.id)
      and kind not in ('receive','reserve','release','issue','cannibalise','restore_parts')) then
    raise exception 'This batch has dependent movements or incomplete stock';
  end if;
  select coalesce(sum(quantity),0) into issued from keystock.stock_events where company_id=c and source_id=pos.id and kind='issue';
  remaining:=corrected-issued;
  if remaining<0 or previous-issued<>pos.quantity then
    raise exception 'Corrected quantity conflicts with the batch transaction history';
  end if;
  if corrected=previous then return keystock.api_v104(p_action=>'edit_batch',p=>p-'corrected_quantity'); end if;
  if pos.quantity>0 then
    answer:=keystock.api_v104('edit_batch',p-'corrected_quantity');
  else
    if p ?| array['selections','variant','unit_cost_myr','remark']
      or p ? 'location_id' and nullif(p->>'location_id','')::uuid is distinct from pos.location_id then
      raise exception 'Restore a positive balance before editing details for this batch';
    end if;
    update keystock.positions set edit_revision=edit_revision+1 where company_id=c and id=pos.id;
    answer:=jsonb_build_object('id',pos.id,'revision',pos.edit_revision+1);
  end if;
  update keystock.positions set quantity=remaining where company_id=c and id=pos.id;
  select unit_cost_myr into new_cost from keystock.lots where company_id=c and id=pos.lot_id;
  insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),'receipt_quantity_correction',
    jsonb_build_object('position',pos.id,'lot',lot.id,'configuration',pos.configuration_id,'location',pos.location_id,
      'original_quantity',original,'previous_quantity',previous,'corrected_quantity',corrected,'adjustment',corrected-previous,
      'previous_on_hand',pos.quantity,'corrected_on_hand',remaining,'reason',btrim(p->>'reason'))) returning id into audit_key;
  insert into keystock.receipt_corrections_v105 values(audit_key,c,pos.id,lot.id,original,previous,corrected,pos.quantity*lot.unit_cost_myr,remaining*new_cost);
  return answer;
end $$;

create function keystock.manage_part_v105(c text, action text, p jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare
  part keystock.parts_v105%rowtype;
  part_id uuid:=nullif(p->>'id','')::uuid;
  series text:=p->>'series_key';
  name text:=regexp_replace(btrim(p->>'label'),'\s+',' ','g');
  units integer:=(p->>'units_per_pump')::integer;
  mappings uuid[];
begin
  if not exists(select 1 from keystock.catalog() where family=series) then raise exception 'Unknown catalogue series'; end if;
  if part_id is not null then
    select * into part from keystock.parts_v105 where company_id=c and id=part_id and series_key=series and not retired;
    if not found or part.revision is distinct from (p->>'revision')::integer then raise exception 'Part changed. Refresh before editing'; end if;
  end if;
  if action='part_retire' then
    if part_id is null then raise exception 'Select a part'; end if;
    update keystock.parts_v105 set retired=true,revision=revision+1 where company_id=c and id=part_id;
  else
    if coalesce(length(name),0) not between 1 and 120 or units is null or units not between 1 and 10000 then
      raise exception 'Enter a part name and whole units per pump';
    end if;
    select array_agg(distinct v::uuid order by v::uuid) into mappings from jsonb_array_elements_text(p->'group_ids') x(v);
    if coalesce(cardinality(mappings),0)=0 then raise exception 'Select at least one stock specification mapping'; end if;
    if exists(select 1 from unnest(mappings) x(id) where not exists(
      select 1 from keystock.groups g where g.company_id=c and g.id=x.id and g.series_key=series and not g.retired
        and g.kind in ('linked','critical','normal'))) then raise exception 'Select active groups from the same series'; end if;
    if exists(select 1 from keystock.parts_v105 where company_id=c and series_key=series and lower(label)=lower(name)
      and id is distinct from part_id) then raise exception 'A part with this name already exists'; end if;
    if part_id is null then
      insert into keystock.parts_v105(company_id,series_key,label,units_per_pump)
        values(c,series,name,units) returning id into part_id;
    else
      if exists(select 1 from keystock.missing_components_v105 m where m.company_id=c and m.part_id=part.id
        and m.restored_event is null) and (units<>part.units_per_pump or mappings is distinct from
          (select array_agg(g.group_id order by g.group_id) from keystock.part_groups_v105 g where g.company_id=c and g.part_id=part.id)) then
        raise exception 'Restore outstanding components before changing the stock mappings or unit count';
      end if;
      update keystock.parts_v105 set label=name,units_per_pump=units,revision=revision+1 where company_id=c and id=part_id;
      delete from keystock.part_groups_v105 g where g.company_id=c and g.part_id=part.id;
    end if;
    insert into keystock.part_groups_v105 select c,part_id,g from unnest(mappings) x(g);
  end if;
  insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),action,jsonb_build_object('part_id',part_id,'series_key',series));
  return jsonb_build_object('id',part_id);
end $$;

create function keystock.cannibalise_v105(c text, req uuid, p jsonb, d date) returns jsonb
language plpgsql set search_path='' as $$
declare
  pos keystock.positions%rowtype; lot keystock.lots%rowtype; cfg keystock.configurations%rowtype;
  part keystock.parts_v105%rowtype; held keystock.incomplete_units_v105%rowtype;
  specs jsonb; labels jsonb; names text[]:=keystock.serial_list(p->'serials'); serial_keys text[];
  pumps numeric:=keystock.require_quantity(p->>'quantity');
  target_unit uuid:=nullif(p->>'unit_id','')::uuid; event_id uuid; i integer;
begin
  select * into pos from keystock.positions where company_id=c and id=(p->>'position_id')::uuid for update;
  if not found then raise exception 'Select a source batch'; end if;
  select * into strict lot from keystock.lots where company_id=c and id=pos.lot_id;
  select * into strict cfg from keystock.configurations where company_id=c and id=pos.configuration_id;
  select x.* into part from keystock.parts_v105 x join keystock.items i
    on i.company_id=x.company_id and i.family=x.series_key
    where x.company_id=c and x.id=(p->>'part_id')::uuid and i.key=cfg.item_key and not x.retired;
  if not found or part.revision is distinct from (p->>'part_revision')::integer then
    raise exception 'Select an active part from this series and refresh if its definition changed';
  end if;
  if coalesce(p->>'purpose','') not in ('customer','repair','spare') then raise exception 'Select a purpose'; end if;
  if d<coalesce(lot.received_on,(lot.fifo_at at time zone 'Asia/Kuala_Lumpur')::date) then
    raise exception 'Cannibalisation date cannot precede the batch date'; end if;
  if pumps<>trunc(pumps) or pumps>10000
    or (p->>'part_quantity')::numeric is distinct from pumps*part.units_per_pump then
    raise exception 'Enter whole pumps and the configured part quantity per pump';
  end if;
  if exists(select 1 from keystock.part_groups_v105 m join keystock.groups g
    on (g.company_id,g.id)=(m.company_id,m.group_id) where m.company_id=c and m.part_id=part.id and g.retired) then
    raise exception 'Update retired stock specification mappings before removing this part';
  end if;
  select jsonb_object_agg(g.id::text,coalesce(cfg.selections->g.id::text,'null'))
    into specs from keystock.part_groups_v105 m join keystock.groups g
    on (g.company_id,g.id)=(m.company_id,m.group_id)
    where m.company_id=c and m.part_id=part.id and not g.retired;
  if specs is null then raise exception 'Configure stock specification mappings for this part'; end if;
  select keystock.correction_selection_snapshot(c,specs) into labels;
  -- The historical snapshot function retains the original display names.
  if target_unit is not null then
    select * into held from keystock.incomplete_units_v105
      where company_id=c and id=target_unit and position_id=pos.id and closed_at is null;
    if not found or pumps<>1 or cardinality(names)>0 then raise exception 'Select one open incomplete pump'; end if;
    if exists(select 1 from keystock.missing_components_v105 where company_id=c and unit_id=held.id
      and part_id=part.id and restored_event is null) then raise exception 'This component is already missing'; end if;
    select coalesce(array_agg(u.serial),'{}') into names from keystock.serial_units u
      where u.company_id=c and u.serial_key=held.serial_key;
  else
    if pumps>pos.quantity-coalesce((select sum(a.remaining) from keystock.allocations a
      where a.company_id=c and a.position_id=pos.id),0) then raise exception 'Insufficient unreserved complete pumps'; end if;
    if lot.serialised then
      select array_agg(u.serial_key order by u.serial_key),coalesce(array_agg(u.serial order by u.serial_key),'{}')
        into serial_keys,names from keystock.serial_units u
        where u.company_id=c and u.position_id=pos.id and u.serial_key in
          (select lower(v) from unnest(names) x(v));
      if cardinality(names)<>pumps or jsonb_array_length(coalesce(p->'serials','[]'))<>pumps then
        raise exception 'Select the exact serials on this batch'; end if;
    elsif cardinality(names)>0 then raise exception 'This batch does not track serials'; end if;
    update keystock.positions set quantity=positions.quantity-pumps,edit_revision=edit_revision+1
      where company_id=c and id=pos.id;
    update keystock.serial_units set position_id=null where company_id=c and serial_key=any(serial_keys);
  end if;
  event_id:=keystock.ledger_event(c,req,'cannibalise',d,pos.id,pos.id,pumps,names,null,null,'',
    btrim(p->>'reason'),coalesce(p->>'reference',''),coalesce(p->>'remark',''));
  for i in 1..pumps::integer loop
    if target_unit is null then
      insert into keystock.incomplete_units_v105(company_id,position_id,configuration_id,location_id,serial_key)
        values(c,pos.id,pos.configuration_id,pos.location_id,serial_keys[i]) returning id into held.id;
    end if;
    insert into keystock.missing_components_v105(company_id,unit_id,part_id,part_label,specifications,specification_labels,quantity,purpose,removed_event)
      values(c,held.id,part.id,part.label,specs,labels,part.units_per_pump,p->>'purpose',event_id);
  end loop;
  return jsonb_build_object('event_id',event_id);
end $$;

create function keystock.restore_part_v105(c text, req uuid, p jsonb, d date) returns jsonb
language plpgsql set search_path='' as $$
declare
  missing keystock.missing_components_v105%rowtype; donor keystock.missing_components_v105%rowtype;
  held keystock.incomplete_units_v105%rowtype; event_id uuid;
  donor_id uuid:=nullif(p->>'spare_source','')::uuid; names text[];
  replacement text:=nullif(btrim(p->>'replacement_reference'),'');
begin
  select * into missing from keystock.missing_components_v105
    where company_id=c and id=(p->>'missing_id')::uuid and restored_event is null for update;
  if not found then raise exception 'This component is no longer missing'; end if;
  if d<(select effective_on from keystock.stock_events where company_id=c and id=missing.removed_event) then
    raise exception 'Restoration cannot precede removal'; end if;
  select * into strict held from keystock.incomplete_units_v105 where company_id=c and id=missing.unit_id and closed_at is null;
  if (p->>'part_id')::uuid is distinct from missing.part_id or p->'specifications' is distinct from missing.specifications
    or (p->>'quantity')::numeric is distinct from missing.quantity then raise exception 'Replacement must match part, specifications and shortage quantity'; end if;
  if donor_id is not null then
    select * into donor from keystock.missing_components_v105 where company_id=c and id=donor_id and purpose='spare';
    if not found or donor.part_id<>missing.part_id or donor.specifications<>missing.specifications
      or d<(select effective_on from keystock.stock_events where company_id=c and id=donor.removed_event)
      or missing.quantity>donor.quantity-coalesce((select sum(m.quantity) from keystock.missing_components_v105 m
        where m.company_id=c and m.spare_source=donor_id),0)
      or (select cfg.item_key from keystock.incomplete_units_v105 u join keystock.configurations cfg
        on (cfg.company_id,cfg.id)=(u.company_id,u.configuration_id) where u.company_id=c and u.id=donor.unit_id)
        is distinct from (select cfg.item_key from keystock.configurations cfg where cfg.company_id=c and cfg.id=held.configuration_id)
    then raise exception 'Select available spare stock with the same model, part and specifications'; end if;
  elsif replacement is null then
    raise exception 'Enter the external replacement reference after checking the specifications';
  end if;
  select coalesce(array_agg(u.serial),'{}') into names from keystock.serial_units u where u.company_id=c and u.serial_key=held.serial_key;
  event_id:=keystock.ledger_event(c,req,'restore_parts',d,held.position_id,held.position_id,1,names,null,null,'',
    btrim(p->>'reason'),coalesce(replacement,donor_id::text),coalesce(p->>'remark',''));
  update keystock.missing_components_v105 set restored_event=event_id,spare_source=donor_id where company_id=c and id=missing.id;
  if not exists(select 1 from keystock.missing_components_v105 where company_id=c and unit_id=held.id and restored_event is null) then
    update keystock.positions set quantity=positions.quantity+1,edit_revision=edit_revision+1 where company_id=c and id=held.position_id;
    update keystock.serial_units set position_id=held.position_id where company_id=c and serial_key=held.serial_key;
    update keystock.incomplete_units_v105 set closed_at=now() where company_id=c and id=held.id;
  end if;
  return jsonb_build_object('event_id',event_id);
end $$;

-- The normal movement RPC still performs FIFO allocation. This branch limits
-- manual transactions to exactly one selected position.
create function keystock.manual_movement_v105(c text, req uuid, action text, p jsonb, d date) returns jsonb
language plpgsql set search_path='' as $$
declare
  pos keystock.positions%rowtype; lot keystock.lots%rowtype;
  q numeric:=keystock.require_quantity(p->>'quantity');
  names text[]:=keystock.serial_list(p->'serials'); matched text[]; target uuid; destination uuid;
  dest_config uuid; event_id uuid;
begin
  select * into pos from keystock.positions where company_id=c and id=(p->>'position_id')::uuid for update;
  if not found or pos.configuration_id is distinct from (p->>'source_configuration')::uuid
    or pos.location_id is distinct from nullif(p->>'source_location','')::uuid then raise exception 'Source batch changed. Refresh KeyStock'; end if;
  if pos.location_id is not null then perform keystock.active_location(c,pos.location_id); end if;
  select * into strict lot from keystock.lots where company_id=c and id=pos.lot_id;
  if q>pos.quantity-coalesce((select sum(remaining) from keystock.allocations where company_id=c and position_id=pos.id),0) then
    raise exception 'Insufficient available stock in the selected batch'; end if;
  if d<coalesce(lot.received_on,(lot.fifo_at at time zone 'Asia/Kuala_Lumpur')::date) then
    raise exception 'Movement date cannot precede the batch date'; end if;
  select coalesce(array_agg(u.serial order by u.serial_key),'{}') into matched from keystock.serial_units u
    where u.company_id=c and u.position_id=pos.id and u.serial_key in (select lower(n) from unnest(names) n);
  if (lot.serialised and (cardinality(matched)<>q or cardinality(matched)<>cardinality(names)))
    or (not lot.serialised and cardinality(names)>0) then raise exception 'Enter the exact serials for the selected batch'; end if;
  if action='transfer' then
    destination:=keystock.active_location(c,(p->>'location_id')::uuid);
    if destination=pos.location_id then raise exception 'Select a different location'; end if;
    target:=keystock.position_add(c,pos.lot_id,pos.configuration_id,destination,q);
  elsif action='reconfigure' then
    dest_config:=keystock.reconfigured(c,pos.configuration_id,(p->>'group_id')::uuid,(p->>'option_id')::uuid);
    target:=keystock.position_add(c,pos.lot_id,dest_config,pos.location_id,q);
  elsif action='issue' and nullif(btrim(p->>'reference'),'') is null then
    raise exception 'Delivery reference required';
  end if;
  update keystock.positions set quantity=quantity-q where company_id=c and id=pos.id;
  event_id:=keystock.ledger_event(c,req,action,d,pos.id,target,q,matched,null,null,'',
    btrim(p->>'reason'),coalesce(p->>'reference',''),coalesce(p->>'remark',''));
  update keystock.serial_units set position_id=target,issued_by_event=case when action='issue' then event_id end
    where company_id=c and position_id=pos.id and serial=any(matched);
  return jsonb_build_object('event_id',event_id);
end $$;

create function keystock.state_v105(c text, data jsonb, can_cost boolean) returns jsonb
language sql stable set search_path='' as $$
  select data||jsonb_build_object('config_version','v105',
    'ledger',(data->'ledger')||jsonb_build_object('positions',coalesce((
      select jsonb_agg(coalesce(visible.entry,to_jsonb(p)-'company_id'||'{"reserved":0,"serials":[]}'::jsonb)
        ||jsonb_build_object('incomplete',held.n,'original_quantity',receipt.quantity,
          'effective_quantity',keystock.receipt_quantity_v105(c,p.id),'serialised',l.serialised))
      from keystock.positions p
      join keystock.lots l on (l.company_id,l.id)=(p.company_id,p.lot_id)
      left join jsonb_array_elements(data->'ledger'->'positions') visible(entry) on (visible.entry->>'id')::uuid=p.id
      left join lateral (select count(*) n from keystock.incomplete_units_v105 u
        where u.company_id=p.company_id and u.position_id=p.id and u.closed_at is null) held on true
      left join lateral (select e.quantity from keystock.stock_events e
        where e.company_id=p.company_id and e.destination_id=p.id and e.kind='receive' limit 1) receipt on true
      where p.company_id=c and (visible.entry is not null or held.n>0 or exists(
        select 1 from keystock.receipt_corrections_v105 r where r.company_id=c and r.position_id=p.id))
    ),'[]')),
    'parts',coalesce((select jsonb_agg(to_jsonb(x)-'company_id'||jsonb_build_object('group_ids',coalesce(
      (select jsonb_agg(g.group_id order by g.group_id) from keystock.part_groups_v105 g where g.company_id=c and g.part_id=x.id),'[]')))
      from keystock.parts_v105 x where x.company_id=c),'[]'),
    'incomplete_units',coalesce((select jsonb_agg(to_jsonb(u)-'company_id'-'serial_key'||
      jsonb_build_object('serial',s.serial,'lot_id',p.lot_id))
      from keystock.incomplete_units_v105 u join keystock.positions p
        on (p.company_id,p.id)=(u.company_id,u.position_id)
      left join keystock.serial_units s on (s.company_id,s.serial_key)=(u.company_id,u.serial_key)
      where u.company_id=c),'[]'),
    'missing_components',coalesce((select jsonb_agg(to_jsonb(m)-'company_id'||jsonb_build_object('spare_available',
      case when m.purpose='spare' then m.quantity-coalesce((select sum(r.quantity) from keystock.missing_components_v105 r
        where r.company_id=c and r.spare_source=m.id),0) else 0 end))
      from keystock.missing_components_v105 m where m.company_id=c),'[]'),
    'quantity_corrections',coalesce((select jsonb_agg(to_jsonb(a)-'company_id'||case when can_cost then
      jsonb_build_object('previous_stock_value',r.previous_stock_value,'corrected_stock_value',r.corrected_stock_value) else '{}' end)
      from keystock.audit a join keystock.receipt_corrections_v105 r on (r.company_id,r.audit_id)=(a.company_id,a.id)
      where a.company_id=c),'[]'))
$$;

alter function keystock.api(text,jsonb) rename to api_v104;
revoke all on function keystock.api_v104(text,jsonb) from public,anon,authenticated;

create function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  c text; permissions jsonb; needed text; req uuid; act text; d date;
  prior keystock.stock_requests%rowtype; pos keystock.positions%rowtype; answer jsonb;
  new_client boolean:=p->>'stock_client' is not distinct from 'v105';
begin
  if auth.uid() is null or public.keysuite_has_access() is not true then raise exception 'Access denied' using errcode='42501'; end if;
  c:=public.keysuite_current_company_id();
  if nullif(c,'') is null then raise exception 'Company required'; end if;
  permissions:=keystock.ledger_permissions(c,lower(public.keysuite_current_role()));
  if permissions->>'view_stock' is distinct from 'true' then raise exception 'View Stock permission required' using errcode='42501'; end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>4000000 then raise exception 'Invalid stock request'; end if;
  if p_action='state' then
    answer:=keystock.api_v104(p_action,p);
    if new_client then return keystock.state_v105(c,answer,permissions->>'view_stock_cost'='true'); end if;
    return answer;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
  if p_action='cancel_batch' or (p_action='edit_batch' and not (p?'corrected_quantity')) then
    select * into pos from keystock.positions where company_id=c and id=(p->>'position')::uuid;
    if exists(select 1 from keystock.incomplete_units_v105 u join keystock.positions x
      on (x.company_id,x.id)=(u.company_id,u.position_id)
      where x.company_id=c and x.lot_id=pos.lot_id and u.closed_at is null) then
      raise exception 'Restore incomplete stock in this lot before editing or cancelling its batch';
    end if;
    if p_action='cancel_batch' and (exists(select 1 from keystock.receipt_corrections_v105 r
      where r.company_id=c and r.position_id=pos.id) or exists(select 1 from keystock.incomplete_units_v105 u
      where u.company_id=c and u.position_id=pos.id)) then raise exception 'This batch requires a controlled stock correction'; end if;
  elsif p_action='delete_location' or p_action='location' and coalesce((p->>'retired')::boolean,false) then
    if exists(select 1 from keystock.incomplete_units_v105 u where u.company_id=c
      and u.location_id=(p->>'id')::uuid and u.closed_at is null) then raise exception 'Location contains incomplete stock'; end if;
  end if;
  act:=substr(p_action,8);
  needed:=case
    when p_action='edit_batch' and p?'corrected_quantity' then 'edit_stock_batch'
    when p_action in ('part_save','part_retire') then 'manage_stock_dropdowns'
    when p_action in ('ledger_cannibalise','ledger_restore_parts') then 'move_stock'
    when new_client and p_action in ('ledger_transfer','ledger_reconfigure') and p->>'batch_method'='manual' then 'move_stock'
    when new_client and p_action='ledger_write_off' and p->>'batch_method'='manual' then 'adjust_stock'
    when new_client and p_action='ledger_issue' and p->>'batch_method'='manual' then 'confirm_stock_out'
  end;
  if needed is null then
    if new_client and p_action in ('ledger_transfer','ledger_reconfigure','ledger_write_off','ledger_issue') and p->>'batch_method'='fifo'
      and not exists(select 1 from keystock.stock_requests where company_id=c and id=(p->>'request_id')::uuid) then
      if not exists(select 1 from keystock.positions x where x.company_id=c and x.id=(p->>'position_id')::uuid
        and x.quantity>0 and x.configuration_id=(p->>'source_configuration')::uuid
        and x.location_id is not distinct from nullif(p->>'source_location','')::uuid) then raise exception 'Source stock changed. Refresh KeyStock'; end if;
      if nullif(p->>'source_location','') is not null then perform keystock.active_location(c,(p->>'source_location')::uuid); end if;
    end if;
    return keystock.api_v104(p_action,p);
  end if;
  if not new_client or permissions->>needed is distinct from 'true' then raise exception 'KeyStock permission required' using errcode='42501'; end if;
  if p_action in ('part_save','part_retire') then return keystock.manage_part_v105(c,p_action,p); end if;
  req:=(p->>'request_id')::uuid;
  if req is null then raise exception 'Request ID required'; end if;
  if p_action='edit_batch' then act:=p_action; end if;
  select * into prior from keystock.stock_requests where company_id=c and id=req;
  if found then
    if prior.actor<>auth.uid() or prior.action<>act or prior.fingerprint<>md5(p::text) then
      raise exception 'Request ID already used for a different operation'; end if;
    return prior.result||'{"already_saved":true}'::jsonb;
  end if;
  if nullif(btrim(p->>'reason'),'') is null then raise exception 'Reason required'; end if;
  d:=coalesce(nullif(p->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date);
  if not isfinite(d) then raise exception 'Select a valid transaction date'; end if;
  if p_action='edit_batch' then answer:=keystock.correct_receipt_v105(c,p);
  elsif act='cannibalise' then answer:=keystock.cannibalise_v105(c,req,p,d);
  elsif act='restore_parts' then answer:=keystock.restore_part_v105(c,req,p,d);
  else answer:=keystock.manual_movement_v105(c,req,act,p,d);
  end if;
  answer:=answer||jsonb_build_object('saved',true,'request_id',req);
  insert into keystock.stock_requests values(c,req,auth.uid(),act,md5(p::text),answer);
  return answer;
end $$;

revoke all on function keystock.receipt_quantity_v105(text,uuid),keystock.correct_receipt_v105(text,jsonb),
  keystock.manage_part_v105(text,text,jsonb),keystock.cannibalise_v105(text,uuid,jsonb,date),
  keystock.restore_part_v105(text,uuid,jsonb,date),keystock.manual_movement_v105(text,uuid,text,jsonb,date),
  keystock.state_v105(text,jsonb,boolean),keystock.api(text,jsonb) from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
create or replace function public.keysuite_stock_v100(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select keystock.api(p_action,p_payload) $$;
notify pgrst,'reload schema';
commit;
