# Upgrade to KeySuite V4.28.08

KeyBot ES motor-limited curve correction from V4.28.07.

## Changes
- ES exact model + motor HP now selects the **largest impeller diameter that satisfies the existing KeySuite motor safety-factor rule**.
- The selected impeller's **complete hydraulic curve** is shown. The curve is no longer shortened at the motor-power limit.
- With motor HP only, the rated point is the **BEP of the selected trimmed impeller** and the system curve intersects the pump curve at that BEP.
- With flow-only input, KeyBot keeps the requested flow and resolves the maximum head from the largest motor-safe impeller.
- With head-only input, KeyBot keeps the requested head and resolves the maximum usable flow from the largest motor-safe impeller.
- If the motor is too small even for the minimum impeller diameter, KeyBot reports that explicitly instead of generating a distorted curve.
- Fast Search no longer interprets `7.5HP`, `60HP`, `100HP`, `75kW`, `2P`, `4P`, `2Pole`, `4Pole`, `cw` or `c/w` technical continuation text as a Customer name.
- Unbranded exact ES + motor HP searches prefer assigned **B.G.Reich** instead of prompting between multiple assigned brands.

## Deployment
1. Upload the V4.28.08 web files to GitHub.
2. Redeploy `supabase/functions/telegram-webhook`.
3. No database migration is required.
