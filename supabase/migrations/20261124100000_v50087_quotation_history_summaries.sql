-- V5.00.87: additive read projection. No quotation records are changed.
-- Run as one transaction after approval; rollback script is supplied separately.
begin;
create table if not exists public.ks_quotation_history_v50087 (
 company_id text not null, source text not null check(source in ('current','archive')),
 storage_id text not null, reference_key text not null, logical_id text not null,
 creator_email text not null, history_date text not null, sort_key text collate "C" not null,
 updated_at timestamptz, summary jsonb not null, search_text text not null,
 primary key(company_id,source,storage_id)
);
alter table public.ks_quotation_history_v50087 enable row level security;
revoke all on public.ks_quotation_history_v50087 from public,anon,authenticated;
create index if not exists ks_qh87_company_sort on public.ks_quotation_history_v50087(company_id,sort_key desc);
create index if not exists ks_qh87_company_reference on public.ks_quotation_history_v50087(company_id,reference_key,updated_at desc);
create index if not exists ks_qh87_company_creator on public.ks_quotation_history_v50087(company_id,creator_email,sort_key desc);

create or replace function public.keysuite_project_quotation_v50087(c text,s text,k text,n text,d jsonb,u timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare
 r text:=upper(trim(coalesce(n,''))); lid text:=coalesce(d->>'id',k,'');
 email text:=lower(trim(coalesce(d->>'createdByEmail',d->>'created_by_email','')));
 dt text; items jsonb; q jsonb; search text; seq text; rev text; sk text; created timestamptz;
begin
 if d is null then delete from public.ks_quotation_history_v50087 where company_id=c and source=s and storage_id=k; return; end if;
 items:=case when jsonb_typeof(d->'items')='array' then d->'items' else '[]'::jsonb end;
 dt:=left(coalesce(nullif(d->>'revisionDate',''),nullif(d->>'revision_date',''),d->>'date',''),10);
 -- Non-revisions retain the original quotation date.
 if coalesce(d->>'revisionOf','')='' and r !~ '(-R[0-9]+|\(R[0-9]+\)|-V[0-9]+)$' then dt:=left(coalesce(d->>'date',''),10); end if;
 seq:=coalesce(substring(regexp_replace(r,'(-R[0-9]+|\(R[0-9]+\)|-V[0-9]+)$','','i') from '([0-9]+)[^0-9]*$'),'0');
 rev:=coalesce(substring(r from '-R([0-9]+)$'),substring(r from '\(R([0-9]+)\)$'),substring(r from '-V([0-9]+)$'),'0');
 if coalesce(d->>'revisionNumber','') ~ '^[0-9]+$' then rev:=d->>'revisionNumber'; end if;
 begin created:=coalesce(nullif(d->>'createdAt',''),nullif(d->>'created_at',''))::timestamptz;exception when invalid_datetime_format or datetime_field_overflow then created:=u;end;
 sk:=dt||'|'||lpad(seq,20,'0')||'|'||lpad(rev,12,'0')||'|'||coalesce(to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),'')||'|'||coalesce(to_char(u at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),'')||'|'||r||'|'||lid;
 q:=jsonb_build_object('id',lid,'remoteStorageId',k,'companyId',c,'no',r,
  'date',coalesce(d->>'date',''),'originalDate',coalesce(d->>'originalDate',d->>'date',''),
  'revisionDate',coalesce(d->>'revisionDate',d->>'revision_date',''),'revisionOf',coalesce(d->>'revisionOf',d->>'revision_of',''),
  'revisionNumber',case when coalesce(d->>'revisionNumber','') ~ '^[0-9]+$' then (d->>'revisionNumber')::numeric else rev::numeric end,
  'documentType',coalesce(d->>'documentType',d->>'document_type','Quotation'),
  'project',coalesce(d->>'project',''),'project2',coalesce(d->>'project2',''),'currency',coalesce(d->>'currency',d->>'pricingCurrency','MYR'),
  'customerId',coalesce(d->>'customerId',d->>'customer_id',d->>'pricingCustomerId',''),
  'printedCompany',coalesce(nullif(d->>'printedCompany',''),nullif(d->>'customerName',''),nullif(d->>'customer_name',''),nullif(d->>'company',''),d->'pricingCustomerSnapshot'->>'company',''),
  'createdByEmail',email,'createdByName',coalesce(d->>'createdByName',d->>'created_by_name',''),
  'status',coalesce(d->>'status','saved'),'total',coalesce(d->'total',d->'grandTotal','0'::jsonb),
  'createdAt',coalesce(d->>'createdAt',d->>'created_at',''),'updatedAt',u,
  'itemCount',jsonb_array_length(items),'model',coalesce(items->0->>'model',d->>'model',''),'summaryOnly',true);
 select lower(concat_ws(' ',d->>'project',d->>'project2',d->>'projectName',d->>'project_name',r,d->>'no',d->>'quotationNo',d->>'quotation_no',q->>'printedCompany',d->>'model',d->>'product',d->>'productFamily',string_agg(concat_ws(' ',x->>'model',x->>'product',x->>'productFamily',x->>'product_family'),' '))) into search from jsonb_array_elements(items) x;
 q:=q||jsonb_build_object('searchText',search);
 insert into public.ks_quotation_history_v50087 values(c,s,k,coalesce(nullif(r,''),'ID:'||lid),lid,email,dt,sk,u,q,search)
 on conflict(company_id,source,storage_id) do update set reference_key=excluded.reference_key,logical_id=excluded.logical_id,creator_email=excluded.creator_email,history_date=excluded.history_date,sort_key=excluded.sort_key,updated_at=excluded.updated_at,summary=excluded.summary,search_text=excluded.search_text;
