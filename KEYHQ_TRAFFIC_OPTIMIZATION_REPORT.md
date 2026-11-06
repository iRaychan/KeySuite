# KeyHQ Supabase Traffic Optimization Report

Build: KeySuite / KeyHQ V5.00.43  
Date: 6 November 2026 (Malaysia time)  
Implementation type: Frontend/application optimization only

## Outcome

KeyHQ no longer uses a 30-second monolithic social refresh or a 20-second full context refresh. Supabase synchronization is now Realtime/event-driven, scoped to the resource that changed, controlled by KeyHQ visibility, coordinated across browser tabs, and backed by a five-minute leader-only safety reconciliation.

No Supabase database, schema, migration, index, RLS policy, billing setting, plan, Edge Function, or production deployment was changed.

## Files changed

| File | Change |
|---|---|
| `keyhq-coordinator.js` | New cross-tab leader election and state broadcast module |
| `keyhq-social.js` | Split Messenger/campus transport, targeted Realtime updates, narrow queries, five-minute reconciliation, single-flight reads |
| `keyhq-launcher.js` | Visibility lifecycle, cached context resources, event-driven authentication, removed 20-second context timer |
| `keyhq-messenger.js` | Uses the lightweight cached Messenger context instead of loading the complete campus context |
| `keyhq/campus/remote-state.js` | Meaningful-change actor persistence, movement throttling, final stop write, incremental actor merge/delete |
| `keyhq/campus/main.js` | Passes incremental actor Realtime metadata into remote-state synchronization |
| `index.html` | Loads the coordinator before KeyHQ social services and updates cache-busting versions |
| `sw.js` | Precaches the coordinator and advances the service-worker cache identifier |
| `tests/keyhq-traffic-optimization.cjs` | New lifecycle, request ownership, actor throttling, and takeover regression tests |
| `tests/keyhq-coordinator-host.html` | Local-only two-tab browser fixture |
| `tests/keyhq-coordinator-browser.cjs` | Real browser leader/preemption/takeover test |

## Root causes addressed

### Actor write/read feedback

Before:

- actor pose written every 250 ms while KeyHQ was visible;
- stationary actors were still written;
- every actor Realtime event caused a complete actor-state query.

After:

- position changes below 0.08 world units and yaw changes below 0.06 radians are ignored;
- movement writes are capped at one every 500 ms;
- stationary unchanged actors do not write continuously;
- a final state is written after movement stops;
- actor INSERT/UPDATE/DELETE events merge only the affected actor;
- the sender's own actor event is not reloaded;
- a full actor snapshot occurs only on campus activation/recovery/reconciliation.

### Incorrect background lifecycle

Before, loading KeySuite initialized the entire KeyHQ social/campus workload. Closing or hiding KeyHQ left the social polling active.

After, lifecycle ownership is explicit:

- **Background Messenger:** messages, unread count, group metadata, new-message events, and the minimum presence view.
- **Active campus:** sessions, invitations, campus presence lease, actors, rides, games, inputs, avatar channel, people/context, quotations, and KeyAI context.

Opening a visible KeyHQ starts campus transport. Closing KeyHQ or hiding the tab stops campus transport and releases that tab's campus presence lease. Returning to a visible KeyHQ performs one controlled reconciliation.

### Monolithic refresh fan-out

The former `KeyHQSocial.refresh()` downloaded messages twice, then sessions, presence, conversations, group messages, inbox counts, rides, games, inputs, and actor state every 30 seconds.

The replacement routes events separately:

- direct message event → merge one message and adjust unread state;
- group message event → merge one message and refresh group metadata only;
- group/member change → refresh group metadata only;
- session/participant change → refresh active sessions only;
- presence event → merge one lease row;
- ride/game/input event → merge one row;
- actor event → merge/delete one actor.

There is no recurring 30-second full refresh.

### Repeated context loading

Resources are now classified as follows:

| Classification | Resources |
|---|---|
| Realtime/event-driven | messages, presence rows, sessions, actors, rides, games, inputs, avatar changes while campus is active |
| Once per authenticated session | people directory, avatar directory for Messenger, selection scopes, floor configuration |
| On KeyHQ open/visible reconciliation | quotations, campus snapshot, KeyAI inbox, live avatar channel |
| On demand | direct/group message history and older-page pagination, quotation PDF |
| Low-frequency safety reconciliation | Messenger and active campus snapshots, leader-only every five minutes while visible |

Concurrent directory/context requests are coalesced into shared in-flight promises. Saving people, avatars, or floor configuration invalidates only the relevant cache.

## Cross-tab leader mechanism

`keyhq-coordinator.js` uses:

- `BroadcastChannel` for cross-tab state distribution;
- `localStorage` for a renewable ownership lease and fallback messages;
- a unique UUID per tab;
- a 2-second lease renewal;
- a 6.5-second expiry;
- priority for a visible active-campus tab over a background or hidden tab.

