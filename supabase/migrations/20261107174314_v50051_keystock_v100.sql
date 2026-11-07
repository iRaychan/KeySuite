begin;
-- KeyStock V1.00. Included verbatim in the dated migration; no existing tables are modified.
create schema keystock;
revoke all on schema keystock from public, anon, authenticated;
grant usage on schema keystock to authenticated;

create table keystock.static_refs (
  key text primary key, family text not null, model text not null, brand text not null,
  choices jsonb not null check(jsonb_typeof(choices)='array')
);
create table keystock.items (
  company_id text not null, key text not null, family text not null, model text not null,
  brand text not null, independent boolean not null default false,
  primary key(company_id,key)
);
create table keystock.groups (
  company_id text not null, id uuid not null default gen_random_uuid(), item_key text not null,
  kind text not null check(kind in ('critical','linked','normal')), label text not null check(length(trim(label))>0),
  sort_order integer not null default 0, retired boolean not null default false,
  primary key(company_id,id), foreign key(company_id,item_key) references keystock.items
);
create index on keystock.groups(company_id,item_key);
create table keystock.options (
  company_id text not null, id uuid not null default gen_random_uuid(), group_id uuid not null,
  label text not null check(length(trim(label))>0), sort_order integer not null default 0, retired boolean not null default false,
  primary key(company_id,id), foreign key(company_id,group_id) references keystock.groups
);
create index on keystock.options(company_id,group_id);
create table keystock.mappings (
  company_id text not null, id uuid not null default gen_random_uuid(), item_key text not null,
  selections jsonb not null check(jsonb_typeof(selections)='object'), variant text not null,
  primary key(company_id,id), unique(company_id,item_key,selections),
  foreign key(company_id,item_key) references keystock.items
);
create table keystock.configurations (
  company_id text not null, id uuid not null default gen_random_uuid(), item_key text not null,
  selections jsonb not null check(jsonb_typeof(selections)='object'), variant text not null default '',
  primary key(company_id,id), unique(company_id,item_key,selections,variant),
  foreign key(company_id,item_key) references keystock.items
);
create table keystock.locations (
  company_id text not null, id uuid not null default gen_random_uuid(), label text not null check(length(trim(label))>0),
  primary key(company_id,id), unique(company_id,label)
);
create table keystock.opening_balances (
  company_id text not null, id uuid not null, configuration_id uuid not null, location_id uuid,
  quantity numeric not null check(quantity>=0 and quantity<1000000000000),
  supplier text not null default '', remarks text not null default '', snapshot jsonb not null,
  created_at timestamptz not null default now(), created_by uuid not null,
  voided_at timestamptz, voided_by uuid, void_reason text,
  primary key(company_id,id), foreign key(company_id,configuration_id) references keystock.configurations,
  foreign key(company_id,location_id) references keystock.locations
);
create index on keystock.opening_balances(company_id,configuration_id);
create index on keystock.opening_balances(company_id,location_id);
create table keystock.critical_quantities (
  company_id text not null, opening_id uuid not null, option_id uuid not null,
  missing_quantity numeric not null check(missing_quantity>=0 and missing_quantity<1000000000000),
  primary key(company_id,opening_id,option_id), foreign key(company_id,opening_id) references keystock.opening_balances,
  foreign key(company_id,option_id) references keystock.options
);
create index on keystock.critical_quantities(company_id,option_id);
-- Purchase cost is never included in generic stock records or the shared audit log.
create table keystock.purchase_costs (
  company_id text not null, opening_id uuid not null, unit_cost_myr numeric not null check(unit_cost_myr>=0 and unit_cost_myr<1000000000000),
  primary key(company_id,opening_id), foreign key(company_id,opening_id) references keystock.opening_balances
);
create table keystock.audit (
  company_id text not null, id bigint generated always as identity primary key,
  at timestamptz not null default now(), actor uuid not null, action text not null, detail jsonb not null
);
create index on keystock.audit(company_id,id);
do $$ declare t text; begin
  foreach t in array array['static_refs','items','groups','options','mappings','configurations','locations','opening_balances','critical_quantities','purchase_costs','audit'] loop
    execute format('alter table keystock.%I enable row level security',t);
    execute format('revoke all on keystock.%I from public,anon,authenticated',t);
  end loop;
