begin;
-- Development Checkpoint B: additive series scope; no catalogue or inventory seed/reset.
alter table keystock.groups alter column item_key drop not null;
alter table keystock.groups add column series_key text;
alter table keystock.groups add constraint groups_scope check (
  (item_key is not null and series_key is null) or
  (item_key is null and series_key is not null and kind in ('critical','normal')));
create unique index groups_series_kind on keystock.groups(company_id,series_key,kind) where series_key is not null;
alter table keystock.options add column revision integer not null default 1;

create function keystock.effective_groups(c text,k text) returns setof keystock.groups
language sql stable set search_path='' as $$
  select g.* from keystock.groups g where g.company_id=c and
    (g.item_key=k or g.series_key=(select family from keystock.catalog() where key=k))
$$;

-- Legacy single-choice groups retain their exact validation. Shared Normal options
-- are independent selections, not a mutually exclusive group of unrelated features.
alter function keystock.validate_selections(text,text,jsonb,boolean) rename to validate_selections_v102;
create function keystock.validate_selections(c text,k text,s jsonb,linked_only boolean default false) returns void
language plpgsql set search_path='' as $$
declare pair record; g keystock.groups%rowtype; legacy jsonb:=s; value jsonb;
begin
  if jsonb_typeof(s) is distinct from 'object' then raise exception 'Invalid selections'; end if;
  for pair in select * from jsonb_each(s) loop
    select * into g from keystock.effective_groups(c,k) where id::text=pair.key;
    if g.series_key is not null then
      if linked_only or g.kind<>'normal' or g.retired or jsonb_typeof(pair.value)<>'array' then
        raise exception 'Invalid series option selection'; end if;
      for value in select * from jsonb_array_elements(pair.value) loop
        if not exists(select 1 from keystock.options o where o.company_id=c and o.group_id=g.id
          and o.id::text=value#>>'{}' and not o.retired) then raise exception 'Invalid, retired or mismatched series option'; end if;
      end loop;
      legacy:=legacy-pair.key;
    end if;
  end loop;
  perform keystock.validate_selections_v102(c,k,legacy,linked_only);
end $$;

alter function keystock.receipt_configuration(text,text,jsonb,text) rename to receipt_configuration_v102;
create function keystock.receipt_configuration(c text,k text,sels jsonb,requested_variant text) returns uuid
language plpgsql set search_path='' as $$
declare pair record; normalized jsonb:=sels; values_sorted jsonb;
begin
  perform keystock.validate_selections(c,k,sels);
  for pair in select * from jsonb_each(sels) where jsonb_typeof(value)='array' loop
    select jsonb_agg(value order by value) into values_sorted from (select distinct value from jsonb_array_elements(pair.value)) v;
    normalized:=normalized-pair.key;
    if values_sorted is not null then normalized:=normalized||jsonb_build_object(pair.key,values_sorted); end if;
  end loop;
  return keystock.receipt_configuration_v102(c,k,normalized,requested_variant);
end $$;

alter function keystock.reconfigured(text,uuid,uuid,uuid) rename to reconfigured_v102;
create function keystock.reconfigured(c text,old_config uuid,target_group uuid,target_option uuid) returns uuid
language plpgsql set search_path='' as $$
declare cfg keystock.configurations%rowtype; chosen jsonb; config uuid;
begin
  if not exists(select 1 from keystock.groups where company_id=c and id=target_group and series_key is not null) then
    return keystock.reconfigured_v102(c,old_config,target_group,target_option); end if;
  select * into strict cfg from keystock.configurations where company_id=c and id=old_config;
  if not exists(select 1 from keystock.effective_groups(c,cfg.item_key) g join keystock.options o
      on (o.company_id,o.group_id)=(g.company_id,g.id) where g.id=target_group and g.kind='normal'
      and o.id=target_option and not g.retired and not o.retired) then raise exception 'Select an active Normal option for this model'; end if;
  chosen:=coalesce(cfg.selections->target_group::text,'[]');
  if chosen ? target_option::text then chosen:=chosen-target_option::text;
  else chosen:=chosen||jsonb_build_array(target_option::text); end if;
  select coalesce(jsonb_agg(value order by value),'[]') into chosen from jsonb_array_elements(chosen);
  cfg.selections:=cfg.selections-target_group::text;
  if jsonb_array_length(chosen)>0 then cfg.selections:=cfg.selections||jsonb_build_object(target_group::text,chosen); end if;
  insert into keystock.configurations(company_id,item_key,selections,variant)
    values(c,cfg.item_key,cfg.selections,cfg.variant) on conflict do nothing;
  select id into strict config from keystock.configurations where company_id=c and item_key=cfg.item_key
    and selections=cfg.selections and variant=cfg.variant;
  return config;
end $$;

alter function keystock.api(text,jsonb) rename to api_v102;
create function keystock.api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c text; permissions jsonb; g keystock.groups%rowtype; old keystock.options%rowtype;
  option_id uuid; label_text text; answer jsonb; series text; kind_name text;
begin
  if auth.uid() is null or public.keysuite_has_access() is not true then raise exception 'Access denied' using errcode='42501'; end if;
  c:=public.keysuite_current_company_id();
  if coalesce(c,'')='' then raise exception 'Company required'; end if;
  permissions:=keystock.ledger_permissions(c,lower(public.keysuite_current_role()));
  if (permissions->>'view_stock')::boolean is not true then raise exception 'View Stock permission required' using errcode='42501'; end if;
  if p_action='state' then
    if p->>'config_client' is distinct from 'v103' and exists(select 1 from keystock.groups where company_id=c and series_key is not null) then
      raise exception 'Refresh into KeyStock V1.03 to use series options'; end if;
    return keystock.api_v102(p_action,p)||jsonb_build_object('config_version','v103');
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>4000000 then raise exception 'Invalid stock request'; end if;
  -- Same tenant lock as inventory writes makes reference checks atomic with receipts.
  perform pg_advisory_xact_lock(hashtextextended('keystock:'||c,0));
  if p_action in ('series_option_save','series_option_delete') then
    if (permissions->>'manage_stock_dropdowns')::boolean is not true then raise exception 'Manage Dropdowns permission required' using errcode='42501'; end if;
    if p->>'config_client' is distinct from 'v103' then raise exception 'Refresh into KeyStock V1.03'; end if;
    series:=p->>'series_key';kind_name:=p->>'kind';
    if kind_name not in ('critical','normal') or kind_name is null then raise exception 'Select Critical or Normal Group'; end if;
    if not exists(select 1 from keystock.catalog() where family=series) then raise exception 'Unknown catalogue series'; end if;
    option_id:=(p->>'id')::uuid;
    select * into old from keystock.options where company_id=c and id=option_id;
    if option_id is not null and (old.id is null or old.retired) then raise exception 'Option is unavailable; refresh'; end if;
    if old.id is not null then
      select * into g from keystock.groups where company_id=c and id=old.group_id and series_key=series and kind=kind_name;
      if g.id is null then raise exception 'Option does not belong to this series and grouping'; end if;
      if (p->>'revision')::integer is distinct from old.revision then raise exception 'This option changed. Refresh before editing'; end if;
    end if;
    if p_action='series_option_delete' then
      if old.id is null then raise exception 'Select an option'; end if;
      if exists(select 1 from keystock.configurations where company_id=c and selections->old.group_id::text ? old.id::text)
        or exists(select 1 from keystock.critical_quantities cq where cq.company_id=c and cq.option_id=old.id)
        or exists(select 1 from keystock.mappings where company_id=c and selections->>old.group_id::text=old.id::text) then
        raise exception 'This option is used by stock records and cannot be deleted'; end if;
      update keystock.options set retired=true,revision=revision+1 where company_id=c and id=old.id;
    else
      label_text:=regexp_replace(btrim(p->>'label'),'\s+',' ','g');
      if coalesce(length(label_text),0)=0 or length(label_text)>120 then raise exception 'Enter an option name of 1–120 characters'; end if;
      if g.id is null then
        insert into keystock.groups(company_id,series_key,kind,label)
          values(c,series,kind_name,case kind_name when 'critical' then 'Critical Group' else 'Normal Group' end)
          on conflict do nothing;
        select * into strict g from keystock.groups where company_id=c and series_key=series and kind=kind_name;
      end if;
      if exists(select 1 from keystock.options where company_id=c and group_id=g.id and not retired
        and lower(label)=lower(label_text) and id is distinct from option_id) then raise exception 'An option with this name already exists in this series and grouping'; end if;
      if old.id is null then
        insert into keystock.options(company_id,group_id,label) values(c,g.id,label_text) returning id into option_id;
      else update keystock.options set label=label_text,revision=revision+1 where company_id=c and id=option_id; end if;
    end if;
    answer:=jsonb_build_object('id',option_id,'series_key',series,'kind',kind_name,'label',coalesce(label_text,old.label));
    insert into keystock.audit(company_id,actor,action,detail) values(c,auth.uid(),p_action,answer);
    return answer||jsonb_build_object('saved',true);
  end if;
  if p_action='group' and exists(select 1 from keystock.groups where company_id=c and id::text=p->>'id' and series_key is not null) then
    raise exception 'Use the series option editor'; end if;
  if starts_with(p_action,'ledger_') and p->>'config_client' is distinct from 'v103'
    and exists(select 1 from keystock.groups where company_id=c and series_key is not null) then
    raise exception 'Refresh into KeyStock V1.03 to use series options'; end if;
  return keystock.api_v102(p_action,p);
end $$;
revoke all on all functions in schema keystock from public,anon,authenticated;
grant execute on function keystock.api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
