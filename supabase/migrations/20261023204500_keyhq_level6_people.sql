-- KeySuite V4.29.22 / KeyHQ V0.3
-- Level 6 avatar and desk persistence. PREPARED ONLY: do not apply without
-- explicit production approval.

begin;

create table if not exists public.ks_keyhq_people_v42922 (
  company_id text not null,
  user_email text not null,
  desk_no smallint not null,
  avatar_gender text not null default 'female',
  avatar_accent text not null default '#62f1dc',
  updated_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id,user_email),
  constraint ks_keyhq_people_v42922_desk_range check (desk_no between 1 and 28),
  constraint ks_keyhq_people_v42922_gender check (avatar_gender in ('female','male')),
  constraint ks_keyhq_people_v42922_accent check (avatar_accent ~ '^#[0-9A-Fa-f]{6}$'),
  constraint ks_keyhq_people_v42922_company_desk_unique unique (company_id,desk_no)
);

alter table public.ks_keyhq_people_v42922 enable row level security;
revoke all on table public.ks_keyhq_people_v42922 from public,anon,authenticated;

create index if not exists ks_keyhq_people_v42922_company_idx
  on public.ks_keyhq_people_v42922(company_id);

create or replace function public.keysuite_list_keyhq_people_v42922(p_company_id text)
returns table (
  email text,
  display_name text,
  role text,
  desk_no smallint,
  avatar_gender text,
  avatar_accent text,
  account_state text
)
language sql
stable
security definer
set search_path=''
as $$
  with caller as (
    select lower(coalesce((select auth.jwt())->>'email','')) as email
  ), allowed as (
    select 1
    from public.ks_user_access a, caller c
    where lower(a.email)=c.email
      and a.active=true
      and a.company_id=p_company_id
  ), enabled_people as (
    select
      lower(a.email) as email,
      coalesce(nullif(btrim(a.display_name),''),split_part(a.email,'@',1)) as display_name,
      lower(coalesce(a.role,'user')) as role,
      row_number() over(order by case lower(a.role) when 'owner' then 0 else 1 end,lower(a.email))::smallint as fallback_desk,
      u.email_confirmed_at is not null as confirmed
    from public.ks_user_access a
    left join auth.users u on lower(u.email)=lower(a.email)
    where a.active=true and a.company_id=p_company_id
  )
  select
    p.email,
    p.display_name,
    p.role,
    coalesce(s.desk_no,p.fallback_desk)::smallint,
    coalesce(s.avatar_gender,case when mod(p.fallback_desk,2)=0 then 'male' else 'female' end),
    coalesce(s.avatar_accent,(array['#62f1dc','#89ddff','#a998ff','#ffc766','#ff8db2','#c8ff66'])[((p.fallback_desk-1)%6)+1]),
    case when p.confirmed then 'enabled' else 'invited' end
  from enabled_people p
  left join public.ks_keyhq_people_v42922 s
    on s.company_id=p_company_id and s.user_email=p.email
  where exists(select 1 from allowed)
  order by coalesce(s.desk_no,p.fallback_desk),p.email;
$$;

create or replace function public.keysuite_save_keyhq_people_v42922(
  p_company_id text,
  p_people jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt())->>'email',''));
  v_count integer;
begin
  if not exists (
    select 1 from public.ks_user_access a
    where lower(a.email)=v_email
      and a.active=true
      and a.company_id=p_company_id
      and lower(a.role)='owner'
  ) then
    raise exception 'Only an enabled KeySuite Owner can configure KeyOffice desks and avatars.';
  end if;

  if jsonb_typeof(coalesce(p_people,'[]'::jsonb))<>'array' then
    raise exception 'KeyOffice people settings must be an array.';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(coalesce(p_people,'[]'::jsonb));
  if v_count>28 then raise exception 'KeyOffice supports no more than 28 desk assignments.'; end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_people,'[]'::jsonb)) as x(email text,desk_no integer,avatar_gender text,avatar_accent text)
    where x.desk_no not between 1 and 28
       or x.avatar_gender not in ('female','male')
       or coalesce(x.avatar_accent,'') !~ '^#[0-9A-Fa-f]{6}$'
       or not exists (
         select 1 from public.ks_user_access a
         where lower(a.email)=lower(x.email)
           and a.active=true
           and a.company_id=p_company_id
       )
  ) then
    raise exception 'A KeyOffice assignment is invalid or does not belong to an enabled company account.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_people,'[]'::jsonb)) as x(email text,desk_no integer,avatar_gender text,avatar_accent text)
    group by lower(x.email) having count(*)>1
  ) or exists (
    select 1
    from jsonb_to_recordset(coalesce(p_people,'[]'::jsonb)) as x(email text,desk_no integer,avatar_gender text,avatar_accent text)
    group by x.desk_no having count(*)>1
  ) then
    raise exception 'Each enabled account and desk number must be unique.';
  end if;

  -- Replace the company's settings atomically so desk swaps never trip the
  -- immediate unique(company_id,desk_no) constraint mid-upsert.
  delete from public.ks_keyhq_people_v42922 s
  where s.company_id=p_company_id;

  insert into public.ks_keyhq_people_v42922(company_id,user_email,desk_no,avatar_gender,avatar_accent,updated_by_email)
  select p_company_id,lower(x.email),x.desk_no::smallint,x.avatar_gender,upper(x.avatar_accent),v_email
  from jsonb_to_recordset(coalesce(p_people,'[]'::jsonb)) as x(email text,desk_no integer,avatar_gender text,avatar_accent text);

  return jsonb_build_object('ok',true,'saved',v_count);
end;
$$;

revoke all on function public.keysuite_list_keyhq_people_v42922(text) from public,anon;
revoke all on function public.keysuite_save_keyhq_people_v42922(text,jsonb) from public,anon;
grant execute on function public.keysuite_list_keyhq_people_v42922(text) to authenticated;
grant execute on function public.keysuite_save_keyhq_people_v42922(text,jsonb) to authenticated;

comment on table public.ks_keyhq_people_v42922 is
  'Owner-configured KeyHQ Level 6 avatar and unique desk assignments for enabled KeySuite accounts.';

notify pgrst,'reload schema';

commit;
