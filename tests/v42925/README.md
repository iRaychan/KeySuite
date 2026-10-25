# Retained shared account tests

The legacy 8-floor browser fixtures have been retired. Current campus acceptance tests are in `tests/v010`.

`test-sync.cjs keyhq/avatar-sync.js` checks account profile persistence, realtime subscription cleanup and stale-session handling using a mocked transport. `test-database.cjs` is a historical local database test; inspect its arguments before running. No production tests are part of the V0.10 workflow.
