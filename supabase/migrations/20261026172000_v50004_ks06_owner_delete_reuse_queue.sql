begin;

-- V5.00.04 / KS-06 follow-up
-- Normal allocation always continues after the company/year high-water mark.
-- Only a number explicitly released by an Owner deletion enters this private
-- reuse queue. Older unexplained gaps are never allocated.

create table if not exists public.ks_quotation_reuse_pool_v50004 (
  company_id text not null,
  calendar_year integer not null check (calendar_year between 2000 and 9999),
  running_number integer not null check (running_number between 1 and 9999),
  original_reference text not null default '',
  deletion_logical_id text not null default '',
  deleted_by_email text not null default '',
  deleted_at timestamptz not null default now(),
  status text not null default 'available' check (status in ('available','allocated')),
  allocated_reference text not null default '',
  allocated_logical_id text not null default '',
  allocated_by_email text not null default '',
  allocated_at timestamptz,
  primary key (company_id,calendar_year,running_number)
);

alter table public.ks_quotation_reuse_pool_v50004 enable row level security;
revoke all on table public.ks_quotation_reuse_pool_v50004 from public,anon,authenticated;

create index if not exists ks_quotation_reuse_pool_v50004_available_idx
  on public.ks_quotation_reuse_pool_v50004(company_id,calendar_year,running_number)
  where status='available';

-- The Owner confirmed that RC-2610-0235 through RC-2610-0239 were deleted
-- intentionally and may be reused. Insert only numbers still absent from both
-- quotation stores; 0232 through 0234 are deliberately not seeded.
insert into public.ks_quotation_reuse_pool_v50004(
  company_id,calendar_year,running_number,original_reference,
  deletion_logical_id,deleted_by_email,deleted_at,status
)
select sequence.company_id,2026,candidate.running_number,
       format('RC-2610-%s',lpad(candidate.running_number::text,4,'0')),
       '','v50004-owner-confirmed',now(),'available'
from public.ks_quotation_company_sequences_v42910 sequence
cross join generate_series(235,239) candidate(running_number)
where sequence.calendar_year=2026
  and not exists (
    select 1
    from public.keysuite_v50004_used_quotation_runnings(sequence.company_id,2026) used
    where used.running_number=candidate.running_number
  )
on conflict (company_id,calendar_year,running_number) do nothing;

create or replace function public.keysuite_v50004_first_available_running(
  p_company_id text,
  p_calendar_year integer
)
returns integer
language sql
stable
security definer
set search_path=''
as $$
  with sequence_state as (
    select coalesce(max(sequence.last_number),0) as last_number
    from public.ks_quotation_company_sequences_v42910 sequence
    where sequence.company_id=trim(coalesce(p_company_id,''))
      and sequence.calendar_year=p_calendar_year
  ), queued as (
    select pool.running_number
    from public.ks_quotation_reuse_pool_v50004 pool
    where pool.company_id=trim(coalesce(p_company_id,''))
      and pool.calendar_year=p_calendar_year
      and pool.status='available'
      and not exists (
        select 1
        from public.keysuite_v50004_used_quotation_runnings(p_company_id,p_calendar_year) used
        where used.running_number=pool.running_number
      )
    order by pool.running_number
    limit 1
  ), sequential as (
    select candidate.running_number
    from sequence_state state
    cross join lateral generate_series(greatest(state.last_number+1,1),9999) candidate(running_number)
    where not exists (
      select 1
      from public.keysuite_v50004_used_quotation_runnings(p_company_id,p_calendar_year) used
      where used.running_number=candidate.running_number
    )
    order by candidate.running_number
    limit 1
  )
  select coalesce((select running_number from queued),(select running_number from sequential))
$$;

revoke all on function public.keysuite_v50004_first_available_running(text,integer) from public,anon,authenticated;

