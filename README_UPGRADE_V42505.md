# KeySuite V4.25.05 Upgrade

Upgrade target: **V4.25.04 → V4.25.05**

## Changes
- PDF Page 1 frequency now includes corresponding RPM (for example `50Hz 2900rpm`).
- ES Hide Duty Point / Page-1-only export shows RPM only while duty-dependent motor information remains hidden.
- ES Product display first row: model + Recommended Motor controls.
- ES Product display second row: pole + selection status / display badges.

## Deployment
Overlay this upgrade onto an existing V4.25.04 deployment, or deploy the V4.25.05 Full Clean release.

**No Supabase database migration and no Edge Function deployment are required.**
