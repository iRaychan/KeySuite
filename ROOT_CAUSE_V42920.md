# Quotation numbering and Safari backup root cause — V4.29.20

The R and RC accounts did not have two valid database counters. The shared Supabase counter table was empty, while each browser preview supplied a floor calculated by scanning all of its own `localStorage`. RC's Safari backup contained a browser-only `RC-2610-0236`, so that browser previewed `0237`; the other account, whose secure history ended at `0235`, previewed `0236`.

Earlier builds also copied complete quotation documents—including embedded signature or template image data—into one `localStorage` value. Safari rejected the write once its origin quota was reached. Older error handling then treated that cache failure as a Supabase outage and could make an unsaved browser-only quotation look successful.

V4.29.20 makes Supabase authoritative. A preview does not consume a number and ignores browser-local rows. The first successful database save locks the company/year sequence, allocates the next number and writes the quotation in the same transaction. A rollback consumes nothing. Updates are matched by the logical quotation ID and keep the original number and creator.

The live in-memory history remains complete. Only a compact, bounded fallback copy is written to the browser, and legacy local rows are no longer uploaded automatically.
