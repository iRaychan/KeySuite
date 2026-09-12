# KeySuite V4.26.05 FULL CLEAN

Baseline: V4.26.04.

Changes:
- Keeps all V4.26.04 KeyBot CHC C4/C6 assignment-aware sizing and smooth non-zero Power curve fixes.
- Shrinks the `telegram-webhook` deploy source by moving the large frozen-layout PDF logo / CHC C6 dimension / ES dimension artwork out of embedded TypeScript Base64.
- KeyBot PDF now loads those static images from `assets/keybot-pdf/` on the deployed KeySuite website, with the GitHub-hosted KeySuite files as fallback.
- CHC C4 and BFI dimension drawings continue using their existing public web assets.
- No pump selection, curve calculation, pricing, motor, or database logic is changed.

No new Supabase database migration is required.

Deployment order:
1. Upload/deploy the V4.26.05 web files (including `assets/keybot-pdf/`).
2. Redeploy the `telegram-webhook` Edge Function.
