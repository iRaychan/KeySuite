do $$
begin
  if to_regprocedure('public.keysuite_list_keyhq_people_v42922_v04(text)') is null then raise exception 'V0.4 people list RPC is missing'; end if;
  if to_regprocedure('public.keysuite_save_keyhq_people_v42922_v04(text,jsonb)') is null then raise exception 'V0.4 people save RPC is missing'; end if;
  if to_regprocedure('public.keysuite_set_keyhq_presence_v42922_v04(text,text)') is null then raise exception 'V0.4 presence RPC is missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_keyhq_people_v42922' and column_name='presence_state') then raise exception 'presence_state is missing'; end if;
  if has_function_privilege('anon','public.keysuite_set_keyhq_presence_v42922_v04(text,text)','execute') then raise exception 'anon must not update presence'; end if;
  if not has_function_privilege('authenticated','public.keysuite_set_keyhq_presence_v42922_v04(text,text)','execute') then raise exception 'authenticated must update own presence'; end if;
end $$;
