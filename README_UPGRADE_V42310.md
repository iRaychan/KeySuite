# KeySuite V4.23.10 Upgrade

Upgrade from V4.23.09.

## Changes

- Add BFI under B.G.Reich in Customer Brand / Series Price Preference / authorization, including brand-level All Series behavior and saved selection visibility.
- Correct BFI family handling for mapped non-master brands in Customer authorization.
- Remove Coupling Type from KeyBot CHC and BFI PDF Page 2; ES retains Flexible coupling output.

## Deployment

No `supabase db push` is required.

Because the KeyBot PDF generator changed, redeploy:

```powershell
npx.cmd supabase functions deploy telegram-webhook
```

Then update GitHub Pages and hard-refresh KeySuite.
