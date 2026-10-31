-- KeySuite V5.00.17 — KV category, Price List and quotation pricing.
alter table public.ks_app_settings add column if not exists kv_usd_multiplier numeric not null default 5.8;
alter table public.ks_app_settings add column if not exists kv_rmb_multiplier numeric not null default 0.65;

create table if not exists public.ks_products_kv (
  id text primary key,
  model text not null unique,
  source_row integer not null,
  source_workbook text not null,
  price_usd numeric not null default 0,
  price_rmb numeric not null default 0,
  price_myr numeric not null default 0,
  rarity_usd text not null default 'common',
  rarity_rmb text not null default 'common',
  rarity_myr text not null default 'common',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint ks_products_kv_rarity_ck check (
    rarity_usd in ('common','many','rare','fixed') and
    rarity_rmb in ('common','many','rare','fixed') and
    rarity_myr in ('common','many','rare','fixed')
  )
);

insert into public.ks_products_kv
  (id,model,source_row,source_workbook,price_usd,price_rmb,price_myr,rarity_usd,rarity_rmb,rarity_myr)
values
  ('KV:KV 1-20','KV 1-20',4,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-30','KV 1-30',5,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-40','KV 1-40',6,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-50','KV 1-50',7,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-60','KV 1-60',8,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-70','KV 1-70',9,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-80','KV 1-80',10,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-90','KV 1-90',11,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-100','KV 1-100',12,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-110','KV 1-110',13,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-120','KV 1-120',14,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-130','KV 1-130',15,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-140','KV 1-140',16,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-150','KV 1-150',17,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-160','KV 1-160',18,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-170','KV 1-170',19,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-180','KV 1-180',20,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-190','KV 1-190',21,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-200','KV 1-200',22,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-210','KV 1-210',23,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-220','KV 1-220',24,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-230','KV 1-230',25,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-240','KV 1-240',26,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-250','KV 1-250',27,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-260','KV 1-260',28,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-270','KV 1-270',29,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-280','KV 1-280',30,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-290','KV 1-290',31,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-300','KV 1-300',32,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-310','KV 1-310',33,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-320','KV 1-320',34,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-330','KV 1-330',35,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-340','KV 1-340',36,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-350','KV 1-350',37,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-360','KV 1-360',38,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-370','KV 1-370',39,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-380','KV 1-380',40,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-390','KV 1-390',41,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common'),
  ('KV:KV 1-400','KV 1-400',42,'004 - KV 261029 - V1.0 - Copy.xlsx',0,0,0,'common','common','common')
on conflict (id) do update set
  model=excluded.model, source_row=excluded.source_row,
  source_workbook=excluded.source_workbook, active=true;

alter table public.ks_products_kv enable row level security;
drop policy if exists ks_products_kv_read on public.ks_products_kv;
create policy ks_products_kv_read on public.ks_products_kv for select to authenticated using (active=true);
revoke all on public.ks_products_kv from anon;
grant select on public.ks_products_kv to authenticated;

create or replace function public.keysuite_is_owner_v50017()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.ks_user_access
    where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and lower(role)='owner' and coalesce(active,true)=true
  );
$$;

create or replace function public.keysuite_save_kv_product_price_v50017(
  p_product_id text, p_currency text, p_price numeric, p_rarity text
)
returns public.ks_products_kv language plpgsql security definer set search_path=public as $$
declare
  v_currency text:=upper(trim(coalesce(p_currency,'')));
  v_rarity text:=lower(trim(coalesce(p_rarity,'common')));
  result public.ks_products_kv;
begin
  if not public.keysuite_is_owner_v50017() then raise exception 'Owner access required'; end if;
  if v_currency not in ('USD','RMB','MYR') then raise exception 'Unsupported currency'; end if;
  if v_rarity not in ('common','many','rare','fixed') then raise exception 'Unsupported rarity'; end if;
  if coalesce(p_price,0)<0 then raise exception 'Price cannot be negative'; end if;
  execute format(
    'update public.ks_products_kv set price_%1$s=$1,rarity_usd=$2,rarity_rmb=$2,rarity_myr=$2,updated_at=now() where id=$3 returning *',
    lower(v_currency)
  ) into result using coalesce(p_price,0),v_rarity,p_product_id;
  if result.id is null then raise exception 'KV product not found'; end if;
  return result;
end;
$$;

revoke all on function public.keysuite_is_owner_v50017() from public,anon,authenticated;

create or replace function public.keysuite_save_kv_multiplier_v50017(p_currency text,p_multiplier numeric)
returns public.ks_app_settings language plpgsql security definer set search_path=public as $$
declare v_currency text:=upper(trim(coalesce(p_currency,'')));result public.ks_app_settings;
begin
  if not public.keysuite_is_owner_v50017() then raise exception 'Owner access required'; end if;
  if v_currency not in ('USD','RMB') or coalesce(p_multiplier,0)<=0 then raise exception 'Invalid multiplier'; end if;
  execute format('update public.ks_app_settings set kv_%1$s_multiplier=$1 where id=''default'' returning *',lower(v_currency)) into result using p_multiplier;
  return result;
