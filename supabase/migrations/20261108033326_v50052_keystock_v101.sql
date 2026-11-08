begin;

alter table keystock.items add column notes text not null default '';
alter table keystock.mappings add column retired boolean not null default false;
alter table keystock.locations add column retired boolean not null default false;

create table keystock.suppliers (
  company_id text not null,
  id uuid not null default gen_random_uuid(),
  label text not null check (length(trim(label)) > 0),
  retired boolean not null default false,
  primary key (company_id,id)
);
alter table keystock.suppliers enable row level security;
revoke all on keystock.suppliers from public,anon,authenticated;

create function keystock.normal_label(value text) returns text
language sql immutable strict set search_path='' as $$
  select lower(trim(regexp_replace(value,'[[:space:]]+',' ','g')))
$$;
create unique index on keystock.suppliers(company_id,keystock.normal_label(label));
alter table keystock.opening_balances add column supplier_id uuid;
alter table keystock.opening_balances add foreign key(company_id,supplier_id) references keystock.suppliers;
create index on keystock.opening_balances(company_id,supplier_id);

insert into keystock.suppliers(company_id,label)
select company_id,min(trim(supplier)) from keystock.opening_balances
where keystock.normal_label(supplier)<>''
group by company_id,keystock.normal_label(supplier);

update keystock.opening_balances b set supplier_id=s.id
from keystock.suppliers s where s.company_id=b.company_id
and keystock.normal_label(s.label)=keystock.normal_label(b.supplier);

create function keystock.allowed_family(family text) returns boolean
language sql immutable strict set search_path='' as $$
  select upper(trim(family)) not in ('BASEPLATE','COMPONENT','KEYPLC','MANIFOLD')
$$;

create function keystock.group_signature(c text,g uuid) returns jsonb
language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_array(label,sort_order,retired)
    order by sort_order,label,retired),'[]')
  from keystock.options where company_id=c and group_id=g
$$;

create function keystock.group_referenced(c text,g uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from keystock.mappings where company_id=c and selections ? g::text)
      or exists(select 1 from keystock.configurations where company_id=c and selections ? g::text)
      or exists(select 1 from keystock.critical_quantities q join keystock.options o
        on o.company_id=q.company_id and o.id=q.option_id where q.company_id=c and o.group_id=g)
$$;

-- Prefer referenced records as keepers. Never change IDs, options or dependent records.
with ranked as (
  select g.*,keystock.group_referenced(g.company_id,g.id) as referenced,
    row_number() over(partition by company_id,item_key,kind,keystock.normal_label(label),sort_order,
      keystock.group_signature(company_id,id) order by keystock.group_referenced(company_id,id) desc,id) as rn
  from keystock.groups g where not retired
)
update keystock.groups g set retired=true
from ranked r where g.company_id=r.company_id and g.id=r.id
and r.rn>1 and not r.referenced;

-- Caller authenticates and holds the tenant write lock before calling this helper.
create function keystock.copy_setup(c text, source_key text, p jsonb, copy_mappings boolean)
returns jsonb language plpgsql set search_path='' as $$
declare
  target_key text; target_model record; source_model record; grp record; opt record; mapping record;
  pair record; new_group uuid; new_option uuid; match_count integer; mapped jsonb; existing record;
  copied integer:=0; skipped integer:=0; failed integer:=0; unmapped integer:=0;
  added integer; missed integer; eligible integer:=0; catalogue jsonb;
