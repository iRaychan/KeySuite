-- KeySuite V4.25.02
-- 1) CHC G1 and CHC G2 maintain independent USD/RMB multipliers.
-- 2) Quotation History delete is controlled by Role Authority and enforced by a dedicated RPC.

begin;

alter table public.ks_app_settings
  add column if not exists chc_g1_usd_multiplier numeric,
  add column if not exists chc_g1_rmb_multiplier numeric,
  add column if not exists chc_g2_usd_multiplier numeric,
  add column if not exists chc_g2_rmb_multiplier numeric;

-- Preserve the current shared CHC rate as the starting point for BOTH generations.
-- G2 also remains mirrored to the legacy chc_* columns for older KeySuite clients.
update public.ks_app_settings
set chc_g2_usd_multiplier = coalesce(chc_g2_usd_multiplier, chc_usd_multiplier, usd_multiplier, 5.8),
    chc_g2_rmb_multiplier = coalesce(chc_g2_rmb_multiplier, chc_rmb_multiplier, rmb_multiplier, 0.65),
    chc_g1_usd_multiplier = coalesce(chc_g1_usd_multiplier, chc_usd_multiplier, usd_multiplier, 5.8),
    chc_g1_rmb_multiplier = coalesce(chc_g1_rmb_multiplier, chc_rmb_multiplier, rmb_multiplier, 0.65)
where id = 'default';

alter table public.ks_app_settings
  alter column chc_g1_usd_multiplier set default 5.8,
  alter column chc_g1_rmb_multiplier set default 0.65,
  alter column chc_g2_usd_multiplier set default 5.8,
  alter column chc_g2_rmb_multiplier set default 0.65;

-- Add the new Role Authority key without changing any existing role choices.
-- Owner keeps delete authority by default; every other role starts with No.
update public.ks_role_permissions
set permissions = coalesce(permissions,'{}'::jsonb) || '{"delete_quotation_history":"full"}'::jsonb
where lower(trim(coalesce(role,''))) = 'owner';

update public.ks_role_permissions
set permissions = coalesce(permissions,'{}'::jsonb) || '{"delete_quotation_history":"none"}'::jsonb
where lower(trim(coalesce(role,''))) <> 'owner'
  and not (coalesce(permissions,'{}'::jsonb) ? 'delete_quotation_history');

create or replace function public.keysuite_save_chc_generation_multiplier_v42502(
  p_generation text,
  p_currency text,
  p_multiplier numeric
)
returns table(generation text, usd_multiplier numeric, rmb_multiplier numeric)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_company text := '';
  v_role text := '';
  v_permission text := 'none';
  v_generation text := upper(trim(coalesce(p_generation,'')));
  v_currency text := upper(trim(coalesce(p_currency,'')));
  v_count integer := 0;
begin
  if v_email = '' then raise exception 'Authentication is required.'; end if;

  select ua.company_id::text, lower(trim(coalesce(ua.role,'')))
    into v_company, v_role
  from public.ks_user_access ua
  where lower(trim(coalesce(ua.email,''))) = v_email
    and coalesce(ua.active,true) = true
  limit 1;

  if coalesce(v_company,'') = '' then raise exception 'Active KeySuite access was not found.'; end if;

  if v_role <> 'owner' then
    select lower(trim(coalesce(rp.permissions->>'manage_price_list','none')))
      into v_permission
    from public.ks_role_permissions rp
    where rp.company_id::text = v_company
      and lower(trim(coalesce(rp.role,''))) = v_role
    limit 1;
    if coalesce(v_permission,'none') <> 'full' then
      raise exception 'Your role is not allowed to maintain Price List settings.';
    end if;
  end if;

  if v_generation not in ('G1','G2') then raise exception 'CHC generation must be G1 or G2.'; end if;
  if v_currency not in ('USD','RMB') then raise exception 'CHC multiplier only supports USD or RMB.'; end if;
  if coalesce(p_multiplier,0) <= 0 then raise exception 'CHC multiplier must be greater than zero.'; end if;

  if v_generation = 'G1' then
    update public.ks_app_settings
    set chc_g1_usd_multiplier = case when v_currency='USD' then p_multiplier else chc_g1_usd_multiplier end,
        chc_g1_rmb_multiplier = case when v_currency='RMB' then p_multiplier else chc_g1_rmb_multiplier end
    where id = 'default';
  else
    update public.ks_app_settings
    set chc_g2_usd_multiplier = case when v_currency='USD' then p_multiplier else chc_g2_usd_multiplier end,
        chc_g2_rmb_multiplier = case when v_currency='RMB' then p_multiplier else chc_g2_rmb_multiplier end,
        -- legacy CHC fields remain the G2 compatibility aliases
        chc_usd_multiplier = case when v_currency='USD' then p_multiplier else chc_usd_multiplier end,
        chc_rmb_multiplier = case when v_currency='RMB' then p_multiplier else chc_rmb_multiplier end
    where id = 'default';
  end if;

  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'CHC % multiplier could not be saved.', v_generation; end if;

  if v_generation = 'G1' then
    return query
      select 'G1'::text,
             coalesce(s.chc_g1_usd_multiplier,5.8),
             coalesce(s.chc_g1_rmb_multiplier,0.65)
      from public.ks_app_settings s where s.id='default';
  else
    return query
      select 'G2'::text,
             coalesce(s.chc_g2_usd_multiplier,s.chc_usd_multiplier,5.8),
             coalesce(s.chc_g2_rmb_multiplier,s.chc_rmb_multiplier,0.65)
      from public.ks_app_settings s where s.id='default';
  end if;
