-- KeySuite V4.26.01
-- Motor IE4 + IE5 catalog refresh (hard-coded ks_products_motor edition)
-- Source: 004 - Motor 260811 - V1.2.xlsx
-- Master coverage: IE4 2P=31, IE4 4P=31, IE5 2P=26, IE5 4P=27.
--
-- IMPORTANT:
--   * This migration targets public.ks_products_motor directly.
--   * It uses the live business key confirmed by PostgreSQL: (efficiency_class, hp, pole).
--   * It also respects UNIQUE(model).
--   * Existing price_usd / price_rmb / price_myr and rarity values are NEVER updated.
--   * Existing source_row and id values are NEVER updated.
--   * Only genuinely missing business-key rows are inserted (new prices start at 0).
--   * Conflicting legacy model-name owners are retained, renamed to a unique legacy model,
--     and set inactive so historical IDs/prices are not deleted.

begin;

create temporary table _ks_v42601_motor_seed (
  source_sheet text not null,
  workbook_row integer not null,
  hp numeric not null,
  pole integer not null,
  efficiency_class text not null,
  model text not null,
  model_prefix text not null,
  description text not null,
  primary key (efficiency_class, hp, pole),
  unique (model)
) on commit drop;

insert into _ks_v42601_motor_seed
(source_sheet,workbook_row,hp,pole,efficiency_class,model,model_prefix,description)
values
  ('2Pole IE4', 3, 0.5, 2, 'IE4', '4BM0.5-2', '4BM', '0.5HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 4, 0.75, 2, 'IE4', '4BM0.75-2', '4BM', '0.75HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 5, 1, 2, 'IE4', '4BM1-2', '4BM', '1HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 6, 1.5, 2, 'IE4', '4BM1.5-2', '4BM', '1.5HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 7, 2, 2, 'IE4', '4BM2-2', '4BM', '2HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 8, 3, 2, 'IE4', '4BM3-2', '4BM', '3HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 9, 4, 2, 'IE4', '4BM4-2', '4BM', '4HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 10, 5.5, 2, 'IE4', '4BM5.5-2', '4BM', '5.5HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 11, 7.5, 2, 'IE4', '4BM7.5-2', '4BM', '7.5HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 12, 10, 2, 'IE4', '4BM10-2', '4BM', '10HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 13, 15, 2, 'IE4', '4BM15-2', '4BM', '15HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 14, 20, 2, 'IE4', '4BM20-2', '4BM', '20HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 15, 25, 2, 'IE4', '4BM25-2', '4BM', '25HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 16, 30, 2, 'IE4', '4BM30-2', '4BM', '30HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 17, 40, 2, 'IE4', '4BM40-2', '4BM', '40HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 18, 50, 2, 'IE4', '4BM50-2', '4BM', '50HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 19, 60, 2, 'IE4', '4BM60-2', '4BM', '60HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 20, 75, 2, 'IE4', '4BM75-2', '4BM', '75HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 21, 100, 2, 'IE4', '4BM100-2', '4BM', '100HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 22, 125, 2, 'IE4', '4BM125-2', '4BM', '125HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 23, 150, 2, 'IE4', '4BM150-2', '4BM', '150HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 24, 175, 2, 'IE4', '4BM175-2', '4BM', '175HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 25, 215, 2, 'IE4', '4BM215-2', '4BM', '215HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 26, 250, 2, 'IE4', '4BM250-2', '4BM', '250HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 27, 270, 2, 'IE4', '4BM270-2', '4BM', '270HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 28, 300, 2, 'IE4', '4BM300-2', '4BM', '300HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 29, 335, 2, 'IE4', '4BM335-2', '4BM', '335HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 30, 375, 2, 'IE4', '4BM375-2', '4BM', '375HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 31, 420, 2, 'IE4', '4BM420-2', '4BM', '420HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 32, 475, 2, 'IE4', '4BM475-2', '4BM', '475HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE4', 33, 500, 2, 'IE4', '4BM500-2', '4BM', '500HP 2Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 3, 0.5, 4, 'IE4', '4BM0.5-4', '4BM', '0.5HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 4, 0.75, 4, 'IE4', '4BM0.75-4', '4BM', '0.75HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 5, 1, 4, 'IE4', '4BM1-4', '4BM', '1HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 6, 1.5, 4, 'IE4', '4BM1.5-4', '4BM', '1.5HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 7, 2, 4, 'IE4', '4BM2-4', '4BM', '2HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 8, 3, 4, 'IE4', '4BM3-4', '4BM', '3HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 9, 4, 4, 'IE4', '4BM4-4', '4BM', '4HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 10, 5.5, 4, 'IE4', '4BM5.5-4', '4BM', '5.5HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 11, 7.5, 4, 'IE4', '4BM7.5-4', '4BM', '7.5HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 12, 10, 4, 'IE4', '4BM10-4', '4BM', '10HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 13, 15, 4, 'IE4', '4BM15-4', '4BM', '15HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 14, 20, 4, 'IE4', '4BM20-4', '4BM', '20HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 15, 25, 4, 'IE4', '4BM25-4', '4BM', '25HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 16, 30, 4, 'IE4', '4BM30-4', '4BM', '30HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 17, 40, 4, 'IE4', '4BM40-4', '4BM', '40HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 18, 50, 4, 'IE4', '4BM50-4', '4BM', '50HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 19, 60, 4, 'IE4', '4BM60-4', '4BM', '60HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 20, 75, 4, 'IE4', '4BM75-4', '4BM', '75HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 21, 100, 4, 'IE4', '4BM100-4', '4BM', '100HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 22, 125, 4, 'IE4', '4BM125-4', '4BM', '125HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 23, 150, 4, 'IE4', '4BM150-4', '4BM', '150HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 24, 175, 4, 'IE4', '4BM175-4', '4BM', '175HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 25, 215, 4, 'IE4', '4BM215-4', '4BM', '215HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 26, 250, 4, 'IE4', '4BM250-4', '4BM', '250HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 27, 270, 4, 'IE4', '4BM270-4', '4BM', '270HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 28, 300, 4, 'IE4', '4BM300-4', '4BM', '300HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 29, 335, 4, 'IE4', '4BM335-4', '4BM', '335HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 30, 375, 4, 'IE4', '4BM375-4', '4BM', '375HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 31, 420, 4, 'IE4', '4BM420-4', '4BM', '420HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 32, 475, 4, 'IE4', '4BM475-4', '4BM', '475HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE4', 33, 500, 4, 'IE4', '4BM500-4', '4BM', '500HP 4Pole IE4 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 3, 1, 2, 'IE5', '5BM1-2', '5BM', '1HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 4, 1.5, 2, 'IE5', '5BM1.5-2', '5BM', '1.5HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 5, 2, 2, 'IE5', '5BM2-2', '5BM', '2HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 6, 3, 2, 'IE5', '5BM3-2', '5BM', '3HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 7, 4, 2, 'IE5', '5BM4-2', '5BM', '4HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 8, 5.5, 2, 'IE5', '5BM5.5-2', '5BM', '5.5HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 9, 7.5, 2, 'IE5', '5BM7.5-2', '5BM', '7.5HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 10, 10, 2, 'IE5', '5BM10-2', '5BM', '10HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 11, 15, 2, 'IE5', '5BM15-2', '5BM', '15HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 12, 20, 2, 'IE5', '5BM20-2', '5BM', '20HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 13, 25, 2, 'IE5', '5BM25-2', '5BM', '25HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 14, 30, 2, 'IE5', '5BM30-2', '5BM', '30HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 15, 40, 2, 'IE5', '5BM40-2', '5BM', '40HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 16, 50, 2, 'IE5', '5BM50-2', '5BM', '50HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 17, 60, 2, 'IE5', '5BM60-2', '5BM', '60HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 18, 75, 2, 'IE5', '5BM75-2', '5BM', '75HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 19, 100, 2, 'IE5', '5BM100-2', '5BM', '100HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 20, 125, 2, 'IE5', '5BM125-2', '5BM', '125HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 21, 150, 2, 'IE5', '5BM150-2', '5BM', '150HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 22, 175, 2, 'IE5', '5BM175-2', '5BM', '175HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 23, 215, 2, 'IE5', '5BM215-2', '5BM', '215HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 24, 270, 2, 'IE5', '5BM270-2', '5BM', '270HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 25, 300, 2, 'IE5', '5BM300-2', '5BM', '300HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 26, 335, 2, 'IE5', '5BM335-2', '5BM', '335HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 27, 375, 2, 'IE5', '5BM375-2', '5BM', '375HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('2Pole IE5', 28, 420, 2, 'IE5', '5BM420-2', '5BM', '420HP 2Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 3, 0.75, 4, 'IE5', '5BM0.75-4', '5BM', '0.75HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 4, 1, 4, 'IE5', '5BM1-4', '5BM', '1HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 5, 1.5, 4, 'IE5', '5BM1.5-4', '5BM', '1.5HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 6, 2, 4, 'IE5', '5BM2-4', '5BM', '2HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 7, 3, 4, 'IE5', '5BM3-4', '5BM', '3HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 8, 4, 4, 'IE5', '5BM4-4', '5BM', '4HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 9, 5.5, 4, 'IE5', '5BM5.5-4', '5BM', '5.5HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 10, 7.5, 4, 'IE5', '5BM7.5-4', '5BM', '7.5HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 11, 10, 4, 'IE5', '5BM10-4', '5BM', '10HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 12, 15, 4, 'IE5', '5BM15-4', '5BM', '15HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 13, 20, 4, 'IE5', '5BM20-4', '5BM', '20HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 14, 25, 4, 'IE5', '5BM25-4', '5BM', '25HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 15, 30, 4, 'IE5', '5BM30-4', '5BM', '30HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 16, 40, 4, 'IE5', '5BM40-4', '5BM', '40HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 17, 50, 4, 'IE5', '5BM50-4', '5BM', '50HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 18, 60, 4, 'IE5', '5BM60-4', '5BM', '60HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 19, 75, 4, 'IE5', '5BM75-4', '5BM', '75HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 20, 100, 4, 'IE5', '5BM100-4', '5BM', '100HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 21, 125, 4, 'IE5', '5BM125-4', '5BM', '125HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 22, 150, 4, 'IE5', '5BM150-4', '5BM', '150HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 23, 175, 4, 'IE5', '5BM175-4', '5BM', '175HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 24, 215, 4, 'IE5', '5BM215-4', '5BM', '215HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 25, 270, 4, 'IE5', '5BM270-4', '5BM', '270HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 26, 300, 4, 'IE5', '5BM300-4', '5BM', '300HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 27, 335, 4, 'IE5', '5BM335-4', '5BM', '335HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 28, 375, 4, 'IE5', '5BM375-4', '5BM', '375HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)'),
  ('4Pole IE5', 29, 420, 4, 'IE5', '5BM420-4', '5BM', '420HP 4Pole IE5 Motor (415V / 3Ph / 50Hz)');

