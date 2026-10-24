do $$
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ks_keyhq_people_v42922' and column_name='avatar_skin_tone') then raise exception 'avatar profile columns missing'; end if;
  if to_regprocedure('public.keysuite_list_keyhq_people_v42923(text)') is null then raise exception 'list RPC missing'; end if;
  if to_regprocedure('public.keysuite_save_keyhq_people_v42923(text,jsonb)') is null then raise exception 'owner assignment RPC missing'; end if;
  if to_regprocedure('public.keysuite_save_my_keyhq_avatar_v42923(text,jsonb)') is null then raise exception 'self-service avatar RPC missing'; end if;
  if has_function_privilege('anon','public.keysuite_save_my_keyhq_avatar_v42923(text,jsonb)','execute') then raise exception 'anon must not execute avatar save'; end if;
end $$;
