# Local V4.29.25 verification

These tests use local fixtures only. No credentials, production Supabase requests or schema changes are involved.

Install test dependencies in this directory with `npm install`; install WebKit with `npx playwright install webkit`. Chrome must be installed. From the project root, create `outputs/` and serve the root on `http://127.0.0.1:8245` (for example `python3 -m http.server 8245 --bind 127.0.0.1`). Run:

```
node tests/v42925/test-database.cjs supabase/migrations/20261024030000_keyhq_user_avatar_profiles_v42925.sql
node tests/v42925/test-sync.cjs keyhq/avatar-sync.js
node tests/v42925/browser-test.cjs
node tests/v42925/interaction-test.cjs
node tests/v42925/failure-test.cjs
```

Database tests execute actual PostgreSQL policies/functions in ephemeral PGlite, with local Auth/membership fixtures. Sync tests simulate the existing Supabase client and notification transport; they are not a live Supabase end-to-end test. The interaction test injects a temporary browser-only inspection hook through Playwright interception; production sources do not expose it. Browser screenshots use fictional accounts and simulated presence. Performance is a short local sample, not a device guarantee.
