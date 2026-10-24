-- KeySuite V4.29.06 — fuel journey settings and model-level rarity.
-- Safe to run more than once after the V4.29.05 migrations.

begin;

alter table public.ks_app_settings
  add column if not exists fuel_efficiency numeric not null default 6.3,
  add column if not exists return_journey boolean not null default true;

update public.ks_app_settings
set fuel_efficiency=case when fuel_efficiency>0 then fuel_efficiency else 6.3 end,
    return_journey=coalesce(return_journey,true)
where id='default';

create or replace function public.keysuite_save_fuel_settings_v42906(
  p_fuel_price numeric,
  p_fuel_efficiency numeric,
  p_return_journey boolean
)
returns table(fuel_price numeric,fuel_base_price numeric,fuel_efficiency numeric,return_journey boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));
begin
  if not exists(
    select 1 from public.ks_user_access ua
    where lower(coalesce(ua.email,''))=v_email
      and lower(coalesce(ua.role,''))='owner'
      and coalesce(ua.active,true)=true
  ) then
    raise exception 'Owner permission is required to change fuel settings.' using errcode='42501';
  end if;
  if p_fuel_price is null or p_fuel_price<0 then raise exception 'Fuel Price must be zero or above.'; end if;
  if p_fuel_efficiency is null or p_fuel_efficiency<=0 then raise exception 'Fuel Efficiency must be greater than zero.'; end if;

  update public.ks_app_settings s
  set fuel_price=p_fuel_price,
      fuel_efficiency=p_fuel_efficiency,
      return_journey=coalesce(p_return_journey,true)
  where s.id='default';

  return query
  select s.fuel_price,s.fuel_base_price,s.fuel_efficiency,s.return_journey
  from public.ks_app_settings s where s.id='default';
end;
$$;

revoke execute on function public.keysuite_save_fuel_settings_v42906(numeric,numeric,boolean) from public,anon;
grant execute on function public.keysuite_save_fuel_settings_v42906(numeric,numeric,boolean) to authenticated;

-- Resolve legacy/imported currency conflicts at model-variant level. A single
-- shared rarity is retained. When priced currencies disagree, precedence is
-- Fixed > Rare > Many > Common. Zero is not quoteable and therefore cannot win
-- a conflict; it remains a populated value for the dashboard completeness count.
create or replace function public.ks_v42906_resolve_model_rarity(
  p_rarities text[],
  p_prices numeric[]
)
returns text
language plpgsql
immutable
set search_path=''
as $$
declare
  v_distinct integer;
begin
  select count(distinct lower(coalesce(nullif(trim(r),''),'common')))
  into v_distinct from unnest(p_rarities) as x(r);
  if v_distinct=1 then
    return lower(coalesce(nullif(trim(p_rarities[1]),''),'common'));
  end if;
  if exists(select 1 from generate_subscripts(p_rarities,1) as x(i) where coalesce(p_prices[i],0)>0 and lower(coalesce(p_rarities[i],''))='fixed') then return 'fixed'; end if;
  if exists(select 1 from generate_subscripts(p_rarities,1) as x(i) where coalesce(p_prices[i],0)>0 and lower(coalesce(p_rarities[i],''))='rare') then return 'rare'; end if;
  if exists(select 1 from generate_subscripts(p_rarities,1) as x(i) where coalesce(p_prices[i],0)>0 and lower(coalesce(p_rarities[i],''))='many') then return 'many'; end if;
  if exists(select 1 from generate_subscripts(p_rarities,1) as x(i) where coalesce(p_prices[i],0)>0 and lower(coalesce(p_rarities[i],''))='common') then return 'common'; end if;
  return 'common';
end;
$$;

revoke execute on function public.ks_v42906_resolve_model_rarity(text[],numeric[]) from public,anon;
grant execute on function public.ks_v42906_resolve_model_rarity(text[],numeric[]) to authenticated;

-- Normalize all existing records once. These explicit source columns preserve
-- NULL-versus-zero semantics where the source schema supports NULL.
do $$
declare
  v text;
begin
  foreach v in array array['chc','chcs','chcn'] loop
    execute format(
      'update public.ks_products_chc set %1$I=%4$s,%2$I=%4$s,%3$I=%4$s',
      v||'_rarity_usd',v||'_rarity_rmb',v||'_rarity_myr',
      format('public.ks_v42906_resolve_model_rarity(array[%1$I,%2$I,%3$I],array[%4$I,%5$I,%6$I])',v||'_rarity_usd',v||'_rarity_rmb',v||'_rarity_myr',v||'_usd',v||'_rmb',v||'_myr')
    );
    execute format(
      'update public.ks_products_chc_g1 set %1$I=%4$s,%2$I=%4$s,%3$I=%4$s',
      v||'_rarity_usd',v||'_rarity_rmb',v||'_rarity_myr',
      format('public.ks_v42906_resolve_model_rarity(array[%1$I,%2$I,%3$I],array[%4$I,%5$I,%6$I])',v||'_rarity_usd',v||'_rarity_rmb',v||'_rarity_myr',v||'_usd',v||'_rmb',v||'_myr')
    );
  end loop;
