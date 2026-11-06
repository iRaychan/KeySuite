begin;

create or replace function public.keysuite_save_submersible_category_v50045(
  p_category_id text, p_product_code text, p_rule jsonb, p_new_name text
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  field text;
  amount numeric;
  clean_rule jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or public.keysuite_current_role() is distinct from 'owner' then
    raise exception 'Only the Owner can manage pricing categories.';
  end if;
  if p_product_code is null or p_product_code not in ('BSW','BSV') then
    raise exception 'Invalid product family.';
  end if;
  if jsonb_typeof(p_rule) is distinct from 'object' then
    raise exception 'Invalid pricing rule.';
  end if;
  foreach field in array array['margin','normal','rare','trimming','transport'] loop
    if jsonb_typeof(p_rule->field) is distinct from 'number' then
      raise exception 'Invalid pricing value: %', field;
    end if;
    amount := (p_rule->>field)::numeric;
    if amount < 0 or (field in ('margin','normal','rare') and amount >= 1) then
      raise exception 'Invalid pricing value: %', field;
    end if;
    clean_rule := clean_rule || jsonb_build_object(field,amount);
  end loop;
  foreach field in array array['useCommission','useSetDiscount','useFinalDiscount','useFuelCharge'] loop
    if jsonb_typeof(p_rule->field) is distinct from 'boolean' then
      raise exception 'Invalid pricing option: %', field;
    end if;
    clean_rule := clean_rule || jsonb_build_object(field,p_rule->field);
  end loop;
  if jsonb_typeof(p_rule->'currencies') is distinct from 'array' then
    raise exception 'Invalid currency selection.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rule->'currencies') as currency(value)
             where value not in ('"USD"'::jsonb,'"RMB"'::jsonb,'"MYR"'::jsonb)) then
    raise exception 'Invalid currency selection.';
  end if;
  clean_rule := clean_rule || jsonb_build_object('currencies',p_rule->'currencies');

  update public.ks_pricing_categories
  set product_rules = jsonb_set(coalesce(product_rules,'{}'::jsonb),array[p_product_code],
    (case when jsonb_typeof(product_rules->p_product_code) = 'object'
          then product_rules->p_product_code else '{}'::jsonb end) || clean_rule,true)
  where id = p_category_id and is_active is distinct from false;
  if not found then
    raise exception 'Category not found or not editable.';
  end if;
  if p_new_name is not null then
    perform public.keysuite_rename_pricing_category(p_category_id,p_new_name);
  end if;
end;
$$;

revoke all on function public.keysuite_save_submersible_category_v50045(text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.keysuite_save_submersible_category_v50045(text,text,jsonb,text) to authenticated;

commit;
