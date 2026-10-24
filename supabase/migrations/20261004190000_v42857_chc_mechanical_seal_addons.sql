-- KeySuite V4.28.57 — independently editable CHC C4/G1 and C6/G2 seal add-ons.
begin;

create table if not exists public.ks_chc_mechanical_seal_addons (
  generation_code text not null check (generation_code in ('G1','G2')),
  group_code text not null check (group_code in ('1_5','8_20','32_90','120_200')),
  min_series integer not null check (min_series>0),
  max_series integer not null check (max_series>=min_series),
  sic_sic_myr numeric(12,2) not null check (sic_sic_myr>=0),
  tc_tc_myr numeric(12,2) not null check (tc_tc_myr>=0),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (generation_code,group_code)
);

insert into public.ks_chc_mechanical_seal_addons
  (generation_code,group_code,min_series,max_series,sic_sic_myr,tc_tc_myr)
select generation_code,group_code,min_series,max_series,sic_sic_myr,tc_tc_myr
from (values
  ('G1','1_5',1,5,250,350),('G1','8_20',8,20,300,400),('G1','32_90',32,90,500,600),('G1','120_200',120,200,800,900),
  ('G2','1_5',1,5,250,350),('G2','8_20',8,20,300,400),('G2','32_90',32,90,500,600),('G2','120_200',120,200,800,900)
) as defaults(generation_code,group_code,min_series,max_series,sic_sic_myr,tc_tc_myr)
on conflict (generation_code,group_code) do nothing;

alter table public.ks_chc_mechanical_seal_addons enable row level security;
revoke all on public.ks_chc_mechanical_seal_addons from anon,authenticated;
grant select on public.ks_chc_mechanical_seal_addons to authenticated;
drop policy if exists ks_chc_mechanical_seal_addons_read on public.ks_chc_mechanical_seal_addons;
create policy ks_chc_mechanical_seal_addons_read on public.ks_chc_mechanical_seal_addons for select to authenticated using (true);

create or replace function public.keysuite_save_chc_mechanical_seal_addon_v42857(
  p_generation text,
  p_group_code text,
  p_sic_sic_myr numeric,
  p_tc_tc_myr numeric
)
returns public.ks_chc_mechanical_seal_addons
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
  v_generation text:=upper(trim(coalesce(p_generation,'')));
  v_group text:=lower(trim(coalesce(p_group_code,'')));
  v_min integer;
  v_max integer;
  v_saved public.ks_chc_mechanical_seal_addons;
begin
  if not exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=v_email
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  ) then raise exception 'Owner permission is required to change CHC Mechanical Seal Add-On values.'; end if;
  if v_generation not in ('G1','G2') then raise exception 'CHC generation must be G1 or G2.'; end if;
  select min_series,max_series into v_min,v_max from (values
    ('1_5',1,5),('8_20',8,20),('32_90',32,90),('120_200',120,200)
  ) as groups(group_code,min_series,max_series) where group_code=v_group;
  if v_min is null then raise exception 'Unsupported CHC series group.'; end if;
  if p_sic_sic_myr is null or p_sic_sic_myr<0 or p_tc_tc_myr is null or p_tc_tc_myr<0 then
    raise exception 'Mechanical Seal Add-On values must be zero or above.';
  end if;
  insert into public.ks_chc_mechanical_seal_addons
    (generation_code,group_code,min_series,max_series,sic_sic_myr,tc_tc_myr,updated_at,updated_by)
  values (v_generation,v_group,v_min,v_max,p_sic_sic_myr,p_tc_tc_myr,now(),v_email)
  on conflict (generation_code,group_code) do update set
    min_series=excluded.min_series,max_series=excluded.max_series,
    sic_sic_myr=excluded.sic_sic_myr,tc_tc_myr=excluded.tc_tc_myr,
    updated_at=excluded.updated_at,updated_by=excluded.updated_by
  returning * into v_saved;
  return v_saved;
end
$$;

revoke all on function public.keysuite_save_chc_mechanical_seal_addon_v42857(text,text,numeric,numeric) from public,anon;
grant execute on function public.keysuite_save_chc_mechanical_seal_addon_v42857(text,text,numeric,numeric) to authenticated;

notify pgrst,'reload schema';
commit;
