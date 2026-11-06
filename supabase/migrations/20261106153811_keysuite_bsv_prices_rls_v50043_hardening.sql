drop policy if exists bsv_prices_owner_v50043 on public.ks_bsv_variant_prices_v50043;
drop policy if exists bsv_prices_owner_insert_v50043 on public.ks_bsv_variant_prices_v50043;
drop policy if exists bsv_prices_owner_update_v50043 on public.ks_bsv_variant_prices_v50043;
create policy bsv_prices_owner_insert_v50043 on public.ks_bsv_variant_prices_v50043 for insert to authenticated
with check ((select public.keysuite_has_access()) and exists (select 1 from public.ks_user_access u where lower(u.email)=public.keysuite_current_email() and lower(u.role)='owner' and coalesce(u.active,true)));
create policy bsv_prices_owner_update_v50043 on public.ks_bsv_variant_prices_v50043 for update to authenticated
using ((select public.keysuite_has_access()) and exists (select 1 from public.ks_user_access u where lower(u.email)=public.keysuite_current_email() and lower(u.role)='owner' and coalesce(u.active,true)))
with check ((select public.keysuite_has_access()) and exists (select 1 from public.ks_user_access u where lower(u.email)=public.keysuite_current_email() and lower(u.role)='owner' and coalesce(u.active,true)));
