begin;
create or replace function keystock.category_rule_v50089(p_category_id text,p_product_code text,p_rule jsonb,p_name text default null)
returns void language plpgsql security definer set search_path='' as $$
declare rules jsonb; merged jsonb; f text;
begin
 if auth.uid() is null or public.keysuite_has_access() is not true or lower(public.keysuite_current_role()) is distinct from 'owner' then raise exception 'Owner permission required'; end if;
 if p_product_code is null or p_product_code not in ('BASEPLATE','BFI','BGF','G','BSV','BSW','CHC_G1','CHC_G2','COUPLING','CR','ES','GWS','ISO','KEYPLC','KV','MANIFOLD','MOTOR') then raise exception 'Unknown product family'; end if;
 if jsonb_typeof(p_rule->'currencies') is distinct from 'array' or exists(select 1 from jsonb_array_elements_text(p_rule->'currencies') s where s is null or s not in ('USD','RMB','MYR','STOCK')) then raise exception 'Invalid sources'; end if;
 foreach f in array array['margin','normal','rare','trimming','transport'] loop
 if jsonb_typeof(p_rule->f) is distinct from 'number' or (p_rule->>f)::numeric<0 or (f in ('margin','normal','rare') and (p_rule->>f)::numeric>=1) then raise exception 'Invalid %',f; end if; end loop;
 foreach f in array array['useCommission','useSetDiscount','useFinalDiscount','useFuelCharge'] loop
 if jsonb_typeof(p_rule->f) is distinct from 'boolean' then raise exception 'Invalid %',f; end if; end loop;
 select coalesce(product_rules,'{}') into strict rules from public.ks_pricing_categories where id::text=p_category_id and (not (to_jsonb(ks_pricing_categories) ? 'company_id') or to_jsonb(ks_pricing_categories)->>'company_id'=public.keysuite_current_company_id()) and is_active is distinct from false for update;
 merged:=coalesce(rules->p_product_code,'{}')||p_rule;
 rules:=jsonb_set(rules,array[p_product_code],merged);
 if p_product_code='CHC_G2' then rules:=jsonb_set(rules,'{CHC}',coalesce(rules->'CHC','{}')||p_rule); end if;
 if p_name is not null then perform public.keysuite_rename_pricing_category(p_category_id,p_name); end if;
 if p_product_code='CHC_G2' then
  update public.ks_pricing_categories set product_rules=rules,chc_margin=(p_rule->>'margin')::numeric,transport=(p_rule->>'transport')::numeric where id::text=p_category_id and (not (to_jsonb(ks_pricing_categories) ? 'company_id') or to_jsonb(ks_pricing_categories)->>'company_id'=public.keysuite_current_company_id());
 else
  update public.ks_pricing_categories set product_rules=rules where id::text=p_category_id and (not (to_jsonb(ks_pricing_categories) ? 'company_id') or to_jsonb(ks_pricing_categories)->>'company_id'=public.keysuite_current_company_id());
 end if;
 if not found then raise exception 'Category could not be saved'; end if;
end $$;
revoke all on function keystock.category_rule_v50089(text,text,jsonb,text) from public,anon; grant execute on function keystock.category_rule_v50089(text,text,jsonb,text) to authenticated;
create or replace function public.keysuite_category_rule_v50088(p_category_id text,p_product_code text,p_rule jsonb,p_name text default null)
returns void language sql security invoker set search_path='' as $$ select keystock.category_rule_v50089(p_category_id,p_product_code,p_rule,p_name) $$;
create or replace function keystock.ledger_permissions(c text, r text) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_object_agg(k,coalesce(
    (select permissions->>k='full' from public.ks_role_permissions where company_id::text=c and role=r),
    k='view_stock' or r='owner' or (r='admin' and k not in ('view_stock_cost','delete_stock_batch'))))
  from unnest(array['view_stock','receive_stock','manage_stock_dropdowns','reserve_stock',
    'confirm_stock_out','adjust_stock','move_stock','view_stock_cost','delete_stock_batch']) k
