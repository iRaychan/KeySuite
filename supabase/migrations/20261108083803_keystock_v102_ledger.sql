begin;

-- Freeze the opening source for a consistent seed. All existing rows stay intact.
lock table keystock.opening_balances in share row exclusive mode;

create table keystock.lots (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  opening_id uuid,
  received_on date,
  fifo_at timestamptz not null,
  supplier_id uuid,
  supplier text not null default '',
  remarks text not null default '',
  serialised boolean not null default false,
  unit_cost_myr numeric check (unit_cost_myr>=0 and unit_cost_myr<1000000000000),
  primary key (company_id,id),
  unique (company_id,opening_id),
  foreign key (company_id,opening_id) references keystock.opening_balances,
  foreign key (company_id,supplier_id) references keystock.suppliers,
  check ((opening_id is null)=(received_on is not null))
);

create table keystock.positions (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  lot_id uuid not null,
  configuration_id uuid not null,
  location_id uuid,
  quantity numeric not null check (quantity>=0 and quantity<1000000000000),
  primary key (company_id,id),
  unique nulls not distinct (company_id,lot_id,configuration_id,location_id),
  foreign key (company_id,lot_id) references keystock.lots,
  foreign key (company_id,configuration_id) references keystock.configurations,
  foreign key (company_id,location_id) references keystock.locations
);
create index on keystock.positions(company_id,configuration_id,location_id) where quantity>0;

create table keystock.reservations (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  configuration_id uuid not null,
  quantity numeric not null check (quantity>0 and quantity<1000000000000),
  fulfilled numeric not null default 0 check (fulfilled>=0 and fulfilled<=quantity),
  released_at timestamptz,
  reserved_on date not null,
  customer_id text not null,
  customer text not null,
  reference text not null default '',
  reason text not null,
  remark text not null default '',
  actor uuid not null,
  created_at timestamptz not null default now(),
  primary key (company_id,id),
  foreign key (company_id,configuration_id) references keystock.configurations
);

create table keystock.allocations (
  company_id text not null,
  reservation_id uuid not null,
  position_id uuid not null,
  remaining numeric not null check (remaining>=0 and remaining<1000000000000),
  primary key (company_id,reservation_id,position_id),
  foreign key (company_id,reservation_id) references keystock.reservations,
  foreign key (company_id,position_id) references keystock.positions
);
create index on keystock.allocations(company_id,position_id) where remaining>0;

create table keystock.stock_events (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  request_id uuid not null,
  kind text not null check (kind in ('receive','reserve','release','issue','return','write_off','transfer','reconfigure','adjust')),
  effective_on date not null,
  recorded_at timestamptz not null default now(),
  actor uuid not null,
  item_key text not null,
  model text not null,
  source_id uuid,
  destination_id uuid,
  source_location text,
  destination_location text,
  quantity numeric not null check (quantity>0 and quantity<1000000000000),
  serials text[] not null default '{}',
  reservation_id uuid,
  return_of uuid,
  customer text not null default '',
  supplier text not null default '',
  reason text not null default '',
  reference text not null default '',
  remark text not null default '',
  primary key (company_id,id),
  foreign key (company_id,source_id) references keystock.positions,
  foreign key (company_id,destination_id) references keystock.positions,
  foreign key (company_id,reservation_id) references keystock.reservations,
  foreign key (company_id,return_of) references keystock.stock_events
);
create index on keystock.stock_events(company_id,effective_on desc,recorded_at desc);
create index on keystock.stock_events(company_id,return_of) where return_of is not null;

create table keystock.serial_units (
  company_id text not null,
  serial_key text not null,
  serial text not null,
  lot_id uuid not null,
  position_id uuid,
  issued_by_event uuid,
  primary key (company_id,serial_key),
  foreign key (company_id,lot_id) references keystock.lots,
  foreign key (company_id,position_id) references keystock.positions,
  foreign key (company_id,issued_by_event) references keystock.stock_events,
  check (position_id is null or issued_by_event is null)
);
create index on keystock.serial_units(company_id,position_id) where position_id is not null;

create table keystock.serial_policy (
  company_id text not null,
  scope text not null check (scope in ('series','product')),
  subject text not null,
  required boolean not null,
  primary key (company_id,scope,subject)
);

