# KeySuite V4.29.02 Verification

Run:

```text
node tests/v42902-release-regression.cjs
```

Expected result:

```text
V4.29.02 ES/BFI alternative-model restoration regression: PASS
```

The regression verifies version metadata, confirms both Product and embedded Selection views show ES/BFI alternatives, confirms CHC and CR still hide those panels, verifies dynamic iframe height synchronization for expanded content, and confirms selector calculation/data hashes remain unchanged.
