# Upgrade from V5.00.09 to V5.00.10

Back up the current hosting directory. Extract the upgrade ZIP into the existing V5.00.09 application root, replacing matching files. The archive has the same root layout as index.html. It includes changed and added files only; no deletions are required. Alternatively use the FULL CLEAN ZIP for a complete source tree.

Both new SQL migrations are already applied to the connected KeySuite project skidqdixnnnuhvarekxp following explicit user approval. Do not reapply them to that project. Other database environments need their own review/approval and the included migrations in timestamp order. All earlier database prerequisites remain unchanged. No edge-function deployment is required.

Deploy the frontend files together, then reload the application to activate the V5.00.10 service worker. Confirm the visible version is V5.00.10. This task has not deployed or pushed the frontend. Do not run every historical SQL file indiscriminately.

See CHANGELOG_V50010.md and VERIFICATION_V50010.md. Run authenticated acceptance for quotation revisions, account customization persistence, shared games/invitations and assignment changes after frontend deployment.
