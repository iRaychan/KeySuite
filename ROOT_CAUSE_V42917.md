# V4.29.17 Safari authentication root cause

## Evidence

1. The 11:00 PM Safari screenshot remains on `Checking existing session…`; the 11:01 PM screenshot shows the V4.29.17 login. The earlier V4.29.17 candidate therefore waited for its safety timer rather than completing the session bootstrap.
2. V4.29.16 loaded the moving URL `@supabase/supabase-js@2` and immediately combined `onAuthStateChange` with `getSession()`. Supabase documents that async work inside Auth callbacks can deadlock subsequent client calls, and its issue tracker records Safari/iOS cases where an orphaned `navigator.locks` Auth lock leaves `getSession()`, `INITIAL_SESSION` and sign-in pending indefinitely.
3. The earlier V4.29.17 candidate wrapped `getSession()` in `Promise.race`. That changed the visible screen after 12 seconds but did not cancel the original operation or replace the blocked client. A later sign-in could therefore wait on the same unresolved initialization.
4. An expired stored session can also make startup perform a refresh request. Without an abort signal, a stalled refresh leaves the bootstrap waiting even when no Web Lock remains.
5. A native Safari full-build run showed the upgrade boundary requesting both an old cache-keyed `auth.js?v=42821` and the cache-busted `auth.js?v=42917`. Without an ownership guard, this can create two Auth clients during service-worker turnover.

## Corrective design

- Pin `@supabase/supabase-js` to 2.118.0. Supabase's official lockless-coordination migration states that default Auth coordination has been lockless since auth-js 2.107.0.
- Supply an abortable fetch implementation to the Supabase client. Auth network requests are cancelled after six seconds rather than merely raced by the UI.
- Keep an independent eight-second startup deadline for non-network SDK/storage stalls.
- If that outer deadline fires, unsubscribe and dispose the affected Auth client, then create a fresh client before showing sign-in.
- Register a synchronous Auth-state callback only after the initial session read settles. The callback performs no Supabase API call.
- Cache-bust `auth.js` and the V4.29.17 bootstrap, and rotate the service-worker cache to `keysuite-v42917`.
- Make the V4.29.17 Auth runtime idempotent and dispose a previously exposed Auth client before taking ownership.

## Verification boundaries

The native Safari verification uses controlled Supabase client doubles so logged-out, valid, expired, hung and reload behavior can be exercised without exposing a real user password or altering the production session. Release regression separately proves that V4.29.16 quotation corrections, the migration, and all KeyHQ implementation assets are byte-identical. Live credential sign-in was not attempted because no test account credentials were provided.

## Primary references

- Supabase troubleshooting: https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0
- Supabase `onAuthStateChange`: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- Supabase lockless Auth migration: https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/migrations/lockless-coordination.md
- Supabase Safari/Web Locks issue: https://github.com/supabase/supabase-js/issues/936
