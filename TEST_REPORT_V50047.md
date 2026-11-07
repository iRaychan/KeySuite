# KeySuite V5.00.47 — Bug 001 regression report

## Passed locally

- JavaScript syntax checks passed for the new registry and all modified runtime files.
- `tests/v50047-product-family-regression.cjs` passed all 31 assertions.
- The shared registry contains exactly 16 configured database identifiers.
- BSV and BSW are present in the registry used by Product Family Mapping, Category Management, and pricing/compare tabs.
- Legacy `CHC` still normalizes to `CHC_G2`; `ES` retains the display label End Suction without changing its stored code.
- The OEM mapping frontend no longer contains the seven-item `PRICE_GROUP_OPTIONS` list.
- The V5.00.47 migration validator contains every configured family identifier and preserves existing mapping insert/update/reload behavior.
- Headless Chrome loaded the complete build over localhost, produced a fully rendered DOM marked `data-keysuite-version="5.00.47"`, and reached the protected sign-in boundary. All requested local assets returned successfully.

## Preservation checks

- No migration in V5.00.47 updates or deletes category, price, customer, percentage, or existing mapping rows during deployment.
- No quotation formula or product-price calculation function was changed.
- No category creation/reset code was added.
- The supplied V5.00.46 contents remain present in the complete build; V5.00.47 adds or changes only the files listed in `MODIFIED_FILES_V50047.md`.

## Not claimed / staging checks still required

The live Supabase database and production deployment were not accessed. Consequently, the following must be confirmed in staging after the migration is approved and applied:

- Save and reload a new BSV mapping and a new BSW mapping with an authorized Owner/Admin account.
- Confirm existing OEM mappings and brand-series rows load unchanged.
- Confirm Category Compare with real customer/category data.
- Compare representative pre/post-upgrade quotation and assembly totals.
- Confirm existing categories, customer assignments, percentages, and prices by read-only row counts/checksums or an approved backup comparison.

Older embedded tests `v50031-regression.cjs` and `v50032-regression.cjs` are version-pinned to their historical releases and already fail against the supplied later baseline. `v50037-targeted.cjs` references a missing temporary Playwright installation. These are baseline test-harness limitations, not V5.00.47 functional failures.
