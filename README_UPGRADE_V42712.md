# Upgrade to KeySuite V4.27.12

Apply over V4.27.11.

KeyBot curve-only compatibility fix:
- A valid dedicated Customer Curve assignment remains the strict Brand/Series scope.
- If Curve keys are empty or resolve only to deleted Brands, KeyBot falls back to the company's older saved Brand/Series assignment.
- The fallback restores assigned CHC C4, CHC C6, BFI and ES curves.
- Curve-only users still have no price-checking access.

Deployment:

```powershell
npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase functions deploy telegram-webhook
```

No database migration or `supabase db push` is required for V4.27.12.
