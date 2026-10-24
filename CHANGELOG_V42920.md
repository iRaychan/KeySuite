# KeySuite V4.29.20

- Supabase now allocates the company-wide running number inside the first successful quotation save transaction.
- Concurrent first saves complete in one click and receive different consecutive numbers across all user prefixes.
- Later saves preserve the same logical quotation ID, original reference and immutable creator.
- Supabase previews no longer use browser-local history, so R and RC accounts preview the same next running number.
- Automatic import of legacy browser-only quotation rows has been removed; secure Supabase history is authoritative.
- The browser backup is stripped of embedded image data, capped at 100 rows and approximately 1 MB, and stored under a new compact-cache key.
- Owner company-wide history and non-owner creator-only history remain enforced by the V4.29.19 listing function.
- The service-worker cache and changed application files are cache-busted for V4.29.20.

No Edge Function deployment is required.
