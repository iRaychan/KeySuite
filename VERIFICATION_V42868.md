# KeySuite V4.28.68 Verification

## Automated checks

- `node tests/v42868-functional-regression.cjs`
- `node tests/v42868-release-regression.cjs`
- Applicable retained pricing, CR Selector, assembly/system pricing, and current CR seal-editor behavior suites
- JavaScript syntax checks for changed runtime files
- Archive content and checksum verification

## Covered behavior

- CR Selector and Product use all 20 CR workbook drawing assets and contain no CHC drawing fallback in their mapping function.
- macOS CR Selector retains the exact verified desktop geometry, title size, 100% scale and overflow protection.
- BFI and ES inline Selector states lock the matching outer header before brand decoration runs.
- Product CR opens a synchronous report window on macOS Safari while non-Safari desktop browsers retain the hidden-frame path.
- PDF readiness does not decode already-complete images and no longer has the observed 8-second wait.
- Release files, service-worker cache paths, upgrade contents and ZIP checksums are verified.

No live database or production deployment was performed.
