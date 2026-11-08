-- Read-only staging checks after applying the V1.02 migration.
-- Every discrepancy count must be zero. The totals include historical excluded families.
with opening as (
  select b.company_id,c.item_key,sum(b.quantity) as quantity
  from keystock.opening_balances b
  join keystock.configurations c on (c.company_id,c.id)=(b.company_id,b.configuration_id)
  where b.voided_at is null group by b.company_id,c.item_key
), delta as (
  select company_id,item_key,sum(case
    when kind in ('receive','return','adjust') then quantity
    when kind in ('issue','write_off') then -quantity else 0 end) as quantity
  from keystock.stock_events group by company_id,item_key
), expected as (
  select company_id,item_key,coalesce(o.quantity,0)+coalesce(d.quantity,0) as quantity
  from opening o full join delta d using(company_id,item_key)
), actual as (
  select p.company_id,c.item_key,sum(p.quantity) as quantity
  from keystock.positions p join keystock.configurations c
    on (c.company_id,c.id)=(p.company_id,p.configuration_id)
  group by p.company_id,c.item_key
)
select 'physical quantity reconciliation' as check_name,count(*) as discrepancy_count
from expected e full join actual a using(company_id,item_key)
where coalesce(e.quantity,0)<>coalesce(a.quantity,0)
union all
select 'opening provenance and cost',count(*)
from keystock.opening_balances b
left join keystock.purchase_costs k on (k.company_id,k.opening_id)=(b.company_id,b.id)
left join keystock.lots l on (l.company_id,l.opening_id)=(b.company_id,b.id)
where (b.voided_at is null and (l.id is null or l.id<>b.id or l.received_on is not null
  or l.fifo_at<>b.created_at or l.unit_cost_myr is distinct from k.unit_cost_myr))
  or (b.voided_at is not null and l.id is not null)
union all
select 'reservations greater than physical stock',count(*)
from keystock.positions p
where p.quantity < (select coalesce(sum(a.remaining),0) from keystock.allocations a
  where a.company_id=p.company_id and a.position_id=p.id)
union all
select 'reservation allocations reconcile',count(*)
from keystock.reservations r
where (case when r.released_at is null then r.quantity-r.fulfilled else 0 end) <>
  (select coalesce(sum(a.remaining),0) from keystock.allocations a
    where a.company_id=r.company_id and a.reservation_id=r.id)
union all
select 'serial quantity reconciliation',count(*)
from keystock.positions p join keystock.lots l on (l.company_id,l.id)=(p.company_id,p.lot_id)
where (case when l.serialised then p.quantity else 0 end) <>
  (select count(*) from keystock.serial_units u where u.company_id=p.company_id and u.position_id=p.id)
union all
select 'private table grant / RLS',count(*)
from pg_class t join pg_namespace n on n.oid=t.relnamespace
where n.nspname='keystock' and t.relkind='r' and (
  not t.relrowsecurity or has_table_privilege('authenticated',t.oid,'SELECT,INSERT,UPDATE,DELETE')
  or has_table_privilege('anon',t.oid,'SELECT,INSERT,UPDATE,DELETE'));
