# KeySuite V5.00.13 — review build

Built 30 October 2026 from the user-uploaded V5.00.12 full-build baseline. The uploaded baseline and the preserved V5.00.11 references were not modified. On 30 October 2026 the approved Supabase-only portion was deployed; the frontend and GitHub were not deployed.

## Discussion 001–020 reconciliation

Items 001–003, 005–016, and 018–020 were already implemented in the uploaded V5.00.12 baseline and retained unchanged. The later approved brand priority (B.G.Reich, TESK, A–Z, symbols last) remains in effect for the customer-pricing and Quick Pump Selection panels.

Item 004 is now implemented:

- Owner-only Archive action with confirmation.
- The Owner cannot archive their own account.
- Archived accounts are hidden from the active list and shown in a separate Owner-only view.
- Archive sets the access row inactive, records archive metadata, bans login, and revokes rows in `auth.sessions` through a service-role-only helper.
- Open clients re-check approved-user status every 30 seconds and on focus/visibility return.
- Restore returns the preserved access row to the active list and removes the Auth ban when an Auth account exists.
- Quotation history, business records, role history, and access identity are not deleted.
- Archive/restore actions are recorded in `ks_user_archive_audit_v50013`.

## Still outstanding

- **017 — ISO Product series navigation:** The supplied ISO selection and price workbooks contain model fields but no series/family mapping. The generated ISO catalog likewise contains no series key. The ES-style row layout, search, aligned controls, Curve/Assembly/Quote actions, and B.G.Reich placement are present, but a truthful left-side series list cannot be built without an approved mapping. No series groups were inferred from model numbers.

## Deployment state

- Frontend deployed: no (GitHub/frontend explicitly excluded).
- V5.00.12 pricing migration: already present before this deployment; not reapplied.
- V5.00.13 archive SQL applied: yes (`20261029171514_v50013_user_archive_and_session_revocation`).
- Edge Function deployed: yes (`keysuite-manage-user-status`, version 1, JWT verification enabled).
- Supabase deployment approval received: yes.
- Frontend production approval received: no.
- No user was archived/restored and no pricing or business data values were changed during deployment.
