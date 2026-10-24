const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.02');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.02'/);
assert.match(read('index.html'), /v42902-version-lock\.js\?v=42902/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42902'/);
assert.match(read('sw.js'), /keysuite-v42902/);
assert.match(read('sw.js'), /SHELL\[SHELL\.indexOf\('\.\/v42875-version-lock\.js'\)\]='\.\/v42902-version-lock\.js'/);
assert.match(read('v42902-version-lock.js'), /const V='4\.29\.02'/);

const productCurve = read('v394411-product-curve.js');
const functionSource = productCurve.match(/function productFrameChrome\(fr,f\)\{[\s\S]*?\}\n(?=function prepareFrame)/);
assert(functionSource, 'Product curve chrome function must be present');

function cssFor(family) {
  const style = { textContent: '' };
  const document = {
    body: { classList: { add() {} } },
    head: { appendChild() {} },
    getElementById() { return style; },
    createElement() { return style; },
  };
  const context = { result: '', fr: { contentDocument: document }, family };
  vm.runInNewContext(`${functionSource[0]}\nresult=productFrameChrome(fr,family)?fr.contentDocument.getElementById().textContent:'';`, context);
  return context.result;
}

const esPopupCss = cssFor('ES');
assert(esPopupCss.includes('.details{display:none!important}'), 'ES keeps Product detail suppression');
assert(esPopupCss.includes('body.product-frame .alts{display:block!important}'), 'ES popup alternatives override is visible');

const bfiPopupCss = cssFor('BFI');
assert(bfiPopupCss.includes('.details{display:none!important}'), 'BFI keeps Product detail suppression');
assert(bfiPopupCss.includes('body.product-frame #alternativesCard,body.product-frame .alternatives-panel{display:block!important}'), 'BFI popup alternatives override is visible');

for (const family of ['CHC', 'CR']) {
  const css = cssFor(family);
  assert(css.includes('#alternativesCard'), `${family} alternative card remains hidden`);
  assert(css.includes('.alts'), `${family} alternative list remains hidden`);
}

const overhaul = read('v40001-product-series-overhaul.js');
const frameStyleSource = overhaul.match(/function ensureFrameStyle\(doc,f\)\{[\s\S]*?\n  \}\n(?=\n  function idsFor)/);
assert(frameStyleSource, 'embedded selector style function must be present');
function embeddedCssFor(family) {
  const style = { textContent: '', id: '' };
  const document = { getElementById() { return null; }, createElement() { return style; }, head: { appendChild() {} } };
  const context = { result: '', document, family };
  vm.runInNewContext(`${frameStyleSource[0]}\nensureFrameStyle(document,family);result=document.createElement().textContent;`, context);
  return context.result;
}
assert(embeddedCssFor('ES').includes('.alts{display:block!important}'), 'embedded ES alternatives are visible');
assert(embeddedCssFor('BFI').includes('.alternatives-panel{display:block!important}'), 'embedded BFI alternatives are visible');
assert(embeddedCssFor('CHC').includes('.alternatives-panel{display:none!important}'), 'embedded CHC alternatives remain hidden');
assert(embeddedCssFor('CR').includes('.alternatives-panel{display:none!important}'), 'embedded CR alternatives remain hidden');
assert(overhaul.includes('function watchFrameHeight(frame,doc)'), 'dynamic frame-height watcher is installed');
assert(overhaul.includes("observer.observe(doc.body,{subtree:true,childList:true,attributes:true,characterData:true})"), 'expanded controls and rendered results trigger height remeasurement');
const heightSource = overhaul.match(/function watchFrameHeight\(frame,doc\)\{[\s\S]*?\n  \}\n(?=  function openInline)/);
assert(heightSource, 'frame-height synchronization functions must be present');
const heightContext = {
  result: null,
  activeFrame() { return null; },
  requestAnimationFrame(callback) { callback(); },
  ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} },
  MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} },
};
vm.runInNewContext(`${heightSource[0]}\nconst doc={documentElement:{scrollHeight:1400},body:{scrollHeight:1500}};const frame={contentDocument:doc,style:{height:'',overflow:''},setAttribute(){}};resizeFrame(frame);doc.body.scrollHeight=1900;frame.__ks42902MutationObserver.callback();result=frame.style.height;`, heightContext);
assert.strictEqual(heightContext.result, '1910px', 'expanded embedded content grows the iframe and remains reachable');

const protectedHashes = {
  'selector-es/index.html': 'ce8bffb2d7b751d817f60f9217b76395aee77ce4decac7349e8af820165ecf34',
  'selector-es/es-core.js': 'e9c071744a3efcb66a0047cf25115faccc8f1ccff568399f93360545aa0d4a65',
  'selector-es/es-data.js': '4c9f15558f0cc286b37669f3ec20d4c240e2049735ac869e74b22435f8009bc5',
  'selector-bfi/index.html': 'c86e3765d4f01fea5aab2d6350f2478a8797bffd610152177da572fa406fc6bf',
  'selector-bfi/product.html': 'e33472ad9984b284f6210bfb97b1005a6707d900cbe81ed4b7cd1d1239b98c28',
  'supabase/functions/shared-bfi/bfi-selector-core.js': '9f4bcfdb56fb4a6db6bade8ab7a1e8bd8d4747f40fcf129fbfbb76f66e45a2ca',
  'pricing.js': '7bd470339454a664498012e9d50ac984daab7f1c57e2cdf89dbc57a512f66d29',
  'app.js': '40bad9075b51f39a5f73ffb6feeb45096ca1ceac880596ff882ef0cbac1da2bf',
  'pdf-optimization.js': '61cc19d460e70d4f8545783935beb7eb5e65c7890dc7f19523d1f3233a384614',
};

if (root.includes('FULL_CLEAN')) {
  for (const [file, expected] of Object.entries(protectedHashes)) assert.strictEqual(hash(file), expected, `${file} changed`);
  assert.strictEqual(exists('v42901-version-lock.js'), false, 'obsolete V4.29.01 version lock must not remain');
} else {
  for (const file of Object.keys(protectedHashes)) assert.strictEqual(exists(file), false, `${file} must not be included in the upgrade`);
}

console.log('V4.29.02 ES/BFI alternative-model restoration regression: PASS');
