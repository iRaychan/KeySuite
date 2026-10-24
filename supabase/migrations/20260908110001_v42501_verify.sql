-- KeySuite V4.25.01 verification
do $$
begin
  if to_regprocedure('public.keysuite_save_bfi_multiplier_v42302(text,numeric)') is null then
    raise exception 'V4.25.01 verification failed: BFI multiplier RPC is missing.';
  end if;
  if not exists(select 1 from public.ks_app_settings where id='default') then
    raise exception 'V4.25.01 verification failed: ks_app_settings default row is missing.';
  end if;
end $$;
