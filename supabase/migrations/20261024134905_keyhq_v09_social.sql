-- Additive KeyHQ V0.9. Requires the V4.29.25 avatar migration.
begin;
create schema if not exists keyhq_private_v09;
revoke all on schema keyhq_private_v09 from public,anon;
grant usage on schema keyhq_private_v09 to authenticated;
-- Privileged membership lookup is bounded to the authenticated caller's company.
create or replace function keyhq_private_v09.member(c text,u uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select keyhq_private_v42925.is_member(c) and exists(select 1 from auth.users x join public.ks_user_access a on lower(a.email)=lower(x.email) where x.id=u and a.company_id=c and a.active=true)
$$;
revoke all on function keyhq_private_v09.member(text,uuid) from public,anon;
grant execute on function keyhq_private_v09.member(text,uuid) to authenticated;
create table if not exists public.ks_keyhq_messages_v09(
 id uuid primary key default gen_random_uuid(), company_id text not null,
 sender_id uuid not null default auth.uid() references auth.users(id), recipient_id uuid not null references auth.users(id),
 nonce uuid not null,body text not null check(length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),read_at timestamptz,
 unique(sender_id,nonce),check(sender_id<>recipient_id)
);
create index if not exists keyhq_messages_recipient on public.ks_keyhq_messages_v09(company_id,recipient_id,created_at desc);
create index if not exists keyhq_messages_sender on public.ks_keyhq_messages_v09(company_id,sender_id,created_at desc);
alter table public.ks_keyhq_messages_v09 enable row level security;
revoke all on public.ks_keyhq_messages_v09 from public,anon,authenticated;
grant select on public.ks_keyhq_messages_v09 to authenticated;
grant insert(company_id,recipient_id,nonce,body),update(read_at) on public.ks_keyhq_messages_v09 to authenticated;
create policy private_conversation on public.ks_keyhq_messages_v09 for select to authenticated using((sender_id=(select auth.uid()) or recipient_id=(select auth.uid())) and keyhq_private_v42925.is_member(company_id));
create policy send_as_self on public.ks_keyhq_messages_v09 for insert to authenticated with check(sender_id=(select auth.uid()) and keyhq_private_v09.member(company_id,recipient_id));
create policy recipient_receipt on public.ks_keyhq_messages_v09 for update to authenticated using(recipient_id=(select auth.uid()) and keyhq_private_v42925.is_member(company_id)) with check(recipient_id=(select auth.uid()) and keyhq_private_v42925.is_member(company_id));
create function keyhq_private_v09.receipt() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.read_at=coalesce(old.read_at,clock_timestamp());return new;end $$;
revoke all on function keyhq_private_v09.receipt() from public,anon,authenticated;
create trigger keyhq_receipt before update on public.ks_keyhq_messages_v09 for each row execute function keyhq_private_v09.receipt();
-- Each authenticated browser gets a lease. Closing one browser cannot log out another.
create table if not exists public.ks_keyhq_presence_v09(company_id text not null,user_id uuid not null references auth.users(id),session_id uuid not null,expires_at timestamptz not null,primary key(company_id,user_id,session_id));
alter table public.ks_keyhq_presence_v09 enable row level security;
revoke all on public.ks_keyhq_presence_v09 from public,anon,authenticated;
grant select on public.ks_keyhq_presence_v09 to authenticated;
create policy company_presence on public.ks_keyhq_presence_v09 for select to authenticated using(keyhq_private_v42925.is_member(company_id));
create function keyhq_private_v09.presence(c text,s uuid,leave_session boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not keyhq_private_v42925.is_member(c) or auth.uid() is null then raise exception 'Enabled employee account required';end if;
 if leave_session then delete from public.ks_keyhq_presence_v09 where company_id=c and user_id=auth.uid() and session_id=s;
 else
 if not exists(select 1 from public.ks_keyhq_presence_v09 where company_id=c and user_id=auth.uid() and expires_at>now()) then
  -- A formerly offline invitee regains control on login; require fresh consent.
  update public.ks_keyhq_participants_v09 p set status='invited' from public.ks_keyhq_sessions_v09 activity where activity.id=p.session_id and activity.company_id=c and activity.host_id<>auth.uid() and activity.status in('waiting','playing') and p.user_id=auth.uid() and p.status in('accepted','arrived');
  update public.ks_keyhq_sessions_v09 activity set status='waiting',started_at=null where activity.company_id=c and activity.status='playing' and exists(select 1 from public.ks_keyhq_participants_v09 p where p.session_id=activity.id and p.user_id=auth.uid() and p.status='invited');
 end if;
 insert into public.ks_keyhq_presence_v09 values(c,auth.uid(),s,now()+interval '150 seconds') on conflict(company_id,user_id,session_id) do update set expires_at=excluded.expires_at;end if;
 delete from public.ks_keyhq_presence_v09 where company_id=c and expires_at<now()-interval '1 day';
end $$;
revoke all on function keyhq_private_v09.presence(text,uuid,boolean) from public,anon;
grant execute on function keyhq_private_v09.presence(text,uuid,boolean) to authenticated;
create function public.keysuite_keyhq_presence_v09(p_company text,p_session uuid,p_leave boolean default false) returns void language sql security invoker set search_path='' as $$ select keyhq_private_v09.presence(p_company,p_session,p_leave) $$;
revoke all on function public.keysuite_keyhq_presence_v09(text,uuid,boolean) from public,anon;
grant execute on function public.keysuite_keyhq_presence_v09(text,uuid,boolean) to authenticated;
create table if not exists public.ks_keyhq_sessions_v09(
 id uuid primary key default gen_random_uuid(),company_id text not null,host_id uuid not null references auth.users(id),activity text not null check(activity in('basketball','football','badminton','pickleball','tennis','swim','gym','coffee','smoking','rooftop','garden')),
 status text not null default 'waiting' check(status in('waiting','playing','ended')),created_at timestamptz not null default now(),started_at timestamptz,expires_at timestamptz not null default now()+interval '20 minutes'
);
create unique index if not exists one_court_reservation on public.ks_keyhq_sessions_v09(company_id,activity) where status in('waiting','playing');
create table if not exists public.ks_keyhq_participants_v09(
 session_id uuid not null references public.ks_keyhq_sessions_v09(id) on delete cascade,user_id uuid not null references auth.users(id),status text not null check(status in('invited','accepted','arrived','declined','left')),primary key(session_id,user_id)
);
alter table public.ks_keyhq_sessions_v09 enable row level security;
alter table public.ks_keyhq_participants_v09 enable row level security;
revoke all on public.ks_keyhq_sessions_v09,public.ks_keyhq_participants_v09 from public,anon,authenticated;
grant select on public.ks_keyhq_sessions_v09,public.ks_keyhq_participants_v09 to authenticated;
create policy company_sessions on public.ks_keyhq_sessions_v09 for select to authenticated using(keyhq_private_v42925.is_member(company_id));
create policy company_participants on public.ks_keyhq_participants_v09 for select to authenticated using(exists(select 1 from public.ks_keyhq_sessions_v09 s where s.id=session_id));
-- Serializes reservations and enforces consent on the server, not just in the UI.
create function keyhq_private_v09.social(c text,op text,sid uuid,activity_key text,invitees uuid[],target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); s public.ks_keyhq_sessions_v09; p public.ks_keyhq_participants_v09; u uuid; cap integer; minimum integer; result uuid;
begin
 if who is null or not keyhq_private_v42925.is_member(c) then raise exception 'Enabled employee account required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('keyhq-social:'||c));
 update public.ks_keyhq_sessions_v09 set status='ended' where company_id=c and expires_at<now();
 if op='create' then
  if activity_key not in('basketball','football','badminton','pickleball','tennis','swim','gym','coffee','smoking','rooftop','garden') then raise exception 'Unknown activity';end if;
  cap:=case when activity_key in('badminton','pickleball','tennis') then 2 when activity_key in('gym','smoking') then 3 when activity_key='garden' then 6 else 4 end;
  if cardinality(invitees)>cap-1 then raise exception 'Facility capacity exceeded';end if;
  for u in select distinct unnest(array_append(coalesce(invitees,'{}'),who)) loop
   if not keyhq_private_v09.member(c,u) then raise exception 'Invitee is not an enabled employee';end if;
   if exists(select 1 from public.ks_keyhq_participants_v09 occupied join public.ks_keyhq_sessions_v09 x on x.id=occupied.session_id where x.company_id=c and x.status in('waiting','playing') and occupied.user_id=u and occupied.status in('accepted','arrived')) then raise exception 'A participant is already in another activity';end if;
  end loop;
  insert into public.ks_keyhq_sessions_v09(company_id,host_id,activity) values(c,who,activity_key) returning id into result;
  for u in select distinct unnest(array_append(coalesce(invitees,'{}'),who)) loop
   insert into public.ks_keyhq_participants_v09 values(result,u,case when u=who or not exists(select 1 from public.ks_keyhq_presence_v09 where company_id=c and user_id=u and expires_at>now()) then 'accepted' else 'invited' end);
  end loop;return result;
 end if;
 select * into s from public.ks_keyhq_sessions_v09 where id=sid and company_id=c and status in('waiting','playing') for update;
 if not found then raise exception 'Activity ended or unavailable';end if;
 target:=coalesce(target,who);
 if op='invite' then
  if s.host_id<>who or target=who or not keyhq_private_v09.member(c,target) then raise exception 'Host and eligible invitee required';end if;
  cap:=case when s.activity in('badminton','pickleball','tennis') then 2 when s.activity in('gym','smoking') then 3 when s.activity='garden' then 6 else 4 end;
  if (select count(*) from public.ks_keyhq_participants_v09 where session_id=sid and status in('invited','accepted','arrived'))>=cap then raise exception 'Facility capacity exceeded';end if;
  if exists(select 1 from public.ks_keyhq_participants_v09 occupied join public.ks_keyhq_sessions_v09 x on x.id=occupied.session_id where x.company_id=c and x.status in('waiting','playing') and occupied.user_id=target and occupied.status in('accepted','arrived')) then raise exception 'Invitee is busy';end if;
  insert into public.ks_keyhq_participants_v09 values(sid,target,case when exists(select 1 from public.ks_keyhq_presence_v09 where company_id=c and user_id=target and expires_at>now()) then 'invited' else 'accepted' end)
  on conflict(session_id,user_id) do update set status=excluded.status;return sid;
 end if;
 select * into p from public.ks_keyhq_participants_v09 where session_id=sid and user_id=target;
 if not found then raise exception 'Not invited';end if;
 if op in('accept','decline','leave') then
  if target<>who then raise exception 'Only the invitee may respond';end if;
  if op in('accept','decline') and p.status<>'invited' then raise exception 'Invitation already answered';end if;
  if op='accept' and exists(select 1 from public.ks_keyhq_participants_v09 p2 join public.ks_keyhq_sessions_v09 x on x.id=p2.session_id where x.company_id=c and x.id<>sid and x.status in('waiting','playing') and p2.user_id=who and p2.status in('accepted','arrived')) then raise exception 'Leave your current activity first';end if;
  update public.ks_keyhq_participants_v09 set status=case op when 'accept' then 'accepted' when 'decline' then 'declined' else 'left' end where session_id=sid and user_id=who;
 elsif op='arrive' then
  if p.status not in('accepted','arrived') then raise exception 'Invitation must be accepted first';end if;
  if target<>who and (s.host_id<>who or exists(select 1 from public.ks_keyhq_presence_v09 where company_id=c and user_id=target and expires_at>now())) then raise exception 'Cannot move an online employee';end if;
  update public.ks_keyhq_participants_v09 set status='arrived' where session_id=sid and user_id=target;
 elsif op='end' then
  if s.host_id<>who then raise exception 'Only host may end activity';end if;
  update public.ks_keyhq_sessions_v09 set status='ended' where id=sid;return sid;
 else raise exception 'Unknown action';end if;
 minimum:=case when s.activity in('badminton','pickleball','tennis') then 2 else 1 end;
 if not exists(select 1 from public.ks_keyhq_participants_v09 where session_id=sid and status in('invited','accepted','arrived')) then update public.ks_keyhq_sessions_v09 set status='ended' where id=sid;
 elsif (select count(*) from public.ks_keyhq_participants_v09 where session_id=sid and status='arrived')>=minimum then update public.ks_keyhq_sessions_v09 set status='playing',started_at=coalesce(started_at,now()) where id=sid;
 else update public.ks_keyhq_sessions_v09 set status='waiting',started_at=null where id=sid;end if;
 return sid;
end $$;
revoke all on function keyhq_private_v09.social(text,text,uuid,text,uuid[],uuid) from public,anon;
grant execute on function keyhq_private_v09.social(text,text,uuid,text,uuid[],uuid) to authenticated;
create function public.keysuite_keyhq_social_v09(p_company text,p_action text,p_id uuid default null,p_activity text default null,p_invitees uuid[] default '{}',p_user uuid default null) returns uuid language sql security invoker set search_path='' as $$ select keyhq_private_v09.social(p_company,p_action,p_id,p_activity,p_invitees,p_user) $$;
revoke all on function public.keysuite_keyhq_social_v09(text,text,uuid,text,uuid[],uuid) from public,anon;
grant execute on function public.keysuite_keyhq_social_v09(text,text,uuid,text,uuid[],uuid) to authenticated;
-- Realtime only sends rows the subscribing account can SELECT through RLS.
do $$ declare t text;begin foreach t in array array['ks_keyhq_messages_v09','ks_keyhq_sessions_v09','ks_keyhq_participants_v09','ks_keyhq_presence_v09'] loop
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
end loop;end $$;
alter table public.ks_keyhq_avatar_profiles_v42925 drop constraint keyhq_avatar_appearance_v42925;
alter table public.ks_keyhq_avatar_profiles_v42925 add constraint keyhq_avatar_appearance_v42925 check (
 jsonb_typeof(appearance)='object' and
 appearance ?& array['gender','face','body','hair','hairColor','skin','outfit','shoes','accessory'] and
 appearance - array['eyeColor','outfitColor','facialHair','hat','earrings','watch','nose','ears','lips','brows','eyeSize','eyeSpacing','gender','face','body','hair','hairColor','skin','outfit','shoes','accessory'] = '{}'::jsonb and
 appearance->>'gender' in ('female','male','nonbinary') and
 appearance->>'face' in ('soft','defined','round') and
 appearance->>'body' in ('slim','average','broad') and
 appearance->>'hair' in ('short','bob','long','curly','bald','tied','bun','pigtails','mohawk','afro','side-part','fringe') and
 appearance->>'hairColor' ~ '^#[0-9a-fA-F]{6}$' and
 appearance->>'skin' ~ '^#[0-9a-fA-F]{6}$' and
 appearance->>'outfit' in ('business','smart-casual','casual','sport','keylargo','dress') and
 appearance->>'shoes' in ('black','brown','white') and
 appearance->>'accessory' in ('none','glasses','sunglasses') and
 (not appearance ? 'facialHair' or appearance->>'facialHair' in ('none','stubble','moustache','goatee','beard')) and (not appearance ? 'hat' or appearance->>'hat' in ('none','cap','beanie')) and (not appearance ? 'earrings' or appearance->>'earrings' in ('none','studs','hoops')) and (not appearance ? 'watch' or appearance->>'watch' in ('none','silver','gold')) and (not appearance ? 'nose' or appearance->>'nose' in ('small','medium','broad')) and (not appearance ? 'ears' or appearance->>'ears' in ('small','medium','large')) and (not appearance ? 'lips' or appearance->>'lips' in ('thin','medium','full')) and (not appearance ? 'brows' or appearance->>'brows' in ('soft','straight','arched')) and (not appearance ? 'eyeSize' or appearance->>'eyeSize' in ('small','medium','large')) and (not appearance ? 'eyeSpacing' or appearance->>'eyeSpacing' in ('close','medium','wide')) and (not appearance ? 'eyeColor' or appearance->>'eyeColor' ~ '^#[0-9a-fA-F]{6}$') and (not appearance ? 'outfitColor' or appearance->>'outfitColor' ~ '^#[0-9a-fA-F]{6}$') and
 not jsonb_path_exists(appearance,'$.* ? (@ == null)')
 );
notify pgrst,'reload schema';
commit;
