# KeySuite CHC v0.20 — Quotation Margin & Pagination Indicator

GitHub-ready test build.

## Changes
- Page 1 now uses the same narrow 8 mm left/right printable margin as item pages.
- Added visible red dashed page-break indicators in the quotation editor. These indicators do not print.
- Corrected the pagination estimator so the wider description column is measured more accurately.
- Fixed the final-page packing bug that could create unnecessarily empty pages.
- Totals remain reserved on the final page, and any item crossing the safe bottom area moves intact to the next page.

Upload all extracted files to the GitHub Pages repository root, then hard-refresh.
