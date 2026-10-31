-- KeySuite V5.00.19: align the BGF production catalogue with the approved 261030 workbook.
-- Keep the legacy bgf-500 ID so existing prices and references remain attached to the same row.
update public.ks_products_bgf
set
  model = case when id = 'bgf-500' then 'BGF 550' else model end,
  source_model = case when id = 'bgf-500' then 'BGF 550' else source_model end,
  source_workbook = '004 - BGF 261030 - V1.0.xlsx',
  updated_at = now()
where id in ('bgf-350m','bgf-350e','bgf-400','bgf-500');

do $$
begin
  if (select count(*) from public.ks_products_bgf
      where active
        and model in ('BGF 350M','BGF 350E','BGF 400','BGF 550')
        and source_workbook = '004 - BGF 261030 - V1.0.xlsx') <> 4 then
    raise exception 'V5.00.19 BGF catalogue verification failed.';
  end if;
end
$$;

notify pgrst, 'reload schema';
