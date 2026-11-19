/* V5.00.81: commercial identity is independent of hydraulic and price sources. */
(()=>{
 'use strict';
 const n=v=>String(v??'').trim(),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
 const api=()=>window.KeySuiteV40001||window.KeySuiteV391;
 const cleanBrand=v=>/^[-–—]$/.test(n(v))?'':n(v);
 function series(ctx={}){
  const family=n(ctx.family),selling=n(ctx.sellingSeries),configured=n(ctx.mainSellingSeries||ctx.brandSeries);
  return selling&&selling.toUpperCase()!==family.toUpperCase()?selling:configured||selling||n(ctx.masterSeries)||family;
 }
 function alias(text,ctx={}){
  const target=series(ctx),family=n(ctx.family),master=n(ctx.masterSeries);
  let out=String(text??'');if(!target)return out;
  for(const source of new Set([master,family])){
   if(!source||source.toUpperCase()===target.toUpperCase())continue;
   const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   out=out.replace(new RegExp('\\b'+escaped+'\\b','gi'),()=>target);
  }
  return out;
 }
 function resolve(ctx={},model=''){
  const sourceModel=n(model||ctx.masterModel),brand=cleanBrand(ctx.name??ctx.brand);
  return {version:1,brandId:n(ctx.id||ctx.brandId),brand,series:series(ctx),model:alias(sourceModel,ctx),
   hydraulic:{series:n(ctx.family),model:sourceModel},pricing:{series:n(ctx.masterSeries||ctx.family),model:n(ctx.masterModel||sourceModel)}};
 }
 function description(text,identity){
  if(!identity)return String(text??'');
  const lines=String(text??'').split('\n'),idx=lines.findIndex(x=>n(x)&&!/^Capacity:/i.test(n(x)));
  if(idx<0)return lines.join('\n');
  let line=lines[idx].trimStart();
  const names=[...(api()?.state?.brands||[]).map(x=>cleanBrand(x.brand_name)),identity.brand].filter(Boolean).sort((a,b)=>b.length-a.length);
  for(const name of names)if(line.toLowerCase().startsWith(name.toLowerCase()+' ')){line=line.slice(name.length).trimStart();break}
  line=line.replace(/^[-–—]\s+/,'');
  if(identity.model)line=line.replace(/(Pump Model:\s*)[^\n]+/i,(_,prefix)=>prefix+identity.model);
  lines[idx]=(identity.brand?identity.brand+' ':'')+line;return lines.join('\n');
 }
 function forItem(item={},ctx=null){
  if(item.commercialIdentity)return item.commercialIdentity;
  const p=item.pumpData||{},s=item.pricingSource||{};
  const bid=item.brandId||item.brand_id||p.keysuite_brand_id||s.v391_brand_id;
  const record=(api()?.state?.brands||[]).find(x=>String(x.id)===String(bid));
  const explicit=own(item,'brand')||own(item,'brandName')||own(p,'keysuite_brand_name')||!!record;
  const family=item.productFamily||s.v391_product_family||s.product_family||p.family||p.product||'';
  if(!ctx&&!explicit){
   const state=api()?.state;
   if(item.manualItem||!family||String(family).toUpperCase()!==String(state?.selectedFamily).toUpperCase())return null;
   ctx=api()?.brandContext?.(state.selectedBrandId,family,p.keysuite_material,state.selectedProductGroup);
   if(!ctx)return null;
  }
  const base=ctx||api()?.brandContext?.(bid,family,p.keysuite_material,s.v41413_product_group_code)||{};
  return resolve({...base,...(explicit?{name:item.brand??item.brandName??record?.brand_name??p.keysuite_brand_name}:{}),id:bid||base.id},item.model||p.quotation_model||p.model);
 }
 function stamp(item,ctx=null){
  const identity=forItem(item,ctx);if(!identity)return item;
  return {...item,commercialIdentity:identity,description:description(item.description,identity)};
 }
 function curveTitle(dialog){
  if(!dialog?.hasAttribute('open'))return '';
  const frame=dialog.querySelector('iframe[data-active="1"]');
  try{const ctx=frame?.contentWindow?.__KEYSUITE_MODEL_PRESENTATION_CONTEXT;return ctx?.displayModel?'Product Curve · '+alias(ctx.displayModel,ctx):''}catch(_){return ''}
 }
 window.KeySuiteCommercialIdentity={series,alias,resolve,description,forItem,stamp,cleanBrand,curveTitle};
})();
