-- KeySuite V4.21.13 / corrected in V4.21.14
-- Restore the missing KeyPLC 3kW and 37kW price-list rows.
-- Existing rows/prices are preserved. New rows follow the existing KEYPLC-xxxx text ID format.

do $$
declare
  v_next_source bigint;
  v_next_id integer;
  v_blank_variants jsonb := '[{"pumpQty":1,"label":"1 Pump","priceUsd":null,"priceRmb":null,"priceMyr":null},{"pumpQty":2,"label":"2 Pumps","priceUsd":null,"priceRmb":null,"priceMyr":null},{"pumpQty":3,"label":"3 Pumps","priceUsd":null,"priceRmb":null,"priceMyr":null},{"pumpQty":4,"label":"4 Pumps","priceUsd":null,"priceRmb":null,"priceMyr":null},{"pumpQty":5,"label":"5 Pumps","priceUsd":null,"priceRmb":null,"priceMyr":null},{"pumpQty":6,"label":"6 Pumps","priceUsd":null,"priceRmb":null,"priceMyr":null}]'::jsonb;
begin
  if to_regclass('public.ks_products_keyplc') is null then
    raise exception 'Table public.ks_products_keyplc does not exist.';
  end if;

  lock table public.ks_products_keyplc in share row exclusive mode;

  select coalesce(max(source_row),0) + 1
    into v_next_source
    from public.ks_products_keyplc;

  select coalesce(max(substring(id from '^KEYPLC-([0-9]+)$')::integer),0) + 1
    into v_next_id
    from public.ks_products_keyplc
   where id ~ '^KEYPLC-[0-9]+$';

  if not exists (
    select 1 from public.ks_products_keyplc
    where abs(coalesce(motor_kw,0)::numeric - 3.0) < 0.0001
       or regexp_replace(lower(coalesce(model,'')), '[[:space:]]+', '', 'g') = '3kw'
  ) then
    insert into public.ks_products_keyplc
      (id, model, motor_kw, source_row, rarity, variants, status)
    values
      ('KEYPLC-' || lpad(v_next_id::text,4,'0'), '3kW', 3.0, v_next_source, 'common', v_blank_variants, 'active');
    v_next_id := v_next_id + 1;
    v_next_source := v_next_source + 1;
  else
    update public.ks_products_keyplc
       set model='3kW', motor_kw=3.0, status='active',
           variants=case when variants is null or variants::text='[]' then v_blank_variants else variants end
     where abs(coalesce(motor_kw,0)::numeric - 3.0) < 0.0001
        or regexp_replace(lower(coalesce(model,'')), '[[:space:]]+', '', 'g') = '3kw';
  end if;

  if not exists (
    select 1 from public.ks_products_keyplc
    where abs(coalesce(motor_kw,0)::numeric - 37.0) < 0.0001
       or regexp_replace(lower(coalesce(model,'')), '[[:space:]]+', '', 'g') = '37kw'
  ) then
    insert into public.ks_products_keyplc
      (id, model, motor_kw, source_row, rarity, variants, status)
    values
      ('KEYPLC-' || lpad(v_next_id::text,4,'0'), '37kW', 37.0, v_next_source, 'common', v_blank_variants, 'active');
  else
    update public.ks_products_keyplc
       set model='37kW', motor_kw=37.0, status='active',
           variants=case when variants is null or variants::text='[]' then v_blank_variants else variants end
     where abs(coalesce(motor_kw,0)::numeric - 37.0) < 0.0001
        or regexp_replace(lower(coalesce(model,'')), '[[:space:]]+', '', 'g') = '37kw';
  end if;
end $$;

select id, model, motor_kw, source_row, rarity, status, variants
from public.ks_products_keyplc
where abs(coalesce(motor_kw,0)::numeric - 3.0) < 0.0001
   or abs(coalesce(motor_kw,0)::numeric - 37.0) < 0.0001
order by motor_kw;
