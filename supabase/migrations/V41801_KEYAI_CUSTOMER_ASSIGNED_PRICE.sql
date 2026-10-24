-- KeySuite V4.18.01 — KeyAI follows Customer Assigned Price
--
-- PURPOSE
--   KeyAI / KeyBot pricing must obey the same Customer Brand / Series Price
--   Preference used by normal KeySuite quotation pricing.
--
-- SOURCE OF TRUTH
--   Customer -> Brand / Series Price Preference (V4.17.10)
--   Customer -> Pricing Category
--   Customer -> Commission / Set Discount / Final Discount (existing V2.22 bridge)
--
-- IMPORTANT
--   - No new pricing formula is introduced.
--   - No product source price is changed.
--   - No CHC G1/G2 hydraulic, technical, dimension or drawing data is changed.
--   - No Apex / first category / another customer fallback is allowed.
--   - Missing/unticked Customer Price Preference means KeyAI must not price it.
--   - Safe to run more than once.

begin;

create or replace function public.keysuite_v41801_customer_price_assignment(
  p_user_email text,
  p_customer_id text,
  p_brand_ref text,
  p_price_group text
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
  v_brand_ref text := trim(coalesce(p_brand_ref,''));
  v_brand_norm text := lower(regexp_replace(trim(coalesce(p_brand_ref,'')),'[^a-z0-9]','','g'));
  v_group text := upper(regexp_replace(trim(coalesce(p_price_group,'')),'\s+','_','g'));
  v_uid uuid;
  v_company text := '';
  v_brand_id text := '';
  v_pref jsonb := null;
  v_price_key text := '';
  v_allowed boolean := false;
begin
  if v_email='' then
    raise exception 'Linked KeySuite user email is required.';
  end if;
  if v_customer='' then
    raise exception 'Customer ID is required.';
  end if;
  if v_group='' then
    raise exception 'Price Group is required.';
  end if;

  if v_group='CHC' then v_group:='CHC_G2'; end if;

  if v_group not in ('CHC_G1','CHC_G2','ES','MOTOR','BASEPLATE','COUPLING','KEYPLC','MANIFOLD','GWS') then
    return jsonb_build_object(
      'allowed',false,
      'code','UNKNOWN_PRICE_GROUP',
      'customer_id',v_customer,
      'price_group',v_group
    );
  end if;

  select c.company_id::text
    into v_company
  from public.ks_customers c
  where c.id::text=v_customer
    and coalesce(c.status,'active')='active'
  limit 1;

  if coalesce(v_company,'')='' then
    return jsonb_build_object(
      'allowed',false,
      'code','CUSTOMER_NOT_FOUND',
      'customer_id',v_customer,
      'price_group',v_group
    );
  end if;

  select u.id into v_uid
  from auth.users u
  where lower(trim(coalesce(u.email,'')))=v_email
  limit 1;

  if v_uid is null then
    raise exception 'Linked KeySuite user was not found in Supabase Auth.';
  end if;

  if not exists (
    select 1
    from public.ks_user_access ua
    where ua.company_id::text=v_company
      and lower(trim(coalesce(ua.email,'')))=v_email
      and coalesce(ua.active,false)=true
  ) then
    raise exception 'Linked KeySuite user has no active access to this customer company.';
  end if;

  if to_regprocedure('public.keysuite_get_customer_price_preference_v41710(text)') is null then
    raise exception 'V4.17.10 Customer Price Preference is not installed.';
  end if;

  -- Read the exact V4.17.10 central row first using the already-validated
  -- Customer company. This avoids any ambiguity for users who can access more
  -- than one KeySuite company.
  select p.selection
    into v_pref
  from public.ks_customer_brand_price_preference_v41710 p
  where p.company_id=v_company
    and p.customer_id=v_customer
  limit 1;

  -- If the central row has never been created, let the existing V4.17.10
  -- getter perform its lazy import from the legacy preference store. Any
  -- legacy-read problem is treated as not assigned; it must never fall back to
  -- another Customer or Price Group.
  if v_pref is null then
    perform set_config('request.jwt.claim.sub',v_uid::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object('sub',v_uid::text,'email',v_email,'role','authenticated')::text,
      true
    );
    begin
      select public.keysuite_get_customer_price_preference_v41710(v_customer)
        into v_pref;
    exception when others then
      v_pref := null;
    end;
  end if;

  v_pref := coalesce(
    v_pref,
    '{"keys":[],"price_keys":[],"brand_enabled":{}}'::jsonb
  );

  -- The house Price Groups use the same permanent virtual Brand IDs as the
  -- V4.17.10 browser preference editor.
  if v_group in ('BASEPLATE','COUPLING','KEYPLC','MANIFOLD') then
    v_brand_id := 'KEYLARGO';
  elsif v_group='GWS' then
    v_brand_id := 'GWS';
  else
    -- Hydraulic/Motor products use a real active selling Brand ID. Accept the
    -- actual ID or a Brand Name / Brand Key such as B.G.Reich.
    select b.id::text
      into v_brand_id
    from public.ks_oem_brands b
    where b.company_id::text=v_company
      and coalesce(b.active,true)=true
      and (
        lower(b.id::text)=lower(v_brand_ref)
        or lower(regexp_replace(trim(coalesce(b.brand_name,'')),'[^a-z0-9]','','g'))=v_brand_norm
        or lower(regexp_replace(trim(coalesce(b.brand_key,'')),'[^a-z0-9]','','g'))=v_brand_norm
      )
    order by
      case when lower(b.id::text)=lower(v_brand_ref) then 0
           when lower(regexp_replace(trim(coalesce(b.brand_key,'')),'[^a-z0-9]','','g'))=v_brand_norm then 1
           else 2 end,
      b.brand_name
    limit 1;
  end if;

  if coalesce(v_brand_id,'')='' then
    return jsonb_build_object(
      'allowed',false,
      'code','BRAND_NOT_FOUND',
      'customer_id',v_customer,
      'brand_ref',v_brand_ref,
      'price_group',v_group
    );
  end if;

  v_price_key := v_brand_id || '|' || v_group;

  select exists(
    select 1
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(v_pref->'price_keys')='array' then v_pref->'price_keys'
        else '[]'::jsonb
      end
    ) x(value)
    where trim(x.value)=v_price_key
  ) into v_allowed;

  return jsonb_build_object(
    'allowed',coalesce(v_allowed,false),
    'code',case when coalesce(v_allowed,false) then 'OK' else 'PRICE_NOT_ASSIGNED' end,
    'company_id',v_company,
    'customer_id',v_customer,
    'brand_id',v_brand_id,
    'price_group',v_group,
    'price_key',v_price_key
  );
end;
$$;

revoke all on function public.keysuite_v41801_customer_price_assignment(text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.keysuite_v41801_customer_price_assignment(text,text,text,text)
  to service_role;

comment on function public.keysuite_v41801_customer_price_assignment(text,text,text,text)
is 'V4.18.01 KeyAI service-role gate: follows the exact Customer Brand / Series Price Preference from V4.17.10.';

notify pgrst,'reload schema';
commit;
