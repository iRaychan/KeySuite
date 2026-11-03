# V5.00.32 Test Report

## Automated checks performed

- **Passed:** JavaScript syntax checks for all JavaScript files changed in this batch.
- **Passed:** `tests/v50032-regression.cjs`, covering version/cache references, KV/ISO registries, exact model-string use, PDF metadata title wiring, shared pricing stages, permission-gated unified audit layout, compact action styling and KeyLab RM50 rounding.
- **Passed:** `tests/v50031-regression.cjs`, covering the existing KV V1.3, BSW, ES, permission and database-enforcement baseline.
- **Passed:** `tests/v50010/pricing.cjs`, covering existing conversion, production pricing stages, snapshot repricing and missing-cost blocking.
- ZIP integrity listing after packaging.

Exact command results are recorded during build delivery; only successful checks are reported as passed.

## Not claimed

- No production deployment was performed.
- No live Supabase records were modified.
- No browser session connected to the production site was used for end-to-end acceptance testing.
- A real generated V5.00.32 quotation PDF metadata inspection requires a deployed/authenticated runtime and remains a deployment acceptance item.

## Deployment acceptance checklist

Test with authorized and unauthorized users, an existing customer with saved preferences, ES/KV/ISO searches, Product and Selection for the same model/context, a multi-component System BOM, an existing saved quotation, a new KeyLab quote around every RM50 boundary, and generated PDF metadata.
