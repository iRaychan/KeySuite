begin;
alter table public.ks_keyhq_sessions_v09 drop constraint ks_keyhq_sessions_v09_activity_check;
alter table public.ks_keyhq_sessions_v09 add constraint ks_keyhq_sessions_v09_activity_check check(activity in('basketball','football','badminton','pickleball','tennis','swim','gym','coffee','smoking','rooftop','garden','ride_bicycle','ride_scooter','ride_hoverboard','ride_hoverboard_office','ride_hoverboard_lift','ride_golfcart'));
create or replace function keyhq_private_v09.social(c text,op text,sid uuid,activity_key text,invitees uuid[],target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); item record; value jsonb; s public.ks_keyhq_sessions_v09; p public.ks_keyhq_participants_v09; u uuid; cap integer; minimum integer; result uuid;
begin
 if who is null or not keyhq_private_v42925.is_member(c) then raise exception 'Enabled employee account required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('keyhq-social:'||c));
 update public.ks_keyhq_sessions_v09 set status='ended' where company_id=c and expires_at<now();
 if op='create' then
  if activity_key not in('basketball','football','badminton','pickleball','tennis','swim','gym','coffee','smoking','rooftop','garden','ride_bicycle','ride_scooter','ride_hoverboard','ride_hoverboard_office','ride_hoverboard_lift','ride_golfcart') then raise exception 'Unknown activity';end if;
  cap:=case when activity_key in('ride_bicycle','ride_hoverboard','ride_hoverboard_office','ride_hoverboard_lift') then 1 when activity_key='ride_scooter' then 2 when activity_key='basketball' then 10 when activity_key in('badminton','pickleball','tennis') then 4 when activity_key in('gym','smoking') then 3 when activity_key='garden' then 6 else 4 end;
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
  cap:=case when s.activity in('ride_bicycle','ride_hoverboard','ride_hoverboard_office','ride_hoverboard_lift') then 1 when s.activity='ride_scooter' then 2 when s.activity='basketball' then 10 when s.activity in('badminton','pickleball','tennis') then 4 when s.activity in('gym','smoking') then 3 when s.activity='garden' then 6 else 4 end;
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
 minimum:=1;
 if not exists(select 1 from public.ks_keyhq_participants_v09 where session_id=sid and status in('invited','accepted','arrived')) then update public.ks_keyhq_sessions_v09 set status='ended' where id=sid;
 elsif (select count(*) from public.ks_keyhq_participants_v09 where session_id=sid and status='arrived')>=minimum then update public.ks_keyhq_sessions_v09 set status='playing',started_at=coalesce(started_at,now()) where id=sid;
 else update public.ks_keyhq_sessions_v09 set status='waiting',started_at=null where id=sid;end if;
 return sid;
end $$;

create or replace function keyhq_private_v010.ride(sid uuid,px double precision,pz double precision,angle double precision,velocity double precision) returns void language plpgsql security definer set search_path='' as $$
declare s public.ks_keyhq_sessions_v09; prior public.ks_keyhq_rides_v010; limit_speed double precision;
begin
 select * into s from public.ks_keyhq_sessions_v09 where id=sid for update;
 if auth.uid() is null or s.host_id is distinct from auth.uid() or s.status not in('waiting','playing') or s.activity not like 'ride_%' or not keyhq_private_v42925.is_member(s.company_id) then raise exception 'Only the active driver can move this vehicle';end if;
 limit_speed:=case s.activity when 'ride_hoverboard' then 4.4 when 'ride_hoverboard_office' then 4.4 when 'ride_hoverboard_lift' then 4.4 when 'ride_bicycle' then 6.6 when 'ride_scooter' then 8.8 when 'ride_golfcart' then 11 else 0 end;
 if not (px between -105 and 100 and pz between -120 and 90 and angle between -100000 and 100000 and velocity between -limit_speed and limit_speed) then raise exception 'Invalid ride state';end if;
 select * into prior from public.ks_keyhq_rides_v010 where session_id=sid;
 if found and sqrt((px-prior.x)^2+(pz-prior.z)^2)>greatest(.5,least(3,extract(epoch from now()-prior.updated_at))*(limit_speed+1)) then raise exception 'Vehicle movement exceeds speed limit';end if;
 insert into public.ks_keyhq_rides_v010(session_id,x,z,yaw,speed,updated_at) values(sid,px,pz,angle,velocity,now()) on conflict(session_id) do update set x=excluded.x,z=excluded.z,yaw=excluded.yaw,speed=excluded.speed,updated_at=excluded.updated_at;
