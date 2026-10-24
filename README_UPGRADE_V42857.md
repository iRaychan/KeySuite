# KeySuite V4.28.57 Upgrade

1. Back up the current V4.28.56 deployment and database.
2. Upload the contents of the V4.28.57 upgrade package over the existing application.
3. Run `supabase/migrations/20261004190000_v42857_chc_mechanical_seal_addons.sql` once in Supabase.
4. Optionally run `supabase/migrations/20261004190001_v42857_verify_chc_mechanical_seal_addons.sql` to confirm all eight generation/group rows.
5. Redeploy the included `telegram-webhook` Edge Function so KeyBot uses the amended CHC G1 hydraulic data.
6. Sign in as an owner, open Price List → CHC, and verify the Mechanical Seal Add-On table switches independently between G1 and G2.

Existing Mechanical Seal Add-On behavior is preserved as the initial database values: RM250/RM350, RM300/RM400, RM500/RM600 and RM800/RM900 for SiC SiC/TC TC across the four CHC series bands.
