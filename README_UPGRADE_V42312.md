# KeySuite V4.23.12 Upgrade

Upgrade from V4.23.11.

## Changes

- KeyBot exact BFI model requests ask for motor phase before finalising model identity.
- 1 Phase => base BFI model, e.g. `BFI 10-3`.
- 3 Phase => `T` model, e.g. `BFI 10-3T`.
- Explicit Enhanced BFI requests remain 3 Phase only and use the `E` suffix.
- Applies to message-first direct model flow, KeyBot Product exact-model flow, and direct BFI price flow.

## Deployment

No database migration is required. Redeploy:

```powershell
npx.cmd supabase functions deploy telegram-webhook
```
