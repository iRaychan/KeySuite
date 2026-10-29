# KeySuite V5.00.13 verification

## Passed

- JavaScript syntax checks for `roles.js`, `auth.js`, `app.js`, and the V5.00.13 version lock.
- `tests/v50013/user-archive.cjs`.
- `tests/v50012/regressions.cjs` and the retained V5.00.11 pricing/history regressions.
- Static security checks confirm Owner validation, self-archive rejection, login ban/unban, Auth session deletion, service-role-only session helper grants, and audit persistence.
- Frozen quotation PDF assets, selector-family folders, and `pdf-optimization.js` remain byte-identical to the uploaded V5.00.12 baseline.

## Live Supabase verification

- `proposals/user_archive_v50013.sql` is recorded as migration `20261029171514_v50013_user_archive_and_session_revocation`.
- The two archive metadata columns and the RLS-enabled audit table are present.
- The archive and session-revocation helpers are executable by `service_role` and not executable by `anon` or `authenticated`.
- `keysuite-manage-user-status` version 1 is ACTIVE with JWT verification enabled.
- An unauthenticated request was rejected with HTTP 401.
- The Supabase security advisor reports no V5.00.13 function exposure or mutable-search-path finding. Its only V5.00.13 notice is informational: the service-role-only audit table has RLS enabled and intentionally has no browser policies.

## Deliberately not exercised against production data

- No real Auth user was archived or restored during deployment, so no business account or session was altered for testing.
- The first authenticated Owner archive/restore remains the production end-to-end confirmation.

## Outstanding evidence

- The ISO source workbooks contain no approved series field or mapping for discussion item 017.
