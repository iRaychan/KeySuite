# KeySuite V4.29.14 Upgrade

Upgrade from V4.29.13.

## Changes

- Complete-pump motor substitutions now use `RoundUpRM10(existing pump final - included motor final + replacement motor final)`.
- Bare-shaft pricing continues to deduct the included motor raw converted cost.
- Brand quotation stamping now retains and recalculates the motor substitution instead of restoring the unmodified pump price.
- Smartech CHC 8-4 changes from IE2 RM530 to IE4 RM870 as RM1,750 - RM530 + RM870 = RM2,090, with a `+RM340.00` description.

## Deployment

Overlay the V4.29.14 upgrade package on V4.29.13.

No Supabase database migration or Edge Function redeployment is required.
