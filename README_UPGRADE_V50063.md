KeySuite V5.00.63 upgrade from V5.00.62 Fixed Brand

Review build only. Back up the existing application and database before upgrade.
Apply changed files over the V5.00.62 Fixed Brand build, preserving all other files.
The included Supabase migration is PREPARED ONLY. Do not run it or deploy this build before approval.
New KVD/KVSD price saving requires that migration. Existing KV prices and records are untouched by the prepared SQL.
Rollback: restore the V5.00.62 Fixed Brand application build; do not delete existing KV prices or quotation records.
