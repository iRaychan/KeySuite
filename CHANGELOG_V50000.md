# KeySuite V5.00.00

V5.00.00 supersedes V4.29.26 without removing or redesigning the completed master build.

## Preserved master scope

- Independent per-avatar movement and ownership.
- Sims-style automatic cutaway walls, with the superseded wall-transparency behavior kept removed.
- Visible Smoke, Beer and Both hand props, particles, actions and cleanup.
- Camera clipping constraints and zoom recovery.
- Direct, reliable Manual control without an Auto-to-Manual workaround.
- Walking stability, jitter, ownership and rendering corrections.
- Existing KeySuite business features, selectors, quotation behavior, KeyHQ campus and the original Keylargo logo.

## V5 addition

- Added a KeyHQ Messenger Chat button directly beside Important Note on the KeySuite Dashboard.
- Reused the same Messenger phone component as KeyHQ: compact iPhone view, expand control for the existing Duo view, employee search, private and group conversations, history, read state and presence.
- Connected both surfaces to the same `KeyHQSocial` instance and the existing protected Supabase message/conversation tables. Messages and unread totals are shared rather than copied.
- Added a local subscriber interface to the parent social adapter so KeySuite and the embedded KeyHQ frame receive the same Realtime refresh and action results.
- Added V5 cache/version locks and browser regression coverage.

No new Supabase migration or Edge Function is required for V5.00.00. Existing V0.9, V0.10 and V4.29.26 migrations remain authoritative.
