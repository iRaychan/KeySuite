begin;

-- V4.29.15: save and claim a quotation reference in one transaction.
-- Previewing a number remains non-consuming. The advisory transaction lock
-- serializes only saves for the same company and calendar year.
create or replace function public.keysuite_save_quotation_v42915(
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
  v_assigned_prefix text;
  v_no text:=upper(trim(coalesce(p_quotation->>'no','')));
  v_id text:=trim(coalesce(p_quotation->>'id',''));
  v_match text[];
  v_year integer;
  v_month integer;
  v_yymm text;
  v_running integer;
  v_next integer;
  v_next_reference text;
  v_conflict boolean:=false;
  v_saved jsonb;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  if trim(coalesce(p_company_id,''))<>v_company then
    raise exception 'This quotation belongs to another KeySuite company.';
  end if;
  if v_id='' then raise exception 'Quotation ID is required.'; end if;

  select upper(trim(profile.quotation_prefix)) into v_assigned_prefix
  from public.ks_user_profiles profile
  where lower(trim(profile.email))=v_email
  limit 1;
  if coalesce(v_assigned_prefix,'')='' then
    raise exception 'No quotation prefix has been assigned. Please contact the Owner.';
  end if;

  v_match:=regexp_match(v_no,'^([A-Z0-9]{1,8})[/-]([0-9]{2})([0-9]{2})[/-]([0-9]{1,4})(?:-R[0-9]+|-V[0-9]+|[[:space:]]*[(]R[0-9]+[)])?$');
  if v_match is null then raise exception 'Quotation number must use PREFIX-YYMM-0001 format.'; end if;
  if v_match[1]<>v_assigned_prefix then raise exception 'The quotation prefix is assigned by the Owner and cannot be amended.'; end if;
  v_month:=v_match[3]::integer;
  if v_month not between 1 and 12 then raise exception 'Quotation YYMM contains an invalid month.'; end if;
  v_year:=2000+v_match[2]::integer;
  v_yymm:=v_match[2]||v_match[3];
  v_running:=v_match[4]::integer;
  if v_running not between 1 and 9999 then raise exception 'Quotation running number must be between 0001 and 9999.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('keysuite-quotation:'||v_company||':'||v_year::text));

  select exists(
    select 1
    from public.ks_quotation_archive_v409 archived
    where archived.company_id=v_company
      and upper(coalesce(archived.quotation_no,''))=v_no
      and coalesce(archived.logical_id,archived.quote_data->>'id','')<>v_id
    union all
    select 1
    from public.ks_quotations current_quote
    where current_quote.company_id=v_company
      and upper(coalesce(current_quote.quotation_no,''))=v_no
      and coalesce(current_quote.id,current_quote.quote_data->>'id','')<>v_id
  ) into v_conflict;

  if v_conflict then
    v_next:=greatest(
      v_running,
      public.keysuite_v42910_history_running_floor(v_company,v_year),
      coalesce((select sequence.last_number
        from public.ks_quotation_company_sequences_v42910 sequence
        where sequence.company_id=v_company and sequence.calendar_year=v_year),0)
    )+1;
    loop
      if v_next>9999 then raise exception 'Quotation running number has reached 9999 for %.',v_year; end if;
      v_next_reference:=format('%s-%s-%s',v_assigned_prefix,v_yymm,lpad(v_next::text,4,'0'));
      exit when not exists(
        select 1 from public.ks_quotation_archive_v409 archived
        where archived.company_id=v_company and upper(coalesce(archived.quotation_no,''))=v_next_reference
        union all
        select 1 from public.ks_quotations current_quote
        where current_quote.company_id=v_company and upper(coalesce(current_quote.quotation_no,''))=v_next_reference
      );
      v_next:=v_next+1;
    end loop;
    return jsonb_build_object(
      'status','conflict',
      'attempted_reference',v_no,
      'next_reference',v_next_reference,
      'running_number',v_next
    );
  end if;

  insert into public.ks_quotation_company_sequences_v42910(company_id,calendar_year,last_number,updated_at)
  values(v_company,v_year,greatest(v_running,public.keysuite_v42910_history_running_floor(v_company,v_year)),now())
  on conflict(company_id,calendar_year) do update set
    last_number=greatest(public.ks_quotation_company_sequences_v42910.last_number,excluded.last_number),
    updated_at=now();

  if to_regprocedure('public.keysuite_save_quotation_v409(text,jsonb)') is null then
    raise exception 'keysuite_save_quotation_v409 is not installed.';
  end if;
  select coalesce(to_jsonb(saved)->'row_data',to_jsonb(saved)) into v_saved
  from public.keysuite_save_quotation_v409(v_company,p_quotation) saved
  limit 1;

  return jsonb_build_object('status','saved','saved',coalesce(v_saved,p_quotation));
end;
$$;

revoke all on function public.keysuite_save_quotation_v42915(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_quotation_v42915(text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
