# V5.00.33 deployment

Read CHANGELOG_AND_TESTS_V5.00.33.md before production promotion. This release requires a frontend upload.

1. Back up the currently hosted frontend.
2. Deploy the complete FULL BUILD through the existing KeySuite hosting workflow. Preserve the production Supabase URL/key configuration.
3. Confirm the existing V5.00.31 migration and keysuite_can_view_costing_breakdown_v50031 RPC are present.
4. No new SQL migration, Edge Function deployment or Supabase configuration change is required.
5. Refresh the browser to activate service-worker cache keysuite-v50033-20261103.
6. Perform authenticated staging acceptance for customer Price/Curve save and reload, role denial, matching Product/Selection pricing, a complete System BOM, actual Motor Pricelist matching, manual overrides, and Windows/macOS Safari PDF viewers.

No production deployment or database mutation was performed during this build. Historical SQL and release notes are included as references; do not rerun all historical migrations.

Rollback: restore the backed-up frontend. No database rollback is required.
