# Upgrade to KeySuite V4.26.04

Apply over V4.26.03.

KeyBot changes:
- `CHC C4 + duty` => C4 candidates only.
- `CHC C6 + duty` => C6 candidates only.
- Generic `CHC + duty` => all CHC generations assigned to that linked user; if a Customer is active, only the User Assignment ∩ Customer Price Preference is searched.
- C4 and C6 assignments are independent.
- CHC duty sizing shows up to the best six mixed recommended/close-equivalent candidates (up to three per allowed generation) instead of immediately discarding alternatives.
- Choosing a candidate generates the exact selected model curve.
- KeyBot CHC/BFI Power curve starts with a non-zero shut-off estimate and is smoothed using the same display-only algorithm as KeySelector.

No `db push` is required. Redeploy `telegram-webhook`.
