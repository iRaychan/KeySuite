# Isolated Phase 01 browser checks

Run `node tests/v50079/server.cjs` from the application root, then open http://127.0.0.1:8790/ in a separate Safari or Chrome tab. Select **Start isolated V5.00.77 review** (the legacy fixture label), then **Run Phase 01 browser checks**. The actual application label is V5.00.79.

The server binds localhost only and injects synthetic review data into the application in that tab. CSP blocks production connections. The save tests temporarily substitute authentication/RPC methods in memory, restoring them afterward. No external database is required or tested. Do not point the harness at production or remove the CSP.

The first run opens all 63 BFI models. Later runs in the same tab remember the completed catalogue check. Use a fresh tab/session storage for a full BFI rerun. Review BSW curve/prices buttons are available after completion. Stop the server with Ctrl-C.

These tests complement, and do not replace, disposable Supabase tests, Windows verification and generated PDF inspection described in TEST_REPORT_V50079.md.
