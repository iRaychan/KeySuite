-- KeySuite V5.00.17 — KV workbook Material and O-Ring add-on pricing.
create table if not exists public.ks_kv_addon_pricing (
  series_code text primary key,
  material_sicsic numeric not null default 0 check (material_sicsic >= 0),
  material_tctc numeric not null default 0 check (material_tctc >= 0),
  oring_epdm numeric not null default 0 check (oring_epdm >= 0),
  oring_nbr numeric not null default 0 check (oring_nbr >= 0),
  updated_at timestamptz not null default now()
);

insert into public.ks_kv_addon_pricing
  (series_code,material_sicsic,material_tctc,oring_epdm,oring_nbr)
values ('KV1',0,0,0,0)
on conflict (series_code) do nothing;

alter table public.ks_kv_addon_pricing enable row level security;
create policy ks_kv_addon_pricing_read on public.ks_kv_addon_pricing
  for select to authenticated using (series_code='KV1');
revoke all on public.ks_kv_addon_pricing from anon;
grant select on public.ks_kv_addon_pricing to authenticated;

create or replace function public.keysuite_save_kv_addons_v50017(
  p_material_sicsic numeric,
  p_material_tctc numeric,
  p_oring_epdm numeric,
  p_oring_nbr numeric
)
returns public.ks_kv_addon_pricing
language plpgsql
security definer
set search_path=public
as $$
declare result public.ks_kv_addon_pricing;
begin
  if not public.keysuite_is_owner_v50017() then
    raise exception 'Owner access required';
  end if;
  if least(coalesce(p_material_sicsic,0),coalesce(p_material_tctc,0),coalesce(p_oring_epdm,0),coalesce(p_oring_nbr,0)) < 0 then
    raise exception 'KV add-on prices cannot be negative';
  end if;
  update public.ks_kv_addon_pricing set
    material_sicsic=coalesce(p_material_sicsic,0),
    material_tctc=coalesce(p_material_tctc,0),
    oring_epdm=coalesce(p_oring_epdm,0),
    oring_nbr=coalesce(p_oring_nbr,0),
    updated_at=now()
  where series_code='KV1'
  returning * into result;
  if result.series_code is null then
    raise exception 'KV1 add-on pricing row not found';
  end if;
  return result;
end;
$$;

revoke all on function public.keysuite_save_kv_addons_v50017(numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.keysuite_save_kv_addons_v50017(numeric,numeric,numeric,numeric) to authenticated;
notify pgrst,'reload schema';
