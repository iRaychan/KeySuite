begin;

-- V4.29.16 makes the quotation write contract explicit. The existing V4.29.15
-- function remains the single atomic number claimant; this wrapper adds
-- insert/update authorization, quantity normalization and an operation result.
create or replace function public.keysuite_save_quotation_v42916(
  p_company_id text,
  p_quotation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=public.keysuite_current_email();
  v_company text:=public.keysuite_current_company_id();
  v_id text:=trim(coalesce(p_quotation->>'id',''));
  v_owner boolean:=false;
  v_exists boolean:=false;
  v_creator text:='';
  v_clean jsonb:=coalesce(p_quotation,'{}'::jsonb);
  v_items jsonb:='[]'::jsonb;
  v_result jsonb;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  if trim(coalesce(p_company_id,''))<>v_company then
    raise exception 'This quotation belongs to another KeySuite company.';
  end if;
  if v_id='' then raise exception 'Quotation ID is required.'; end if;

  select exists(
    select 1 from public.ks_user_access access_row
    where lower(trim(coalesce(access_row.email,'')))=v_email
      and access_row.company_id::text=v_company
      and lower(trim(coalesce(access_row.role,'')))='owner'
      and coalesce(access_row.active,true)=true
  ) into v_owner;

  select true,lower(trim(coalesce(source.created_by_email,'')))
  into v_exists,v_creator
  from (
    select coalesce(
      archived.quote_data->>'createdByEmail',
      archived.quote_data->>'created_by_email'
    ) as created_by_email
    from public.ks_quotation_archive_v409 archived
    where archived.company_id=v_company
      and coalesce(archived.logical_id,archived.quote_data->>'id','')=v_id
    union all
    select coalesce(
      current_quote.quote_data->>'createdByEmail',
      current_quote.quote_data->>'created_by_email'
    )
    from public.ks_quotations current_quote
    where current_quote.company_id=v_company
      and coalesce(current_quote.id::text,current_quote.quote_data->>'id','')=v_id
  ) source
  limit 1;

  if coalesce(v_exists,false) and not v_owner and v_creator<>v_email then
    raise exception 'You may update only quotations assigned to your own account.';
  end if;

  if jsonb_typeof(v_clean->'items')='array' then
    select coalesce(jsonb_agg(
      item || jsonb_build_object(
        'qty',case when coalesce(item->>'qty',item->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$'
          and coalesce(item->>'qty',item->>'quantity')::numeric>0
          then to_jsonb(coalesce(item->>'qty',item->>'quantity')::numeric) else '1'::jsonb end,
        'quantity',case when coalesce(item->>'qty',item->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$'
          and coalesce(item->>'qty',item->>'quantity')::numeric>0
          then to_jsonb(coalesce(item->>'qty',item->>'quantity')::numeric) else '1'::jsonb end
      ) order by ordinal
    ),'[]'::jsonb) into v_items
    from jsonb_array_elements(v_clean->'items') with ordinality as rows(item,ordinal);
    v_clean:=jsonb_set(v_clean,'{items}',v_items,true);
  end if;

  if coalesce(v_exists,false) then
    v_clean:=jsonb_set(v_clean,'{createdByEmail}',to_jsonb(v_creator),true);
  else
    v_clean:=jsonb_set(v_clean,'{createdByEmail}',to_jsonb(v_email),true);
  end if;
  v_clean:=jsonb_set(v_clean,'{updatedByEmail}',to_jsonb(v_email),true);

  select public.keysuite_save_quotation_v42915(v_company,v_clean) into v_result;
  return coalesce(v_result,'{}'::jsonb) || jsonb_build_object(
    'operation',case when coalesce(v_exists,false) then 'updated' else 'created' end
  );
end;
$$;

revoke all on function public.keysuite_save_quotation_v42916(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_quotation_v42916(text,jsonb) to authenticated;

-- Owners receive the full company history. Every other assigned user receives
-- only rows whose immutable creator is their own signed-in email address.
create or replace function public.keysuite_list_quotations_v42916(p_company_id text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_email text:=public.keysuite_current_email();
  v_company text:=public.keysuite_current_company_id();
  v_owner boolean:=false;
  v_doc jsonb;
  v_creator text;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  if trim(coalesce(p_company_id,''))<>v_company then
    raise exception 'This quotation history belongs to another KeySuite company.';
  end if;
  select exists(
    select 1 from public.ks_user_access access_row
    where lower(trim(coalesce(access_row.email,'')))=v_email
      and access_row.company_id::text=v_company
      and lower(trim(coalesce(access_row.role,'')))='owner'
      and coalesce(access_row.active,true)=true
  ) into v_owner;

  for v_doc in
    select to_jsonb(listed)
    from public.keysuite_list_quotations_v409(v_company) listed
  loop
    v_creator:=lower(trim(coalesce(
      v_doc#>>'{row_data,quote_data,createdByEmail}',
      v_doc#>>'{row_data,quote_data,created_by_email}',
      v_doc#>>'{row_data,createdByEmail}',
      v_doc#>>'{quote_data,createdByEmail}',
      v_doc->>'createdByEmail',
      v_doc->>'created_by_email',''
    )));
    if v_owner or v_creator=v_email then return next v_doc; end if;
  end loop;
  return;
end;
$$;

revoke all on function public.keysuite_list_quotations_v42916(text) from public,anon;
grant execute on function public.keysuite_list_quotations_v42916(text) to authenticated;

notify pgrst,'reload schema';
commit;
