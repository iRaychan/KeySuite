-- KeySuite V5.00.17 hotfix — production ks_pricing_categories has no updated_at column.
-- Deployed production migration version: 20261031064259.
create or replace function public.keysuite_save_kv_category_rule_v50017(
  p_category_id text,p_category_name text,p_product_code text,p_margin numeric,p_normal numeric,
  p_rare numeric,p_transport numeric,p_use_commission boolean,p_use_set_discount boolean,
  p_use_final_discount boolean,p_use_fuel_charge boolean
)
returns public.ks_pricing_categories language plpgsql security definer set search_path=public as $$
declare result public.ks_pricing_categories;rule jsonb;
begin
  if not public.keysuite_is_owner_v50017() then raise exception 'Owner access required'; end if;
  if upper(trim(coalesce(p_product_code,'')))<>'KV' then raise exception 'Only KV is accepted by this pricing-category rule function'; end if;
  rule=jsonb_build_object('margin',p_margin,'normal',p_normal,'rare',p_rare,'trimming',0,'transport',p_transport,
    'useCommission',p_use_commission,'useSetDiscount',p_use_set_discount,
    'useFinalDiscount',p_use_final_discount,'useFuelCharge',p_use_fuel_charge);
  update public.ks_pricing_categories set
    category_name=coalesce(nullif(trim(p_category_name),''),category_name),
    product_rules=coalesce(product_rules,'{}'::jsonb)||jsonb_build_object('KV',rule)
  where id::text=p_category_id returning * into result;
  if result.id is null then raise exception 'Pricing category not found'; end if;
  return result;
end;
$$;
revoke all on function public.keysuite_save_kv_category_rule_v50017(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.keysuite_save_kv_category_rule_v50017(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean) to authenticated;
notify pgrst,'reload schema';
