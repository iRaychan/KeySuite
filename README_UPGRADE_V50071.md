# KeySuite V5.00.71 — Phase 2

Use FULL for a complete application copy or overlay UPGRADE on the verified V5.00.70 FULL build. The included Supabase migration `20261116120000_v50071_g_price_controls.sql` requires the previously installed V5.00.68 G Series migration. Apply the new migration before using the phase price and multiplier Save controls. This release was tested locally and has not been deployed.

| Bug | Change and verification |
|---|---|
| 001 | The brand module used to replace the initial Product tree with a list that omitted G. Safari verified the rebuilt B.G.Reich menu, exact series order, visible G route, 12 variants, two model-specific curve buttons and aligned Quote buttons at desktop and 540 px. BFI, BGF, BSV, BSW and KV routes also opened. |
| 002 | Role now uses the same B.G.Reich registry as Product. Safari verified the Owner editor and simulated Supabase save and reload for a restricted User. Existing non-Owner wildcard scopes retain their previous series and require an explicit G grant. |
| 003 | Safari verified six G rows, one Save per row, separate M/T prices and rarities, simulated persistence, role restrictions and independent quotation price lookup. The migration saves both variants in one database statement. |
| 004 | Safari verified one BFI-style panel per series, all three currency choices, the three-second edit lock, simulated save, independent BGF/G conversion in quotation pricing and no change to the BFI multiplier. |

The Safari fixture used the built app with simulated Supabase responses. Real Supabase migration execution, account authentication, save persistence and complete quotation workflows for existing series require staging verification. The source prices themselves are untouched by the migration.
