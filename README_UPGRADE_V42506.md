# KeySuite V4.25.06 Upgrade

Upgrade target: **V4.25.05 → V4.25.06**

## Change
- **Hide Duty Point** now hides duty markers/values from Head, Efficiency, Power and NPSH on PDF Page 1.
- Curves remain visible.
- Applies to CHC C6/G2, CHC C4/G1, BFI and ES.
- Existing Page-1-only behavior when Hide Duty Point is enabled is retained.

## Deployment
Overlay the upgrade patch onto an existing V4.25.05 deployment, or deploy the V4.25.06 Full Clean release.

**No Supabase migration or Edge Function deployment is required.**
