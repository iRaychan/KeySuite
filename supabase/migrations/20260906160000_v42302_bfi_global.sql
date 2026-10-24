-- KeySuite V4.23.02 — BFI global integration
-- Sources:
--   004 - BFI - 260905 - V1.0.xlsx
--   010 - BFI - (Pricelist) - 260906 - V1.0.xlsx
-- BFI is independent of CHC C4/C6. Source price cells are imported as supplied (0.00).

begin;

alter table if exists public.ks_app_settings
  add column if not exists bfi_usd_multiplier numeric not null default 1,
  add column if not exists bfi_rmb_multiplier numeric not null default 1;

create table if not exists public.ks_products_bfi(
  id text primary key,
  model text not null unique,
  source_row integer,
  has_1ph boolean not null default false,
  has_3ph boolean not null default true,
  status text not null default 'active',
  source_workbook text not null default '010 - BFI - (Pricelist) - 260906 - V1.0.xlsx',
  price_myr_1ph numeric not null default 0,
  price_myr_3ph numeric not null default 0,
  price_usd_1ph numeric not null default 0,
  price_usd_3ph numeric not null default 0,
  price_rmb_1ph numeric not null default 0,
  price_rmb_3ph numeric not null default 0,
  rarity_myr_1ph text not null default 'common',
  rarity_myr_3ph text not null default 'common',
  rarity_usd_1ph text not null default 'common',
  rarity_usd_3ph text not null default 'common',
  rarity_rmb_1ph text not null default 'common',
  rarity_rmb_3ph text not null default 'common',
  updated_at timestamptz not null default now()
);

alter table public.ks_products_bfi enable row level security;
drop policy if exists ks_products_bfi_read on public.ks_products_bfi;
create policy ks_products_bfi_read on public.ks_products_bfi for select to authenticated
using (exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=lower(coalesce(auth.jwt()->>'email','')) and coalesce(ua.active,true)=true));
revoke all on public.ks_products_bfi from anon;
grant select on public.ks_products_bfi to authenticated;

