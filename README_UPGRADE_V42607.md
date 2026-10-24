# Upgrade to KeySuite V4.26.07

Apply over V4.26.05. This is a cumulative upgrade and includes the pending V4.26.06 speed-label correction.

KeyBot routing changes:
- `CHC + duty` searches assigned B.G.Reich CHC C4/G1 and C6/G2 only.
- `CHC G1` / `CHC C4` searches C4/G1 only.
- `CHC G2` / `CHC C6` searches C6/G2 only.
- `SVM + duty` searches assigned SVM selling series only.
- `VMS + duty` searches assigned VMS selling series only.
- `Brand + duty` searches all eligible assigned series under that Brand only.
- Candidate order remains smallest suitable motor kW first.

Display and PDF change:
- Speed is shown as Hz first, then rpm.
- Enhanced output is shown as `Max 60 Hz · 3480 rpm`.

No `db push` is required.

Deployment order:
1. Upload the V4.26.07 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook`.
