# KeySuite V4.29.13 Verification

Run from the package root:

```text
node tests/v42913-release-regression.cjs
node tests/v42913-motor-price-regression.cjs
node tests/keyhq-integration-regression.cjs
```

Expected result:

```text
V4.29.13 motor pricing and KeyHQ regression: PASS
V4.29.13 CHC motor price-change regression: PASS
KeyHQ integration regression: PASS
```

The regression checks release wiring, KeyHQ placement, motor-upgrade price changes, invalid same-price upgrade blocking and retained CR assignment behavior.
