-- KeySuite V4.25.02 verification

do $$
begin
  if to_regprocedure('public.keysuite_save_chc_generation_multiplier_v42502(text,text,numeric)') is null then
    raise exception 'V4.25.02 verification failed: CHC generation multiplier RPC is missing.';
  end if;
  if to_regprocedure('public.keysuite_delete_quotation_v42502(text,text,text,text)') is null then
    raise exception 'V4.25.02 verification failed: quotation delete authority RPC is missing.';
  end if;
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='ks_app_settings' and column_name='chc_g1_usd_multiplier'
  ) then
    raise exception 'V4.25.02 verification failed: CHC G1 multiplier columns are missing.';
  end if;
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='ks_app_settings' and column_name='chc_g2_usd_multiplier'
  ) then
    raise exception 'V4.25.02 verification failed: CHC G2 multiplier columns are missing.';
  end if;
end;
$$;
