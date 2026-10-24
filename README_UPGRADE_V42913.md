# KeySuite V4.29.13 Upgrade

## Changes

- Adds KeyHQ between KeyBot and KeyCore using the same sidebar button treatment.
- Includes the interactive multi-storey KeyHQ building and embedded return-to-KeySuite flow.
- Makes CHC IE motor price changes explicit in quotation descriptions.
- Rejects an IE upgrade when the replacement motor source price is not higher than the included motor source price.
- Ensures a valid higher-cost IE upgrade remains visible after RM10 rounding.
- Retains all V4.29.12 CR assignment behavior.

## Deployment

Upload the V4.29.13 application files to GitHub.

No Supabase database migration or Edge Function redeployment is required.
