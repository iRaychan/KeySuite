# Upgrade to KeySuite V4.27.15

Apply over V4.27.14.

Selector fixes:
- Quick Selection now carries the selected ES pole into the curve screen.
- ES models that share the same visible model code reopen as the selected 2P or 4P record.
- BFI changes its displayed model name immediately when Motor Phase changes.
- Switching BFI from 3 Phase to 1 Phase changes `BFI 2-3T` to `BFI 2-3`.
- The BFI Product Curve title, display and quotation/export payload stay synchronized.
- Updated cache keys load the corrected selector files immediately.

Deployment:
1. Upload the files in this upgrade package to GitHub.
2. Wait for GitHub Pages to complete deployment, then refresh KeySuite.

No Supabase Edge Function deployment or database migration is required for V4.27.15.
