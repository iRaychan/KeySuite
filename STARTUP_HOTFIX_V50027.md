# V5.00.27 Startup Hotfix

## Symptom

After authentication, KeySuite remained permanently at **Loading protected company and pricing data…**.

## Root cause

`v50027-version-lock.js`, introduced in V5.00.27, observed text mutations across the document. Its observer callback unconditionally assigned the same version strings back to `.suite-version`, `.brand small`, and `.auth-brand small`. Each assignment created another child-list mutation, producing an endless MutationObserver microtask loop.

The loop starved pending Supabase Company/Pricing requests and also prevented the existing startup timeout from firing. V5.00.26 did not include this version-lock script.

## Fix

Version text and the document version attribute are now written only when their current value differs. The script reference is cache-busted with `v=50027-hotfix1`.

No Supabase schema change is required for this hotfix. The two V5.00.27 BSW migrations remain required and were already applied successfully to the connected KeySuite project.

## Verification

The browser regression test at `tests/v50027/version-lock-startup-regression.html` verifies that a timer still executes after the observer starts and that every version label remains correct.
