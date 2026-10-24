# Upgrade to KeySuite V4.27.01

Apply over V4.26.11.

KeyBot selection changes:
- An exact model and duty point now generate that specific model curve with the requested duty plotted.
- Entered units are retained in the response, with the normalized m3/hr value shown in brackets when required.
- B.G.Reich, MOS/M.O.S, OK/O.K.Pump, CHC/VMS/SVM and BFI/HMS are resolved as Brand, Series or pump-type input before Customer matching.
- Duty-only input searches the user's assigned pump series. Explicit Brand or Series input restricts the results accordingly.
- Suitable models with a filled pricelist value are prioritized. Cold Items without a price are offered only when no priced suitable model is available.

KeySuite changes:
- BFI selection uses the same priced-model-first rule and labels fallback unpriced models as Cold Item.
- OEM PDF export waits for the final assigned Brand name and logo before showing the report and opening Print. Refreshing the PDF window is no longer required.

No `db push` is required.

Deployment order:
1. Upload the V4.27.01 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp --no-verify-jwt`.
