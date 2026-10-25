begin;
create schema if not exists keyhq_private_v010;
revoke all on schema keyhq_private_v010 from public,anon;
grant usage on schema keyhq_private_v010 to authenticated;
create table public.ks_keyhq_conversations_v010(id uuid primary key default gen_random_uuid(),company_id text not null,name text not null check(length(btrim(name)) between 1 and 80),owner_id uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.ks_keyhq_members_v010(conversation_id uuid not null references public.ks_keyhq_conversations_v010(id) on delete cascade,user_id uuid not null references auth.users(id),joined_at timestamptz not null default now(),last_read_at timestamptz,primary key(conversation_id,user_id));
create table public.ks_keyhq_group_messages_v010(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.ks_keyhq_conversations_v010(id) on delete cascade,sender_id uuid not null references auth.users(id),nonce uuid not null,body text not null check(length(btrim(body)) between 1 and 4000),created_at timestamptz not null default now(),unique(sender_id,nonce));
create index on public.ks_keyhq_group_messages_v010(conversation_id,created_at desc,id);
create index on public.ks_keyhq_members_v010(user_id,conversation_id);
alter table public.ks_keyhq_conversations_v010 enable row level security;
alter table public.ks_keyhq_members_v010 enable row level security;
alter table public.ks_keyhq_group_messages_v010 enable row level security;
revoke all on public.ks_keyhq_conversations_v010,public.ks_keyhq_members_v010,public.ks_keyhq_group_messages_v010 from public,anon,authenticated;
grant select on public.ks_keyhq_conversations_v010,public.ks_keyhq_members_v010,public.ks_keyhq_group_messages_v010 to authenticated;
create function keyhq_private_v010.participant(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ks_keyhq_members_v010 m join public.ks_keyhq_conversations_v010 c on c.id=m.conversation_id where c.id=cid and m.user_id=auth.uid() and keyhq_private_v42925.is_member(c.company_id))
$$;
revoke all on function keyhq_private_v010.participant(uuid) from public,anon;
grant execute on function keyhq_private_v010.participant(uuid) to authenticated;
create policy participants_only on public.ks_keyhq_conversations_v010 for select to authenticated using(keyhq_private_v010.participant(id));
create policy participants_only on public.ks_keyhq_members_v010 for select to authenticated using(keyhq_private_v010.participant(conversation_id));
create policy participants_only on public.ks_keyhq_group_messages_v010 for select to authenticated using(keyhq_private_v010.participant(conversation_id));
-- Mutation authority is checked under the conversation row lock. Direct writes are denied.
create function keyhq_private_v010.groups(c text,op text,cid uuid,title text,users uuid[],target uuid,body_text text,nonce_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); conversation public.ks_keyhq_conversations_v010; u uuid; result uuid; prior public.ks_keyhq_group_messages_v010;
begin
 if who is null or not keyhq_private_v42925.is_member(c) then raise exception 'Enabled employee required';end if;
 if op='create' then
  if cardinality(users)>99 then raise exception 'Maximum 100 group members';end if;
  insert into public.ks_keyhq_conversations_v010(company_id,name,owner_id) values(c,btrim(title),who) returning id into cid;
  for u in select distinct unnest(array_append(coalesce(users,'{}'),who)) loop
   if not keyhq_private_v09.member(c,u) then raise exception 'Enabled company employees only';end if;
   insert into public.ks_keyhq_members_v010(conversation_id,user_id) values(cid,u);
  end loop;return cid;
 end if;
 select * into conversation from public.ks_keyhq_conversations_v010 where id=cid and company_id=c for update;
 if not found or not keyhq_private_v010.participant(cid) then raise exception 'Conversation unavailable';end if;
 if op='send' then
  select * into prior from public.ks_keyhq_group_messages_v010 where sender_id=who and nonce=nonce_id;
  if found then if prior.conversation_id<>cid or prior.body<>btrim(body_text) then raise exception 'Retry identifier conflict';end if;return prior.id;end if;
  insert into public.ks_keyhq_group_messages_v010(conversation_id,sender_id,nonce,body) values(cid,who,nonce_id,btrim(body_text)) returning id into result;return result;
 elsif op='read' then update public.ks_keyhq_members_v010 set last_read_at=clock_timestamp() where conversation_id=cid and user_id=who;
 elsif op='leave' then
  if conversation.owner_id=who then raise exception 'Group administrator cannot leave their group';end if;
  delete from public.ks_keyhq_members_v010 where conversation_id=cid and user_id=who;
 elsif op in('add','remove','rename') then
  if conversation.owner_id<>who then raise exception 'Group administrator required';end if;
  if op='add' then
   if (select count(*) from public.ks_keyhq_members_v010 where conversation_id=cid)>=100 then raise exception 'Group is full';end if;
   if not keyhq_private_v09.member(c,target) then raise exception 'Enabled company employee required';end if;
   insert into public.ks_keyhq_members_v010(conversation_id,user_id) values(cid,target) on conflict do nothing;
  elsif op='remove' then
   if target=who then raise exception 'Cannot remove group administrator';end if;
   delete from public.ks_keyhq_members_v010 where conversation_id=cid and user_id=target;
  else update public.ks_keyhq_conversations_v010 set name=btrim(title) where id=cid;end if;
 else raise exception 'Unknown group action';end if;return cid;
end $$;
revoke all on function keyhq_private_v010.groups(text,text,uuid,text,uuid[],uuid,text,uuid) from public,anon;
grant execute on function keyhq_private_v010.groups(text,text,uuid,text,uuid[],uuid,text,uuid) to authenticated;
create function public.keysuite_keyhq_groups_v010(p_company text,p_action text,p_id uuid default null,p_name text default null,p_users uuid[] default '{}',p_user uuid default null,p_body text default null,p_nonce uuid default null) returns uuid language sql security invoker set search_path='' as $$ select keyhq_private_v010.groups(p_company,p_action,p_id,p_name,p_users,p_user,p_body,p_nonce) $$;
revoke all on function public.keysuite_keyhq_groups_v010(text,text,uuid,text,uuid[],uuid,text,uuid) from public,anon;
grant execute on function public.keysuite_keyhq_groups_v010(text,text,uuid,text,uuid[],uuid,text,uuid) to authenticated;
create function public.keysuite_keyhq_inbox_v010() returns table(id uuid,unread bigint) language sql stable security invoker set search_path='' as $$
 select c.id,count(msg.id) from public.ks_keyhq_conversations_v010 c join public.ks_keyhq_members_v010 me on me.conversation_id=c.id and me.user_id=auth.uid() left join public.ks_keyhq_group_messages_v010 msg on msg.conversation_id=c.id and msg.sender_id<>auth.uid() and (me.last_read_at is null or msg.created_at>me.last_read_at) group by c.id
$$;
revoke all on function public.keysuite_keyhq_inbox_v010() from public,anon;
grant execute on function public.keysuite_keyhq_inbox_v010() to authenticated;
-- Driver-only ride state. Consent and capacities use the existing social transaction.
create table public.ks_keyhq_rides_v010(session_id uuid primary key references public.ks_keyhq_sessions_v09(id) on delete cascade,x double precision not null,z double precision not null,yaw double precision not null,speed double precision not null,updated_at timestamptz not null default now());
alter table public.ks_keyhq_rides_v010 enable row level security;
revoke all on public.ks_keyhq_rides_v010 from public,anon,authenticated;
grant select on public.ks_keyhq_rides_v010 to authenticated;
create policy company_rides on public.ks_keyhq_rides_v010 for select to authenticated using(exists(select 1 from public.ks_keyhq_sessions_v09 s where s.id=session_id));
create function keyhq_private_v010.ride(sid uuid,px double precision,pz double precision,angle double precision,velocity double precision) returns void language plpgsql security definer set search_path='' as $$
declare s public.ks_keyhq_sessions_v09; prior public.ks_keyhq_rides_v010;
begin
 select * into s from public.ks_keyhq_sessions_v09 where id=sid for update;
 if auth.uid() is null or s.host_id is distinct from auth.uid() or s.status not in('waiting','playing') or s.activity not like 'ride_%' or not keyhq_private_v42925.is_member(s.company_id) then raise exception 'Only the active driver can move this vehicle';end if;
 if not (px between -105 and 100 and pz between -120 and 90 and angle between -100000 and 100000 and velocity between -6 and 6) then raise exception 'Invalid ride state';end if;
 select * into prior from public.ks_keyhq_rides_v010 where session_id=sid;
 if found and sqrt((px-prior.x)^2+(pz-prior.z)^2)>greatest(.5,least(3,extract(epoch from now()-prior.updated_at))*7) then raise exception 'Vehicle movement exceeds speed limit';end if;
 insert into public.ks_keyhq_rides_v010 values(sid,px,pz,angle,velocity,now()) on conflict(session_id) do update set x=excluded.x,z=excluded.z,yaw=excluded.yaw,speed=excluded.speed,updated_at=excluded.updated_at;
end $$;
revoke all on function keyhq_private_v010.ride(uuid,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function keyhq_private_v010.ride(uuid,double precision,double precision,double precision,double precision) to authenticated;
create function public.keysuite_keyhq_ride_v010(p_id uuid,p_x double precision,p_z double precision,p_yaw double precision,p_speed double precision) returns void language sql security invoker set search_path='' as $$ select keyhq_private_v010.ride(p_id,p_x,p_z,p_yaw,p_speed) $$;
revoke all on function public.keysuite_keyhq_ride_v010(uuid,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.keysuite_keyhq_ride_v010(uuid,double precision,double precision,double precision,double precision) to authenticated;

alter table public.ks_keyhq_sessions_v09 drop constraint ks_keyhq_sessions_v09_activity_check;
alter table public.ks_keyhq_sessions_v09 add constraint ks_keyhq_sessions_v09_activity_check check(activity in('basketball','football','badminton','pickleball','tennis','swim','gym','coffee','smoking','rooftop','garden','ride_bicycle','ride_scooter','ride_hoverboard','ride_golfcart'));
create or replace function keyhq_private_v09.social(c text,op text,sid uuid,activity_key text,invitees uuid[],target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); s public.ks_keyhq_sessions_v09; p public.ks_keyhq_participants_v09; u uuid; cap integer; minimum integer; result uuid;
begin
 if who is null or not keyhq_private_v42925.is_member(c) then raise exception 'Enabled employee account required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('keyhq-social:'||c));
 update public.ks_keyhq_sessions_v09 set status='ended' where company_id=c and expires_at<now();
 if op='create' then
  if activity_key not in('basketball','football','badminton','pickleball','tennis','swim','gym','coffee','smoking','rooftop','garden','ride_bicycle','ride_scooter','ride_hoverboard','ride_golfcart') then raise exception 'Unknown activity';end if;
  cap:=case when activity_key in('ride_bicycle','ride_hoverboard') then 1 when activity_key='ride_scooter' then 2 when activity_key in('badminton','pickleball','tennis') then 2 when activity_key in('gym','smoking') then 3 when activity_key='garden' then 6 else 4 end;
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
  cap:=case when s.activity in('ride_bicycle','ride_hoverboard') then 1 when s.activity='ride_scooter' then 2 when s.activity in('badminton','pickleball','tennis') then 2 when s.activity in('gym','smoking') then 3 when s.activity='garden' then 6 else 4 end;
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

do $$ declare t text;begin foreach t in array array['ks_keyhq_conversations_v010','ks_keyhq_members_v010','ks_keyhq_group_messages_v010','ks_keyhq_rides_v010'] loop
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
end loop;end $$;
notify pgrst,'reload schema';
commit;
