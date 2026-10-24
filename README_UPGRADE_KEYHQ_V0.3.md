# KeyHQ V0.3 KeyOffice Upgrade

Baseline: **KeySuite V4.29.22 Full**  
Module release: **KeyHQ V0.3 KeyOffice**  
Cache identifier: **keyhq03**

This package was built from the newest verified local source: KeySuite V4.29.22 with KeyHQ V0.2. It does not replace, renumber, or modify quotation pricing logic.

## What changes

- Level 6 is rebuilt as a believable 28-desk office with four desk clusters, aisles, lounge furniture, chairs, keyboards, and filled monitor faces.
- Each enabled `ks_user_access` account becomes one persistent full-body chibi avatar with male/female presentation, legs, shoes, and walking/sitting/typing animation.
- Owners can assign unique desks 1–28 and avatar presentation. The prepared migration enforces uniqueness and Owner-only writes.
- The same Owner avatar is shown when an Owner enters private Level 8. Non-Owners cannot open Level 8.
- Clicking the actual Level 6 monitor face opens the employee's real, backend-authorized KeySuite quotation history.
- Quotation detail uses the saved KeySuite snapshot with zoom, scrolling, and page navigation. Sealed records can be handed to the existing KeySuite PDF/print workflow.
- No fabricated quotation rows are created or displayed.

## Important PDF limitation

The connected database has no Storage bucket, PDF object path, or PDF binary column for existing quotations. It stores structured quotation snapshots. KeyHQ therefore labels its viewer as a saved-snapshot preview and does not claim it is the original PDF binary. The existing sealed-quotation PDF/print workflow remains available from the viewer.

## Workforce reconciliation (23 October 2026)

The connected project contains 7 `ks_user_access` rows but only 6 are enabled. Five enabled rows have confirmed Auth users and one enabled row is invited/unconfirmed. The old KeyHQ V0.2 count of 8 was a fictional demo-agent roster and has been removed.

## Migration status

The Owner approved deployment and `keyhq_level6_people_v42922` was applied to production project `skidqdixnnnuhvarekxp` on 23 October 2026. The production migration version is `20261023132449`.

For a different Supabase project, apply the included migration as follows:

1. Back up the Supabase project.
2. Review `supabase/migrations/20261023204500_keyhq_level6_people.sql`.
3. Apply it in the Supabase SQL Editor or your normal migration pipeline.
4. Run `supabase/migrations/20261023204501_keyhq_level6_people_verify.sql`.
5. Sign in as an Owner, open KeyHQ, choose the gear beside the workforce count, assign unique desks, and save.
6. Test an Owner account and a non-Owner account. Owner history should contain every authorized company record; non-Owner history must contain only rows returned by the existing secure quotation RPC.

The deployed production project can persist Owner-managed desk and avatar settings. A project without this migration uses the existing `ks_user_access` result as a read-only fallback.

## Deployment

Copy every path in `UPGRADE_FILE_MANIFEST_KEYHQ_V0.3.txt` over an existing complete KeySuite V4.29.22 installation, preserving folders. Clear the site cache or reload twice so the `keyhq03` cache is active.

The web application is hosted through GitHub Pages, not Supabase Hosting. Upload the upgrade files to the KeySuite GitHub deployment separately. No KeyHQ Edge Function redeployment is required.
