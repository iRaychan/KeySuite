# Supabase Deployment — V5.00.17

- Project: KeySuite (`skidqdixnnnuhvarekxp`)
- Status: `ACTIVE_HEALTHY`
- Migration: `20261031063308_v50017_kv_integration`
- Hotfix: `20261031064259_v50017_kv_category_updated_at_hotfix`
- Material/O-Ring pricing: `20261031075208_v50017_kv_material_oring_pricing`
- Active KV models: 39, workbook rows 4–42
- KV multipliers: USD 5.8, RMB 0.65
- RLS: enabled for KV products and KV Material/O-Ring add-on pricing
- Access: authenticated users can read active KV prices and add-ons; anonymous access is revoked; pricing mutations require an active Owner record
- Verification: KV Category save succeeded in a rolled-back production transaction; no category values were changed by the test
- Advisors: the authenticated KV write RPCs carry the expected `SECURITY DEFINER` warning because they intentionally bypass table RLS after enforcing the active Owner check; anonymous execution remains revoked
- Edge Functions: unchanged; no deployment required
- GitHub Pages: not modified
