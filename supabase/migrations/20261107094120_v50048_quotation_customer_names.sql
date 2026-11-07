-- Existing contacts are stored as JSONB. Optional per-contact quotation names
-- use that existing structure and the same customer row access policies.
begin;
set local lock_timeout = '5s';
alter table public.ks_customers
  add column quotation_assigned_save_name text;
notify pgrst, 'reload schema';
commit;
