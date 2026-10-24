const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.03');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.03'/);
assert.match(read('index.html'), /v42903-version-lock\.js\?v=42903/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42903'/);
assert.match(read('sw.js'), /keysuite-v42903/);
assert.match(read('sw.js'), /v42903-version-lock\.js/);
assert.match(read('v42903-version-lock.js'), /const V='4\.29\.03'/);

const selectorFiles = [
  'selector/index.html',
  'selector/product.html',
  'selector-g1/index.html',
  'selector-g1/product.html',
  'selector-bfi/index.html',
  'selector-bfi/product.html',
  'selector-cr/index.html',
  'selector-cr/product.html',
];

for (const file of selectorFiles) {
  const source = read(file);
  const match = source.match(/function formatHP\(value\)\{[\s\S]*?\n\}/);
  assert(match, `${file} formatHP helper must be present`);
  const context = { result: null };
  vm.runInNewContext(`${match[0]}\nresult=[formatHP(0.5),formatHP(0.75),formatHP(1),formatHP(1.5),formatHP(2),formatHP(7.5)];`, context);
  assert.deepStrictEqual(Array.from(context.result), ['0.50 HP', '0.75 HP', '1 HP', '1.5 HP', '2 HP', '7.5 HP'], `${file} HP formatting`);
  assert.match(source, /motor_kw\.toFixed\(2\).* kW|formatPdfNumber\(best\.motor_kw,2\).* kW/, `${file} keeps two-decimal kW display`);
}

console.log('V4.29.03 motor HP display precision regression: PASS');

