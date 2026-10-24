-- KeySuite V4.18.04 verification — DO NOT push as a migration.
-- Run manually after V41804_KEYBOT_SENDER_SAVE_PRODUCT_PERMISSION.sql.

-- 1) Confirm new sender-save RPC exists.
select to_regprocedure('public.keysuite_v41804_assign_keybot_sender(text,text,text,text,text)') as sender_save_rpc;

-- 2) Confirm guided product RPC exists.
select to_regprocedure('public.keysuite_v41802_keybot_available_products(text,text)') as product_rpc;

-- 3) Inspect Role Product permission values currently saved.
select company_id, role,
       permissions->>'use_product' as use_product,
       permissions->>'view_customers' as view_customers,
       permissions->>'keyai_sender_assign' as keyai_sender_assign
from public.ks_role_permissions
order by company_id, role;

-- 4) Inspect current Telegram sender links.
select keysuite_company_id, sender_id, keysuite_user_email, customer_id,
       response_mode, active, updated_at
from public.ks_keyai_sender_customer_v40903
where channel='telegram'
order by updated_at desc nulls last;

-- 5) Product test (service-role context / SQL editor).
-- Replace with a real linked user + selected Customer ID.
-- select public.keysuite_v41802_keybot_available_products(
--   'owner@example.com',
--   '<CUSTOMER_ID>'
-- );
-- Expected when Role use_product=full and Customer has Price Preference:
--   allowed=true, product_scope='all', products=[...customer price-assigned products...]
