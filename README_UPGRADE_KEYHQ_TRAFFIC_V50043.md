# KeySuite V5.00.43 — KeyHQ Traffic Optimization Upgrade

This upgrade is only for an existing, unmodified **KeySuite V5.00.43 FULL BUILD**.

## What it changes

- Replaces the 30-second full KeyHQ social refresh with targeted Realtime synchronization.
- Stops campus services when KeyHQ is closed or the tab is hidden.
- Separates lightweight Messenger activity from the KeyHQ campus lifecycle.
- Reduces stationary and moving actor-state writes.
- Prevents actor updates from causing complete actor-table reloads.
- Adds one cross-tab leader for shared KeyHQ background work.
- Caches static KeyHQ context and removes the 20-second full context reload.

## Included application files

- `index.html`
- `sw.js`
- `keyhq-coordinator.js` — new file
- `keyhq-social.js`
- `keyhq-launcher.js`
- `keyhq-messenger.js`
- `keyhq/campus/remote-state.js`
- `keyhq/campus/main.js`

The optimization report is included as `KEYHQ_TRAFFIC_OPTIMIZATION_REPORT.md`.

## Installation

1. Confirm the deployed source is exactly KeySuite V5.00.43.
2. Back up the current deployed files.
3. Copy this upgrade over the deployment root while preserving the included paths.
4. Ensure the new root file `keyhq-coordinator.js` is uploaded.
5. Publish all included files together. Do not publish only part of the upgrade.
6. Reload KeySuite. If it is installed as a PWA, close all KeySuite tabs and reopen it so the updated service worker can activate.

## Post-upgrade checks

1. Sign in and confirm Dashboard and Messenger load.
2. Send, receive, read, and reopen a direct conversation.
3. Open KeyHQ, move the local actor, stop, close KeyHQ, and reopen it.
4. Hide and restore the browser tab.
5. Open two KeySuite tabs, then close the active leader tab and confirm the other tab continues.
6. Confirm quotations and KeyAI context still appear in KeyHQ for authorized roles.
7. Review Supabase request logs: closed KeyHQ should have no actor/session/game/ride polling, and stationary actors should have no continuous actor RPCs.

## Database changes

**NONE.** Do not run a migration or change RLS, billing, or Supabase settings for this upgrade.