end; $$;
revoke all on function public.keysuite_project_quotation_v50087(text,text,text,text,jsonb,timestamptz) from public,anon,authenticated;

create or replace function public.keysuite_history_trigger_v50087() returns trigger
language plpgsql security definer set search_path='' as $$
declare s text:=case when tg_table_name='ks_quotations' then 'current' else 'archive' end; old_key text; new_key text;
begin
 if tg_op<>'INSERT' then
  if s='current' then old_key:=old.id::text;else old_key:=old.logical_id;end if;
  delete from public.ks_quotation_history_v50087 where company_id=old.company_id and source=s and storage_id=old_key;
 end if;
 if tg_op<>'DELETE' then
  if s='current' then new_key:=new.id::text;else new_key:=new.logical_id;end if;
  perform public.keysuite_project_quotation_v50087(new.company_id,s,new_key,new.quotation_no,new.quote_data,new.updated_at);
 end if;
 return null;
end; $$;
revoke all on function public.keysuite_history_trigger_v50087() from public,anon,authenticated;
drop trigger if exists keysuite_history_v50087 on public.ks_quotations;
create trigger keysuite_history_v50087 after insert or update or delete on public.ks_quotations for each row execute function public.keysuite_history_trigger_v50087();
drop trigger if exists keysuite_history_v50087 on public.ks_quotation_archive_v409;
create trigger keysuite_history_v50087 after insert or update or delete on public.ks_quotation_archive_v409 for each row execute function public.keysuite_history_trigger_v50087();
-- One-time backfill; source tables remain unchanged. Trigger DDL locks serialize concurrent writes.
select public.keysuite_project_quotation_v50087(company_id,'current',id::text,quotation_no,quote_data,updated_at) from public.ks_quotations;
select public.keysuite_project_quotation_v50087(company_id,'archive',logical_id,quotation_no,quote_data,updated_at) from public.ks_quotation_archive_v409;

create or replace function public.keysuite_history_company_v50087(p_company_id text)
returns text language plpgsql stable security definer set search_path='' as $$
declare c text:=public.keysuite_current_company_id(); e text:=public.keysuite_current_email(); l text;
begin
 if coalesce(e,'')='' or coalesce(c,'')='' then raise exception 'Your signed-in KeySuite company could not be determined.'; end if;
 if trim(coalesce(p_company_id,''))<>c then raise exception 'This quotation history belongs to another KeySuite company.'; end if;
 l:=lower(trim(coalesce(public.keysuite_permission_level('view_quotations'),'none')));
 return case l when 'assigned' then 'own' when 'all' then 'full' else l end;
end; $$;
revoke all on function public.keysuite_history_company_v50087(text) from public,anon,authenticated;

-- Deduplicate BEFORE own-user/search filters to preserve the existing winning-document rule.
create or replace function public.keysuite_history_rows_v50087(p_company_id text)
returns setof public.ks_quotation_history_v50087 language sql stable security definer set search_path='' as $$
 select distinct on(h.reference_key) h.* from public.ks_quotation_history_v50087 h where h.company_id=p_company_id
 order by h.reference_key,h.updated_at desc nulls last,(h.source='current') desc,h.storage_id desc;
