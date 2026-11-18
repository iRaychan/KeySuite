# KeySuite V5.00.79 — Phase 01 verification report

Date: 18 November 2026 (Malaysia). Status: **review candidate; conditional acceptance remains**.

## Baseline and environments

- Latest supplied KeySuite_V5.00.78_FULL ZIP was materialized and its SHA-256 verified as `4516310e6183a0195b52c8e8fabfcf50feed3b5f9cd7a9edf2b879dd51545449`.
- Actual logged-in Mac Safari session at https://suite.keylargo.com.my was inspected; live version V5.00.78 was visible. Existing Quote History loaded. BFI Curve click failed to open, reproducing Bug 001. No production save or price edit was performed.
- Corrected source was served on localhost:8790 in Safari and Google Chrome on the user's Mac. The isolated fixture supplies synthetic customer/category data and controlled source prices. CSP blocks production connections; authentication/save/history calls are replaced in memory for the save tests. The test injection is not part of application startup in the release.
- Browser console/network developer panels were not available through the supported Safari controls. Source analysis, local error instrumentation and read-only Supabase function inspection were used. Chromium emitted a nonfatal ResizeObserver notification-loop warning during rapid model cycling; the suite still completed. This report does not claim a clean live console or network capture.
- No Windows browser or disposable Supabase/PostgreSQL test instance was available. No live SQL was executed.

## Bug-by-bug results

| Bug | Executed verification | Result / remaining limitation |
|---|---|---|
| 001 BFI Curve | Actual production click reproduced no-open. Isolated Safari and Chrome opened all 63 bundled BFI models across catalogue groups, waited for exact selected base model and checked chart SVG presence. | PASS for the tested complete BFI model catalogue. PDF export and every phase/material option were not exhaustively exercised. |
| 002 brandless description | Both browsers executed shared description normalization with a leading placeholder and with valid named-brand replacement. | PASS focused cases. All configured brand/series quotation routes were not exhaustively generated. |
| 003 source pricing | Both browsers configured an OEM HMS selling alias for source BFI, used a controlled RMB 914 price, and checked the actual Costing Audit item resolves family BFI, source 914 and explicit Brand Margin 0%. Existing brand/assembly pricing regressions were run. | PASS focused alias/source/margin regressions. Every production brand/customer/material/currency/series combination, final quotation and PDF was not exhaustively verified. No missing source price was populated. |
| 004 BSW | Both browsers loaded the first available curve, changed the child phase to 1Ph and checked M identity, 240 V snapshot, synchronized top phase control, BSW heading and visible nonzero-width iframe. Safari additionally tested the top Auto control against the MA snapshot. | PASS focused loading/phase/top configuration checks. All BSW catalogue variants, cold-network failure modes, priced quotation and generated PDF remain to be accepted. |
| 005 CR material | Both browsers opened CR 10-4 using CR, CRS and CRN material selections and waited after initialization to detect reversion. Corrected source retains shared hydraulic calculations. | PASS CR 10-4 identities including stable CRS/CRN. All CR models were not individually exercised. |
| 006 duplex Product | Both browsers checked ES and ISO Product controls expose distinct Duplex 2205 and Duplex 2507 values. ES source/selector material key/profile updates inspected. | PASS options; full hydraulic/quotation/PDF matrix for both duplex materials remains unverified. ISO options already existed in baseline data. |
| 007 duplex Price List | Both browsers checked independent ISO duplex options; ES independent options and absent-entry save guard were source inspected. Optional SQL appends only absent null-priced entries. | CONDITIONAL: ES price persistence requires review/application of the configuration SQL where entries are absent. SQL execution and USD/RMB/MYR persistence were not tested against PostgreSQL. Existing ISO prices were retained. |
| 008 BSW layout | Both browsers rendered the price list, checked six table headings and each price-input/rarity bounding rectangle for overlap. Safari visual inspection performed. | PASS macOS layout check. Windows Chrome/Edge, native Windows font metrics and additional viewport widths remain unverified. Horizontal scrolling is intentionally contained within the wide price table. |
| 009 secure save | Both browsers tested save recovery after history state `error`, explicit committed-save acknowledgement followed by failed history refresh, permission denial, and actual Save UI failed-draft retention/retry with the same quotation-session ID. | PASS isolated controlled responses. Real Supabase persistence, RLS enforcement, token expiry, multi-client collision and loss of network during commit were not end-to-end tested. Existing server checks/locking were not weakened. |

## Automated regression results

Executed from the corrected application:

```
node tests/v42859-assembly-pricing-regression.cjs
PASS: assembly/system pricing and restored-action regression checks

node tests/v50062-brand-mapping.cjs
PASS: CHC variants, G1/G2 isolation, explicit precedence, ambiguity,
      ES isolation and filter/layout hooks

node tests/v50063-focused.cjs
PASS: KVN source 3000 × .65 = 1950; other variants unpriced;
      KeyPLC 9410/10410; ES prefix
```

Syntax checks: all 12 changed JavaScript files and 10 nonempty inline scripts in affected HTML passed `node --check`. No unrelated pricing data or quotation formatting engine was changed.

## Package verification

The package builder checks the original baseline SHA-256, both ZIPs' CRC readability, unique member names, absence of deleted baseline files, and equality of the SHA-256 inventory of FULL with baseline overlaid by UPGRADE. UPGRADE is generated from actual byte differences; it contains only necessary changed/new files. Final counts/checksums and the exact changed-file list are in the delivery verification document.

## Outstanding acceptance

This is not unconditional completion of all nine issues. A disposable Supabase environment is needed for secure save/history/RLS and duplex price persistence tests. The ES configuration SQL is deliberately unexecuted. Windows verification, exhaustive configured brand/series pricing, all CR/BSW options, generated PDFs and broader Dashboard/KeyStock/permissions UI regression remain outstanding. No deployment is authorized by this package.