begin
  select jsonb_object_agg(t.key,to_jsonb(t)) into catalogue from keystock.catalog() t;
  select * into source_model from jsonb_to_record(catalogue->source_key)
    as src(key text,family text,model text,brand text,choices jsonb) where src.key is not null;
  if copy_mappings and not found then raise exception 'A Pricelist source is required';end if;
  for target_key in select distinct value from jsonb_array_elements_text(p->'targets') loop
    if target_key=source_key then skipped:=skipped+1;continue;end if;
    select * into target_model from jsonb_to_record(catalogue->target_key)
      as dest(key text,family text,model text,brand text,choices jsonb) where dest.key is not null;
    if not found then
      select i.key,i.family,i.model,i.brand,'[]'::jsonb as choices into target_model
      from keystock.items i where i.company_id=c and i.key=target_key and i.independent
        and keystock.allowed_family(i.family);
    end if;
    if not found then failed:=failed+1;continue;end if;
    if copy_mappings and target_model.family<>source_model.family then
      failed:=failed+1;unmapped:=unmapped+1;continue;
    end if;
    insert into keystock.items(company_id,key,family,model,brand)
      values(c,target_key,target_model.family,target_model.model,target_model.brand) on conflict do nothing;
    if not copy_mappings then
      added:=0;
      for grp in select * from keystock.groups where company_id=c and item_key=source_key
        and not retired order by sort_order,id
      loop
        if exists(select 1 from keystock.groups where company_id=c and item_key=target_key and not retired
          and kind=grp.kind and keystock.normal_label(label)=keystock.normal_label(grp.label)) then continue;end if;
        new_group:=gen_random_uuid();
        insert into keystock.groups values(c,new_group,target_key,grp.kind,grp.label,grp.sort_order,false);
        insert into keystock.options(company_id,group_id,label,sort_order)
          select c,new_group,label,sort_order from keystock.options
          where company_id=c and group_id=grp.id and not retired;
        added:=added+1;
      end loop;
      if added>0 then copied:=copied+1;else skipped:=skipped+1;end if;
    else
      for mapping in select * from keystock.mappings m
        where m.company_id=c and m.item_key=source_key and not m.retired
        and (p->'mapping_ids' is null or (p->'mapping_ids') ? m.id::text)
      loop
        eligible:=eligible+1;
        mapped:='{}';missed:=0;
        if not exists(select 1 from jsonb_array_elements(target_model.choices) q where q->>'code'=mapping.variant) then
          failed:=failed+1;unmapped:=unmapped+1;continue;
        end if;
        begin
          perform keystock.validate_selections(c,source_key,mapping.selections,true);
        exception when raise_exception then
          failed:=failed+1;unmapped:=unmapped+1;continue;
        end;
        for pair in select * from jsonb_each_text(mapping.selections) loop
          select * into grp from keystock.groups where company_id=c and id=pair.key::uuid;
          select * into opt from keystock.options where company_id=c and id=pair.value::uuid;
          select count(*),min(id::text)::uuid into match_count,new_group
          from keystock.groups where company_id=c and item_key=target_key and kind='linked'
            and not retired and keystock.normal_label(label)=keystock.normal_label(grp.label);
          if match_count<>1 then missed:=1;exit;end if;
          select count(*),min(id::text)::uuid into match_count,new_option
          from keystock.options where company_id=c and group_id=new_group and not retired
            and keystock.normal_label(label)=keystock.normal_label(opt.label);
          if match_count<>1 or mapped ? new_group::text then missed:=1;exit;end if;
          mapped:=mapped||jsonb_build_object(new_group::text,new_option::text);
        end loop;
        if missed>0 or mapped='{}' or exists(select 1 from keystock.groups
          where company_id=c and item_key=target_key and kind='linked' and not retired and not (mapped ? id::text)) then
          failed:=failed+1;unmapped:=unmapped+1;continue;
        end if;
        select * into existing from keystock.mappings
          where company_id=c and item_key=target_key and selections=mapped;
        if found then
          if not existing.retired and existing.variant=mapping.variant then skipped:=skipped+1;
          else failed:=failed+1;end if;
        else
          insert into keystock.mappings(company_id,item_key,selections,variant)
            values(c,target_key,mapped,mapping.variant);
          copied:=copied+1;
        end if;
      end loop;
    end if;
  end loop;
  return jsonb_build_object('copied',copied,'skipped',skipped,'failed',failed,'unmapped',unmapped,'attempted_mappings',eligible);
end $$;

create function keystock.permissions(c text,role_name text) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_object_agg(k,coalesce(
    (select permissions->>k='full' from public.ks_role_permissions where company_id::text=c and role=role_name),
    coalesce(role_name in ('owner','admin'),false)))
  from unnest(array['add_stock_model','edit_stock_model','delete_stock_model','delete_stock_mapping',
    'manage_stock_locations','manage_stock_suppliers']) k
$$;