create table keystock.stock_requests (
  company_id text not null,
  id uuid not null,
  actor uuid not null,
  action text not null,
  fingerprint text not null,
  result jsonb not null,
  primary key (company_id,id)
);

do $$ declare t text; begin
  foreach t in array array['lots','positions','reservations','allocations','stock_events','serial_units','serial_policy','stock_requests'] loop
    execute format('alter table keystock.%I enable row level security',t);
    execute format('revoke all on keystock.%I from public,anon,authenticated',t);
  end loop;
end $$;


insert into keystock.lots(company_id,id,opening_id,fifo_at,supplier_id,supplier,remarks,unit_cost_myr)
select b.company_id,b.id,b.id,b.created_at,b.supplier_id,b.supplier,b.remarks,k.unit_cost_myr
from keystock.opening_balances b
left join keystock.purchase_costs k on (k.company_id,k.opening_id)=(b.company_id,b.id)
where b.voided_at is null;

insert into keystock.positions(company_id,id,lot_id,configuration_id,location_id,quantity)
select company_id,id,id,configuration_id,location_id,quantity
from keystock.opening_balances where voided_at is null;

-- Prevent a stale V1.01 client from recording inventory outside the ledger.
create function keystock.protect_opening_history() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Opening balances are historical. Use the KeyStock ledger.' using errcode='55000';
end $$;
create trigger protect_opening_history before insert or update or delete on keystock.opening_balances
for each statement execute function keystock.protect_opening_history();

create function keystock.ledger_permissions(c text, r text) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_object_agg(k,coalesce(
    (select permissions->>k='full' from public.ks_role_permissions where company_id::text=c and role=r),
    k='view_stock' or r in ('owner','admin')))
  from unnest(array['view_stock','receive_stock','manage_stock_dropdowns','reserve_stock',
    'confirm_stock_out','adjust_stock','move_stock']) k
$$;

create function keystock.require_quantity(raw text) returns numeric
language plpgsql immutable set search_path='' as $$
declare q numeric:=raw::numeric;
begin
  if q is null or not (q>0 and q<1000000000000) then raise exception 'Enter a positive stock quantity'; end if;
  return q;
end $$;

create function keystock.active_location(c text, location uuid) returns uuid
language plpgsql stable set search_path='' as $$
begin
  if location is null or not exists(select 1 from keystock.locations
    where company_id=c and id=location and not retired) then raise exception 'Select an active location'; end if;
  return location;
end $$;

create function keystock.position_add(c text, lot uuid, config uuid, location uuid, q numeric) returns uuid
language sql volatile set search_path='' as $$
  insert into keystock.positions as p(company_id,lot_id,configuration_id,location_id,quantity)
  values(c,lot,config,location,q)
  on conflict(company_id,lot_id,configuration_id,location_id) do update set quantity=p.quantity+excluded.quantity
  returning id
$$;

create function keystock.serial_list(input jsonb) returns text[]
language plpgsql immutable set search_path='' as $$
declare names text[];
begin
  if input is null then return '{}'; end if;
  if jsonb_typeof(input)<>'array' then raise exception 'Serial numbers must be a list'; end if;
  if jsonb_array_length(input)>10000 then raise exception 'Too many serial numbers'; end if;
  select coalesce(array_agg(trim(value)), '{}') into names from jsonb_array_elements_text(input);
  if exists(select 1 from unnest(names) n where n is null or n='' or length(n)>128)
    or cardinality(names)<>(select count(distinct lower(n)) from unnest(names) n)
    then raise exception 'Serial numbers must be nonempty and unique'; end if;
  return names;
end $$;

create function keystock.ledger_event(c text, req uuid, kind text, d date, src uuid, dest uuid,
  q numeric, serials text[], reservation uuid, returned uuid, customer text, reason text, reference text, remark text)
