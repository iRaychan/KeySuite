do $$
begin
  if to_regclass('public.ks_keyhq_people_v42922') is null then
    raise exception 'ks_keyhq_people_v42922 is missing';
  end if;
  if to_regprocedure('public.keysuite_list_keyhq_people_v42922(text)') is null then
    raise exception 'keysuite_list_keyhq_people_v42922 is missing';
  end if;
  if to_regprocedure('public.keysuite_save_keyhq_people_v42922(text,jsonb)') is null then
    raise exception 'keysuite_save_keyhq_people_v42922 is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.ks_keyhq_people_v42922'::regclass) then
    raise exception 'RLS is not enabled on ks_keyhq_people_v42922';
  end if;
end $$;
