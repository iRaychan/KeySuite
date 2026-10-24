# Quotation history discrepancy root cause — V4.29.19

The secure history RPC inherited the V4.09 listing function, which reads only `ks_quotation_archive_v409`. Valid rows present only in `ks_quotations` were therefore invisible even to owners.

Separately, the browser wrote the complete remote history into `localStorage` inside the same error boundary as the Supabase request. A browser quota exception was mislabeled as a Supabase outage. While in that mode, the save adapter returned the unsaved quotation as though the remote save had succeeded, creating browser-only history records.

V4.29.19 introduces a secure listing RPC that merges both storage tables, separates cache errors from synchronization errors, and requires a live secure connection for quotation Save.