returns uuid language sql volatile set search_path='' as $$
  insert into keystock.stock_events(company_id,request_id,kind,effective_on,actor,item_key,model,
    source_id,destination_id,source_location,destination_location,quantity,serials,reservation_id,
    return_of,customer,supplier,reason,reference,remark)
  select c,req,kind,d,auth.uid(),i.key,i.model,src,dest,sl.label,dl.label,q,serials,reservation,
    returned,customer,l.supplier,reason,reference,remark
  from keystock.positions p
  join keystock.configurations cfg on (cfg.company_id,cfg.id)=(p.company_id,p.configuration_id)
  join keystock.items i on (i.company_id,i.key)=(cfg.company_id,cfg.item_key)
  join keystock.lots l on (l.company_id,l.id)=(p.company_id,p.lot_id)
  left join keystock.positions sp on (sp.company_id,sp.id)=(p.company_id,src)
  left join keystock.positions dp on (dp.company_id,dp.id)=(p.company_id,dest)
  left join keystock.locations sl on (sl.company_id,sl.id)=(sp.company_id,sp.location_id)
  left join keystock.locations dl on (dl.company_id,dl.id)=(dp.company_id,dp.location_id)
  where p.company_id=c and p.id=coalesce(src,dest)
  returning id
$$;

create function keystock.receipt_configuration(c text, k text, sels jsonb, requested_variant text) returns uuid
language plpgsql volatile set search_path='' as $$
declare source record; linked jsonb; chosen text; config uuid;
begin
  select * into source from keystock.catalog() where key=k;
  if not found or source.family not in ('ES','ISO','CHC_G1','CHC_G2','CR','KV','BSW','BSV','MOTOR','BGF','BFI') then
    raise exception 'Select a supported catalogue model';
  end if;
  insert into keystock.items(company_id,key,family,model,brand) values(c,k,source.family,source.model,source.brand)
    on conflict do nothing;
  perform keystock.validate_selections(c,k,sels);
  select jsonb_object_agg(g.id::text,sels->g.id::text) into linked
    from keystock.groups g where g.company_id=c and g.item_key=k and g.kind='linked' and not g.retired;
  if linked is not null then
    select variant into chosen from keystock.mappings
      where company_id=c and item_key=k and selections=linked and not retired;
    if chosen is not null and not exists(select 1 from jsonb_array_elements(source.choices) v where v->>'code'=chosen) then
      chosen:=null;
    end if;
  elsif requested_variant<>'' then
    if not exists(select 1 from jsonb_array_elements(source.choices) v where v->>'code'=requested_variant) then
      raise exception 'Select an existing exact configuration';
    end if;
    chosen:=requested_variant;
  end if;
  insert into keystock.configurations(company_id,item_key,selections,variant)
    values(c,k,sels,coalesce(chosen,'')) on conflict do nothing;
  select id into strict config from keystock.configurations
    where company_id=c and item_key=k and selections=sels and variant=coalesce(chosen,'');
  return config;
end $$;

create function keystock.stock_state(c text, can_cost boolean) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object(
    'positions', coalesce((
      select jsonb_agg(to_jsonb(p)-'company_id'||jsonb_build_object(
        'reserved',coalesce((select sum(a.remaining) from keystock.allocations a
          where a.company_id=c and a.position_id=p.id and a.remaining>0),0),
        'serials',coalesce((select jsonb_agg(u.serial order by u.serial_key) from keystock.serial_units u
          where u.company_id=c and u.position_id=p.id),'[]')))
      from keystock.positions p where p.company_id=c and p.quantity>0),'[]'),
    'lots',coalesce((select jsonb_agg(case when can_cost then to_jsonb(l)-'company_id'
        else to_jsonb(l)-'company_id'-'unit_cost_myr' end)
      from keystock.lots l where l.company_id=c),'[]'),
    'reservations',coalesce((select jsonb_agg(to_jsonb(r)-'company_id'||jsonb_build_object('allocations',coalesce(
      (select jsonb_agg(to_jsonb(a)-'company_id'-'reservation_id') from keystock.allocations a
        where a.company_id=c and a.reservation_id=r.id and a.remaining>0),'[]')) order by r.created_at desc)
      from keystock.reservations r where r.company_id=c),'[]'),
    'events',coalesce((select jsonb_agg(to_jsonb(e)-'company_id'||case when e.kind='issue' then
        jsonb_build_object('returned',coalesce((select sum(re.quantity) from keystock.stock_events re
          where re.company_id=c and re.return_of=e.id),0)) else '{}' end order by e.recorded_at desc)
      from keystock.stock_events e where e.company_id=c),'[]'),
    'serial_policy',coalesce((select jsonb_agg(to_jsonb(sp)-'company_id') from keystock.serial_policy sp where sp.company_id=c),'[]')
  )
