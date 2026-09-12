-- KeySuite V4.18.03 — KeyBot Role Customer Permission
--
-- Customer availability now follows the linked KeySuite user's saved Role:
--   view_customers = all/full             -> all active Customers
--   view_customers = own/self/assigned    -> only Customers assigned to that user
--   view_customers = none                 -> no Customer access
--
-- This replaces the V4.18.02 guided-only strict assignment gate.
-- Product availability remains:
--   User Role Brand Assigned INTERSECT Customer Brand / Series Price Preference
--
-- Existing pricing formulas, quotation, selector, PDF, KeyPLC and CHC G1/G2
-- technical/price data remain unchanged.

begin;

create or replace function public.keysuite_v41803_keybot_customer_access(
  p_user_email text,
  p_customer_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
set row_security=off
as $$
declare
  v_email text := lower(trim(coalesce(p_user_email,'')));
  v_customer text := trim(coalesce(p_customer_id,''));
  v_company text := '';
  v_role text := '';
  v_raw_scope text := '';
  v_scope text := 'none';
  v_assigned_email text := '';
  v_permissions jsonb := '{}'::jsonb;
  v_allowed boolean := false;
begin
  if v_email='' then
    return jsonb_build_object('allowed',false,'code','USER_EMAIL_REQUIRED','scope','none');
  end if;
  if v_customer='' then
    return jsonb_build_object('allowed',false,'code','CUSTOMER_ID_REQUIRED','scope','none');
  end if;

  select ua.company_id::text, lower(trim(coalesce(ua.role,'user')))
    into v_company, v_role
  from public.ks_user_access ua
  where lower(trim(coalesce(ua.email,'')))=v_email
    and coalesce(ua.active,false)=true
  limit 1;

  if coalesce(v_company,'')='' then
    return jsonb_build_object('allowed',false,'code','USER_ACCESS_NOT_FOUND','scope','none');
  end if;

  -- Built-in defaults are used only if the Role permission row/key is absent.
  -- A saved Role permission always wins, including Owner/Admin = none/assigned.
  v_raw_scope := case
    when v_role in ('owner','admin') then 'all'
    when v_role='dealer' then 'own'
    when v_role in ('user','viewer') then 'assigned'
    else 'none'
  end;

  select coalesce(rp.permissions,'{}'::jsonb)
    into v_permissions
  from public.ks_role_permissions rp
  where rp.company_id::text=v_company
    and lower(trim(coalesce(rp.role,'')))=v_role
  limit 1;

  if found and v_permissions ? 'view_customers' then
    v_raw_scope := lower(trim(coalesce(v_permissions->>'view_customers','none')));
  end if;

  v_scope := case
    when v_raw_scope in ('all','full') then 'all'
    when v_raw_scope in ('own','self','assigned') then 'assigned'
    else 'none'
  end;

  if v_scope='none' then
    return jsonb_build_object(
      'allowed',false,
      'code','CUSTOMER_PERMISSION_NONE',
      'company_id',v_company,
      'user_email',v_email,
      'role',v_role,
      'raw_scope',v_raw_scope,
      'scope',v_scope
    );
  end if;

  select lower(trim(coalesce(c.assigned_user_email,'')))
    into v_assigned_email
  from public.ks_customers c
  where c.id::text=v_customer
    and c.company_id::text=v_company
    and coalesce(c.status,'active')='active'
  limit 1;

  if not found then
    return jsonb_build_object(
      'allowed',false,
      'code','CUSTOMER_NOT_FOUND',
      'company_id',v_company,
      'user_email',v_email,
      'role',v_role,
      'raw_scope',v_raw_scope,
      'scope',v_scope,
      'customer_id',v_customer
    );
  end if;

  v_allowed := v_scope='all' or (v_scope='assigned' and v_assigned_email=v_email);

  return jsonb_build_object(
    'allowed',v_allowed,
    'code',case when v_allowed then 'OK' else 'CUSTOMER_NOT_ASSIGNED_TO_USER' end,
    'company_id',v_company,
    'user_email',v_email,
    'role',v_role,
    'raw_scope',v_raw_scope,
    'scope',v_scope,
    'customer_id',v_customer,
    'assigned_user_email',v_assigned_email
  );
end;
$$;

revoke all on function public.keysuite_v41803_keybot_customer_access(text,text)
  from public,anon,authenticated;
grant execute on function public.keysuite_v41803_keybot_customer_access(text,text)
  to service_role;

comment on function public.keysuite_v41803_keybot_customer_access(text,text)
is 'V4.18.03 KeyBot Customer access: saved Role view_customers all/full = all active; own/self/assigned = assigned user only; none = no access.';


-- Replace the V4.18.02 product RPC so Product / Quick Selection uses the same
-- Role Customer permission after a Customer is selected.
create or replace function public.keysuite_v41802_keybot_available_products(
  p_user_email text,
  p_customer_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
set row_security=off
as $$
declare
  v_email text := lower(trim(coalesce(p_user_email,'')));
  v_customer text := trim(coalesce(p_customer_id,''));
  v_company text := '';
  v_role text := '';
  v_access jsonb := '{}'::jsonb;
  v_pref jsonb := '{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb;
  v_scope jsonb := '{"keys":[]}'::jsonb;
  v_result jsonb := '[]'::jsonb;
begin
  if v_email='' then
    raise exception 'Linked KeySuite user email is required.';
  end if;
  if v_customer='' then
    raise exception 'Customer ID is required.';
  end if;

  v_access := public.keysuite_v41803_keybot_customer_access(v_email,v_customer);

  if coalesce((v_access->>'allowed')::boolean,false) is not true then
    return jsonb_build_object(
      'allowed',false,
      'code',coalesce(v_access->>'code','CUSTOMER_NOT_ALLOWED'),
      'customer_scope',coalesce(v_access->>'scope','none'),
      'customer_id',v_customer,
      'products','[]'::jsonb
    );
  end if;

  v_company := coalesce(v_access->>'company_id','');
  v_role := lower(trim(coalesce(v_access->>'role','user')));

  select coalesce(p.selection,'{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb)
    into v_pref
  from public.ks_customer_brand_price_preference_v41710 p
  where p.company_id=v_company
    and p.customer_id=v_customer
  limit 1;

  v_pref := coalesce(v_pref,'{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb);

  -- Preserve the V4.18.02 User Brand Assigned rule.
  -- Owner remains unrestricted on User Brand Assigned; other roles intersect
  -- their persisted Role Brand Assigned scope.
  if v_role<>'owner' then
    select coalesce(s.selection_scope,'{"keys":[]}'::jsonb)
      into v_scope
    from public.ks_user_selection_scope_v41706 s
    where s.company_id=v_company
      and lower(trim(coalesce(s.email,'')))=v_email
    limit 1;
    v_scope := coalesce(v_scope,'{"keys":[]}'::jsonb);
  end if;

  with customer_price_keys as (
    select distinct trim(k.value) as price_key,
      split_part(trim(k.value),'|',1) as brand_id,
      upper(split_part(trim(k.value),'|',2)) as price_group
    from jsonb_array_elements_text(
      case when jsonb_typeof(v_pref->'price_keys')='array'
        then v_pref->'price_keys' else '[]'::jsonb end
    ) k
    where trim(k.value)<>'' and position('|' in trim(k.value))>1
  ), mapped as (
    select *,
      case
        when price_group in ('CHC_G1','CHC_G2') then 'CHC'
        when price_group='GWS' then 'TANK'
        else price_group
      end as role_family,
      case price_group
        when 'CHC_G1' then 'CHC G1'
        when 'CHC_G2' then 'CHC G2'
        when 'ES' then 'End Suction'
        when 'MOTOR' then 'Motor'
        when 'BASEPLATE' then 'Baseplate'
        when 'COUPLING' then 'Coupling'
        when 'KEYPLC' then 'KeyPLC Panel'
        when 'MANIFOLD' then 'Manifold'
        when 'GWS' then 'GWS Tank'
        else price_group
      end as product_label,
      price_group in ('CHC_G2','ES') as has_curve
    from customer_price_keys
    where price_group in ('CHC_G1','CHC_G2','ES','MOTOR','BASEPLATE','COUPLING','KEYPLC','MANIFOLD','GWS')
  ), allowed as (
    select m.*,
      case
        when upper(m.brand_id)='KEYLARGO' then 'Keylargo'
        when upper(m.brand_id)='GWS' then 'GWS'
        else coalesce(nullif(trim(b.brand_name),''),nullif(trim(b.brand_key),''),m.brand_id)
      end as brand_name
    from mapped m
    left join public.ks_oem_brands b
      on b.company_id::text=v_company
     and b.id::text=m.brand_id
     and coalesce(b.active,true)=true
    where v_role='owner'
       or exists (
         select 1
         from jsonb_array_elements_text(
           case when jsonb_typeof(v_scope->'keys')='array'
             then v_scope->'keys' else '[]'::jsonb end
         ) s
         where trim(s.value)=m.brand_id||'|*'
            or trim(s.value)=m.brand_id||'|'||m.role_family
       )
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key',a.price_key,
      'brand_id',a.brand_id,
      'brand_name',a.brand_name,
      'price_group',a.price_group,
      'role_family',a.role_family,
      'product_label',a.product_label,
      'has_curve',a.has_curve,
      'product_type',case
        when a.price_group in ('CHC_G1','CHC_G2','ES') then 'pump'
        when a.price_group='MOTOR' then 'motor'
        when a.price_group='GWS' then 'tank'
        when a.price_group='KEYPLC' then 'keyplc_panel'
        when a.price_group='MANIFOLD' then 'manifold'
        when a.price_group='BASEPLATE' then 'baseplate'
        when a.price_group='COUPLING' then 'coupling'
        else lower(a.price_group)
      end
    ) order by lower(a.brand_name), lower(a.product_label)
  ),'[]'::jsonb)
  into v_result
  from allowed a;

  return jsonb_build_object(
    'allowed',true,
    'code','OK',
    'customer_scope',coalesce(v_access->>'scope','none'),
    'customer_id',v_customer,
    'user_email',v_email,
    'products',coalesce(v_result,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.keysuite_v41802_keybot_available_products(text,text)
  from public,anon,authenticated;
grant execute on function public.keysuite_v41802_keybot_available_products(text,text)
  to service_role;

comment on function public.keysuite_v41802_keybot_available_products(text,text)
is 'V4.18.03: V4.18.02 Product list preserved, with Customer access now controlled by saved Role view_customers permission.';

notify pgrst,'reload schema';
commit;
