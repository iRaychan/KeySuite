begin;

alter table public.ks_app_settings
  add column if not exists bgf_usd_multiplier numeric,
  add column if not exists bgf_rmb_multiplier numeric,
  add column if not exists g_usd_multiplier numeric,
  add column if not exists g_rmb_multiplier numeric;

create or replace function keysuite_g_private.save_multiplier(
  p_product_code text, p_currency text, p_multiplier numeric
) returns table(usd_multiplier numeric, rmb_multiplier numeric)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.ks_user_access u
    where lower(u.email) = lower(auth.jwt()->>'email')
      and lower(u.role) = 'owner' and coalesce(u.active, true)
  ) then
    raise exception 'Owner permission is required.' using errcode = '42501';
  end if;
  if p_product_code not in ('BGF','G') or p_product_code is null
     or p_currency not in ('USD','RMB') or p_currency is null
     or p_multiplier is null or p_multiplier <= 0
     or p_multiplier::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Invalid series, currency or multiplier.';
  end if;
  return query execute pg_catalog.format(
    'update public.ks_app_settings set %I=$1 where id=''default'' returning %I,%I',
    lower(p_product_code || '_' || p_currency || '_multiplier'),
    lower(p_product_code || '_usd_multiplier'), lower(p_product_code || '_rmb_multiplier')
  ) using p_multiplier;
  if not found then raise exception 'KeySuite application settings were not found.'; end if;
end;
$$;

create or replace function public.keysuite_save_bgf_g_multiplier_v50071(
  p_product_code text, p_currency text, p_multiplier numeric
) returns table(usd_multiplier numeric, rmb_multiplier numeric)
language sql security invoker set search_path = ''
as $$
  select * from keysuite_g_private.save_multiplier(p_product_code,p_currency,p_multiplier);
$$;

create or replace function public.keysuite_save_g_price_pair_v50071(
  p_base_model text, p_currency text, p_price_1ph numeric, p_price_3ph numeric,
  p_rarity_1ph text, p_rarity_3ph text
) returns void language plpgsql security invoker set search_path = ''
as $$
declare
  updated_rows integer;
begin
  if p_currency not in ('USD','RMB','MYR') or p_currency is null
     or p_price_1ph is null or p_price_3ph is null
     or least(p_price_1ph,p_price_3ph) < 0
     or p_price_1ph::text in ('NaN','Infinity','-Infinity')
     or p_price_3ph::text in ('NaN','Infinity','-Infinity')
     or p_rarity_1ph is null or p_rarity_3ph is null
     or p_rarity_1ph not in ('common','many','rare','fixed')
     or p_rarity_3ph not in ('common','many','rare','fixed') then
    raise exception 'Invalid currency, price or rarity.';
  end if;
  execute pg_catalog.format(
    'update public.ks_products_g
       set %I=case phase when ''1Ph'' then $1 else $2 end,
           %I=case phase when ''1Ph'' then $3 else $4 end, updated_at=now()
     where base_model=$5 and active
       and ((phase=''1Ph'' and model=$5 || ''M'') or (phase=''3Ph'' and model=$5 || ''T''))',
    'price_' || lower(p_currency), 'rarity_' || lower(p_currency)
  ) using p_price_1ph,p_price_3ph,p_rarity_1ph,p_rarity_3ph,p_base_model;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 2 then raise exception 'Both active variants and Owner access are required.'; end if;
end;
$$;

revoke all on function keysuite_g_private.save_multiplier(text,text,numeric) from public, anon, authenticated;
revoke all on function public.keysuite_save_bgf_g_multiplier_v50071(text,text,numeric) from public, anon, authenticated;
revoke all on function public.keysuite_save_g_price_pair_v50071(text,text,numeric,numeric,text,text) from public, anon, authenticated;
grant execute on function keysuite_g_private.save_multiplier(text,text,numeric) to authenticated;
grant execute on function public.keysuite_save_bgf_g_multiplier_v50071(text,text,numeric) to authenticated;
grant execute on function public.keysuite_save_g_price_pair_v50071(text,text,numeric,numeric,text,text) to authenticated;
notify pgrst, 'reload schema';

commit;