end $$;

-- Only trusted source descriptors are returned, never an independent copy of prices.
-- Each request rereads the source tables: new models appear without an import/seed job.
create function keystock.catalog() returns table(key text,family text,model text,brand text,choices jsonb)
language plpgsql stable set search_path='' as $$
declare spec text[]; r jsonb; v jsonb; cs jsonb; code text; label text; tbl text; fam text;
begin
  foreach spec slice 1 in array array[
    ['CHC_G1','ks_products_chc_g1'],['CHC_G2','ks_products_chc'],['CR','ks_products_cr'],['KV','ks_products_kv'],
    ['BFI','ks_products_bfi'],['BGF','ks_products_bgf'],['BSV','ks_bsv_products_v50043'],['BSW','ks_products_bsw'],
    ['ES','ks_products_es'],['GWS','ks_products_gws'],['KEYPLC','ks_products_keyplc'],
    ['MANIFOLD','ks_products_manifold'],['MOTOR','ks_products_motor'],['COUPLING','ks_products_coupling']
  ] loop
    fam:=spec[1];tbl:=spec[2];
    for r in execute format('select to_jsonb(t) from public.%I t',tbl) loop
      key:=fam||':'||(r->>'id'); family:=fam;
      model:=r->>'model'; brand:=case when fam='GWS' then 'GWS' when fam='KEYPLC' then 'KeyPLC' else 'B.G.Reich' end;
      if fam='MANIFOLD' then model:=model||' · '||(r->>'section');end if;
      if fam='COUPLING' then model:=model||' · '||(r->>'component_type');end if;
      if fam='GWS' then model:=model||' · '||coalesce(r->>'series_code','')||' · '||coalesce(r->>'pressure_bar','')||' Bar';end if;
      cs:='[]';
      if fam in ('CHC_G1','CHC_G2','CR','KV') then
        foreach code in array case when fam like 'CHC%' then array['CHC','CHCS','CHCN'] when fam='CR' then array['CR','CRS','CRN'] else array['KV','KVC','KVN'] end loop
          cs:=cs||jsonb_build_array(jsonb_build_object('code',code,'label',code));
        end loop;
      elsif fam='BFI' then
        foreach code in array array['BFI:1Ph','BFI:3Ph','BFIN:1Ph','BFIN:3Ph'] loop
          if coalesce((r->>case when code like '%1Ph' then 'has_1ph' else 'has_3ph' end)::boolean,true) then
            cs:=cs||jsonb_build_array(jsonb_build_object('code',code,'label',code));
          end if;
        end loop;
      elsif fam in ('ES','KEYPLC','MANIFOLD') then
        for v in select value from jsonb_array_elements(r->'variants') loop
          if fam='ES' and v->>'material' not in ('CI / SS / SS / MS','CI / SS / SS / GP','CI / CI / SS / MS','CI / CI / SS / GP','SS304','SS316') then continue;end if;
          code:=case when fam='ES' then v->>'material' when fam='KEYPLC' then 'P'||(v->>'pumpQty') else v->>'code' end;
          label:=coalesce(v->>'label',v->>'material',code);
          cs:=cs||jsonb_build_array(jsonb_build_object('code',code,'label',label));
        end loop;
      elsif fam in ('BSV','BSW') then
        for v in execute format('select to_jsonb(t) from public.%I t where model=$1',case when fam='BSV' then 'ks_bsv_variant_availability_v50043' else 'ks_bsw_variant_availability_v50036' end) using r->>'model' loop
          if fam='BSV' and v->>'variant' not in ('MA','T') then continue;end if;
          cs:=cs||jsonb_build_array(jsonb_build_object('code',v->>'variant','label',coalesce(v->>'variant_label',v->>'variant')));
        end loop;
      else cs:=jsonb_build_array(jsonb_build_object('code','SKU','label','Standard'));end if;
      choices:=cs;return next;
    end loop;
  end loop;
  return query select s.key,s.family,s.model,s.brand,s.choices from keystock.static_refs s;
  -- Component price rows retain family/kind/size/material identity.
  for r in select to_jsonb(t) from public.ks_component_prices_v50011 t loop
    key:='COMPONENT:'||jsonb_build_array(r->>'family',r->>'kind',r->>'size_group',r->>'material')::text;
    family:='COMPONENT';brand:='B.G.Reich';model:=concat_ws(' · ',r->>'family',r->>'kind',r->>'size_group',r->>'material');
    choices:='[{"code":"SKU","label":"Standard"}]';return next;
  end loop;
