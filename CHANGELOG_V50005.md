# KeySuite V5.00.05 changes

Built from the user-supplied V5.00.04 FULL CLEAN package.

## KS-09 - System and Pumpset duty units

- System and Pumpset Capacity dropdowns now match Dashboard exactly: `m³/hr`, `US gpm`, `Imp gpm`, `L/s`, `L/min`.
- Head dropdowns now match Dashboard exactly: `Mtr`, `bar`, `kPa`, `psi`, `Ft`.
- Changing a unit converts the entered numeric value through the same metric factors used by Dashboard.
- Selected units and converted values persist through assembly drafts, Pumpset-to-System transfer, quotation drafts/history and the quotation PDF description.
- Legacy stored labels such as `US GPM`, `IGPM`, `ft`, `GPM`, `m3h`, `lps` and `kpa` continue to normalize safely.

## KS-10 - quotation PDF description width

- The existing V1.08 System/Pumpset item header retains its populated Qty, Unit Price and Total cells.
- Its separate description continuation row now spans all four remaining columns because those cells are empty on that row.
- Long generated lines such as the valve description ending in `each pump` can therefore remain on one line where the page width permits, without overlapping any populated price column.
- All other V1.08 typography, margins, summary rules, totals and page structure are unchanged.

## KS-11 - generated manifold wording

- `Gate valves` is now generated as `Isolation valves`.
- Connection-specific `Threaded strainer` / `Flanged strainer` wording is now the generic `Strainer`.

No pricing, BOM, KeyHQ, Supabase, Edge Function or production deployment change is included.
