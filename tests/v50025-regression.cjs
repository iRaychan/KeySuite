const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');

const cr=read('selector-cr/index.html');
const kv=read('selector-kv/index.html');
const es=read('selector-es/index.html');
const index=read('index.html');
const responsive=read('v42872-selector-first-open.js');
const productOwner=read('v40001-product-series-overhaul.js');
const release=JSON.parse(read('RELEASE.json'));

// Locked masters and quotation layout remain byte-identical.
assert.equal(sha('selector-cr/index.html'),'224594e1ef5f5ecfcede14f332f82fcd60a2bce8bd9fa847ccfcf5aacf330898','CR MASTER changed');
assert.equal(sha('selector-es/index.html'),'93230b96c5ba91b6bbb920d6851281183b6ad9dfd4c925206379eb7974284dbf','ES MASTER changed');
const printMarkup=index.slice(index.indexOf('<div id="printQuotationDocument"'),index.indexOf('<script src="config.js">'));
assert.equal(crypto.createHash('sha256').update(printMarkup).digest('hex'),'44641a3b87ec90cdfd342eaacf65f5b90dbde6f313df5269a76de431b34955ba');

// KV keeps the CR MASTER pre-script DOM and applicable controls.
const frame=source=>source.slice(source.indexOf('<body>'),source.indexOf('<script src="../supabase/functions/shared-'));
const normalize=source=>source
  .replace(/[A-Za-z0-9+/]{1000,}={0,2}/g,'[ENCODED-PAYLOAD]')
  .replace(/261029-V1\.0/g,'261003-V1.0')
  .replace(/5\.00\.25/g,'4.28.72')
  .replace(/keykv/g,'keycr').replace(/Kv/g,'Cr').replace(/KV/g,'CR');
assert.equal(normalize(frame(kv)),normalize(frame(cr)),'KV pre-script DOM diverged from CR MASTER');
for(const token of ['Multiple Duty Points','Operating Speed','Motor Efficiency','Motor Phase','Motor Voltage','Display Settings','Parallel Curves','System Curve','Operating Point','BEP','Variable Curve','After-orifice Curve','PDF Page 1','Orifice','Most Suitable ranking','Alternative Models'])assert(kv.includes(token),`KV missing CR MASTER feature: ${token}`);

// Issue 001: KV is handled by the same V4.28.72 native-width lifecycle as CR.
assert.match(responsive,/selectorKv:\{frameId:'selectorKvFrame',readyEvent:'KEYSUITE_KV_VIEWPORT_READY',frameKey:'KV'\}/);
assert.match(responsive,/sequences=\{selector:0,selectorCr:0,selectorKv:0\}/);
assert.match(index,/selector-kv\/index\.html\?v=50025&amp;ks-visible=1&amp;ks-layout=42872&amp;ks-frame=KV/);

// Issues 003 and KV data invariants.
global.window=global;
require(path.join(root,'supabase/functions/shared-kv/kv-data.js'));
require(path.join(root,'supabase/functions/shared-kv/kv-selector-core.js'));
const db=global.KeySuiteKVData,core=global.KeySuiteKVCore;
assert.equal(db.models.length,39);
assert.deepEqual([...new Set(db.models.map(model=>model.series))],['KV 1']);
assert.deepEqual(Object.keys(db.curves),['KV 1']);
const model=db.models.find(row=>row.model==='KV 1-50');
assert(model,'KV 1-50 lookup failed');
const evaluated=core.evaluateModel(db,model,.2,0,50);
assert(evaluated,'KV 1-50 curve evaluation failed');
assert.equal(evaluated.headFit.order,2);
assert.equal(evaluated.effFit.order,5);
assert.equal(evaluated.npshFit.order,3);
assert.equal(evaluated.powerFit.order,3);
assert.equal(evaluated.headFit.polynomialOnly,true);
const sourceHead=evaluated.headFit.pts.find(point=>Math.abs(point.x-.2)<1e-9).y;
assert.notEqual(core.fitValue(evaluated.headFit,.2),sourceHead,'Head exact-source override still active');
const sourceEff=evaluated.effFit.pts.find(point=>Math.abs(point.x-.2)<1e-9).y;
assert.equal(core.fitValue(evaluated.effFit,.2),sourceEff,'Efficiency exact-source behavior changed');
const atZero=core.evaluateModel(db,db.models[0],0,0,50);
assert.equal(core.fitValue(atZero.powerFit,0),atZero.shutoff_power_kw,'Q=0 Power exact-source behavior changed');
assert.match(kv,/for\(let i=0;i<=220;i\+\+\)/,'main Head render is not 221 samples');

// Issue 004: the shared owner now consumes KV ready/state messages and can clear loading.
assert.match(productOwner,/\['CHC','CR','KV','BFI','ES','ISO'\]\.map\(f=>\[f,frameFor\(f\)\]\)/);
assert.match(productOwner,/KEYSUITE_PRODUCT_CURVE_STATE/);
assert.match(index,/selector-kv\/index\.html\?product=1&amp;v=50025/);

assert.equal(release.version,'5.00.25');
assert.equal(release.baseline,'5.00.24');
assert.equal(release.new_database_migration_required,false);
assert.equal(release.frozen_quotation_pdf_version,'1.08');
assert.equal(read('VERSION.txt').trim(),'5.00.25');
assert.match(index,/v50025-version-lock\.js\?v=50025/);
console.log('PASS V5.00.25 KV fixes 001-004 and master protection');
