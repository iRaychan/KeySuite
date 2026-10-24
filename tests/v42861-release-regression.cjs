const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const index=read('index.html');
const app=read('app.js');
const baseplate=read('baseplate.js');
const assembly=read('assembly.js');
const productRoutes=read('v40001-product-series-overhaul.js');
const authority=read('v40407-role-authority.js');
const crSelector=read('selector-cr/index.html');
const multiBrand=read('v40001-multibrand.js');
const bootstrap=read('v41200-bootstrap.js');

assert(index.includes("window.KEYSUITE_VERSION='4.28.61'"),'visible version');
assert.strictEqual(read('VERSION.txt').trim(),'4.28.61','VERSION.txt');
assert.strictEqual(JSON.parse(read('manifest.json')).name,'KeySuite V4.28.61','manifest');
assert.strictEqual(JSON.parse(read('RELEASE.json')).version,'4.28.61','release metadata');
assert(bootstrap.includes("window.KEYSUITE_VERSION='4.28.61'")&&bootstrap.includes("const VERSION='42861'"),'runtime bootstrap version and cache key');
assert(app.includes("serviceWorker.register('sw.js?v=42861')"),'service worker registration is cache-busted for V4.28.61');

assert(index.includes('.seal-price-table{width:100%;table-layout:fixed}'),'seal table is constrained to its card');
assert(index.includes('max-width:288px;min-width:0'),'seal inputs use a responsive 288px maximum');
assert(!index.includes('width:288px;min-width:288px;max-width:288px'),'seal inputs do not force horizontal overflow');

assert(index.includes('id="productBaseplateAssembly"')&&index.includes('id="productBaseplateQuote">Add to Quote</button>'),'ES Baseplate actions share the heading row');
assert(/function frameForChannel\(channel\)/.test(baseplate),'Baseplate channel-to-frame mapping exists');
assert(/baseplateData:\{\.\.\.config,defaultFrame:config\.frame,configuration:config\}/.test(baseplate),'mapped frame is carried into Assembly/BOM data');
assert(/"100":\{"gap":50,"cChannel":"2\\" X 4\\"/.test(read('v40205-motor-baseplate-data.js')),'2 x 4 master mapping is frame 100');
assert(/manualFrame=!!item\?\.baseplateData\?\.manualFrame/.test(assembly)&&/chosenFrame=Number\(manualFrame\?item\.baseplateData\.frame:bp\.frame\)/.test(assembly),'manual Assembly frame overrides remain intentional');

assert(index.includes('data-page="selectorCr"')&&index.includes('id="selectorCrFrame"'),'CR Selection route and frame exist');
for(const id of ['crPumpMaterial','crSealFaces','crSealElastomer','crConnectionType','crBareShaft'])assert(index.includes(`id="${id}"`),`CR Selection includes CHC-style ${id} control`);
assert(index.includes('selector-cr/index.html?v=42861&amp;ks-visible=1'),'CR selector uses the integrated visible layout');
assert(authority.includes("selectorCr:'CR'"),'CR Selection follows CR role scope');
assert(crSelector.includes("type:'KEYSUITE_ADD_SELECTION'")&&crSelector.includes("route:'assembly'")===false,'CR selector exposes native routed selection actions');
assert(crSelector.includes("send('assembly')")&&crSelector.includes("send('quotation')"),'CR Selection continues to Assembly and Quote');
assert(crSelector.includes("shared-cr/cr-selector-core.js")&&crSelector.includes("shared-cr/cr-data.js"),'CR Selection uses separate CR hydraulic data and logic');
assert(crSelector.includes('<h1>CR Series</h1>')&&crSelector.includes('>Quote</button>'),'CR header and actions follow the CHC structure with CR labels');
assert(crSelector.includes('Database Version: 261003-V1.0 · KeyCR'),'CR header identifies the CR V1.0 engineering database');
assert(crSelector.includes("d.getElementById('crPumpMaterial')")&&crSelector.includes("d.getElementById('crBareShaft')"),'CR routed payload reads the outer CR configuration controls');
assert(multiBrand.includes("['CHC','CR','BFI','ES']"),'CR is eligible for the Brand Selection tree');
assert(multiBrand.includes("f==='CR'?'selectorCr':'selector'"),'CR Brand navigation routes to the CR selector');
assert(multiBrand.includes("['selectorCr','CR',fallback.cr]"),'CR fallback establishes CR presentation context');
assert(multiBrand.includes("page==='selectorCr'?'selectorCrFrame':'selectorFrame'"),'CR presentation context targets the CR frame');

assert(productRoutes.includes("['CHC','CR','BFI','ES']"),'product frame lifecycle includes CR');
assert(productRoutes.includes("fam==='CR'?'productCrSelectorFrame'"),'CR uses its own product frame');
assert(productRoutes.includes("if(inlineOpen)closeInline(true)"),'page changes close the prior product curve');

assert(index.includes('id="historySearch"')&&index.includes('Search project, customer, quotation no. or model…'),'Quotation History search UI');
assert(app.includes('function quotationHistorySearchText(q)'),'Quotation History builds searchable record text');
for(const field of ['q?.project','q?.no','quoteDisplayCustomerName(q)','item?.model','item?.productFamily'])assert(app.includes(field),`Quotation History includes ${field}`);
assert(app.includes('searchText.includes(filter.search)'),'Quotation History uses partial case-insensitive filtering');

assert(!read('v394411-product-curve.js').includes('print-system-item-head'),'product-route fix does not alter frozen print markup');
console.log('V4.28.61 release regression: PASS');