$$;
create or replace function keystock.quotation_costs_v50088() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tenant text:=public.keysuite_current_company_id(); result jsonb;
begin
 if auth.uid() is null or public.keysuite_has_access() is not true or nullif(tenant,'') is null
 or (keystock.ledger_permissions(tenant,lower(public.keysuite_current_role()))->>'view_stock')::boolean is not true
 or (keystock.ledger_permissions(tenant,lower(public.keysuite_current_role()))->>'view_stock_cost')::boolean is not true
 or coalesce(public.keysuite_permission_level('view_costing_breakdown'),'none')='none'
 then return '[]'; end if;
 select coalesce(jsonb_agg(to_jsonb(cost_row)),'[]') into result from (
 select cfg.item_key,i.model,i.brand,cfg.id,cfg.variant,
 not exists(select 1 from jsonb_object_keys(cfg.selections) s where not exists
 (select 1 from keystock.groups g where g.company_id=tenant and g.id::text=s and g.kind='linked')) as variant_only,
 max(l.unit_cost_myr) as cost,sum(p.quantity-coalesce((select sum(a.remaining) from keystock.allocations a
 where a.company_id=tenant and a.position_id=p.id),0)) as available
 from keystock.positions p join keystock.lots l on (l.company_id,l.id)=(p.company_id,p.lot_id)
 join keystock.configurations cfg on (cfg.company_id,cfg.id)=(p.company_id,p.configuration_id)
 join keystock.items i on (i.company_id,i.key)=(cfg.company_id,cfg.item_key)
 where p.company_id=tenant and p.quantity>0 and not i.independent and keystock.allowed_family(i.family)
 group by cfg.company_id,cfg.id,cfg.item_key,cfg.variant,cfg.selections,i.brand,i.model
 ) cost_row;
 return result;
end $$;
create or replace function keystock.legacy_api(p_action text,p jsonb default '{}') returns jsonb
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
  can_cost:=(keystock.ledger_permissions(c,role_name)->>'view_stock_cost')::boolean;
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
create or replace function keystock.api_v102(p_action text,p jsonb default '{}') returns jsonb
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
  can_cost:=(keystock.ledger_permissions(c,role_name)->>'view_stock_cost')::boolean;
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
create or replace function keystock.receive_stock(c text, req uuid, p jsonb, d date, can_cost boolean)
returns void language plpgsql volatile set search_path='' as $$
declare row_data jsonb; config uuid; location uuid; supplier_id uuid; supplier text; lot uuid;
  position uuid; q numeric; cost numeric; names text[]; product text; family text; required boolean; receipt_variant text:=p->>'shared_variant'; row_variant text;
begin
  if jsonb_typeof(p->'rows') is distinct from 'array' then raise exception 'Add at least one receiving row'; end if;
  if jsonb_array_length(p->'rows') not between 1 and 200 then raise exception 'Add 1 to 200 receiving rows'; end if;
  supplier_id:=(p->>'supplier_id')::uuid;
  select s.label into supplier from keystock.suppliers s where s.company_id=c and s.id=supplier_id and not s.retired;
  if not found then raise exception 'Select an active supplier'; end if;
  for row_data in select value from jsonb_array_elements(p->'rows') loop
    product:=row_data->>'item_key';
    config:=keystock.receipt_configuration(c,product,coalesce(row_data->'selections','{}'),coalesce(row_data->>'variant',''));
    select coalesce(variant,'') into strict row_variant from keystock.configurations where company_id=c and id=config;
    receipt_variant:=coalesce(receipt_variant,row_variant);
    if row_variant<>receipt_variant then raise exception 'Configuration mismatch for %',product; end if;
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
    if ((required and not (p ? 'shared_variant')) or cardinality(names)>0) and cardinality(names)<>q then
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
create or replace function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c text; permissions jsonb; series text; label_text text; obj uuid; g keystock.groups%rowtype;
 o keystock.options%rowtype; m keystock.series_mappings%rowtype; sels jsonb; chosen text; expected integer; answer jsonb;
