-- V5.00.64: independent ISO Baseplate price book. Existing ES data remains untouched.
alter table public.ks_app_settings
  add column if not exists iso_baseplate_costing jsonb;

create or replace function public.keysuite_save_iso_baseplate_costing_v50064(p_costing jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare v_saved jsonb;
begin
  if auth.uid() is null or public.keysuite_permission_level_textid_v40401('manage_price_list') <> 'full' then
    raise exception 'Your role is not allowed to maintain ISO Baseplate costing.';
  end if;
  if p_costing is null or jsonb_typeof(p_costing) <> 'object'
     or upper(coalesce(p_costing->>'family', '')) <> 'ISO'
     or jsonb_typeof(coalesce(p_costing->'cChannels', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_costing->'general', '{}'::jsonb)) <> 'object' then
    raise exception 'ISO Baseplate costing structure is invalid.';
  end if;
  update public.ks_app_settings
  set iso_baseplate_costing = p_costing
  where id = 'default'
  returning iso_baseplate_costing into v_saved;
  if v_saved is null then
    raise exception 'KeySuite application settings were not found.';
  end if;
  return v_saved;
end;
$$;

revoke all on function public.keysuite_save_iso_baseplate_costing_v50064(jsonb) from public, anon;
grant execute on function public.keysuite_save_iso_baseplate_costing_v50064(jsonb) to authenticated;
