begin;
create table public.ks_keyhq_actor_state_v426(
 company_id text not null,user_id uuid not null references auth.users(id),session_id uuid not null,
 seq bigint not null,pose jsonb not null,updated_at timestamptz not null default now(),primary key(company_id,user_id)
);
create index ks_keyhq_actor_state_user on public.ks_keyhq_actor_state_v426(user_id);
alter table public.ks_keyhq_actor_state_v426 enable row level security;
revoke all on public.ks_keyhq_actor_state_v426 from public,anon,authenticated;
grant select on public.ks_keyhq_actor_state_v426 to authenticated;
create policy company_actor_state on public.ks_keyhq_actor_state_v426 for select to authenticated using(keyhq_private_v42925.is_member(company_id) and updated_at>now()-interval '150 seconds');
create function keyhq_private_v426.actor_state(c text,s uuid,sequence_id bigint,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not keyhq_private_v42925.is_member(c) or not exists(select 1 from public.ks_keyhq_presence_v09 where company_id=c and user_id=auth.uid() and session_id=s and expires_at>now()) then raise exception 'Active employee session required';end if;
 if sequence_id is null or sequence_id<1 or sequence_id>9007199254740991 or payload is null or pg_column_size(payload)>2048 or jsonb_typeof(payload)<>'object' then raise exception 'Invalid avatar state';end if;
 if not coalesce(jsonb_typeof(payload->'position')='array' and jsonb_array_length(payload->'position')=3 and (payload->'position'->>0)::double precision between -110 and 105 and (payload->'position'->>1)::double precision between -.5 and 20 and (payload->'position'->>2)::double precision between -125 and 95 and (payload->>'yaw')::double precision between -100000 and 100000 and payload->>'floor' in('all','0','1','2','roof') and payload->>'state' in('idle','walk','run','sit','work','type','mouse','relax','sofa','tv','meeting','talk','greet','handshake','laugh','clap','cheer','selfie','dance','read','phone','coffee','smoking','basketball','football','tennis','badminton','pickleball','swim','gym','ride','cycle'),false) then raise exception 'Invalid avatar pose';end if;
 if payload->'carry' is not null and payload->'carry'<>'null'::jsonb and (payload->>'carry' not in('smoke','beer','both') or payload->>'floor' not in('all','roof')) then raise exception 'Invalid carried item';end if;
 insert into public.ks_keyhq_actor_state_v426 values(c,auth.uid(),s,sequence_id,payload,now()) on conflict(company_id,user_id) do update set session_id=excluded.session_id,seq=excluded.seq,pose=excluded.pose,updated_at=excluded.updated_at where ks_keyhq_actor_state_v426.seq<excluded.seq;
end $$;
revoke all on function keyhq_private_v426.actor_state(text,uuid,bigint,jsonb) from public,anon;
grant execute on function keyhq_private_v426.actor_state(text,uuid,bigint,jsonb) to authenticated;
create function public.keysuite_keyhq_actor_v426(p_company text,p_session uuid,p_seq bigint,p_pose jsonb) returns void language sql security invoker set search_path='' as $$select keyhq_private_v426.actor_state(p_company,p_session,p_seq,p_pose)$$;
revoke all on function public.keysuite_keyhq_actor_v426(text,uuid,bigint,jsonb) from public,anon;
grant execute on function public.keysuite_keyhq_actor_v426(text,uuid,bigint,jsonb) to authenticated;
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.ks_keyhq_actor_state_v426;end if;end $$;
notify pgrst,'reload schema';
commit;
