# KeySuite CHC v0.22 — Quotation Margin & Pagination Indicator

GitHub-ready test build.

## Changes
- Page 1 now uses the same narrow 8 mm left/right printable margin as item pages.
- Added visible red dashed page-break indicators in the quotation editor. These indicators do not print.
- Corrected the pagination estimator so the wider description column is measured more accurately.
- Fixed the final-page packing bug that could create unnecessarily empty pages.
- Totals remain reserved on the final page, and any item crossing the safe bottom area moves intact to the next page.

Upload all extracted files to the GitHub Pages repository root, then hard-refresh.


## v0.22 quotation print refinements
- Page 2+ logo fixed at 30 mm × 11 mm.
- Page 2+ header uses `Date:` and `Our Reference:` with no gap before the colon.
- Header rule below Pos. extends 1.67 mm on both sides.
- Added a full table-width line above Sub-total.
- Lines above and below Total extend 1.67 mm on both sides.
- Pagination reserves at least one empty printed row between the last item and E. & O.E.


## v0.22 print changes
- Page 2+ quantity prints as `1 Unit` or `2 Units`.
- Page 2+ unit price, amount, subtotal, SST and total omit the `RM` prefix.
- Total column text moved 3 mm left.
- Page 2+ logo enlarged to match the Page 1 visual size, with Date and Our Reference directly below it.
- Page 1 content shifted 8 px to the right.
