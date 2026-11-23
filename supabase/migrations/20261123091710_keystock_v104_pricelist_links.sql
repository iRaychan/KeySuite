begin;
-- Additive development migration. No catalogue prices, stock or permission rows changed.
do $$ begin
  if to_regprocedure('keystock.api_v103(text,jsonb)') is null then
    alter function keystock.api(text,jsonb) rename to api_v103;
    alter function keystock.catalog() rename to catalog_v103;
    alter function keystock.validate_selections(text,text,jsonb,boolean) rename to validate_selections_v103;
    alter function keystock.receipt_configuration(text,text,jsonb,text) rename to receipt_configuration_v103;
  end if;
end $$;
alter table keystock.groups drop constraint if exists groups_scope;
alter table keystock.groups add constraint groups_scope check (
 (item_key is not null and series_key is null) or (item_key is null and series_key is not null));
drop index if exists keystock.groups_series_kind;
create unique index groups_series_kind on keystock.groups(company_id,series_key,kind)
 where series_key is not null and kind in ('critical','normal');
alter table keystock.groups add column if not exists revision integer not null default 1;
create unique index if not exists groups_linked_name on keystock.groups(company_id,series_key,lower(label))
 where series_key is not null and kind='linked' and not retired;
create table if not exists keystock.series_mappings (
 company_id text not null, id uuid not null default gen_random_uuid(), series_key text not null,
 selections jsonb not null check(jsonb_typeof(selections)='object'), variant text not null,
 revision integer not null default 1, retired boolean not null default false,
 primary key(company_id,id));
create unique index if not exists series_mappings_combination on keystock.series_mappings(company_id,series_key,selections) where not retired;
alter table keystock.series_mappings enable row level security;
revoke all on keystock.series_mappings from public,anon,authenticated;

-- Preserve all prior family identities; ES reads every material actually present per model.
create or replace function keystock.catalog() returns table(key text,family text,model text,brand text,choices jsonb)
language sql stable set search_path='' as $$
 select c.key,c.family,c.model,c.brand,case when c.family='ES' then
   coalesce((select jsonb_agg(jsonb_build_object('code',code,'label',code) order by code)
    from (select distinct v->>'material' code from public.ks_products_es e,
      lateral jsonb_array_elements(e.variants) v where 'ES:'||e.id=c.key and nullif(btrim(v->>'material'),'') is not null) q),'[]')
 else c.choices end from keystock.catalog_v103() c
$$;

create or replace function keystock.validate_selections(c text,k text,s jsonb,linked_only boolean default false) returns void
language plpgsql set search_path='' as $$
declare pair record; g keystock.groups%rowtype; legacy jsonb:=s;
begin
 if jsonb_typeof(s) is distinct from 'object' then raise exception 'Invalid selections'; end if;
 for pair in select * from jsonb_each(s) loop
  select * into g from keystock.effective_groups(c,k) where id::text=pair.key and not retired;
  if g.series_key is not null and g.kind='linked' then
   if jsonb_typeof(pair.value)<>'string' or not exists(select 1 from keystock.options o where o.company_id=c
    and o.group_id=g.id and not o.retired and o.id::text=pair.value#>>'{}') then raise exception 'Invalid Pricelist selection'; end if;
   legacy:=legacy-pair.key;
  end if;
 end loop;
 for g in select * from keystock.effective_groups(c,k) where series_key is not null and kind='linked' and not retired loop
  if not s ? g.id::text then raise exception 'Select %',g.label; end if;
 end loop;
 perform keystock.validate_selections_v103(c,k,legacy,linked_only);
end $$;

create or replace function keystock.resolve_series_link(c text,k text,s jsonb) returns text
language plpgsql stable set search_path='' as $$
declare linked jsonb; chosen text; n integer; fam text;
begin
 select family into fam from keystock.catalog() where key=k;
 select jsonb_object_agg(g.id::text,s->g.id::text) into linked from keystock.effective_groups(c,k) g
  where kind='linked' and series_key is not null and not retired;
 if linked is null then return null; end if;
 if exists(select 1 from keystock.groups where company_id=c and item_key=k and kind='linked' and not retired) then
  raise exception 'Conflicting model and series arrangements require review'; end if;
 select count(*),min(variant) into n,chosen from keystock.series_mappings where company_id=c and series_key=fam and selections=linked and not retired;
 if n=0 then raise exception 'Missing mapping: configure this exact combination before receiving stock'; end if;
 if n<>1 then raise exception 'Ambiguous mapping'; end if;
 if not exists(select 1 from keystock.catalog() t,jsonb_array_elements(t.choices) v where t.key=k and v->>'code'=chosen) then
  raise exception 'Mapped configuration is not applicable to this model'; end if;
 return chosen;
end $$;

create or replace function keystock.receipt_configuration(c text,k text,sels jsonb,requested_variant text) returns uuid
language plpgsql set search_path='' as $$
declare chosen text;
begin
 perform keystock.validate_selections(c,k,sels);
 chosen:=keystock.resolve_series_link(c,k,sels);
 if chosen is not null and coalesce(requested_variant,'')<>'' and requested_variant<>chosen then raise exception 'Requested configuration conflicts with exact mapping'; end if;
 return keystock.receipt_configuration_v103(c,k,sels,coalesce(chosen,requested_variant));
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
revoke all on all functions in schema keystock from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
