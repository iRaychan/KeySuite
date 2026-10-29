# Upgrade to KeySuite V5.00.12

This package upgrades the V5.00.11 source tree to the V5.00.12 review build. It is not a production deployment authorization.

## Before applying

1. Keep an untouched backup of V5.00.11 and a restorable database backup.
2. Review `BUILD_STATUS_V50012.md`, `VERIFICATION_V50012.md`, and every file in `proposals/` included in the upgrade archive.
3. Resolve requirements 004 (archive/revoke behavior) and 017 (ISO series mapping) before accepting this as a complete build.
4. Test the frontend and SQL against a staging copy before production approval.

## Database change

The proposed SQL is `proposals/pricing_v50012.sql`. It adds ISO multipliers, extends the multiplier save RPC, and creates owner-authorized ES/ISO category and CR seal-group save RPCs. Review grants and function signatures against the target project before applying. The proposal is unapplied. Do not run it against production without the user's explicit deployment approval.

The migration initializes ISO multiplier fields from existing ES multipliers (or the established fallback values) to keep initial converted values consistent. It does not rewrite product price rows. The migration must be reviewed and exercised in staging before applying.

## Frontend files

Apply the changed files from the upgrade archive over a V5.00.11 copy. Preserve existing environment settings and deployment secrets. Publish only after staging acceptance and explicit production approval. Clear or refresh cached application assets after publication because the service-worker cache key changes to V5.00.12.

## Package verification

The archive contains `UPGRADE_MANIFEST_V50012.json` with changed-file hashes and a deletion list. Verify the hashes before applying. The full build package is a complete source snapshot and can be used for review or recovery.
