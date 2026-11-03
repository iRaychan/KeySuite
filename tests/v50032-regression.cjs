const assert = require('assert');
const fs = require('fs');

const read = (name) => fs.readFileSync(name, 'utf8');
const index = read('index.html');
const sw = read('sw.js');
const quick = read('v40201-quick-selection.js');
const customer = read('v40001-customer-brand-settings.js');
const pricing = read('pricing.js');
const audit = read('costing-audit-v50032.js');
const keylab = read('keylab.js');
const app = read('app.js');
const css = read('v50032-bugfixes.css');
const multi = read('v40001-multibrand.js');

assert.equal(read('VERSION.txt').trim(), '5.00.32');
assert(index.includes("KEYSUITE_VERSION='5.00.32'"));
assert(index.includes('costing-audit-v50032.js'));
assert(sw.includes("keysuite-v50032-20261103"));

for (const series of ['KV', 'ISO']) assert(quick.includes(`family:'${series}'`) && quick.includes(`productGroup:'${series}'`));
assert(customer.includes("HYDRAULIC_FAMILIES=['CHC','CR','KV','BFI','ES','ISO']"));
assert(multi.includes("shownDesc=shownDesc.replace(/(Vertical\\s+Multistage\\s+Pump\\s+Model:"));

assert(app.includes('metadataTitleFromPump'));
assert(app.includes('keysuite_pdf_metadata_title'));
assert(app.includes("String(date.getFullYear()).slice(-2)"));

assert(pricing.includes('margin_price'));
assert(pricing.includes('after_set_discount'));
assert(audit.includes('keysuite_can_view_costing_breakdown_v50031'));
assert(audit.includes('Calculation / Rate'));
assert(audit.includes('Assembly (RM)'));
assert(audit.includes('Individual (RM)'));
assert(audit.includes('Quotation price'));
assert(css.includes('flex-flow:row nowrap'));
assert(css.includes('.keysuite-cost-button'));

assert(keylab.includes('Math.ceil((Number(value) || 0) / 50) * 50'));
assert(keylab.includes('roundingAdjustment'));
assert(index.includes('nearest RM50'));

console.log('V5.00.32 regression assertions passed');
