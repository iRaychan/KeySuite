# Upgrade to KeySuite V4.26.05

Apply over V4.26.04.

Fix:
- Removes the oversized embedded PDF image payload from the `telegram-webhook` source that caused Supabase `413 request entity too large`.
- PDF artwork is now fetched from the deployed KeySuite `assets/keybot-pdf/` folder, with GitHub fallback.
- All V4.26.04 KeyBot routing, multi-candidate CHC sizing, exact-model selection and smooth non-zero Power curve behaviour are retained.

No `db push` is required.

Deployment order:
1. Upload the V4.26.05 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook`.
