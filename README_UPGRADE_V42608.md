# Upgrade to KeySuite V4.26.08

Apply over V4.26.07.

KeyBot BFI exact-model changes:
- `BFI 10-3` asks the user to choose 1 Phase or 3 Phase because both are available.
- 1 Phase finalizes as `BFI 10-3` with IE1.
- 3 Phase finalizes as `BFI 10-3T` with IE2.
- `BFI 10-3T` directly opens the standard 3-phase model and rated curve.
- `BFI 10-3E` directly opens the Enhanced 3-phase model and rated curve.
- A model such as `BFI 20-3`, which is available only in 3 Phase, automatically finalizes as `BFI 20-3T`.
- BFI `T` and `E` inputs are no longer misread as Customer names.

No `db push` is required.

Deployment order:
1. Upload the V4.26.08 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook --no-verify-jwt`.
