-- KeySuite V5.00.12 proposal. Do not apply to production before approval.
-- Adds ES/ISO category Trimming and independent ISO multiplier storage.
-- Existing category rules are not rewritten; the new ISO multipliers inherit
-- the currently configured ES rates so existing ISO conversion stays stable.
begin;
alter table public.ks_app_settings add column if not exists iso_usd_multiplier numeric;
alter table public.ks_app_settings add column if not exists iso_rmb_multiplier numeric;
update public.ks_app_settings
set iso_usd_multiplier=coalesce(iso_usd_multiplier,es_usd_multiplier,usd_multiplier,5.8),
    iso_rmb_multiplier=coalesce(iso_rmb_multiplier,es_rmb_multiplier,rmb_multiplier,0.65)
where id='default';

create or replace function public.keysuite_save_product_pricelist_multiplier_v119(p_product_code text,p_currency text,p_multiplier numeric)
returns table(product_code text,usd_multiplier numeric,rmb_multiplier numeric)
language plpgsql security definer set search_path=public as $$
declare v_product text:=upper(trim(coalesce(p_product_code,'')));v_currency text:=upper(trim(coalesce(p_currency,'')));
begin
 if public.keysuite_permission_level('manage_price_list')<>'full' then raise exception 'Your role is not allowed to maintain Price List settings.'; end if;
 if v_product not in ('CHC','ES','ISO','GWS','KEYPLC','MANIFOLD') then raise exception 'Unsupported product.'; end if;
 if v_currency not in ('USD','RMB') then raise exception 'Currency must be USD or RMB.'; end if;
 if p_multiplier is null or p_multiplier<=0 then raise exception 'Currency rate must be greater than zero.'; end if;
 update public.ks_app_settings s set
  chc_usd_multiplier=case when v_product='CHC' and v_currency='USD' then p_multiplier else s.chc_usd_multiplier end,
  chc_rmb_multiplier=case when v_product='CHC' and v_currency='RMB' then p_multiplier else s.chc_rmb_multiplier end,
  es_usd_multiplier=case when v_product='ES' and v_currency='USD' then p_multiplier else s.es_usd_multiplier end,
  es_rmb_multiplier=case when v_product='ES' and v_currency='RMB' then p_multiplier else s.es_rmb_multiplier end,
  iso_usd_multiplier=case when v_product='ISO' and v_currency='USD' then p_multiplier else s.iso_usd_multiplier end,
  iso_rmb_multiplier=case when v_product='ISO' and v_currency='RMB' then p_multiplier else s.iso_rmb_multiplier end,
  gws_usd_multiplier=case when v_product='GWS' and v_currency='USD' then p_multiplier else s.gws_usd_multiplier end,
  gws_rmb_multiplier=case when v_product='GWS' and v_currency='RMB' then p_multiplier else s.gws_rmb_multiplier end,
  keyplc_usd_multiplier=case when v_product='KEYPLC' and v_currency='USD' then p_multiplier else s.keyplc_usd_multiplier end,
  keyplc_rmb_multiplier=case when v_product='KEYPLC' and v_currency='RMB' then p_multiplier else s.keyplc_rmb_multiplier end,
  manifold_usd_multiplier=case when v_product='MANIFOLD' and v_currency='USD' then p_multiplier else s.manifold_usd_multiplier end,
  manifold_rmb_multiplier=case when v_product='MANIFOLD' and v_currency='RMB' then p_multiplier else s.manifold_rmb_multiplier end
 where s.id='default';
 if not found then raise exception 'KeySuite application settings were not found.'; end if;
 return query select v_product,
  case v_product when 'CHC' then s.chc_usd_multiplier when 'ES' then s.es_usd_multiplier when 'ISO' then s.iso_usd_multiplier when 'GWS' then s.gws_usd_multiplier when 'KEYPLC' then s.keyplc_usd_multiplier else s.manifold_usd_multiplier end,
  case v_product when 'CHC' then s.chc_rmb_multiplier when 'ES' then s.es_rmb_multiplier when 'ISO' then s.iso_rmb_multiplier when 'GWS' then s.gws_rmb_multiplier when 'KEYPLC' then s.keyplc_rmb_multiplier else s.manifold_rmb_multiplier end
 from public.ks_app_settings s where s.id='default';
