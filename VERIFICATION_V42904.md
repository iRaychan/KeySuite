# KeySuite V4.29.04 Verification

Run from the package root:

```text
node tests/v42904-release-regression.cjs
```

Expected result:

```text
V4.29.04 CHC C4/C6 PDF preparation regression: PASS
```

The regression verifies release metadata, CHC-only cache preparation, preservation of the original fallback alignment scan, reuse of the parent/opener image cache, retained HP formatting, and hashes for protected non-CHC and shared application files.

