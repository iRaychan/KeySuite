-- KeySuite V4.28.55 — CR Category Pricing support.
begin;

create or replace function public.keysuite_save_cr_category_rule_v42855(
  p_category_id text,
  p_category_name text,
  p_product_code text,
  p_margin numeric,
  p_normal numeric,
  p_rare numeric,
  p_transport numeric,
  p_use_commission boolean,
  p_use_set_discount boolean,
  p_use_final_discount boolean,
  p_use_fuel_charge boolean
)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
  v_code text:=upper(trim(coalesce(p_product_code,'')));
  v_rule jsonb;
  v_count integer:=0;
begin
  if not exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=v_email
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  ) then
    raise exception 'Owner permission is required to change pricing-category rules.';
  end if;
  if v_code<>'CR' then raise exception 'Only CR is accepted by this pricing-category rule function.'; end if;
  if coalesce(trim(p_category_id),'')='' then raise exception 'Save the Pricing Category first, then set the CR rule.'; end if;
  if p_margin is null or p_margin<0 or p_margin>=1
     or p_normal is null or p_normal<0 or p_normal>=1
     or p_rare is null or p_rare<0 or p_rare>=1 then
    raise exception 'Margin / Normal / Rare must be from 0%% to below 100%%.';
  end if;
  if p_transport is null or p_transport<0 then raise exception 'Transport must be RM0.00 or more.'; end if;

  v_rule:=jsonb_build_object(
    'margin',p_margin,'normal',p_normal,'rare',p_rare,'transport',p_transport,
    'useCommission',coalesce(p_use_commission,false),
    'useSetDiscount',coalesce(p_use_set_discount,false),
    'useFinalDiscount',coalesce(p_use_final_discount,false),
    'useFuelCharge',coalesce(p_use_fuel_charge,false)
  );
  update public.ks_pricing_categories
  set category_name=coalesce(nullif(trim(p_category_name),''),category_name),
      product_rules=jsonb_set(coalesce(product_rules,'{}'::jsonb),'{CR}',v_rule,true)
  where id::text=p_category_id;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Pricing Category was not found.'; end if;
  return true;
end
$$;

revoke all on function public.keysuite_save_cr_category_rule_v42855(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.keysuite_save_cr_category_rule_v42855(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.keysuite_save_category_currency_selection_v41511(p_category_id text,p_product_code text,p_currencies jsonb)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_code text:=upper(trim(coalesce(p_product_code,'')));v_selected jsonb:='[]'::jsonb;v_value text;v_rules jsonb;v_rule jsonb;v_legacy_rule jsonb;v_count integer:=0;
begin
  if not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=v_email and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)=true) then raise exception 'Owner permission is required to change Category Price List Currency.'; end if;
  if coalesce(trim(p_category_id),'')='' then raise exception 'Pricing Category ID is required.'; end if;
  if v_code='CHC' then v_code:='CHC_G2'; end if;
  if v_code not in ('CHC_G1','CHC_G2','CR','BFI','ES','GWS','KEYPLC','MANIFOLD','MOTOR','COUPLING','BASEPLATE') then raise exception 'Unsupported product code: %.',coalesce(nullif(v_code,''),'(blank)'); end if;
  if p_currencies is null or jsonb_typeof(p_currencies)<>'array' then p_currencies:='[]'::jsonb; end if;
  for v_value in select upper(trim(value)) from jsonb_array_elements_text(p_currencies) loop
    if v_value in ('USD','RMB','MYR') and not (v_selected ? v_value) then v_selected:=v_selected||jsonb_build_array(v_value); end if;
  end loop;
  select coalesce(product_rules,'{}'::jsonb) into v_rules from public.ks_pricing_categories where id::text=p_category_id for update;
  if not found then raise exception 'Pricing Category was not found.'; end if;
  v_rule:=coalesce(v_rules->v_code,'{}'::jsonb);v_rule:=jsonb_set(v_rule,'{currencies}',v_selected,true);v_rules:=jsonb_set(v_rules,array[v_code],v_rule,true);
  if v_code='CHC_G2' then v_legacy_rule:=coalesce(v_rules->'CHC','{}'::jsonb);v_legacy_rule:=jsonb_set(v_legacy_rule,'{currencies}',v_selected,true);v_rules:=jsonb_set(v_rules,'{CHC}',v_legacy_rule,true);end if;
  update public.ks_pricing_categories set product_rules=v_rules where id::text=p_category_id;get diagnostics v_count=row_count;if v_count<>1 then raise exception 'Pricing Category currency selection was not saved.';end if;return true;
end $$;
revoke all on function public.keysuite_save_category_currency_selection_v41511(text,text,jsonb) from public,anon;
grant execute on function public.keysuite_save_category_currency_selection_v41511(text,text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