create or replace function public.keysuite_preview_quotation_reference_v50004(
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

revoke all on function public.keysuite_preview_quotation_reference_v50004(timestamptz) from public,anon;
grant execute on function public.keysuite_preview_quotation_reference_v50004(timestamptz) to authenticated;

create or replace function public.keysuite_save_quotation_v50004(
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
$$;

revoke all on function public.keysuite_save_quotation_v50004(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_quotation_v50004(text,jsonb) to authenticated;

create or replace function public.keysuite_delete_quotation_v42502(
  p_company_id text,
  p_logical_id text,
  p_legacy_id text,
  p_quotation_no text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_email text := public.keysuite_current_email();
  v_company text := '';
  v_role text := '';
  v_permission text := 'none';
  v_logical_id text := nullif(trim(coalesce(p_logical_id,'')),'');
  v_legacy_id text := nullif(trim(coalesce(p_legacy_id,'')),'');
  v_quotation_no text := nullif(upper(trim(coalesce(p_quotation_no,''))),'');
  v_deleted_reference text := '';
  v_match text[];
  v_year integer;
  v_running integer;
  v_deleted integer := 0;
  v_step_deleted integer := 0;
begin
  if coalesce(v_email,'') = '' then raise exception 'Authentication is required.'; end if;

  select access_row.company_id::text,lower(trim(coalesce(access_row.role,'')))
    into v_company,v_role
  from public.ks_user_access access_row
  where lower(trim(coalesce(access_row.email,'')))=v_email
    and coalesce(access_row.active,true)=true
    and (trim(coalesce(p_company_id,''))='' or access_row.company_id::text=trim(p_company_id))
  limit 1;

  if coalesce(v_company,'')='' then raise exception 'Active KeySuite access was not found for this company.'; end if;
  if trim(coalesce(p_company_id,''))<>'' and trim(p_company_id)<>v_company then
    raise exception 'This quotation belongs to another KeySuite company.';
  end if;

  if v_role<>'owner' then
    select lower(trim(coalesce(role_row.permissions->>'delete_quotation_history','none')))
      into v_permission
    from public.ks_role_permissions role_row
    where role_row.company_id::text=v_company
      and lower(trim(coalesce(role_row.role,'')))=v_role
    limit 1;
    if coalesce(v_permission,'none')<>'full' then
      raise exception 'Your role is not allowed to delete quotation history.';
    end if;
  end if;

  if v_logical_id is null and v_legacy_id is null and v_quotation_no is null then
    raise exception 'A quotation identity is required.';
  end if;

  select source.quotation_no into v_deleted_reference
  from (
    select upper(trim(coalesce(archived.quotation_no,archived.quote_data->>'no',''))) quotation_no,1 source_rank
    from public.ks_quotation_archive_v409 archived
    where archived.company_id=v_company and (
      (v_logical_id is not null and coalesce(archived.logical_id,archived.quote_data->>'id','')=v_logical_id)
      or (v_legacy_id is not null and coalesce(archived.logical_id,archived.quote_data->>'id','')=v_legacy_id)
      or (v_quotation_no is not null and upper(trim(coalesce(archived.quotation_no,archived.quote_data->>'no','')))=v_quotation_no)
    )
    union all
    select upper(trim(coalesce(current_quote.quotation_no,current_quote.quote_data->>'no',''))),2
    from public.ks_quotations current_quote
    where current_quote.company_id=v_company and (
      (v_logical_id is not null and coalesce(current_quote.id::text,current_quote.quote_data->>'id','')=v_logical_id)
      or (v_legacy_id is not null and coalesce(current_quote.id::text,current_quote.quote_data->>'id','')=v_legacy_id)
      or (v_quotation_no is not null and upper(trim(coalesce(current_quote.quotation_no,current_quote.quote_data->>'no','')))=v_quotation_no)
    )
  ) source order by source_rank limit 1;
  v_deleted_reference:=coalesce(nullif(v_deleted_reference,''),v_quotation_no,'');

  delete from public.ks_quotation_archive_v409 archived
  where archived.company_id=v_company and (
    (v_logical_id is not null and archived.logical_id=v_logical_id)
    or (v_legacy_id is not null and archived.logical_id=v_legacy_id)
    or (v_logical_id is not null and archived.quote_data->>'id'=v_logical_id)
    or (v_legacy_id is not null and archived.quote_data->>'id'=v_legacy_id)
    or (v_quotation_no is not null and upper(trim(coalesce(archived.quotation_no,'')))=v_quotation_no)
    or (v_quotation_no is not null and upper(trim(coalesce(archived.quote_data->>'no','')))=v_quotation_no)
  );
  get diagnostics v_step_deleted=row_count;v_deleted:=v_deleted+v_step_deleted;

  delete from public.ks_quotations current_quote
  where current_quote.company_id=v_company and (
    (v_logical_id is not null and current_quote.id=v_logical_id)
    or (v_legacy_id is not null and current_quote.id=v_legacy_id)
    or (v_logical_id is not null and current_quote.quote_data->>'id'=v_logical_id)
    or (v_legacy_id is not null and current_quote.quote_data->>'id'=v_legacy_id)
    or (v_quotation_no is not null and upper(trim(coalesce(current_quote.quotation_no,'')))=v_quotation_no)
    or (v_quotation_no is not null and upper(trim(coalesce(current_quote.quote_data->>'no','')))=v_quotation_no)
  );
  get diagnostics v_step_deleted=row_count;v_deleted:=v_deleted+v_step_deleted;

  -- Only an Owner deletion releases the number. Delegated history deletion
  -- remains supported but never changes future numbering.
  if v_role='owner' and v_deleted>0 then
    v_match:=regexp_match(v_deleted_reference,'^[A-Z0-9]{1,8}[/-]([0-9]{2})[0-9]{2}[/-]([0-9]{1,4})(?:-R[0-9]+|-V[0-9]+|[[:space:]]*[(]R[0-9]+[)])?$');
    if v_match is not null then
      v_year:=2000+v_match[1]::integer;v_running:=v_match[2]::integer;
      if not exists(
        select 1 from public.keysuite_v50004_used_quotation_runnings(v_company,v_year) used
        where used.running_number=v_running
      ) then
        insert into public.ks_quotation_reuse_pool_v50004(
          company_id,calendar_year,running_number,original_reference,deletion_logical_id,
          deleted_by_email,deleted_at,status,allocated_reference,allocated_logical_id,
          allocated_by_email,allocated_at
        ) values(
          v_company,v_year,v_running,v_deleted_reference,coalesce(v_logical_id,v_legacy_id,''),
          v_email,now(),'available','','','',null
        )
        on conflict (company_id,calendar_year,running_number) do update set
          original_reference=excluded.original_reference,
          deletion_logical_id=excluded.deletion_logical_id,
          deleted_by_email=excluded.deleted_by_email,deleted_at=excluded.deleted_at,
          status='available',allocated_reference='',allocated_logical_id='',
          allocated_by_email='',allocated_at=null;
      end if;
    end if;
  end if;

  return v_deleted;
end;
$$;

revoke all on function public.keysuite_delete_quotation_v42502(text,text,text,text) from public,anon;
grant execute on function public.keysuite_delete_quotation_v42502(text,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