insert into public.ks_products_bfi(id,model,source_row,has_1ph,has_3ph,price_myr_1ph,price_myr_3ph,price_usd_1ph,price_usd_3ph,price_rmb_1ph,price_rmb_3ph)
values
  ('bfi-1-2','BFI 1-2',4,true,true,0,0,0,0,0,0),
  ('bfi-1-3','BFI 1-3',5,true,true,0,0,0,0,0,0),
  ('bfi-1-4','BFI 1-4',6,true,true,0,0,0,0,0,0),
  ('bfi-1-5','BFI 1-5',7,true,true,0,0,0,0,0,0),
  ('bfi-1-6','BFI 1-6',8,true,true,0,0,0,0,0,0),
  ('bfi-1-7','BFI 1-7',9,true,true,0,0,0,0,0,0),
  ('bfi-2-2','BFI 2-2',10,true,true,0,0,0,0,0,0),
  ('bfi-2-3','BFI 2-3',11,true,true,0,0,0,0,0,0),
  ('bfi-2-4','BFI 2-4',12,true,true,0,0,0,0,0,0),
  ('bfi-2-5','BFI 2-5',13,true,true,0,0,0,0,0,0),
  ('bfi-2-6','BFI 2-6',14,true,true,0,0,0,0,0,0),
  ('bfi-2-7','BFI 2-7',15,true,true,0,0,0,0,0,0),
  ('bfi-3-2','BFI 3-2',16,true,true,0,0,0,0,0,0),
  ('bfi-3-3','BFI 3-3',17,true,true,0,0,0,0,0,0),
  ('bfi-3-4','BFI 3-4',18,true,true,0,0,0,0,0,0),
  ('bfi-3-5','BFI 3-5',19,true,true,0,0,0,0,0,0),
  ('bfi-3-6','BFI 3-6',20,true,true,0,0,0,0,0,0),
  ('bfi-3-7','BFI 3-7',21,true,true,0,0,0,0,0,0),
  ('bfi-4-2','BFI 4-2',22,true,true,0,0,0,0,0,0),
  ('bfi-4-3','BFI 4-3',23,true,true,0,0,0,0,0,0),
  ('bfi-4-4','BFI 4-4',24,true,true,0,0,0,0,0,0),
  ('bfi-4-5','BFI 4-5',25,true,true,0,0,0,0,0,0),
  ('bfi-4-6','BFI 4-6',26,true,true,0,0,0,0,0,0),
  ('bfi-4-7','BFI 4-7',27,true,true,0,0,0,0,0,0),
  ('bfi-4-8','BFI 4-8',28,true,true,0,0,0,0,0,0),
  ('bfi-5-2','BFI 5-2',29,true,true,0,0,0,0,0,0),
  ('bfi-5-3','BFI 5-3',30,true,true,0,0,0,0,0,0),
  ('bfi-5-4','BFI 5-4',31,true,true,0,0,0,0,0,0),
  ('bfi-5-5','BFI 5-5',32,true,true,0,0,0,0,0,0),
  ('bfi-5-6','BFI 5-6',33,true,true,0,0,0,0,0,0),
  ('bfi-5-7','BFI 5-7',34,true,true,0,0,0,0,0,0),
  ('bfi-5-8','BFI 5-8',35,true,true,0,0,0,0,0,0),
  ('bfi-8-1','BFI 8-1',36,true,true,0,0,0,0,0,0),
  ('bfi-8-2-1','BFI 8-2-1',37,true,true,0,0,0,0,0,0),
  ('bfi-8-2','BFI 8-2',38,true,true,0,0,0,0,0,0),
  ('bfi-8-3-1','BFI 8-3-1',39,true,true,0,0,0,0,0,0),
  ('bfi-8-3','BFI 8-3',40,true,true,0,0,0,0,0,0),
  ('bfi-8-4-1','BFI 8-4-1',41,true,true,0,0,0,0,0,0),
  ('bfi-8-4','BFI 8-4',42,true,true,0,0,0,0,0,0),
  ('bfi-10-1','BFI 10-1',43,true,true,0,0,0,0,0,0),
  ('bfi-10-2','BFI 10-2',44,true,true,0,0,0,0,0,0),
  ('bfi-10-3','BFI 10-3',45,true,true,0,0,0,0,0,0),
  ('bfi-10-4','BFI 10-4',46,false,true,0,0,0,0,0,0),
  ('bfi-10-5','BFI 10-5',47,false,true,0,0,0,0,0,0),
  ('bfi-11-1','BFI 11-1',48,true,true,0,0,0,0,0,0),
  ('bfi-11-2-1','BFI 11-2-1',49,true,true,0,0,0,0,0,0),
  ('bfi-11-2','BFI 11-2',50,true,true,0,0,0,0,0,0),
  ('bfi-11-3-1','BFI 11-3-1',51,true,true,0,0,0,0,0,0),
  ('bfi-11-3','BFI 11-3',52,false,true,0,0,0,0,0,0),
  ('bfi-12-1','BFI 12-1',53,true,true,0,0,0,0,0,0),
  ('bfi-12-2','BFI 12-2',54,true,true,0,0,0,0,0,0),
  ('bfi-12-3','BFI 12-3',55,true,true,0,0,0,0,0,0),
  ('bfi-12-4','BFI 12-4',56,true,true,0,0,0,0,0,0),
  ('bfi-12-5','BFI 12-5',57,true,true,0,0,0,0,0,0),
  ('bfi-12-6','BFI 12-6',58,false,true,0,0,0,0,0,0),
  ('bfi-15-1','BFI 15-1',59,true,true,0,0,0,0,0,0),
  ('bfi-15-2','BFI 15-2',60,true,true,0,0,0,0,0,0),
  ('bfi-15-3','BFI 15-3',61,true,true,0,0,0,0,0,0),
  ('bfi-15-4','BFI 15-4',62,false,true,0,0,0,0,0,0),
  ('bfi-20-1','BFI 20-1',63,true,true,0,0,0,0,0,0),
  ('bfi-20-2','BFI 20-2',64,true,true,0,0,0,0,0,0),
  ('bfi-20-3','BFI 20-3',65,false,true,0,0,0,0,0,0),
  ('bfi-20-4','BFI 20-4',66,false,true,0,0,0,0,0,0)
