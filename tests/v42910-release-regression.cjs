const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.10');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.10'/);
assert.match(read('index.html'), /v42910-version-lock\.js\?v=42910/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42910'/);
assert.match(read('sw.js'), /keysuite-v42910/);
assert.match(read('sw.js'), /v42910-version-lock\.js/);
assert.match(read('v42910-version-lock.js'), /const V='4\.29\.10'/);
assert.match(read('index.html'), /<span class="muted">Customer<\/span><b id="pricingCompanyCount">0<\/b>/, 'Customer metric label is singular');
assert.match(read('index.html'), /<span class="muted">Assigned Category<\/span><b id="pricingCategoryCount">0<\/b>/, 'Assigned Category replaces total Categories');
assert.match(read('pricing.js'), /customerList\.filter\(customer=>!!categoryForCustomer\(customer\)\)\.length/, 'Assigned Category counts customers with a valid assigned category');
assert.match(read('pricing.js'), /⚠ Not assigned/, 'unassigned customers are marked in the customer list');
assert.match(read('pricing.js'), /pricing-customer-unassigned/, 'the selected unassigned customer receives alert styling');
assert.match(read('index.html'), /<span class="muted">Models<\/span>/);
assert.match(read('index.html'), /<span class="muted">Models With Price<\/span>/);
assert.doesNotMatch(read('index.html'), /id="pricingFuelEfficiency"/, 'Company & Pricing does not contain the global fuel editor');
assert.doesNotMatch(read('index.html'), /id="pricingReturnJourney"/, 'Company & Pricing does not contain Return Journey editing');
assert.match(read('v40001-multibrand.js'), /<h2>Fuel Settings<\/h2>/, 'General Pricelist contains the global Fuel Settings editor');
assert.match(read('v40001-multibrand.js'), /id="v391FuelEfficiency"[^>]*min="0\.01"/, 'General Pricelist contains Fuel Efficiency');
assert.match(read('v40001-multibrand.js'), /id="v391ReturnJourney"/, 'General Pricelist contains Return Journey');
assert.match(read('v40001-multibrand.js'), /keysuite_save_fuel_settings_v42906/, 'General Pricelist saves the included fuel settings migration');
assert.match(read('v39445-model-return.js'), /SELECTION_PAGES=new Set\(\['selector','selectorCr','selectorBfi','selectorEs'\]\)/, 'Selection pages are recognized as quotation return origins');
assert.match(read('v39445-model-return.js'), /active==='quotation'&&!!readQuotationSelectionOrigin\(\)/, 'Quotation forces the Back button visible for a Selection route');
assert.match(read('v39445-model-return.js'), /b\.title='Back to Selection'/, 'Quotation Back button is labelled for Selection');
assert.match(read('app.js'), /lastAutoQuotationReference/, 'automatic quotation preview is tracked');
assert.match(read('app.js'), /quoteHasItems\(\)&&current&&current!==automatic/, 'loaded history may correct an automatic reference even after Selection adds an item');
assert.match(read('app.js'), /\[\\\/\-\].*\\d\{4\}.*\[\\\/\-\]/, 'legacy slash quotation references are recognized');
assert.match(read('app.js'), /function highestLocalRunning\(year\)/, 'running sequence is not scoped to a prefix');
assert.match(read('quotation-references.js'), /keysuite_preview_quotation_reference_v42910/, 'server preview supplies the company-wide sequence');

const quoteReferenceStorage = {
  values: [
    JSON.stringify([{ no: 'R-2610-0230' }, { no: 'RC-2610-0001' }, { no: 'AB-2512-0999' }]),
  ],
  get length() { return this.values.length; },
  key(index) { return String(index); },
  getItem(index) { return this.values[Number(index)]; },
};
const quoteReferenceWindow = {};
vm.runInNewContext(read('quotation-references.js'), {
  window: quoteReferenceWindow,
  localStorage: quoteReferenceStorage,
  console,
  Date,
});
assert.strictEqual(
  quoteReferenceWindow.KeySuiteQuotationReferences.scanRunningFloor('RC', new Date('2026-10-18T00:00:00+08:00')),
  230,
  'R-2610-0230 makes the next RC running number 0231'
);

const elements = new Map();
const makeElement = id => ({ id, value: '', textContent: '', innerHTML: '', disabled: false, style: {}, dataset: {}, className: '', addEventListener() {}, setAttribute() {}, removeAttribute() {}, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, classList: { toggle() {}, add() {}, remove() {} } });
const document = {
  activeElement: null,
  getElementById(id) { if (!elements.has(id)) elements.set(id, makeElement(id)); return elements.get(id); },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return { click() {}, style: {}, dataset: {} }; },
};
const window = {
  addEventListener() {},
  dispatchEvent() {},
  KeySuiteApp: { getCustomers: () => [] },
  KeySuitePermissions: { level: () => 'full' },
};
const sandbox = { window, document, console, alert() {}, Blob, URL, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(read('pricing.js'), sandbox, { filename: 'pricing.js' });
const pricing = window.KeySuitePricing;

assert.strictEqual(pricing.resolveModelRarity(
  { USD: { X: 100 }, RMB: { X: null }, MYR: { X: null } },
  { USD: { X: 'many' }, RMB: { X: 'common' }, MYR: { X: 'rare' } }, 'X'
), 'many', 'the sole priced currency wins');
assert.strictEqual(pricing.resolveModelRarity(
  { USD: { X: 100 }, RMB: { X: 50 }, MYR: { X: null } },
  { USD: { X: 'common' }, RMB: { X: 'rare' }, MYR: { X: 'many' } }, 'X'
), 'rare', 'Rare beats Common when both have prices');
assert.strictEqual(pricing.resolveModelRarity(
  { USD: { X: 100 }, RMB: { X: 50 }, MYR: { X: 20 } },
  { USD: { X: 'many' }, RMB: { X: 'common' }, MYR: { X: 'fixed' } }, 'X'
), 'fixed', 'Fixed remains protected above Rare/Many/Common');
assert.strictEqual(pricing.resolveModelRarity(
  { USD: { X: 0 }, RMB: { X: 0 }, MYR: { X: 0 } },
  { USD: { X: 'many' }, RMB: { X: 'common' }, MYR: { X: 'rare' } }, 'X'
), 'common', 'unquoteable legacy zeros use the safe Common default');

const allFamilyData = {
  products: [{ id: 'g2-a', model: 'CHC 1-2', pricesByCurrency: { USD: { CHC: null }, RMB: { CHC: 0 }, MYR: {} } }],
  chcG1Products: [{ id: 'g1-a', model: 'CHC 1-2', pricesByCurrency: { USD: {}, RMB: {}, MYR: {} } }],
  crProducts: [{ id: 'cr-a', model: 'CR 2-7', pricesByCurrency: { USD: { CR: 0 }, RMB: { CR: 1037 }, MYR: { CR: 791 } } }],
  bfiProducts: [{ id: 'bfi-a', model: 'BFI 1-2', pricesByCurrency: { USD: { '1Ph': 0 }, RMB: {}, MYR: {} } }],
  esProducts: [{ id: 'es-a', model: 'ES 32-160', variants: [{ priceUsd: null, priceRmb: '', priceMyr: 500 }] }],
  gwsProducts: [{ id: 'gws-a', model: 'GWS 100', pricesByCurrency: { USD: {}, RMB: {}, MYR: {} } }],
  keyplcProducts: [{ id: 'plc-a', model: '11 kW', variants: [{ priceUsd: null, priceRmb: null, priceMyr: null }] }],
  manifoldProducts: [{ id: 'mf-a', model: 'DN50', variants: [{ price_usd: null, price_rmb: 0, price_myr: null }] }],
  motorProducts: [], couplingProducts: [], categories: [], companies: [],
};
pricing.init(allFamilyData, { role: 'owner' });
const stats = pricing.modelStatistics();
assert.strictEqual(stats.models, 8, 'same text in G1/G2 remains a distinct family model');
assert.strictEqual(stats.modelsWithPrice, 4, 'preserved zero fields count, synthetic schema zeros do not');

const category = { productRules: { CHC_G2: { margin: 0.2, normal: 0, rare: 0, transport: 0, currencies: ['MYR'], useCommission: false, useSetDiscount: false, useFinalDiscount: false, useFuelCharge: true } } };
const priceBook = { USD: {}, RMB: {}, MYR: { CHC: 100 } };
const rarityBook = { USD: { CHC: 'common' }, RMB: { CHC: 'common' }, MYR: { CHC: 'common' } };
const outbound = pricing.calculatePrice(priceBook, 'CHC', category, 'CHC_G2', { rarityBook, customer: { distanceKm: 100 }, fuelPrice: 3.5, fuelBasePrice: 2, fuelEfficiency: 6.3, returnJourney: false });
const returned = pricing.calculatePrice(priceBook, 'CHC', category, 'CHC_G2', { rarityBook, customer: { distanceKm: 100 }, fuelPrice: 3.5, fuelBasePrice: 2, fuelEfficiency: 6.3, returnJourney: true });
assert.ok(Math.abs(outbound.fuelCharge - (100 / 6.3 * 1.5)) < 1e-9);
assert.ok(Math.abs(returned.fuelCharge - (200 / 6.3 * 1.5)) < 1e-9);
assert.strictEqual(returned.journeyMultiplier, 2);

const migration = read('supabase/migrations/20261018150000_v42906_fuel_and_model_rarity.sql');
assert.match(migration, /security definer[\s\S]*set search_path=''/i);
assert.match(migration, /lower\(coalesce\(ua\.role,''\)\)='owner'/);
assert.match(migration, /ks_v42906_resolve_model_rarity/);
assert.match(migration, /Fixed > Rare > Many > Common/);
assert.match(migration, /before insert or update on public\.ks_products_chc/);
assert.match(migration, /before insert or update on public\.ks_products_cr/);
assert.match(migration, /before insert or update on public\.ks_products_bfi/);
assert.match(read('supabase/functions/telegram-webhook/index.ts'), /fuelEfficiency:Number\(settings\.fuel_efficiency\?\?6\.3\)/);
assert.match(read('supabase/functions/telegram-webhook/index.ts'), /returnJourney:settings\.return_journey!==false/);

const sequenceMigration = read('supabase/migrations/20261018190000_v42910_company_wide_quotation_sequence.sql');
assert.match(sequenceMigration, /primary key \(company_id,calendar_year\)/i);
assert.match(sequenceMigration, /keysuite_v42910_history_running_floor/);
assert.match(sequenceMigration, /keysuite_preview_quotation_reference_v42910/);
assert.match(sequenceMigration, /keysuite_next_quotation_reference_v223/);
assert.match(sequenceMigration, /keysuite_register_quotation_reference_v226/);
assert.match(sequenceMigration, /enable row level security/i);

console.log('V4.29.10 customer assignment, pricing, quotation sequence and navigation regression: PASS');
