# KeySuite V4.29.17 verification

- The user screenshots at 11:00 PM and 11:01 PM show the same Safari navigation remaining on “Checking existing session…” before eventually exposing the V4.29.17 sign-in form. This proves the prior timeout-only candidate changed the symptom but left the original Auth client unresolved.
- Native Safari executed `tests/v42917-safari-auth.html`: logged-out, valid persisted session, expired-session refresh, forced hung initialization, and repeated page-session-read scenarios all passed. The entire matrix passed again after Safari Reload.
- A clean-origin native Safari integration run loaded the complete V4.29.17 `index.html`, contacted the configured Supabase project, and reached the V4.29.17 sign-in form instead of remaining on the session spinner.
- `tests/v42917-auth-bootstrap.cjs` independently covers the same five states plus active abort of a stalled Auth network request.
- `tests/v42917-release-regression.cjs` validates the pinned Supabase SDK, startup ordering, client disposal/replacement, service-worker version and byte-preserved V4.29.16 quotation/KeyHQ assets.
- The original V4.29.16 release regression passes in its V4.29.16 baseline tree.
- JavaScript syntax checks pass for every changed JavaScript file.
- The uploaded V4.29.15 FULL CLEAN ZIP is byte-identical to its workspace mirror; V4.29.16 is the tested continuation baseline; V4.29.17 changes only authentication/bootstrap/version/release files.
- Full and upgrade ZIP contents and SHA-256 checksums are generated after all tests pass.
