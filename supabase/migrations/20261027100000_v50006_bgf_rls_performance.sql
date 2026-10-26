-- KeySuite V5.00.06: cache auth.jwt() once per statement in BGF RLS predicates.
-- This preserves the deployed access rules while avoiding per-row JWT evaluation.

drop policy if exists bgf_active_staff_read_v50006 on public.ks_products_bgf;
create policy bgf_active_staff_read_v50006 on public.ks_products_bgf for select to authenticated
using (
  exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=lower(coalesce((select auth.jwt())->>'email',''))
      and coalesce(ua.active,true)=true
  )
);

drop policy if exists bgf_owner_update_v50006 on public.ks_products_bgf;
create policy bgf_owner_update_v50006 on public.ks_products_bgf for update to authenticated
using (
  exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=lower(coalesce((select auth.jwt())->>'email',''))
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  )
)
with check (
  exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=lower(coalesce((select auth.jwt())->>'email',''))
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  )
);
