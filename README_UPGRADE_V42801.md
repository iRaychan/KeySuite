# Upgrade to KeySuite V4.28.01

Apply over V4.27.15.

## New TESK Metering Pump module
- Key > Customer: assign **TESK Metering Pump** to individual Customers.
- Optional **Chemical / Material Selection** per Customer.
- KeyBot recognizes dosing/metering intent from dosing keywords and L/hr + bar duties.
- Chemical transfer duties in m³/hr @ head remain on the normal pump path.
- Chemical selection uses medium + concentration + temperature before confirming wetted material.
- Unsupported catalogue conditions do not get an invented material recommendation; KeyBot returns **Engineering Review Required**.
- CKS uses exact catalogue hydraulic points where covered. Other included TESK families are returned as series candidates until an exact catalogue model is confirmed.

## Deployment
1. Upload the web files in this upgrade package to GitHub.
2. Redeploy Supabase function `telegram-webhook` and include `tesk-metering-data.ts`.
3. No new SQL migration is required. This release stores the TESK Customer feature flags in the existing V4.17.10 generic Customer preference JSON.

Supabase CLI example:
```powershell
npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp
```