$$;
revoke all on function public.keysuite_history_rows_v50087(text) from public,anon,authenticated;

create or replace function public.keysuite_history_page_v50087(p_company_id text,p_search text default '',p_customer text default '',p_user text default '',p_periods text[] default '{}',p_cursor text default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare l text:=public.keysuite_history_company_v50087(p_company_id); e text:=public.keysuite_current_email(); result jsonb; lim int:=greatest(1,least(coalesce(p_limit,50),100));
begin
 if l not in ('full','own') or l is null then return jsonb_build_object('rows','[]'::jsonb,'next_cursor',null,'facets',jsonb_build_object('years','[]'::jsonb,'users','[]'::jsonb),'metrics',jsonb_build_object('count',0,'value',0),'recent','[]'::jsonb); end if;
 with authorised as materialized (
  select h.* from public.keysuite_history_rows_v50087(p_company_id) h where l='full' or h.creator_email=e
 ), matches as (
  select * from authorised h where
   (coalesce(p_search,'')='' or position(lower(trim(p_search)) in h.search_text)>0) and
   (coalesce(p_customer,'')='' or position(lower(trim(p_customer)) in lower(h.summary->>'printedCompany'))>0) and
   (coalesce(p_user,'')='' or h.creator_email=lower(trim(p_user))) and
   (coalesce(array_length(p_periods,1),0)=0 or left(h.history_date,7)=any(p_periods)) and
   (p_cursor is null or h.sort_key < p_cursor collate "C")
  order by h.sort_key desc limit lim+1
 ), page as (select * from matches order by sort_key desc limit lim)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(summary order by sort_key desc) from page),'[]'::jsonb),
 'next_cursor',case when (select count(*) from matches)>lim then (select sort_key from page order by sort_key limit 1) else null end,
 'facets',case when p_cursor is null then jsonb_build_object(
  'years',coalesce((select jsonb_agg(y order by y desc) from (select distinct left(history_date,4) y from authorised where history_date ~ '^[0-9]{4}-') ys),'[]'::jsonb),
  'users',coalesce((select jsonb_agg(jsonb_build_object('email',creator_email,'name',name) order by creator_email) from (select creator_email,max(summary->>'createdByName') name from authorised where creator_email<>'' group by creator_email) us),'[]'::jsonb)) else null end,
 'metrics',case when p_cursor is null then (select jsonb_build_object('count',count(*),'value',coalesce(sum(case when summary->>'total' ~ '^-?[0-9]+([.][0-9]+)?$' then (summary->>'total')::numeric else 0 end),0)) from authorised) else null end,
 'recent',case when p_cursor is null then coalesce((select jsonb_agg(summary order by sort_key desc) from (select * from authorised order by sort_key desc limit 5) r),'[]'::jsonb) else null end) into result;
 return result;
end; $$;
revoke all on function public.keysuite_history_page_v50087(text,text,text,text,text[],text,integer) from public,anon;
grant execute on function public.keysuite_history_page_v50087(text,text,text,text,text[],text,integer) to authenticated;

create or replace function public.keysuite_history_document_v50087(p_company_id text,p_id text,p_no text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare l text:=public.keysuite_history_company_v50087(p_company_id); e text:=public.keysuite_current_email(); h public.ks_quotation_history_v50087; d jsonb;
begin
 if l not in ('full','own') or l is null then raise exception 'Quotation access is not permitted.'; end if;
 select * into h from public.keysuite_history_rows_v50087(p_company_id) w where w.logical_id=p_id and (coalesce(p_no,'')='' or w.reference_key=upper(trim(p_no))) and (l='full' or w.creator_email=e) order by w.sort_key desc limit 1;
 if not found then raise exception 'Quotation was not found or is not authorised.'; end if;
 if h.source='current' then select quote_data into d from public.ks_quotations where company_id=p_company_id and id::text=h.storage_id;
 else select quote_data into d from public.ks_quotation_archive_v409 where company_id=p_company_id and logical_id=h.storage_id; end if;
 if d is null then raise exception 'Quotation document is unavailable; refresh history.'; end if;
 return jsonb_build_object('remoteStorageId',h.storage_id,'row_data',d||jsonb_build_object('id',h.logical_id));
end; $$;
revoke all on function public.keysuite_history_document_v50087(text,text,text) from public,anon;
grant execute on function public.keysuite_history_document_v50087(text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
