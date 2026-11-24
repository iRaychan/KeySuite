begin;
alter function keystock.catalog() rename to catalog_v50087;
create function keystock.catalog() returns table(key text,family text,model text,brand text,choices jsonb)
language sql stable set search_path='' as $$
 select c.key,c.family,c.model,c.brand,case c.family
 when 'KV' then c.choices || coalesce((
   select jsonb_agg(jsonb_build_object('code',v.code,'label',v.code) order by v.code)
   from public.ks_products_kv k cross join (values ('KVD'),('KVSD')) v(code)
   where c.key='KV:'||k.id and to_jsonb(k) ? ('price_'||lower(v.code)||'_myr')
 ),'[]'::jsonb)
 when 'ES' then coalesce((select jsonb_agg(v order by seq)
   from jsonb_array_elements(c.choices) with ordinality a(v,seq)
   where regexp_replace(upper(v->>'code'),'[^A-Z0-9]','','g') not in
   ('CIBRSSMS','CIBRSSGP','CICISSDYNAMIC')),'[]'::jsonb)
 else c.choices end from keystock.catalog_v50087() c
$$;
revoke all on function keystock.catalog() from public,anon,authenticated;
create view public.keysuite_active_es_v50088 with (security_invoker=true) as
 select e.id,e.model,e.source_row,e.rarity,coalesce((
 select jsonb_agg(v order by n) from jsonb_array_elements(e.variants) with ordinality a(v,n)
 where regexp_replace(upper(coalesce(v->>'material','')),'[^A-Z0-9]','','g') not in
 ('CIBRSSMS','CIBRSSGP','CICISSDYNAMIC')),'[]'::jsonb) as variants
 from public.ks_products_es e;
revoke all on public.keysuite_active_es_v50088 from public,anon;
grant select on public.keysuite_active_es_v50088 to authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant select on public.keysuite_active_es_v50088 to service_role; end if; end $$;

-- Guard the write boundary as old mappings and historical configurations are retained.
alter function keystock.receipt_configuration(text,text,jsonb,text) rename to receipt_configuration_v50087;
create function keystock.receipt_configuration(c text,k text,sels jsonb,requested_variant text) returns uuid
language plpgsql set search_path='' as $$
declare result uuid;
begin
 result:=keystock.receipt_configuration_v50087(c,k,sels,requested_variant);
 if split_part(k,':',1)='ES' and exists(select 1 from keystock.configurations cfg where cfg.company_id=c and cfg.id=result
 and regexp_replace(upper(cfg.variant),'[^A-Z0-9]','','g') in ('CIBRSSMS','CIBRSSGP','CICISSDYNAMIC')) then
 raise exception 'This ES configuration is retired'; end if;
 return result;
end $$;
revoke all on function keystock.receipt_configuration(text,text,jsonb,text) from public,anon,authenticated;

create function keystock.quotation_costs_v50088() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tenant text:=public.keysuite_current_company_id(); result jsonb;
begin
 if auth.uid() is null or public.keysuite_has_access() is not true or nullif(tenant,'') is null
 or (keystock.ledger_permissions(tenant,lower(public.keysuite_current_role()))->>'view_stock')::boolean is not true
 or coalesce(public.keysuite_permission_level('view_costing_breakdown'),'none')='none'
 then return '[]'; end if;
 select coalesce(jsonb_agg(to_jsonb(cost_row)),'[]') into result from (
 select cfg.item_key,i.model,i.brand,cfg.id,cfg.variant,
 not exists(select 1 from jsonb_object_keys(cfg.selections) s where not exists
 (select 1 from keystock.groups g where g.company_id=tenant and g.id::text=s and g.kind='linked')) as variant_only,
 max(l.unit_cost_myr) as cost,sum(p.quantity-coalesce((select sum(a.remaining) from keystock.allocations a
 where a.company_id=tenant and a.position_id=p.id),0)) as available
 from keystock.positions p join keystock.lots l on (l.company_id,l.id)=(p.company_id,p.lot_id)
 join keystock.configurations cfg on (cfg.company_id,cfg.id)=(p.company_id,p.configuration_id)
 join keystock.items i on (i.company_id,i.key)=(cfg.company_id,cfg.item_key)
 where p.company_id=tenant and p.quantity>0 and not i.independent and keystock.allowed_family(i.family)
 group by cfg.company_id,cfg.id,cfg.item_key,cfg.variant,cfg.selections,i.brand,i.model
 ) cost_row;
 return result;
end $$;
create function public.keysuite_quotation_costs_v50088() returns jsonb language sql stable security invoker set search_path='' as $$ select keystock.quotation_costs_v50088() $$;
revoke all on function keystock.quotation_costs_v50088(),public.keysuite_quotation_costs_v50088() from public,anon;
grant execute on function keystock.quotation_costs_v50088(),public.keysuite_quotation_costs_v50088() to authenticated;

-- Existing categories use one product_rules document. Preserve unrelated properties.
create function public.keysuite_category_rule_v50088(p_category_id text,p_product_code text,p_rule jsonb,p_name text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare rules jsonb; merged jsonb; f text;
begin
 if auth.uid() is null or public.keysuite_has_access() is not true or lower(public.keysuite_current_role()) is distinct from 'owner' then raise exception 'Owner permission required'; end if;
 if p_product_code is null or p_product_code not in ('BASEPLATE','BFI','BGF','G','BSV','BSW','CHC_G1','CHC_G2','COUPLING','CR','ES','GWS','ISO','KEYPLC','KV','MANIFOLD','MOTOR') then raise exception 'Unknown product family'; end if;
 if jsonb_typeof(p_rule->'currencies') is distinct from 'array' or exists(select 1 from jsonb_array_elements_text(p_rule->'currencies') s where s is null or s not in ('USD','RMB','MYR','STOCK')) then raise exception 'Invalid sources'; end if;
 foreach f in array array['margin','normal','rare','trimming','transport'] loop
 if jsonb_typeof(p_rule->f) is distinct from 'number' or (p_rule->>f)::numeric<0 or (f in ('margin','normal','rare') and (p_rule->>f)::numeric>=1) then raise exception 'Invalid %',f; end if; end loop;
 foreach f in array array['useCommission','useSetDiscount','useFinalDiscount','useFuelCharge'] loop
 if jsonb_typeof(p_rule->f) is distinct from 'boolean' then raise exception 'Invalid %',f; end if; end loop;
 select coalesce(product_rules,'{}') into strict rules from public.ks_pricing_categories where id::text=p_category_id and is_active is distinct from false for update;
 merged:=coalesce(rules->p_product_code,'{}')||p_rule;
 rules:=jsonb_set(rules,array[p_product_code],merged);
 if p_product_code='CHC_G2' then rules:=jsonb_set(rules,'{CHC}',coalesce(rules->'CHC','{}')||p_rule); end if;
 if p_name is not null then perform public.keysuite_rename_pricing_category(p_category_id,p_name); end if;
 if p_product_code='CHC_G2' then
  update public.ks_pricing_categories set product_rules=rules,chc_margin=(p_rule->>'margin')::numeric,transport=(p_rule->>'transport')::numeric where id::text=p_category_id;
 else
  update public.ks_pricing_categories set product_rules=rules where id::text=p_category_id;
 end if;
 if not found then raise exception 'Category could not be saved'; end if;
end $$;
revoke all on function public.keysuite_category_rule_v50088(text,text,jsonb,text) from public,anon;
grant execute on function public.keysuite_category_rule_v50088(text,text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
