# KeySuite V4.28.53 Verification

1. Open CHC C4, CHC C6, BFI and ES curves with the Power graph visible.
2. Confirm Power has a positive value at zero flow.
3. Inspect the span from zero flow to the first positive-flow point. Confirm it joins without a visible corner or curvature kink.
4. Confirm all measured/source Power points remain on the displayed curve.
5. Confirm BFI Product and Quick Selection curves use the same Power shape.
6. Confirm the visible version is V4.28.53.
7. Run `node tests/v42853-release-regression.cjs` from the Full Clean folder.