end $$;


create schema keyhq_private_v426;
revoke all on schema keyhq_private_v426 from public,anon;
grant usage on schema keyhq_private_v426 to authenticated;
create table public.ks_keyhq_games_v426(session_id uuid primary key references public.ks_keyhq_sessions_v09(id) on delete cascade,mode text not null,seq bigint not null default 0,state jsonb not null default '{}',updated_at timestamptz not null default now());
create table public.ks_keyhq_inputs_v426(session_id uuid references public.ks_keyhq_sessions_v09(id) on delete cascade,user_id uuid references auth.users(id),seq bigint not null,input jsonb not null,updated_at timestamptz not null default now(),primary key(session_id,user_id));
alter table public.ks_keyhq_games_v426 enable row level security;
alter table public.ks_keyhq_inputs_v426 enable row level security;
revoke all on public.ks_keyhq_games_v426,public.ks_keyhq_inputs_v426 from public,anon,authenticated;
grant select on public.ks_keyhq_games_v426,public.ks_keyhq_inputs_v426 to authenticated;
create function keyhq_private_v426.participant(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ks_keyhq_sessions_v09 s join public.ks_keyhq_participants_v09 p on p.session_id=s.id where s.id=sid and p.user_id=auth.uid() and p.status in('accepted','arrived') and s.status in('waiting','playing') and s.expires_at>now() and keyhq_private_v42925.is_member(s.company_id))
$$;
revoke all on function keyhq_private_v426.participant(uuid) from public,anon;
grant execute on function keyhq_private_v426.participant(uuid) to authenticated;
create policy participants on public.ks_keyhq_games_v426 for select to authenticated using(keyhq_private_v426.participant(session_id));
create policy participants on public.ks_keyhq_inputs_v426 for select to authenticated using(keyhq_private_v426.participant(session_id));
create function keyhq_private_v426.game(sid uuid,op text,mode_key text,sequence_id bigint,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare s public.ks_keyhq_sessions_v09; who uuid:=auth.uid(); item record; value jsonb;
begin
 select * into s from public.ks_keyhq_sessions_v09 where id=sid for update;
 if not keyhq_private_v426.participant(sid) then raise exception 'Active enabled participant required';end if;
 if s.activity not in('basketball','football','tennis','badminton','pickleball','swim','gym') then raise exception 'Not a playable activity';end if;
 if op='configure' then
  if s.host_id<>who then raise exception 'Host required';end if;
  if not coalesce(case s.activity when 'basketball' then mode_key in('practice','1-on-1','3-on-3','5-on-5') when 'football' then mode_key in('practice','match') when 'swim' then mode_key in('free','laps','timed-race','multiplayer-race') when 'gym' then mode_key in('individual','group-challenge') else mode_key in('practice','singles','doubles') end,false) then raise exception 'Invalid activity mode';end if;
  insert into public.ks_keyhq_games_v426(session_id,mode) values(sid,mode_key) on conflict do nothing;return;
 end if;
 if sequence_id is null or sequence_id<1 or sequence_id>9007199254740991 or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid state envelope';end if;
 if op='input' then
  if pg_column_size(payload)>2048 or not coalesce((payload->>'x')::double precision between -1 and 1 and (payload->>'z')::double precision between -1 and 1 and (payload->>'shot')::bigint between 0 and 9007199254740991 and (payload->>'power')::double precision between 0 and 1,false) then raise exception 'Invalid controls';end if;
  if payload->'aim' is not null and payload->'aim'<>'null'::jsonb and not coalesce((payload->'aim'->>'x')::double precision between -150 and 150 and (payload->'aim'->>'z')::double precision between -150 and 150 and (payload->'aim'->>'y')::double precision between -1 and 20,false) then raise exception 'Invalid aim';end if;
  insert into public.ks_keyhq_inputs_v426 values(sid,who,sequence_id,payload,now()) on conflict(session_id,user_id) do update set seq=excluded.seq,input=excluded.input,updated_at=now() where ks_keyhq_inputs_v426.seq<excluded.seq;
 elsif op='state' then
  if s.host_id<>who then raise exception 'Only host may publish shared state';end if;
  if pg_column_size(payload)>32768 or not coalesce(jsonb_typeof(payload->'players')='object' and jsonb_typeof(payload->'scores')='object',false) then raise exception 'Invalid shared state';end if;
  for item in select * from jsonb_each(payload->'players') loop if not exists(select 1 from public.ks_keyhq_participants_v09 where session_id=sid and user_id::text=item.key and status in('accepted','arrived')) or not coalesce((item.value->>'x')::double precision between -110 and 105 and (item.value->>'z')::double precision between -125 and 95,false) then raise exception 'Invalid player state';end if;end loop;
  for item in select * from jsonb_each(payload->'scores') loop if not coalesce((item.value::text)::double precision between 0 and 999999,false) then raise exception 'Invalid score';end if;end loop;
  value:=payload->'ball';if value is not null and value<>'null'::jsonb and not coalesce((value->>'x')::double precision between -150 and 150 and (value->>'z')::double precision between -150 and 150 and (value->>'y')::double precision between -5 and 100 and (value->>'vx')::double precision between -100 and 100 and (value->>'vy')::double precision between -100 and 100 and (value->>'vz')::double precision between -100 and 100,false) then raise exception 'Invalid ball';end if;
  update public.ks_keyhq_games_v426 set seq=sequence_id,state=payload,updated_at=now() where session_id=sid and seq<sequence_id;
 else raise exception 'Unknown game action';end if;
end $$;
revoke all on function keyhq_private_v426.game(uuid,text,text,bigint,jsonb) from public,anon;
grant execute on function keyhq_private_v426.game(uuid,text,text,bigint,jsonb) to authenticated;
create function public.keysuite_keyhq_game_v426(p_id uuid,p_action text,p_mode text default null,p_seq bigint default null,p_payload jsonb default '{}') returns void language sql security invoker set search_path='' as $$select keyhq_private_v426.game(p_id,p_action,p_mode,p_seq,p_payload)$$;
revoke all on function public.keysuite_keyhq_game_v426(uuid,text,text,bigint,jsonb) from public,anon;
grant execute on function public.keysuite_keyhq_game_v426(uuid,text,text,bigint,jsonb) to authenticated;
alter table public.ks_keyhq_rides_v010 add column floor text not null default 'all',add column y double precision not null default .2;
create function keyhq_private_v426.ride(sid uuid,px double precision,pz double precision,angle double precision,velocity double precision,f text,py double precision) returns void language plpgsql security definer set search_path='' as $$
declare activity_key text;
begin
 select activity into activity_key from public.ks_keyhq_sessions_v09 where id=sid;
 if not coalesce(f in('all','0','1','2','roof') and py between .1 and 16,false) or (activity_key not like 'ride_hoverboard%' and f<>'all') then raise exception 'Invalid vehicle floor';end if;
 perform keyhq_private_v010.ride(sid,px,pz,angle,velocity);
 update public.ks_keyhq_rides_v010 set floor=f,y=py where session_id=sid;
end $$;
revoke all on function keyhq_private_v426.ride(uuid,double precision,double precision,double precision,double precision,text,double precision) from public,anon;
grant execute on function keyhq_private_v426.ride(uuid,double precision,double precision,double precision,double precision,text,double precision) to authenticated;
create function public.keysuite_keyhq_ride_v426(p_id uuid,p_x double precision,p_z double precision,p_yaw double precision,p_speed double precision,p_floor text,p_y double precision) returns void language sql security invoker set search_path='' as $$select keyhq_private_v426.ride(p_id,p_x,p_z,p_yaw,p_speed,p_floor,p_y)$$;
revoke all on function public.keysuite_keyhq_ride_v426(uuid,double precision,double precision,double precision,double precision,text,double precision) from public,anon;
grant execute on function public.keysuite_keyhq_ride_v426(uuid,double precision,double precision,double precision,double precision,text,double precision) to authenticated;
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.ks_keyhq_games_v426,public.ks_keyhq_inputs_v426;end if;end $$;

notify pgrst,'reload schema';
commit;
