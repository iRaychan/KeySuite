# KeySuite V4.28.13 UPGRADE

Baseline: **V4.28.12 FULL CLEAN**

## Changes

- System Curve display stops at **105% of the design/system-point head**.
- Example: 100 m -> 105 m maximum displayed System Curve head.
- CHC C4/C6, BFI and ES: KeySuite screen and PDF.
- KeyBot: ES motor-limited / trimmed-impeller PDF System Curve.
- Calculation and operating-point intersection are unchanged; only the displayed tail length is capped.
- Keeps V4.28.12 ES endpoint fix, global Power 5th-order curve fitting and PDF line-width settings.

## Deployment

No database migration is required.

After uploading the web files, redeploy KeyBot:

```powershell
npx.cmd supabase@latest link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase@latest functions deploy telegram-webhook
```
