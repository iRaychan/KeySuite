# KeySuite V4.29.05 Verification

Run from the package root:

```text
node tests/v42905-release-regression.cjs
```

Expected result:

```text
V4.29.05 macOS CHC C4/C6 PDF and Selection fit regression: PASS
```

The regression verifies release metadata, the visible C4/C6 Product report-tab flow, removal of both hidden desktop print frames, retained automatic print/save prompts, C4/C6 PDF preparation, late macOS Safari Selection fit checks, retained HP/kW formatting, and hashes for protected Selection, non-CHC and shared application files.
