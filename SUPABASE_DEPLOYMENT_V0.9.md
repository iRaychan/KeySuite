# Supabase deployment — KeyHQ V0.9

- Date: 24 October 2026 (Asia/Kuala_Lumpur).
- Project: KeySuite (`skidqdixnnnuhvarekxp`).
- Applied migration: `20261024134905_keyhq_v09_social.sql`.
- Four new tables verified: messages, presence, sessions and participants.
- RLS enabled on all four; anonymous SELECT denied; realtime publication enabled.
- Public presence/social RPCs are SECURITY INVOKER, authenticated-only.
- Existing avatar profiles: 6 before and after deployment.
- Security advisor: no new V0.9 findings; pre-existing project findings remain.
- No Edge Function changes required or deployed.
- GitHub/frontend deployment is handled by the user.

Do not run the migration again on this project. The local migration filename now matches the deployed migration history. Full live-account chat/invitation testing remains to be performed after the frontend upload.
