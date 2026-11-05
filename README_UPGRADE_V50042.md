# KeySuite V5.00.42 Upgrade

## Baseline

Apply this package to KeySuite V5.00.41.

## Installation

1. Back up the existing KeySuite frontend directory.
2. Copy the contents of the V5.00.42 UPGRADE package over the V5.00.41 installation, preserving the included paths.
3. Clear the site/service-worker cache or reload once online so the `50042` assets are selected.
4. Confirm the application footer/title reports KeySuite V5.00.42.
5. Run the Product → KV → Curve checks listed in `TEST_REPORT_V50042.md`.

## Database

No Supabase migration, schema update, data seed or Edge Function deployment is required for V5.00.42.

The V5.00.41 KV V1.4 price-list seed remains a separate V5.00.41 prerequisite only where that release was not fully installed.
