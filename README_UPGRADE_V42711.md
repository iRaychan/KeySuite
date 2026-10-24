# Upgrade to KeySuite V4.27.11

Apply over V4.27.10.

KeyBot curve-only fix:
- Company Curve assignments now directly create the allowed CHC C4, CHC C6, BFI and ES families.
- Native B.G.Reich families work even when they do not have separate OEM Brand/Series mapping rows.
- The legacy CHC C6 assignment key (`brand|CHC`) is accepted as `CHC_G2`.
- Price Preference does not control or hide curve-only access.

Deployment:

```powershell
npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase functions deploy telegram-webhook
```

No database migration or `supabase db push` is required for V4.27.11.
