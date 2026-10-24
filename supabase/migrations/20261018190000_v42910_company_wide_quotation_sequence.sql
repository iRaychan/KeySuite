begin;

-- Prefixes identify quotation creators. The four-digit running number is one
-- annual sequence for the whole company, regardless of prefix or month.
create table if not exists public.ks_quotation_company_sequences_v42910 (
  company_id text not null,
  calendar_year integer not null check (calendar_year between 2000 and 2099),
  last_number integer not null default 0 check (last_number between 0 and 9999),
  updated_at timestamptz not null default now(),
  primary key (company_id,calendar_year)
);

alter table public.ks_quotation_company_sequences_v42910 enable row level security;
revoke all on table public.ks_quotation_company_sequences_v42910 from public,anon,authenticated;

create or replace function public.keysuite_v42910_history_running_floor(
  p_company_id text,
  p_calendar_year integer
)
returns integer
language sql
stable
security definer
set search_path=''
as $$
  with reference_rows as (
    select upper(coalesce(a.quotation_no,'')) as quotation_no
    from public.ks_quotation_archive_v409 a
    where a.company_id=trim(coalesce(p_company_id,''))
    union all
    select upper(coalesce(q.quotation_no,''))
    from public.ks_quotations q
    where q.company_id=trim(coalesce(p_company_id,''))
  ), parsed as (
    select regexp_match(
      quotation_no,
      '^[A-Z0-9]{1,8}[/-]([0-9]{2})[0-9]{2}[/-]([0-9]{1,4})(?:-R[0-9]+|-V[0-9]+|[[:space:]]*[(]R[0-9]+[)])?$'
    ) as parts
    from reference_rows
  )
  select coalesce(max((parts)[2]::integer),0)
  from parsed
  where parts is not null and 2000+(parts)[1]::integer=p_calendar_year
$$;

revoke all on function public.keysuite_v42910_history_running_floor(text,integer) from public,anon,authenticated;

create or replace function public.keysuite_preview_quotation_reference_v42910(
  p_requested_at timestamptz default now(),
  p_minimum_last_number integer default 0
)
returns table(quotation_reference text,quotation_prefix text,calendar_year integer,running_number integer)
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
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  select upper(trim(profile.quotation_prefix)) into v_prefix
  from public.ks_user_profiles profile where lower(profile.email)=v_email limit 1;
  if coalesce(v_prefix,'')='' then raise exception 'No quotation prefix has been assigned. Please contact the Owner.'; end if;

  select greatest(
    greatest(0,coalesce(p_minimum_last_number,0)),
    public.keysuite_v42910_history_running_floor(v_company,v_year),
    coalesce((select s.last_number from public.ks_quotation_company_sequences_v42910 s
      where s.company_id=v_company and s.calendar_year=v_year),0)
  )+1 into v_number;
  if v_number>9999 then raise exception 'Quotation running number has reached 9999 for %.',v_year; end if;

  return query select
    format('%s-%s-%s',v_prefix,to_char(v_local_date,'YYMM'),lpad(v_number::text,4,'0')),
    v_prefix,v_year,v_number;
end;
$$;

revoke all on function public.keysuite_preview_quotation_reference_v42910(timestamptz,integer) from public,anon;
grant execute on function public.keysuite_preview_quotation_reference_v42910(timestamptz,integer) to authenticated;

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
  on conflict(company_id,calendar_year) do update set
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
  on conflict(company_id,calendar_year) do update set
    last_number=greatest(public.ks_quotation_company_sequences_v42910.last_number,excluded.last_number),
    updated_at=now();

  return query select v_assigned_prefix,v_year,v_number;
end;
$$;

revoke all on function public.keysuite_register_quotation_reference_v226(text) from public,anon;
grant execute on function public.keysuite_register_quotation_reference_v226(text) to authenticated;

notify pgrst,'reload schema';
commit;
