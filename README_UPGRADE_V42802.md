# Upgrade to KeySuite V4.28.02

Apply over V4.28.01.

## KeyBot - TESK Chemical Pump

- KeyBot now recognizes `TESK Chemical Pump` as a direct request.
- `TESK Metering Pump` and `Dosing Pump` remain supported aliases.
- The Customer-guided Product list displays **TESK - Chemical Pump** when the linked user has Product permission and the selected Customer has the TESK module assigned.
- KeyBot collects medium / chemical, concentration, temperature, flow in L/hr and pressure in bar.
- Material selection and pump recommendations continue using the conservative TESK catalogue rules introduced in V4.28.01.
- Conditions outside the digitized catalogue envelope return **Engineering Review Required**.
- Chemical transfer / circulation duties in m3/hr @ head remain on the normal pump-selection path.

## Deployment

1. Upload the V4.28.02 web files to GitHub.
2. Redeploy Supabase function `telegram-webhook`, including `tesk-metering-data.ts`.
3. No new SQL migration is required.

PowerShell:

```powershell
npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp
```
