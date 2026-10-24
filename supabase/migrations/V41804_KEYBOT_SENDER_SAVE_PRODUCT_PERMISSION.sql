-- KeySuite V4.18.04 — KeyBot Sender Save + Role Product Permission
-- Baseline: V4.18.03
-- Safe to run more than once.
--
-- Fix 1: Sender / Company assignment Save
--   - Linking/changing the KeySuite User must save even when the legacy
--     Sender Mode is Curve & Price and no Customer is selected yet.
--   - Legacy Curve & Price may therefore be configured in stages. The webhook
--     already sends unconfigured legacy requests to manual review safely.
--
-- Fix 2: Guided Product availability
--   - Product permission is read from the user's saved Role permission.
--   - use_product = full/all       -> User product scope = ALL.
--   - use_product = assigned/own/self/restricted -> Role Brand Assigned scope.
--   - use_product = none           -> no Product access.
--   - Then Customer Brand / Series Price Preference is always applied.
--
-- No pricing formulas, product source data, selector curves, CHC G1/G2 data,
-- quotations, PDFs or KeyPLC engineering logic are changed.

begin;

create or replace function public.keysuite_v41804_assign_keybot_sender(
  p_company_id text,
  p_sender_id text,
  p_user_email text,
  p_customer_id text,
  p_response_mode text
)
returns boolean
language plpgsql
security definer
set search_path=public,auth
set row_security=off
as $$
declare
  v_company text := trim(coalesce(p_company_id,''));
  v_sender text := trim(coalesce(p_sender_id,''));
  v_user text := lower(trim(coalesce(p_user_email,'')));
  v_customer text := trim(coalesce(p_customer_id,''));
  v_mode text := lower(trim(coalesce(p_response_mode,'nothing')));
  v_actor text := lower(trim(coalesce(auth.jwt()->>'email','')));
begin
  if v_company='' or not public.keysuite_v409_has_company_access(v_company) then
    raise exception 'Your account has no active access to this KeySuite company.';
  end if;

  if public.keysuite_keyai_permission_v41202(v_company,'keyai_sender_assign')='none' then
    raise exception 'Your role does not have KeyBot Sender / Company assignment authority.';
  end if;

  if v_sender='' then
    raise exception 'Telegram sender ID is required.';
  end if;

  if v_mode not in ('nothing','curve_only','curve_price') then
    raise exception 'Invalid Sender mode.';
  end if;

  if v_user<>'' and not exists(
    select 1
    from public.ks_user_access ua
    where ua.company_id::text=v_company
      and lower(trim(coalesce(ua.email,'')))=v_user
      and coalesce(ua.active,false)=true
  ) then
    raise exception 'The selected KeySuite user is not active in this company.';
  end if;

  if v_customer<>'' and not exists(
    select 1
    from public.ks_customers c
    where c.id::text=v_customer
      and c.company_id::text=v_company
      and coalesce(c.status,'active')='active'
  ) then
    raise exception 'The selected customer does not belong to this KeySuite company.';
  end if;

  -- V4.18.04 intentionally does NOT block saving a linked user just because
  -- legacy Curve & Price has no Customer / pricing category yet. This lets the
  -- Sender mapping be configured in stages. Runtime safeguards remain in the
  -- Telegram webhook for incomplete legacy Curve & Price configuration.

  insert into public.ks_keyai_sender_customer_v40903(
    keysuite_company_id,channel,sender_id,keysuite_user_email,customer_id,response_mode,active,
    assigned_by_email,first_seen_at,last_seen_at,created_at,updated_at
  ) values(
    v_company,'telegram',v_sender,nullif(v_user,''),nullif(v_customer,''),v_mode,true,
    v_actor,now(),now(),now(),now()
  )
  on conflict(keysuite_company_id,channel,sender_id) do update
  set keysuite_user_email=excluded.keysuite_user_email,
      customer_id=excluded.customer_id,
      response_mode=excluded.response_mode,
      active=true,
      assigned_by_email=v_actor,
      updated_at=now();

  return true;
