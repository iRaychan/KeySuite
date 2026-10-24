# KeySuite V4.29.03 Verification

Run from the package root:

```text
node tests/v42903-release-regression.cjs
```

Expected result:

```text
V4.29.03 motor HP display precision regression: PASS
```

The regression verifies release metadata, all eight affected selector display helpers, representative HP values, and preservation of the existing two-decimal kW display.

