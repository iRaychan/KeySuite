/* V5.00.84: capture commercial identity before routing; preserve it through row writes. */
(()=>{
 'use strict';
 const n=v=>String(v??'').trim(),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
 const api=()=>window.KeySuiteV40001||window.KeySuiteV391;
 const cleanBrand=v=>/^[-–—]$/.test(n(v))?'':n(v);
 const object=v=>{if(v&&typeof v==='object')return v;try{return JSON.parse(v||'{}')}catch(_){return {}}};
 const withoutDuty=v=>n(v).replace(/\s+(?:--|—)\s+\d.*$/,'');
 function grouped(item){const s=object(item.pricingSource);return n(s.product_family).toUpperCase()==='ASSEMBLY'||Array.isArray(s.assembly_items)||Array.isArray(item.pumpsetData?.bom);}
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
  const names=[...(api()?.state?.brands||[]).map(x=>cleanBrand(x.brand_name)),identity.sourceBrand,identity.brand].filter(Boolean).sort((a,b)=>b.length-a.length);
  let removed=true;while(removed){removed=false;for(const name of names)if(line.toLowerCase().startsWith(name.toLowerCase()+' ')){line=line.slice(name.length).trimStart();removed=true;break}}
  line=line.replace(/^[-–—]\s+/,'');
  if(identity.model)line=line.replace(/(Pump Model:\s*)[^\n]+/i,(_,prefix)=>prefix+identity.model);
  lines[idx]=(identity.brand?identity.brand+' ':'')+line;return lines.join('\n');
 }
 function forItem(item={},ctx=null){
  if(item.commercialIdentity)return item.commercialIdentity;
  if(grouped(item))return null;
  const p=item.pumpData||{},s=object(item.pricingSource);
  if(p.commercialIdentity)return p.commercialIdentity;
  const bid=item.brandId||item.brand_id||p.keysuite_brand_id||s.v391_brand_id;
  const record=(api()?.state?.brands||[]).find(x=>String(x.id)===String(bid));
  const explicit=own(item,'brand')||own(item,'brandName')||own(p,'keysuite_brand_name')||own(s,'v391_brand_name')||!!record;
  const family=item.productFamily||s.v391_product_family||s.product_family||p.family||p.product||'';
  if(!ctx&&!explicit){
   const state=api()?.state;
   if(item.manualItem||!family||String(family).toUpperCase()!==String(state?.selectedFamily).toUpperCase())return null;
   ctx=api()?.brandContext?.(state.selectedBrandId,family,p.keysuite_material,state.selectedProductGroup);
   if(!ctx)return null;
  }
  const base=ctx||(!explicit||bid?api()?.brandContext?.(bid,family,p.keysuite_material,s.v41413_product_group_code):null)||{};
  const name=own(item,'brand')?item.brand:own(item,'brandName')?item.brandName:record?.brand_name??p.keysuite_brand_name??s.v391_brand_name;
  return resolve({...base,...(explicit?{name}:{}),id:bid||base.id},p.quotation_model||p.display_model||withoutDuty(item.model)||p.model);
 }
 function stamp(item,ctx=null){
  const identity=forItem(item,ctx);if(!identity)return item;
  return {...item,commercialIdentity:identity,brand:identity.brand,brandId:identity.brandId,
   ...(item.pumpData?{pumpData:{...item.pumpData,commercialIdentity:identity}}:{}),
   description:item.descriptionManuallyEdited?item.description:description(item.description,identity)};
 }
 function captureSelection(payload={},sourceWin=null){
  if(payload.commercialIdentity)return payload;
  const a=api(),state=a?.state||{};
  let pin=null;try{pin=sourceWin?.__KEYSUITE_MODEL_PRESENTATION_CONTEXT}catch(_){}
  const family=payload.family||payload.product||payload.productFamily||state.selectedFamily;
  const group=payload.keysuite_product_group_code||payload.product_group_code||state.selectedProductGroup;
  const bid=payload.keysuite_brand_id??pin?.id??state.selectedBrandId;
  let ctx=pin||a?.brandContext?.(bid,family,payload.keysuite_material,group);
  // A failed lookup must not silently select a pricing/master brand.
  if(!ctx||!bid||String(ctx.id)!==String(bid))return payload;
  if(own(payload,'keysuite_brand_name'))ctx={...ctx,name:payload.keysuite_brand_name};
  const identity=resolve(ctx,payload.quotation_model||payload.display_model||payload.model);
  return {...payload,commercialIdentity:identity,keysuite_brand_id:identity.brandId,keysuite_brand_name:identity.brand};
 }
 function applyToRow(row){
  if(!row)return;
  const payload=object(row.dataset.quoteItemPayload),pump=object(row.dataset.pumpData),source=object(row.dataset.pricingSource);
  if(grouped({...payload,pricingSource:source}))return;
  if(row.dataset.restoredQuotationItem==='true'&&!payload.commercialIdentity&&!pump.commercialIdentity)return;
  const model=row.querySelector('.item-model'),area=row.querySelector('.item-description');if(!area)return;
  const identity=forItem({...payload,pumpData:pump,pricingSource:source,model:model?.value});if(!identity)return;
  row.dataset.quoteItemPayload=JSON.stringify({...payload,commercialIdentity:identity,brandId:identity.brandId,brand:identity.brand});
  row.dataset.v391BrandId=identity.brandId||'';row.dataset.v391BrandName=identity.brand;
  row.dataset.itemBrands=JSON.stringify(identity.brand?[identity.brand]:[]);
  if(Object.keys(pump).length)row.dataset.pumpData=JSON.stringify({...pump,commercialIdentity:identity,keysuite_brand_id:identity.brandId,keysuite_brand_name:identity.brand});
  if(row.dataset.descriptionManuallyEdited!=='true'&&!payload.descriptionManuallyEdited)area.value=description(area.value,identity);
 }
 function curveTitle(dialog){
  if(!dialog?.hasAttribute('open'))return '';
  const frame=dialog.querySelector('iframe[data-active="1"]');
  try{const ctx=frame?.contentWindow?.__KEYSUITE_MODEL_PRESENTATION_CONTEXT;return ctx?.displayModel?'Product Curve · '+alias(ctx.displayModel,ctx):''}catch(_){return ''}
 }
 window.KeySuiteCommercialIdentity={series,alias,resolve,description,forItem,stamp,cleanBrand,curveTitle,captureSelection,applyToRow};
})();