end;
$$;

revoke all on function public.keysuite_v41804_assign_keybot_sender(text,text,text,text,text)
  from public,anon;
grant execute on function public.keysuite_v41804_assign_keybot_sender(text,text,text,text,text)
  to authenticated;

comment on function public.keysuite_v41804_assign_keybot_sender(text,text,text,text,text)
is 'V4.18.04 KeyBot Sender assignment: user/customer/mode save independently; no legacy Curve & Price save-time customer blocker.';

-- Backward compatibility: any older cached V4.13+ browser calling the old RPC
-- gets the V4.18.04 save behavior too.
create or replace function public.keysuite_v41300_assign_keybot_sender(
  p_company_id text,
  p_sender_id text,
  p_user_email text,
  p_customer_id text,
  p_response_mode text
)
returns boolean
language sql
security definer
set search_path=public,auth
set row_security=off
as $$
  select public.keysuite_v41804_assign_keybot_sender(
    p_company_id,p_sender_id,p_user_email,p_customer_id,p_response_mode
  );
$$;

revoke all on function public.keysuite_v41300_assign_keybot_sender(text,text,text,text,text)
  from public,anon;
grant execute on function public.keysuite_v41300_assign_keybot_sender(text,text,text,text,text)
  to authenticated;


-- Replace the guided Product resolver so it follows the saved Role Product
-- permission rather than hard-coding Owner vs non-Owner.
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
  v_permissions jsonb := '{}'::jsonb;
  v_product_permission text := '';
  v_product_scope text := 'assigned';
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
      'product_permission','none',
      'product_scope','none',
      'products','[]'::jsonb
    );
  end if;

  v_company := coalesce(v_access->>'company_id','');
  v_role := lower(trim(coalesce(v_access->>'role','user')));

  -- Saved Role permission wins. Fallback only protects old databases where
  -- use_product has not yet been written into the role JSON.
  v_product_permission := case when v_role='owner' then 'full' else 'assigned' end;

  select coalesce(rp.permissions,'{}'::jsonb)
    into v_permissions
  from public.ks_role_permissions rp
  where rp.company_id::text=v_company
    and lower(trim(coalesce(rp.role,'')))=v_role
  limit 1;

  if found and v_permissions ? 'use_product' then
    v_product_permission := lower(trim(coalesce(v_permissions->>'use_product','none')));
  end if;

  v_product_scope := case
    when v_product_permission in ('full','all') then 'all'
    when v_product_permission in ('assigned','own','self','restricted') then 'assigned'
    else 'none'
  end;

  if v_product_scope='none' then
    return jsonb_build_object(
      'allowed',false,
      'code','PRODUCT_PERMISSION_NONE',
      'customer_scope',coalesce(v_access->>'scope','none'),
      'customer_id',v_customer,
      'user_email',v_email,
      'role',v_role,
      'product_permission',v_product_permission,
      'product_scope',v_product_scope,
      'products','[]'::jsonb
    );
  end if;

  select coalesce(p.selection,'{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb)
    into v_pref
  from public.ks_customer_brand_price_preference_v41710 p
  where p.company_id=v_company
    and p.customer_id=v_customer
  limit 1;

  v_pref := coalesce(v_pref,'{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb);

  if v_product_scope='assigned' then
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
    where v_product_scope='all'
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
    'role',v_role,
    'product_permission',v_product_permission,
    'product_scope',v_product_scope,
    'products',coalesce(v_result,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.keysuite_v41802_keybot_available_products(text,text)
  from public,anon,authenticated;
grant execute on function public.keysuite_v41802_keybot_available_products(text,text)
  to service_role;

comment on function public.keysuite_v41802_keybot_available_products(text,text)
is 'V4.18.04 KeyBot Product: saved Role use_product full/all = all user products; assigned scope intersects Role Brand Assigned; none blocks; Customer Price Preference always filters.';

notify pgrst,'reload schema';
commit;