end $$;

create function keystock.validate_selections(c text,k text,s jsonb,linked_only boolean default false) returns void
language plpgsql set search_path='' as $$
declare g record; pair record;
begin
  if jsonb_typeof(s) is distinct from 'object' then raise exception 'Invalid selections';end if;
  for pair in select * from jsonb_each_text(s) loop
    if not exists(select 1 from keystock.options op join keystock.groups grp on grp.company_id=op.company_id and grp.id=op.group_id
      where op.company_id=c and op.id::text=pair.value and grp.id::text=pair.key and grp.item_key=k
      and not op.retired and not grp.retired and grp.kind<>'critical' and (not linked_only or grp.kind='linked')) then
      raise exception 'Invalid, retired or mismatched option';end if;
  end loop;
  for g in select * from keystock.groups where company_id=c and item_key=k and not retired and kind<>'critical' and (not linked_only or kind='linked') loop
    if not s ? g.id::text then raise exception 'Select %',g.label;end if;
  end loop;
end $$;

-- This narrow command gateway owns atomic validation and writes. Clients cannot write tables directly.
create function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c text; role_name text; can_manage boolean; can_cost boolean; cat jsonb; out jsonb; k text;
  i record; g record; o record; old record; v jsonb; x jsonb; sels jsonb; linked jsonb; snap jsonb; map_variant text;
  gid uuid; oid uuid; cid uuid; bid uuid; lid uuid; source_id uuid; target text; idmap jsonb; optionsmap jsonb; selcopy jsonb;
