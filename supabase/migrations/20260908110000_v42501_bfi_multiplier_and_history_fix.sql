-- KeySuite V4.25.01 — BFI multiplier safety fix
-- Fixes Supabase/PostgREST safe-update rejection by targeting the singleton app-settings row explicitly.

begin;

create or replace function public.keysuite_save_bfi_multiplier_v42302(p_currency text,p_multiplier numeric)
returns boolean language plpgsql security definer set search_path=public,auth as $$
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
    raise exception 'Owner permission is required to change BFI multiplier.';
  end if;
  if v_cur not in ('USD','RMB') then raise exception 'BFI multiplier only supports USD or RMB.'; end if;
  if coalesce(p_multiplier,0)<=0 then raise exception 'BFI multiplier must be greater than zero.'; end if;

  update public.ks_app_settings
  set bfi_usd_multiplier=case when v_cur='USD' then p_multiplier else bfi_usd_multiplier end,
      bfi_rmb_multiplier=case when v_cur='RMB' then p_multiplier else bfi_rmb_multiplier end
  where id='default';

  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'KeySuite App Settings row "default" was not found.'; end if;
  return true;
end $$;

revoke all on function public.keysuite_save_bfi_multiplier_v42302(text,numeric) from public,anon;
grant execute on function public.keysuite_save_bfi_multiplier_v42302(text,numeric) to authenticated;

notify pgrst,'reload schema';
commit;
