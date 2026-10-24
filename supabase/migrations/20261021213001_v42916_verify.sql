do $$
begin
  if to_regprocedure('public.keysuite_save_quotation_v42916(text,jsonb)') is null then
    raise exception 'V4.29.16 quotation save RPC is missing';
  end if;
  if to_regprocedure('public.keysuite_list_quotations_v42916(text)') is null then
    raise exception 'V4.29.16 quotation list RPC is missing';
  end if;
  if has_function_privilege('anon','public.keysuite_save_quotation_v42916(text,jsonb)','execute') then
    raise exception 'anon must not execute V4.29.16 quotation save RPC';
  end if;
  if not has_function_privilege('authenticated','public.keysuite_save_quotation_v42916(text,jsonb)','execute') then
    raise exception 'authenticated must execute V4.29.16 quotation save RPC';
  end if;
end $$;
