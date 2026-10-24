# KeySuite V4.23.06 Upgrade

Upgrade from V4.23.05.

## Change

PDF Page 3 dimension tables now use one global CHC-style centre-divider rule: the 3rd vertical line is drawn once and spans the full/main (longer) dimension block. This is applied to all current Page 3 dimension-table families.

## Deployment

- Overwrite the web files in the existing KeySuite deployment.
- No `supabase db push` is required.
- Redeploy `telegram-webhook` because the shared PDF generator was updated.
