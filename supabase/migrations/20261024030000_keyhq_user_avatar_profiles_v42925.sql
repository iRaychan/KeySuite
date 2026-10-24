-- V4.29.25. Additive appearance storage only. Review/apply separately; no auth/role/desk updates.
begin;
create schema if not exists keyhq_private_v42925;
revoke all on schema keyhq_private_v42925 from public, anon;
grant usage on schema keyhq_private_v42925 to authenticated;
-- This bounded helper needs privileged reads because existing membership is email-based
-- and auth.users is private. Identity comes from auth.uid(), never editable metadata/JWT email.
create or replace function keyhq_private_v42925.is_member(p_company_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and exists (
 select 1 from auth.users u join public.ks_user_access a on lower(a.email)=lower(u.email)
 where u.id=(select auth.uid()) and a.company_id=p_company_id and a.active=true
) $$;
revoke all on function keyhq_private_v42925.is_member(text) from public,anon;
grant execute on function keyhq_private_v42925.is_member(text) to authenticated;
create table if not exists public.ks_keyhq_avatar_profiles_v42925 (
 company_id text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 appearance jsonb not null,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(company_id,user_id),
 constraint keyhq_avatar_appearance_v42925 check (
 jsonb_typeof(appearance)='object' and
 appearance ?& array['gender','face','body','hair','hairColor','skin','outfit','shoes','accessory'] and
 appearance - array['gender','face','body','hair','hairColor','skin','outfit','shoes','accessory'] = '{}'::jsonb and
 appearance->>'gender' in ('female','male','nonbinary') and
 appearance->>'face' in ('soft','defined','round') and
 appearance->>'body' in ('slim','average','broad') and
 appearance->>'hair' in ('short','bob','long','curly','bald') and
 appearance->>'hairColor' ~ '^#[0-9a-fA-F]{6}$' and
 appearance->>'skin' ~ '^#[0-9a-fA-F]{6}$' and
 appearance->>'outfit' in ('business','smart-casual','casual','sport','keylargo') and
 appearance->>'shoes' in ('black','brown','white') and
 appearance->>'accessory' in ('none','glasses') and
 not jsonb_path_exists(appearance,'$.* ? (@ == null)')
 )
);
alter table public.ks_keyhq_avatar_profiles_v42925 enable row level security;
revoke all on public.ks_keyhq_avatar_profiles_v42925 from public,anon,authenticated;
grant select on public.ks_keyhq_avatar_profiles_v42925 to authenticated;
grant insert(company_id,user_id,appearance), update(appearance) on public.ks_keyhq_avatar_profiles_v42925 to authenticated;
drop policy if exists avatar_company_read on public.ks_keyhq_avatar_profiles_v42925;
create policy avatar_company_read on public.ks_keyhq_avatar_profiles_v42925 for select to authenticated
 using(keyhq_private_v42925.is_member(company_id));
drop policy if exists avatar_self_insert on public.ks_keyhq_avatar_profiles_v42925;
create policy avatar_self_insert on public.ks_keyhq_avatar_profiles_v42925 for insert to authenticated
 with check(user_id=(select auth.uid()) and keyhq_private_v42925.is_member(company_id));
drop policy if exists avatar_self_update on public.ks_keyhq_avatar_profiles_v42925;
create policy avatar_self_update on public.ks_keyhq_avatar_profiles_v42925 for update to authenticated
 using(user_id=(select auth.uid()) and keyhq_private_v42925.is_member(company_id))
 with check(user_id=(select auth.uid()) and keyhq_private_v42925.is_member(company_id));
create or replace function keyhq_private_v42925.touch_profile()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at:=clock_timestamp();new.revision:=old.revision+1;return new;end $$;
revoke all on function keyhq_private_v42925.touch_profile() from public,anon,authenticated;
drop trigger if exists keyhq_avatar_touch on public.ks_keyhq_avatar_profiles_v42925;
create trigger keyhq_avatar_touch before update on public.ks_keyhq_avatar_profiles_v42925
 for each row execute function keyhq_private_v42925.touch_profile();
-- Bounded, read-only directory: only enabled users in the caller's existing company.
create or replace function public.keysuite_keyhq_avatar_directory_v42925(p_company_id text)
returns table(user_id uuid,email text,appearance jsonb,revision bigint,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
 select u.id,lower(a.email),p.appearance,p.revision,p.updated_at
 from public.ks_user_access a join auth.users u on lower(u.email)=lower(a.email)
 left join public.ks_keyhq_avatar_profiles_v42925 p on p.company_id=a.company_id and p.user_id=u.id
 where a.company_id=p_company_id and a.active=true and keyhq_private_v42925.is_member(p_company_id)
$$;
revoke all on function public.keysuite_keyhq_avatar_directory_v42925(text) from public,anon;
grant execute on function public.keysuite_keyhq_avatar_directory_v42925(text) to authenticated;
-- SECURITY INVOKER: all writes pass the table's self-only RLS and column grants.
create or replace function public.keysuite_save_my_avatar_v42925(p_company_id text,p_appearance jsonb)
returns setof public.ks_keyhq_avatar_profiles_v42925
language sql volatile security invoker set search_path='' as $$
 insert into public.ks_keyhq_avatar_profiles_v42925(company_id,user_id,appearance)
 values(p_company_id,(select auth.uid()),p_appearance)
 on conflict(company_id,user_id) do update set appearance=excluded.appearance
 returning *;
$$;
revoke all on function public.keysuite_save_my_avatar_v42925(text,jsonb) from public,anon;
grant execute on function public.keysuite_save_my_avatar_v42925(text,jsonb) to authenticated;
-- Preserve legacy choices when available; invited accounts are linked only after auth registration.
do $$ begin
 if to_regclass('public.ks_keyhq_people_v42922') is not null then
  insert into public.ks_keyhq_avatar_profiles_v42925(company_id,user_id,appearance)
  select s.company_id,u.id,jsonb_build_object(
   'gender',coalesce(to_jsonb(s)->>'avatar_gender','female'),
   'face',coalesce(to_jsonb(s)->>'avatar_facial_features','soft'),
   'body',coalesce(to_jsonb(s)->>'avatar_body_shape','average'),
   'hair',coalesce(to_jsonb(s)->>'avatar_hair_style','short'),
   'hairColor',coalesce(to_jsonb(s)->>'avatar_hair_color','#211a18'),
   'skin',coalesce(to_jsonb(s)->>'avatar_skin_tone','#e3ad82'),
   'outfit',coalesce(to_jsonb(s)->>'avatar_clothing','business'),
   'shoes','black','accessory',case when coalesce(to_jsonb(s)->>'avatar_glasses','none')='none' then 'none' else 'glasses' end)
  from public.ks_keyhq_people_v42922 s join auth.users u on lower(u.email)=s.user_email
  where exists(select 1 from public.ks_user_access a where lower(a.email)=lower(u.email) and a.company_id=s.company_id and a.active=true)
  on conflict(company_id,user_id) do nothing;
 end if;
end $$;
-- Appearance events only; no motion telemetry or permission data is published.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and
 not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ks_keyhq_avatar_profiles_v42925') then
  alter publication supabase_realtime add table public.ks_keyhq_avatar_profiles_v42925;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
