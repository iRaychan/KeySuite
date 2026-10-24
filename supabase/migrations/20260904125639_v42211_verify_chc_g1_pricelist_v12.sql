-- KeySuite V4.22.11 verification — CHC C4/G1 Price List V1.2.
do $$
declare
  c_all integer;
  c_10 integer;
  c_15 integer;
  c_source integer;
begin
  select count(*) into c_all
    from public.ks_products_chc_g1
   where source_workbook='010 - CHC G1 (Pricelist) - 260903 - V1.2.xlsx';
  if c_all < 412 then
    raise exception 'Expected at least 412 V1.2 C4/G1 price rows, found %', c_all;
  end if;

  select count(*) into c_10
    from public.ks_products_chc_g1
   where source_workbook='010 - CHC G1 (Pricelist) - 260903 - V1.2.xlsx'
     and model ~ '^CHC 10-[0-9]+$';
  if c_10 <> 22 then
    raise exception 'Expected 22 CHC 10 V1.2 price models, found %', c_10;
  end if;

  select count(*) into c_15
    from public.ks_products_chc_g1
   where source_workbook='010 - CHC G1 (Pricelist) - 260903 - V1.2.xlsx'
     and model ~ '^CHC 15-[0-9]+$';
  if c_15 <> 17 then
    raise exception 'Expected 17 CHC 15 V1.2 price models, found %', c_15;
  end if;

  if not exists(select 1 from public.ks_products_chc_g1 where model='CHC 32-15-2')
     or not exists(select 1 from public.ks_products_chc_g1 where model='CHC 32-15')
     or not exists(select 1 from public.ks_products_chc_g1 where model='CHC 32-16-2')
     or not exists(select 1 from public.ks_products_chc_g1 where model='CHC 32-16') then
    raise exception 'V1.2 CHC 32-15/16 price rows are missing.';
  end if;

  if exists(select 1 from public.ks_products_chc_g1 where model='CHC 5-5 (60Hz)') then
    raise exception 'Obsolete CHC 5-5 (60Hz) price row still exists.';
  end if;

  if to_regclass('public.ks_chc_g1_price_source_v41408') is not null then
    select count(*) into c_source
      from public.ks_chc_g1_price_source_v41408
     where generation_code='G1';
    if c_source <> 412 then
      raise exception 'Expected exactly 412 V1.2 audit source rows, found %', c_source;
    end if;
  end if;
end
$$;
