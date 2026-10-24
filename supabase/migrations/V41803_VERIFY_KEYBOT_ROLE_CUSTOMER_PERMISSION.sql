-- KeySuite V4.18.03 verification — KeyBot Role Customer Permission

select
  to_regprocedure('public.keysuite_v41803_keybot_customer_access(text,text)') is not null
    as customer_access_rpc_installed,
  to_regprocedure('public.keysuite_v41802_keybot_available_products(text,text)') is not null
    as available_product_rpc_installed;

-- Inspect the Role Customer permission matrix currently saved in KeySuite.
select
  rp.role,
  lower(trim(coalesce(rp.permissions->>'view_customers','<not saved>'))) as view_customers
from public.ks_role_permissions rp
order by lower(rp.role);

-- Manual service-role checks (replace values):
--
-- A) Role view_customers = all
-- select public.keysuite_v41803_keybot_customer_access(
--   'user@example.com',
--   '<ACTIVE_CUSTOMER_ASSIGNED_TO_SOMEONE_ELSE>'
-- );
-- Expected: allowed=true, scope='all'.
--
-- B) Role view_customers = own / self / assigned
-- select public.keysuite_v41803_keybot_customer_access(
--   'user@example.com',
--   '<CUSTOMER_ASSIGNED_TO_SAME_USER>'
-- );
-- Expected: allowed=true, scope='assigned'.
--
-- Same user + Customer assigned to another user:
-- Expected: allowed=false, code='CUSTOMER_NOT_ASSIGNED_TO_USER'.
--
-- C) Role view_customers = none
-- Expected for any Customer:
-- allowed=false, code='CUSTOMER_PERMISSION_NONE', scope='none'.
--
-- D) Product list follows the same Customer access before intersecting
-- User Brand Assigned and Customer Brand / Series Price Preference:
-- select public.keysuite_v41802_keybot_available_products(
--   'user@example.com',
--   '<CUSTOMER_ID>'
-- );
