# Upgrade to KeySuite V4.27.10

Apply over V4.27.09.

KeyBot curve-only improvements:
- Curve visibility follows the linked Customer/Company Brand / Series assignment keys, not Price Preference keys.
- An assigned series remains searchable even when no price is filled; suitable unpriced models remain under Cold Item.
- `BFI` followed by `20m3/hr @ 30mtr` retains the BFI scope and can recommend BFI 20-3.
- Curve-only prompts and result menus do not expose Customer, Product or normal Selection controls.
- If only C4 or C6 is assigned, the checkbox displays generic `CHC`; if both are assigned, separate `CHC C4` and `CHC C6` checkboxes are shown.

Deployment:

```powershell
npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase functions deploy telegram-webhook
```

No database migration or `supabase db push` is required for V4.27.10.
