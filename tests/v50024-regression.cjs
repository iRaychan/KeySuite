const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');

const cr=read('selector-cr/index.html');
const kv=read('selector-kv/index.html');
const es=read('selector-es/index.html');
const index=read('index.html');
const release=JSON.parse(read('RELEASE.json'));

assert.equal(sha('selector-cr/index.html'),'224594e1ef5f5ecfcede14f332f82fcd60a2bce8bd9fa847ccfcf5aacf330898','CR MASTER changed');
assert.equal(sha('selector-es/index.html'),'93230b96c5ba91b6bbb920d6851281183b6ad9dfd4c925206379eb7974284dbf','ES MASTER changed');
assert(cr.length>2_800_000&&es.length>100_000);

const frame=source=>source.slice(source.indexOf('<body>'),source.indexOf('<script src="../supabase/functions/shared-'));
const normalize=source=>source
  .replace(/[A-Za-z0-9+/]{1000,}={0,2}/g,'[ENCODED-PAYLOAD]')
  .replace(/261029-V1\.0/g,'261003-V1.0')
  .replace(/5\.00\.24/g,'4.28.72')
  .replace(/keykv/g,'keycr')
  .replace(/Kv/g,'Cr')
  .replace(/KV/g,'CR');
assert.equal(normalize(frame(kv)),normalize(frame(cr)),'KV pre-script DOM must remain the CR MASTER DOM after family/data normalization');

for(const token of ['Multiple Duty Points','Operating Speed','Motor Efficiency','Motor Phase','Motor Voltage','Display Settings','Parallel Curves','System Curve','Operating Point','BEP','Variable Curve','After-orifice Curve','PDF Page 1','Orifice','Most Suitable ranking','Alternative Models']){
  assert(kv.includes(token),`KV is missing CR MASTER feature: ${token}`);
}
for(const id of ['enhancedMode','addDutyPoint','speedInput','motorEff','motorPhase','motorVoltage','parallel2','showSystem','showOperating','showBep','showVariableCurve','showOrifice','pdfFollowScreen','orificeDiameter','orificeK','alternativesCard']){
  assert(new RegExp(`id=["']${id}["']`).test(kv),`KV is missing CR MASTER control: ${id}`);
}
assert.match(kv,/shared-kv\/kv-data\.js\?v=50024/);
assert.match(kv,/shared-kv\/kv-selector-core\.js\?v=50024/);
assert.match(kv,/shutoff_power_kw/);
assert.match(kv,/kW at Q=0/);
assert.doesNotMatch(kv,/shared-cr\/cr-(?:data|selector-core)/);
for(const asset of ['favicon.png','apple-touch-icon.png','bgreich-logo.png']){
  assert.equal(sha(`selector-kv/${asset}`),sha(`selector-cr/${asset}`),`KV CR-MASTER asset mismatch: ${asset}`);
}

require(path.join(root,'supabase/functions/shared-kv/kv-data.js'));
require(path.join(root,'supabase/functions/shared-kv/kv-selector-core.js'));
const db=global.KeySuiteKVData,core=global.KeySuiteKVCore;
assert.equal(db.models.length,39);
assert.deepEqual([...new Set(db.models.map(model=>model.series))],['KV 1']);
assert.deepEqual(Object.keys(db.curves),['KV 1']);
assert.equal(typeof core.mostSuitableCompare,'function');
for(const model of db.models){
  assert(model.model&&model.motor_kw>0&&model.motor_hp>0&&model.dimensions,'incomplete KV model exposed');
  const evaluated=core.evaluateModel(db,model,0,0,50);
  assert(evaluated,`KV model cannot be evaluated at Q=0: ${model.model}`);
  const shutoff=db.curves[model.series].shutoff_power_per_impeller_kw;
  const expected=model.fullImpellers*Number(shutoff.full||0)+model.smallImpellers*Number(shutoff.medium||0)+model.smallestImpellers*Number(shutoff.small||0);
  assert(Math.abs(evaluated.shutoff_power_kw-expected)<1e-12,`Q=0 power lost for ${model.model}`);
  assert(Math.abs(core.fitValue(evaluated.powerFit,0)-expected)<1e-12,`Q=0 power curve lost for ${model.model}`);
}

assert.match(index,/selector-kv\/index\.html\?v=50024&amp;ks-visible=1&amp;ks-layout=42872&amp;ks-frame=KV/);
assert.match(index,/selector-kv\/index\.html\?product=1&amp;v=50024/);
assert.match(index,/v50024-version-lock\.js\?v=50024/);
assert.equal(release.version,'5.00.24');
assert.equal(release.baseline,'5.00.23');
assert.equal(release.frozen_quotation_pdf_version,'1.08');
console.log('PASS V5.00.24 KV CR-MASTER parity, KV data, Q=0 power and master protection');
