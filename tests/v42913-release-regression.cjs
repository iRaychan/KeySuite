const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.13');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.13'/);
assert.match(read('index.html'), /v42913-version-lock\.js\?v=42913/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42913'/);
assert.match(read('sw.js'), /keysuite-v42913/);
assert.match(read('sw.js'), /v42913-version-lock\.js/);
assert.match(read('sw.js'), /\.\/keyhq\/index\.html/);
assert.match(read('sw.js'), /selector-es\|keyhq/, 'KeyHQ navigation must not receive the main-page bootstrap injection');
assert.match(read('v42913-version-lock.js'), /const V='4\.29\.13'/);

const customerBrandSettings = read('v40001-customer-brand-settings.js');
assert.match(customerBrandSettings, /PRICE_GROUPS=\['CHC_G1','CHC_G2','CR','BFI','ES'/, 'Customer Brand / Series Price Preference includes CR');
assert.match(customerBrandSettings, /priceGroup:'CR',family:'CR',selectionKey:keyOf\(b\.id,'CR'\)/, 'B.G.Reich CR has an independently saved Price and Selection key');
assert.match(customerBrandSettings, /\['CHC_G1','CHC_G2','CR','BFI','ES'\]\.includes\(group\)/, 'CR is eligible for Customer Curve / Quick Selection preference');

const quickSelection = read('v40201-quick-selection.js');
assert.match(quickSelection, /FAMILIES=\['CHC','CR','BFI','ES'\]/, 'Quick Selection recognises CR as a hydraulic family');
assert.match(quickSelection, /family:'CR',productGroup:'CR',key:keyOf\(b\.id,'CR'\)/, 'Quick Selection exposes assigned B.G.Reich CR');

const pricing = read('pricing.js');
assert.match(pricing, /motorPricingError/, 'invalid same-source-price IE upgrades are blocked');
assert.match(pricing, /minimumUpgradeStepApplied/, 'RM10 rounding cannot hide a valid IE upgrade');
assert.match(read('app.js'), /Motor price adjustment:/, 'quotation description shows the IE price adjustment');

console.log('V4.29.13 motor pricing and KeyHQ regression: PASS');
