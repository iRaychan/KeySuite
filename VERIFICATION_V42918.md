# KeySuite V4.29.18 verification

## Root-cause reproduction

- Live Safari on V4.29.17 remained on “Checking existing session…” beyond the eight-second deadline.
- Supabase Auth logs simultaneously showed successful password, user and refresh responses from the same Safari client.
- Static and runtime inspection confirmed the page-wide version observer repeatedly mutated its own observed labels, starving Safari's task queue.

## Automated checks

- `v42918-version-lock.cjs`: PASS — initial stale labels update once; repeated observer callbacks produce no additional writes; the task queue remains available.
- `v42918-auth-bootstrap.cjs`: PASS — logged-out, valid saved session, expired-session refresh, stalled request and reload paths.
- `v42918-release-regression.cjs`: PASS — build/version/cache wiring, startup deadlines, quotation corrections and preserved KeyHQ hashes.
- `keyhq-integration-regression.cjs`: PASS.
- Syntax validation: PASS for `auth.js`, `v41200-bootstrap.js`, `v42918-version-lock.js` and `sw.js`.

## Native Safari check

- V4.29.18 served locally in Safari reached the sign-in form instead of remaining on the loading view.
- A Safari page refresh again reached the V4.29.18 sign-in form.
- The server trace confirmed Safari briefly requested the V4.29.17 version-lock URL during service-worker turnover; the upgrade therefore includes a safe shim at that exact old path.

## Remaining production check

The live domain still serves V4.29.17 until the user uploads the V4.29.18 upgrade. After upload, repeat the valid saved-session and real password-login checks on the live origin, because browser storage is origin-specific and cannot be transferred to the local test origin.
