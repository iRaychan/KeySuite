'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const categories = read('v3944-categories.js');
const index = read('index.html');
const serviceWorker = read('sw.js');
const release = JSON.parse(read('RELEASE.json'));

const match = categories.match(/function productLabel\(p\)\{return ([^\n]+)\}/);
assert.ok(match, 'productLabel formatter is present');
const productLabel = Function('p', `return ${match[1]}`);

for (const code of ['CR', 'KV', 'BFI', 'BGF', 'ISO', 'ES', 'GWS']) {
  assert.equal(productLabel(code), code, `${code} remains uppercase`);
}
assert.equal(productLabel('CHC_G1'), 'CHC G1');
assert.equal(productLabel('CHC_G2'), 'CHC G2');
assert.equal(productLabel('KEYPLC'), 'KeyPLC');
assert.equal(productLabel('MANIFOLD'), 'Manifold');
assert.equal(productLabel('MOTOR'), 'Motor');
assert.equal(productLabel('COUPLING'), 'Coupling');
assert.equal(productLabel('BASEPLATE'), 'Baseplate');

assert.match(index, /KeySuite V5\.00\.20/);
assert.match(index, /v50020-version-lock\.js\?v=50020/);
assert.match(serviceWorker, /keysuite-v50020-20261031/);
assert.match(serviceWorker, /\.\/v50020-version-lock\.js/);
assert.equal(release.version, '5.00.20');
assert.equal(release.new_database_migration_required, false);

// Frozen quotation PDF markup and logic were intentionally not edited.
assert.equal(read('app.js'), fs.readFileSync(path.resolve(root, '../KeySuite_V5.00.19_BUILD/KeySuite_V5.00.19/app.js'), 'utf8'));

console.log('V5.00.20 regression checks passed.');