$$;

create function keystock.receive_stock(c text, req uuid, p jsonb, d date, can_cost boolean)
returns void language plpgsql volatile set search_path='' as $$
declare row_data jsonb; config uuid; location uuid; supplier_id uuid; supplier text; lot uuid;
  position uuid; q numeric; cost numeric; names text[]; product text; family text; required boolean;
begin
  if jsonb_typeof(p->'rows') is distinct from 'array' then raise exception 'Add at least one receiving row'; end if;
  if jsonb_array_length(p->'rows') not between 1 and 200 then raise exception 'Add 1 to 200 receiving rows'; end if;
  supplier_id:=(p->>'supplier_id')::uuid;
  select s.label into supplier from keystock.suppliers s where s.company_id=c and s.id=supplier_id and not s.retired;
  if not found then raise exception 'Select an active supplier'; end if;
  for row_data in select value from jsonb_array_elements(p->'rows') loop
    product:=row_data->>'item_key';
    config:=keystock.receipt_configuration(c,product,coalesce(row_data->'selections','{}'),coalesce(row_data->>'variant',''));
    select i.family into strict family from keystock.items i where i.company_id=c and i.key=product;
    if family is distinct from p->>'family' then raise exception 'All rows must belong to the selected series'; end if;
    q:=keystock.require_quantity(row_data->>'quantity');
    location:=keystock.active_location(c,(row_data->>'location_id')::uuid);
    cost:=(row_data->>'unit_cost_myr')::numeric;
    if cost is not null and not can_cost then raise exception 'Costing permission required' using errcode='42501'; end if;
    names:=keystock.serial_list(row_data->'serials');
    select coalesce(
      (select sp.required from keystock.serial_policy sp where sp.company_id=c and sp.scope='product' and sp.subject=product),
      (select sp.required from keystock.serial_policy sp where sp.company_id=c and sp.scope='series' and sp.subject=family),false)
      into required;
    if (required or cardinality(names)>0) and cardinality(names)<>q then
      raise exception 'Enter one serial number per unit for this receiving row';
    end if;
    insert into keystock.lots(company_id,received_on,fifo_at,supplier_id,supplier,remarks,serialised,unit_cost_myr)
      values(c,d,clock_timestamp(),supplier_id,supplier,coalesce(row_data->>'remark',''),
        cardinality(names)>0,cost) returning id into lot;
    position:=keystock.position_add(c,lot,config,location,q);
    insert into keystock.serial_units(company_id,serial_key,serial,lot_id,position_id)
      select c,lower(n),n,lot,position from unnest(names) n;
    perform keystock.ledger_event(c,req,'receive',d,null,position,q,names,null,null,'','Receiving',
      coalesce(p->>'reference',''),coalesce(row_data->>'remark',''));
  end loop;
end $$;

create function keystock.reconfigured(c text, old_config uuid, target_group uuid, target_option uuid) returns uuid
language plpgsql volatile set search_path='' as $$
declare cfg keystock.configurations%rowtype; config uuid;
begin
  select * into strict cfg from keystock.configurations where company_id=c and id=old_config;
  if not exists(select 1 from keystock.groups g join keystock.options o
      on (g.company_id,g.id)=(o.company_id,o.group_id)
      where g.company_id=c and g.id=target_group and o.id=target_option
        and g.item_key=cfg.item_key and g.kind='normal' and not g.retired and not o.retired)
    then raise exception 'Select an active Normal Group option for this model'; end if;
  if cfg.selections->>target_group::text=target_option::text then raise exception 'Select a different option'; end if;
  cfg.selections:=cfg.selections||jsonb_build_object(target_group::text,target_option::text);
  insert into keystock.configurations(company_id,item_key,selections,variant)
    values(c,cfg.item_key,cfg.selections,cfg.variant) on conflict do nothing;
  select id into strict config from keystock.configurations
    where company_id=c and item_key=cfg.item_key and selections=cfg.selections and variant=cfg.variant;
  return config;
end $$;

