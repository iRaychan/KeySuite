# Deploy KeySuite V5.00.35

Upload the complete FULL BUILD contents to the existing frontend application root, preserving production config.js, Supabase connection settings and hosting settings. Back up the current frontend before replacing files.

- Frontend upload: required.
- Supabase migration: not required. No migration SQL is supplied for this frontend batch.
- Edge Function deployment: not required.
- New service-worker cache: keysuite-v50035-20261104.
- Bundled PDF libraries under vendor/ must be included in deployment.
- Refresh clients after deployment and verify V5.00.35 is displayed.

Before production promotion, verify direct Product Cost versus Curve Cost using the same actual customer/configuration; repeated curve navigation; CHC/CHCS/CHCN prices; motor/seal component trails; PDF download/metadata in Adobe Acrobat; Dashboard X counter reset; role permissions; and manual quotation overrides.

Existing quotations, history, customer pricing and pump performance datasets require no data rewrite. Do not rerun historical migrations. Rollback restores the backed-up V5.00.34 frontend, with no database rollback.
