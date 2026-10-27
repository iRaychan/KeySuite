-- V5.00.08: explicitly approved BGF-only rule support. No source costs or rules are seeded.
begin;
create schema if not exists keysuite_bgf_private;
revoke all on schema keysuite_bgf_private from public,anon;
grant usage on schema keysuite_bgf_private to authenticated;
create or replace function keysuite_bgf_private.save_rule(
 p_category_id text,p_category_name text,p_product_code text,
 p_margin numeric,p_normal numeric,p_rare numeric,p_transport numeric,
 p_use_commission boolean,p_use_set_discount boolean,p_use_final_discount boolean,p_use_fuel_charge boolean,p_currencies jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_rule jsonb; v_count integer; v_currency text; v_selected jsonb:='[]'::jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)) then raise exception 'Owner permission is required to change BGF pricing rules.'; end if;
 if p_product_code is distinct from 'BGF' then raise exception 'Only BGF is supported.'; end if;
 if coalesce(trim(p_category_id),'')='' then raise exception 'Save the Pricing Category first, then configure BGF.'; end if;
 if p_margin is null or p_margin<0 or p_margin>=1 or p_normal is null or p_normal<0 or p_normal>=1 or p_rare is null or p_rare<0 or p_rare>=1 or p_transport is null or p_transport<0 or p_transport::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid margin, rarity adjustment or transport value.'; end if;
 if p_currencies is null or jsonb_typeof(p_currencies)<>'array' then raise exception 'Currency selection must be an array.'; end if;
 for v_currency in select value from jsonb_array_elements_text(p_currencies) loop
  if v_currency is null or v_currency not in ('USD','RMB','MYR') then raise exception 'Invalid currency.'; end if;
  if not(v_selected ? v_currency) then v_selected:=v_selected||jsonb_build_array(v_currency); end if;
 end loop;
 v_rule:=jsonb_build_object('margin',p_margin,'normal',p_normal,'rare',p_rare,'transport',p_transport,'useCommission',coalesce(p_use_commission,false),'useSetDiscount',coalesce(p_use_set_discount,false),'useFinalDiscount',coalesce(p_use_final_discount,false),'useFuelCharge',coalesce(p_use_fuel_charge,false),'currencies',v_selected);
 update public.ks_pricing_categories set product_rules=jsonb_set(coalesce(product_rules,'{}'::jsonb),'{BGF}',v_rule,true) where id::text=p_category_id;
 get diagnostics v_count=row_count;if v_count<>1 then raise exception 'Pricing Category was not found.'; end if;
 return true;
end $$;
revoke all on function keysuite_bgf_private.save_rule(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) from public,anon;
grant execute on function keysuite_bgf_private.save_rule(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) to authenticated;
create or replace function public.keysuite_save_bgf_category_rule_v50008(
 p_category_id text,p_category_name text,p_product_code text,p_margin numeric,p_normal numeric,p_rare numeric,p_transport numeric,p_use_commission boolean,p_use_set_discount boolean,p_use_final_discount boolean,p_use_fuel_charge boolean,p_currencies jsonb
) returns boolean language sql security invoker set search_path='' as $$
 select keysuite_bgf_private.save_rule(p_category_id,p_category_name,p_product_code,p_margin,p_normal,p_rare,p_transport,p_use_commission,p_use_set_discount,p_use_final_discount,p_use_fuel_charge,p_currencies);
$$;
revoke all on function public.keysuite_save_bgf_category_rule_v50008(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) from public,anon;
grant execute on function public.keysuite_save_bgf_category_rule_v50008(text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,boolean,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
