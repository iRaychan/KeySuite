-- PROPOSAL ONLY. Not executed. Owner approval and isolated database testing required.
-- Retains the existing company-bound SECURITY DEFINER history gateway and grants.
-- Does not grant table access or change customer, save, edit, delete or approval permissions.
-- Replaces the primary application history RPC only. Audit legacy public quotation RPC
-- grants separately before treating None as a complete server-wide authorization boundary.
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
  v_level text:='none';
  v_doc jsonb;
  v_creator text;
begin
  if coalesce(v_email,'')='' or coalesce(v_company,'')='' then
    raise exception 'Your signed-in KeySuite company could not be determined.';
  end if;
  if trim(coalesce(p_company_id,''))<>v_company then
    raise exception 'This quotation history belongs to another KeySuite company.';
  end if;

  -- Use the authenticated account's stored role matrix, never a caller-supplied role.
  v_level:=lower(trim(coalesce(public.keysuite_permission_level('view_quotations'),'none')));
  if v_level='assigned' then v_level:='own'; end if; -- legacy compatibility only
  if v_level='all' then v_level:='full'; end if;
  if v_level not in ('full','own') then return; end if;

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
    if v_level='full' or (v_level='own' and v_creator=v_email) then return next v_doc; end if;
  end loop;
  return;
end;
$$;

revoke all on function public.keysuite_list_quotations_v42919(text) from public,anon;
grant execute on function public.keysuite_list_quotations_v42919(text) to authenticated;


commit;
