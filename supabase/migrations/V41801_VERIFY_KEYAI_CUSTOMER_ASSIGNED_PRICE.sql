-- KeySuite V4.18.01 — verification helper
-- Run after V41801_KEYAI_CUSTOMER_ASSIGNED_PRICE.sql.
-- This file is read-only verification; edit the sample IDs before executing calls.

-- 1) Inspect customers and their category assignments.
select
  c.id,
  c.company_id,
  c.company_name,
  c.pricing_category_id,
  pc.category_name
from public.ks_customers c
left join public.ks_pricing_categories pc on pc.id=c.pricing_category_id
where coalesce(c.status,'active')='active'
order by c.company_name;

-- 2) Inspect the V4.17.10 Customer Brand / Series Price Preference rows.
select
  p.company_id,
  p.customer_id,
  c.company_name,
  p.selection->'price_keys' as price_keys,
  p.updated_at
from public.ks_customer_brand_price_preference_v41710 p
left join public.ks_customers c on c.id::text=p.customer_id
order by p.updated_at desc;

-- 3) Service-role examples (run only with real values):
-- select public.keysuite_v41801_customer_price_assignment(
--   'linked-user@example.com',
--   '<CUSTOMER_ID>',
--   'B.G.Reich',
--   'CHC_G2'
-- );
--
-- Expected when the customer's B.G.Reich / CHC G2 Price checkbox is ticked:
--   "allowed": true
--
-- Expected when unticked or never assigned:
--   "allowed": false,
--   "code": "PRICE_NOT_ASSIGNED"
--
-- GWS:
-- select public.keysuite_v41801_customer_price_assignment(
--   'linked-user@example.com','<CUSTOMER_ID>','GWS','GWS'
-- );
--
-- KeyPLC Panel:
-- select public.keysuite_v41801_customer_price_assignment(
--   'linked-user@example.com','<CUSTOMER_ID>','Keylargo','KEYPLC'
-- );
