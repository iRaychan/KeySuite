const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const files={app:read('app.js'),universe:read('universe.js'),pdf:read('pdf-optimization.js'),first:read('v42867-selector-first-open.js'),crProduct:read('cr-product.js')};
const curves=['selector/index.html','selector/product.html','selector-g1/index.html','selector-g1/product.html','selector-cr/index.html','selector-cr/product.html','selector-bfi/index.html','selector-bfi/product.html'];
const cr=['selector-cr/index.html','selector-cr/product.html'].map(read),bfi=['selector-bfi/index.html','selector-bfi/product.html'].map(read);

// 1. CR/BFI settings use independent keys/families and newest-save conflict resolution.
for(const source of cr){assert(source.includes("'ks_selector_display_cr'"));assert(source.includes("selector_family:'CR'"));assert(source.includes("select('settings,updated_at')"));assert(source.includes('remoteUpdated>=localUpdated'));assert(!source.includes("'ks_selector_display_bfi'"))}
for(const source of bfi){assert(source.includes("'ks_selector_display_bfi'"));assert(source.includes("selector_family:'BFI'"));assert(source.includes("select('settings,updated_at')"));assert(source.includes('remoteUpdated>=localUpdated'));assert(!source.includes("'ks_selector_display_cr'"))}

// 2. Evaluate the filename formatter and verify the actual print path locks it at beforeprint.
function extract(source,name){const start=source.indexOf(`function ${name}(`);assert(start>=0);let depth=0,end=-1;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0){end=i+1;break}}return source.slice(start,end)}
const box={quotationRevisionNumber:0,quoteRevisionNumberFromNo:value=>Number(String(value).match(/-R(\d+)$/i)?.[1]||0)};vm.createContext(box);vm.runInContext(['safePdfName','parseQuoteNo','quotationPdfFilename'].map(n=>extract(files.app,n)).join('\n'),box);
assert.strictEqual(box.quotationPdfFilename('Smartech Engineering','2026-10-06','Q-2610-0229'),'Smartech - 261006 - 0229.pdf');
assert.strictEqual(box.quotationPdfFilename('Smartech Engineering','2026-10-06','Q-2610-0229-R2'),'Smartech - 261006 - 0229-R2.pdf');
assert(files.app.includes("addEventListener('beforeprint',relock,{once:true})"));assert(files.app.includes('lockQuotationPdfTitle(pdfName)'));

// 3. Selector and Product share the same alias-aware dimension resolver and drawing fallback.
for(const source of cr){assert(source.includes('function keycrDimensionData(best)'));assert(source.includes('const dimensionData=keycrDimensionData(best)'));assert(source.includes("G1_DIMENSION_IMAGES['3']||Object.values"));assert(source.includes("'CR 8-11':{b1:686,b2:305,height:991,d1:197,d2:148,weight:68,series:'CR 8',pumpL:280,pumpW:256}"))}
assert(cr[1].includes("getElementById('selectorCrFrame')?.contentWindow?.KeySuiteCRDimensionData"));

// 4. Product PDF preparation is automatic, shared and does not reduce curve data.
assert(files.pdf.includes('raw===null?true'));assert(files.pdf.includes('__KEYSUITE_PDF_IMAGE_INFLIGHT_V42867'));assert(files.pdf.includes('if(inflight.has(key))return inflight.get(key)'));
for(const file of curves.filter(x=>x.includes('product'))){const source=read(file);assert(source.includes('KeySuitePdfOptimization'));assert(!/headFit\.pts\s*=\s*headFit\.pts\.slice/.test(source))}

// 5. Every series uses primary HP and secondary kW for D1 Shaft Power.
for(const file of curves){const source=read(file);assert(source.includes("(requiredPower/0.746).toFixed(1)+' HP'"),file);assert(source.includes("requiredPower.toFixed(2)+' kW at D1'"),file);assert(!source.includes("requiredPower.toFixed(2)+' kW':'—'"),file)}
const es=read('selector-es/index.html');assert(es.includes("kpi('D1 shaft power',fmtMax1(p.bhp)+' HP',fmt(p.shaftKw,2)+' kW')"));

// 6. CR identifies the motor class as IE3 while leaving numeric efficiency tables untouched.
assert(files.crProduct.includes("motor_efficiency_class:'IE3'"));assert(files.crProduct.includes("payload.motor_efficiency_class||'IE3'"));
for(const source of cr){assert(source.includes("function keysuiteAutoPumpMotorEff(hp,normal='IE3'){motorEff.value='IE3';return 'IE3'}"));assert(source.includes('<option value="IE3" selected>IE3</option>'))}

// 7. Visible selector stabilization is single pass. The only hide is the
// Windows-only stale-generation guard introduced in V4.28.67; no reload/timer loop.
assert(!files.first.includes('.reload('));assert(files.first.includes("const isWindows="));assert(files.first.includes("target.style.visibility='hidden'"));assert(files.first.includes("target.style.visibility='visible'"));assert(!files.first.includes('[0,40,120,280]'));assert(files.first.includes('requestAnimationFrame'));

// 8. KeyCore follows the current company quotation RPC compatibility chain.
for(const rpc of ['keysuite_list_quotations_v409','keysuite_list_quotations_v408','keysuite_list_quotations_v236'])assert(files.universe.includes(rpc));
assert(files.universe.includes('p_company_id:companyId'));assert(files.universe.includes('Array.isArray(result)&&result.length'));

console.log('V4.28.67 eight-point functional regression: PASS');
