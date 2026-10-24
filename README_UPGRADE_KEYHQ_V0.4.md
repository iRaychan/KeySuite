# KeyHQ V0.4 Living Office Upgrade

Baseline: **KeySuite V4.29.22 Full**  
Module release: **KeyHQ V0.4 Living Office**  
Cache identifier: **keyhq04**

This package was built from the newest verified local source: KeySuite V4.29.22 with KeyHQ V0.3. It preserves the existing KeySuite quotation, pricing, customer, product, branding, authentication, and security workflows.

## What changes

- Level 6 desk capacity is the enabled-account count rounded up to the next multiple of four. Desks are connected four-person pods in a 2-facing-2 layout with cross dividers.
- Every assigned PC and avatar displays the actual enabled KeySuite account name. Only an enabled Owner can change gender presentation, accent, or the unique desk assignment.
- PC clicks show only quotation rows already returned by the authorized KeySuite quotation store. Sealed rows open the existing KeySuite Quotation History PDF/print workflow directly; KeyHQ no longer renders a generic quotation template.
- Each account has one persistent chibi identity. Online users return through the elevator and work at their assigned Level 6 desk. An Owner may work in Level 8.
- Offline avatars walk to varied shared leisure destinations without immediate repeats. Gym, basketball, canteen, and sauna are 30 minutes; toilet and smoking are 10 minutes. Timers begin only after arrival.
- Routes have explicit walk-to-lift, elevator, and walk-to-destination stages. Animated feet, legs, and arms are tied to actual walking state; no position-smoothing glide is used.
- The Level 6 Owner view includes a live location tracker with camera jump. Level 8 and its private leisure remain Owner-only; shared leisure remains available to employees.
- Level 7 now has exactly 18 conference seats, 9 on each side.

## Supabase migration (deployed separately)

The V0.4 database migration was applied to Supabase project `skidqdixnnnuhvarekxp` on 24 October 2026 and recorded as `20261023160548_keyhq_v04_presence_dynamic_desks`. These source and verification files remain included for audit and recovery:

1. `supabase/migrations/20261023233000_keyhq_v04_presence_dynamic_desks.sql`
2. `supabase/migrations/20261023233001_keyhq_v04_presence_dynamic_desks_verify.sql`

The migration adds Owner-safe dynamic desk validation and authenticated self-only online/offline presence. Direct table access remains revoked. The verification script passed after deployment, all six existing avatar records were preserved, and an authenticated presence call passed inside a rolled-back smoke-test transaction.

## Deployment

Copy every path in `UPGRADE_FILE_MANIFEST_KEYHQ_V0.4.txt` over an existing complete KeySuite V4.29.22 installation, preserving folders. Clear the site cache or reload twice so `keyhq04` is active. The Supabase migration is already deployed; the website remains undeployed and still requires separate approval.