on conflict(model) do update set source_row=excluded.source_row,has_1ph=excluded.has_1ph,has_3ph=excluded.has_3ph,source_workbook='010 - BFI - (Pricelist) - 260906 - V1.0.xlsx';

create or replace function public.keysuite_save_bfi_product_price_v42302(
  p_product_id text,p_currency text,p_price_1ph numeric,p_price_3ph numeric,p_rarity_1ph text,p_rarity_3ph text
) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_cur text:=upper(trim(coalesce(p_currency,'')));v_count integer:=0;
begin
  if not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=v_email and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)=true) then raise exception 'Owner permission is required to change BFI Price List.'; end if;
  if v_cur not in ('MYR','USD','RMB') then raise exception 'Unsupported BFI currency: %',v_cur; end if;
  update public.ks_products_bfi set
    price_myr_1ph=case when v_cur='MYR' then greatest(coalesce(p_price_1ph,0),0) else price_myr_1ph end,
    price_myr_3ph=case when v_cur='MYR' then greatest(coalesce(p_price_3ph,0),0) else price_myr_3ph end,
    price_usd_1ph=case when v_cur='USD' then greatest(coalesce(p_price_1ph,0),0) else price_usd_1ph end,
    price_usd_3ph=case when v_cur='USD' then greatest(coalesce(p_price_3ph,0),0) else price_usd_3ph end,
    price_rmb_1ph=case when v_cur='RMB' then greatest(coalesce(p_price_1ph,0),0) else price_rmb_1ph end,
    price_rmb_3ph=case when v_cur='RMB' then greatest(coalesce(p_price_3ph,0),0) else price_rmb_3ph end,
    rarity_myr_1ph=case when v_cur='MYR' then lower(coalesce(nullif(trim(p_rarity_1ph),''),'common')) else rarity_myr_1ph end,
    rarity_myr_3ph=case when v_cur='MYR' then lower(coalesce(nullif(trim(p_rarity_3ph),''),'common')) else rarity_myr_3ph end,
    rarity_usd_1ph=case when v_cur='USD' then lower(coalesce(nullif(trim(p_rarity_1ph),''),'common')) else rarity_usd_1ph end,
    rarity_usd_3ph=case when v_cur='USD' then lower(coalesce(nullif(trim(p_rarity_3ph),''),'common')) else rarity_usd_3ph end,
    rarity_rmb_1ph=case when v_cur='RMB' then lower(coalesce(nullif(trim(p_rarity_1ph),''),'common')) else rarity_rmb_1ph end,
    rarity_rmb_3ph=case when v_cur='RMB' then lower(coalesce(nullif(trim(p_rarity_3ph),''),'common')) else rarity_rmb_3ph end,
    updated_at=now()
  where id=p_product_id;
  get diagnostics v_count=row_count;if v_count<>1 then raise exception 'BFI product was not found.'; end if;return true;
end $$;
revoke all on function public.keysuite_save_bfi_product_price_v42302(text,text,numeric,numeric,text,text) from public,anon;
grant execute on function public.keysuite_save_bfi_product_price_v42302(text,text,numeric,numeric,text,text) to authenticated;

