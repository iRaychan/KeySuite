# KeySuite V4.29.15 Verification

Run:

```text
node tests/v42915-release-regression.cjs
node tests/v42914-motor-final-price-regression.cjs
```

Expected:

```text
V4.29.15 release regression: PASS
V4.29.14 final-to-final motor replacement regression: PASS
```

The V4.29.14 motor-pricing regression is retained because the V4.29.15 quotation-description change must not alter the verified RM2,090 calculation.
