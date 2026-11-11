# KeySuite V5.00.64 upgrade from V5.00.63

This archive contains only files changed from the supplied V5.00.63 FULL BUILD, plus the new ISO Baseplate migration and review notes. Apply it over a complete V5.00.63 installation, preserving the folder paths shown in the archive. Do not use it as a standalone installation.

Before production rollout, back up the current application and database. Review and explicitly approve `supabase/migrations/20261111090000_v50064_iso_baseplate_costing.sql` before applying it. The migration adds an independent, initially empty ISO Baseplate price book. Do not copy ES prices into ISO. Then upload the upgrade files and check the displayed version is V5.00.64.

Verify Product and Selection model identities for all CR/KV materials; quotation creation, reopen, copy, clone and PDF; CHCN description; KeyPLC buttons; and ISO Baseplate Price List, Costing Audit, Assembly and Quote using real ISO source values entered after the migration. The automated browser suite could not run in the preparation environment because Playwright was unavailable, so production deployment requires this review.

To roll back the application, restore the V5.00.63 files. The additive ISO database column can remain unused. Before any separately approved database rollback, export ISO entries; dropping the column would delete them. No production migration or deployment has been performed while preparing this ZIP.
