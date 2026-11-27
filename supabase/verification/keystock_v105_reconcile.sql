-- Run on a V1.05 staging copy with a database operator role. All counts must be zero.
with expected_lines as (
  select b.company_id,c.item_key,b.quantity
  from keystock.opening_balances b join keystock.configurations c
    on (c.company_id,c.id)=(b.company_id,b.configuration_id) where b.voided_at is null
  union all
  select company_id,item_key,case when kind in ('issue','write_off') then -quantity else quantity end
  from keystock.stock_events where kind in ('receive','return','adjust','issue','write_off')
  union all
  select r.company_id,c.item_key,r.corrected_quantity-r.previous_quantity
  from keystock.receipt_corrections_v105 r join keystock.positions p on (p.company_id,p.id)=(r.company_id,r.position_id)
  join keystock.configurations c on (c.company_id,c.id)=(p.company_id,p.configuration_id)
), expected as (
  select company_id,item_key,sum(quantity) as quantity from expected_lines group by company_id,item_key
), actual as (
  select p.company_id,c.item_key,sum(p.quantity+(select count(*) from keystock.incomplete_units_v105 u
    where (u.company_id,u.position_id)=(p.company_id,p.id) and u.closed_at is null)) as quantity
  from keystock.positions p join keystock.configurations c on (c.company_id,c.id)=(p.company_id,p.configuration_id)
  group by p.company_id,c.item_key
)
select 'physical stock = opening + receipts + returns + additions - issues - write-offs + corrections' as check_name,
  count(*) as discrepancy_count from expected e full join actual a using(company_id,item_key)
  where coalesce(e.quantity,0)<>coalesce(a.quantity,0)
union all
select 'complete stock covers active reservations',count(*) from keystock.positions p
  where p.quantity<(select coalesce(sum(a.remaining),0) from keystock.allocations a
    where (a.company_id,a.position_id)=(p.company_id,p.id))
union all
select 'open incomplete units have outstanding components and retain their source',count(*)
  from keystock.incomplete_units_v105 u join keystock.positions p on (p.company_id,p.id)=(u.company_id,u.position_id)
  where (u.closed_at is null)<>exists(select 1 from keystock.missing_components_v105 m
    where (m.company_id,m.unit_id)=(u.company_id,u.id) and m.restored_event is null)
    or u.closed_at is null and (p.configuration_id<>u.configuration_id or p.location_id is distinct from u.location_id)
union all
select 'retained component balance is never overdrawn',count(*) from keystock.missing_components_v105 m
  where (select coalesce(sum(r.quantity),0) from keystock.missing_components_v105 r
    where (r.company_id,r.spare_source)=(m.company_id,m.id))>case when m.purpose='spare' then m.quantity else 0 end
union all
select 'serialised complete units remain assigned to their positions',count(*) from keystock.positions p
  join keystock.lots l on (l.company_id,l.id)=(p.company_id,p.lot_id) where l.serialised and p.quantity<>
    (select count(*) from keystock.serial_units s where (s.company_id,s.position_id)=(p.company_id,p.id))
union all
select 'held serials are unavailable in the complete and issued pools',count(*) from keystock.incomplete_units_v105 u
  join keystock.serial_units s on (s.company_id,s.serial_key)=(u.company_id,u.serial_key)
  where u.closed_at is null and (s.position_id is not null or s.issued_by_event is not null)
union all
select 'new stock tables have RLS and no client table access',count(*) from pg_class t join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='keystock' and t.relkind='r' and t.relname like '%\_v105' escape '\'
    and (not t.relrowsecurity or has_table_privilege('authenticated',t.oid,'SELECT,INSERT,UPDATE,DELETE')
      or has_table_privilege('anon',t.oid,'SELECT,INSERT,UPDATE,DELETE'));
