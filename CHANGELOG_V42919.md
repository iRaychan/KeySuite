# KeySuite V4.29.19

- Secure Quotation History now combines archived and current quotation rows and removes duplicate references.
- Owners receive the full company history; non-owner accounts continue to receive only their own quotations.
- A full browser backup no longer changes a successful Supabase load into fallback mode.
- Quotation Save is blocked while secure synchronization is unavailable, preventing false local-only success.
- The legacy quotation reference registration and allocation functions now use an unambiguous primary-key conflict target.
- The service-worker cache and changed application files are cache-busted for V4.29.19.

No Edge Function deployment is required.