create or replace function keystock.catalog() returns table(key text,family text,model text,brand text,choices jsonb)
language plpgsql stable set search_path='' as $$
declare spec text[]; r jsonb; v jsonb; cs jsonb; code text; label text; tbl text; fam text;
begin
  foreach spec slice 1 in array array[
    ['CHC_G1','ks_products_chc_g1'],['CHC_G2','ks_products_chc'],['CR','ks_products_cr'],['KV','ks_products_kv'],
    ['BFI','ks_products_bfi'],['BGF','ks_products_bgf'],['BSV','ks_bsv_products_v50043'],['BSW','ks_products_bsw'],
    ['ES','ks_products_es'],['GWS','ks_products_gws'],['MOTOR','ks_products_motor'],['COUPLING','ks_products_coupling']
  ] loop
    fam:=spec[1];tbl:=spec[2];
    if not keystock.allowed_family(fam) then continue;end if;
    for r in execute format('select to_jsonb(t) from public.%I t',tbl) loop
      key:=fam||':'||(r->>'id'); family:=fam;
      model:=r->>'model'; brand:=case when fam='GWS' then 'GWS' else 'B.G.Reich' end;
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
      elsif fam='ES' then
        for v in select value from jsonb_array_elements(r->'variants') loop
          if v->>'material' not in ('CI / SS / SS / MS','CI / SS / SS / GP','CI / CI / SS / MS','CI / CI / SS / GP','SS304','SS316') then continue;end if;
          code:=v->>'material';
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
  return query select s.key,s.family,s.model,s.brand,s.choices from keystock.static_refs s
    where keystock.allowed_family(s.family);
end $$;

create or replace function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c text; role_name text; can_manage boolean; can_cost boolean; cat jsonb; out jsonb; k text;
  i record; g record; o record; old record; v jsonb; x jsonb; sels jsonb; linked jsonb; snap jsonb; map_variant text;
  caps jsonb; cap text; ref_id uuid; old_location uuid; old_supplier uuid; ref_label text; is_retired boolean; result jsonb;
  gid uuid; oid uuid; cid uuid; bid uuid; lid uuid; source_id uuid; target text;
