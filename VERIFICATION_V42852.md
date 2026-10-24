# KeySuite V4.28.52 Verification

## Live Safari BFI check

1. Sign in to KeySuite in Safari and open Quick Selection.
2. In Brand / Series Settings, leave only B.G.Reich BFI ticked.
3. Tick **Cold Item**.
4. Enter `18.3` with flow unit `Imp gpm` and `82` with head unit `Ft`.
5. Press **Check Pumps**.
6. Confirm **Most Suitable** is `BFI 10-2`, not BFI 10-3 or BFI 4-5.

## Regression checks

- Untick **Cold Item** and confirm the priced recommendation remains unchanged.
- Confirm CHC 2-90 still opens its curve on the first Quick Selection click.
- Confirm the visible version is V4.28.52.
- Run `node tests/v42852-release-regression.cjs` from the Full Clean folder.
