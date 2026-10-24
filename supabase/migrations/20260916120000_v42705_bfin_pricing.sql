-- KeySuite V4.27.05 — independent BFIN (Stainless Steel 316) pricing

begin;

alter table public.ks_products_bfi
  add column if not exists price_bfin_myr_1ph numeric not null default 0,
  add column if not exists price_bfin_myr_3ph numeric not null default 0,
  add column if not exists price_bfin_usd_1ph numeric not null default 0,
  add column if not exists price_bfin_usd_3ph numeric not null default 0,
  add column if not exists price_bfin_rmb_1ph numeric not null default 0,
  add column if not exists price_bfin_rmb_3ph numeric not null default 0,
  add column if not exists rarity_bfin_myr_1ph text not null default 'common',
  add column if not exists rarity_bfin_myr_3ph text not null default 'common',
  add column if not exists rarity_bfin_usd_1ph text not null default 'common',
  add column if not exists rarity_bfin_usd_3ph text not null default 'common',
  add column if not exists rarity_bfin_rmb_1ph text not null default 'common',
  add column if not exists rarity_bfin_rmb_3ph text not null default 'common';

create or replace function public.keysuite_save_bfin_product_price_v42705(
  p_product_id text,
  p_currency text,
  p_price_1ph numeric,
  p_price_3ph numeric,
  p_rarity_1ph text,
  p_rarity_3ph text
) returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
  v_cur text:=upper(trim(coalesce(p_currency,'')));
  v_count integer:=0;
begin
  if not exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=v_email
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  ) then
    raise exception 'Owner permission is required to change BFIN Price List.';
  end if;
  if v_cur not in ('MYR','USD','RMB') then
    raise exception 'Unsupported BFIN currency: %',v_cur;
  end if;

  update public.ks_products_bfi set
    price_bfin_myr_1ph=case when v_cur='MYR' then greatest(coalesce(p_price_1ph,0),0) else price_bfin_myr_1ph end,
    price_bfin_myr_3ph=case when v_cur='MYR' then greatest(coalesce(p_price_3ph,0),0) else price_bfin_myr_3ph end,
    price_bfin_usd_1ph=case when v_cur='USD' then greatest(coalesce(p_price_1ph,0),0) else price_bfin_usd_1ph end,
    price_bfin_usd_3ph=case when v_cur='USD' then greatest(coalesce(p_price_3ph,0),0) else price_bfin_usd_3ph end,
    price_bfin_rmb_1ph=case when v_cur='RMB' then greatest(coalesce(p_price_1ph,0),0) else price_bfin_rmb_1ph end,
    price_bfin_rmb_3ph=case when v_cur='RMB' then greatest(coalesce(p_price_3ph,0),0) else price_bfin_rmb_3ph end,
    rarity_bfin_myr_1ph=case when v_cur='MYR' then lower(coalesce(nullif(trim(p_rarity_1ph),''),'common')) else rarity_bfin_myr_1ph end,
    rarity_bfin_myr_3ph=case when v_cur='MYR' then lower(coalesce(nullif(trim(p_rarity_3ph),''),'common')) else rarity_bfin_myr_3ph end,
    rarity_bfin_usd_1ph=case when v_cur='USD' then lower(coalesce(nullif(trim(p_rarity_1ph),''),'common')) else rarity_bfin_usd_1ph end,
    rarity_bfin_usd_3ph=case when v_cur='USD' then lower(coalesce(nullif(trim(p_rarity_3ph),''),'common')) else rarity_bfin_usd_3ph end,
    rarity_bfin_rmb_1ph=case when v_cur='RMB' then lower(coalesce(nullif(trim(p_rarity_1ph),''),'common')) else rarity_bfin_rmb_1ph end,
    rarity_bfin_rmb_3ph=case when v_cur='RMB' then lower(coalesce(nullif(trim(p_rarity_3ph),''),'common')) else rarity_bfin_rmb_3ph end,
    updated_at=now()
  where id=p_product_id;

  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'BFIN product was not found.'; end if;
  return true;
end $$;

revoke all on function public.keysuite_save_bfin_product_price_v42705(text,text,numeric,numeric,text,text) from public,anon;
grant execute on function public.keysuite_save_bfin_product_price_v42705(text,text,numeric,numeric,text,text) to authenticated;

commit;
