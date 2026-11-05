'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const check=(condition,message)=>{if(!condition)throw new Error(message)};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');

const product=read('kv-product-v50017.js');
const selector=read('selector-kv/index.html');
const owner=read('v40001-product-series-overhaul.js');
const release=JSON.parse(read('RELEASE.json'));

const openStart=product.indexOf('function openCurve(model)');
const openEnd=product.indexOf('function route(model,route)',openStart);
const openCurve=product.slice(openStart,openEnd);
check(openStart>=0&&openEnd>openStart,'KV openCurve function is missing');
check(openCurve.indexOf("post(model,'view',requestId)")<openCurve.indexOf('dialog.showModal()'),'new KV model must be sent before the Curve panel opens');
check(openCurve.includes('clearPinnedModelIdentity(frame)'),'openCurve must clear stale model-only identity');
check(openCurve.includes('frame.dataset.kvCurveRequestId=requestId'),'openCurve must tag the active request');

check(selector.includes("function prepareProductModel(modelName,opts={},requestId='')"),'KV selector must receive the request identity');
check(selector.includes('requestId:productRequestId,model:model.model'),'KV selector must echo the request identity with the confirmed model');
check(selector.includes('model:model.model,base_model:model.model,display_model:displayModel,quotation_model:displayModel'),'KV selector export payload must use the fresh model');

check(owner.includes("freshModel&&f==='KV'"),'stale identity clearing must be scoped to fresh KV models');
check(owner.includes('master=freshModel?(freshMaster||selectorModel||norm(pin.masterModel))'),'fresh model must win over the cached master model');
check(owner.includes('display=freshModel?(freshDisplay||master)'),'fresh display model must win over the cached display model');
check(owner.includes("String(m.requestId||'')!==fr.dataset.kvCurveRequestId"),'late KV responses must be rejected by request identity');
check(owner.includes("low(m.model)!==low(fr.dataset.kvCurveModel)"),'late KV responses must be rejected by model identity');
check(owner.includes('finalizeFrame({freshModel:fresh,eventState:m})'),'confirmed selector state must be supplied to finalization');

const closeStart=owner.indexOf('function closeInline(force=false)');
const closeEnd=owner.indexOf('function forceCloseInline()',closeStart);
const closeInline=owner.slice(closeStart,closeEnd);
check(closeInline.includes('window.scrollTo({top:lastScrollY'),'Back must restore the existing Product scroll position');
check(!closeInline.includes('showPage('),'Back must not navigate to another Product page');

const unchanged={
  'supabase/functions/shared-kv/kv-selector-core.js':'b0615b3af472307d2f1b7ae49b155f106ce6723a2d935306c846387ca1699e0f',
  'pricing.js':'5a69a2b1d0a51f20998ed6904d2448381e12b311dff2a2b784c2e9c3582236f9',
  'selector-cr/index.html':'6c7cf898eb120f035660ca712e56c55b085fb9ae79a5e23943853c3f592c1be7',
  'selector-es/index.html':'e364837454c30cfcddb5c0dc93c7729b09887637189d3114067c530cba3c492c',
  'selector-iso/index.html':'af374025a0899c8d4f0799d88d9073e605fff8aab1c561eb8e1530d9d52ecbc2'
};
for(const [file,expected] of Object.entries(unchanged))check(hash(file)===expected,`${file} changed outside Bug 03 scope`);
check(release.version==='5.00.42'||release.version==='5.00.43','unexpected Bug 03 regression build version');
check(release.new_database_migration_required===false&&release.supabase_data_seed_required===false,'Bug 03 must not require Supabase changes');
console.log('V5.00.42 Bug 03 regression checks passed.');
