const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.04');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.04'/);
assert.match(read('index.html'), /v42904-version-lock\.js\?v=42904/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42904'/);
assert.match(read('sw.js'), /keysuite-v42904/);
assert.match(read('sw.js'), /v42904-version-lock\.js/);
assert.match(read('v42904-version-lock.js'), /const V='4\.29\.04'/);

for (const file of ['selector/index.html', 'selector/product.html']) {
  const source = read(file);
  assert.match(source, /function keychcPrewarmPdfAssets\(best\)/, `${file} prepares selected CHC PDF assets`);
  assert.match(source, /requestIdleCallback\(prepare,\{timeout:1500\}\)/, `${file} preparation runs outside the result render path`);
  assert.match(source, /__KEYSUITE_DIMENSION_VISIBLE_RATIO_V42872/, `${file} shares the exact dimension-alignment cache`);
  assert.match(source, /if\(!\(ratio>0\)\)\{[\s\S]*?getImageData/, `${file} retains the original full-resolution alignment fallback`);
  assert.match(source, /keychcPrewarmPdfAssets\(best\);/, `${file} prepares after the CHC result renders`);
  assert.match(source, /const hp=n<1\?n\.toFixed\(2\):n\.toFixed\(2\)\.replace/, `${file} retains V4.29.03 HP formatting`);
}

assert.match(read('selector/index.html'), /window\.opener&&window\.opener\.KeySuitePdfOptimization/, 'CHC popup reuses the prepared optimizer cache');
assert.match(read('selector/product.html'), /cacheHost=window\.opener\|\|window\.top\|\|window/, 'CHC Product desktop and mobile reports reuse the prepared alignment cache');

const protectedHashes = {
  'selector-g1/index.html': 'abd41a15b5218a3cea4ebb55af8191b01f1d1212d25036bdaf109313000926ba',
  'selector-g1/product.html': 'a76545192a461331cf61f8927c4d93132b5889be849011bab2087c368229dfe6',
  'selector-bfi/index.html': 'd44bc1d8d8f58717f928a74a233eb086913e5cf86d76fe0a6e5b6d60f515bf28',
  'selector-bfi/product.html': '63663f659f1a79445033aa2c9e8e77127e391ca942862108e4154a6b468315b0',
  'selector-cr/index.html': '79c4ef40e8d6a4e9f64a4b3ba89b07a199e09cde34f0494ffa2127a8ddcec1bd',
  'selector-cr/product.html': '265b45fa90580b88a7fafcf2084c2eccee6898154a3a3253081578436a6377ef',
  'selector-es/index.html': 'ce8bffb2d7b751d817f60f9217b76395aee77ce4decac7349e8af820165ecf34',
  'pdf-optimization.js': '61cc19d460e70d4f8545783935beb7eb5e65c7890dc7f19523d1f3233a384614',
  'app.js': '40bad9075b51f39a5f73ffb6feeb45096ca1ceac880596ff882ef0cbac1da2bf',
  'pricing.js': '7bd470339454a664498012e9d50ac984daab7f1c57e2cdf89dbc57a512f66d29',
  'v394411-product-curve.js': '1dca0adc415bff07e318e72784c936c352df3dd04ab4f23f5a067e8ea4d44cad',
  'v40001-product-series-overhaul.js': '91351e45b72ebde5955d0c30cc9ba610983bb3b04d5337ceda2459228da10e66',
};

if (root.includes('FULL_CLEAN')) {
  for (const [file, expected] of Object.entries(protectedHashes)) assert.strictEqual(hash(file), expected, `${file} changed`);
  assert.strictEqual(exists('v42903-version-lock.js'), false, 'obsolete V4.29.03 version lock must not remain');
} else {
  for (const file of Object.keys(protectedHashes)) assert.strictEqual(exists(file), false, `${file} must not be included in the upgrade`);
}

console.log('V4.29.04 CHC C4/C6 PDF preparation regression: PASS');

