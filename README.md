# KeySuite V1.20.2

Category editor usability update. No Supabase migration is required. Keep the existing `config.js`.

# KeySuite V1.20

Base: KeySuite V1.19. The approved V1.08 quotation PDF/print layout remains fully frozen and unchanged.

## Install in this order

1. In Supabase, open SQL Editor and run the complete file:
   `setup/V120_SUPABASE_MIGRATION.sql`
2. Deploy the included Supabase Edge Function using the function name:
   `keysuite-invite-user`
   Source folder: `supabase/functions/keysuite-invite-user/`
   This step is required only for sending new-user invitation emails.
3. Extract this GitHub package.
4. Upload all files and folders to the root of the existing KeySuite repository, replacing matching files.
5. Keep the existing working `config.js`. This package intentionally does not include it.
6. Wait for GitHub Pages to deploy, then refresh using `Ctrl + Shift + R`.

## V1.20 highlights

- Owner-managed invitation emails let new users create their own passwords.
- Category Names are visible, selectable, highlighted, and load the correct saved rules.
- Protected Category and multiplier values use a visible 3-second hold flow.
- Multiplier unlock reveals explicit Save and Cancel controls.
- CHC and GWS have independent USD and RMB multipliers.
- CHC Price List uses grouped Price and Rarity columns for CHC, CHCS and CHCN.
- Rarity defaults to Common and is saved per currency and variant.
- Many, Common and Rare now apply different formulas using the rarity of the winning highest converted price.
- GWS Tank pricing uses only actual sellable series/model/pressure SKUs.
- PEB 24LX and PWB 24LX are separate 10 Bar items.
- Unavailable 16 Bar or 25 Bar combinations are not shown.
- GWS quotation item titles show only litres and pressure; technical model details appear in Description.

## User invitations

The public browser must never receive a Supabase service-role key. The included Edge Function performs the privileged invitation safely on the server and verifies that the caller is an active KeySuite Owner.

The invited user opens the email link and sets a password in KeySuite. Role/access and Authentication remain linked but separate records.

## Security and data

- Only the Owner sees the gold Key button and protected Key modules.
- Customer ID and Category ID remain database-only and are not shown on dashboards.
- Source prices, rarity and multipliers are stored in Supabase, not embedded in public GitHub files.
- Never upload a secret or service-role key into `config.js` or GitHub.
