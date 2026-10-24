const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.01');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.01'/);
assert.match(read('index.html'), /v42901-version-lock\.js\?v=42901/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42901'/);
assert.match(read('sw.js'), /keysuite-v42901/);
assert.match(read('sw.js'), /SHELL\[SHELL\.indexOf\('\.\/v42875-version-lock\.js'\)\]='\.\/v42901-version-lock\.js'/);
assert.match(read('v42901-version-lock.js'), /const V='4\.29\.01'/);

const index = read('index.html');
assert.match(index, /assembly-bom-main-row\{[^}]*align-items:start/);
assert.match(index, /assembly-bom-main-row \.assembly-delete\{margin:22px 0 0;height:42px\}/);
assert.match(index, /@media\(max-width:720px\)[\s\S]*?assembly-bom-main-row \.assembly-delete\{width:100%;margin:0\}/);

const protectedHashes = {
  'selector-g1/index.html': 'c80858e9c714209f252c5b92e438a9a961030c9baaab9d1a012890ccc8714ed9',
  'selector/index.html': '2a70e4f2ddeb30826fa4ca436eabd5959d8ae028e2f295ee065e6b369cfda378',
  'pricing.js': '7bd470339454a664498012e9d50ac984daab7f1c57e2cdf89dbc57a512f66d29',
  'assembly.js': '1c0044961edbc8f2a9a624c9f9fb1883bddce128c374855317fd120e14f4368b',
  'pdf-optimization.js': '61cc19d460e70d4f8545783935beb7eb5e65c7890dc7f19523d1f3233a384614',
  'app.js': '40bad9075b51f39a5f73ffb6feeb45096ca1ceac880596ff882ef0cbac1da2bf',
  'selector-g1/product.html': '9d9772ee22c5dad11360474343921a66ab57b66a95ae684ce5636bb89f859b94',
  'selector/product.html': '7307d64886be376bc4bbee66b6cd85e2acac01d0674f5028adfc9ad8fba12d5f',
};

if (root.includes('FULL_CLEAN')) {
  for (const [file, expected] of Object.entries(protectedHashes)) assert.strictEqual(hash(file), expected, `${file} changed`);
  assert.strictEqual(exists('v42872-version-lock.js'), false);
  assert.strictEqual(exists('v42874-version-lock.js'), false);
  assert.strictEqual(exists('v42875-version-lock.js'), false);
} else {
  for (const file of Object.keys(protectedHashes)) assert.strictEqual(exists(file), false, `${file} must not be included in the upgrade`);
}

console.log('V4.29.01 Assembly BOM layout release regression: PASS');

