const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js'),assembly=read('assembly.js'),pricing=read('pricing.js'),index=read('index.html');

function functionSource(source,name){
  const start=source.indexOf(`function ${name}(`);assert(start>=0,`${name} exists`);
  const match=source.slice(start).match(/^function [\s\S]*?^}/m);assert(match,`${name} is extractable`);return match[0];
}

// Requirement 1: carry the user's final Assembly/System price, then protect it on refresh.
assert(assembly.includes('syncQuoteUnitPrice(current);unitPrice=quoteUnitPrice(current)'), 'quotation handoff reads the final displayed assembly unit price');
assert(assembly.includes("pricing_mode:'carried_final'")&&assembly.includes('carried_final_price:true'), 'handoff snapshot marks the carried final price');
assert(pricing.includes("if(source.carried_final_price===true||String(source.pricing_mode||'').toLowerCase()==='carried_final')"), 'quotation refresh skips leaf repricing for carried assemblies');
const carriedAssembly={displayedFinal:5200,quotationUnitPrice:5200};
assert.strictEqual(carriedAssembly.quotationUnitPrice,carriedAssembly.displayedFinal,'RM5,200 remains RM5,200');
assert(pricing.includes("pricing_rule:'COMPONENT_BEFORE_SET_DISCOUNT_SUM_TRANSPORT_MAX_FUEL'"),'Assembly display retains its consolidated Transport/Fuel audit rule');
assert(pricing.includes('transportTotal+=qty*Math.max(0,Number(calc.transport)||0)'),'Transport is summed');
assert(pricing.includes('maxFuelCharge=Math.max(maxFuelCharge'),'Fuel uses MAX once');

// Requirements 2 and 3: collapsed title keeps capacity; output title is clean and the row is optional/unique.
assert(app.includes('`${parts.base} -- ${line}`'),'collapsed quotation title uses the approved double-hyphen capacity format');
assert(app.includes('model:splitCapacityModel(rawModel).base'),'saved/printed model removes the collapsed capacity suffix');
assert(app.includes('capacityText(stripQuotationBrand(r.querySelector') ,'printed description is rebuilt from the capacity toggle state');
assert(index.includes('.print-capacity-item .print-item-model{margin-bottom:.35mm}'),'only capacity items receive the reduced title gap');
assert(index.includes('.print-system-item-desc-row.print-capacity-item td{padding-top:.35mm}'),'set-item Capacity row gap is reduced without changing item-row spacing');

// Requirement 4: quotation PDF filename uses first company word, document date, final four reference digits and revision.
const filenameSandbox={quotationRevisionNumber:0,quoteRevisionNumberFromNo:value=>{const m=String(value).match(/-R(\d+)$/i);return Number(m?.[1]||0)}};
vm.createContext(filenameSandbox);
vm.runInContext([functionSource(app,'safePdfName'),functionSource(app,'parseQuoteNo'),functionSource(app,'quotationPdfFilename')].join('\n'),filenameSandbox);
assert.strictEqual(filenameSandbox.quotationPdfFilename('Smartech Engineering Sdn Bhd','2026-10-06','Q-2610-0229'),'Smartech - 261006 - 0229.pdf');
assert.strictEqual(filenameSandbox.quotationPdfFilename('Smartech Engineering Sdn Bhd','2026-10-06','Q-2610-0229-R1'),'Smartech - 261006 - 0229-R1.pdf');

// Requirement 5: original duty fields and units are preferred over converted m3/hr values.
assert(app.includes('originalDuty=pumpPdfOriginalDuty(pump)'),'curve filename resolves the original selected duty first');
assert(app.includes("igpm:'IGPM'")&&app.includes("raw_flow_text??pump.rawFlowText"),'IGPM and original text are retained');
assert(app.includes('duty=originalDuty?` - ${originalDuty}`'),'original duty wins over the converted fallback');

// Requirement 6: automatic display values are whole numbers but q/h calculation values remain separate.
for(const file of ['selector/product.html','selector/index.html','selector-g1/product.html','selector-g1/index.html','selector-cr/product.html','selector-cr/index.html','selector-bfi/product.html','selector-bfi/index.html']){
  const source=read(file);assert(source.includes('rawFlow:Math.round(q)')&&source.includes('rawHead:Math.round(h)'),`${file} rounds only automatic display values`);
  assert(source.includes('selectionState={q,h,'),`${file} keeps full-precision q/h fields`);
}
const es=read('selector-es/index.html');
assert(es.includes('autoFlow=Number(bep.flowM3h),autoHead=Number(bep.headM)'),'ES retains full-precision BEP calculation duty');
assert(es.includes('shownFlow=Math.round(autoFlow),shownHead=Math.round(autoHead)'),'ES rounds its automatic display duty');

// Requirement 7: expensive image work is shared, with no curve-point reduction shortcut.
const pdfOpt=read('pdf-optimization.js'),chc=read('selector/product.html'),cr=read('selector-cr/product.html');
assert(pdfOpt.includes('__KEYSUITE_PDF_IMAGE_CACHE_V42867'),'optimized raster results are shared across print frames');
for(const [name,source] of [['CHC',chc],['CR',cr]]){
  assert(source.includes('__KEYSUITE_DIMENSION_VISIBLE_RATIO_V42867'),`${name} dimension scan is cached`);
  assert(source.includes('(window.top&&window.top.KeySuitePdfOptimization)'),`${name} reuses the parent optimizer cache`);
  assert.strictEqual((source.match(/<script src="\.\.\/pdf-optimization\.js\?v=42510">/g)||[]).length,1,`${name} does not reload the optimizer inside the print iframe`);
  assert(!/\.slice\(0\s*,\s*\d+\).*headFit\.pts/.test(source),`${name} does not reduce curve points`);
  assert(source.includes('grid-template-rows:75mm 60mm 60mm 63mm'),`${name} PDF chart geometry remains frozen`);
}

console.log('V4.28.67 functional regression: PASS');