-- The tenant lock held by the gateway covers allocation, deduction, and retry keys.
create function keystock.take_stock(c text, req uuid, action text, p jsonb, d date)
returns jsonb language plpgsql volatile set search_path='' as $$
declare r record; pos keystock.positions%rowtype; reservation keystock.reservations%rowtype;
  res_id uuid; selected_position uuid:=(p->>'position_id')::uuid;
  cfg uuid:=(p->>'configuration_id')::uuid; loc uuid; destination uuid; dest_config uuid; target uuid;
  requested_qty numeric:=keystock.require_quantity(p->>'quantity'); pending numeric:=requested_qty; take numeric;
  submitted text[]:=keystock.serial_list(p->'serials'); names text[]; used int:=0; event_id uuid;
  customer_name text:=''; customer_id text:=p->>'customer_id';
  reason text:=trim(coalesce(p->>'reason','')); reference text:=trim(coalesce(p->>'reference',''));
  remark text:=coalesce(p->>'remark',''); scoped boolean:=selected_position is not null;
begin
  if selected_position is not null then
    select * into pos from keystock.positions where company_id=c and id=selected_position and positions.quantity>0;
    if not found then raise exception 'Stock position is unavailable'; end if;
    cfg:=pos.configuration_id;
    loc:=pos.location_id;
  end if;
  if action='fulfill' then
    res_id:=(p->>'reservation_id')::uuid;
    select * into reservation from keystock.reservations where company_id=c and id=res_id and released_at is null;
    if not found or reservation.quantity-reservation.fulfilled<requested_qty then
      raise exception 'Quantity exceeds the open reservation';
    end if;
    if d<reservation.reserved_on then raise exception 'Stock-out date cannot precede the reservation'; end if;
    cfg:=reservation.configuration_id;
    customer_name:=reservation.customer;
    reason:=coalesce(nullif(reason,''),reservation.reason);
    scoped:=false;
  elsif action='reserve' then
    if reason='' then raise exception 'Reservation reason required'; end if;
    if cardinality(submitted)>0 then raise exception 'Serial numbers are entered when stock is issued'; end if;
    select company_name into customer_name from public.ks_customers
      where company_id::text=c and id::text=customer_id and coalesce(status,'active')='active';
    if not found then raise exception 'Select an active KeySuite customer in this company'; end if;
    insert into keystock.reservations(company_id,configuration_id,quantity,reserved_on,customer_id,customer,
      reference,reason,remark,actor) values(c,cfg,requested_qty,d,customer_id,customer_name,reference,reason,remark,auth.uid())
      returning id into res_id;
  elsif reason='' then raise exception 'Movement reason required';
  end if;
  if action in ('issue','fulfill') and reference='' then raise exception 'Delivery reference required'; end if;
  if action='transfer' then
    if not scoped then raise exception 'Select a source stock position'; end if;
    destination:=keystock.active_location(c,(p->>'location_id')::uuid);
    if destination=loc then raise exception 'Select a different location'; end if;
  elsif action='reconfigure' then
    if not scoped then raise exception 'Select a source stock position'; end if;
    dest_config:=keystock.reconfigured(c,cfg,(p->>'group_id')::uuid,(p->>'option_id')::uuid);
  end if;
  for r in
    select p0.*,l.serialised,
      case when action='fulfill' then coalesce(a.remaining,0) else p0.quantity-coalesce((
        select sum(h.remaining) from keystock.allocations h
        where h.company_id=c and h.position_id=p0.id and h.remaining>0),0) end as available
    from keystock.positions p0 join keystock.lots l on (l.company_id,l.id)=(p0.company_id,p0.lot_id)
    left join keystock.allocations a on a.company_id=c and a.position_id=p0.id and a.reservation_id=res_id
    where p0.company_id=c and p0.configuration_id=cfg and p0.quantity>0
      and (not scoped or p0.location_id is not distinct from loc)
      and (action<>'fulfill' or a.remaining>0)
    order by coalesce(l.received_on,(l.fifo_at at time zone 'Asia/Kuala_Lumpur')::date),
      l.opening_id is null,l.fifo_at,l.id,p0.id
  loop
    exit when pending=0;
    take:=least(r.available,pending);
    continue when take<=0;
    if r.serialised and take<>trunc(take) then raise exception 'Serial-tracked stock uses whole units'; end if;
    if action='reserve' then
      insert into keystock.allocations values(c,res_id,r.id,take);
      perform keystock.ledger_event(c,req,'reserve',d,r.id,null,take,'{}',res_id,null,customer_name,reason,reference,remark);
    else
      names:='{}';
      if r.serialised then
        select coalesce(array_agg(u.serial order by u.serial_key),'{}') into names
          from keystock.serial_units u where u.company_id=c and u.position_id=r.id
            and u.serial_key in (select lower(n) from unnest(submitted) n);
        if cardinality(names)<>take then raise exception 'Enter the serials for the exact FIFO stock being moved'; end if;
      end if;
      used:=used+cardinality(names);
      update keystock.positions set quantity=keystock.positions.quantity-take where company_id=c and id=r.id;
      target:=null;
      if action='transfer' then target:=keystock.position_add(c,r.lot_id,r.configuration_id,destination,take);
      elsif action='reconfigure' then target:=keystock.position_add(c,r.lot_id,dest_config,r.location_id,take);
      elsif action='fulfill' then
        update keystock.allocations set remaining=remaining-take
          where company_id=c and reservation_id=res_id and position_id=r.id;
      end if;
      event_id:=keystock.ledger_event(c,req,case when action='fulfill' then 'issue' else action end,
        d,r.id,target,take,names,res_id,null,customer_name,reason,reference,remark);
      update keystock.serial_units u set position_id=target,
        issued_by_event=case when action='issue' or action='fulfill' then event_id else null end
        where u.company_id=c and u.position_id=r.id and u.serial=any(names);
    end if;
    pending:=pending-take;
  end loop;
  if pending<>0 then raise exception 'Insufficient available stock for this exact configuration'; end if;
  if used<>cardinality(submitted) then raise exception 'Some serial numbers do not belong to this movement'; end if;
  if action='fulfill' then
    update keystock.reservations set fulfilled=fulfilled+requested_qty where company_id=c and id=res_id;
  end if;
  return jsonb_build_object('reservation_id',res_id);
