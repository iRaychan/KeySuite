# Upgrade to KeySuite V4.27.14

Apply over V4.27.13.

OEM Product and Dashboard identity fixes:
- VEC VMS pages display VMS immediately without first flashing CHC.
- VEC VFI Product titles, series lists, model names and Dashboard results use VFI instead of BFI.
- If only one CHC generation is assigned, Product, Selection and Dashboard show the common series name such as VMS.
- If both generations are assigned, VMS C4 and VMS C6 remain separate.
- Updated cache keys load the corrected identity files immediately.

Deployment:
1. Upload the files in this upgrade package to GitHub.
2. Wait for GitHub Pages to complete deployment, then refresh KeySuite.

No Supabase Edge Function deployment or database migration is required for V4.27.14.
