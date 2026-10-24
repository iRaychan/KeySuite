# Upgrade to KeySuite V4.28.07

KeyBot hydraulic selection update from V4.28.06.

## Changes
- Within-5% head shortfall fallback is shown as `(Undersized)` when no fully suitable model exists in scope.
- `CHC 15` and `ES 65` inputs restrict duty sizing to that nominal hydraulic series.
- Exact CHC/ES model + requested duty now keeps the exact model curve and plots the requested point even when outside the curve; KeyBot warns instead of substituting another model.
- ES exact model + motor HP supports motor-limited curve generation using the existing ES safety-factor motor rule.
- ES exact model + motor HP + flow-only maximizes usable impeller size and resolves maximum head at that flow; head-only resolves maximum usable flow at that head.

## Deployment
1. Upload the V4.28.07 web files to GitHub.
2. Redeploy `supabase/functions/telegram-webhook`.
3. No database migration is required.
