begin;
-- Preserve company/year automatic numbering scope; ignore stale reservation counters.
create or replace function public.keysuite_v50004_first_available_running(p_company_id text,p_calendar_year integer)
returns integer language sql stable security definer set search_path='' as $$
 select case when coalesce(max(running_number),0)<9999 then coalesce(max(running_number),0)+1 else null end
 from public.keysuite_v50004_used_quotation_runnings(p_company_id,p_calendar_year)
$$;
revoke all on function public.keysuite_v50004_first_available_running(text,integer) from public,anon,authenticated;
create or replace function public.keysuite_preview_quotation_reference_v50037(
  p_requested_at timestamptz default now()
)
returns table(quotation_reference text,quotation_prefix text,calendar_year integer,running_number integer,reused_number boolean)
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_email text:=public.keysuite_current_email();
  v_company text:=public.keysuite_current_company_id();
  v_prefix text;
  v_local_date date:=(coalesce(p_requested_at,now()) at time zone 'Asia/Kuala_Lumpur')::date;
  v_year integer:=extract(year from v_local_date)::integer;
  v_number integer;
  v_reused boolean:=false;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  select upper(trim(profile.quotation_prefix)) into v_prefix
  from public.ks_user_profiles profile
  where lower(trim(profile.email))=v_email
  limit 1;
  if coalesce(v_prefix,'')='' then
    raise exception 'No quotation prefix has been assigned. Please contact the Owner.';
  end if;

  v_number:=public.keysuite_v50004_first_available_running(v_company,v_year);
  if v_number is null then raise exception 'Quotation running number has reached 9999 for %.',v_year; end if;
  select exists(
    select 1 from public.ks_quotation_reuse_pool_v50004 pool
    where pool.company_id=v_company and pool.calendar_year=v_year
      and pool.running_number=v_number and pool.status='available'
  ) into v_reused;

  return query select
    format('%s-%s-%s',v_prefix,to_char(v_local_date,'YYMM'),lpad(v_number::text,4,'0')),
    v_prefix,v_year,v_number,v_reused;
end;
$$;

revoke all on function public.keysuite_preview_quotation_reference_v50037(timestamptz) from public,anon;
grant execute on function public.keysuite_preview_quotation_reference_v50037(timestamptz) to authenticated;

create or replace function public.keysuite_save_quotation_v50037(
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

  -- Revision saves retain the established revision handler without normal allocation.
  if v_requested_no ~ '-R[0-9]+
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

  v_match:=regexp_match(v_requested_no,'^([A-Z0-9]{1,8})[/-]([0-9]{2})([0-9]{2})[/-]([0-9]{1,4})$');
  if v_match is null or v_match[1]<>v_assigned_prefix or 2000+v_match[2]::integer<>v_year
     or v_match[3]::integer<>extract(month from v_local_date)::integer
     or v_match[4]::integer not between 1 and 9999 then
    raise exception 'Enter a valid quotation reference with the Owner-assigned prefix and quotation date.';
  end if;
  v_number:=v_match[4]::integer;
  v_reference:=format('%s-%s-%s',v_assigned_prefix,v_yymm,lpad(v_number::text,4,'0'));
  if exists(select 1 from public.ks_quotations q where q.company_id=v_company and upper(trim(q.quotation_no))=v_reference)
     or exists(select 1 from public.ks_quotation_archive_v409 q where q.company_id=v_company and upper(trim(q.quotation_no))=v_reference) then
    raise exception 'Quotation reference % is already used. Choose an unused reference.',v_reference using errcode='23505';
  end if;
  v_last:=0;
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
$$;

revoke all on function public.keysuite_save_quotation_v50037(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_quotation_v50037(text,jsonb) to authenticated;


commit;
 or coalesce(v_clean->>'revisionOf','')<>'' then
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

  v_match:=regexp_match(v_requested_no,'^([A-Z0-9]{1,8})[/-]([0-9]{2})([0-9]{2})[/-]([0-9]{1,4})$');
  if v_match is null or v_match[1]<>v_assigned_prefix or 2000+v_match[2]::integer<>v_year
     or v_match[3]::integer<>extract(month from v_local_date)::integer
     or v_match[4]::integer not between 1 and 9999 then
    raise exception 'Enter a valid quotation reference with the Owner-assigned prefix and quotation date.';
  end if;
  v_number:=v_match[4]::integer;
  v_reference:=format('%s-%s-%s',v_assigned_prefix,v_yymm,lpad(v_number::text,4,'0'));
  if exists(select 1 from public.ks_quotations q where q.company_id=v_company and upper(trim(q.quotation_no))=v_reference)
     or exists(select 1 from public.ks_quotation_archive_v409 q where q.company_id=v_company and upper(trim(q.quotation_no))=v_reference) then
    raise exception 'Quotation reference % is already used. Choose an unused reference.',v_reference using errcode='23505';
  end if;
  v_last:=0;
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
$$;

revoke all on function public.keysuite_save_quotation_v50037(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_quotation_v50037(text,jsonb) to authenticated;


commit;
