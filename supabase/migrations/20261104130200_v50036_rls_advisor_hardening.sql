-- Preserve V5.00.36 access semantics while avoiding redundant policy work.
-- Remark authors and timestamps cannot be supplied by authenticated clients:
-- only customer_id and body have INSERT privileges.
drop policy if exists remarks_add on public.ks_customer_remarks_v50036;
create policy remarks_add
on public.ks_customer_remarks_v50036
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ks_customers c
    where c.id = customer_id
  )
);

-- Avoid making the owner write policy a second permissive SELECT policy.
drop policy if exists bsw_prices_owner on public.ks_bsw_variant_prices_v50036;
drop policy if exists bsw_prices_owner_insert on public.ks_bsw_variant_prices_v50036;
drop policy if exists bsw_prices_owner_update on public.ks_bsw_variant_prices_v50036;

create policy bsw_prices_owner_insert
on public.ks_bsw_variant_prices_v50036
for insert
to authenticated
with check (
  (select public.keysuite_has_access())
  and exists (
    select 1
    from public.ks_user_access u
    where lower(u.email) = (select public.keysuite_current_email())
      and lower(u.role) = 'owner'
      and coalesce(u.active, true)
  )
);

create policy bsw_prices_owner_update
on public.ks_bsw_variant_prices_v50036
for update
to authenticated
using (
  (select public.keysuite_has_access())
  and exists (
    select 1
    from public.ks_user_access u
    where lower(u.email) = (select public.keysuite_current_email())
      and lower(u.role) = 'owner'
      and coalesce(u.active, true)
  )
)
with check (
  (select public.keysuite_has_access())
  and exists (
    select 1
    from public.ks_user_access u
    where lower(u.email) = (select public.keysuite_current_email())
      and lower(u.role) = 'owner'
      and coalesce(u.active, true)
  )
);