create or replace function public.keysuite_save_bfi_multiplier_v42302(p_currency text,p_multiplier numeric)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_cur text:=upper(trim(coalesce(p_currency,'')));v_count integer:=0;
begin
  if not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=v_email and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)=true) then raise exception 'Owner permission is required to change BFI multiplier.'; end if;
  if v_cur not in ('USD','RMB') then raise exception 'BFI multiplier only supports USD or RMB.'; end if;
  if coalesce(p_multiplier,0)<=0 then raise exception 'BFI multiplier must be greater than zero.'; end if;
  update public.ks_app_settings set bfi_usd_multiplier=case when v_cur='USD' then p_multiplier else bfi_usd_multiplier end,bfi_rmb_multiplier=case when v_cur='RMB' then p_multiplier else bfi_rmb_multiplier end;
  get diagnostics v_count=row_count;if v_count<1 then raise exception 'KeySuite App Settings row was not found.';end if;return true;
end $$;
revoke all on function public.keysuite_save_bfi_multiplier_v42302(text,numeric) from public,anon;
grant execute on function public.keysuite_save_bfi_multiplier_v42302(text,numeric) to authenticated;

create or replace function public.keysuite_save_oem_series_mapping_v41503(p_mapping jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
  v_company public.ks_oem_brand_family_map.company_id%type;
  v_id public.ks_oem_brand_family_map.id%type;
  v_brand public.ks_oem_brand_family_map.brand_id%type;
  v_old_brand public.ks_oem_brand_family_map.brand_id%type;
  v_group text;
  v_old_group text;
  v_brand_series text;
  v_master_series text;
  v_selling_series text;
  v_active boolean;
  v_count integer:=0;
begin
  select ua.company_id
  into v_company
  from public.ks_user_access ua
  where lower(coalesce(ua.email,''))=v_email
    and coalesce(ua.active,true)=true
    and lower(coalesce(ua.role,'')) in ('owner','admin')
  limit 1;

  if v_company is null then
    raise exception 'Owner/Admin permission is required to manage OEM Price Groups.';
  end if;

  v_id:=nullif(p_mapping->>'id','');
  v_brand:=nullif(p_mapping->>'brand_id','');
  v_old_brand:=nullif(p_mapping->>'old_brand_id','');
  v_group:=upper(trim(coalesce(p_mapping->>'price_group_code',p_mapping->>'product_group_code',p_mapping->>'master_family','')));
  v_old_group:=upper(trim(coalesce(p_mapping->>'old_master_family','')));
  v_brand_series:=trim(coalesce(p_mapping->>'brand_series',''));
  v_master_series:=trim(coalesce(p_mapping->>'master_series',''));
  v_selling_series:=trim(coalesce(p_mapping->>'selling_series',''));
  v_active:=coalesce((p_mapping->>'active')::boolean,true);

  -- Backward compatibility: any caller still sending CHC means CHC G2.
  if v_group='CHC' then v_group:='CHC_G2'; end if;
  if v_old_group='CHC' then v_old_group:='CHC_G2'; end if;

  if v_id is null or v_brand is null then
    raise exception 'Mapping ID and Brand are required.';
  end if;

  if v_group not in ('CHC_G1','CHC_G2','BFI','ES','MOTOR') then
    raise exception 'Unsupported Price Group: %',v_group;
  end if;

  if v_brand_series='' or v_master_series='' or v_selling_series='' then
    raise exception 'Brand Series, Base Sub Series and Selling Sub Series are required.';
  end if;

  update public.ks_oem_brand_family_map
  set brand_id=v_brand,
      master_family=v_group,
      master_series=v_master_series,
      selling_series=v_selling_series,
      active=v_active,
      updated_at=now()
  where id=v_id and company_id=v_company;
  get diagnostics v_count=row_count;

  if v_count=0 then
    insert into public.ks_oem_brand_family_map
      (id,company_id,brand_id,master_family,master_series,selling_series,active,updated_at)
    values
      (v_id,v_company,v_brand,v_group,v_master_series,v_selling_series,v_active,now());
  end if;

  update public.ks_oem_brand_series
  set brand_series=v_brand_series,
      active=v_active,
      updated_at=now()
  where company_id=v_company
    and brand_id=v_brand
    and upper(product_group)=v_group;
  get diagnostics v_count=row_count;

  if v_count=0 then
    insert into public.ks_oem_brand_series
      (company_id,brand_id,product_group,brand_series,active,updated_at)
    values
      (v_company,v_brand,v_group,v_brand_series,v_active,now());
  end if;

  if v_old_brand is not null
     and v_old_group<>''
     and (v_old_brand is distinct from v_brand or v_old_group is distinct from v_group)
     and not exists(
       select 1
       from public.ks_oem_brand_family_map m
       where m.company_id=v_company
         and m.brand_id=v_old_brand
         and upper(m.master_family)=v_old_group
         and coalesce(m.active,true)=true
     )
  then
    delete from public.ks_oem_brand_series
    where company_id=v_company
      and brand_id=v_old_brand
      and upper(product_group)=v_old_group;
  end if;

  return jsonb_build_object(
    'id',v_id,
    'brand_id',v_brand,
    'price_group_code',v_group,
    'base_family',case when v_group in ('CHC_G1','CHC_G2') then 'CHC' else v_group end,
    'generation_code',case when v_group='CHC_G1' then 'G1' when v_group='CHC_G2' then 'G2' else null end
  );
end
$$;

revoke all on function public.keysuite_save_oem_series_mapping_v41503(jsonb) from public,anon;
grant execute on function public.keysuite_save_oem_series_mapping_v41503(jsonb) to authenticated;

create or replace function public.keysuite_save_category_currency_selection_v41511(p_category_id text,p_product_code text,p_currencies jsonb)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_code text:=upper(trim(coalesce(p_product_code,'')));v_selected jsonb:='[]'::jsonb;v_value text;v_rules jsonb;v_rule jsonb;v_legacy_rule jsonb;v_count integer:=0;
begin
  if not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=v_email and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)=true) then raise exception 'Owner permission is required to change Category Price List Currency.'; end if;
  if coalesce(trim(p_category_id),'')='' then raise exception 'Pricing Category ID is required.'; end if;
  if v_code='CHC' then v_code:='CHC_G2'; end if;
  if v_code not in ('CHC_G1','CHC_G2','BFI','ES','GWS','KEYPLC','MANIFOLD','MOTOR','COUPLING','BASEPLATE') then raise exception 'Unsupported product code: %.',coalesce(nullif(v_code,''),'(blank)'); end if;
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

