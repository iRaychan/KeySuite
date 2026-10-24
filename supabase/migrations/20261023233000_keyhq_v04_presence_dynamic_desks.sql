-- KeySuite V4.29.22 / KeyHQ V0.4 Living Office
-- Applied to Supabase project skidqdixnnnuhvarekxp on 2026-10-24.
-- Recorded migration: 20261023160548_keyhq_v04_presence_dynamic_desks.

begin;

alter table public.ks_keyhq_people_v42922
  add column if not exists presence_state text not null default 'offline',
  add column if not exists presence_updated_at timestamptz not null default now();

alter table public.ks_keyhq_people_v42922
  drop constraint if exists ks_keyhq_people_v42922_desk_range;
alter table public.ks_keyhq_people_v42922
  add constraint ks_keyhq_people_v42922_desk_positive check (desk_no >= 1);
alter table public.ks_keyhq_people_v42922
  drop constraint if exists ks_keyhq_people_v42922_presence;
alter table public.ks_keyhq_people_v42922
  add constraint ks_keyhq_people_v42922_presence check (presence_state in ('online','offline'));
alter table public.ks_keyhq_people_v42922
  drop constraint if exists ks_keyhq_people_v42922_company_desk_unique;
alter table public.ks_keyhq_people_v42922
  add constraint ks_keyhq_people_v42922_company_desk_unique unique(company_id,desk_no) deferrable initially deferred;

create or replace function public.keysuite_list_keyhq_people_v42922_v04(p_company_id text)
returns table (
  email text,
  display_name text,
  role text,
  desk_no smallint,
  avatar_gender text,
  avatar_accent text,
  account_state text,
  presence_state text,
  presence_updated_at timestamptz
)
language sql
stable
security definer
set search_path=''
as $$
  with caller as (
    select lower(coalesce((select auth.jwt())->>'email','')) as email
  ), allowed as (
    select 1 from public.ks_user_access a,caller c
    where lower(a.email)=c.email and a.active=true and a.company_id=p_company_id
  ), enabled_people as (
    select lower(a.email) email,
      coalesce(nullif(btrim(a.display_name),''),split_part(a.email,'@',1)) display_name,
      lower(coalesce(a.role,'user')) role,
      row_number() over(order by case lower(a.role) when 'owner' then 0 else 1 end,lower(a.email))::smallint fallback_desk,
      u.email_confirmed_at is not null confirmed,
      count(*) over() enabled_count
    from public.ks_user_access a
    left join auth.users u on lower(u.email)=lower(a.email)
    where a.active=true and a.company_id=p_company_id
  )
  select p.email,p.display_name,p.role,
    case when s.desk_no between 1 and greatest(4,ceil(p.enabled_count/4.0)::integer*4) then s.desk_no else p.fallback_desk end::smallint,
    coalesce(s.avatar_gender,case when mod(p.fallback_desk,2)=0 then 'male' else 'female' end),
    coalesce(s.avatar_accent,(array['#62f1dc','#89ddff','#a998ff','#ffc766','#ff8db2','#c8ff66'])[((p.fallback_desk-1)%6)+1]),
    case when p.confirmed then 'enabled' else 'invited' end,
    coalesce(s.presence_state,'offline'),s.presence_updated_at
  from enabled_people p
  left join public.ks_keyhq_people_v42922 s on s.company_id=p_company_id and s.user_email=p.email
  where exists(select 1 from allowed)
  order by 4,p.email;
$$;

create or replace function public.keysuite_save_keyhq_people_v42922_v04(p_company_id text,p_people jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt())->>'email',''));
  v_enabled integer;
  v_capacity integer;
  v_count integer;
