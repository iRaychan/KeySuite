# KeySuite V4.29.11 Upgrade

## Changes

- An unassigned Telegram sender no longer receives the normal KeyBot Fast Search menu.
- Customer, Product, Selection and New Request controls are removed for that sender.
- KeyBot replies with: `Your Telegram account is not assigned yet.` followed by `Please contact your administrator to request access.`
- The sender is still registered in KeySuite so an administrator can see and assign the Telegram account.
- `CHC` Fast Search checks all curve-enabled CHC Brand / Series entries available through the user's Role or linked Company assignment.
- A numeric CHC series such as `CHC 2` keeps that same assignment scope but restricts hydraulic results to the CHC 2 series.
- Existing ES behavior is retained: `ES` checks both 2 Pole and 4 Pole, while `ES 2P` or `ES 4P` restricts the pole.
- `CR` now appears as an independent B.G.Reich row under Key → Customer → Brand / Series Price Preference.
- A Price-authorized CR row can also be enabled in the Customer Curve / Quick Selection preference.

## Deployment

1. Upload the V4.29.11 application files.
2. Redeploy `supabase/functions/telegram-webhook`.

No database migration is required.