create or replace function public.keysuite_v41801_customer_price_assignment(
  p_user_email text,
  p_customer_id text,
  p_brand_ref text,
  p_price_group text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
set row_security=off
as $$
declare
  v_email text := lower(trim(coalesce(p_user_email,'')));
  v_customer text := trim(coalesce(p_customer_id,''));
  v_brand_ref text := trim(coalesce(p_brand_ref,''));
  v_brand_norm text := lower(regexp_replace(trim(coalesce(p_brand_ref,'')),'[^a-z0-9]','','g'));
  v_group text := upper(regexp_replace(trim(coalesce(p_price_group,'')),'\s+','_','g'));
  v_uid uuid;
  v_company text := '';
  v_brand_id text := '';
  v_pref jsonb := null;
  v_price_key text := '';
  v_allowed boolean := false;
begin
  if v_email='' then
    raise exception 'Linked KeySuite user email is required.';
  end if;
  if v_customer='' then
    raise exception 'Customer ID is required.';
  end if;
  if v_group='' then
    raise exception 'Price Group is required.';
  end if;

  if v_group='CHC' then v_group:='CHC_G2'; end if;

  if v_group not in ('CHC_G1','CHC_G2','BFI','ES','MOTOR','BASEPLATE','COUPLING','KEYPLC','MANIFOLD','GWS') then
    return jsonb_build_object(
      'allowed',false,
      'code','UNKNOWN_PRICE_GROUP',
      'customer_id',v_customer,
      'price_group',v_group
    );
  end if;

  select c.company_id::text
    into v_company
  from public.ks_customers c
  where c.id::text=v_customer
    and coalesce(c.status,'active')='active'
  limit 1;

  if coalesce(v_company,'')='' then
    return jsonb_build_object(
      'allowed',false,
      'code','CUSTOMER_NOT_FOUND',
      'customer_id',v_customer,
      'price_group',v_group
    );
  end if;

  select u.id into v_uid
  from auth.users u
  where lower(trim(coalesce(u.email,'')))=v_email
  limit 1;

  if v_uid is null then
    raise exception 'Linked KeySuite user was not found in Supabase Auth.';
  end if;

  if not exists (
    select 1
    from public.ks_user_access ua
    where ua.company_id::text=v_company
      and lower(trim(coalesce(ua.email,'')))=v_email
      and coalesce(ua.active,false)=true
  ) then
    raise exception 'Linked KeySuite user has no active access to this customer company.';
  end if;

  if to_regprocedure('public.keysuite_get_customer_price_preference_v41710(text)') is null then
    raise exception 'V4.17.10 Customer Price Preference is not installed.';
  end if;

  -- Read the exact V4.17.10 central row first using the already-validated
  -- Customer company. This avoids any ambiguity for users who can access more
  -- than one KeySuite company.
  select p.selection
    into v_pref
  from public.ks_customer_brand_price_preference_v41710 p
  where p.company_id=v_company
    and p.customer_id=v_customer
  limit 1;

  -- If the central row has never been created, let the existing V4.17.10
  -- getter perform its lazy import from the legacy preference store. Any
  -- legacy-read problem is treated as not assigned; it must never fall back to
  -- another Customer or Price Group.
  if v_pref is null then
    perform set_config('request.jwt.claim.sub',v_uid::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object('sub',v_uid::text,'email',v_email,'role','authenticated')::text,
      true
    );
    begin
      select public.keysuite_get_customer_price_preference_v41710(v_customer)
        into v_pref;
    exception when others then
      v_pref := null;
    end;
  end if;

  v_pref := coalesce(
    v_pref,
    '{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb
  );

  -- The house Price Groups use the same permanent virtual Brand IDs as the
  -- V4.17.10 browser preference editor.
  if v_group in ('BASEPLATE','COUPLING','KEYPLC','MANIFOLD') then
    v_brand_id := 'KEYLARGO';
  elsif v_group='GWS' then
    v_brand_id := 'GWS';
  else
    -- Hydraulic/Motor products use a real active selling Brand ID. Accept the
    -- actual ID or a Brand Name / Brand Key such as B.G.Reich.
    select b.id::text
      into v_brand_id
    from public.ks_oem_brands b
    where b.company_id::text=v_company
      and coalesce(b.active,true)=true
      and (
        lower(b.id::text)=lower(v_brand_ref)
        or lower(regexp_replace(trim(coalesce(b.brand_name,'')),'[^a-z0-9]','','g'))=v_brand_norm
        or lower(regexp_replace(trim(coalesce(b.brand_key,'')),'[^a-z0-9]','','g'))=v_brand_norm
      )
    order by
      case when lower(b.id::text)=lower(v_brand_ref) then 0
           when lower(regexp_replace(trim(coalesce(b.brand_key,'')),'[^a-z0-9]','','g'))=v_brand_norm then 1
           else 2 end,
      b.brand_name
    limit 1;
  end if;

  if coalesce(v_brand_id,'')='' then
    return jsonb_build_object(
      'allowed',false,
      'code','BRAND_NOT_FOUND',
      'customer_id',v_customer,
      'brand_ref',v_brand_ref,
      'price_group',v_group
    );
  end if;

  v_price_key := v_brand_id || '|' || v_group;

  select exists(
    select 1
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(v_pref->'price_keys')='array' then v_pref->'price_keys'
        else '[]'::jsonb
      end
    ) x(value)
    where trim(x.value)=v_price_key
  ) into v_allowed;

  return jsonb_build_object(
    'allowed',coalesce(v_allowed,false),
    'code',case when coalesce(v_allowed,false) then 'OK' else 'PRICE_NOT_ASSIGNED' end,
    'company_id',v_company,
    'customer_id',v_customer,
    'brand_id',v_brand_id,
    'price_group',v_group,
    'price_key',v_price_key
  );