begin
  if auth.uid() is null or not public.keysuite_has_access() then raise exception 'Access denied' using errcode='42501';end if;
  c:=public.keysuite_current_company_id();role_name:=public.keysuite_current_role();
  if c is null or c='' then raise exception 'Company required';end if;
  can_manage:=lower(role_name) in ('owner','admin');
  can_cost:=public.keysuite_permission_level('view_costing_breakdown')<>'none';
  if p_action='state' then
    select coalesce(jsonb_agg(to_jsonb(t) order by family,model,key),'[]') into cat from keystock.catalog() t;
    out:=jsonb_build_object('catalog',cat,'can_manage',can_manage,'can_cost',can_cost);
    foreach target in array array['items','groups','options','mappings','configurations','locations','opening_balances','critical_quantities'] loop
      execute format('select coalesce(jsonb_agg(to_jsonb(t)-''company_id''),''[]'') from keystock.%I t where company_id=$1',target) into v using c;
      out:=out||jsonb_build_object(target,v);
    end loop;
    select coalesce(jsonb_agg(to_jsonb(t)-'company_id'),'[]') into v from (select * from keystock.audit where company_id=c order by id desc limit 100) t;
    out:=out||jsonb_build_object('audit',v);
    if can_cost then select coalesce(jsonb_agg(to_jsonb(t)-'company_id'),'[]') into v from keystock.purchase_costs t where company_id=c;
      out:=out||jsonb_build_object('purchase_costs',v);end if;
    return out;
  end if;
  if not can_manage then raise exception 'Only an Owner or Admin can manage KeyStock' using errcode='42501';end if;
  -- Serialize tenant writes to avoid stale configuration validation and double corrections.
  perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
  k:=p->>'item_key';
  if k is not null then
    select * into i from keystock.catalog() where key=k;
    if found then insert into keystock.items(company_id,key,family,model,brand) values(c,i.key,i.family,i.model,i.brand) on conflict do nothing;
    elsif not exists(select 1 from keystock.items where company_id=c and key=k and independent) then raise exception 'Pricelist model no longer available';end if;
  end if;
  if p_action='item' then
    k:='MANUAL:'||(p->>'id')::uuid;
    insert into keystock.items values(c,k,trim(p->>'family'),trim(p->>'model'),trim(p->>'brand'),true)
    on conflict(company_id,key) do update set model=excluded.model,brand=excluded.brand,family=excluded.family;
    if nullif(trim(p->>'model'),'') is null or nullif(trim(p->>'family'),'') is null then raise exception 'Model and family required';end if;
  elsif p_action='location' then
    insert into keystock.locations(company_id,id,label) values(c,coalesce((p->>'id')::uuid,gen_random_uuid()),trim(p->>'label'))
    on conflict(company_id,id) do update set label=excluded.label;
  elsif p_action='group' then
    gid:=(p->>'id')::uuid;
    select * into g from keystock.groups where company_id=c and id=gid;
    if found and (g.item_key<>k or g.kind<>p->>'kind') then raise exception 'Group identity and type cannot change';end if;
    insert into keystock.groups values(c,gid,k,p->>'kind',trim(p->>'label'),coalesce((p->>'sort_order')::int,0),coalesce((p->>'retired')::boolean,false))
    on conflict(company_id,id) do update set label=excluded.label,sort_order=excluded.sort_order,retired=excluded.retired;
    for v in select value from jsonb_array_elements(p->'options') loop
      oid:=(v->>'id')::uuid;
      if exists(select 1 from keystock.options where company_id=c and id=oid and group_id<>gid) then raise exception 'Option belongs to another group';end if;
      insert into keystock.options values(c,oid,gid,trim(v->>'label'),coalesce((v->>'sort_order')::int,0),coalesce((v->>'retired')::boolean,false))
      on conflict(company_id,id) do update set label=excluded.label,sort_order=excluded.sort_order,retired=excluded.retired;
    end loop;
  elsif p_action='mapping' then
    sels:=p->'selections'; perform keystock.validate_selections(c,k,sels,true);
    if sels='{}' then raise exception 'Add a Pricelist Linked group first';end if;
    if not exists(select 1 from keystock.catalog() t,jsonb_array_elements(t.choices) q where t.key=k and q->>'code'=p->>'variant') then raise exception 'Exact price configuration not found';end if;
    insert into keystock.mappings(company_id,item_key,selections,variant) values(c,k,sels,p->>'variant')
    on conflict(company_id,item_key,selections) do update set variant=excluded.variant;
  elsif p_action='copy' then
    -- Append copied definitions with fresh IDs. Existing target configurations are never overwritten.
    for target in select jsonb_array_elements_text(p->'targets') loop
      if target=k then continue;end if;
      select * into i from keystock.catalog() where key=target;
      if not found then raise exception 'Copy target missing from Pricelist';end if;
      insert into keystock.items(company_id,key,family,model,brand) values(c,i.key,i.family,i.model,i.brand) on conflict do nothing;
      idmap:='{}';optionsmap:='{}';
      for g in select * from keystock.groups where company_id=c and item_key=k and not retired loop
        gid:=gen_random_uuid();idmap:=idmap||jsonb_build_object(g.id::text,gid::text);
        insert into keystock.groups values(c,gid,target,g.kind,g.label,g.sort_order,false);
        for o in select * from keystock.options where company_id=c and group_id=g.id and not retired loop
          oid:=gen_random_uuid();optionsmap:=optionsmap||jsonb_build_object(o.id::text,oid::text);
          insert into keystock.options values(c,oid,gid,o.label,o.sort_order,false);
        end loop;
      end loop;
      -- Do not infer mappings between models; user confirms exact target combinations explicitly.
    end loop;
  elsif p_action='opening' then
    bid:=(p->>'id')::uuid;
    if exists(select 1 from keystock.opening_balances where company_id=c and id=bid) then return jsonb_build_object('id',bid,'already_saved',true);end if;
    if p ? 'unit_cost_myr' and not can_cost then raise exception 'Costing permission required' using errcode='42501';end if;
    sels:=coalesce(p->'selections','{}');perform keystock.validate_selections(c,k,sels,false);
    linked:='{}';snap:='{}';
    for g in select * from keystock.groups where company_id=c and item_key=k and not retired and kind<>'critical' loop
      select * into o from keystock.options where company_id=c and id=(sels->>g.id::text)::uuid;
      snap:=snap||jsonb_build_object(g.id::text,jsonb_build_object('label',g.label,'option',o.label));
      if g.kind='linked' then linked:=linked||jsonb_build_object(g.id::text,o.id::text);end if;
    end loop;
    if linked<>'{}' then select variant into map_variant from keystock.mappings where company_id=c and item_key=k and selections=linked;
    else map_variant:=nullif(p->>'variant','');end if;
    if map_variant is not null and not exists(select 1 from keystock.catalog() t,jsonb_array_elements(t.choices) q where t.key=k and q->>'code'=map_variant) then map_variant:=null;end if;
    insert into keystock.configurations(company_id,item_key,selections,variant) values(c,k,sels,coalesce(map_variant,''))
    on conflict(company_id,item_key,selections,variant) do update set item_key=excluded.item_key returning id into cid;
    lid:=nullif(p->>'location_id','')::uuid;
    source_id:=nullif(p->>'corrects','')::uuid;
    if source_id is not null then
      if nullif(trim(p->>'correction_reason'),'') is null then raise exception 'Correction reason required';end if;
      select * into old from keystock.opening_balances where company_id=c and id=source_id and voided_at is null for update;
      if not found then raise exception 'Original entry already corrected or unavailable';end if;
      update keystock.opening_balances set voided_at=now(),voided_by=auth.uid(),void_reason=p->>'correction_reason' where company_id=c and id=source_id;
    end if;
    select * into i from keystock.items where company_id=c and key=k;
    snap:=jsonb_build_object('model',i.model,'brand',i.brand,'selections',snap,'variant',coalesce(map_variant,'Unmapped'),'critical',coalesce(p->'critical','[]'),'corrects',source_id);
    insert into keystock.opening_balances(company_id,id,configuration_id,location_id,quantity,supplier,remarks,snapshot,created_by)
      values(c,bid,cid,lid,(p->>'quantity')::numeric,coalesce(p->>'supplier',''),coalesce(p->>'remarks',''),snap,auth.uid());
    for v in select value from jsonb_array_elements(coalesce(p->'critical','[]')) loop
      oid:=(v->>'option_id')::uuid;
      if not exists(select 1 from keystock.options op join keystock.groups grp on grp.company_id=op.company_id and grp.id=op.group_id where op.company_id=c and op.id=oid and grp.item_key=k and grp.kind='critical' and not op.retired and not grp.retired) then raise exception 'Invalid critical option';end if;
      if (v->>'missing_quantity')::numeric>(p->>'quantity')::numeric then raise exception 'Missing parts cannot exceed opening quantity';end if;
      insert into keystock.critical_quantities values(c,bid,oid,(v->>'missing_quantity')::numeric);
    end loop;
    if can_cost and p->>'unit_cost_myr' is not null then insert into keystock.purchase_costs values(c,bid,(p->>'unit_cost_myr')::numeric);end if;
    -- A non-costing admin can correct quantity/location while retaining protected cost.
    if not can_cost and source_id is not null then insert into keystock.purchase_costs select company_id,bid,unit_cost_myr from keystock.purchase_costs where company_id=c and opening_id=source_id;end if;
  else raise exception 'Unknown KeyStock command';end if;
  insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),p_action,p-'unit_cost_myr');
  return jsonb_build_object('saved',true,'id',bid,'item_key',k);
