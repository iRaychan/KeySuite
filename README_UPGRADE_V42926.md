# KeySuite V4.29.26 upgrade

Continue from KeySuite V4.29.25. This package supports both the supplied KeyHQ V0.9 FULL archive and the subsequently prepared KeyHQ V0.10 FULL CLEAN archive. The helper checks both known baselines and refuses to overwrite locally modified files.

1. Back up the complete current project and retain the currently deployed ZIP.
2. Extract the UPGRADE ZIP into a separate folder, not over the live project.
3. Run `python3 tools/apply_v42926_upgrade.py /absolute/path/to/existing/project` from the extracted upgrade folder. This validates all affected files without writing.
4. If the dry run passes, repeat with `--apply`. Review the resulting files before publishing. The helper removes only verified retired legacy files and performs no network or database operations.
5. Publish the complete upgraded folder through your existing hosting workflow. The FULL CLEAN ZIP is an alternative complete source package. The service-worker cache and visible version are updated to V4.29.26.

## Supabase

The KeySuite project already has V0.9 social and V0.10 groups/rides deployed. V0.10 was registered remotely as **20261025040732_keyhq_v010_groups_rides**, corresponding to source file **20261024184425_keyhq_v010_groups_rides.sql**. Do not apply that SQL a second time. Reconcile that timestamp mapping in your own migration history before running a blanket CLI push.

The only new SQL for V4.29.26 is `supabase/migrations/20261025052224_keyhq_v42926_vehicle_speeds.sql`. It updates the existing authenticated driver-only ride function to enforce vehicle-specific speeds: hoverboard 4.4, bicycle 6.6, scooter 8.8 and golf cart 11 metres/second. It does not update quotation, customer or employee rows. Apply it through your normal reviewed migration process before using shared rides at the new speeds. **It is included and locally tested, but has not been applied to live Supabase in this build task.** No Edge Function deployment is needed.

For a different/fresh Supabase project, use the existing project provisioning process and establish prior migrations first. This ZIP is not an instruction to replay historical SQL against an existing production database.

## Preserved designs and data

The coastal campus and original Keylargo logo are retained. Legacy eight-floor KeyHQ remains removed. The phone Messenger implementation and existing phone styles are unchanged. Quotation customer display uses the same authorized lookup as Quotation History; no customer names are hardcoded and no records were rewritten.

See `QA_V42926.md` for test coverage and remaining hosted-device acceptance checks. GitHub and frontend hosting were not modified by this build.