end $$;

create function keystock.release_stock(c text, req uuid, p jsonb, d date) returns void
language plpgsql volatile set search_path='' as $$
declare r keystock.reservations%rowtype; a record;
begin
  select * into r from keystock.reservations where company_id=c and id=(p->>'reservation_id')::uuid;
  if not found or r.released_at is not null or r.fulfilled=r.quantity then raise exception 'Reservation is already closed'; end if;
  for a in select * from keystock.allocations where company_id=c and reservation_id=r.id and remaining>0 loop
    perform keystock.ledger_event(c,req,'release',d,a.position_id,null,a.remaining,'{}',r.id,null,r.customer,
      'Return to Available',r.reference,'');
  end loop;
  update keystock.allocations set remaining=0 where company_id=c and reservation_id=r.id;
  update keystock.reservations set released_at=now() where company_id=c and id=r.id;
end $$;

create function keystock.return_stock(c text, req uuid, p jsonb, d date) returns void
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
  target:=keystock.position_add(c,pos.lot_id,pos.configuration_id,destination,q);
  perform keystock.ledger_event(c,req,'return',d,null,target,q,matched,e.reservation_id,e.id,e.customer,
    trim(p->>'reason'),trim(p->>'reference'),coalesce(p->>'remark',''));
  update keystock.serial_units set position_id=target,issued_by_event=null where company_id=c and issued_by_event=e.id and serial=any(matched);
end $$;