begin
 if auth.uid() is null or public.keysuite_has_access() is not true then raise exception 'Access denied' using errcode='42501'; end if;
 c:=public.keysuite_current_company_id();
 if coalesce(c,'')='' then raise exception 'Company required'; end if;
 permissions:=keystock.ledger_permissions(c,lower(public.keysuite_current_role()));
 if (permissions->>'view_stock')::boolean is not true then raise exception 'View Stock permission required' using errcode='42501'; end if;
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>4000000 then raise exception 'Invalid stock request'; end if;
 if p_action='state' then
  if p->>'config_client' is distinct from 'v104' and exists(select 1 from keystock.groups where company_id=c and series_key is not null and kind='linked') then
   raise exception 'Refresh into KeyStock V1.04'; end if;
  return keystock.api_v103(p_action,case when p->>'config_client'='v104' then p||'{"config_client":"v103"}' else p end)||jsonb_build_object('config_version','v104',
   'series_mappings',coalesce((select jsonb_agg(to_jsonb(t) order by id) from keystock.series_mappings t where company_id=c),'[]'));
 end if;
 perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
 if p_action='location' and coalesce((p->>'retired')::boolean,false) and exists(select 1 from keystock.positions where company_id=c and location_id=(p->>'id')::uuid and quantity>0) then raise exception 'Move the remaining stock before deactivating this location'; end if;
 if p_action in ('delete_supplier','delete_location') then
   series:=substring(p_action from 8);
   if (keystock.permissions(c,lower(public.keysuite_current_role()))->>('manage_stock_'||series||'s'))::boolean is not true then raise exception 'Management permission required'; end if;
   obj:=(p->>'id')::uuid;
   execute format('select id from keystock.%I where company_id=$1 and id=$2 for update',series||'s') into strict obj using c,obj;
   if series='location' and exists(select 1 from keystock.positions where company_id=c and location_id=obj and quantity>0) then raise exception 'Location contains stock'; end if;
   begin
     execute format('delete from keystock.%I where company_id=$1 and id=$2',series||'s') using c,obj;
     answer:='{"deleted":true}';
   exception when foreign_key_violation then
     execute format('update keystock.%I set retired=true where company_id=$1 and id=$2',series||'s') using c,obj;
     answer:='{"retired":true}';
   end;
   insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),p_action,answer||jsonb_build_object('id',obj));
   return answer;
 end if;
 if p_action='cancel_batch' then
   if (permissions->>'delete_stock_batch')::boolean is not true then raise exception 'Delete Stock Batch permission required'; end if;
   obj:=(p->>'position')::uuid;
   label_text:=nullif(trim(p->>'reason'),'');
   if label_text is null then raise exception 'Cancellation reason required'; end if;
   if exists(select 1 from keystock.allocations where company_id=c and position_id=obj and remaining>0) then raise exception 'Release active reservations first'; end if;
   select id into strict obj from keystock.positions where company_id=c and id=obj and quantity>0 for update;
   if not exists(select 1 from keystock.stock_events e join keystock.positions t on t.company_id=e.company_id and t.id=e.destination_id where t.company_id=c and t.id=obj and e.kind='receive' and e.quantity=t.quantity)
     or exists(select 1 from keystock.stock_events where company_id=c and (source_id=obj or destination_id=obj) and kind not in ('receive','reserve','release')) then raise exception 'This batch requires a controlled stock correction'; end if;
   declare reversal uuid; serials text[]; begin
     select array_agg(serial order by serial_key) into serials from keystock.serial_units where company_id=c and position_id=obj;
     select keystock.ledger_event(c,(p->>'request_id')::uuid,'write_off',current_date,obj,null,t.quantity,coalesce(serials,'{}'),null,null,'',label_text,'Batch cancellation','') into reversal from keystock.positions t where t.company_id=c and t.id=obj;
     update keystock.serial_units set position_id=null,issued_by_event=reversal where company_id=c and position_id=obj;
     update keystock.positions set quantity=0 where company_id=c and id=obj;
     insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),p_action,jsonb_build_object('position',obj,'reason',label_text,'event',reversal));
   end;
   return '{"cancelled":true}';
 end if;
 if p_action in ('arrangement_save','arrangement_delete','link_option_save','link_option_delete','series_mapping_save','series_mapping_delete') then
  if (permissions->>'manage_stock_dropdowns')::boolean is not true then raise exception 'Manage Dropdowns permission required' using errcode='42501'; end if;
  if p->>'config_client' is distinct from 'v104' then raise exception 'Refresh into KeyStock V1.04'; end if;
  series:=p->>'series_key'; obj:=(p->>'id')::uuid;
  if not exists(select 1 from keystock.catalog() where family=series) then raise exception 'Unknown catalogue series'; end if;
  label_text:=regexp_replace(btrim(p->>'label'),'\s+',' ','g');
  if p_action in ('arrangement_save','link_option_save') and (coalesce(length(label_text),0)=0 or length(label_text)>120) then
   raise exception 'Enter a name of 1–120 characters'; end if;
  if p_action like 'arrangement_%' then
   if exists(select 1 from keystock.groups x join keystock.catalog() t on t.key=x.item_key where x.company_id=c and t.family=series and x.kind='linked' and not x.retired) then
    raise exception 'Existing model arrangements require explicit review before shared setup'; end if;
   if obj is not null then
    select * into g from keystock.groups where company_id=c and id=obj and series_key=series and kind='linked' and not retired;
    if g.id is null then raise exception 'Arrangement unavailable'; end if;
    if g.revision is distinct from (p->>'revision')::integer then raise exception 'Arrangement changed; refresh'; end if;
   end if;
   if p_action='arrangement_delete' then
    if g.id is null then raise exception 'Select an arrangement'; end if;
    if exists(select 1 from keystock.configurations where company_id=c and selections ? obj::text)
      or exists(select 1 from keystock.series_mappings where company_id=c and not retired and selections ? obj::text) then
     raise exception 'Arrangement is referenced by mappings or stock'; end if;
    update keystock.groups set retired=true,revision=revision+1 where company_id=c and id=obj;
   else
    if exists(select 1 from keystock.groups where company_id=c and series_key=series and kind='linked' and not retired and lower(label)=lower(label_text) and id is distinct from obj) then raise exception 'Duplicate arrangement name'; end if;
    if obj is null then
     insert into keystock.groups(company_id,series_key,kind,label,sort_order) values(c,series,'linked',label_text,coalesce((p->>'sort_order')::integer,0)) returning id into obj;
    else update keystock.groups set label=label_text,sort_order=coalesce((p->>'sort_order')::integer,sort_order),revision=revision+1 where company_id=c and id=obj; end if;
   end if;
  elsif p_action like 'link_option_%' then
   select * into g from keystock.groups where company_id=c and id=(p->>'group_id')::uuid and series_key=series and kind='linked' and not retired;
   if g.id is null then raise exception 'Select an active arrangement'; end if;
   if obj is not null then
    select * into o from keystock.options where company_id=c and id=obj and group_id=g.id and not retired;
    if o.id is null then raise exception 'Option unavailable'; end if;
    if o.revision is distinct from (p->>'revision')::integer then raise exception 'Option changed; refresh'; end if;
   end if;
   if p_action='link_option_delete' then
    if o.id is null then raise exception 'Select an option'; end if;
    if exists(select 1 from keystock.configurations where company_id=c and selections->>g.id::text=obj::text)
      or exists(select 1 from keystock.series_mappings where company_id=c and not retired and selections->>g.id::text=obj::text) then
     raise exception 'Option is referenced by mappings or stock'; end if;
    update keystock.options set retired=true,revision=revision+1 where company_id=c and id=obj;
   else
    if exists(select 1 from keystock.options where company_id=c and group_id=g.id and not retired and lower(label)=lower(label_text) and id is distinct from obj) then raise exception 'Duplicate option name'; end if;
    if obj is null then
     insert into keystock.options(company_id,group_id,label) values(c,g.id,label_text) returning id into obj;
    else update keystock.options set label=label_text,revision=revision+1 where company_id=c and id=obj; end if;
   end if;
  else
   if obj is not null then
    select * into m from keystock.series_mappings where company_id=c and id=obj and series_key=series and not retired;
    if m.id is null then raise exception 'Mapping unavailable'; end if;
    if m.revision is distinct from (p->>'revision')::integer then raise exception 'Mapping changed; refresh'; end if;
   end if;
   if p_action='series_mapping_delete' then
    if m.id is null then raise exception 'Select a mapping'; end if;
    update keystock.series_mappings set retired=true,revision=revision+1 where company_id=c and id=obj;
   else
    sels:=p->'selections'; chosen:=p->>'variant';
    if jsonb_typeof(sels) is distinct from 'object' then raise exception 'Invalid mapping selections'; end if;
    select count(*) into expected from keystock.groups where company_id=c and series_key=series and kind='linked' and not retired;
    if expected=0 or (select count(*) from jsonb_object_keys(sels))<>expected then raise exception 'Select one option for every arrangement'; end if;
    if exists(select 1 from keystock.groups x where x.company_id=c and x.series_key=series and x.kind='linked' and not x.retired and not exists(
     select 1 from keystock.options op where op.company_id=c and op.group_id=x.id and not op.retired and op.id::text=sels->>x.id::text)) then raise exception 'Invalid mapping option'; end if;
    if not exists(select 1 from keystock.catalog() t,jsonb_array_elements(t.choices) v where t.family=series and v->>'code'=chosen) then raise exception 'Exact Pricelist configuration not found'; end if;
    if exists(select 1 from keystock.series_mappings where company_id=c and series_key=series and selections=sels and not retired and id is distinct from obj) then raise exception 'Duplicate or ambiguous combination: edit its existing mapping'; end if;
    if obj is null then
     insert into keystock.series_mappings(company_id,series_key,selections,variant) values(c,series,sels,chosen) returning id into obj;
    else update keystock.series_mappings set selections=sels,variant=chosen,revision=revision+1 where company_id=c and id=obj; end if;
   end if;
  end if;
  answer:=jsonb_build_object('id',obj,'series_key',series);
  insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),p_action,answer||p);
  return answer||'{"saved":true}';
 end if;
 -- Older mutation paths must not bypass shared mapping validation.
 if p_action in ('group','copy','mapping','copy_mappings','delete_mapping') and exists(select 1 from keystock.groups where company_id=c and series_key is not null and kind='linked' and not retired) then
  raise exception 'Use the series Pricelist Link editor'; end if;
 if starts_with(p_action,'ledger_') and p->>'config_client' is distinct from 'v104' and exists(select 1 from keystock.groups where company_id=c and kind='linked' and series_key is not null and not retired) then raise exception 'Refresh into KeyStock V1.04'; end if;
 return keystock.api_v103(p_action,case when p->>'config_client'='v104' then p||'{"config_client":"v103"}' else p end);
end $$;
notify pgrst,'reload schema';
commit;
