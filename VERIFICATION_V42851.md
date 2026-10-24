# KeySuite V4.28.51 Verification

## CHC C6 first-click curve

1. Sign in and open Quick Selection.
2. Select CHC C6.
3. Enter `2 m³/hr` at `62 m`.
4. Run selection and click `CHC 2-90` once.
5. Confirm the CHC 2-90 curve is visible without using Back and clicking again.

## BFI Cold Item suitability

1. Open Quick Selection.
2. Select BFI and tick **Cold Item**.
3. Enter `18.3 IGPM` at `82 ft`.
4. Run selection.
5. Confirm price availability does not push BFI 10-3 ahead of BFI 10-2. BFI 10-2 must rank ahead of BFI 10-3 when both are included.

## Release checks

- Confirm the visible version is V4.28.51.
- Confirm a normal Quick Selection without **Cold Item** still prefers available priced models and only falls back to cold models when no priced candidate is suitable.
- Confirm CHC C4, BFI and ES selection pages still open normally.
- Run `node tests/v42851-release-regression.cjs` from the Full Clean folder.
