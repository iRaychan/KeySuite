# KeySuite V4.25.07 Upgrade

Upgrade target: **V4.25.06 → V4.25.07**

## Changes
- Fix CHC C6/G2, CHC C4/G1 and BFI **Hide Duty Point** so Efficiency, Power and NPSH duty markers/values are also hidden.
- Keep the performance curves themselves visible.
- ES Hide Duty Point keeps the original Page 1 vertical layout: motor HP/pole is hidden but its row space is reserved, RPM remains visible, and the curve section does not move upward.
- Page-1-only Hide Duty Point behavior is retained.

## Deployment
Overlay this upgrade patch onto an existing V4.25.06 deployment, or deploy the V4.25.07 Full Clean release.

**No Supabase migration or Edge Function deployment is required.**
