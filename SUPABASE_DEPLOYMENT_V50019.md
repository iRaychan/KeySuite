# Supabase Deployment — V5.00.19

- Project: KeySuite (`skidqdixnnnuhvarekxp`)
- Project status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.6.1.147
- Migration: `20261031121319_v50019_bgf_catalogue_metadata`
- Status: deployed and verified on 2026-10-31

The migration keeps the legacy `bgf-500` row ID and all stored prices, changes its approved catalogue name and source model to `BGF 550`, and records `004 - BGF 261030 - V1.0.xlsx` as the source workbook for all four active BGF rows.

Production verification found 39 active KV models, one KV1 add-on row, both KV write RPCs, and all three required V5.00.17 KV migrations. No V5.00.19 Edge Function source changed, so no Edge Function was redeployed.

The Supabase advisors still report pre-existing project-wide security and performance findings unrelated to this narrow metadata migration. This release did not broaden access, change RLS, or modify the frozen quotation PDF workflow.

GitHub and frontend hosting were not changed.
