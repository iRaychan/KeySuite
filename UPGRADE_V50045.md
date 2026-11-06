# KeySuite V5.00.45 Category Management

## Bug fixes

- Normal View sent BSW and BSV to the legacy family allowlist. It now sends each to the same owner-only save function with its own family code. The function saves the pricing fields and currency choices together under that family’s existing JSON key. An accompanying rename is part of the same transaction.
- Compare View now gets its tabs, labels and order from the Normal View family controls and uses the same rule reader. BSW and BSV display the same saved values and currencies in both views. Compare still starts read-only and retains Hold 3s to Edit. Unchanged BSW and BSV rows are skipped.

## Upgrade

1. Use the supplied V5.00.44.01 full build as the upgrade baseline and retain a copy. For an earlier V5.00.44 installation, use the V5.00.45 FULL BUILD to include the previous category rename patch.
2. In staging, confirm the previous category rename migration is installed. If the rename function is absent, apply the included historical migration from the FULL BUILD first.
3. Apply `supabase/migrations/20261107000200_v50045_submersible_category.sql` using the project’s migration workflow. It adds one invoker function, uses the existing owner UPDATE policy and performs no data backfill. Apply it to production only after approval.
4. Overlay the UPGRADE archive at the application root, or deploy the FULL BUILD through the normal application hosting workflow. Refresh and confirm V5.00.45.
5. As an owner in staging, edit one BSW and one BSV rule, reload, compare both rows, and test a rename. Sign in with view-only access and confirm Compare cannot unlock. Check a representative quotation and customer-price calculation.

## Changed files

- `categories.js` and `v3944-categories.js` share family metadata and rule reads, and route BSW/BSV writes.
- `index.html`, `sw.js`, `v41200-bootstrap.js` and `v50037-version-lock.js` update version and cache identifiers.
- `supabase/migrations/20261107000200_v50045_submersible_category.sql` adds the validated save function.
- `UPGRADE_V50045.md` documents installation and verification.

## Regression and compatibility

- The read-only database check found 12 categories, all with compatible rule storage, and confirmed the rename function and authenticated rule-column privileges exist. The owner row policy remains in effect. The migration makes no changes to category IDs, customer associations, stored rules or quotations on installation.
- Local mocked regressions used all 12 category names from the supplied screenshots. They covered 24 edited saves and 24 unchanged saves, independent BSW/BSV rules, existing CHC rule preservation, reload, matching Compare values and currencies, read-only rendering, and rename with the same ID.
- Live owner writes, end-to-end Hold 3s behavior, and quotation and customer pricing checks remain for staging. Production deployment and migration were not performed.

**Supabase Deployment Required: NO**  
No Edge Functions or other Supabase services need deployment. Publish the frontend through the existing application host.

**Supabase Database Migration Required: YES**  
Apply the included SQL before publishing V5.00.45 so the frontend can save BSW and BSV rules.
