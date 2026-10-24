/* Run with: node tests/v42914-release-regression.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

assert.strictEqual(read('VERSION.txt').trim(),'4.29.14');
assert.match(read('index.html'),/KeySuite V4\.29\.14/);
assert.match(read('index.html'),/v42914-version-lock\.js\?v=42914/);
assert.match(read('v41200-bootstrap.js'),/KEYSUITE_VERSION='4\.29\.14'/);
assert.match(read('sw.js'),/keysuite-v42914/);
assert.match(read('pricing.js'),/includedMotorDeduction=bareShaft\?includedMotorRawPriceMyr:includedMotorQuotedPrice/);
assert.match(read('v40001-multibrand.js'),/motorReplacementFinal:replacement\.final/);

console.log('V4.29.14 release regression: PASS');
