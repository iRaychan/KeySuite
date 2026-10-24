# KeySuite V4.29.18

- Fixed the repeated Safari login freeze after Supabase had already accepted the session.
- Removed the self-triggering version-display update loop that prevented Safari from processing authentication completions and timeout callbacks.
- Version-display updates are now idempotent and coalesced to one animation frame.
- Added deadlines to every awaited post-login initialization stage so a stalled optional module cannot leave the loading screen indefinitely.
- Rotated the service-worker cache to `keysuite-v42918` and cache-busted all corrected startup files.
- Replaced the old `v42917-version-lock.js` URL with a safe compatibility shim for Safari's first reload across the service-worker upgrade boundary.
- Preserved KeyHQ, quotation corrections, pricing, selectors and all other V4.29.17 functions.
- No new Supabase migration or Edge Function deployment is required.
