# Upgrade to KeySuite V4.28.03

Apply over V4.28.02.

## Product - BFI Curve Phase Naming

- Product > BFI > Curve now synchronizes the displayed model with the selected motor phase.
- Changing `BFI 2-3T` from 3-phase to 1-phase immediately displays `BFI 2-3`.
- Changing back to 3-phase restores `BFI 2-3T`.
- SS316 follows the same rule: `BFIN 2-3T` becomes `BFIN 2-3` for 1-phase.
- The popup title, presentation context, curve display and export state remain synchronized.

## Deployment

1. Upload the V4.28.03 web files to GitHub.
2. Refresh KeySuite after deployment.
3. No Supabase Edge Function redeploy is required.
4. No SQL migration is required.
