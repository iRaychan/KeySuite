-- V5.00.68: add only the new KV rows; existing prices and saved data are untouched.
begin;
insert into public.ks_products_kv(id,model,source_row,source_workbook)
values
('KV:KV 16-20-2','KV 16-20-2',262,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-20','KV 16-20',263,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-30','KV 16-30',264,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-40','KV 16-40',265,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-50','KV 16-50',266,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-60','KV 16-60',267,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-70','KV 16-70',268,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-80','KV 16-80',269,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-90','KV 16-90',270,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-100','KV 16-100',271,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-110','KV 16-110',272,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-120','KV 16-120',273,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-130','KV 16-130',274,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-140','KV 16-140',275,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-150','KV 16-150',276,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 16-160','KV 16-160',277,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-10-1','KV 20-10-1',278,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-10','KV 20-10',279,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-20-2','KV 20-20-2',280,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-20','KV 20-20',281,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-30','KV 20-30',282,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-40','KV 20-40',283,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-50','KV 20-50',284,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-60','KV 20-60',285,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-70','KV 20-70',286,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-80','KV 20-80',287,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-90','KV 20-90',288,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-100','KV 20-100',289,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-110','KV 20-110',290,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-120','KV 20-120',291,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-130','KV 20-130',292,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 20-140','KV 20-140',293,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-10','KV 28-10',294,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-20','KV 28-20',295,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-30','KV 28-30',296,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-40','KV 28-40',297,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-50','KV 28-50',298,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-60','KV 28-60',299,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-70','KV 28-70',300,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-80','KV 28-80',301,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-90','KV 28-90',302,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-100','KV 28-100',303,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-110','KV 28-110',304,'004 - KV 261109 - V1.5(2).xlsx'),
('KV:KV 28-120','KV 28-120',305,'004 - KV 261109 - V1.5(2).xlsx')
on conflict(id) do nothing;
-- G M and T are distinct SKUs; workbook source prices are zero.
create table if not exists public.ks_products_g(
 id text primary key,
 model text not null unique,
 base_model text not null,
 phase text not null check(phase in ('1Ph','3Ph')),
 source_row integer not null,
 source_workbook text not null,
 price_myr numeric not null default 0 check(price_myr>=0),
 price_usd numeric not null default 0 check(price_usd>=0),
 price_rmb numeric not null default 0 check(price_rmb>=0),
 rarity_myr text not null default 'many' check(rarity_myr in ('many','common','rare','fixed')),
 rarity_usd text not null default 'many' check(rarity_usd in ('many','common','rare','fixed')),
 rarity_rmb text not null default 'many' check(rarity_rmb in ('many','common','rare','fixed')),
 active boolean not null default true,
 updated_at timestamptz not null default now()
);
insert into public.ks_products_g(id,model,base_model,phase,source_row,source_workbook)
values
('g-g25-03-2-m','G25-03-2M','G25-03-2','1Ph',4,'004 - G 261113 - V1.0.xlsx'),
('g-g25-03-2-t','G25-03-2T','G25-03-2','3Ph',4,'004 - G 261113 - V1.0.xlsx'),
('g-g25-04-2-m','G25-04-2M','G25-04-2','1Ph',5,'004 - G 261113 - V1.0.xlsx'),
('g-g25-04-2-t','G25-04-2T','G25-04-2','3Ph',5,'004 - G 261113 - V1.0.xlsx'),
('g-g25-07-2-m','G25-07-2M','G25-07-2','1Ph',6,'004 - G 261113 - V1.0.xlsx'),
('g-g25-07-2-t','G25-07-2T','G25-07-2','3Ph',6,'004 - G 261113 - V1.0.xlsx'),
('g-g25-10-2-m','G25-10-2M','G25-10-2','1Ph',7,'004 - G 261113 - V1.0.xlsx'),
('g-g25-10-2-t','G25-10-2T','G25-10-2','3Ph',7,'004 - G 261113 - V1.0.xlsx'),
('g-g32-10-2-m','G32-10-2M','G32-10-2','1Ph',8,'004 - G 261113 - V1.0.xlsx'),
('g-g32-10-2-t','G32-10-2T','G32-10-2','3Ph',8,'004 - G 261113 - V1.0.xlsx'),
('g-g32-10h-2-m','G32-10H-2M','G32-10H-2','1Ph',9,'004 - G 261113 - V1.0.xlsx'),
('g-g32-10h-2-t','G32-10H-2T','G32-10H-2','3Ph',9,'004 - G 261113 - V1.0.xlsx')
on conflict(id) do nothing;
alter table public.ks_products_g enable row level security;
revoke all on public.ks_products_g from public,anon,authenticated;
grant select on public.ks_products_g to authenticated;
grant update(price_myr,price_usd,price_rmb,rarity_myr,rarity_usd,rarity_rmb,updated_at) on public.ks_products_g to authenticated;
create policy g_active_staff_read_v50068 on public.ks_products_g for select to authenticated using(
 active and exists(select 1 from public.ks_user_access u where lower(u.email)=lower((select auth.jwt()->>'email')) and coalesce(u.active,true)));
