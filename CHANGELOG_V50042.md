# KeySuite V5.00.42

## 261105 Bug 03 — Product KV Curve model identity

- Sends the newly selected Product KV model to the selector before opening the Curve panel.
- Clears stale model-only presentation and PDF identity while preserving brand, material, seal, elastomer, supply and other legitimate configuration context.
- Gives a newly confirmed selector model priority over cached presentation identity.
- Re-pins the model identity only after the selector confirms that the requested model loaded.
- Tags each KV Product Curve request and ignores late responses belonging to an older model selection.
- Preserves the existing Back implementation, selected KV series and Product options.

## Scope safeguards

- No pump performance calculation changes.
- No pricing or quotation formula changes.
- No Product or Curve interface redesign.
- No CR, ES, ISO or other Product-family selector changes.
- No Supabase schema, data seed or Edge Function change is required.

## Verification

Regression coverage verifies KV 4-30, KV 4-50, cross-series KV 10-90, repeated Curve/Back identity handling, PDF/Assembly/Quote payload identity, late-response rejection, unchanged Back logic and unchanged hydraulic/pricing/other-family files.