end $$;

revoke all on all functions in schema keystock from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
create function public.keysuite_stock_v100(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select keystock.api(p_action,p_payload) $$;
revoke all on function public.keysuite_stock_v100(text,jsonb) from public,anon;
grant execute on function public.keysuite_stock_v100(text,jsonb) to authenticated;
notify pgrst,'reload schema';

-- Source-file identity references; no source prices are duplicated.
insert into keystock.static_refs values
('ISO:iso-50-32-160','ISO','50-32-160','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-50-32-200','ISO','50-32-200','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-65-40-200','ISO','65-40-200','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-65-40-250','ISO','65-40-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-65-40-315','ISO','65-40-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-65-50-160','ISO','65-50-160','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-80-50-200','ISO','80-50-200','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-80-50-250','ISO','80-50-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-80-50-315','ISO','80-50-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-80-65-160','ISO','80-65-160','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-100-65-200','ISO','100-65-200','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-100-65-250','ISO','100-65-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-100-65-315','ISO','100-65-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-100-65-315s','ISO','100-65-315s','B.G.Reich','[{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"}]'),
('ISO:iso-100-80-160','ISO','100-80-160','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-125-80-400','ISO','125-80-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-125-100-200','ISO','125-100-200','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-125-100-250','ISO','125-100-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-125-100-315','ISO','125-100-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-125-100-400','ISO','125-100-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-125-100-500','ISO','125-100-500','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-150-125-250','ISO','150-125-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-150-125-315','ISO','150-125-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-150-125-400','ISO','150-125-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-150-125-500','ISO','150-125-500','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-200-150-315','ISO','200-150-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-200-150-400','ISO','200-150-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-200-150-500','ISO','200-150-500','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-250-200-200','ISO','250-200-200','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-250-200-250','ISO','250-200-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-250-200-315','ISO','250-200-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-250-200-400','ISO','250-200-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-250-200-500','ISO','250-200-500','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-300-250-250','ISO','300-250-250','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-300-250-315','ISO','300-250-315','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-300-250-400','ISO','300-250-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-300-250-500','ISO','300-250-500','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-350-300-400','ISO','350-300-400','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('ISO:iso-350-300-500','ISO','350-300-500','B.G.Reich','[{"code":"CI / BR / SS / MS","label":"CI / BR / SS / MS"},{"code":"CI / SS / SS / MS","label":"CI / SS / SS / MS"},{"code":"CI / CI / SS / MS","label":"CI / CI / SS / MS"},{"code":"CI / BR / SS / GP","label":"CI / BR / SS / GP"},{"code":"CI / SS / SS / GP","label":"CI / SS / SS / GP"},{"code":"CI / CI / SS / GP","label":"CI / CI / SS / GP"},{"code":"SS304","label":"SS304"},{"code":"SS316","label":"SS316"},{"code":"Duplex 2205","label":"Duplex 2205"},{"code":"Duplex 2507","label":"Duplex 2507"}]'),
('BASEPLATE:1½" x 3"','BASEPLATE','1½" x 3"','B.G.Reich','[{"code":"C_CHANNEL","label":"1½\" x 3\" · dimension-based costing"}]'),
('BASEPLATE:2" x 4"','BASEPLATE','2" x 4"','B.G.Reich','[{"code":"C_CHANNEL","label":"2\" x 4\" · dimension-based costing"}]'),
('BASEPLATE:2½" x 5"','BASEPLATE','2½" x 5"','B.G.Reich','[{"code":"C_CHANNEL","label":"2½\" x 5\" · dimension-based costing"}]'),
('BASEPLATE:3" x 6"','BASEPLATE','3" x 6"','B.G.Reich','[{"code":"C_CHANNEL","label":"3\" x 6\" · dimension-based costing"}]'),
('BASEPLATE:3½" x 7"','BASEPLATE','3½" x 7"','B.G.Reich','[{"code":"C_CHANNEL","label":"3½\" x 7\" · dimension-based costing"}]'),
('BASEPLATE:3½" x 8"','BASEPLATE','3½" x 8"','B.G.Reich','[{"code":"C_CHANNEL","label":"3½\" x 8\" · dimension-based costing"}]');
commit;
