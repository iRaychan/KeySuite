select generation_code,group_code,min_series,max_series,sic_sic_myr,tc_tc_myr
from public.ks_chc_mechanical_seal_addons
order by generation_code,min_series;

do $$
begin
  if (select count(*) from public.ks_chc_mechanical_seal_addons)<>8 then
    raise exception 'Expected 8 CHC Mechanical Seal Add-On rows (4 for each generation).';
  end if;
end
$$;
