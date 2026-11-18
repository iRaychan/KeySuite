-- Review before applying. Not executed during release preparation.
-- Add absent material configurations only; retain every existing price.
begin;
update public.ks_products_es p
set variants = coalesce(p.variants,'[]'::jsonb) || (
  select coalesce(jsonb_agg(jsonb_build_object(
    'material',m.material,'priceUsd',null,'priceRmb',null,'priceMyr',null)), '[]'::jsonb)
  from (values ('Duplex 2205'),('Duplex 2507')) m(material)
  where not exists (select 1 from jsonb_array_elements(coalesce(p.variants,'[]'::jsonb)) v
                    where v->>'material'=m.material)
)
where exists (
 select 1 from (values ('Duplex 2205'),('Duplex 2507')) m(material)
 where not exists (select 1 from jsonb_array_elements(coalesce(p.variants,'[]'::jsonb)) v
                   where v->>'material'=m.material)
);
commit;
