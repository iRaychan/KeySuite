# Upgrade to KeySuite V5.00.14

Supported baseline: KeySuite V5.00.13 full build.

## Apply

1. Back up the deployed V5.00.13 application directory and database.
2. Copy every file from the upgrade ZIP over the matching V5.00.13 path.
3. Publish the frontend files.
4. Clear the old service-worker cache or reload once after the new service worker activates.
5. Confirm the visible version is V5.00.14.

## Database

No migration is required. Do not change pricing, customer, permission or quotation data for this upgrade.

## Acceptance checks

- Category Normal View shows names only, A–Z.
- Company & Pricing shows all current Pricelist groups except General and KeyLab, including CR, BGF and ISO.
- Brand grid starts B.G.Reich / Keylargo, then TESK.
- Selection → B.G.Reich contains ISO.
- ISO Product uses series-left/models-right inline rows.
- BGF Quote buttons are compact.
- Quote History follows effective date, numeric sequence and revision ordering.
- Safari at 100% shows the full ISO curve panel without horizontal clipping.

