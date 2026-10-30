-- KeySuite V5.00.15: dependency-safe pricing-category archival.
alter table public.ks_pricing_categories
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

create or replace function public.keysuite_archive_pricing_category_v50015(p_category_id text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_company text;
  v_role text;
  v_name text;
  v_customers integer:=0;
begin
  select company_id::text,lower(coalesce(role,'')) into v_company,v_role
  from public.ks_user_access
  where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and active=true
  limit 1;
  if v_company is null or v_role<>'owner' then
    raise exception 'Only the company Owner may archive a pricing category.';
  end if;

  select category_name into v_name
  from public.ks_pricing_categories
  where id::text=coalesce(p_category_id,'') and coalesce(is_active,true)=true
  for update;
  if v_name is null then raise exception 'The pricing category was not found or is already archived.'; end if;

  select count(*) into v_customers
  from public.ks_customers
  where company_id::text=v_company
    and pricing_category_id::text=p_category_id
    and coalesce(status,'active')='active';
  if v_customers>0 then
    return jsonb_build_object('archived',false,'reason',format('Category "%s" is assigned to %s active customer%s. Reassign those customers before archiving it.',v_name,v_customers,case when v_customers=1 then '' else 's' end));
  end if;

  update public.ks_pricing_categories
  set is_active=false,archived_at=now(),archived_by=lower(coalesce(auth.jwt()->>'email',''))
  where id::text=p_category_id and coalesce(is_active,true)=true;
  if not found then raise exception 'The pricing category was not archived.'; end if;
  return jsonb_build_object('archived',true,'category_id',p_category_id,'category_name',v_name);
end;
$$;

revoke all on function public.keysuite_archive_pricing_category_v50015(text) from public,anon;
grant execute on function public.keysuite_archive_pricing_category_v50015(text) to authenticated;