begin
  if not exists(select 1 from public.ks_user_access a where lower(a.email)=v_email and a.active=true and a.company_id=p_company_id and lower(a.role)='owner') then
    raise exception 'Only an enabled KeySuite Owner can configure KeyOffice desks and avatars.';
  end if;
  if jsonb_typeof(coalesce(p_people,'[]'::jsonb))<>'array' then raise exception 'KeyOffice people settings must be an array.'; end if;
  select count(*) into v_enabled from public.ks_user_access a where a.active=true and a.company_id=p_company_id;
  v_capacity:=greatest(4,ceil(v_enabled/4.0)::integer*4);
  select count(*) into v_count from jsonb_array_elements(coalesce(p_people,'[]'::jsonb));
  if v_count<>v_enabled then raise exception 'Assignments must include every enabled account exactly once.'; end if;
  if exists(select 1 from jsonb_to_recordset(p_people) x(email text,desk_no integer,avatar_gender text,avatar_accent text)
    where x.desk_no not between 1 and v_capacity or x.avatar_gender not in ('female','male') or coalesce(x.avatar_accent,'') !~ '^#[0-9A-Fa-f]{6}$'
      or not exists(select 1 from public.ks_user_access a where lower(a.email)=lower(x.email) and a.active=true and a.company_id=p_company_id)) then
    raise exception 'An assignment is invalid or outside the dynamic % desk capacity.',v_capacity;
  end if;
  if exists(select 1 from jsonb_to_recordset(p_people) x(email text,desk_no integer,avatar_gender text,avatar_accent text) group by lower(x.email) having count(*)>1)
     or exists(select 1 from jsonb_to_recordset(p_people) x(email text,desk_no integer,avatar_gender text,avatar_accent text) group by x.desk_no having count(*)>1) then
    raise exception 'Each enabled account and desk number must be unique.';
  end if;
  delete from public.ks_keyhq_people_v42922 s where s.company_id=p_company_id and s.user_email not in (select lower(x.email) from jsonb_to_recordset(p_people) x(email text));
  insert into public.ks_keyhq_people_v42922(company_id,user_email,desk_no,avatar_gender,avatar_accent,updated_by_email,presence_state,presence_updated_at)
  select p_company_id,lower(x.email),x.desk_no::smallint,x.avatar_gender,upper(x.avatar_accent),v_email,coalesce(old.presence_state,'offline'),coalesce(old.presence_updated_at,now())
  from jsonb_to_recordset(p_people) x(email text,desk_no integer,avatar_gender text,avatar_accent text)
  left join public.ks_keyhq_people_v42922 old on old.company_id=p_company_id and old.user_email=lower(x.email)
  on conflict(company_id,user_email) do update set desk_no=excluded.desk_no,avatar_gender=excluded.avatar_gender,avatar_accent=excluded.avatar_accent,updated_by_email=excluded.updated_by_email,updated_at=now();
  return jsonb_build_object('ok',true,'saved',v_count,'desk_capacity',v_capacity);
end;
$$;

create or replace function public.keysuite_set_keyhq_presence_v42922_v04(p_company_id text,p_presence text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt())->>'email',''));
  v_state text:=lower(btrim(coalesce(p_presence,'')));
  v_desk smallint;
begin
  if v_state not in ('online','offline') then raise exception 'Presence must be online or offline.'; end if;
  if not exists(select 1 from public.ks_user_access a where lower(a.email)=v_email and a.active=true and a.company_id=p_company_id) then
    raise exception 'Enabled company access is required.';
  end if;
  select coalesce(max(s.desk_no),0)+1 into v_desk from public.ks_keyhq_people_v42922 s where s.company_id=p_company_id;
  insert into public.ks_keyhq_people_v42922(company_id,user_email,desk_no,avatar_gender,avatar_accent,updated_by_email,presence_state,presence_updated_at)
  values(p_company_id,v_email,v_desk,case when mod(v_desk,2)=0 then 'male' else 'female' end,(array['#62f1dc','#89ddff','#a998ff','#ffc766','#ff8db2','#c8ff66'])[((v_desk-1)%6)+1],v_email,v_state,now())
  on conflict(company_id,user_email) do update set presence_state=excluded.presence_state,presence_updated_at=excluded.presence_updated_at;
  return jsonb_build_object('ok',true,'presence',v_state,'updated_at',now());
end;
$$;

revoke all on function public.keysuite_list_keyhq_people_v42922_v04(text) from public,anon;
revoke all on function public.keysuite_save_keyhq_people_v42922_v04(text,jsonb) from public,anon;
revoke all on function public.keysuite_set_keyhq_presence_v42922_v04(text,text) from public,anon;
grant execute on function public.keysuite_list_keyhq_people_v42922_v04(text) to authenticated;
grant execute on function public.keysuite_save_keyhq_people_v42922_v04(text,jsonb) to authenticated;
grant execute on function public.keysuite_set_keyhq_presence_v42922_v04(text,text) to authenticated;

notify pgrst,'reload schema';
commit;
