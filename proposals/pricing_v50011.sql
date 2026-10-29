-- REVIEW ONLY. This proposal has not been applied to the connected database.
-- Existing quotations, categories, prices and exchange rates are not seeded or overwritten.
begin;
create table if not exists public.ks_component_prices_v50011 (
 family text not null check(family in ('ES','ISO','CHC','CR')),
 kind text not null check(kind in ('seal','oring')),
 size_group text not null,
 material text not null,
 price_myr numeric(12,2) check(price_myr>=0),
 primary key(family,kind,size_group,material),
 check((family in ('ES','ISO') and size_group in ('24','32','45','55') and ((kind='seal' and material in ('Car/Cer','SiC/SiC')) or (kind='oring' and material in ('Viton','EPDM')))) or (family in ('CHC','CR') and kind='oring' and material in ('Viton','EPDM') and (size_group in ('1_5','8_20','32_90','120_200') or (family='CR' and size_group='320'))))
);
create table if not exists public.ks_iso_price_overrides_v50011 (
 product_id text not null,material text not null,
 price_usd numeric(12,2) check(price_usd>=0),
 price_rmb numeric(12,2) check(price_rmb>=0),
 price_myr numeric(12,2) check(price_myr>=0),
 rarity text not null default 'many' check(rarity in ('many','common','rare','fixed')),
 primary key(product_id,material)
);
alter table public.ks_component_prices_v50011 enable row level security;
alter table public.ks_iso_price_overrides_v50011 enable row level security;
revoke all on public.ks_component_prices_v50011,public.ks_iso_price_overrides_v50011 from public,anon,authenticated;
grant select,insert,update on public.ks_component_prices_v50011,public.ks_iso_price_overrides_v50011 to authenticated;
-- Existing ks_user_access is the authoritative access list. No user-editable metadata.
create policy component_read_v50011 on public.ks_component_prices_v50011 for select to authenticated using ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true));
create policy component_insert_v50011 on public.ks_component_prices_v50011 for insert to authenticated with check ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true and ua.role='owner'));
create policy component_update_v50011 on public.ks_component_prices_v50011 for update to authenticated using ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true and ua.role='owner')) with check ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true and ua.role='owner'));
create policy iso_read_v50011 on public.ks_iso_price_overrides_v50011 for select to authenticated using ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true));
create policy iso_insert_v50011 on public.ks_iso_price_overrides_v50011 for insert to authenticated with check ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true and ua.role='owner'));
create policy iso_update_v50011 on public.ks_iso_price_overrides_v50011 for update to authenticated using ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true and ua.role='owner')) with check ((select auth.uid()) is not null and exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower((select auth.jwt()->>'email')) and ua.active=true and ua.role='owner'));
-- Invoker preserves existing category UPDATE policies as well as this explicit owner gate.
create or replace function public.keysuite_save_category_v50011(p_category_id text,p_product_code text,p_rule jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.ks_user_access ua where lower(ua.email)=lower(auth.jwt()->>'email') and ua.active=true and ua.role='owner') then raise exception 'Owner access required'; end if;
 if p_product_code is null or p_product_code not in ('ISO','CR','BGF') then raise exception 'Unsupported product'; end if;
 if jsonb_typeof(p_rule) is distinct from 'object' or jsonb_typeof(p_rule->'currencies') is distinct from 'array' or exists(select 1 from jsonb_array_elements_text(p_rule->'currencies') c where c not in ('USD','RMB','MYR')) then raise exception 'Invalid currency selection';end if;
 if not (p_rule ?& array['margin','normal','rare','transport']) or exists(select 1 from jsonb_each(p_rule) e where e.key in ('margin','normal','rare','transport') and jsonb_typeof(e.value)<>'number') then raise exception 'Pricing values must be numbers';end if;
 if (p_rule->>'normal')::numeric<0 or (p_rule->>'normal')::numeric>=1 or (p_rule->>'rare')::numeric<0 or (p_rule->>'rare')::numeric>=1 then raise exception 'Invalid normal or rare percentage';end if;
 if (p_rule->>'margin')::numeric<0 or (p_rule->>'margin')::numeric>=1 or (p_rule->>'transport')::numeric<0 then raise exception 'Invalid margin or transport';end if;
 update public.ks_pricing_categories set product_rules=jsonb_set(coalesce(product_rules,'{}'),array[p_product_code],p_rule,true) where id=p_category_id;
 if not found then raise exception 'Category not found or not editable';end if;
end $$;
revoke all on function public.keysuite_save_category_v50011(text,text,jsonb) from public,anon;
grant execute on function public.keysuite_save_category_v50011(text,text,jsonb) to authenticated;
commit;
