-- KeySuite V4.18.02 verification — Guided KeyBot request menu

select to_regprocedure('public.keysuite_v41802_keybot_available_products(text,text)') is not null
  as available_product_rpc_installed;

-- Confirm central sources are present.
select
  to_regclass('public.ks_customer_brand_price_preference_v41710') is not null as customer_price_preference_present,
  to_regclass('public.ks_user_selection_scope_v41706') is not null as user_brand_scope_present,
  to_regclass('public.ks_keybot_sessions_v41300') is not null as keybot_session_present;

-- Manual service-role test (replace values):
-- select public.keysuite_v41802_keybot_available_products(
--   'user@example.com',
--   '<CUSTOMER_ID>'
-- );
--
-- Expected:
-- 1. Customer must be assigned to that same user email.
-- 2. products[] contains only Customer Price Preference keys also allowed by
--    the User Role Brand Assigned scope.
-- 3. CHC_G2 and ES return has_curve=true.
-- 4. CHC_G1/MOTOR/BASEPLATE/COUPLING/KEYPLC/MANIFOLD/GWS return has_curve=false.
-- 5. A Price Preference that is not in User Brand Assigned must not appear.
