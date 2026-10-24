# KeySuite V4.29.17

## Fixed

- Safari no longer remains indefinitely on “Checking existing session…” when a persisted-session refresh or Supabase initialization stalls.
- The Supabase UMD dependency is pinned to 2.118.0, whose Auth client uses lockless coordination by default, instead of resolving a moving `@2` URL that previously exposed Safari to orphaned Web Locks.
- Supabase network calls now use an abortable six-second request deadline. A separate eight-second startup deadline covers SDK or storage stalls.
- A timed-out Auth client is disposed and replaced before the sign-in form is enabled, so the user is not handed the same unresolved client that caused the hang.
- The Auth runtime is idempotent and retires an older client if Safari briefly mixes a cached pre-upgrade shell with the cache-busted V4.29.17 script during service-worker activation.
- Authentication startup completes its initial session read before subscribing to auth-state changes; callbacks remain synchronous and make no Supabase calls.

## Preserved

- All V4.29.16 quotation integrity, scope and quantity corrections.
- Integrated KeyHQ, KeyBot, role sharing, floor simulation and Kuala Lumpur lighting behavior.
- All other KeySuite modules and database migrations.

## Verified

- Native Safari passed logged-out, valid persisted session, expired-session refresh, forced hung initialization, and repeated page-session-read scenarios, then passed the same set after a full page reload.
- V4.29.16 quotation and KeyHQ assets remain byte-identical in V4.29.17.