end $$;
revoke all on function public.keysuite_save_product_pricelist_multiplier_v119(text,text,numeric) from public,anon;
grant execute on function public.keysuite_save_product_pricelist_multiplier_v119(text,text,numeric) to authenticated,service_role;

create or replace function public.keysuite_save_category_v50012(p_category_id text,p_product_code text,p_rule jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower(auth.jwt()->>'email') and coalesce(ua.active,true)=true and lower(coalesce(ua.role,''))='owner') then raise exception 'Owner access required'; end if;
 if p_product_code is null or p_product_code not in ('ES','ISO') then raise exception 'Unsupported product'; end if;
 if jsonb_typeof(p_rule) is distinct from 'object' or jsonb_typeof(p_rule->'currencies') is distinct from 'array' or exists(select 1 from jsonb_array_elements_text(p_rule->'currencies') c where c not in ('USD','RMB','MYR')) then raise exception 'Invalid currency selection'; end if;
 if not (p_rule ?& array['margin','normal','rare','trimming','transport']) or exists(select 1 from jsonb_each(p_rule) e where e.key in ('margin','normal','rare','trimming','transport') and jsonb_typeof(e.value)<>'number') then raise exception 'Pricing values must be numbers'; end if;
 if (p_rule->>'margin')::numeric<0 or (p_rule->>'margin')::numeric>=1 or (p_rule->>'normal')::numeric<0 or (p_rule->>'normal')::numeric>=1 or (p_rule->>'rare')::numeric<0 or (p_rule->>'rare')::numeric>=1 then raise exception 'Invalid percentage'; end if;
 if (p_rule->>'trimming')::numeric<0 or (p_rule->>'transport')::numeric<0 then raise exception 'Trimming and Transport must be zero or more'; end if;
 update public.ks_pricing_categories
 set product_rules=jsonb_set(coalesce(product_rules,'{}'::jsonb),array[p_product_code],p_rule,true)
 where id=p_category_id;
 if not found then raise exception 'Category not found or not editable'; end if;
end $$;
revoke all on function public.keysuite_save_category_v50012(text,text,jsonb) from public,anon;
grant execute on function public.keysuite_save_category_v50012(text,text,jsonb) to authenticated;

create or replace function public.keysuite_save_cr_mechanical_seal_group_v50012(p_group_code text,p_sic_sic_myr numeric,p_tuc_tic_myr numeric)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_group text:=upper(trim(coalesce(p_group_code,'')));v_label text;
begin
 if not exists(select 1 from public.ks_user_access ua where lower(coalesce(ua.email,''))=v_email and lower(coalesce(ua.role,''))='owner' and coalesce(ua.active,true)=true) then raise exception 'Owner permission is required to change CR Mechanical Seal Add-On values.'; end if;
 v_label:=case v_group when '1_5' then 'CR 1 to CR 5' when '8_20' then 'CR 8 to CR 20' when '32_90' then 'CR 32 to CR 90' when '120_200' then 'CR 120to 200' when '320' then 'CR 320' else null end;
 if v_label is null then raise exception 'Unsupported CR pump size group.'; end if;
 if p_sic_sic_myr is null or p_sic_sic_myr<0 or p_tuc_tic_myr is null or p_tuc_tic_myr<0 then raise exception 'Mechanical Seal Add-On values must be zero or above.'; end if;
 insert into public.ks_cr_mechanical_seal_addons(seal_code,seal_label,group_code,group_label,amount_myr,updated_at,updated_by)
 values ('SIC_SIC','Sic / Sic',v_group,v_label,p_sic_sic_myr,now(),v_email),('TUC_TIC','TuC / Tic',v_group,v_label,p_tuc_tic_myr,now(),v_email)
 on conflict(seal_code,group_code) do update set seal_label=excluded.seal_label,group_label=excluded.group_label,amount_myr=excluded.amount_myr,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end $$;
revoke all on function public.keysuite_save_cr_mechanical_seal_group_v50012(text,numeric,numeric) from public,anon;
grant execute on function public.keysuite_save_cr_mechanical_seal_group_v50012(text,numeric,numeric) to authenticated;
commit;