end;
$$;

revoke all on function public.keysuite_v41801_customer_price_assignment(text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.keysuite_v41801_customer_price_assignment(text,text,text,text)
  to service_role;

comment on function public.keysuite_v41801_customer_price_assignment(text,text,text,text)
is 'V4.18.01 KeyAI service-role gate: follows the exact Customer Brand / Series Price Preference from V4.17.10.';

create or replace function public.keysuite_v41802_keybot_available_products(
  p_user_email text,
  p_customer_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
set row_security=off
as $$
declare
  v_email text := lower(trim(coalesce(p_user_email,'')));
  v_customer text := trim(coalesce(p_customer_id,''));
  v_company text := '';
  v_role text := '';
  v_access jsonb := '{}'::jsonb;
  v_pref jsonb := '{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb;
  v_scope jsonb := '{"keys":[]}'::jsonb;
  v_permissions jsonb := '{}'::jsonb;
  v_product_permission text := '';
  v_product_scope text := 'assigned';
  v_result jsonb := '[]'::jsonb;
begin
  if v_email='' then
    raise exception 'Linked KeySuite user email is required.';
  end if;
  if v_customer='' then
    raise exception 'Customer ID is required.';
  end if;

  v_access := public.keysuite_v41803_keybot_customer_access(v_email,v_customer);

  if coalesce((v_access->>'allowed')::boolean,false) is not true then
    return jsonb_build_object(
      'allowed',false,
      'code',coalesce(v_access->>'code','CUSTOMER_NOT_ALLOWED'),
      'customer_scope',coalesce(v_access->>'scope','none'),
      'customer_id',v_customer,
      'product_permission','none',
      'product_scope','none',
      'products','[]'::jsonb
    );
  end if;

  v_company := coalesce(v_access->>'company_id','');
  v_role := lower(trim(coalesce(v_access->>'role','user')));

  -- Saved Role permission wins. Fallback only protects old databases where
  -- use_product has not yet been written into the role JSON.
  v_product_permission := case when v_role='owner' then 'full' else 'assigned' end;

  select coalesce(rp.permissions,'{}'::jsonb)
    into v_permissions
  from public.ks_role_permissions rp
  where rp.company_id::text=v_company
    and lower(trim(coalesce(rp.role,'')))=v_role
  limit 1;

  if found and v_permissions ? 'use_product' then
    v_product_permission := lower(trim(coalesce(v_permissions->>'use_product','none')));
  end if;

  v_product_scope := case
    when v_product_permission in ('full','all') then 'all'
    when v_product_permission in ('assigned','own','self','restricted') then 'assigned'
    else 'none'
  end;

  if v_product_scope='none' then
    return jsonb_build_object(
      'allowed',false,
      'code','PRODUCT_PERMISSION_NONE',
      'customer_scope',coalesce(v_access->>'scope','none'),
      'customer_id',v_customer,
      'user_email',v_email,
      'role',v_role,
      'product_permission',v_product_permission,
      'product_scope',v_product_scope,
      'products','[]'::jsonb
    );
  end if;

  select coalesce(p.selection,'{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb)
    into v_pref
  from public.ks_customer_brand_price_preference_v41710 p
  where p.company_id=v_company
    and p.customer_id=v_customer
  limit 1;

  v_pref := coalesce(v_pref,'{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb);

  if v_product_scope='assigned' then
    select coalesce(s.selection_scope,'{"keys":[]}'::jsonb)
      into v_scope
    from public.ks_user_selection_scope_v41706 s
    where s.company_id=v_company
      and lower(trim(coalesce(s.email,'')))=v_email
    limit 1;
    v_scope := coalesce(v_scope,'{"keys":[]}'::jsonb);
  end if;

  with customer_price_keys as (
    select distinct trim(k.value) as price_key,
      split_part(trim(k.value),'|',1) as brand_id,
      upper(split_part(trim(k.value),'|',2)) as price_group
    from jsonb_array_elements_text(
      case when jsonb_typeof(v_pref->'price_keys')='array'
        then v_pref->'price_keys' else '[]'::jsonb end
    ) k
    where trim(k.value)<>'' and position('|' in trim(k.value))>1
  ), mapped as (
    select *,
      case
        when price_group in ('CHC_G1','CHC_G2') then 'CHC'
        when price_group='GWS' then 'TANK'
        else price_group
      end as role_family,
      case price_group
        when 'CHC_G1' then 'CHC G1'
        when 'CHC_G2' then 'CHC G2'
        when 'BFI' then 'BFI'
        when 'ES' then 'End Suction'
        when 'MOTOR' then 'Motor'
        when 'BASEPLATE' then 'Baseplate'
        when 'COUPLING' then 'Coupling'
        when 'KEYPLC' then 'KeyPLC Panel'
        when 'MANIFOLD' then 'Manifold'
        when 'GWS' then 'GWS Tank'
        else price_group
      end as product_label,
      price_group in ('CHC_G2','BFI','ES') as has_curve
    from customer_price_keys
    where price_group in ('CHC_G1','CHC_G2','BFI','ES','MOTOR','BASEPLATE','COUPLING','KEYPLC','MANIFOLD','GWS')
  ), allowed as (
    select m.*,
      case
        when upper(m.brand_id)='KEYLARGO' then 'Keylargo'
        when upper(m.brand_id)='GWS' then 'GWS'
        else coalesce(nullif(trim(b.brand_name),''),nullif(trim(b.brand_key),''),m.brand_id)
      end as brand_name
    from mapped m
    left join public.ks_oem_brands b
      on b.company_id::text=v_company
     and b.id::text=m.brand_id
     and coalesce(b.active,true)=true
    where v_product_scope='all'
       or exists (
         select 1
         from jsonb_array_elements_text(
           case when jsonb_typeof(v_scope->'keys')='array'
             then v_scope->'keys' else '[]'::jsonb end
         ) s
         where trim(s.value)=m.brand_id||'|*'
            or trim(s.value)=m.brand_id||'|'||m.role_family
       )
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key',a.price_key,
      'brand_id',a.brand_id,
      'brand_name',a.brand_name,
      'price_group',a.price_group,
      'role_family',a.role_family,
      'product_label',a.product_label,
      'has_curve',a.has_curve,
      'product_type',case
        when a.price_group in ('CHC_G1','CHC_G2','BFI','ES') then 'pump'
        when a.price_group='MOTOR' then 'motor'
        when a.price_group='GWS' then 'tank'
        when a.price_group='KEYPLC' then 'keyplc_panel'
        when a.price_group='MANIFOLD' then 'manifold'
        when a.price_group='BASEPLATE' then 'baseplate'
        when a.price_group='COUPLING' then 'coupling'
        else lower(a.price_group)
      end
    ) order by lower(a.brand_name), lower(a.product_label)
  ),'[]'::jsonb)
  into v_result
  from allowed a;

  return jsonb_build_object(
    'allowed',true,
    'code','OK',
    'customer_scope',coalesce(v_access->>'scope','none'),
    'customer_id',v_customer,
    'user_email',v_email,
    'role',v_role,
    'product_permission',v_product_permission,
    'product_scope',v_product_scope,
    'products',coalesce(v_result,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.keysuite_v41802_keybot_available_products(text,text)
  from public,anon,authenticated;
grant execute on function public.keysuite_v41802_keybot_available_products(text,text)
  to service_role;

comment on function public.keysuite_v41802_keybot_available_products(text,text)
is 'V4.23.02 KeyBot Product: saved Role use_product full/all = all user products; assigned scope intersects Role Brand Assigned; Customer Price Preference filters products; includes independent BFI.';

notify pgrst,'reload schema';
commit;
