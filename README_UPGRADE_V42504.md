# KeySuite V4.25.04 Upgrade

Upgrade target: **V4.25.03 → V4.25.04**

## Changes
- ES manual impeller adjustments now immediately preserve and redraw the selected Impeller Curve display mode.
- ES impeller display modes now follow the current selected diameter correctly, including Max + Min + Duty, Selected Only, Selected + Adjacent, Custom and All.
- Custom impeller checkboxes retain prior selections across duty-impeller changes.
- Display Setting label is shortened to **Variable Curve**.
- ES Variable Curve labels show the impeller diameter on the 50 Hz/base curve only; 45 / 40 / 35 / 30 / 25 Hz show frequency only.
- PDF Page 1 Setting: **Follow Display Setting** is ON by default. Unticking it reveals independent PDF Curve Setting controls.
- **Hide Duty Point** exports Page 1 only and removes duty-point display. CHC/CHC G1/BFI retain fixed motor information; ES hides duty-dependent motor information.

## Deployment
Overlay this upgrade onto an existing V4.25.03 deployment, or deploy the V4.25.04 Full Clean release.

**No Supabase database migration and no Edge Function deployment are required.**
