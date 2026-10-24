# Upgrade to KeySuite V4.28.05

Apply over V4.28.04.

## TESK Chemical Dosing

- Direct KeyBot chemical-duty requests now perform the technical selection immediately.
- KeyBot no longer asks for a Customer before recommending the suitable TESK pump series.
- The pump recommendation appears before the chemical material details.
- Missing temperature no longer blocks hydraulic sizing and is no longer silently treated as 0°C.
- When temperature is missing, KeyBot shows the pump recommendation and marks final wetted-parts compatibility for confirmation.

Example:

```text
Chemical Dosing
Hydrochloric Acid
Concentration 30%
Flow 30L/h
Pressure 5Bar
```

KeyBot recommends the TESK GS series for the hydraulic duty first, then requests temperature for final material confirmation.

## TESK Clean-Water Routing

- `TESK, 20m3/hr @ 30mtr` searches only hydraulic families actively mapped to TESK.
- TESK cannot borrow or display the B.G.Reich ES range.
- An orphan Brand Series label is no longer treated as an active hydraulic-family mapping.
- If no suitable TESK-mapped clean-water model exists, KeyBot returns no suitable TESK model instead of showing an ES model.

## Deployment

1. Upload the V4.28.05 web files to GitHub.
2. Redeploy the Supabase function:

```powershell
npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp
```

3. No SQL migration is required.
4. Refresh KeySuite after deployment.
