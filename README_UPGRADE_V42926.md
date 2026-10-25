# KeySuite V4.29.26 — master revision

This is the master-prompt revision, dated 25 October 2026. It extends the existing coastal campus. The old eight-floor implementation stays removed. The original logo, business engines and approved Messenger phone are retained.

## Install the files

The FULL CLEAN ZIP contains the complete project. The UPGRADE ZIP supports the original V4.29.25 / KeyHQ V0.9 FULL, the subsequent V0.10 FULL CLEAN, and the earlier V4.29.26 FULL CLEAN build. Keep a backup of your current deployment.

1. Extract the upgrade into a separate folder.
2. From that folder, run `python3 tools/apply_v42926_upgrade.py /absolute/path/to/existing/project` for a dry run.
3. After it passes, repeat with `--apply`. The helper checks file hashes and refuses to overwrite local edits. It removes only verified retired files. It performs no network, database or GitHub actions.
4. Publish the resulting complete folder through your existing frontend hosting workflow. Alternatively use the FULL CLEAN package. The service worker uses a new master-revision cache generation.
5. Sign in as two enabled employees and perform the live acceptance checks in QA_V42926.md.

## Supabase deployment completed

Project: KeySuite (`skidqdixnnnuhvarekxp`). The master migration was deployed successfully and checked on 25 October 2026. **Do not apply it again to this project.** The source/remote timestamp mapping is:

| Source SQL | Registered remote version |
|---|---|
| 20261024184425_keyhq_v010_groups_rides.sql | 20261025040732 |
| 20261025052224_keyhq_v42926_vehicle_speeds.sql | 20261025063441 |
| 20261025074942_keyhq_v42926_playable_campus.sql | 20261025113911 |

Reconcile these mappings before any blanket CLI push. For another project, establish its previous schema first and apply only migrations absent from its history.

The new migration is necessary for game inputs/shared state, larger sports participant capacities, and indoor hoverboard floor/elevation sharing. The two game tables have RLS, participant-only reads, no anonymous access, and no direct authenticated writes. RPCs enforce enabled membership; only the host can publish shared game state. The two tables are registered for Realtime. No customer, quotation, price or employee records were rewritten. No new Edge Functions are required.

SUPABASE_MASTER_DEPLOYMENT_RECEIPT.json records the successful deployment and post-deployment checks. Security-advisor counts are unchanged from before deployment; existing unrelated warnings remain.

GitHub and frontend hosting were not modified. The requested “GitHub” filename labels the complete source archive; it does not mean a push occurred.

See CHANGELOG_V42926.md and QA_V42926.md for the implementation and its acceptance limits.
