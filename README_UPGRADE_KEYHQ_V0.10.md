# KeySuite V4.29.25 · KeyHQ V0.10

This release upgrades the CURRENT NEW coastal campus from the supplied `KeySuite_V4.29.25_KeyHQ_V0.9_FULL.zip`. KeySuite remains V4.29.25; KeyHQ advances to V0.10. The building remains three storeys with its existing roof terrace, original Keylargo logo, grounds and sports facilities. The retired eight-floor office is removed.

## Packages

- `KeySuite_V4.29.25_KeyHQ_V0.10_FULL_CLEAN_GitHub.zip`: complete source tree, without Git internals, node_modules, local Supabase linkage or retired office code.
- `KeySuite_V4.29.25_KeyHQ_V0.10_UPGRADE.zip`: changed/new files plus a SHA-256 checked deletion manifest and optional local upgrade helper. Overlaying files alone does NOT remove the legacy office; use the helper or follow the deletion manifest.

Back up your checkout. Extract the upgrade ZIP to a separate directory, then run:

```
python3 /path/to/extracted-upgrade/tools/apply_keyhq_v010_upgrade.py /path/to/current-checkout
python3 /path/to/extracted-upgrade/tools/apply_keyhq_v010_upgrade.py /path/to/current-checkout --apply
```

The first command is a dry run. The helper refuses to overwrite or delete files that differ from the supplied V0.9 baseline or this release. Reconcile those differences explicitly. It copies local files only: it does not deploy, push Git commits, contact Supabase, or apply SQL.

## Database approval required before rollout

Prepared, NOT applied: `supabase/migrations/20261024184425_keyhq_v010_groups_rides.sql`.

The migration depends on the existing V4.29.25 avatar and V0.9 social migrations. It adds group conversations, members, messages, group read receipts and ride positions, with RLS, restricted grants and authenticated RPCs. It extends the existing social activity validator/capacity logic for the four vehicle types. Existing private messages, employee identities, desk assignments, permissions, quotation data and pricing tables are retained. Realtime publication registration is included if the publication exists.

Do not apply this migration to production or deploy the frontend until the owner approves. Review/test the migration in a staging copy first. Without it, existing private chat remains available; group chat and rides show an unavailable message rather than pretending to succeed.

After an approved deployment, refresh/reopen KeySuite. The service-worker cache changes to `keysuite-v42925-keyhq010` to retire cached legacy frontend files.

## Controls

- Double-click a visible surface to set the exact orbit pivot; drag to orbit, Shift-drag to pan, wheel to zoom. Reset restores the campus overview.
- Select your avatar in Avatar Actions. Camera Follow, Eyes Manual, Eyes Auto and Free Camera are separate controls. Manual movement uses only the arrow keys; drag the mouse to look.
- Ride vehicle opens the vehicle picker; walk to the chosen vehicle and press Enter. Use arrows to drive and Enter to exit when safely stopped. The driver can invite passengers through the same panel.
- Elevator provides Call and enter, then destination selection from the cabin. Work/leisure routes use it automatically. The three floors and roof terrace are the only stops.
- Meet your people excludes you, shows eight rows at most, and opens messaging/interactions. Avatar Actions remembers its collapsed state; the campus map remains visible.
- Messenger is a floating phone. Minimize, expand and close preserve the current conversation while the campus continues. Groups have an administrator who can rename the group and add/remove members.
- Click a workstation monitor to search authorized quotations. Original PDF opens above the monitor, preserving its selection, search and list position.

Read `KEYHQ_V0.10_REVIEW.md` for test results and limitations. Older version review/deployment documents are historical and are not evidence of a V0.10 deployment.
