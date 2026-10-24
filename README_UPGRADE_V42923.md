# KeySuite V4.29.23 upgrade

Base: the supplied KeySuite V4.29.22 Full / KeyHQ V0.4 Living Office package.

Replace the files listed in `UPGRADE_FILE_MANIFEST_V42923.txt`, then deploy the service worker and clear the previous `keysuite-v42922-keyhq04` cache. Apply the avatar migration separately through the normal reviewed Supabase migration process; it is additive and preserves existing desks, presence, assignments and RLS.

V4.29.23 removes every rendered staircase, uses elevators only, adds an enclosed WC to each floor, rebuilds Level 6 as a rectangular architectural office, enlarges nameplates and monitor targets, adds Center Screen and resize recentering, persists self-service avatars, adds leisure action animation, and opens sealed original-layout quotation documents in a KeyHQ modal with Download PDF and Print.
