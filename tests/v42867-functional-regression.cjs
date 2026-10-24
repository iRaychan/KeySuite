const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js'),index=read('index.html'),multi=read('v40001-multibrand.js');
const first=read('v42867-selector-first-open.js'),versionLock=read('v42867-version-lock.js');
const crFiles=['selector-cr/index.html','selector-cr/product.html'];
const cr=crFiles.map(read);

function extract(source,name){const start=source.indexOf(`function ${name}(`);assert(start>=0);let depth=0,end=-1;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0){end=i+1;break}}return source.slice(start,end)}

// 1. macOS CR uses the same base responsive geometry as Windows.
assert(cr[0].includes('V4.28.67: shared CR geometry'));
assert(!cr[0].includes('html.macos-safari main{grid-template-columns'));
assert(!cr[0].includes('html.macos-safari .curve-grid'));
assert(cr[0].includes('main{max-width:1480px;grid-template-columns:340px minmax(0,1fr)'));

// 2. Filename generation is unchanged on Windows and remains locked on Safari.
const box={quotationRevisionNumber:0,quoteRevisionNumberFromNo:value=>Number(String(value).match(/-R(\d+)$/i)?.[1]||0)};
vm.createContext(box);vm.runInContext(['safePdfName','parseQuoteNo','quotationPdfFilename'].map(n=>extract(app,n)).join('\n'),box);
assert.strictEqual(box.quotationPdfFilename('Smartech Engineering','2026-10-06','Q-2610-0229'),'Smartech - 261006 - 0229.pdf');
assert.strictEqual(box.quotationPdfFilename('Smartech Engineering','2026-10-06','Q-2610-0229-R2'),'Smartech - 261006 - 0229-R2.pdf');
assert(versionLock.includes('printTitle()||`KeySuite V${V}`'));
assert(versionLock.includes('__KEYSUITE_LOCKED_QUOTATION_PDF_TITLE__'));

// 3. A restored quotation customer cannot filter Owner CHC navigation.
assert(multi.includes("const navigationCustomerId=()=>String($('startCustomer')?.value||'')"));
assert(!multi.includes("const navigationCustomerId=()=>String($('startCustomer')?.value||window.KeySuiteApp?.getPricingCustomerId"));
assert(multi.includes("{label:'CHC C4',family:'CHC',productGroup:'CHC_G1'"));
assert(multi.includes("{label:'CHC C6',family:'CHC',productGroup:'CHC_G2'"));

// 4. CR Selector and Product Page 3 load a real cached asset and wait for decode.
for(const [i,source] of cr.entries()){
  assert(source.includes('../assets/pdf-optimized/chc-g1-dimensions/${assetKey}.jpg'),crFiles[i]);
  assert(source.includes('img.complete&&img.naturalWidth>0'),crFiles[i]);
  assert(source.includes("[...document.images].map(img=>typeof img.decode==='function'?img.decode()"),crFiles[i]);
  assert(source.includes('.dimension-drawing{height:152mm'),crFiles[i]);
  assert(source.includes('.dimension-info{margin:3mm auto 0'),crFiles[i]);
}
for(let i=1;i<=13;i++)assert(fs.statSync(path.join(root,`assets/pdf-optimized/chc-g1-dimensions/${i}.jpg`)).size>1000);

// 5. Windows pre-routes C4/C6; macOS does not enter the hide/reveal branch.
assert(first.includes('const isWindows=/Windows/i.test(ua)'));
assert(first.includes('if(!isWindows)return'));
assert(first.includes("document.addEventListener('pointerdown'"));
assert(first.includes('window.KeySuiteCHCSelection?.setGeneration?.(next)'));
assert(first.includes("target.style.visibility='hidden'"));
assert(index.includes('v42867-selector-first-open.js?v=42867'));

console.log('V4.28.67 five-point functional regression: PASS');
