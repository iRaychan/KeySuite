# KeySuite V4.23.08 Upgrade

Upgrade target: V4.23.07 -> V4.23.08.

## Included corrections
- BFI Enhanced is 3 Phase only: base = 1Ph/IE1, `T` = 3Ph/IE2 Standard, `E` = 3Ph/IE2 Enhanced.
- BFI Enhanced naming/state is carried through Product/Selector/quotation and KeyBot/PDF identity paths.
- Product > CHC C4 > Curve gets the same Enhanced control/entry behavior as CHC C6.
- Adds the BFI-safe pricing-category rule RPC and uses it in Category + Category Compare.
- Category errors now show the real Supabase error instead of always claiming V41511 is missing.

## Supabase
Run after extracting/overwriting the upgrade:

```powershell
npx.cmd supabase db push
npx.cmd supabase functions deploy telegram-webhook
```

Expected new migration:
`20260906211000_v42308_bfi_category_pricing.sql`
