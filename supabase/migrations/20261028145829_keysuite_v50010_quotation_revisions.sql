-- Approved by user and applied to connected KeySuite database on 2026-10-28.
begin;
CREATE OR REPLACE FUNCTION public.keysuite_save_quotation_v50004(p_company_id text, p_quotation jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_audit jsonb:='[]'::jsonb;
  v_assigned_prefix text;
  v_local_date date;
  v_year integer;
  v_yymm text;
  v_match text[];
  v_number integer;
  v_last integer:=0;
  v_reused boolean:=false;
  v_reference text;
  v_saved jsonb;
  v_source jsonb;
  v_source_no text;
  v_source_creator text;
  v_base text;
  v_revision integer;
  v_original_date text;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('keysuite-quotation-id:'||v_company||':'||v_id)
  );

  select source.quotation_no,source.creator
  into v_existing_no,v_creator
  from (
    select upper(trim(coalesce(archived.quotation_no,''))) quotation_no,
           lower(trim(coalesce(archived.quote_data->>'createdByEmail',archived.quote_data->>'created_by_email',archived.created_by_email,''))) creator,
           1 source_rank
    from public.ks_quotation_archive_v409 archived
    where archived.company_id=v_company
      and coalesce(archived.logical_id,archived.quote_data->>'id','')=v_id
    union all
    select upper(trim(coalesce(current_quote.quotation_no,''))),
           lower(trim(coalesce(current_quote.quote_data->>'createdByEmail',current_quote.quote_data->>'created_by_email',current_quote.created_by_email,''))),
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
    v_clean:=jsonb_set(v_clean,'{no}',to_jsonb(v_existing_no),true);
    v_clean:=jsonb_set(v_clean,'{createdByEmail}',to_jsonb(v_creator),true);
    v_clean:=jsonb_set(v_clean,'{updatedByEmail}',to_jsonb(v_email),true);
    select coalesce(to_jsonb(saved)->'row_data',to_jsonb(saved)) into v_saved
    from public.keysuite_save_quotation_v409(v_company,v_clean) saved limit 1;
    return jsonb_build_object('status','saved','operation','updated','saved',coalesce(v_saved,v_clean));
  end if;


  -- Revisions retain the original reference and never enter the normal allocator.
  if coalesce(v_clean->>'revisionOf','')<>'' then
    select src.doc,src.no,src.creator into v_source,v_source_no,v_source_creator
    from (
      select a.quote_data doc,upper(trim(a.quotation_no)) no,
             lower(coalesce(a.quote_data->>'createdByEmail',a.created_by_email,'')) creator,1 rank
      from public.ks_quotation_archive_v409 a where a.company_id=v_company
        and coalesce(a.logical_id,a.quote_data->>'id','')=v_clean->>'revisionOf'
      union all
      select q.quote_data,upper(trim(q.quotation_no)),
             lower(coalesce(q.quote_data->>'createdByEmail',q.created_by_email,'')),2
      from public.ks_quotations q where q.company_id=v_company
        and coalesce(q.id::text,q.quote_data->>'id','')=v_clean->>'revisionOf'
    ) src order by src.rank limit 1;
    if v_source is null or coalesce(v_source->>'status','')<>'sealed' then
      raise exception 'A revision requires an existing sealed source quotation.';
    end if;
    if not v_owner and v_source_creator<>v_email then
      raise exception 'You may revise only quotations assigned to your own account.';
    end if;
    v_base:=regexp_replace(v_source_no,'(-R[0-9]+|-V[0-9]+|[[:space:]]*[(]R[0-9]+[)])$','');
    v_original_date:=coalesce(nullif(v_source->>'originalDate',''),v_source->>'date');
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('keysuite-revision:'||v_company||':'||v_base));
    select coalesce(max((regexp_match(ref,'-R([0-9]+)$'))[1]::integer),0)+1 into v_revision
    from (
      select upper(trim(a.quotation_no)) ref from public.ks_quotation_archive_v409 a where a.company_id=v_company
      union
      select upper(trim(q.quotation_no)) from public.ks_quotations q where q.company_id=v_company
    ) refs where regexp_replace(ref,'-R[0-9]+$','')=v_base;
    v_reference:=v_base||'-R'||v_revision::text;
    v_clean:=v_clean||jsonb_build_object('no',v_reference,'date',v_original_date,'originalDate',v_original_date,
      'revisionDate',coalesce(nullif(v_clean->>'revisionDate',''),(now() at time zone 'Asia/Kuala_Lumpur')::date::text),
      'showRevision',true,'revisionNumber',v_revision,
      'revisionRootId',coalesce(nullif(v_source->>'revisionRootId',''),v_source->>'id',v_clean->>'revisionOf'),
      'createdByEmail',v_email,'updatedByEmail',v_email);
    select coalesce(to_jsonb(saved)->'row_data',to_jsonb(saved)) into v_saved
    from public.keysuite_save_quotation_v409(v_company,v_clean) saved limit 1;
    return jsonb_build_object('status','saved','operation','created','saved',coalesce(v_saved,v_clean));
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('keysuite-quotation:'||v_company||':'||v_year::text)
  );

  select coalesce(sequence.last_number,0) into v_last
  from public.ks_quotation_company_sequences_v42910 sequence
  where sequence.company_id=v_company and sequence.calendar_year=v_year;

  v_match:=regexp_match(v_requested_no,'^([A-Z0-9]{1,8})[/-]([0-9]{2})([0-9]{2})[/-]([0-9]{1,4})$');
  if v_match is not null
     and v_match[1]=v_assigned_prefix
     and 2000+v_match[2]::integer=v_year
     and v_match[3]::integer=extract(month from v_local_date)::integer
     and v_match[4]::integer between 1 and 9999
     and not exists(
       select 1 from public.keysuite_v50004_used_quotation_runnings(v_company,v_year) used
       where used.running_number=v_match[4]::integer
     )
     and (
       exists(
         select 1 from public.ks_quotation_reuse_pool_v50004 pool
         where pool.company_id=v_company and pool.calendar_year=v_year
           and pool.running_number=v_match[4]::integer and pool.status='available'
       )
       or v_match[4]::integer=public.keysuite_v50004_first_available_running(v_company,v_year)
     ) then
    v_number:=v_match[4]::integer;
  else
    v_number:=public.keysuite_v50004_first_available_running(v_company,v_year);
  end if;
  if v_number is null then raise exception 'Quotation running number has reached 9999 for %.',v_year; end if;

  select exists(
    select 1 from public.ks_quotation_reuse_pool_v50004 pool
    where pool.company_id=v_company and pool.calendar_year=v_year
      and pool.running_number=v_number and pool.status='available'
  ) into v_reused;

  v_reference:=format('%s-%s-%s',v_assigned_prefix,v_yymm,lpad(v_number::text,4,'0'));
  v_clean:=jsonb_set(v_clean,'{no}',to_jsonb(v_reference),true);
  v_clean:=jsonb_set(v_clean,'{createdByEmail}',to_jsonb(v_email),true);
  v_clean:=jsonb_set(v_clean,'{updatedByEmail}',to_jsonb(v_email),true);
  if v_reused then
    v_audit:=case when jsonb_typeof(v_clean->'audit')='array' then v_clean->'audit' else '[]'::jsonb end;
    v_audit:=v_audit||jsonb_build_array(jsonb_build_object(
      'action','quotation_number_reused','at',now(),'by',v_email,'quotation',v_reference
    ));
    v_clean:=jsonb_set(v_clean,'{audit}',v_audit,true);
  end if;

  insert into public.ks_quotation_company_sequences_v42910(company_id,calendar_year,last_number,updated_at)
  values(v_company,v_year,greatest(v_last,v_number),now())
  on conflict on constraint ks_quotation_company_sequences_v42910_pkey do update set
    last_number=greatest(public.ks_quotation_company_sequences_v42910.last_number,excluded.last_number),
    updated_at=now();

  select coalesce(to_jsonb(saved)->'row_data',to_jsonb(saved)) into v_saved
  from public.keysuite_save_quotation_v409(v_company,v_clean) saved limit 1;

  if v_reused then
    update public.ks_quotation_reuse_pool_v50004 pool set
      status='allocated',allocated_reference=v_reference,allocated_logical_id=v_id,
      allocated_by_email=v_email,allocated_at=now()
    where pool.company_id=v_company and pool.calendar_year=v_year
      and pool.running_number=v_number and pool.status='available';
    if not found then raise exception 'Quotation reuse claim was lost. Please save again.'; end if;
  end if;

  return jsonb_build_object(
    'status','saved','operation','created','reused_number',v_reused,
    'number_adjusted_from',case when v_requested_no<>'' and v_requested_no<>v_reference then v_requested_no else '' end,
    'saved',coalesce(v_saved,v_clean)
  );
end;
$function$;
commit;
