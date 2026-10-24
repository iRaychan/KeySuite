-- KeySuite V4.29.23 / KeyHQ V0.5 persisted self-service avatar profiles.
-- Additive migration: existing desks, presence, assignments and RLS are preserved.
begin;

alter table public.ks_keyhq_people_v42922
  add column if not exists avatar_skin_tone text not null default '#E3AD82',
  add column if not exists avatar_body_shape text not null default 'average',
  add column if not exists avatar_hair_style text not null default 'short',
  add column if not exists avatar_hair_color text not null default '#211A18',
  add column if not exists avatar_facial_features text not null default 'soft',
  add column if not exists avatar_moustache text not null default 'none',
  add column if not exists avatar_beard text not null default 'none',
  add column if not exists avatar_glasses text not null default 'none',
  add column if not exists avatar_clothing text not null default 'business';

alter table public.ks_keyhq_people_v42922
  drop constraint if exists ks_keyhq_people_v42922_avatar_profile;
alter table public.ks_keyhq_people_v42922
  add constraint ks_keyhq_people_v42922_avatar_profile check (
    avatar_gender in ('female','male','nonbinary') and
    avatar_skin_tone ~ '^#[0-9A-Fa-f]{6}$' and
    avatar_body_shape in ('slim','average','broad') and
    avatar_hair_style in ('short','bob','long','curly','bald') and
    avatar_hair_color ~ '^#[0-9A-Fa-f]{6}$' and
    avatar_facial_features in ('soft','defined','round') and
    avatar_moustache in ('none','classic','handlebar') and
    avatar_beard in ('none','stubble','full') and
    avatar_glasses in ('none','round','square') and
    avatar_clothing in ('business','smart-casual','casual','sport')
  );

create or replace function public.keysuite_list_keyhq_people_v42923(p_company_id text)
returns table (
  email text, display_name text, role text, desk_no smallint,
  avatar_gender text, avatar_accent text, avatar_skin_tone text,
  avatar_body_shape text, avatar_hair_style text, avatar_hair_color text,
  avatar_facial_features text, avatar_moustache text, avatar_beard text,
  avatar_glasses text, avatar_clothing text, account_state text,
  presence_state text, presence_updated_at timestamptz
)
language sql stable security definer set search_path=''
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
    coalesce(s.avatar_accent,(array['#62F1DC','#89DDFF','#A998FF','#FFC766','#FF8DB2','#C8FF66'])[((p.fallback_desk-1)%6)+1]),
    coalesce(s.avatar_skin_tone,'#E3AD82'),coalesce(s.avatar_body_shape,'average'),
    coalesce(s.avatar_hair_style,'short'),coalesce(s.avatar_hair_color,'#211A18'),
    coalesce(s.avatar_facial_features,'soft'),coalesce(s.avatar_moustache,'none'),
    coalesce(s.avatar_beard,'none'),coalesce(s.avatar_glasses,'none'),coalesce(s.avatar_clothing,'business'),
    case when p.confirmed then 'enabled' else 'invited' end,
    coalesce(s.presence_state,'offline'),s.presence_updated_at
  from enabled_people p
  left join public.ks_keyhq_people_v42922 s on s.company_id=p_company_id and s.user_email=p.email
  where exists(select 1 from allowed)
  order by 4,p.email;
$$;

create or replace function public.keysuite_save_keyhq_people_v42923(p_company_id text,p_people jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt())->>'email',''));
  v_enabled integer; v_capacity integer; v_count integer;
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
    where x.desk_no not between 1 and v_capacity or x.avatar_gender not in ('female','male','nonbinary') or coalesce(x.avatar_accent,'') !~ '^#[0-9A-Fa-f]{6}$'
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

