-- V4.29.26: align server validation with 2× / 3× / 4× / 5× rides. No data rewrite.
begin;
create or replace function keyhq_private_v010.ride(sid uuid,px double precision,pz double precision,angle double precision,velocity double precision) returns void language plpgsql security definer set search_path='' as $$
declare s public.ks_keyhq_sessions_v09; prior public.ks_keyhq_rides_v010; limit_speed double precision;
begin
 select * into s from public.ks_keyhq_sessions_v09 where id=sid for update;
 if auth.uid() is null or s.host_id is distinct from auth.uid() or s.status not in('waiting','playing') or s.activity not like 'ride_%' or not keyhq_private_v42925.is_member(s.company_id) then raise exception 'Only the active driver can move this vehicle';end if;
 limit_speed:=case s.activity when 'ride_hoverboard' then 4.4 when 'ride_bicycle' then 6.6 when 'ride_scooter' then 8.8 when 'ride_golfcart' then 11 else 0 end;
 if not (px between -105 and 100 and pz between -120 and 90 and angle between -100000 and 100000 and velocity between -limit_speed and limit_speed) then raise exception 'Invalid ride state';end if;
 select * into prior from public.ks_keyhq_rides_v010 where session_id=sid;
 if found and sqrt((px-prior.x)^2+(pz-prior.z)^2)>greatest(.5,least(3,extract(epoch from now()-prior.updated_at))*(limit_speed+1)) then raise exception 'Vehicle movement exceeds speed limit';end if;
 insert into public.ks_keyhq_rides_v010 values(sid,px,pz,angle,velocity,now()) on conflict(session_id) do update set x=excluded.x,z=excluded.z,yaw=excluded.yaw,speed=excluded.speed,updated_at=excluded.updated_at;
end $$;
notify pgrst,'reload schema';
commit;
