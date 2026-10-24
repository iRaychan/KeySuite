-- KeySuite V4.27.07 — import 010 - Manifold (Pricelist) - 260916 - V1.2.
-- Workbook values are MYR. Existing USD/RMB values remain unchanged.

begin;

do $$
declare
  v_prices jsonb:='{
    "branch|DN25":{"GI_THREAD_10":180,"SS_THREAD_10":180,"GI_FLANGE_16":200,"SS_FLANGE_16":200,"GI_FLANGE_25":590,"SS_FLANGE_25":1120},
    "branch|DN32":{"GI_THREAD_10":260,"SS_THREAD_10":260,"GI_FLANGE_16":270,"SS_FLANGE_16":270,"GI_FLANGE_25":640,"SS_FLANGE_25":1320},
    "branch|DN40":{"GI_THREAD_10":310,"SS_THREAD_10":310,"GI_FLANGE_16":330,"SS_FLANGE_16":330,"GI_FLANGE_25":690,"SS_FLANGE_25":1450},
    "branch|DN50":{"GI_THREAD_10":360,"SS_THREAD_10":360,"GI_FLANGE_16":450,"SS_FLANGE_16":450,"GI_FLANGE_25":830,"SS_FLANGE_25":1730},
    "branch|DN65":{"GI_THREAD_10":800,"SS_THREAD_10":800,"GI_FLANGE_16":880,"SS_FLANGE_16":880,"GI_FLANGE_25":1020,"SS_FLANGE_25":2280},
    "branch|DN80":{"GI_THREAD_10":910,"SS_THREAD_10":1490,"GI_FLANGE_16":910,"SS_FLANGE_16":1490,"GI_FLANGE_25":940,"SS_FLANGE_25":2700},
    "branch|DN100":{"GI_THREAD_10":1170,"SS_THREAD_10":1880,"GI_FLANGE_16":1170,"SS_FLANGE_16":1880,"GI_FLANGE_25":1210,"SS_FLANGE_25":3630},
    "branch|DN125":{"GI_THREAD_10":1640,"SS_THREAD_10":2630,"GI_FLANGE_16":1640,"SS_FLANGE_16":2630,"GI_FLANGE_25":1710,"SS_FLANGE_25":5000},
    "branch|DN150":{"GI_THREAD_10":1950,"SS_THREAD_10":3230,"GI_FLANGE_16":1950,"SS_FLANGE_16":3230,"GI_FLANGE_25":2210,"SS_FLANGE_25":6830},
    "branch|DN200":{"GI_THREAD_10":2850,"SS_THREAD_10":4640,"GI_FLANGE_16":2850,"SS_FLANGE_16":4640,"GI_FLANGE_25":3320,"SS_FLANGE_25":10310},

    "flexible|DN25":{"GI_THREAD_10":46,"SS_THREAD_10":46,"GI_FLANGE_16":40,"SS_FLANGE_16":65,"GI_FLANGE_25":43,"SS_FLANGE_25":77},
    "flexible|DN32":{"GI_THREAD_10":66,"SS_THREAD_10":66,"GI_FLANGE_16":40,"SS_FLANGE_16":80,"GI_FLANGE_25":43,"SS_FLANGE_25":95},
    "flexible|DN40":{"GI_THREAD_10":88,"SS_THREAD_10":88,"GI_FLANGE_16":40,"SS_FLANGE_16":90,"GI_FLANGE_25":43,"SS_FLANGE_25":106},
    "flexible|DN50":{"GI_THREAD_10":105,"SS_THREAD_10":105,"GI_FLANGE_16":40,"SS_FLANGE_16":110,"GI_FLANGE_25":53,"SS_FLANGE_25":130},
    "flexible|DN65":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":45,"SS_FLANGE_16":135,"GI_FLANGE_25":58,"SS_FLANGE_25":159},
    "flexible|DN80":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":55,"SS_FLANGE_16":165,"GI_FLANGE_25":73,"SS_FLANGE_25":195},
    "flexible|DN100":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":65,"SS_FLANGE_16":215,"GI_FLANGE_25":93,"SS_FLANGE_25":253},
    "flexible|DN125":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":95,"SS_FLANGE_16":275,"GI_FLANGE_25":133,"SS_FLANGE_25":324},
    "flexible|DN150":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":115,"SS_FLANGE_16":375,"GI_FLANGE_25":173,"SS_FLANGE_25":442},
    "flexible|DN200":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":185,"SS_FLANGE_16":485,"GI_FLANGE_25":278,"SS_FLANGE_25":571},

    "strainer|DN25":{"GI_THREAD_10":18,"SS_THREAD_10":18,"GI_FLANGE_16":76,"SS_FLANGE_16":113,"GI_FLANGE_25":76,"SS_FLANGE_25":113},
    "strainer|DN32":{"GI_THREAD_10":25,"SS_THREAD_10":25,"GI_FLANGE_16":76,"SS_FLANGE_16":139,"GI_FLANGE_25":76,"SS_FLANGE_25":139},
    "strainer|DN40":{"GI_THREAD_10":33,"SS_THREAD_10":33,"GI_FLANGE_16":76,"SS_FLANGE_16":146,"GI_FLANGE_25":76,"SS_FLANGE_25":146},
    "strainer|DN50":{"GI_THREAD_10":43,"SS_THREAD_10":43,"GI_FLANGE_16":78,"SS_FLANGE_16":160,"GI_FLANGE_25":78,"SS_FLANGE_25":160},
    "strainer|DN65":{"GI_THREAD_10":105,"SS_THREAD_10":105,"GI_FLANGE_16":108,"SS_FLANGE_16":218,"GI_FLANGE_25":108,"SS_FLANGE_25":218},
    "strainer|DN80":{"GI_THREAD_10":158,"SS_THREAD_10":158,"GI_FLANGE_16":118,"SS_FLANGE_16":280,"GI_FLANGE_25":118,"SS_FLANGE_25":280},
    "strainer|DN100":{"GI_THREAD_10":350,"SS_THREAD_10":350,"GI_FLANGE_16":148,"SS_FLANGE_16":338,"GI_FLANGE_25":148,"SS_FLANGE_25":338},
    "strainer|DN125":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":238,"SS_FLANGE_16":518,"GI_FLANGE_25":238,"SS_FLANGE_25":518},
    "strainer|DN150":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":318,"SS_FLANGE_16":668,"GI_FLANGE_25":318,"SS_FLANGE_25":668},
    "strainer|DN200":{"GI_THREAD_10":null,"SS_THREAD_10":null,"GI_FLANGE_16":498,"SS_FLANGE_16":1208,"GI_FLANGE_25":498,"SS_FLANGE_25":1208},

    "header|GI DN40":{"1":null,"2":950,"3":1330,"4":1700,"5":null,"6":null},
    "header|GI DN50":{"1":null,"2":970,"3":1350,"4":1730,"5":null,"6":null},
    "header|GI DN65":{"1":null,"2":1060,"3":1460,"4":1860,"5":null,"6":null},
    "header|GI DN80":{"1":null,"2":1990,"3":2440,"4":2880,"5":null,"6":null},
    "header|GI DN100":{"1":null,"2":2120,"3":2580,"4":3050,"5":null,"6":null},
    "header|GI DN150":{"1":null,"2":3320,"3":3920,"4":4530,"5":null,"6":null},
    "header|GI DN200":{"1":null,"2":4160,"3":4860,"4":5550,"5":null,"6":null},
    "header|GI DN250":{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null},
    "header|GI DN300":{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null},
    "header|GI DN350":{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null},
    "header|SS DN40":{"1":null,"2":1570,"3":2230,"4":2900,"5":null,"6":null},
    "header|SS DN50":{"1":null,"2":1590,"3":2260,"4":2930,"5":null,"6":null},
    "header|SS DN65":{"1":null,"2":1840,"3":2620,"4":3390,"5":null,"6":null},
    "header|SS DN80":{"1":null,"2":3270,"3":4160,"4":5060,"5":null,"6":null},
    "header|SS DN100":{"1":null,"2":3720,"3":4800,"4":5870,"5":null,"6":null},
    "header|SS DN150":{"1":null,"2":5750,"3":7280,"4":8810,"5":null,"6":null},
    "header|SS DN200":{"1":null,"2":7790,"3":9900,"4":12010,"5":null,"6":null},
    "header|SS DN250":{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null},
    "header|SS DN300":{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null},
    "header|SS DN350":{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null},

    "tank_fitting|2L":{"FITTING":20},"tank_fitting|8L":{"FITTING":20},"tank_fitting|12L":{"FITTING":20},
    "tank_fitting|18L":{"FITTING":20},"tank_fitting|24L":{"FITTING":20},"tank_fitting|35L":{"FITTING":20},
    "tank_fitting|60L":{"FITTING":530},"tank_fitting|100L":{"FITTING":530},"tank_fitting|130L":{"FITTING":530},
    "tank_fitting|150L":{"FITTING":530},"tank_fitting|200L":{"FITTING":530},"tank_fitting|300L":{"FITTING":530},
    "tank_fitting|500L":{"FITTING":530},"tank_fitting|1000L":{"FITTING":880},
    "tank_fitting|2000L":{"FITTING":1080},"tank_fitting|3000L":{"FITTING":1280}
  }'::jsonb;
  v_sizing jsonb:='{
    "DN25":["DN25","DN40","DN50","DN65","DN80","DN100"],
    "DN32":["DN32","DN50","DN65","DN80","DN100","DN150"],
    "DN40":["DN40","DN65","DN80","DN100","DN150","DN150"],
    "DN50":["DN50","DN80","DN100","DN150","DN150","DN200"],
    "DN65":["DN65","DN100","DN150","DN150","DN200","DN250"],
    "DN80":["DN80","DN100","DN150","DN200","DN250","DN300"],
    "DN100":["DN100","DN150","DN200","DN250","DN300","DN350"],
    "DN125":["DN125","DN200","DN250","DN300","DN400","DN500"],
    "DN150":["DN150","DN250","DN300","DN400","DN500","DN600"],
    "DN200":["DN200","DN300","DN400","DN500","DN600","DN800"]
  }'::jsonb;
  v_row record;
  v_key text;
  v_values jsonb;
  v_variants jsonb;
  v_updated integer:=0;
