# Isolated tests

From the application root, run:

```
npm install --prefix /tmp/keysuite-v50082-test jsdom@26.1.0 @electric-sql/pglite@0.3.14
NODE_PATH=/tmp/keysuite-v50082-test/node_modules node tests/v50082/verify.cjs
NODE_PATH=/tmp/keysuite-v50082-test/node_modules node tests/v50082/database.cjs
node tests/commercial-identity.cjs
node tests/v50062-brand-mapping.cjs
node tests/v42859-assembly-pricing-regression.cjs
```

Dependencies are test-only and do not need to be installed on the production website. `verify.cjs` uses the actual application DOM and code, with simulated database transport and canvas width measurement. `database.cjs` uses an in-memory PostgreSQL engine. Neither test connects to production. Refer to the release report for unverified browser/PDF/authentication work.
