# KeyHQ V0.2 Living Headquarters Verification

Baseline confirmed from `RELEASE.json`: KeySuite **V4.29.22**, baseline V4.29.21. KeyHQ input was the packaged V0.1 Master Building source inside the same full release.

## Automated verification

- JavaScript syntax: `keyhq/app.js` and `keyhq-launcher.js`.
- `tests/keyhq-integration-regression.cjs`.
- `tests/keyhq-v01-master-building-regression.cjs` (structural continuity).
- `tests/keyhq-v02-living-headquarters-regression.cjs`.
- `tests/v42922-release-regression.cjs` where compatible with an intentional KeyHQ asset revision.

## Browser verification

- Full-tower and Level 5 views render without a visible runtime failure.
- Floor selection, lighting controls, camera controls, team list and role-gated projector remain present.
- Locked standalone context shows no live or demonstration enquiry payload.
- Level 5 shows seven triple-monitor consoles, operations screens, equipment, plants, storage and the KeyBot avatar.
- Full tower shows eight levels, shared podium, aligned core, planted setbacks and split rooftop.

## Data and security continuity

- The launcher still requests `list_inbox` through the existing KeySuite Edge Function integration.
- Same-origin frame message checks are retained.
- Company-scoped floor configuration and Owner/Admin save authority are retained.
- No fabricated progress or ETA is added.
- No Supabase schema, RLS, permissions, quotations, pricing or selectors are changed.
