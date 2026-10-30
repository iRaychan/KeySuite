# Upgrade to KeySuite V5.00.15

Supported baseline: KeySuite V5.00.14 full build.

## Apply

1. Back up the deployed V5.00.14 application directory and Supabase database.
2. Run `supabase/migrations/20261030193000_v50015_category_archive.sql` before publishing the frontend.
3. Copy every file from the V5.00.15 upgrade ZIP over the matching V5.00.14 path.
4. Publish the frontend files.
5. Reload after the new service worker activates and confirm the visible version is V5.00.15.

## Database change

The migration adds archival metadata to pricing categories and creates the owner-only `keysuite_archive_pricing_category_v50015` RPC. It does not delete category, customer, pricing or quotation history.

## Clipboard behaviour

Copied quotation items persist in browser local storage for the signed-in company and email account. They survive page navigation/reload but are not visible to a different company or user account on the same browser.

## Acceptance checks

- Category Edit requires a continuous five-second hold; Delete archives only after confirmation and blocks assigned categories.
- Company & Pricing shows the 13 required groups A–Z; CR opens CR.
- Brand Margin starts B.G.Reich, Tesk, then valid brands A–Z with symbols last.
- ISO Product and both ISO selector views follow ES structure without horizontal overflow at Safari 100%.
- Quotation Save refreshes an expired session, retries once with the same logical ID, and confirms the database row.
- Clone stays in the same quotation; Copy/Paste works between quotation numbers without recalculating price.

