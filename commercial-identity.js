/* V5.00.85 corrective R1: commercial identity owns rendering; source data owns engineering/prices. */
(()=>{
 'use strict';
 const n=v=>String(v??'').trim(),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
 const api=()=>window.KeySuiteV40001||window.KeySuiteV391;
 const cleanBrand=v=>/^[-–—]$/.test(n(v))?'':n(v);
 const object=v=>{if(v&&typeof v==='object')return v;try{return JSON.parse(v||'{}')}catch(_){return {}}};
 const withoutDuty=v=>n(v).replace(/\s+(?:--|—)\s+\d.*$/,'');
 function grouped(item){const s=object(item.pricingSource);return n(s.product_family).toUpperCase()==='ASSEMBLY'||Array.isArray(s.assembly_items)||Array.isArray(item.pumpsetData?.bom);}
 function series(ctx={}){
  // brandSeries/mainSellingSeries are navigation labels (e.g. CHC C6), not model prefixes.
  return n(ctx.commercialSeries||ctx.sellingSeries||ctx.masterSeries||ctx.family);
 }
 function alias(text,ctx={}){
  const target=series(ctx),family=n(ctx.family),master=n(ctx.masterSeries);
  let out=String(text??'');if(!target)return out;
  for(const source of new Set([master,family])){
   if(!source||source.toUpperCase()===target.toUpperCase())continue;
   const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   out=out.replace(new RegExp('\\b'+escaped+'(?=\\b|\\d)','gi'),()=>target);
  }
  return out;
 }
 function resolve(ctx={},model=''){
  const sourceModel=n(model||ctx.masterModel),brand=cleanBrand(ctx.name??ctx.brand);
  let commercial=alias(sourceModel,ctx),prefix=series(ctx);
  // A bare model number needs its configured selling prefix once; a named model is complete.
  if(prefix&&/^\d/.test(commercial))commercial=prefix+' '+commercial;
  return {version:3,brandSelection:brand?'named':ctx.name!=null||ctx.brand!=null?'none':'missing',brandId:n(ctx.id||ctx.brandId),brand,series:prefix,model:commercial,
   hydraulic:{series:n(ctx.family),model:sourceModel},pricing:{series:n(ctx.masterSeries||ctx.family),model:n(ctx.masterModel||sourceModel)}};
 }
 function description(text,identity){
  if(!identity)return String(text??'');
  const lines=String(text??'').split('\n'),idx=lines.findIndex(x=>n(x)&&!/^Capacity:/i.test(n(x)));
  if(idx<0)return lines.join('\n');
  let line=lines[idx].trimStart();
  const lead=line.match(/^c\/w(?:\t+| +)/i)?.[0]||'';line=line.slice(lead.length);
  const names=['B.G.Reich',...(api()?.state?.brands||[]).map(x=>cleanBrand(x.brand_name)),identity.sourceBrand,identity.brand].filter(Boolean).sort((a,b)=>b.length-a.length);
  let removed=true;while(removed){removed=false;for(const name of names)if(line.toLowerCase().startsWith(name.toLowerCase()+' ')){line=line.slice(name.length).trimStart();removed=true;break}}
  line=line.replace(/^[-–—]\s+/,'');
  if(identity.model)line=line.replace(/(\bModel:\s*)[^\n]+/i,(_,prefix)=>prefix+identity.model);
  if(identity.model&&!line.toLowerCase().includes(n(identity.model).toLowerCase()))line+=' Model: '+identity.model;
  lines[idx]=lead+(identity.brand?identity.brand+' ':'')+line;return lines.join('\n');
 }
 function forItem(item={},ctx=null){
  if(item.commercialIdentity)return item.commercialIdentity;
  if(grouped(item))return null;
  const p=item.pumpData||item.motorData||item.couplingData||item.tankData||item.keyplcData||item.baseplateData||item.manifoldData||{},s=object(item.pricingSource);
  if(p.commercialIdentity)return p.commercialIdentity;
  const bid=item.brandId||item.brand_id||p.keysuite_selling_brand_id||p.keysuite_brand_id;
  const record=(api()?.state?.brands||[]).find(x=>String(x.id)===String(bid));
  const explicit=own(item,'brand')||own(item,'brandName')||own(p,'keysuite_brand_name')||!!record;
  const family=item.productFamily||s.v391_product_family||s.product_family||p.family||p.product||'';
  if(!ctx&&!explicit){
   const state=api()?.state;
   if(item.manualItem||!family||String(family).toUpperCase().replace(/_G[12]$/,'')!==String(state?.selectedFamily).toUpperCase())return null;
   ctx=api()?.brandContext?.(state.selectedBrandId,family,p.keysuite_material,state.selectedProductGroup);
   if(!ctx)return null;
  }
  const base=ctx||(!explicit||bid?api()?.brandContext?.(bid,family,p.keysuite_material,s.v41413_product_group_code):null)||{};
  // Pricing metadata may describe a shared supplier/master, never the selling identity.
  const name=ctx?.name??(own(item,'brand')?item.brand:own(item,'brandName')?item.brandName:record?.brand_name??p.keysuite_brand_name);
  const declaredBrand=own(item,'brand')||own(item,'brandName');
  const matches=declaredBrand?(api()?.state?.brands||[]).filter(row=>cleanBrand(row.brand_name).toLowerCase()===cleanBrand(name).toLowerCase()):[];
  const matchingBrand=matches.find(row=>String(row.id)===String(bid))||(matches.length===1?matches[0]:null);
  const commercialId=ctx?.id??(declaredBrand?(matchingBrand?.id||(!record?bid:'')||''):(bid||base.id));
  const commercialBase=!ctx&&declaredBrand&&String(commercialId)!==String(bid)?(commercialId&&api()?.brandContext?.(commercialId,family,p.keysuite_material,s.v41413_product_group_code)||{}):base;
  const itemModel=withoutDuty(item.model).replace(/^.*\bModel:\s*/i,'');
  return resolve({...commercialBase,...(explicit?{name}:{}),id:commercialId},p.keysuite_selling_model||p.quotation_model||p.display_model||itemModel||p.model);
 }
 function stamp(item,ctx=null){
  const identity=forItem(item,ctx);if(!identity)return item;
  const model=item.modelManuallyEdited?item.model:identity.model+(n(item.model).slice(withoutDuty(item.model).length));
  return {...item,model,commercialIdentity:identity,brand:identity.brand,brandId:identity.brandId,
   ...(item.bomDescription&&!item.bomManual?{bomDescription:[identity.brand,identity.model].filter(Boolean).join(' ')}:{}),
   ...(item.pumpData?{pumpData:{...item.pumpData,commercialIdentity:identity}}:{}),
   description:item.descriptionManuallyEdited||item.manualItem&&!item.pumpData&&item.description!==item.model?item.description:description(item.description,identity)};
 }
 function captureSelection(payload={},sourceWin=null){
  if(payload.commercialIdentity)return payload;
  const a=api(),state=a?.state||{};
  let pin=null;try{pin=sourceWin?.__KEYSUITE_MODEL_PRESENTATION_CONTEXT}catch(_){}
  const family=payload.family||payload.product||payload.productFamily||state.selectedFamily;
  const sameFamily=!pin?.family||String(pin.family).toUpperCase()===String(family).toUpperCase();
  const sourceModel=withoutDuty(payload.base_model||payload.model),pinnedModel=withoutDuty(pin?.masterModel);
  const sameModel=!pinnedModel||!sourceModel||sourceModel.toUpperCase()===pinnedModel.toUpperCase()||
   alias(sourceModel,pin).toUpperCase()===n(pin?.displayModel).toUpperCase();
  if(!sameFamily||!sameModel)pin=null;
  const group=payload.keysuite_product_group_code||payload.product_group_code||pin?.productGroup||state.selectedProductGroup;
  const listBrand=!sourceWin&&n(state.selectedFamily).toUpperCase()===n(family).toUpperCase()?state.selectedBrandId:null;
  const bid=payload.keysuite_selling_brand_id??(pin&&pinnedModel?pin.id:null)??listBrand??payload.keysuite_brand_id??pin?.id??state.selectedBrandId;
  let ctx=pin&&String(pin.id)===String(bid)&&(!pin.family||String(pin.family).toUpperCase()===String(family).toUpperCase())
   ?pin:a?.brandContext?.(bid,family,payload.keysuite_material,group);
  // A failed lookup must not silently select a pricing/master brand.
  if(!ctx||!bid||String(ctx.id)!==String(bid))return payload;
  // The selected/pinned brand record outranks catalogue keysuite_brand_name.
  const identity=resolve(ctx,payload.keysuite_selling_model||payload.quotation_model||payload.display_model||payload.model);
  identity.hydraulic.model=n(payload.base_model||payload.model);
  identity.pricing.model=n(payload.base_model||payload.model);
  identity.pricing.series=n(payload.keysuite_price_group_code||group||identity.pricing.series);
  identity.sourceId=n(payload.source_id||payload.product_id||payload.es_product_id||payload.id||payload.source);
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
  if(model&&row.dataset.modelManuallyEdited!=='true'&&!payload.modelManuallyEdited&&identity.model){
   const suffix=model.value.slice(withoutDuty(model.value).length);
   model.value=identity.model+suffix;
  }
  if(Object.keys(pump).length)row.dataset.pumpData=JSON.stringify({...pump,commercialIdentity:identity,keysuite_brand_id:identity.brandId,keysuite_brand_name:identity.brand});
  if(row.dataset.descriptionManuallyEdited!=='true'&&!payload.descriptionManuallyEdited&&!(payload.manualItem&&!Object.keys(pump).length&&payload.description!==payload.model))area.value=description(area.value,identity);
 }
 function curveTitle(dialog){
  if(!dialog?.hasAttribute('open'))return '';
  const frame=dialog.querySelector('iframe[data-active="1"]');
  try{const ctx=frame?.contentWindow?.__KEYSUITE_MODEL_PRESENTATION_CONTEXT;return ctx?.displayModel?'Product Curve · '+alias(ctx.displayModel,ctx):''}catch(_){return ''}
 }
 window.KeySuiteCommercialIdentity={series,alias,resolve,description,forItem,stamp,cleanBrand,curveTitle,captureSelection,applyToRow};
})();
