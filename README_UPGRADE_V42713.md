# Upgrade to KeySuite V4.27.13

Apply over V4.27.12.

KeyBot duty-only recommendation mix:
- Duty-only searches try to include one suitable CHC, BFI, ES 2P and ES 4P model.
- Only assigned Brand/Series remain eligible.
- Initial recommendations contain priced Hot Items only.
- If a family has no suitable Hot Item, it is skipped.
- Non-priced models remain available through the Cold Item button.
- Explicit Brand, Series, pump-type and pole searches are unchanged.

Deployment:

```powershell
npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase functions deploy telegram-webhook
```

No database migration or `supabase db push` is required for V4.27.13.
