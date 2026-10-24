const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.05');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.05'/);
assert.match(read('index.html'), /v42905-version-lock\.js\?v=42905/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42905'/);
assert.match(read('sw.js'), /keysuite-v42905/);
assert.match(read('sw.js'), /v42905-version-lock\.js/);
assert.match(read('v42905-version-lock.js'), /const V='4\.29\.05'/);

for (const file of ['selector-g1/product.html', 'selector/product.html']) {
  const product = read(file);
  assert.match(product, /const printWindow=window\.open\("","_blank"\)/, `${file} desktop PDF opens a visible report tab`);
  assert.doesNotMatch(product, /pdfPrintFrame/, `${file} desktop PDF no longer uses a hidden print frame`);
  assert.match(product, /window\.onload=async\(\)=>\{[\s\S]*?window\.print\(\)/, `${file} report still waits for assets and opens the print\/save dialog`);
  assert.match(product, /function keychcPrewarmPdfAssets\(best\)/, `${file} prepares PDF assets while the Product curve is visible`);
  assert.match(product, /keychcPrewarmPdfAssets\(best\);/, `${file} starts preparation after rendering the selected model`);
  assert.match(product, /const host=window;/, `${file} stores prepared alignment data on the report opener`);
  assert.match(product, /const hp=n<1\?n\.toFixed\(2\):n\.toFixed\(2\)\.replace/, `${file} retains V4.29.03 HP formatting`);
  assert.match(product, /cacheHost=window\.opener\|\|window\.top\|\|window/, `${file} visible report reuses prepared alignment data through its opener`);
}

const fit = read('v42872-selector-first-open.js');
assert.match(fit, /\[0,40,120,280,650,1200,2200\]/, 'macOS Safari fit checks include late retries');
assert.match(fit, /restoreNativeChildLayout\(target\);notifyResize\(target\)/, 'late retries restore native child zoom and notify the curve view');
assert.match(fit, /window\.addEventListener\('pageshow'/, 'fit stabilization remains active when returning to Selection');

const protectedHashes = {
  'selector/index.html': '8a1c1095600ef0b4826bf698e86bbe59d3304a2db5e02fa8d7f731330a5d3b5c',
  'selector-g1/index.html': 'abd41a15b5218a3cea4ebb55af8191b01f1d1212d25036bdaf109313000926ba',
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
  assert.strictEqual(exists('v42904-version-lock.js'), false, 'obsolete V4.29.04 version lock must not remain');
} else {
  for (const file of Object.keys(protectedHashes)) assert.strictEqual(exists(file), false, `${file} must not be included in the upgrade`);
}

console.log('V4.29.05 macOS CHC C4/C6 PDF and Selection fit regression: PASS');