end;
$$;

update public.ks_products_gws
set rarity_usd=public.ks_v42906_resolve_model_rarity(array[rarity_usd,rarity_rmb,rarity_myr],array[price_usd,price_rmb,price_myr]),
    rarity_rmb=public.ks_v42906_resolve_model_rarity(array[rarity_usd,rarity_rmb,rarity_myr],array[price_usd,price_rmb,price_myr]),
    rarity_myr=public.ks_v42906_resolve_model_rarity(array[rarity_usd,rarity_rmb,rarity_myr],array[price_usd,price_rmb,price_myr]);

do $$
declare
  v text;
  p text;
begin
  foreach v in array array['cr','crs','crn'] loop
    execute format(
      'update public.ks_products_cr set %1$I=%4$s,%2$I=%4$s,%3$I=%4$s',
      v||'_rarity_usd',v||'_rarity_rmb',v||'_rarity_myr',
      format('public.ks_v42906_resolve_model_rarity(array[%1$I,%2$I,%3$I],array[%4$I,%5$I,%6$I])',v||'_rarity_usd',v||'_rarity_rmb',v||'_rarity_myr',v||'_usd',v||'_rmb',v||'_myr')
    );
  end loop;
  foreach p in array array['','bfin_'] loop
    foreach v in array array['1ph','3ph'] loop
      execute format(
        'update public.ks_products_bfi set %1$I=%4$s,%2$I=%4$s,%3$I=%4$s',
        'rarity_'||p||'usd_'||v,'rarity_'||p||'rmb_'||v,'rarity_'||p||'myr_'||v,
        format('public.ks_v42906_resolve_model_rarity(array[%1$I,%2$I,%3$I],array[%4$I,%5$I,%6$I])','rarity_'||p||'usd_'||v,'rarity_'||p||'rmb_'||v,'rarity_'||p||'myr_'||v,'price_'||p||'usd_'||v,'price_'||p||'rmb_'||v,'price_'||p||'myr_'||v)
      );
    end loop;
  end loop;
end;
$$;

-- A changed currency is authoritative for future edits. Inserts and price-only
-- updates use the same source-aware conflict resolver.
create or replace function public.ks_v42906_chc_model_rarity()
returns trigger language plpgsql set search_path='' as $$
declare v text;r text;
begin
  foreach v in array array['chc','chcs','chcn'] loop
    if tg_op='UPDATE' and to_jsonb(new)->>(v||'_rarity_usd') is distinct from to_jsonb(old)->>(v||'_rarity_usd') then
      new:=jsonb_populate_record(new,jsonb_build_object(v||'_rarity_rmb',to_jsonb(new)->>(v||'_rarity_usd'),v||'_rarity_myr',to_jsonb(new)->>(v||'_rarity_usd')));
    elsif tg_op='UPDATE' and to_jsonb(new)->>(v||'_rarity_rmb') is distinct from to_jsonb(old)->>(v||'_rarity_rmb') then
      new:=jsonb_populate_record(new,jsonb_build_object(v||'_rarity_usd',to_jsonb(new)->>(v||'_rarity_rmb'),v||'_rarity_myr',to_jsonb(new)->>(v||'_rarity_rmb')));
    elsif tg_op='UPDATE' and to_jsonb(new)->>(v||'_rarity_myr') is distinct from to_jsonb(old)->>(v||'_rarity_myr') then
      new:=jsonb_populate_record(new,jsonb_build_object(v||'_rarity_usd',to_jsonb(new)->>(v||'_rarity_myr'),v||'_rarity_rmb',to_jsonb(new)->>(v||'_rarity_myr')));
    else
      r:=public.ks_v42906_resolve_model_rarity(array[to_jsonb(new)->>(v||'_rarity_usd'),to_jsonb(new)->>(v||'_rarity_rmb'),to_jsonb(new)->>(v||'_rarity_myr')],array[(to_jsonb(new)->>(v||'_usd'))::numeric,(to_jsonb(new)->>(v||'_rmb'))::numeric,(to_jsonb(new)->>(v||'_myr'))::numeric]);
      new:=jsonb_populate_record(new,jsonb_build_object(v||'_rarity_usd',r,v||'_rarity_rmb',r,v||'_rarity_myr',r));
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists ks_v42906_chc_model_rarity on public.ks_products_chc;
create trigger ks_v42906_chc_model_rarity before insert or update on public.ks_products_chc
for each row execute function public.ks_v42906_chc_model_rarity();
drop trigger if exists ks_v42906_chc_g1_model_rarity on public.ks_products_chc_g1;
create trigger ks_v42906_chc_g1_model_rarity before insert or update on public.ks_products_chc_g1
for each row execute function public.ks_v42906_chc_model_rarity();

