# KeySuite V4.29.21 verification

- Source baseline: user-supplied V4.29.20 full-clean ZIP; SHA-256 matched the retained workspace copy.
- JavaScript syntax: PASS for the V4.29.21 launcher, KeyHQ app, bootstrap, version lock and service worker.
- `keyhq-integration-regression.cjs`: PASS.
- `v42921-release-regression.cjs`: PASS.
- `v42921-version-lock.cjs`: PASS.
- Preserved `v42920-release-regression.cjs`: PASS for quotation numbering, atomic save and compact backup behavior.
- Preserved `v42920-version-lock.cjs`: PASS.
- Visual verification: PASS at desktop viewport for full tower and isolated lobby; original Keylargo logo renders at reception and differentiated rooms remain legible.
- Security inspection: KeyBot inbox and activity queries contain the signed-in company filter; unauthorized KeyHQ contexts receive no enquiry payload; frame messages require the same origin.

Deployment checks still required in the target Supabase project:

1. Apply both V4.29.21 migrations.
2. Deploy `supabase/functions/keysuite-keyai`.
3. Confirm a connected-empty Telegram inbox never shows demo content as live.
4. Confirm two companies cannot see each other's KeyBot enquiries.
