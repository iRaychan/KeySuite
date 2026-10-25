# KeyHQ V0.10 local verification

Run a static server from the repository root on 127.0.0.1:8260. Install the pinned development dependencies in this directory (`npm install`) and Playwright WebKit (`npx playwright install webkit`). Browser tests use installed Google Chrome plus Playwright WebKit. They never sign in or contact production Supabase. The host fixtures use explicitly synthetic employee identities.

Run from the repository root:

```
node tests/v010/database.cjs
node tests/v010/browser.cjs
node tests/v010/activities.cjs
node tests/v010/elevator.cjs
node tests/v010/camera.cjs
node tests/v010/visual.cjs
node tests/v09/database.cjs
node tests/v09/adapter.cjs
node tests/v42925/test-sync.cjs keyhq/avatar-sync.js
```

For dependencies installed in `tests/v010/node_modules`, set `NODE_PATH` to that directory when running the older v09 scripts. Screenshot outputs are written under the system temporary directory. The PGlite tests create disposable PostgreSQL databases, stub only the auth UID/employee directory boundary, apply actual migration SQL, and execute as authenticated roles to exercise real grants and RLS. They do not prove hosted websocket delivery or production environment readiness.

V0.10 replaces legacy office tests and demo-avatar browser tests. Historical KeySuite release tests may assert their original version number and are not current release acceptance tests.