create or replace function public.keysuite_save_my_keyhq_avatar_v42923(p_company_id text,p_avatar jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt())->>'email',''));
  v_capacity integer;
  v_desk smallint;
  v_gender text:=lower(coalesce(p_avatar->>'gender','female'));
  v_accent text:=upper(coalesce(p_avatar->>'accent','#62F1DC'));
  v_skin text:=upper(coalesce(p_avatar->>'skinTone','#E3AD82'));
  v_body text:=lower(coalesce(p_avatar->>'bodyShape','average'));
  v_hair text:=lower(coalesce(p_avatar->>'hairStyle','short'));
  v_hair_color text:=upper(coalesce(p_avatar->>'hairColor','#211A18'));
  v_face text:=lower(coalesce(p_avatar->>'facialFeatures','soft'));
  v_moustache text:=lower(coalesce(p_avatar->>'moustache','none'));
  v_beard text:=lower(coalesce(p_avatar->>'beard','none'));
  v_glasses text:=lower(coalesce(p_avatar->>'glasses','none'));
  v_clothing text:=lower(coalesce(p_avatar->>'clothing','business'));
begin
  if not exists(select 1 from public.ks_user_access a where lower(a.email)=v_email and a.active=true and a.company_id=p_company_id) then
    raise exception 'Enabled company access is required.';
  end if;
  if v_gender not in ('female','male','nonbinary') or v_accent !~ '^#[0-9A-F]{6}$' or v_skin !~ '^#[0-9A-F]{6}$'
    or v_body not in ('slim','average','broad') or v_hair not in ('short','bob','long','curly','bald') or v_hair_color !~ '^#[0-9A-F]{6}$'
    or v_face not in ('soft','defined','round') or v_moustache not in ('none','classic','handlebar') or v_beard not in ('none','stubble','full')
    or v_glasses not in ('none','round','square') or v_clothing not in ('business','smart-casual','casual','sport') then
    raise exception 'Avatar settings are invalid.';
  end if;
  select s.desk_no into v_desk from public.ks_keyhq_people_v42922 s where s.company_id=p_company_id and s.user_email=v_email;
  if v_desk is null then
    select greatest(4,ceil(count(*)/4.0)::integer*4) into v_capacity from public.ks_user_access a where a.active=true and a.company_id=p_company_id;
    select g::smallint into v_desk from generate_series(1,v_capacity) g
      where not exists(select 1 from public.ks_keyhq_people_v42922 s where s.company_id=p_company_id and s.desk_no=g)
      order by g limit 1;
  end if;
  if v_desk is null then raise exception 'No available KeyOffice desk exists for this enabled account.'; end if;
  insert into public.ks_keyhq_people_v42922(company_id,user_email,desk_no,avatar_gender,avatar_accent,updated_by_email,presence_state,presence_updated_at,
    avatar_skin_tone,avatar_body_shape,avatar_hair_style,avatar_hair_color,avatar_facial_features,avatar_moustache,avatar_beard,avatar_glasses,avatar_clothing)
  values(p_company_id,v_email,v_desk,v_gender,v_accent,v_email,'online',now(),v_skin,v_body,v_hair,v_hair_color,v_face,v_moustache,v_beard,v_glasses,v_clothing)
  on conflict(company_id,user_email) do update set avatar_gender=excluded.avatar_gender,avatar_accent=excluded.avatar_accent,
    avatar_skin_tone=excluded.avatar_skin_tone,avatar_body_shape=excluded.avatar_body_shape,avatar_hair_style=excluded.avatar_hair_style,
    avatar_hair_color=excluded.avatar_hair_color,avatar_facial_features=excluded.avatar_facial_features,avatar_moustache=excluded.avatar_moustache,
    avatar_beard=excluded.avatar_beard,avatar_glasses=excluded.avatar_glasses,avatar_clothing=excluded.avatar_clothing,
    updated_by_email=v_email,updated_at=now();
  return jsonb_build_object('ok',true,'email',v_email);
end;
$$;

revoke all on function public.keysuite_list_keyhq_people_v42923(text) from public,anon;
revoke all on function public.keysuite_save_keyhq_people_v42923(text,jsonb) from public,anon;
revoke all on function public.keysuite_save_my_keyhq_avatar_v42923(text,jsonb) from public,anon;
grant execute on function public.keysuite_list_keyhq_people_v42923(text) to authenticated;
grant execute on function public.keysuite_save_keyhq_people_v42923(text,jsonb) to authenticated;
grant execute on function public.keysuite_save_my_keyhq_avatar_v42923(text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
