# KeyHQ V0.3 Verification

- Baseline verified as KeySuite V4.29.22; KeySuite version remains unchanged.
- Production Supabase project `skidqdixnnnuhvarekxp` received migration `20261023132449_keyhq_level6_people_v42922` after explicit Owner approval.
- Live workforce count reconciled to 6 enabled access rows (5 confirmed, 1 invited/unconfirmed); the disabled row is excluded.
- Production has 37 current and 35 archived quotation rows, with no PDF storage bucket or PDF binary/path field.
- Quotation history continues to use `keysuite_list_quotations_v42919`, which returns all company rows to Owners and creator-owned rows to other users.
- New desk/avatar persistence is isolated in `ks_keyhq_people_v42922`, RLS-enabled, with direct table access revoked and authenticated RPC execution granted explicitly.
- Owner-only save validation enforces enabled company membership, gender values, color format, desk range 1–28, and unique account/desk assignments.
- Production verification confirmed RLS enabled, no direct table access for `anon` or `authenticated`, no anonymous RPC execution, authenticated RPC execution, six returned people with six unique fallback desks, and one invited account.
- An Owner save of all six assignments succeeded inside a rollback-only production test; the table remained empty afterward so no desk or avatar preferences were invented.
- Static syntax and KeyHQ V0.3 regression tests pass.
- Standalone browser regression covers Level 6 selection, all 28 interactive monitor hit areas, the truthfully empty monitor popup, and its page/zoom controls. Automated integration checks cover the authenticated workforce and quotation-context wiring.

Known limitation: existing quotations do not have original PDF binaries. The viewer renders the saved quotation snapshot and the PDF / Print button invokes the existing sealed-quotation output workflow.

Post-migration Security Advisor notes the new table has no row policies and the two authenticated RPCs are `SECURITY DEFINER`. This is intentional: direct table grants are revoked, anonymous execution is revoked, the list RPC validates active company membership, and the save RPC additionally requires an enabled Owner. Existing unrelated project advisories remain outside this upgrade.
