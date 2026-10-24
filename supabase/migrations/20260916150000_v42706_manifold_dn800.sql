-- KeySuite V4.27.06 — extend Manifold Sizing and GI/SS Header tables through DN800.
-- New price rows start blank. Existing rows and prices are not changed.

begin;

do $$
declare
  v_sizes integer[]:=array[250,300,350,400,450,500,600,800];
  v_sizing jsonb:='{
    "250":["DN250","DN350","DN400","DN500","DN600","DN600"],
    "300":["DN300","DN400","DN450","DN600","DN600","DN800"],
    "350":["DN350","DN450","DN500","DN600","DN800","DN800"],
    "400":["DN400","DN500","DN600","DN800","DN800","DN800"],
    "450":["DN450","DN600","DN600","DN800","DN800","DN800"],
    "500":["DN500","DN600","DN800","DN800","DN800","DN800"],
    "600":["DN600","DN800","DN800","DN800","DN800","DN800"],
    "800":["DN800","DN800","DN800","DN800","DN800","DN800"]
  }'::jsonb;
  v_material text;
  v_model text;
  v_dn integer;
  v_template public.ks_products_manifold%rowtype;
  v_payload jsonb;
  v_variants jsonb;
begin
  -- Manifold Sizing rows, one result per pump quantity from 1 to 6.
  select * into v_template
  from public.ks_products_manifold
  where lower(section)='sizing'
  order by source_row desc nulls last
  limit 1;

  if found then
    foreach v_dn in array v_sizes loop
      v_model:='DN'||v_dn::text;
      if not exists(
        select 1 from public.ks_products_manifold
        where lower(section)='sizing' and upper(model)=v_model
      ) then
        select jsonb_agg(
          jsonb_build_object(
            'pumpQty',ordinality,
            'label',ordinality::text||case when ordinality=1 then ' Pump' else ' Pumps' end,
            'resultDn',value
          ) order by ordinality
        ) into v_variants
        from jsonb_array_elements_text(v_sizing->v_dn::text) with ordinality;

        v_payload:=to_jsonb(v_template)||jsonb_build_object(
          'id',gen_random_uuid()::text,
          'model',v_model,
          'source_row',9500+v_dn,
          'variants',coalesce(v_variants,'[]'::jsonb),
          'status','active'
        );
        insert into public.ks_products_manifold
        select (jsonb_populate_record(null::public.ks_products_manifold,v_payload)).*;
      end if;
    end loop;
  end if;

  -- GI and SS Header rows through DN800. New prices are blank for 1–6 pumps.
  foreach v_material in array array['GI','SS'] loop
    select * into v_template
    from public.ks_products_manifold
    where lower(section)='header' and upper(model) like v_material||' DN%'
    order by source_row desc nulls last
    limit 1;

    if found then
      foreach v_dn in array v_sizes loop
        v_model:=v_material||' DN'||v_dn::text;
        if not exists(
          select 1 from public.ks_products_manifold
          where lower(section)='header' and upper(model)=v_model
        ) then
          select jsonb_agg(
            value || jsonb_build_object('priceUsd',null,'priceRmb',null,'priceMyr',null)
            order by ordinality
          ) into v_variants
          from jsonb_array_elements(coalesce(v_template.variants::jsonb,'[]'::jsonb)) with ordinality;

          v_payload:=to_jsonb(v_template)||jsonb_build_object(
            'id',gen_random_uuid()::text,
            'model',v_model,
            'source_row',10000+(case when v_material='GI' then 0 else 1000 end)+v_dn,
            'rarity','common',
            'variants',coalesce(v_variants,'[]'::jsonb),
            'status','active'
          );
          insert into public.ks_products_manifold
          select (jsonb_populate_record(null::public.ks_products_manifold,v_payload)).*;
        end if;
      end loop;
    end if;
  end loop;
end $$;

commit;
