# KeySuite V4.29.10 Verification

Run from the package root:

```text
node tests/v42910-release-regression.cjs
```

Expected result:

```text
V4.29.10 customer assignment, pricing, quotation sequence and navigation regression: PASS
```

The regression checks release wiring, the Customer and Assigned Category counters, unassigned-customer warning styling, all-family distinct-model counts, populated-price counting including preserved zero values, rarity conflict resolution, one-way and return fuel formulas, Selection return navigation, and the company-wide mixed-prefix quotation sequence. It specifically verifies that `R-2610-0230` produces running floor `0230` for an `RC` user.
