# KeySuite V5.00.41

## Category Management

Removed the legacy row-level five-second delete countdown, event handlers and archive call from the Category UI. Kept category selection, ordering, Add, Edit, Save and Compare.

## Product Curve PDF

Product exports use the existing browser print workflow and report templates. The browser controls the availability and presentation of Save as PDF. Fixed generated Product report script escaping and use the local date, selected model and confirmed duty point as the suggested filename. The filename omits the duty suffix when none is set. The slash in m3／hr is filename-safe.

## KV V1.4

- Added 21 standard KV 8 models, from KV 8-20 through KV 8-220 in steps of 10.
- Added 24 standard KV 10 models, from KV 10-20 through KV 10-250 in steps of 10.
- Compared all 171 previous models and the nine populated curve families against V1.4. The imported fields and numeric curve samples matched the baseline. KV 8 and KV 10 zero-flow full/medium impeller values are 0.26/0.14 kW and 0.21/0.11 kW per impeller, respectively.
- Withheld KV 8-20-2 and KV 10-20-2 because the workbook does not explicitly map the suffix to an impeller mix. KV 12 and KV 15 have curve data without model rows. The remaining curve-family placeholders have no numeric performance samples. The dimension sheet's drawing cells with cached errors use the existing packaged drawings.
- Retained independent KVC, KV and KVN prices and rarity. New models have no supplied prices.

## Release and checks

Deploy the frontend and apply the included `KV_V1.4_PRICELIST_SEED.sql` to register the 45 new models in the connected Supabase price list. The seed inserts missing catalogue rows and leaves existing rows intact. It requires no schema or Edge Function changes.

Local Chromium checks covered Category pointer handling, CR 90-4 three-page PDF rendering and filename, and loading the new KV 8 and KV 10 Product curves. Safari's native dialog, live category writes and full PDF rendering for every other series were not exercised. Production and Supabase were not changed.
