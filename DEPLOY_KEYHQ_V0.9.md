# KeyHQ V0.9 deployment

The V0.9 database migration was deployed to the KeySuite Supabase project on 24 October 2026. Migration version: `20261024134905`. Frontend GitHub deployment is handled by the user. Do not reapply this migration to the same project.

1. Back up the current static deployment and database. Review `KEYHQ_V0.9_REVIEW.md`; this build has documented animation and navigation limits.
2. Verify the existing V4.29.25 avatar migration is installed: `20261024030000_keyhq_user_avatar_profiles_v42925.sql`. It provides the established membership helper, avatar directory and profile table used by this upgrade.
3. For a different project only, apply `supabase/migrations/20261024134905_keyhq_v09_social.sql` **once**, through your established Supabase migration workflow or SQL Editor, to a staging project first. It is a forward migration, not a repeatable seed script. Keep `keyhq_private_v09` and `keyhq_private_v42925` out of exposed Data API schemas.
4. The migration explicitly grants only required authenticated access, enables RLS, adds realtime publication membership when `supabase_realtime` exists, and broadens the existing avatar appearance check. It adds no role assignments and changes no employee accounts. It does not grant Telegram identities employee access.
5. Confirm realtime replication is enabled for the four `ks_keyhq_*_v09` tables. If the publication is absent, create/configure it through the project's normal realtime settings. Do not disable RLS to troubleshoot access.
6. Deploy all files in the patch together (or deploy the full package), retaining the existing project configuration. The new `keyhq-social.js` must load before `keyhq-launcher.js`. The service worker uses a new cache identifier. Reload an existing installed session after the update.
7. Sign in to two enabled same-company employee accounts in separate browsers. Confirm Bob→Ray messaging, reply, read receipts, offline storage and reconnect. Verify a third employee and an Owner who is neither sender nor recipient cannot read their messages. Verify a different company and an unauthenticated browser cannot read them.
8. Test online invitation Join/Decline and no-response behavior, offline automatic acceptance, capacity contention, singles arrival gates and departure pause. A new login must revoke an offline auto-acceptance and require fresh consent. Confirm two browser sessions do not mark the employee offline when only one closes. Presence has a 150-second grace lease, refreshed every 30 seconds.
9. Run Supabase security/performance advisors in staging. Review the bounded private definer functions: they intentionally need the private `auth.users` membership lookup and serialized activity transitions. Public RPC wrappers are invoker functions. Any additional project-specific membership restrictions should be incorporated into the established membership helper before rollout.
10. Complete manual Mac Safari/Chrome visual acceptance for chairs, model orientation, camera clipping, campus paths and sports contact timing. Do not label fallback animations as finished realistic sports.

## Storage and security model

- Messages: `ks_keyhq_messages_v09`. Only sender/recipient in an enabled company membership can select. Clients cannot supply sender ID, ID, created timestamp, or edit message body; they can set only the recipient read receipt. A trigger supplies the actual read time. `(sender_id, nonce)` prevents duplicate retries.
- Presence: `ks_keyhq_presence_v09`. Each browser has a separate UUID lease. Database time sets expiry. Clients cannot directly forge presence rows or expiry values.
- Invitations: `ks_keyhq_sessions_v09` and `ks_keyhq_participants_v09`. Reads are company-scoped. Direct client writes are revoked. The authenticated RPC checks membership, limits, consent and arrival transitions under a transaction lock. A partial unique index prevents two active reservations for the same facility.
- Avatar appearance: updates the existing table's validation; no duplicate profile table or identity is created.

Offline autonomous animation is cosmetic. It never authenticates the employee, sends messages as them, or changes their actual online state.

## Recovery

If the migration is absent, messaging and invitations display an unavailable state; the campus and existing KeySuite functions remain usable. Do not retry with a service-role key in the browser.

For application rollback, restore the original static package and its service worker. Preserve the additive message tables and history; do not drop them as part of a routine application rollback. Wider appearance values may not be displayed by the earlier editor, but should not be deleted. Database rollback needs a separately reviewed data-preserving plan.

## References used

[Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security).