-- Fail early if the production Motor table is not the schema KeySuite expects.
do $$
declare
  v_missing text;
begin
  if to_regclass('public.ks_products_motor') is null then
    raise exception 'V4.26.01 Motor refresh: public.ks_products_motor does not exist. No data changed.';
  end if;

  select string_agg(req.col, ', ' order by req.col)
    into v_missing
  from (values
    ('id'),('model'),('efficiency_class'),('model_prefix'),('hp'),('pole'),
    ('description'),('source_sheet'),('source_row'),
    ('price_usd'),('price_rmb'),('price_myr'),('rarity'),('active')
  ) as req(col)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema='public'
      and c.table_name='ks_products_motor'
      and c.column_name=req.col
  );

  if v_missing is not null then
    raise exception 'V4.26.01 Motor refresh: ks_products_motor is missing required column(s): %. No data changed.', v_missing;
  end if;
end $$;

do $$
declare
  r record;
  v_model_tid tid;
  v_business_tid tid;
  v_next_source bigint;
  v_id_type text;
  v_id_default text;
  v_id_nullable text;
  v_next_id bigint;
  v_legacy_model text;
  c_ie4_2 integer;
  c_ie4_4 integer;
  c_ie5_2 integer;
  c_ie5_4 integer;
begin
  -- We hard-code the Motor table and business columns. Metadata is read only to
  -- choose a safe ID expression for brand-new rows.
  select c.data_type, c.column_default, c.is_nullable
    into v_id_type, v_id_default, v_id_nullable
  from information_schema.columns c
  where c.table_schema='public' and c.table_name='ks_products_motor' and c.column_name='id'
  limit 1;

  select coalesce(max(source_row),0)+1 into v_next_source
  from public.ks_products_motor;

  if v_id_default is null and v_id_nullable='NO' and v_id_type in ('smallint','integer','bigint') then
    execute 'select coalesce(max(id::bigint),0)+1 from public.ks_products_motor' into v_next_id;
  end if;

  -- PHASE 1: free every V1.2 model name that is currently attached to the wrong
  -- business key. We do this before canonical updates so UNIQUE(model) can never
  -- collide while fixing a different (efficiency_class,hp,pole) row.
  for r in
    select * from _ks_v42601_motor_seed order by efficiency_class,pole,hp,model
  loop
    v_model_tid := null;
    select m.ctid into v_model_tid
    from public.ks_products_motor m
    where lower(trim(coalesce(m.model,'')))=lower(r.model)
    limit 1;

    if v_model_tid is not null and not exists (
      select 1
      from public.ks_products_motor m
      where m.ctid=v_model_tid
        and upper(trim(coalesce(m.efficiency_class,'')))=r.efficiency_class
        and abs(m.hp::numeric-r.hp)<0.0001
        and m.pole::numeric=r.pole
    ) then
      v_legacy_model := r.model || '__legacy_v42601_' || substr(md5(v_model_tid::text),1,8);
      update public.ks_products_motor
      set model=v_legacy_model, active=false
      where ctid=v_model_tid;
    end if;
  end loop;

  -- PHASE 2: business-key row is canonical. Preserve its id/source_row/prices/rarity,
  -- refresh only catalog identity/description fields. Insert only if the business key
  -- is genuinely absent.
  for r in
    select * from _ks_v42601_motor_seed order by efficiency_class,pole,hp,model
  loop
    v_business_tid := null;
    select m.ctid into v_business_tid
    from public.ks_products_motor m
    where upper(trim(coalesce(m.efficiency_class,'')))=r.efficiency_class
      and abs(m.hp::numeric-r.hp)<0.0001
      and m.pole::numeric=r.pole
    limit 1;

    if v_business_tid is not null then
      update public.ks_products_motor
      set model=r.model,
          efficiency_class=r.efficiency_class,
          model_prefix=r.model_prefix,
          hp=r.hp,
          pole=r.pole,
          description=r.description,
          source_sheet=r.source_sheet,
          active=true
      where ctid=v_business_tid;
    else
      -- Brand-new IE4/IE5 size. Existing prices are never touched; new rows begin at 0.
      if v_id_default is not null or v_id_nullable='YES' then
        insert into public.ks_products_motor
          (model,efficiency_class,model_prefix,hp,pole,description,source_sheet,source_row,
           price_usd,price_rmb,price_myr,rarity,active)
        values
          (r.model,r.efficiency_class,r.model_prefix,r.hp,r.pole,r.description,r.source_sheet,v_next_source,
           0,0,0,'common',true);
      elsif v_id_type='uuid' then
        insert into public.ks_products_motor
          (id,model,efficiency_class,model_prefix,hp,pole,description,source_sheet,source_row,
           price_usd,price_rmb,price_myr,rarity,active)
        values
          (gen_random_uuid(),r.model,r.efficiency_class,r.model_prefix,r.hp,r.pole,r.description,r.source_sheet,v_next_source,
           0,0,0,'common',true);
      elsif v_id_type in ('text','character varying','character') then
        insert into public.ks_products_motor
          (id,model,efficiency_class,model_prefix,hp,pole,description,source_sheet,source_row,
           price_usd,price_rmb,price_myr,rarity,active)
        values
          ('motor-v42601-'||lower(regexp_replace(r.model,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(r.model),1,8),r.model,r.efficiency_class,r.model_prefix,r.hp,r.pole,r.description,r.source_sheet,v_next_source,
           0,0,0,'common',true);
      elsif v_id_type in ('smallint','integer','bigint') then
        execute format(
          'insert into public.ks_products_motor (id,model,efficiency_class,model_prefix,hp,pole,description,source_sheet,source_row,price_usd,price_rmb,price_myr,rarity,active) values (%s,%L,%L,%L,%s,%s,%L,%L,%s,0,0,0,%L,true)',
          v_next_id,r.model,r.efficiency_class,r.model_prefix,r.hp,r.pole,r.description,r.source_sheet,v_next_source,'common'
        );
        v_next_id := v_next_id + 1;
      else
        raise exception 'V4.26.01 Motor refresh: unsupported required id type % with no default.', coalesce(v_id_type,'NULL');
      end if;
      v_next_source := v_next_source + 1;
    end if;
  end loop;

  -- Exact verification: each source model must own its exact business key and be active.
  select count(*) into c_ie4_2
  from _ks_v42601_motor_seed s
  where s.efficiency_class='IE4' and s.pole=2
    and exists (select 1 from public.ks_products_motor m
                where lower(trim(m.model))=lower(s.model)
                  and upper(trim(m.efficiency_class))='IE4'
                  and abs(m.hp::numeric-s.hp)<0.0001
                  and m.pole::numeric=2
                  and coalesce(m.active,true)=true);

  select count(*) into c_ie4_4
  from _ks_v42601_motor_seed s
  where s.efficiency_class='IE4' and s.pole=4
    and exists (select 1 from public.ks_products_motor m
                where lower(trim(m.model))=lower(s.model)
                  and upper(trim(m.efficiency_class))='IE4'
                  and abs(m.hp::numeric-s.hp)<0.0001
                  and m.pole::numeric=4
                  and coalesce(m.active,true)=true);

  select count(*) into c_ie5_2
  from _ks_v42601_motor_seed s
  where s.efficiency_class='IE5' and s.pole=2
    and exists (select 1 from public.ks_products_motor m
                where lower(trim(m.model))=lower(s.model)
                  and upper(trim(m.efficiency_class))='IE5'
                  and abs(m.hp::numeric-s.hp)<0.0001
                  and m.pole::numeric=2
                  and coalesce(m.active,true)=true);

  select count(*) into c_ie5_4
  from _ks_v42601_motor_seed s
  where s.efficiency_class='IE5' and s.pole=4
    and exists (select 1 from public.ks_products_motor m
                where lower(trim(m.model))=lower(s.model)
                  and upper(trim(m.efficiency_class))='IE5'
                  and abs(m.hp::numeric-s.hp)<0.0001
                  and m.pole::numeric=4
                  and coalesce(m.active,true)=true);

  if c_ie4_2<>31 or c_ie4_4<>31 or c_ie5_2<>26 or c_ie5_4<>27 then
    raise exception 'V4.26.01 Motor verification failed: IE4 2P=%/31 4P=%/31; IE5 2P=%/26 4P=%/27. Transaction rolled back.',
      c_ie4_2,c_ie4_4,c_ie5_2,c_ie5_4;
  end if;

  raise notice 'V4.26.01 Motor verified: IE4 2P=% 4P=%; IE5 2P=% 4P=%',
    c_ie4_2,c_ie4_4,c_ie5_2,c_ie5_4;
end $$;

commit;
