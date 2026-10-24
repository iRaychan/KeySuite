# Upgrade to KeySuite V4.28.09

KeyBot ES suffix parsing and assigned-brand routing correction from V4.28.08.

## Changes
- Exact ES Fast Search recognises suffix models such as `ES 80-32H` and `ES 80-32G`.
- `100HP`, `75kW`, `2P`, `4P`, `2Pole`, `4Pole`, `cw` and `c/w` are technical tokens and are never used as Customer/company search text.
- For an unbranded exact ES request, if multiple assigned brands match the exact model/pole, KeyBot shows those Brand / Model choices before generating the curve.
- If only one assigned brand matches, KeyBot continues automatically.
- If the user explicitly types a brand, the search remains restricted to that assigned brand.
- V4.28.08 ES motor-safe impeller trimming and BEP/system-curve logic are unchanged.

## Deployment
1. Upload the V4.28.09 web files to GitHub.
2. Redeploy `supabase/functions/telegram-webhook`.
3. No database migration is required.
