# Upgrade to KeySuite V4.27.02

Apply over V4.27.01.

OEM PDF popup correction:
- The assigned OEM Brand name and logo are written into the report before the popup's first visible render.
- ES reports, including VEC, no longer show B.G.Reich briefly before changing to the OEM logo.
- Brand logos on Page 1, Page 2 and Page 3 are replaced before the report document finishes writing.
- The first-render protection remains active even when `document.open()` recreates the popup document.
- Print continues only after the final Brand logo and fonts are ready.

Deployment:
1. Upload the V4.27.02 upgrade files to the KeySuite web host/GitHub.
2. Refresh KeySuite once after GitHub Pages finishes deploying.

No Supabase `db push` or `telegram-webhook` deployment is required.