end;
$$;

create or replace function public.keysuite_save_kv_category_rule_v50017(
  p_category_id text,p_category_name text,p_product_code text,p_margin numeric,p_normal numeric,
  p_rare numeric,p_transport numeric,p_use_commission boolean,p_use_set_discount boolean,
  p_use_final_discount boolean,p_use_fuel_charge boolean
)
returns public.ks_pricing_categories language plpgsql security definer set search_path=public as $$
declare result public.ks_pricing_categories;rule jsonb;
begin
  if not public.keysuite_is_owner_v50017() then raise exception 'Owner access required'; end if;
  rule=jsonb_build_object('margin',p_margin,'normal',p_normal,'rare',p_rare,'trimming',0,'transport',p_transport,
    'useCommission',p_use_commission,'useSetDiscount',p_use_set_discount,
    'useFinalDiscount',p_use_final_discount,'useFuelCharge',p_use_fuel_charge);
  update public.ks_pricing_categories set
    category_name=coalesce(nullif(trim(p_category_name),''),category_name),
    product_rules=coalesce(product_rules,'{}'::jsonb)||jsonb_build_object('KV',rule),updated_at=now()
  where id::text=p_category_id returning * into result;
  if result.id is null then raise exception 'Pricing category not found'; end if;
  return result;
end;
$$;

revoke all on function public.keysuite_save_kv_product_price_v50017(text,text,numeric,text) from public,anon;
grant execute on function public.keysuite_save_kv_product_price_v50017(text,text,numeric,text) to authenticated;
revoke all on function public.keysuite_save_kv_multiplier_v50017(text,numeric) from public,anon;
grant execute on function public.keysuite_save_kv_multiplier_v50017(text,numeric) to authenticated;
revoke all on function public.keysuite_save_kv_category_rule_v50017(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.keysuite_save_kv_category_rule_v50017(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean) to authenticated;

-- Extend the shared category-currency RPC to accept KV while preserving every
-- existing product code and the legacy CHC alias behaviour.
create or replace function public.keysuite_save_category_currency_selection_v41511(p_category_id text,p_product_code text,p_currencies jsonb)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_code text:=upper(trim(coalesce(p_product_code,'')));v_selected jsonb:='[]'::jsonb;v_value text;v_rules jsonb;v_rule jsonb;v_legacy_rule jsonb;v_count integer:=0;
begin
  if not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=v_email and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)=true) then raise exception 'Owner permission is required to change Category Price List Currency.'; end if;
  if coalesce(trim(p_category_id),'')='' then raise exception 'Pricing Category ID is required.'; end if;
  if v_code='CHC' then v_code:='CHC_G2'; end if;
  if v_code not in ('CHC_G1','CHC_G2','CR','KV','BFI','BGF','ISO','ES','GWS','KEYPLC','MANIFOLD','MOTOR','COUPLING','BASEPLATE') then raise exception 'Unsupported product code: %.',coalesce(nullif(v_code,''),'(blank)'); end if;
  if p_currencies is null or jsonb_typeof(p_currencies)<>'array' then p_currencies:='[]'::jsonb; end if;
  for v_value in select upper(trim(value)) from jsonb_array_elements_text(p_currencies) loop
    if v_value in ('USD','RMB','MYR') and not (v_selected ? v_value) then v_selected:=v_selected||jsonb_build_array(v_value); end if;
  end loop;
  select coalesce(product_rules,'{}'::jsonb) into v_rules from public.ks_pricing_categories where id::text=p_category_id for update;
  if not found then raise exception 'Pricing Category was not found.'; end if;
  v_rule:=coalesce(v_rules->v_code,'{}'::jsonb);v_rule:=jsonb_set(v_rule,'{currencies}',v_selected,true);v_rules:=jsonb_set(v_rules,array[v_code],v_rule,true);
  if v_code='CHC_G2' then v_legacy_rule:=coalesce(v_rules->'CHC','{}'::jsonb);v_legacy_rule:=jsonb_set(v_legacy_rule,'{currencies}',v_selected,true);v_rules:=jsonb_set(v_rules,'{CHC}',v_legacy_rule,true);end if;
  update public.ks_pricing_categories set product_rules=v_rules where id::text=p_category_id;get diagnostics v_count=row_count;if v_count<>1 then raise exception 'Pricing Category currency selection was not saved.';end if;return true;
end $$;
revoke all on function public.keysuite_save_category_currency_selection_v41511(text,text,jsonb) from public,anon;
grant execute on function public.keysuite_save_category_currency_selection_v41511(text,text,jsonb) to authenticated;

notify pgrst,'reload schema';
