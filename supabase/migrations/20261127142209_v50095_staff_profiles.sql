-- Staging only. Staff profile management has no customer or quotation side effects.
begin;

create schema keysuite_staff;
revoke all on schema keysuite_staff from public, anon, authenticated;
grant usage on schema keysuite_staff to authenticated;

create table keysuite_staff.profiles (
  id uuid primary key default gen_random_uuid(),
  company_id text not null check (company_id <> ''),
  user_id uuid not null references auth.users(id),
  staff_name text not null check (length(btrim(staff_name)) between 1 and 120),
  category_id text not null references public.ks_pricing_categories(id),
  commission numeric not null check (commission >= 0 and commission < 1),
  set_discount numeric not null check (set_discount >= 0 and set_discount < 1),
  final_discount numeric not null check (final_discount >= 0 and final_discount < 1),
  fuel_charge_rm numeric check (fuel_charge_rm >= 0 and fuel_charge_rm < 'Infinity'::numeric),
  brand_margins jsonb not null default '{}' check (jsonb_typeof(brand_margins) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index staff_profiles_user_idx on keysuite_staff.profiles (user_id);
create index staff_profiles_category_idx on keysuite_staff.profiles (category_id);

create table keysuite_staff.profile_audit (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  profile_id uuid not null,
  actor_id uuid not null,
  action text not null check (action in ('add', 'edit', 'delete')),
  previous_profile jsonb,
  current_profile jsonb,
  recorded_at timestamptz not null default now()
);
create index staff_audit_profile_idx on keysuite_staff.profile_audit (company_id, profile_id, recorded_at);
alter table keysuite_staff.profiles enable row level security;
alter table keysuite_staff.profile_audit enable row level security;
revoke all on all tables in schema keysuite_staff from public, anon, authenticated;

create function keysuite_staff.manage_profile(
  p_action text, p_id uuid, p_revision bigint, p_profile jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  tenant text := public.keysuite_current_company_id();
  actor uuid := auth.uid();
  required_permission text;
  profile_user uuid;
  profile_name text;
  profile_category text;
  previous keysuite_staff.profiles;
  changed keysuite_staff.profiles;
  margins jsonb;
begin
  if actor is null or coalesce(tenant, '') = ''
     or not exists (
       select 1 from auth.users u
       where u.id = actor and u.deleted_at is null
         and lower(u.email) = lower(auth.jwt()->>'email')
     )
     or public.keysuite_role_permission_v40407('view_staff') is distinct from 'full'
  then
    raise exception 'Staff access denied' using errcode = '42501';
  end if;

  if p_action = 'list' then
    return jsonb_build_object(
      'profiles', coalesce((
        select jsonb_agg(to_jsonb(p) - 'company_id' order by p.staff_name, p.id)
        from keysuite_staff.profiles p where p.company_id = tenant
      ), '[]'::jsonb),
      'users', coalesce((
        select jsonb_agg(jsonb_build_object('id', u.id, 'name', a.display_name, 'email', u.email) order by a.display_name, u.email)
        from auth.users u join public.ks_user_access a on lower(a.email) = lower(u.email)
        where a.company_id = tenant and a.active is true and u.deleted_at is null
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.category_name, 'active', c.is_active is distinct from false) order by c.category_name)
        from public.ks_pricing_categories c
        where c.is_active is distinct from false or exists (
          select 1 from keysuite_staff.profiles p where p.company_id = tenant and p.category_id = c.id
        )
      ), '[]'::jsonb),
      'brands', coalesce((
        select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.brand_name, 'active', b.active is distinct from false) order by b.brand_name)
        from public.ks_oem_brands b where b.company_id = tenant
      ), '[]'::jsonb)
    );
  end if;

  required_permission := case p_action when 'add' then 'add_staff'
    when 'edit' then 'edit_staff' when 'delete' then 'delete_staff' end;
  if required_permission is null
     or public.keysuite_role_permission_v40407(required_permission) is distinct from 'full' then
    raise exception 'Staff action denied' using errcode = '42501';
  end if;

  if p_action <> 'add' then
    select * into previous from keysuite_staff.profiles
    where id = p_id and company_id = tenant for update;
    if not found then
      raise exception 'Staff profile unavailable' using errcode = '42501';
    end if;
    if previous.revision is distinct from p_revision then
      raise exception 'Staff profile changed. Reopen it before saving.' using errcode = '40001';
    end if;
  end if;

  if p_action = 'delete' then
    delete from keysuite_staff.profiles where id = previous.id and company_id = tenant;
  else
    if jsonb_typeof(p_profile) is distinct from 'object' then raise exception 'Staff details are required'; end if;
    profile_user := (p_profile->>'user_id')::uuid;
    profile_name := btrim(p_profile->>'staff_name');
    profile_category := p_profile->>'category_id';
    margins := coalesce(p_profile->'brand_margins', '{}'::jsonb);

    if profile_user is null or not exists (
      select 1 from auth.users u join public.ks_user_access a on lower(a.email) = lower(u.email)
      where u.id = profile_user and a.company_id = tenant and a.active is true and u.deleted_at is null
    ) then raise exception 'Choose an active KeySuite account in this company'; end if;
    if not exists (
      select 1 from public.ks_pricing_categories c
      where c.id = profile_category and (c.is_active is distinct from false or c.id = previous.category_id)
    ) then raise exception 'Choose an available pricing category'; end if;

    if jsonb_typeof(margins) is distinct from 'object' then raise exception 'Brand margins must be an object'; end if;
    if exists (
      select 1 from jsonb_each(margins) m
      where not exists (select 1 from public.ks_oem_brands b where b.id::text = m.key and b.company_id = tenant)
        or case when jsonb_typeof(m.value) = 'number' then (m.value::numeric < 0 or m.value::numeric >= 1) else true end
    ) then raise exception 'Use company brands and margins from 0%% to below 100%%'; end if;

    if p_action = 'add' then
      insert into keysuite_staff.profiles
        (company_id, user_id, staff_name, category_id, commission, set_discount, final_discount, fuel_charge_rm, brand_margins)
      values (tenant, profile_user, profile_name, profile_category, (p_profile->>'commission')::numeric,
        (p_profile->>'set_discount')::numeric, (p_profile->>'final_discount')::numeric,
        (p_profile->>'fuel_charge_rm')::numeric, margins)
      returning * into changed;
    else
      update keysuite_staff.profiles
      set user_id = profile_user, staff_name = profile_name, category_id = profile_category,
        commission = (p_profile->>'commission')::numeric, set_discount = (p_profile->>'set_discount')::numeric,
        final_discount = (p_profile->>'final_discount')::numeric, fuel_charge_rm = (p_profile->>'fuel_charge_rm')::numeric,
        brand_margins = margins, revision = revision + 1, updated_at = now()
      where id = previous.id and company_id = tenant
      returning * into changed;
    end if;
  end if;

  insert into keysuite_staff.profile_audit (company_id, profile_id, actor_id, action, previous_profile, current_profile)
  values (tenant, coalesce(changed.id, previous.id), actor, p_action,
    case when previous.id is not null then to_jsonb(previous) end,
    case when changed.id is not null then to_jsonb(changed) end);
  return jsonb_build_object('id', coalesce(changed.id, previous.id), 'revision', changed.revision);
exception when unique_violation then
  raise exception 'This account already has a Staff profile in this company' using errcode = '23505';
end
$$;
revoke all on function keysuite_staff.manage_profile(text, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function keysuite_staff.manage_profile(text, uuid, bigint, jsonb) to authenticated;

create function public.keysuite_staff_profiles_v50095(
  p_action text, p_id uuid default null, p_revision bigint default null, p_profile jsonb default null
) returns jsonb
language sql security invoker set search_path = ''
as $$ select keysuite_staff.manage_profile(p_action, p_id, p_revision, p_profile) $$;
revoke all on function public.keysuite_staff_profiles_v50095(text, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.keysuite_staff_profiles_v50095(text, uuid, bigint, jsonb) to authenticated;
commit;
