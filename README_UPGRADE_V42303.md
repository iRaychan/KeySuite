# KeySuite V4.23.03 UPGRADE

Upgrade from V4.23.02 R2 to V4.23.03.

## Changes
- Replaces BFI selector UI with the CHC master selector display shell.
- Bumps KeySuite visible version/cache to V4.23.03.

## Deployment
1. Copy the Upgrade files over the existing V4.23.02 installation and overwrite matching files.
2. Push the changed static files to GitHub Pages.
3. Hard refresh / reopen KeySuite so service worker cache `keysuite-v42303` is active.

No `supabase db push` is required.
No `supabase functions deploy telegram-webhook` is required for this release.