create or replace function public.ks_v42906_gws_model_rarity()
returns trigger language plpgsql set search_path='' as $$
declare v text;
begin
  if tg_op='UPDATE' and new.rarity_usd is distinct from old.rarity_usd then v:=new.rarity_usd;
  elsif tg_op='UPDATE' and new.rarity_rmb is distinct from old.rarity_rmb then v:=new.rarity_rmb;
  elsif tg_op='UPDATE' and new.rarity_myr is distinct from old.rarity_myr then v:=new.rarity_myr;
  else v:=public.ks_v42906_resolve_model_rarity(array[new.rarity_usd,new.rarity_rmb,new.rarity_myr],array[new.price_usd,new.price_rmb,new.price_myr]); end if;
  new.rarity_usd:=coalesce(v,'common');new.rarity_rmb:=coalesce(v,'common');new.rarity_myr:=coalesce(v,'common');return new;
end;
$$;

drop trigger if exists ks_v42906_gws_model_rarity on public.ks_products_gws;
create trigger ks_v42906_gws_model_rarity before insert or update on public.ks_products_gws
for each row execute function public.ks_v42906_gws_model_rarity();

create or replace function public.ks_v42906_cr_model_rarity()
returns trigger language plpgsql set search_path='' as $$
declare v text;k text;
begin
  foreach k in array array['cr','crs','crn'] loop
    if tg_op='UPDATE' and to_jsonb(new)->>(k||'_rarity_usd') is distinct from to_jsonb(old)->>(k||'_rarity_usd') then v:=to_jsonb(new)->>(k||'_rarity_usd');
    elsif tg_op='UPDATE' and to_jsonb(new)->>(k||'_rarity_rmb') is distinct from to_jsonb(old)->>(k||'_rarity_rmb') then v:=to_jsonb(new)->>(k||'_rarity_rmb');
    elsif tg_op='UPDATE' and to_jsonb(new)->>(k||'_rarity_myr') is distinct from to_jsonb(old)->>(k||'_rarity_myr') then v:=to_jsonb(new)->>(k||'_rarity_myr');
    else v:=public.ks_v42906_resolve_model_rarity(array[to_jsonb(new)->>(k||'_rarity_usd'),to_jsonb(new)->>(k||'_rarity_rmb'),to_jsonb(new)->>(k||'_rarity_myr')],array[(to_jsonb(new)->>(k||'_usd'))::numeric,(to_jsonb(new)->>(k||'_rmb'))::numeric,(to_jsonb(new)->>(k||'_myr'))::numeric]); end if;
    new:=jsonb_populate_record(new,jsonb_build_object(k||'_rarity_usd',coalesce(v,'common'),k||'_rarity_rmb',coalesce(v,'common'),k||'_rarity_myr',coalesce(v,'common')));
  end loop;return new;
end;
$$;

drop trigger if exists ks_v42906_cr_model_rarity on public.ks_products_cr;
create trigger ks_v42906_cr_model_rarity before insert or update on public.ks_products_cr
for each row execute function public.ks_v42906_cr_model_rarity();

create or replace function public.ks_v42906_bfi_model_rarity()
returns trigger language plpgsql set search_path='' as $$
declare v text;k text;prefix text;
begin
  foreach prefix in array array['','bfin_'] loop
    foreach k in array array['1ph','3ph'] loop
      if tg_op='UPDATE' and to_jsonb(new)->>('rarity_'||prefix||'usd_'||k) is distinct from to_jsonb(old)->>('rarity_'||prefix||'usd_'||k) then v:=to_jsonb(new)->>('rarity_'||prefix||'usd_'||k);
      elsif tg_op='UPDATE' and to_jsonb(new)->>('rarity_'||prefix||'rmb_'||k) is distinct from to_jsonb(old)->>('rarity_'||prefix||'rmb_'||k) then v:=to_jsonb(new)->>('rarity_'||prefix||'rmb_'||k);
      elsif tg_op='UPDATE' and to_jsonb(new)->>('rarity_'||prefix||'myr_'||k) is distinct from to_jsonb(old)->>('rarity_'||prefix||'myr_'||k) then v:=to_jsonb(new)->>('rarity_'||prefix||'myr_'||k);
      else v:=public.ks_v42906_resolve_model_rarity(array[to_jsonb(new)->>('rarity_'||prefix||'usd_'||k),to_jsonb(new)->>('rarity_'||prefix||'rmb_'||k),to_jsonb(new)->>('rarity_'||prefix||'myr_'||k)],array[(to_jsonb(new)->>('price_'||prefix||'usd_'||k))::numeric,(to_jsonb(new)->>('price_'||prefix||'rmb_'||k))::numeric,(to_jsonb(new)->>('price_'||prefix||'myr_'||k))::numeric]); end if;
      new:=jsonb_populate_record(new,jsonb_build_object('rarity_'||prefix||'usd_'||k,coalesce(v,'common'),'rarity_'||prefix||'rmb_'||k,coalesce(v,'common'),'rarity_'||prefix||'myr_'||k,coalesce(v,'common')));
    end loop;
  end loop;return new;
end;
$$;

drop trigger if exists ks_v42906_bfi_model_rarity on public.ks_products_bfi;
create trigger ks_v42906_bfi_model_rarity before insert or update on public.ks_products_bfi
for each row execute function public.ks_v42906_bfi_model_rarity();

commit;