end;
$$;

revoke all on function public.keysuite_save_chc_generation_multiplier_v42502(text,text,numeric) from public,anon;
grant execute on function public.keysuite_save_chc_generation_multiplier_v42502(text,text,numeric) to authenticated;

create or replace function public.keysuite_delete_quotation_v42502(
  p_company_id text,
  p_logical_id text,
  p_legacy_id text,
  p_quotation_no text default null
)
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_company text := '';
  v_role text := '';
  v_permission text := 'none';
  v_conditions text[] := array[]::text[];
  v_row_type text := '';
  v_sql text := '';
  v_deleted integer := 0;
begin
  if v_email = '' then raise exception 'Authentication is required.'; end if;

  select ua.company_id::text, lower(trim(coalesce(ua.role,'')))
    into v_company, v_role
  from public.ks_user_access ua
  where lower(trim(coalesce(ua.email,''))) = v_email
    and coalesce(ua.active,true) = true
    and (trim(coalesce(p_company_id,'')) = '' or ua.company_id::text = trim(p_company_id))
  limit 1;

  if coalesce(v_company,'') = '' then raise exception 'Active KeySuite access was not found for this company.'; end if;
  if trim(coalesce(p_company_id,'')) <> '' and trim(p_company_id) <> v_company then
    raise exception 'This quotation belongs to another KeySuite company.';
  end if;

  if v_role <> 'owner' then
    select lower(trim(coalesce(rp.permissions->>'delete_quotation_history','none')))
      into v_permission
    from public.ks_role_permissions rp
    where rp.company_id::text = v_company
      and lower(trim(coalesce(rp.role,''))) = v_role
    limit 1;
    if coalesce(v_permission,'none') <> 'full' then
      raise exception 'Your role is not allowed to delete quotation history.';
    end if;
  end if;

  if to_regclass('public.ks_quotation_archive_v409') is null then
    raise exception 'Secure quotation history table is not installed.';
  end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_quotation_archive_v409' and column_name='id') then
    v_conditions := array_append(v_conditions, 'id::text = $2');
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_quotation_archive_v409' and column_name='logical_id') then
    v_conditions := array_append(v_conditions, 'logical_id::text = $3');
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_quotation_archive_v409' and column_name='quotation_id') then
    v_conditions := array_append(v_conditions, 'quotation_id::text = $3');
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_quotation_archive_v409' and column_name='quote_id') then
    v_conditions := array_append(v_conditions, 'quote_id::text = $3');
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_quotation_archive_v409' and column_name='quotation_no') then
    v_conditions := array_append(v_conditions, '($4 is not null and upper(coalesce(quotation_no::text,'''')) = upper($4))');
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_quotation_archive_v409' and column_name='no') then
    v_conditions := array_append(v_conditions, '($4 is not null and upper(coalesce(no::text,'''')) = upper($4))');
  end if;

  select c.udt_name into v_row_type
  from information_schema.columns c
  where c.table_schema='public' and c.table_name='ks_quotation_archive_v409' and c.column_name='row_data'
  limit 1;
  if v_row_type in ('json','jsonb') then
    v_conditions := array_append(v_conditions, '(row_data->>''id'' = $3 or ($4 is not null and upper(coalesce(row_data->>''no'','''')) = upper($4)))');
  end if;

  if coalesce(array_length(v_conditions,1),0) = 0 then
    raise exception 'Quotation history identity columns could not be resolved.';
  end if;

  v_sql := 'delete from public.ks_quotation_archive_v409 where company_id::text = $1 and (' || array_to_string(v_conditions,' or ') || ')';
  execute v_sql using v_company, nullif(trim(coalesce(p_legacy_id,'')),''), nullif(trim(coalesce(p_logical_id,'')),''), nullif(trim(coalesce(p_quotation_no,'')),'');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.keysuite_delete_quotation_v42502(text,text,text,text) from public,anon;
grant execute on function public.keysuite_delete_quotation_v42502(text,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
