begin;

-- Expand only the existing OEM mapping validator. No category, price,
-- percentage, customer assignment, or mapping rows are modified.
create or replace function public.keysuite_save_oem_series_mapping_v41503(p_mapping jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
  v_company public.ks_oem_brand_family_map.company_id%type;
  v_id public.ks_oem_brand_family_map.id%type;
  v_brand public.ks_oem_brand_family_map.brand_id%type;
  v_old_brand public.ks_oem_brand_family_map.brand_id%type;
  v_group text;v_old_group text;v_brand_series text;v_master_series text;v_selling_series text;
  v_active boolean;v_count integer:=0;
begin
  select ua.company_id into v_company from public.ks_user_access ua
  where lower(coalesce(ua.email,''))=v_email and coalesce(ua.active,true)=true
    and lower(coalesce(ua.role,'')) in ('owner','admin') limit 1;
  if v_company is null then raise exception 'Owner/Admin permission is required to manage OEM Price Groups.';end if;

  v_id:=nullif(p_mapping->>'id','');v_brand:=nullif(p_mapping->>'brand_id','');
  v_old_brand:=nullif(p_mapping->>'old_brand_id','');
  v_group:=upper(trim(coalesce(p_mapping->>'price_group_code',p_mapping->>'product_group_code',p_mapping->>'master_family','')));
  v_old_group:=upper(trim(coalesce(p_mapping->>'old_master_family','')));
  v_brand_series:=trim(coalesce(p_mapping->>'brand_series',''));
  v_master_series:=trim(coalesce(p_mapping->>'master_series',''));
  v_selling_series:=trim(coalesce(p_mapping->>'selling_series',''));
  v_active:=coalesce((p_mapping->>'active')::boolean,true);
  if v_group='CHC' then v_group:='CHC_G2';end if;
  if v_old_group='CHC' then v_old_group:='CHC_G2';end if;
  if v_id is null or v_brand is null then raise exception 'Mapping ID and Brand are required.';end if;
  if v_group not in ('BASEPLATE','BFI','BGF','BSV','BSW','CHC_G1','CHC_G2','COUPLING','CR','ES','GWS','ISO','KEYPLC','KV','MANIFOLD','MOTOR') then
    raise exception 'Unsupported Price Group: %',v_group;
  end if;
  if v_brand_series='' or v_master_series='' or v_selling_series='' then
    raise exception 'Brand Series, Base Sub Series and Selling Sub Series are required.';
  end if;

  update public.ks_oem_brand_family_map set brand_id=v_brand,master_family=v_group,
    master_series=v_master_series,selling_series=v_selling_series,active=v_active,updated_at=now()
  where id=v_id and company_id=v_company;
  get diagnostics v_count=row_count;
  if v_count=0 then
    insert into public.ks_oem_brand_family_map(id,company_id,brand_id,master_family,master_series,selling_series,active,updated_at)
    values(v_id,v_company,v_brand,v_group,v_master_series,v_selling_series,v_active,now());
  end if;

  update public.ks_oem_brand_series set brand_series=v_brand_series,active=v_active,updated_at=now()
  where company_id=v_company and brand_id=v_brand and upper(product_group)=v_group;
  get diagnostics v_count=row_count;
  if v_count=0 then
    insert into public.ks_oem_brand_series(company_id,brand_id,product_group,brand_series,active,updated_at)
    values(v_company,v_brand,v_group,v_brand_series,v_active,now());
  end if;

  if v_old_brand is not null and v_old_group<>''
     and (v_old_brand is distinct from v_brand or v_old_group is distinct from v_group)
     and not exists(select 1 from public.ks_oem_brand_family_map m where m.company_id=v_company
       and m.brand_id=v_old_brand and upper(m.master_family)=v_old_group and coalesce(m.active,true)=true)
  then
    delete from public.ks_oem_brand_series where company_id=v_company and brand_id=v_old_brand and upper(product_group)=v_old_group;
  end if;
  return jsonb_build_object('id',v_id,'brand_id',v_brand,'price_group_code',v_group,
    'base_family',case when v_group in ('CHC_G1','CHC_G2') then 'CHC' else v_group end,
    'generation_code',case when v_group='CHC_G1' then 'G1' when v_group='CHC_G2' then 'G2' else null end);
end
$$;

revoke all on function public.keysuite_save_oem_series_mapping_v41503(jsonb) from public,anon;
grant execute on function public.keysuite_save_oem_series_mapping_v41503(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
