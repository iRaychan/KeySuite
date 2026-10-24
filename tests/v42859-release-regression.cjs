const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const index=read('index.html'),curve=read('v394411-product-curve.js'),crProduct=read('cr-product.js');
assert(index.includes("window.KEYSUITE_VERSION='4.28.59'"),'visible version');
assert.strictEqual(read('VERSION.txt').trim(),'4.28.59','VERSION.txt');
assert.strictEqual(JSON.parse(read('manifest.json')).name,'KeySuite V4.28.59','manifest');
assert.strictEqual(JSON.parse(read('RELEASE.json')).version,'4.28.59','release metadata');
assert(index.includes('width:288px;min-width:288px;max-width:288px'),'CHC/CR seal input width');
assert(index.includes('id="productCrSelectorFrame"')&&crProduct.includes("open('CR',model,'CR')"),'CR curve route retained');
assert(curve.includes("fam==='CR'?'productCrSelectorFrame'")&&curve.includes('>PDF</button>')&&curve.includes('>Assembly</button>')&&curve.includes('>Add to Quote</button>'),'CR shared curve actions');
assert(index.includes('id="productBaseplateAssembly"')&&read('baseplate.js').includes("section:'baseplate'"),'Baseplate Assembly action');
assert(!curve.includes('print-system-item-head')&&!curve.includes('print-item-desc'),'curve wiring does not alter frozen print markup');
console.log('V4.28.59 release regression: PASS');
