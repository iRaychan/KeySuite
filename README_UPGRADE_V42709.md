# Upgrade to KeySuite V4.27.09

Apply over V4.27.08.

This update fixes KeyBot Brand / Series leakage for curve-only Telegram senders that are linked to a Customer/Company but not to a KeySuite User or Role.

After upgrading:
- The linked Customer/Company ID is retained by KeyBot.
- Search results are intersected with that Customer/Company's Brand / Series Price Preference.
- `ES 4P, 65m3/hr @ 25mtr` returns only ES brands assigned to the linked Customer/Company.
- TESK, OK, VEC and other unassigned brands are excluded.
- A missing or invalid Customer/Company link cannot fall back to every active brand.

Deployment:

```powershell
npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase functions deploy telegram-webhook
```

No database migration or `supabase db push` is required for V4.27.09.
