-- KeySuite V4.29.21 — company-scoped KeyHQ floor configuration.
-- Safe to run more than once.

begin;

create table if not exists public.ks_keyhq_config_v42921 (
  company_id text primary key,
  floors jsonb not null default '[]'::jsonb,
  updated_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ks_keyhq_config_v42921_floors_array check (jsonb_typeof(floors)='array'),
  constraint ks_keyhq_config_v42921_floor_limit check (jsonb_array_length(floors)<=4)
);

alter table public.ks_keyhq_config_v42921 enable row level security;
revoke all on table public.ks_keyhq_config_v42921 from anon,authenticated;

-- Preserve enquiries imported from the retired KeyAI project. Older rows were
-- created before company tagging existed. Backfill only when KeySuite has one
-- unambiguous active company; otherwise leave the rows untouched for review.
do $$
declare
  v_company_id text;
begin
  select min(company_id)
  into v_company_id
  from (
    select distinct company_id
    from public.ks_user_access
    where active=true and nullif(btrim(company_id),'') is not null
  ) as active_companies
  having count(*)=1;

  if v_company_id is not null and to_regclass('public.ks_keyai_enquiries') is not null then
    update public.ks_keyai_enquiries
    set keyai_company_id=v_company_id
    where keyai_company_id is null or btrim(keyai_company_id)='';
  end if;
end;
$$;

create or replace function public.keysuite_get_keyhq_config_v42921(p_company_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_email text:=lower(coalesce(auth.jwt()->>'email',''));
  v_floors jsonb:='[]'::jsonb;
begin
  if v_email='' or not exists (
    select 1 from public.ks_user_access
    where lower(email)=v_email and active=true and company_id=p_company_id
  ) then raise exception 'KeyHQ company access denied'; end if;

  select floors into v_floors from public.ks_keyhq_config_v42921 where company_id=p_company_id;
  return jsonb_build_object('floors',coalesce(v_floors,'[]'::jsonb));
end;
$$;

create or replace function public.keysuite_save_keyhq_config_v42921(p_company_id text,p_floors jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_email text:=lower(coalesce(auth.jwt()->>'email',''));
  v_role text;
begin
  select lower(role) into v_role from public.ks_user_access
  where lower(email)=v_email and active=true and company_id=p_company_id limit 1;
  if coalesce(v_role,'') not in ('owner','admin') then raise exception 'Only an Owner or Admin can configure KeyHQ floors'; end if;
  if jsonb_typeof(coalesce(p_floors,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_floors,'[]'::jsonb))>4 then raise exception 'KeyHQ supports up to four expansion floors'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_floors,'[]'::jsonb)) as floor
    where jsonb_typeof(floor)<>'object' or length(coalesce(floor->>'name',''))>32 or length(coalesce(floor->>'sub',''))>48
  ) then raise exception 'KeyHQ floor configuration is invalid'; end if;

  insert into public.ks_keyhq_config_v42921(company_id,floors,updated_by_email)
  values(p_company_id,coalesce(p_floors,'[]'::jsonb),v_email)
  on conflict(company_id) do update set floors=excluded.floors,updated_by_email=excluded.updated_by_email,updated_at=now();
  return jsonb_build_object('ok',true,'floors',coalesce(p_floors,'[]'::jsonb));
end;
$$;

revoke all on function public.keysuite_get_keyhq_config_v42921(text) from public,anon;
revoke all on function public.keysuite_save_keyhq_config_v42921(text,jsonb) from public,anon;
grant execute on function public.keysuite_get_keyhq_config_v42921(text) to authenticated;
grant execute on function public.keysuite_save_keyhq_config_v42921(text,jsonb) to authenticated;

commit;
