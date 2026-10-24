# KeySuite V4.29.25 upgrade from V4.29.24

This is a release candidate for testing. Nothing has been deployed, pushed or applied to production.

## Files

The FULL CLEAN GitHub archive contains the complete static project. Serve its contents with the same HTTPS/static hosting and existing Supabase configuration used by V4.29.24. No application build step or new production npm dependency is required. Preserve environment-specific hosting settings and credentials.

The UPGRADE archive contains only new/changed files relative to V4.29.24. Back up the existing installation, then overlay the archive contents at the project root. Keep all unrelated files. See UPGRADE_FILE_MANIFEST_V42925.txt. This upgrade is not intended to be overlaid directly onto V4.29.23 or an older build.

## Supabase — separate approval and staging verification required

1. Review only `supabase/migrations/20261024030000_keyhq_user_avatar_profiles_v42925.sql`. Do not execute all inherited migration files or all historical SQL helpers.
2. The existing V4.29.24 database must already have `public.ks_user_access` with company_id, email and active, Supabase Auth, and existing KeyHQ workforce/presence functions. Existing workforce/avatar configuration is left intact.
3. After approval, apply this one transaction in a staging project first, as the migration/database owner. It creates a new appearance table and narrowly scoped helper/RPC functions, RLS, revision trigger and Realtime publication membership. Existing accounts, access rules, desks, quotations and roles are never updated. Existing appearance choices are copied when the legacy profile table exists; subsequent migration runs do not overwrite saved profiles.
4. The directory RPC maps current enabled company memberships to actual `auth.users.id`. Saves derive the user ID from `auth.uid()`; the client supplies no target user. Employees can select same-company profiles and insert/update only their own appearance. Anonymous access, deleting profiles, changing identity columns and writing extra appearance fields are denied.
5. Sign in with two different enabled test employees in the same staging company. Open KeyHQ, select Level 6 and use Workforce → Avatar. Save, reload and verify the other session receives the appearance. Test an account from another company and a disabled account. Test sign-out, reconnect and migration-unavailable behavior.
6. Verify Realtime publication membership with `supabase/verification/verify_keyhq_v42925.sql`. If the publication was absent during migration, arrange its creation/configuration in staging, then rerun this migration; it conditionally adds only the new table. A 20-second context refresh remains a fallback if Realtime disconnects.
7. Only after staging acceptance and explicit production approval should the migration and website be released. Refresh installed PWA/browser tabs so the V4.29.25 service worker replaces old cached entrypoints.

Without the migration, existing workforce/office views still work and render the shared characters using legacy choices. Account customization is unavailable with a visible message; it does not silently save to local storage. Maya and Adam's explicitly labelled demo still saves locally.

## Recovery

Restore the V4.29.24 static files and its service worker if needed. The new database table can remain unused, preserving any customization. No destructive rollback is needed. Do not drop the table without backing up profiles and separate approval. Existing Auth/membership/legacy profile tables must not be removed.

## Scope and limits

Appearance synchronization is included. Position, activity and manual commands remain local visual simulation using the existing workforce/presence data; this is not authoritative multiplayer movement. Manual click-to-move and desk interactions operate in Level 6; existing automatic routes/elevator behavior remain available. The owner-only Location Tracker and Owner Room access are unchanged. AI rows supplied by the workforce source are labelled AI and use the same rig; no AI accounts or new AI decisions are provisioned.

The original shared rig offers body/face presets, five hair choices, skin/hair colors, five clothing choices, shoes and glasses. Nonbinary preserves its identity value on the common rig. Legacy moustache/beard data remains stored in the old table, but this rig has no facial-hair geometry; old glasses variants map to the shared glasses accessory. Names, roles and desks are not editable through the self-service appearance form.

Only the visible floor's characters are instantiated. The full-tower overview does not instantiate workforce rigs. Very narrow screens keep the complete employee names in scrollable lists and show the selected character's scene label to avoid covering the office with overlapping labels. All other scene name labels retain the shared 11px white-on-charcoal style.

Validate in installed Safari before production acceptance: automated compatibility checks used WebKit 18.4, not the installed Safari application. Production Auth/PostgREST/Realtime end-to-end testing remains a staging step because production access was not authorized.
