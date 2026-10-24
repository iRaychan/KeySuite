# Upgrade to KeySuite V4.28.04

Apply over V4.28.03.

## KeyBot Search Routing

- Brand, series, model and duty input now takes priority over the legacy Customer-search fallback.
- `CHC`, `BFI`, `ES`, `VMS` and `HMS` entered alone start a scoped pump search instead of Customer lookup.
- Brand-first two-line input is restored. Example: `OK` followed by `VMS 32-4` searches O.K.Pump.
- A Brand or Series may be followed by either an exact model or a duty point.
- Exact model input can replace an active Brand / Series duty prompt.
- `ES 2P` and `ES 4P` retain the pole filter when the duty is entered next.
- Customer lookup remains available when a genuine Company name is supplied.

## Deployment

1. Upload the V4.28.04 web files to GitHub.
2. Redeploy the Supabase function:

```powershell
npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp
```

3. No SQL migration is required.
