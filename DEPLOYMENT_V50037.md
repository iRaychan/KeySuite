# Deployment — V5.00.37

Frontend deployment alone is insufficient for Old Bug 010.

1. Back up the current frontend and database. Use a staging database with the existing V5.00.36 schema and migrations already installed.
2. Review and apply only the new incremental migration `supabase/migrations/20261104230000_v50037_quotation_number_occupancy.sql`. It changes functions only; it does not rewrite quotations, prices, customers or business rules. Never rerun all bundled historical migrations.
3. Upload the complete build contents, preserving the destination's production config.js and hosting configuration. Activate cache keysuite-v50037-20261104 and reload clients. Verify V5.00.37.
4. Staging numbering cases: existing 0250/0253/0254 → automatic 0255; manually save unused 0251/0252/0258 unchanged; after 0258 save → automatic 0259; attempt the same reference concurrently from two sessions and confirm one success and one clear duplicate error. Verify original and revision references in history/PDF. Verify no number is silently substituted.
5. Verify BSW all-variant save/reload and atomic rejection; compare direct/Curve/Selection Cost for the same customer and variant; exercise CHC/CR/KV configuration propagation; inspect original/revised multipage PDFs on macOS and Windows.
6. Approve ISO business values separately through Key → Category. No business values are inserted by this migration.
7. Promote only after staging acceptance and explicit production approval.

No Edge Function deployment is needed. New save RPCs fail closed when missing. Rollback: restore the backed-up V5.00.36 frontend and prior database function definitions if reverting numbering behavior. Retain all saved data; do not delete quotations or pricing rows.