begin
  if auth.uid() is null or public.keysuite_has_access() is not true then raise exception 'Access denied' using errcode='42501';end if;
  c:=public.keysuite_current_company_id();role_name:=lower(public.keysuite_current_role());
  if c is null or c='' then raise exception 'Company required';end if;
  can_manage:=coalesce(role_name in ('owner','admin'),false);
  caps:=keystock.permissions(c,role_name);
  can_cost:=coalesce(public.keysuite_permission_level('view_costing_breakdown')<>'none',false);
  if p_action='state' then
    select coalesce(jsonb_agg(to_jsonb(t)||case when m.id is not null then
      jsonb_build_object('rating',to_jsonb(m)->>'hp','rating_unit','HP') else '{}'::jsonb end
      order by t.family,t.model,t.key),'[]') into cat
      from keystock.catalog() t left join public.ks_products_motor m on t.key='MOTOR:'||m.id;
    out:=jsonb_build_object('catalog',cat,'can_manage',can_manage,'can_cost',can_cost,'permissions',caps);
    foreach target in array array['items','groups','options','mappings','configurations','locations','suppliers','opening_balances','critical_quantities'] loop
      execute format('select coalesce(jsonb_agg(to_jsonb(t)-''company_id''),''[]'') from keystock.%I t where company_id=$1%s',
        target,case when target='items' then ' and keystock.allowed_family(family)' else '' end)
        into v using c;
      out:=out||jsonb_build_object(target,v);
    end loop;
    select coalesce(jsonb_agg(to_jsonb(t)-'company_id'),'[]') into v from (select * from keystock.audit where company_id=c order by id desc limit 100) t;
    out:=out||jsonb_build_object('audit',v,'duplicate_groups',(
      select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (
        select item_key,kind,keystock.normal_label(label) as label,count(*) as count
        from keystock.groups where company_id=c and not retired
        group by item_key,kind,keystock.normal_label(label) having count(*)>1
      ) d));
    if can_cost then select coalesce(jsonb_agg(to_jsonb(t)-'company_id'),'[]') into v from keystock.purchase_costs t where company_id=c;
      out:=out||jsonb_build_object('purchase_costs',v);end if;
    return out;
  end if;
  -- Serialize tenant writes to avoid stale configuration validation and double corrections.
  perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
  k:=p->>'item_key';
  cap:=case p_action when 'item' then case when exists(select 1 from keystock.items
      where company_id=c and key='MANUAL:'||(p->>'id')::uuid and independent)
      then 'edit_stock_model' else 'add_stock_model' end
    when 'delete_item' then 'delete_stock_model'
    when 'delete_mapping' then 'delete_stock_mapping'
    when 'location' then 'manage_stock_locations'
    when 'supplier' then 'manage_stock_suppliers' end;
  if (cap is not null and (caps->>cap)::boolean is not true)
    or (cap is null and not can_manage) then
    raise exception 'KeyStock permission required' using errcode='42501';
  end if;
  if k is not null then
    select * into i from keystock.catalog() where key=k;
    if found then insert into keystock.items(company_id,key,family,model,brand) values(c,i.key,i.family,i.model,i.brand) on conflict do nothing;
    elsif not exists(select 1 from keystock.items where company_id=c and key=k and independent and keystock.allowed_family(family)) then raise exception 'Pricelist model no longer available';end if;
  end if;
  if p_action='item' then
    k:='MANUAL:'||(p->>'id')::uuid;
    if nullif(trim(p->>'model'),'') is null or nullif(trim(p->>'family'),'') is null
      or nullif(trim(p->>'brand'),'') is null then raise exception 'Model, family and brand required';end if;
    if not keystock.allowed_family(p->>'family') then raise exception 'This family is excluded from KeyStock';end if;
    insert into keystock.items(company_id,key,family,model,brand,independent,notes)
      values(c,k,trim(p->>'family'),trim(p->>'model'),trim(p->>'brand'),true,coalesce(p->>'notes',''))
    on conflict(company_id,key) do update set model=excluded.model,brand=excluded.brand,
      family=excluded.family,notes=coalesce(p->>'notes',keystock.items.notes)
    where keystock.items.independent;
  elsif p_action='delete_item' then
    if not exists(select 1 from keystock.items where company_id=c and key=k and independent)
      then raise exception 'Only manual models can be deleted';end if;
    if exists(select 1 from keystock.configurations where company_id=c and item_key=k)
      or exists(select 1 from keystock.groups where company_id=c and item_key=k)
      or exists(select 1 from keystock.mappings where company_id=c and item_key=k)
      then raise exception 'Model has stock history or setup and cannot be deleted';end if;
    delete from keystock.items where company_id=c and key=k and independent;
  elsif p_action in ('location','supplier') then
    target:=case when p_action='location' then 'locations' else 'suppliers' end;
    ref_id:=coalesce((p->>'id')::uuid,gen_random_uuid());
    ref_label:=trim(p->>'label');
    is_retired:=coalesce((p->>'retired')::boolean,false);
    if nullif(keystock.normal_label(ref_label),'') is null then raise exception 'Name required';end if;
    execute format('select exists(select 1 from keystock.%I where company_id=$1 and id<>$2
      and keystock.normal_label(label)=keystock.normal_label($3))',target)
      into found using c,ref_id,ref_label;
    if found then raise exception 'This name or code already exists';end if;
    execute format('insert into keystock.%I(company_id,id,label,retired) values($1,$2,$3,$4)
      on conflict(company_id,id) do update set label=excluded.label,retired=excluded.retired',target)
      using c,ref_id,ref_label,is_retired;
    result:=jsonb_build_object('id',ref_id);
  elsif p_action='group' then
    gid:=(p->>'id')::uuid;
    select * into g from keystock.groups where company_id=c and id=gid;
    if found and (g.item_key<>k or g.kind<>p->>'kind') then raise exception 'Group identity and type cannot change';end if;
    if (g.id is null or g.retired or keystock.normal_label(g.label)<>keystock.normal_label(p->>'label'))
      and exists(select 1 from keystock.groups where company_id=c and item_key=k and id<>gid
        and kind=p->>'kind' and not retired and keystock.normal_label(label)=keystock.normal_label(p->>'label'))
      then raise exception 'A group of this type and label already exists';end if;
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
    select * into old from keystock.mappings where company_id=c and item_key=k and selections=sels;
    if found and (old.variant<>p->>'variant' or old.retired) then
      insert into keystock.audit(company_id,actor,action,detail)
        values(c,auth.uid(),'mapping_previous',to_jsonb(old)-'company_id');
    end if;
    insert into keystock.mappings(company_id,item_key,selections,variant) values(c,k,sels,p->>'variant')
    on conflict(company_id,item_key,selections) do update set variant=excluded.variant,retired=false;
  elsif p_action='delete_mapping' then
    update keystock.mappings set retired=true
      where company_id=c and item_key=k and id=(p->>'id')::uuid and not retired returning * into old;
    if not found then raise exception 'Active mapping not found';end if;
    result:=jsonb_build_object('mapping',to_jsonb(old)-'company_id');
  elsif p_action in ('copy','copy_mappings') then
    result:=keystock.copy_setup(c,k,p,p_action='copy_mappings');
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
    if linked<>'{}' then select variant into map_variant from keystock.mappings where company_id=c and item_key=k and selections=linked and not retired;
    else map_variant:=nullif(p->>'variant','');end if;
    if map_variant is not null and not exists(select 1 from keystock.catalog() t,jsonb_array_elements(t.choices) q where t.key=k and q->>'code'=map_variant) then map_variant:=null;end if;
    lid:=nullif(p->>'location_id','')::uuid;
    source_id:=nullif(p->>'corrects','')::uuid;
    if source_id is not null then
      if nullif(trim(p->>'correction_reason'),'') is null then raise exception 'Correction reason required';end if;
      select * into old from keystock.opening_balances where company_id=c and id=source_id and voided_at is null for update;
      if not found then raise exception 'Original entry already corrected or unavailable';end if;
      if not exists(select 1 from keystock.configurations where company_id=c and id=old.configuration_id and item_key=k)
        then raise exception 'Correction must use the original model';end if;
      select * into i from keystock.configurations where company_id=c and id=old.configuration_id;
      if sels=i.selections and (linked<>'{}' or coalesce(p->>'variant','')=i.variant) then
        map_variant:=nullif(i.variant,'');
      end if;
      old_location:=old.location_id;old_supplier:=old.supplier_id;
      update keystock.opening_balances set voided_at=now(),voided_by=auth.uid(),void_reason=p->>'correction_reason' where company_id=c and id=source_id;
    end if;
    insert into keystock.configurations(company_id,item_key,selections,variant) values(c,k,sels,coalesce(map_variant,''))
    on conflict(company_id,item_key,selections,variant) do update set item_key=excluded.item_key returning id into cid;
    if lid is not null and not exists(select 1 from keystock.locations
      where company_id=c and id=lid and (not retired or id=old_location))
      then raise exception 'Location is unavailable or retired';end if;
    ref_id:=nullif(p->>'supplier_id','')::uuid;
    if ref_id is not null then
      select label into ref_label from keystock.suppliers where company_id=c and id=ref_id
        and (not retired or id=old_supplier);
      if not found then raise exception 'Supplier is unavailable or retired';end if;
    elsif not (p ? 'supplier_id') then
      -- Keep the old UI's free text as a historical snapshot.
      ref_label:=p->>'supplier';
      select id into ref_id from keystock.suppliers where company_id=c and not retired
        and keystock.normal_label(label)=keystock.normal_label(ref_label);
    end if;
    select * into i from keystock.items where company_id=c and key=k;
    snap:=jsonb_build_object('model',i.model,'brand',i.brand,'selections',snap,'variant',coalesce(map_variant,'Unmapped'),'critical',coalesce(p->'critical','[]'),'corrects',source_id);
    insert into keystock.opening_balances(company_id,id,configuration_id,location_id,quantity,supplier,supplier_id,remarks,snapshot,created_by)
      values(c,bid,cid,lid,(p->>'quantity')::numeric,coalesce(ref_label,''),ref_id,coalesce(p->>'remarks',''),snap,auth.uid());
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
  insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),p_action,jsonb_build_object('item_key',k,'id',coalesce(bid::text,p->>'id'),
      'result',result));
  return jsonb_build_object('saved',true,'id',bid,'item_key',k)||coalesce(result,'{}');
end $$;

revoke all on all functions in schema keystock from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
