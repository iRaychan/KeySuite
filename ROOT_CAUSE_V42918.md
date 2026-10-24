# Safari login root cause — V4.29.18

## Evidence

1. Supabase Auth logs recorded successful password and `/user` responses from Safari while KeySuite remained on “Checking existing session…”. The backend and credentials were therefore not the blocking point.
2. The V4.29.17 screen remained frozen beyond its eight-second JavaScript deadline. This is only consistent with Safari's main task queue being starved, rather than a normal unresolved network promise.
3. `v42917-version-lock.js` observed all subtree text and child changes, then unconditionally assigned `textContent` to every version label during each callback. Assigning `textContent` creates another observed mutation—even when the visible value is unchanged—so the observer continuously triggered itself.
4. The loop begins at `DOMContentLoaded`, the same boundary where the page finishes startup. Network requests can complete in the background, but authentication promise continuations and timeout callbacks cannot advance while the microtask queue keeps refilling.

## Correction

- Write a version label only when its value actually differs.
- Coalesce mutation notifications to a single `requestAnimationFrame` callback.
- Keep the observer for late-loaded modules, but make a completed pass produce zero further mutations.
- Add explicit deadlines to every awaited post-login initialization stage and to cleanup sign-out.
- Rotate the service-worker cache and use new V4.29.18 URLs so Safari cannot reuse the defective V4.29.17 runtime.
- Keep a safe compatibility shim at the old V4.29.17 version-lock URL because an already-controlled Safari tab can request that filename once before the replacement service worker claims the page.

## Verification requirement

The automated regression proves a second observer pass makes no DOM writes and that a zero-delay timer still fires. Auth tests cover logged-out, valid-session, expired-session refresh, reload and stalled-request paths. Production Safari validation must be repeated after the V4.29.18 files are uploaded; V4.29.17 cannot be considered fixed.