Only the leader owns Supabase Realtime channels, presence heartbeat, and safety reconciliation. Followers receive state through the broadcast channel. User-initiated Messenger operations remain available in any tab. If the leader closes or crashes, another tab claims the expired lease. The two-tab browser test verified background ownership, active-tab preemption, and takeover after leader closure.

## Query optimization

- All `select('*')` calls were removed from the KeyHQ social adapter.
- Background direct-message state is limited to the newest 50 rows with explicit columns.
- Full conversation history remains paginated and is loaded only when a conversation opens.
- Group history is no longer downloaded during background refresh; it is loaded per conversation on demand.
- Sessions, presence, actor, ride, game, and input snapshots select explicit columns.
- Static directory/configuration data is cached and invalidated by matching save operations.

## Remaining timers and why they remain

| Interval | Purpose |
|---:|---|
| 2 seconds | Local browser lease renewal only; no Supabase request |
| 60 seconds | Campus presence heartbeat in the single visible leader; the database lease lasts 150 seconds |
| 5 minutes | Visible leader-only safety reconciliation after missed/reconnected Realtime events |
| 250 ms timeout | Event debounce for group or session metadata after a burst; not a polling loop |

The previous 20-second context timer and 30-second social polling timer were removed.

## Estimated request reduction

These are architecture-based estimates. Production egress should still be compared over equal-duration windows after deployment.

| Scenario | Before | After | Expected reduction |
|---|---|---|---:|
| A. Signed in, KeyHQ never opened | About 24 KeyHQ requests/minute/tab plus Realtime amplification | One Messenger snapshot, event updates, then five-minute leader-only reconciliation | About 95–98% of recurring REST/RPC traffic |
| B. KeyHQ open, actor stationary | Actor RPC about 4/second plus actor-state reads | One meaningful initial/final write; no continuous stationary writes or per-event full reads | More than 99% of actor traffic while idle |
| C. Actor moving | Up to 4 actor RPCs/second plus full actor reads | At most 2 actor RPCs/second; affected-row Realtime merge | At least 50% of writes and nearly all repeated actor reads |
| D. KeyHQ closed | Campus polling continued | Campus channel, heartbeat, avatar channel, and context activity stopped | Approximately 100% of campus traffic while closed |
| E. Browser hidden | Campus traffic continued | Campus suspended; safety reconciliation paused | Approximately 100% of nonessential campus traffic while hidden |
| F. Two tabs | Traffic approximately doubled | One leader owns shared work | Near one-tab background volume instead of two-tab volume |

## Verification results

Passed:

- JavaScript syntax checks for coordinator, social adapter, launcher, Messenger, avatar sync, remote actor state, and campus main.
- New KeyHQ traffic regression: background Messenger does not start sessions/actors/games/inputs/rides or a campus presence lease.
- New actor regression: one stationary initial write, movement capped near two writes/second, one final stop-state write.
- New coordinator regression: one leader and deterministic takeover.
- Real two-tab Chrome test: single background leader, active-campus preemption, leader-close takeover.
- Existing V0.9 adapter checks: channel cleanup, stale-session result discard, retry idempotence, nonce mismatch protection.
- Existing avatar synchronization checks: 7 passed with mocked Supabase RPC/Realtime and no production access.
- Existing game-rule checks.
- Existing V5.00.42 Bug 03 regression.
- Existing Chrome elevator and camera browser tests.

Legacy suite observations:

- `tests/v010/browser.cjs` reached the fully loaded 12-actor fixture but stopped on an old layout assertion expecting a closed people list to have a 320 px client height; the measured height was 0. No changed traffic-optimization CSS is involved.
- `tests/v010/activities.cjs` ran the activity simulation but retained unrelated route/ball assertions that do not pass against this V5.00.43 build. Elevator and camera tests from the same suite passed.
- Historical version-locked tests expecting V4.29.17, V5.00.31, or other earlier releases were not treated as V5.00.43 acceptance tests.

No production account, production Supabase endpoint, production message, database row, or deployment was used during verification.

## Deployment verification checklist

1. Deploy to staging first with the service worker and all changed KeyHQ files together.
2. Test login, dashboard, Messenger send/receive/read/history, KeyHQ open/close/reopen, actor movement/idle, quotations, KeyAI context, hidden/visible, two tabs, leader close, and logout/login.
3. In browser Network tools, group requests by `ks_keyhq_*` and `rpc/keysuite_keyhq_*` for fixed 10-minute windows.
4. Confirm dashboard-only mode has no session/actor/game/ride campus requests.
5. Confirm a stationary actor produces no continuous actor RPCs.
6. Confirm actor Realtime events do not produce actor-table GET requests.
7. Confirm closing/hiding KeyHQ removes the campus channel and heartbeat.
8. Confirm two tabs produce approximately one tab's shared background traffic.
9. Compare Supabase request counts and response bytes before/after; egress reduction should be measured from bytes, not request counts alone.

## Supabase/database changes

**NONE.**

