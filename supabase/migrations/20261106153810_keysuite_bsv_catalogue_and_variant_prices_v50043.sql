create table if not exists public.ks_bsv_products_v50043 (
  id text primary key,
  model text not null unique,
  source_workbook text not null default '004 - BSV 261106 - V1.0.xlsx',
  source_row integer not null,
  motor_kw numeric check (motor_kw is null or motor_kw >= 0),
  motor_hp numeric check (motor_hp is null or motor_hp >= 0),
  poles integer check (poles is null or poles > 0),
  speed_rpm numeric check (speed_rpm is null or speed_rpm > 0),
  discharge text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.ks_bsv_products_v50043 enable row level security;
revoke all on public.ks_bsv_products_v50043 from public, anon, authenticated;
grant select on public.ks_bsv_products_v50043 to authenticated;
create policy bsv_products_read_v50043 on public.ks_bsv_products_v50043 for select to authenticated using ((select public.keysuite_has_access()));
insert into public.ks_bsv_products_v50043 (id,model,source_row,motor_kw,motor_hp,poles,speed_rpm,discharge) values
 ('BSV 32G05','BSV 32G05',4,0.75,1,2,2900,'G1¼'),
 ('BSV 65G20','BSV 65G20',6,1.1,1.5,2,2900,'G2½'),
 ('BSV 80G10','BSV 80G10',5,1.1,1.5,2,2900,'G3'),
 ('BSV 100G30','BSV 100G30',7,1.5,2,2,2900,'G4')
 on conflict (model) do update set source_row=excluded.source_row,motor_kw=excluded.motor_kw,motor_hp=excluded.motor_hp,poles=excluded.poles,speed_rpm=excluded.speed_rpm,discharge=excluded.discharge,updated_at=now();

create table if not exists public.ks_bsv_variant_availability_v50043 (
  model text not null references public.ks_bsv_products_v50043(model),
  variant text not null check (variant in ('T','M','MA')),
  variant_label text not null,
  initial_rarity text not null check (initial_rarity in ('many','common','rare')),
  active boolean not null default true,
  primary key (model,variant)
);
alter table public.ks_bsv_variant_availability_v50043 enable row level security;
revoke all on public.ks_bsv_variant_availability_v50043 from public, anon, authenticated;
grant select on public.ks_bsv_variant_availability_v50043 to authenticated;
create policy bsv_variant_read_v50043 on public.ks_bsv_variant_availability_v50043 for select to authenticated using ((select public.keysuite_has_access()));
insert into public.ks_bsv_variant_availability_v50043 (model,variant,variant_label,initial_rarity)
select p.model,v.variant,v.label,'many' from public.ks_bsv_products_v50043 p cross join (values ('T','Three phase'),('M','Single phase'),('MA','Single phase with automatic float switch')) v(variant,label)
on conflict (model,variant) do update set variant_label=excluded.variant_label,initial_rarity=excluded.initial_rarity;

create table if not exists public.ks_bsv_variant_prices_v50043 (
  model text not null, variant text not null,
  price_usd numeric check (price_usd >= 0), price_rmb numeric check (price_rmb >= 0), price_myr numeric check (price_myr >= 0),
  rarity text not null check (rarity in ('many','common','rare')),
  primary key (model,variant),
  foreign key (model,variant) references public.ks_bsv_variant_availability_v50043(model,variant)
);
alter table public.ks_bsv_variant_prices_v50043 enable row level security;
revoke all on public.ks_bsv_variant_prices_v50043 from public, anon, authenticated;
grant select,insert,update on public.ks_bsv_variant_prices_v50043 to authenticated;
create policy bsv_prices_read_v50043 on public.ks_bsv_variant_prices_v50043 for select to authenticated using ((select public.keysuite_has_access()));
create policy bsv_prices_owner_insert_v50043 on public.ks_bsv_variant_prices_v50043 for insert to authenticated with check ((select public.keysuite_has_access()) and exists (select 1 from public.ks_user_access u where lower(u.email)=public.keysuite_current_email() and lower(u.role)='owner' and coalesce(u.active,true)));
create policy bsv_prices_owner_update_v50043 on public.ks_bsv_variant_prices_v50043 for update to authenticated using ((select public.keysuite_has_access()) and exists (select 1 from public.ks_user_access u where lower(u.email)=public.keysuite_current_email() and lower(u.role)='owner' and coalesce(u.active,true))) with check ((select public.keysuite_has_access()) and exists (select 1 from public.ks_user_access u where lower(u.email)=public.keysuite_current_email() and lower(u.role)='owner' and coalesce(u.active,true)));
insert into public.ks_bsv_variant_prices_v50043(model,variant,price_usd,price_rmb,price_myr,rarity)
select model,variant,null,null,null,initial_rarity from public.ks_bsv_variant_availability_v50043 on conflict (model,variant) do nothing;
