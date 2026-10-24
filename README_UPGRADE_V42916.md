# KeySuite V4.29.16 Upgrade

Upgrade from V4.29.15 only.

## Changes

- Quotation saves distinguish create and update, preserve quantities, and automatically retry with the next available number after a concurrent collision.
- The database permits Owners to list/update all company quotations and limits other assigned users to quotations created by their own account.
- Save confirmations show the committed quotation number and whether it was created or updated.
- KeyHQ is integrated after KeyBot as a lazy-loaded native module. It shares the active KeySuite user and role and includes the approved eight-floor, rooftop, facilities, KeyBot animation, projector, Sims activity and lighting behavior.
- Demo Telegram events are used unless the existing `keysuite-keyai` connection reports live Telegram as connected.
- `keylargo-logo.png` is unchanged; the neon effect is CSS/canvas illumination only.

## Deployment

1. Confirm V4.29.15 and its two quotation sequence/save migrations are already installed.
2. Apply `supabase/migrations/20261021213000_v42916_quotation_integrity_and_scope.sql`.
3. Apply `supabase/migrations/20261021213001_v42916_verify.sql`.
4. Overlay the V4.29.16 upgrade package on V4.29.15 and refresh the browser/service worker cache.

No Edge Function redeployment is required.
