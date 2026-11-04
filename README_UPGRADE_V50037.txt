KeySuite V5.00.37 UPGRADE — from V5.00.36 only

Back up the current frontend and database first. Extract these files into the
existing application root, preserving paths. This is an overlay, not a full build.
Production config.js is intentionally excluded.

Frontend deployment alone is insufficient. Review and apply the included new
20261104230000_v50037_quotation_number_occupancy.sql migration on staging first.
Do not rerun historical migrations. Follow DEPLOYMENT_V50037.md and review
CHANGELOG_V50037.md for tests, remaining acceptance checks and ISO settings.

No deployment or database change has been performed by creating this archive.
