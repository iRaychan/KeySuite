-- KeySuite V4.28.58 — editable CR mechanical-seal add-on prices.
begin;

create table if not exists public.ks_cr_mechanical_seal_addons (
  seal_code text not null check (seal_code in ('CAR_SIC','SIC_SIC','TUC_TIC')),
  seal_label text not null,
  group_code text not null check (group_code in ('1_5','8_20','32_90','120_200','320')),
  group_label text not null,
  amount_myr numeric(12,2) not null check (amount_myr>=0),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (seal_code,group_code)
);

insert into public.ks_cr_mechanical_seal_addons
  (seal_code,seal_label,group_code,group_label,amount_myr)
select seal_code,seal_label,group_code,group_label,amount_myr
from (values
  ('CAR_SIC','Car / Sic','1_5','CR 1 to CR 5',0),
  ('CAR_SIC','Car / Sic','8_20','CR 8 to CR 20',0),
  ('CAR_SIC','Car / Sic','32_90','CR 32 to CR 90',0),
  ('CAR_SIC','Car / Sic','120_200','CR 120to 200',0),
  ('CAR_SIC','Car / Sic','320','CR 320',0),
  ('SIC_SIC','Sic / Sic','1_5','CR 1 to CR 5',250),
  ('SIC_SIC','Sic / Sic','8_20','CR 8 to CR 20',300),
  ('SIC_SIC','Sic / Sic','32_90','CR 32 to CR 90',500),
  ('SIC_SIC','Sic / Sic','120_200','CR 120to 200',800),
  ('SIC_SIC','Sic / Sic','320','CR 320',1000),
  ('TUC_TIC','TuC / Tic','1_5','CR 1 to CR 5',350),
  ('TUC_TIC','TuC / Tic','8_20','CR 8 to CR 20',400),
  ('TUC_TIC','TuC / Tic','32_90','CR 32 to CR 90',600),
  ('TUC_TIC','TuC / Tic','120_200','CR 120to 200',900),
  ('TUC_TIC','TuC / Tic','320','CR 320',1200)
) as defaults(seal_code,seal_label,group_code,group_label,amount_myr)
on conflict (seal_code,group_code) do nothing;

alter table public.ks_cr_mechanical_seal_addons enable row level security;
revoke all on public.ks_cr_mechanical_seal_addons from anon,authenticated;
grant select on public.ks_cr_mechanical_seal_addons to authenticated;
drop policy if exists ks_cr_mechanical_seal_addons_read on public.ks_cr_mechanical_seal_addons;
create policy ks_cr_mechanical_seal_addons_read on public.ks_cr_mechanical_seal_addons for select to authenticated using (true);

create or replace function public.keysuite_save_cr_mechanical_seal_addons_v42858(
  p_seal_code text,
  p_1_5_myr numeric,
  p_8_20_myr numeric,
  p_32_90_myr numeric,
  p_120_200_myr numeric,
  p_320_myr numeric
)
returns setof public.ks_cr_mechanical_seal_addons
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
  v_seal text:=upper(trim(coalesce(p_seal_code,'')));
  v_label text;
begin
  if not exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=v_email
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  ) then raise exception 'Owner permission is required to change CR Mechanical Seal Add-On values.'; end if;

  v_label:=case v_seal
    when 'CAR_SIC' then 'Car / Sic'
    when 'SIC_SIC' then 'Sic / Sic'
    when 'TUC_TIC' then 'TuC / Tic'
    else null
  end;
  if v_label is null then raise exception 'Unsupported CR mechanical seal.'; end if;
  if p_1_5_myr is null or p_1_5_myr<0
    or p_8_20_myr is null or p_8_20_myr<0
    or p_32_90_myr is null or p_32_90_myr<0
    or p_120_200_myr is null or p_120_200_myr<0
    or p_320_myr is null or p_320_myr<0 then
    raise exception 'Mechanical Seal Add-On values must be zero or above.';
  end if;

  insert into public.ks_cr_mechanical_seal_addons
    (seal_code,seal_label,group_code,group_label,amount_myr,updated_at,updated_by)
  values
    (v_seal,v_label,'1_5','CR 1 to CR 5',p_1_5_myr,now(),v_email),
    (v_seal,v_label,'8_20','CR 8 to CR 20',p_8_20_myr,now(),v_email),
    (v_seal,v_label,'32_90','CR 32 to CR 90',p_32_90_myr,now(),v_email),
    (v_seal,v_label,'120_200','CR 120to 200',p_120_200_myr,now(),v_email),
    (v_seal,v_label,'320','CR 320',p_320_myr,now(),v_email)
  on conflict (seal_code,group_code) do update set
    seal_label=excluded.seal_label,group_label=excluded.group_label,
    amount_myr=excluded.amount_myr,updated_at=excluded.updated_at,updated_by=excluded.updated_by;

  return query
    select * from public.ks_cr_mechanical_seal_addons
    where seal_code=v_seal
    order by case group_code when '1_5' then 1 when '8_20' then 2 when '32_90' then 3 when '120_200' then 4 else 5 end;
end
$$;

revoke all on function public.keysuite_save_cr_mechanical_seal_addons_v42858(text,numeric,numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.keysuite_save_cr_mechanical_seal_addons_v42858(text,numeric,numeric,numeric,numeric,numeric) to authenticated;

notify pgrst,'reload schema';
commit;
