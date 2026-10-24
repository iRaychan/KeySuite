begin;

-- V4.29.19: secure history must include both archived versions and valid
-- current-only quotations. Owners see the company history; other users see
-- only quotations whose immutable creator matches the signed-in account.
create or replace function public.keysuite_list_quotations_v42919(p_company_id text)
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
    select 1
    from public.ks_user_access access_row
    where lower(trim(coalesce(access_row.email,'')))=v_email
      and access_row.company_id::text=v_company
      and lower(trim(coalesce(access_row.role,'')))='owner'
      and coalesce(access_row.active,true)=true
  ) into v_owner;

  for v_doc in
    with candidates as (
      select archived.quote_data as document,
             upper(trim(coalesce(archived.quotation_no,''))) as reference_key,
             coalesce(archived.logical_id,archived.quote_data->>'id','') as logical_id,
             archived.updated_at,
             1 as source_rank
      from public.ks_quotation_archive_v409 archived
      where archived.company_id=v_company
      union all
      select current_quote.quote_data,
             upper(trim(coalesce(current_quote.quotation_no,''))),
             coalesce(current_quote.id::text,current_quote.quote_data->>'id',''),
             current_quote.updated_at,
             2
      from public.ks_quotations current_quote
      where current_quote.company_id=v_company
    ), ranked as (
      select candidate.*,
             row_number() over (
               partition by coalesce(nullif(candidate.reference_key,''),'ID:'||candidate.logical_id)
               order by candidate.updated_at desc nulls last,candidate.source_rank desc
             ) as row_rank
      from candidates candidate
      where candidate.document is not null
    )
    select ranked.document
    from ranked
    where ranked.row_rank=1
    order by ranked.updated_at desc nulls last,ranked.reference_key desc
  loop
    v_creator:=lower(trim(coalesce(
      v_doc->>'createdByEmail',
      v_doc->>'created_by_email',''
    )));
    if v_owner or v_creator=v_email then return next v_doc; end if;
  end loop;
  return;
end;
$$;

revoke all on function public.keysuite_list_quotations_v42919(text) from public,anon;
grant execute on function public.keysuite_list_quotations_v42919(text) to authenticated;

-- The RETURNS TABLE output name calendar_year previously made the inferred
-- ON CONFLICT column target ambiguous inside PL/pgSQL. Name the primary-key
-- constraint explicitly so legacy staged-deployment synchronization works.
create or replace function public.keysuite_next_quotation_reference_v223(
  p_requested_at timestamptz default now(),
  p_minimum_last_number integer default 0
)
returns table(quotation_reference text,quotation_prefix text,calendar_year integer,running_number integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=public.keysuite_current_email();
  v_company text:=public.keysuite_current_company_id();
  v_prefix text;
  v_local_date date:=(coalesce(p_requested_at,now()) at time zone 'Asia/Kuala_Lumpur')::date;
  v_year integer:=extract(year from v_local_date)::integer;
  v_floor integer;
  v_number integer;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  select upper(trim(profile.quotation_prefix)) into v_prefix
  from public.ks_user_profiles profile where lower(profile.email)=v_email limit 1;
  if coalesce(v_prefix,'')='' then raise exception 'No quotation prefix has been assigned. Please contact the Owner.'; end if;

  v_floor:=greatest(
    greatest(0,coalesce(p_minimum_last_number,0)),
    public.keysuite_v42910_history_running_floor(v_company,v_year)
  );
  insert into public.ks_quotation_company_sequences_v42910(company_id,calendar_year,last_number,updated_at)
  values(v_company,v_year,v_floor+1,now())
  on conflict on constraint ks_quotation_company_sequences_v42910_pkey do update set
    last_number=greatest(public.ks_quotation_company_sequences_v42910.last_number,v_floor)+1,
    updated_at=now()
  returning last_number into v_number;
  if v_number>9999 then raise exception 'Quotation running number has reached 9999 for %.',v_year; end if;

  return query select
    format('%s-%s-%s',v_prefix,to_char(v_local_date,'YYMM'),lpad(v_number::text,4,'0')),
    v_prefix,v_year,v_number;
end;
$$;

revoke all on function public.keysuite_next_quotation_reference_v223(timestamptz,integer) from public,anon;
grant execute on function public.keysuite_next_quotation_reference_v223(timestamptz,integer) to authenticated;

create or replace function public.keysuite_register_quotation_reference_v226(p_reference text)
returns table(quotation_prefix text,calendar_year integer,running_number integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=public.keysuite_current_email();
  v_company text:=public.keysuite_current_company_id();
  v_assigned_prefix text;
  v_match text[];
  v_year integer;
  v_number integer;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  select upper(trim(profile.quotation_prefix)) into v_assigned_prefix
  from public.ks_user_profiles profile where lower(profile.email)=v_email limit 1;
  if coalesce(v_assigned_prefix,'')='' then raise exception 'No quotation prefix has been assigned. Please contact the Owner.'; end if;

  v_match:=regexp_match(upper(trim(coalesce(p_reference,''))),'^([A-Z0-9]{1,8})[/-]([0-9]{2})([0-9]{2})[/-]([0-9]{1,4})(?:-R[0-9]+|-V[0-9]+)?$');
  if v_match is null then raise exception 'Quotation number must use PREFIX-YYMM-0001 format.'; end if;
  if v_match[1]<>v_assigned_prefix then raise exception 'The quotation prefix is assigned by the Owner and cannot be amended.'; end if;
  if v_match[3]::integer not between 1 and 12 then raise exception 'Quotation YYMM contains an invalid month.'; end if;
  v_year:=2000+v_match[2]::integer;
  v_number:=v_match[4]::integer;
  if v_number<1 then raise exception 'Quotation running number must be at least 0001.'; end if;

  insert into public.ks_quotation_company_sequences_v42910(company_id,calendar_year,last_number,updated_at)
  values(v_company,v_year,greatest(v_number,public.keysuite_v42910_history_running_floor(v_company,v_year)),now())
  on conflict on constraint ks_quotation_company_sequences_v42910_pkey do update set
    last_number=greatest(public.ks_quotation_company_sequences_v42910.last_number,excluded.last_number),
    updated_at=now();

  return query select v_assigned_prefix,v_year,v_number;
end;
$$;

revoke all on function public.keysuite_register_quotation_reference_v226(text) from public,anon;
grant execute on function public.keysuite_register_quotation_reference_v226(text) to authenticated;

notify pgrst,'reload schema';
commit;
