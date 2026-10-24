-- KeySuite V4.28.58 — verify the CR mechanical-seal add-on installation.
do $$
begin
  if to_regclass('public.ks_cr_mechanical_seal_addons') is null then
    raise exception 'ks_cr_mechanical_seal_addons is missing';
  end if;
  if (select count(*) from public.ks_cr_mechanical_seal_addons) <> 15 then
    raise exception 'Expected 15 CR mechanical-seal add-on rows';
  end if;
  if to_regprocedure('public.keysuite_save_cr_mechanical_seal_addons_v42858(text,numeric,numeric,numeric,numeric,numeric)') is null then
    raise exception 'CR mechanical-seal save RPC is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.ks_cr_mechanical_seal_addons'::regclass) then
    raise exception 'RLS is not enabled for CR mechanical-seal add-ons';
  end if;
end
$$;
