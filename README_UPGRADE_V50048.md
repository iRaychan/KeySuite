# KeySuite V5.00.48 upgrade

The upgrade applies to the GitHub Pages-corrected V5.00.47 source at commit
`082d8009c19f0962bd7ca2c84ab08086e5741f1b`. The full build is a repository source
snapshot. The upgrade ZIP contains changed files only and must be overlaid onto
that GitHub baseline. Both ZIPs use repository-root paths.

## Stage and verify

1. Back up the frontend and database. Start from a clean GitHub checkout and
   review any changes since the listed baseline. Extract the upgrade into a
   temporary folder first, then apply its files to a staging branch. Preserve
   `.github/workflows/pages.yml`, `tools/build_pages.py`, `.gitignore`, `CNAME`,
   and the deployment environment's `config.js`.
2. With separate approval, apply
   `supabase/migrations/20261107094120_v50048_quotation_customer_names.sql`
   to staging. The migration adds one nullable customer column and asks
   PostgREST to refresh its schema cache. Contact aliases use the existing
   `contacts` JSONB array. Existing row policies apply to both fields.
3. Test a customer with two contacts, a blank save-name fallback, an older
   quotation, and a new quotation with a manual price and optional heading.
   Save, reopen, seal and revise the new quotation. Compare both PDF export
   paths and verify filename dates, leading zeros and revision suffixes.
   Confirm an authorized customer editor can save the aliases and another
   company cannot read or write the row. Use disposable staging records.
4. Track the changed files in Git, run `python3 tools/build_pages.py`, and
   review `_pages-report/summary.json`. On this baseline expect 394 files.
   Publish only `_site/`. The workflow uploads the report separately.

## Production, after approval

Apply the tested SQL migration first and verify the nullable column is visible
through the customer API. Then merge the reviewed release PR to `main`.
Keep Pages Source set to GitHub Actions. Verify both build and deploy jobs in
**Publish KeySuite website**, inspect the publication inventory and check the
custom domain serves release `5.00.48`. Smoke-test the approved signed-in
workflows using an authorized test account.

Supabase Edge Function deployment **NO**. Supabase database migration **YES**.
No data seed is required.

## Rollback

Revert the release application changes and deploy the previous application
through the same Pages workflow. The nullable column can remain in place.
Do not drop the column or remove contact JSON keys as part of frontend rollback.
If removal is later required, export the stored aliases first and review the
schema change separately.
