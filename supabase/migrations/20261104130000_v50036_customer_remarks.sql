-- Additive, append-only customer history. Existing customer RLS determines visibility.
create table if not exists public.ks_customer_remarks_v50036 (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.ks_customers(id),
 author_id uuid not null default auth.uid(),
 author_email text not null default (auth.jwt()->>'email'),
 body text not null check (length(trim(body)) between 1 and 10000),
 created_at timestamptz not null default now()
);
create index if not exists ks_customer_remarks_customer_created_idx on public.ks_customer_remarks_v50036(customer_id,created_at,id);
alter table public.ks_customer_remarks_v50036 enable row level security;
revoke all on public.ks_customer_remarks_v50036 from public,anon,authenticated;
grant select on public.ks_customer_remarks_v50036 to authenticated;
grant insert(customer_id,body) on public.ks_customer_remarks_v50036 to authenticated;
drop policy if exists remarks_read on public.ks_customer_remarks_v50036;
create policy remarks_read on public.ks_customer_remarks_v50036 for select to authenticated using (exists(select 1 from public.ks_customers c where c.id=customer_id));
drop policy if exists remarks_add on public.ks_customer_remarks_v50036;
create policy remarks_add on public.ks_customer_remarks_v50036 for insert to authenticated with check(author_id=(select auth.uid()) and author_email=(select auth.jwt()->>'email') and exists(select 1 from public.ks_customers c where c.id=customer_id));
-- No UPDATE/DELETE grants: immutable history avoids concurrent edits and spoofed authors/times.
