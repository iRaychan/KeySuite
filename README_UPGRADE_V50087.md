# V5.00.87 review and installation

Baseline: the supplied KeySuite V5.00.86 FULL ZIP. The UPGRADE ZIP is an exact overlay; no deletions are required. FULL contains the complete baseline plus the correction.

Nothing has been deployed or migrated. Production resolution remains unverified until approved installation and live user checks.

After approval, install `supabase/migrations/20261124100000_v50087_quotation_history_summaries.sql` as one transaction, then overlay the application files. This adds derived summary rows and maintenance triggers; it never updates the source quotations or archives. Current save/delete RPCs and existing policies remain unchanged. Do not upload local backups as a migration step.

Deploying the application without the migration displays a setup error and preserves local backup mode; it deliberately does not retry the expensive legacy bulk-list RPC. Reload the application to activate the new service worker cache.

Verify owner and Own/None accounts, first/older pages, global quotation/customer/project/model search, month/user filters and Clear Filters. Open known quotations and generate their PDFs. Verify an authorised second device displays equivalent central records. Test a temporary outage and Retry without clearing storage. Production save/revision testing requires separately authorised test records or a staging database.

Rollback: first restore the supplied V5.00.86 application, then run `proposals/V5.00.87_ROLLBACK.sql` only after approval. The old RPC, original quotations, archives and local backups are retained. A schema rollback is optional when restoring the old application; the projection can remain without changing legacy read behavior.

Do not run historical migration folders wholesale. Do not apply unrelated approval proposals. KeyStock remains V1.04, with A/B/C code unchanged; Part D is excluded.