-- Delegate Normal/Critical/Link group maintenance without elevating legacy pricing actions.
create function keystock.delegated_group(c text, action text, p jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$
declare k text:=p->>'item_key'; source record; g keystock.groups%rowtype;
  gid uuid; oid uuid; option_data jsonb; answer jsonb;
begin
  select * into source from keystock.catalog() where key=k;
  if found then
    insert into keystock.items(company_id,key,family,model,brand) values(c,k,source.family,source.model,source.brand)
      on conflict do nothing;
  elsif not exists(select 1 from keystock.items where company_id=c and key=k and independent) then
    raise exception 'Select an available stock model';
  end if;
  if action='copy' then
    answer:=keystock.copy_setup(c,k,p,false);
  else
    gid:=(p->>'id')::uuid;
    select * into g from keystock.groups where company_id=c and id=gid;
    if found and (g.item_key<>k or g.kind<>p->>'kind') then raise exception 'Group identity and type cannot change'; end if;
    if (g.id is null or g.retired or keystock.normal_label(g.label)<>keystock.normal_label(p->>'label'))
      and exists(select 1 from keystock.groups where company_id=c and item_key=k and id<>gid
        and kind=p->>'kind' and not retired and keystock.normal_label(label)=keystock.normal_label(p->>'label'))
      then raise exception 'A group of this type and label already exists'; end if;
    insert into keystock.groups values(c,gid,k,p->>'kind',trim(p->>'label'),
      coalesce((p->>'sort_order')::int,0),coalesce((p->>'retired')::boolean,false))
      on conflict(company_id,id) do update set label=excluded.label,sort_order=excluded.sort_order,retired=excluded.retired;
    for option_data in select value from jsonb_array_elements(p->'options') loop
      oid:=(option_data->>'id')::uuid;
      if exists(select 1 from keystock.options where company_id=c and id=oid and group_id<>gid)
        then raise exception 'Option belongs to another group'; end if;
      insert into keystock.options values(c,oid,gid,trim(option_data->>'label'),
        coalesce((option_data->>'sort_order')::int,0),coalesce((option_data->>'retired')::boolean,false))
        on conflict(company_id,id) do update set label=excluded.label,sort_order=excluded.sort_order,retired=excluded.retired;
    end loop;
    answer:=jsonb_build_object('id',gid);
  end if;
  insert into keystock.audit(company_id,actor,action,detail)
    values(c,auth.uid(),action,jsonb_build_object('item_key',k,'result',answer));
  return jsonb_build_object('saved',true)||answer;
end $$;

create function keystock.adjust_stock(c text, req uuid, p jsonb, d date) returns void
language plpgsql volatile set search_path='' as $$
declare pos keystock.positions%rowtype; serialised boolean; names text[]:=keystock.serial_list(p->'serials');
  q numeric:=keystock.require_quantity(p->>'quantity');
begin
  select * into pos from keystock.positions where company_id=c and id=(p->>'position_id')::uuid;
  if not found then raise exception 'Select an existing batch and location'; end if;
  perform keystock.active_location(c,pos.location_id);
  if nullif(trim(p->>'reason'),'') is null then raise exception 'Adjustment reason required'; end if;
  select l.serialised into serialised from keystock.lots l where l.company_id=c and l.id=pos.lot_id;
  if (serialised and cardinality(names)<>q) or (not serialised and cardinality(names)>0) then
    raise exception 'Serial numbers must match the batch tracking policy';
  end if;
  update keystock.positions set quantity=quantity+q where company_id=c and id=pos.id;
  insert into keystock.serial_units(company_id,serial_key,serial,lot_id,position_id)
    select c,lower(n),n,pos.lot_id,pos.id from unnest(names) n;
  perform keystock.ledger_event(c,req,'adjust',d,null,pos.id,q,names,null,null,'',
    trim(p->>'reason'),coalesce(p->>'reference',''),coalesce(p->>'remark',''));
end $$;

-- Keep the old entry point for compatible clients, while protecting permissions and historical writes.
alter function keystock.api(text,jsonb) rename to legacy_api;
revoke all on function keystock.legacy_api(text,jsonb) from public,anon,authenticated;

create function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c text; role_name text; permissions jsonb; can_cost boolean; action text;
  needed text; req uuid; d date; answer jsonb; existing keystock.stock_requests%rowtype;
  scope_name text; subject_name text; policy boolean;
begin
  if auth.uid() is null or public.keysuite_has_access() is not true then raise exception 'Access denied' using errcode='42501'; end if;
  c:=public.keysuite_current_company_id();
  role_name:=lower(public.keysuite_current_role());
  if coalesce(c,'')='' then raise exception 'Company required'; end if;
  permissions:=keystock.ledger_permissions(c,role_name);
  if (permissions->>'view_stock')::boolean is not true then raise exception 'View Stock permission required' using errcode='42501'; end if;
  can_cost:=coalesce(public.keysuite_permission_level('view_costing_breakdown')<>'none',false);
  if p_action='state' then
    if p->>'ledger_client' is distinct from 'v102' then
      raise exception 'Refresh into KeyStock V1.02 to view current stock.' using errcode='55000';
    end if;
    return keystock.legacy_api(p_action,p)||jsonb_build_object('ledger',keystock.stock_state(c,can_cost),
      'ledger_permissions',permissions);
  end if;
  if p_action='opening' then raise exception 'Opening balances are historical. Use Add Stock or Stock Movement.'; end if;
  if p_action in ('group','copy','mapping','copy_mappings','delete_mapping')
      and (permissions->>'manage_stock_dropdowns')::boolean is not true then
    raise exception 'Manage Dropdowns permission required' using errcode='42501';
  end if;
  if p_action in ('group','copy') and role_name not in ('owner','admin') then
    perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
    return keystock.delegated_group(c,p_action,p);
  end if;
  if not starts_with(p_action,'ledger_') then return keystock.legacy_api(p_action,p); end if;
  action:=substr(p_action,8);
  needed:=case action
    when 'receive' then 'receive_stock' when 'reserve' then 'reserve_stock' when 'release' then 'reserve_stock'
    when 'fulfill' then 'confirm_stock_out' when 'issue' then 'confirm_stock_out'
    when 'return' then 'adjust_stock' when 'write_off' then 'adjust_stock' when 'adjust' then 'adjust_stock'
    when 'transfer' then 'move_stock' when 'reconfigure' then 'move_stock' when 'serial_policy' then 'manage_stock_dropdowns'
  end;
  if needed is null or (permissions->>needed)::boolean is not true then
    raise exception 'KeyStock permission required' using errcode='42501';
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>4000000 then raise exception 'Invalid stock request'; end if;
  req:=(p->>'request_id')::uuid;
  if req is null then raise exception 'Request ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
  select * into existing from keystock.stock_requests where company_id=c and id=req;
  if found then
    if existing.actor<>auth.uid() or existing.action<>action or existing.fingerprint<>md5(p::text) then
      raise exception 'Request ID already used for a different operation';
    end if;
    return existing.result||jsonb_build_object('already_saved',true);
  end if;
  d:=coalesce((p->>'date')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date);
  if not isfinite(d) then raise exception 'Select a valid transaction date'; end if;
  answer:=jsonb_build_object('saved',true,'request_id',req);
  if action='receive' then perform keystock.receive_stock(c,req,p,d,can_cost);
  elsif action='release' then perform keystock.release_stock(c,req,p,d);
  elsif action='return' then perform keystock.return_stock(c,req,p,d);
  elsif action='adjust' then perform keystock.adjust_stock(c,req,p,d);
  elsif action='serial_policy' then
    scope_name:=p->>'scope';subject_name:=p->>'subject';policy:=(p->>'required')::boolean;
    if scope_name='series' then
      if not exists(select 1 from keystock.catalog() where family=subject_name) then raise exception 'Unknown series'; end if;
    elsif scope_name='product' then
      if not exists(select 1 from keystock.catalog() where key=subject_name) then raise exception 'Unknown model'; end if;
    else raise exception 'Select a serial policy scope';
    end if;
    if policy is null then
      delete from keystock.serial_policy where company_id=c and scope=scope_name and subject=subject_name;
    else
      insert into keystock.serial_policy values(c,scope_name,subject_name,policy)
        on conflict(company_id,scope,subject) do update set required=excluded.required;
    end if;
    insert into keystock.audit(company_id,actor,action,detail)
      values(c,auth.uid(),p_action,jsonb_build_object('scope',scope_name,'subject',subject_name,'required',policy));
  else answer:=answer||keystock.take_stock(c,req,action,p,d);
  end if;
  insert into keystock.stock_requests values(c,req,auth.uid(),action,md5(p::text),answer);
  return answer;
end $$;

create or replace function public.keysuite_stock_v100(p_action text,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
  select keystock.api(p_action,p_payload)
$$;
revoke all on all functions in schema keystock from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
revoke all on function public.keysuite_stock_v100(text,jsonb) from public,anon;
grant execute on function public.keysuite_stock_v100(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
