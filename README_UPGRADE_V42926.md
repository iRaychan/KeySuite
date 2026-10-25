# V4.29.26 consolidated amendment — installation

Use this amendment package instead of the earlier master package. It preserves that master implementation and addresses the six reported amendments. The earlier archives remain unchanged.

## Files

FULL CLEAN contains the entire source project. UPGRADE supports five known delivered baselines: V4.29.25/KeyHQ V0.9, V4.29.25/KeyHQ V0.10, earlier V4.29.26 V4.29.26 master, and the pre-deployment consolidated amendment. Back up your current deployment first.

1. Extract UPGRADE into a separate directory.
2. Run `python3 tools/apply_v42926_upgrade.py /absolute/path/to/current/project` from the extracted upgrade directory.
3. Resolve any reported local edits rather than overwriting them. After a successful dry run, repeat with `--apply`.
4. Publish the resulting complete directory through your existing hosting workflow, or use FULL CLEAN. The service-worker cache generation and KeyHQ entry URLs identify the amendment.
5. Validate signed-in employee behavior, Safari/mobile devices and the remaining live scenarios in QA_V42926.md.

The helper verifies file hashes, refuses unknown local changes and removes only verified retired legacy files. It does not deploy, contact GitHub or run SQL.

## Supabase — amendment deployed and verified

The avatar-state migration was successfully applied to KeySuite (`skidqdixnnnuhvarekxp`) after explicit approval on 26 October 2026 (Malaysia time). Source `20261025162321_keyhq_v42926_avatar_state.sql` is registered remotely as **20261025164217_keyhq_v42926_avatar_state**. Do not apply it again to this project.

Post-deployment checks confirmed table RLS, denied anonymous reads/execute, denied direct client writes, authenticated access, fixed function search paths and Realtime publication. Security-advisor counts are unchanged. The receipt is SUPABASE_AMENDMENT_STATUS.json.

This adds the protected avatar-state table and authenticated wrappers needed for shared employee movement and props. Updates require the signed-in enabled employee's active presence session. No quotation, price, account or customer records were rewritten. The frontend source and ZIPs are ready; frontend hosting and GitHub were not changed. Real two-employee acceptance remains outstanding after publishing the frontend.

Already-applied mappings (do not reapply):

| Source SQL | Remote version |
|---|---|
| 20261024184425_keyhq_v010_groups_rides.sql | 20261025040732 |
| 20261025052224_keyhq_v42926_vehicle_speeds.sql | 20261025063441 |
| 20261025074942_keyhq_v42926_playable_campus.sql | 20261025113911 |
| 20261025162321_keyhq_v42926_avatar_state.sql | 20261025164217 |

For another project, establish the prior schema and apply only missing migrations. No new Edge Function is required. GitHub and frontend hosting remain untouched.
