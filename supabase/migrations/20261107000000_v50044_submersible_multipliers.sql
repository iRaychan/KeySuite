begin;
alter table public.ks_app_settings
  add column if not exists bsv_usd_multiplier numeric,
  add column if not exists bsv_rmb_multiplier numeric,
  add column if not exists bsw_usd_multiplier numeric,
  add column if not exists bsw_rmb_multiplier numeric;

create function public.keysuite_save_submersible_multiplier_v50044(
  p_product_code text, p_currency text, p_multiplier numeric
)
returns table(usd_multiplier numeric, rmb_multiplier numeric)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or public.keysuite_permission_level('manage_price_list') is distinct from 'full' then
    raise exception 'Your role is not allowed to maintain Price List settings.';
  end if;
  if p_product_code is null or p_product_code not in ('BSV','BSW')
     or p_currency is null or p_currency not in ('USD','RMB')
     or p_multiplier is null or p_multiplier <= 0
     or p_multiplier::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Invalid series, currency or multiplier.';
  end if;
  return query execute pg_catalog.format(
    'update public.ks_app_settings set %I=$1 where id=''default'' returning %I,%I',
    lower(p_product_code || '_' || p_currency || '_multiplier'),
    lower(p_product_code || '_usd_multiplier'), lower(p_product_code || '_rmb_multiplier')
  ) using p_multiplier;
  if not found and not exists(select 1 from public.ks_app_settings where id='default') then
    raise exception 'KeySuite application settings were not found.';
  end if;
end;
$$;
revoke all on function public.keysuite_save_submersible_multiplier_v50044(text,text,numeric) from public, anon, authenticated;
grant execute on function public.keysuite_save_submersible_multiplier_v50044(text,text,numeric) to authenticated;
commit;
