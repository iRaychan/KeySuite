# V5.00.27 Startup Hotfix

## Symptom

After authentication, KeySuite remained permanently at **Loading protected company and pricing data…**.

## Root cause

Three V5.00.27 observer feedback defects were present:

1. `v50027-version-lock.js` observed text mutations across the document and unconditionally assigned the same version strings back to the observed nodes.
2. `iso-family-labels-v50027.js` observed the ISO family tree and unconditionally rewrote the same button labels inside that tree.
3. `kv-product-families-v50027.js` observed the KV family/model containers, unconditionally rewrote model headings, and failed to include its own `data-kv-unavailable-series` buttons in the duplicate check. Every callback therefore appended another incomplete-family button.

The loop starved pending Supabase Company/Pricing requests and also prevented the existing startup timeout from firing. V5.00.26 did not include this version-lock script.

## Fix

All observer-driven text writes are now idempotent. KV complete and incomplete family buttons share one duplicate-key set, preventing repeated appends. The repaired scripts are cache-busted with `v=50027-startup2`.

Two eager selector adapters also referenced the bridge-local `currentSelection` identifier from a separate script scope. BGF and BSW now use the bridge's supported `window.__KEYSUITE_CURRENT_SELECTION` export, removing those startup-time iframe exceptions.

No Supabase schema change is required for this hotfix. The two V5.00.27 BSW migrations remain required and were already applied successfully to the connected KeySuite project.

## Verification

The browser regression test at `tests/v50027/version-lock-startup-regression.html` loads all three repaired observers and verifies that a timer executes, the labels stabilize, and only one incomplete KV family button is created. The complete build was also served over HTTP, reached the protected Sign-in boundary, and remained responsive after an extended check.
