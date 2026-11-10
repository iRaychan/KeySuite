# KeySuite V5.00.61 / KeyStock V1.03 upgrade package

This development upgrade applies to the supplied, unmodified **KeySuite V5.00.60 FULL BUILD**. It contains the changed files for Checkpoint B and the Mac Safari quotation PDF preview restoration. It has **not** been deployed.

The archive preserves relative paths. Before any production use, verify a fresh restorable Supabase backup and the exact V5.00.60 deployment. Apply `supabase/migrations/20261109231350_keystock_v103_series_options.sql` and the changed application files as one controlled release. After release, reload the application so its service worker uses the new cache. Do not install the changed client without the database migration. Production deployment requires the owner's separate approval.

The migration adds series-scoped Critical/Normal options, option revisions, inheritance and permission-checked API actions. It seeds no data, clears no stock, and changes no KeySuite quotation/product/selection tables or user permissions. `supabase/rollback_keystock_v103_before_use.sql` can reverse it only before a series option has been saved; it refuses later to protect data.

The four-column Dropdown Management interface and Mac Safari quotation PDF preview are described in `CHECKPOINT_B_V50061_REVIEW.md`. The Pricelist Link mapping engine is reserved for Checkpoint C.

`UPGRADE_FILE_MANIFEST_V50061.json` lists every archive file and SHA-256 digest. The archive includes local verification tests and screenshots under `tests/` and `review-v50061/`; those paths are review aids, not website assets required for operation. No production database changes have been made by preparing this ZIP.
