# KeySuite V4.25.02 Upgrade

## Included changes

1. **CHC G1 / CHC G2 independent currency multipliers**
   - CHC G1 has its own Currency Selection, USD → MYR multiplier and RMB → MYR multiplier.
   - CHC G2 has its own Currency Selection, USD → MYR multiplier and RMB → MYR multiplier.
   - The selected CHC generation controls which multiplier is used by Price List and pricing/quotation lookup.
   - The existing shared CHC rate is copied into both generations during migration so upgrading does not change current calculated prices.
   - G2 continues to mirror the legacy CHC rate fields for backward compatibility.

2. **Quotation History Delete Role Authority**
   - New authority key: `Delete quotation history`.
   - Owner = Full by default.
   - Admin / User / Dealer / Viewer = None by default until assigned in Role Authority.
   - The Delete button follows the role permission and the Supabase delete RPC independently verifies the signed-in role/company.

3. **Migration history alignment**
   - This Full Clean includes no-op local placeholder files for remote migration versions already present in the deployed KeySuite Supabase project:
     - `20260828204000`
     - `20260828210000`
     - `20260828214500`
     - `20260831165654`
   - These files contain no database changes; they only allow a fresh Full Clean checkout to match the existing remote migration history.

## Supabase deployment

From the extracted `KeySuite_V4.25.02_FULL_CLEAN_GitHub` folder in PowerShell:

```powershell
npx.cmd supabase@latest migration list
npx.cmd supabase@latest db push
```

For a database that already received V4.25.01, the new migrations to apply should be:

```text
20260908130000_v42502_chc_generation_rates_and_quotation_delete_authority.sql
20260908130001_v42502_verify.sql
```

Do not use `db reset` and do not use `--include-all` merely to work around migration-history errors.

After the push, refresh KeySuite and verify:
- CHC G1 and G2 can hold different multiplier values.
- Switching CHC generation displays the correct generation-specific Currency/Multiplier settings.
- Role Authority shows `Delete quotation history`.
- A role with None cannot see/use Delete; a role with Full can delete and the quotation remains deleted after refresh.