begin
  for v_row in
    select id,lower(section) as section,upper(trim(model)) as model,coalesce(variants::jsonb,'[]'::jsonb) as variants
    from public.ks_products_manifold
    where status='active' and lower(section) in ('branch','flexible','strainer','header','tank_fitting')
  loop
    v_key:=v_row.section||'|'||v_row.model;
    v_values:=v_prices->v_key;
    if v_values is null then continue; end if;

    select coalesce(jsonb_agg(
      case
        when v_row.section='header' then
          value||jsonb_build_object('priceMyr',v_values->coalesce(value->>'pumpQty',regexp_replace(value->>'label','[^0-9]','','g')))
        when v_row.section='tank_fitting' then
          value||jsonb_build_object('priceMyr',v_values->coalesce(value->>'code','FITTING'))
        else
          value||jsonb_build_object('priceMyr',v_values->(value->>'code'))
      end
      order by ordinality
    ),'[]'::jsonb) into v_variants
    from jsonb_array_elements(v_row.variants) with ordinality;

    update public.ks_products_manifold set variants=v_variants where id=v_row.id;
    v_updated:=v_updated+1;
  end loop;

  if v_updated<66 then
    raise exception 'Manifold V1.2 price import matched only % rows; expected 66. Apply V4.27.06 first.',v_updated;
  end if;

  for v_row in
    select id,upper(trim(model)) as model,coalesce(variants::jsonb,'[]'::jsonb) as variants
    from public.ks_products_manifold
    where status='active' and lower(section)='sizing' and v_sizing ? upper(trim(model))
  loop
    select coalesce(jsonb_agg(
      value||jsonb_build_object(
        'resultDn',v_sizing->v_row.model->((greatest(1,least(6,coalesce((value->>'pumpQty')::integer,ordinality::integer))))-1)
      ) order by ordinality
    ),'[]'::jsonb) into v_variants
    from jsonb_array_elements(v_row.variants) with ordinality;

    update public.ks_products_manifold set variants=v_variants where id=v_row.id;
  end loop;
end $$;

commit;
