begin;

-- V4.29.20 makes Supabase the only authority for a new quotation number.
-- A preview remains non-consuming. The first successful save allocates and
-- writes the reference in this transaction; every later save keeps the
-- original reference and immutable creator for the same logical quotation ID.
create or replace function public.keysuite_save_quotation_v42920(
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
  v_requested_no text:=upper(trim(coalesce(p_quotation->>'no','')));
  v_existing_no text:='';
  v_creator text:='';
  v_owner boolean:=false;
  v_exists boolean:=false;
  v_clean jsonb:=coalesce(p_quotation,'{}'::jsonb);
  v_items jsonb:='[]'::jsonb;
  v_assigned_prefix text;
  v_local_date date;
  v_year integer;
  v_yymm text;
  v_floor integer;
  v_number integer;
  v_reference text;
  v_saved jsonb;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  if trim(coalesce(p_company_id,''))<>v_company then
    raise exception 'This quotation belongs to another KeySuite company.';
  end if;
  if v_id='' then raise exception 'Quotation ID is required.'; end if;

  select exists(
    select 1
    from public.ks_user_access access_row
    where lower(trim(coalesce(access_row.email,'')))=v_email
      and access_row.company_id::text=v_company
      and lower(trim(coalesce(access_row.role,'')))='owner'
      and coalesce(access_row.active,true)=true
  ) into v_owner;

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

  -- Serialize two first-save requests carrying the same logical ID before
  -- deciding whether this is an insert or an update.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('keysuite-quotation-id:'||v_company||':'||v_id)
  );

  select source.quotation_no,source.creator
  into v_existing_no,v_creator
  from (
    select upper(trim(coalesce(archived.quotation_no,''))) quotation_no,
           lower(trim(coalesce(
             archived.quote_data->>'createdByEmail',
             archived.quote_data->>'created_by_email',
             archived.created_by_email,''
           ))) creator,
           1 source_rank
    from public.ks_quotation_archive_v409 archived
    where archived.company_id=v_company
      and coalesce(archived.logical_id,archived.quote_data->>'id','')=v_id
    union all
    select upper(trim(coalesce(current_quote.quotation_no,''))),
           lower(trim(coalesce(
             current_quote.quote_data->>'createdByEmail',
             current_quote.quote_data->>'created_by_email',
             current_quote.created_by_email,''
           ))),
           2
    from public.ks_quotations current_quote
    where current_quote.company_id=v_company
      and coalesce(current_quote.id::text,current_quote.quote_data->>'id','')=v_id
  ) source
  order by source.source_rank
  limit 1;
  v_exists:=coalesce(v_existing_no,'')<>'';

  if v_exists then
    if not v_owner and v_creator<>v_email then
      raise exception 'You may update only quotations assigned to your own account.';
    end if;
    -- The logical ID owns its original number. A browser preview, stale local
    -- cache or another account cannot renumber an existing quotation.
    v_clean:=jsonb_set(v_clean,'{no}',to_jsonb(v_existing_no),true);
    v_clean:=jsonb_set(v_clean,'{createdByEmail}',to_jsonb(v_creator),true);
    v_clean:=jsonb_set(v_clean,'{updatedByEmail}',to_jsonb(v_email),true);
    select coalesce(to_jsonb(saved)->'row_data',to_jsonb(saved)) into v_saved
    from public.keysuite_save_quotation_v409(v_company,v_clean) saved
    limit 1;
    return jsonb_build_object(
      'status','saved',
      'operation','updated',
      'saved',coalesce(v_saved,v_clean)
    );
  end if;

  select upper(trim(profile.quotation_prefix)) into v_assigned_prefix
  from public.ks_user_profiles profile
  where lower(trim(profile.email))=v_email
  limit 1;
  if coalesce(v_assigned_prefix,'')='' then
    raise exception 'No quotation prefix has been assigned. Please contact the Owner.';
  end if;

  begin
    if coalesce(v_clean->>'date','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      v_local_date:=(v_clean->>'date')::date;
    else
      v_local_date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;
    end if;
  exception when others then
    v_local_date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;
  end;
  v_year:=extract(year from v_local_date)::integer;
  v_yymm:=to_char(v_local_date,'YYMM');

  -- Company/year serialization makes the allocation global across prefixes.
  -- The counter update and the quotation insert roll back together on error.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('keysuite-quotation:'||v_company||':'||v_year::text)
  );
  v_floor:=public.keysuite_v42910_history_running_floor(v_company,v_year);
  insert into public.ks_quotation_company_sequences_v42910(
    company_id,calendar_year,last_number,updated_at
  ) values(v_company,v_year,v_floor+1,now())
  on conflict on constraint ks_quotation_company_sequences_v42910_pkey do update set
    last_number=greatest(
      public.ks_quotation_company_sequences_v42910.last_number,
      v_floor
    )+1,
    updated_at=now()
  returning last_number into v_number;

  if v_number>9999 then
    raise exception 'Quotation running number has reached 9999 for %.',v_year;
  end if;
  v_reference:=format(
    '%s-%s-%s',v_assigned_prefix,v_yymm,lpad(v_number::text,4,'0')
  );
  v_clean:=jsonb_set(v_clean,'{no}',to_jsonb(v_reference),true);
  v_clean:=jsonb_set(v_clean,'{createdByEmail}',to_jsonb(v_email),true);
  v_clean:=jsonb_set(v_clean,'{updatedByEmail}',to_jsonb(v_email),true);

  select coalesce(to_jsonb(saved)->'row_data',to_jsonb(saved)) into v_saved
  from public.keysuite_save_quotation_v409(v_company,v_clean) saved
  limit 1;

  return jsonb_build_object(
    'status','saved',
    'operation','created',
    'number_adjusted_from',case
      when v_requested_no<>'' and v_requested_no<>v_reference then v_requested_no
      else ''
    end,
    'saved',coalesce(v_saved,v_clean)
  );
end;
$$;

revoke all on function public.keysuite_save_quotation_v42920(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_quotation_v42920(text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
