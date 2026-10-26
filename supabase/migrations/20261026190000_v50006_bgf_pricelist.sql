-- KeySuite V5.00.06: BGF Price List.
-- Source: 004 - BGF -  261026 - V1.0.xlsx, sheet BGF, rows 4:7.
-- The workbook price columns are blank, so no source price is invented.
-- The approved release name BGF 500 takes precedence over the detail-row label BGF 550;
-- source_model preserves that discrepancy for audit.

create table if not exists public.ks_products_bgf(
  id text primary key,
  model text not null unique,
  source_model text not null,
  source_workbook text not null default '004 - BGF -  261026 - V1.0.xlsx',
  source_row integer not null,
  motor_kw numeric not null,
  motor_hp numeric not null,
  inlet text not null,
  outlet text not null,
  stages integer not null,
  drive_type text not null check(drive_type in ('Motor','Engine')),
  price_myr numeric not null default 0 check(price_myr>=0),
  price_usd numeric not null default 0 check(price_usd>=0),
  price_rmb numeric not null default 0 check(price_rmb>=0),
  rarity_myr text not null default 'common' check(rarity_myr in ('many','common','rare','fixed')),
  rarity_usd text not null default 'common' check(rarity_usd in ('many','common','rare','fixed')),
  rarity_rmb text not null default 'common' check(rarity_rmb in ('many','common','rare','fixed')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ks_products_bgf(id,model,source_model,source_row,motor_kw,motor_hp,inlet,outlet,stages,drive_type)
values
 ('bgf-350m','BGF 350M','BGF 350M',4,2.2,3,'G1½','G1¼',2,'Motor'),
 ('bgf-350e','BGF 350E','BGF 350E',5,3.7,5,'G1½','G1¼',2,'Engine'),
 ('bgf-400','BGF 400','BGF 400',6,3,4,'G1½','G1¼',2,'Motor'),
 ('bgf-500','BGF 500','BGF 550',7,4,5.5,'G1½','G1¼',2,'Motor')
on conflict(id) do update set
 model=excluded.model,source_model=excluded.source_model,source_workbook=excluded.source_workbook,
 source_row=excluded.source_row,motor_kw=excluded.motor_kw,motor_hp=excluded.motor_hp,
 inlet=excluded.inlet,outlet=excluded.outlet,stages=excluded.stages,drive_type=excluded.drive_type,active=true;

alter table public.ks_products_bgf enable row level security;
revoke all on table public.ks_products_bgf from public,anon,authenticated;
grant select on table public.ks_products_bgf to authenticated;
grant update(price_myr,price_usd,price_rmb,rarity_myr,rarity_usd,rarity_rmb,updated_at) on table public.ks_products_bgf to authenticated;

drop policy if exists bgf_active_staff_read_v50006 on public.ks_products_bgf;
create policy bgf_active_staff_read_v50006 on public.ks_products_bgf for select to authenticated
using (
  exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=lower(coalesce((select auth.jwt()->>'email'),''))
      and coalesce(ua.active,true)=true
  )
);

drop policy if exists bgf_owner_update_v50006 on public.ks_products_bgf;
create policy bgf_owner_update_v50006 on public.ks_products_bgf for update to authenticated
using (
  exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=lower(coalesce((select auth.jwt()->>'email'),''))
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  )
)
with check (
  exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=lower(coalesce((select auth.jwt()->>'email'),''))
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  )
);

do $$
begin
  if (select count(*) from public.ks_products_bgf where active and model in ('BGF 350M','BGF 350E','BGF 400','BGF 500'))<>4 then
    raise exception 'V5.00.06 BGF verification failed: four approved models are required.';
  end if;
  if exists(select 1 from public.ks_products_bgf where price_myr<0 or price_usd<0 or price_rmb<0) then
    raise exception 'V5.00.06 BGF verification failed: prices cannot be negative.';
  end if;
end $$;
