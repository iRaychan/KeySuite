do $$
begin
  if to_regclass('public.ks_keyhq_config_v42921') is null then raise exception 'ks_keyhq_config_v42921 is missing'; end if;
  if to_regprocedure('public.keysuite_get_keyhq_config_v42921(text)') is null then raise exception 'keysuite_get_keyhq_config_v42921 is missing'; end if;
  if to_regprocedure('public.keysuite_save_keyhq_config_v42921(text,jsonb)') is null then raise exception 'keysuite_save_keyhq_config_v42921 is missing'; end if;
end $$;
