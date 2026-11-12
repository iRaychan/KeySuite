# KeySuite V5.00.65 focused update

Baseline: V5.00.64. Apply the UPGRADE ZIP over a verified V5.00.64 installation, or deploy the FULL BUILD ZIP to a review environment. Do not use either archive to overwrite live data.

Changes: floating Back history; ISO Baseplate reference workflow with its independent cost book; CR/KV material model prefixes; ES quote brand handoff; BSW 80F30-2 motor power (2.2 kW / 3 HP).

Database: `supabase/migrations/20261112010000_v50065_bsw_80f30_motor_power.sql` is a guarded, one-row correction. Review and approve it before applying to production. It does not change prices, stock, or history. The original BSW seed is corrected for fresh installations.

Validation performed: JavaScript syntax checks on changed modules; static checks of ISO costing separation, CR/KV prefix refresh and ES brand handoff; runtime data check of the corrected BSW catalogue record; ZIP integrity checks. Browser acceptance flows, live quotation PDF output, and production database state remain unverified. Test these in Safari on a review deployment before production release.

Rollback: retain the V5.00.64 full build and redeploy it if needed. The guarded BSW correction should normally be retained because it fixes source data; if a data rollback is explicitly required, review the affected row and its history first. Clear the site service worker cache or reload after switching builds.
