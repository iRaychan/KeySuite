# KeySuite V4.29.11 Verification

Run from the package root:

```text
node tests/v42911-release-regression.cjs
```

Expected result:

```text
V4.29.11 Telegram access, CR assignment, series filtering and five-point curve regression: PASS
```

The regression checks release wiring, the unassigned Telegram access notice, keyboard removal, and that the access gate runs before the normal KeyBot main menu. It also checks assigned CHC search, numeric series filtering, five-point curve plotting, and that CR appears as an independent Customer Price and Quick Selection assignment.