create policy g_owner_update_v50068 on public.ks_products_g for update to authenticated
 using(exists(select 1 from public.ks_user_access u where lower(u.email)=lower((select auth.jwt()->>'email')) and lower(u.role)='owner' and coalesce(u.active,true)))
 with check(exists(select 1 from public.ks_user_access u where lower(u.email)=lower((select auth.jwt()->>'email')) and lower(u.role)='owner' and coalesce(u.active,true)));
commit;

-- V5.00.68: explicitly approved G-only rule support. No source costs or rules are seeded.
begin;
create schema if not exists keysuite_g_private;
revoke all on schema keysuite_g_private from public,anon;
grant usage on schema keysuite_g_private to authenticated;
create or replace function keysuite_g_private.save_rule(
 p_category_id text,p_category_name text,p_product_code text,
 p_margin numeric,p_normal numeric,p_rare numeric,p_transport numeric,
 p_use_commission boolean,p_use_set_discount boolean,p_use_final_discount boolean,p_use_fuel_charge boolean,p_currencies jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_rule jsonb; v_count integer; v_currency text; v_selected jsonb:='[]'::jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)) then raise exception 'Owner permission is required to change G pricing rules.'; end if;
 if p_product_code is distinct from 'G' then raise exception 'Only G is supported.'; end if;
 if coalesce(trim(p_category_id),'')='' then raise exception 'Save the Pricing Category first, then configure G.'; end if;
 if p_margin is null or p_margin<0 or p_margin>=1 or p_normal is null or p_normal<0 or p_normal>=1 or p_rare is null or p_rare<0 or p_rare>=1 or p_transport is null or p_transport<0 or p_transport::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid margin, rarity adjustment or transport value.'; end if;
 if p_currencies is null or jsonb_typeof(p_currencies)<>'array' then raise exception 'Currency selection must be an array.'; end if;
 for v_currency in select value from jsonb_array_elements_text(p_currencies) loop
  if v_currency is null or v_currency not in ('USD','RMB','MYR') then raise exception 'Invalid currency.'; end if;
  if not(v_selected ? v_currency) then v_selected:=v_selected||jsonb_build_array(v_currency); end if;
 end loop;
 v_rule:=jsonb_build_object('margin',p_margin,'normal',p_normal,'rare',p_rare,'transport',p_transport,'useCommission',coalesce(p_use_commission,false),'useSetDiscount',coalesce(p_use_set_discount,false),'useFinalDiscount',coalesce(p_use_final_discount,false),'useFuelCharge',coalesce(p_use_fuel_charge,false),'currencies',v_selected);
 update public.ks_pricing_categories set product_rules=jsonb_set(coalesce(product_rules,'{}'::jsonb),'{G}',v_rule,true) where id::text=p_category_id;
 get diagnostics v_count=row_count;if v_count<>1 then raise exception 'Pricing Category was not found.'; end if;
 return true;
end $$;
revoke all on function keysuite_g_private.save_rule(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) from public,anon;
grant execute on function keysuite_g_private.save_rule(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) to authenticated;
create or replace function public.keysuite_save_g_category_rule_v50068(
 p_category_id text,p_category_name text,p_product_code text,p_margin numeric,p_normal numeric,p_rare numeric,p_transport numeric,p_use_commission boolean,p_use_set_discount boolean,p_use_final_discount boolean,p_use_fuel_charge boolean,p_currencies jsonb
) returns boolean language sql security invoker set search_path='' as $$
 select keysuite_g_private.save_rule(p_category_id,p_category_name,p_product_code,p_margin,p_normal,p_rare,p_transport,p_use_commission,p_use_set_discount,p_use_final_discount,p_use_fuel_charge,p_currencies);
$$;
revoke all on function public.keysuite_save_g_category_rule_v50068(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) from public,anon;
grant execute on function public.keysuite_save_g_category_rule_v50068(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
