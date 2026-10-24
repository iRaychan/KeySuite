(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const db=()=>window.KeySuiteCRData||{models:[],curves:{}};
  let selectedSeries='',frameReady=false,queued=null;

  const seriesNumber=value=>Number((String(value||'').match(/CR\s+(\d+)/i)||[])[1]||9999);
  const seriesList=()=>[...new Set(db().models.map(row=>row.series))].sort((a,b)=>seriesNumber(a)-seriesNumber(b));
  function options(){return {material:$('crProductMaterial')?.value||'CR',seal:$('crProductSeal')?.value||'Car / Sic',elastomer:$('crProductElastomer')?.value||'Viton',connection:$('crProductConnection')?.value||'round',bare:!!$('crProductBareShaft')?.checked,hz:50}}
  function displayModel(model,material){return String(model||'').replace(/^CR\b/i,String(material||'CR').toUpperCase())}
  function rowFor(model){return db().models.find(row=>String(row.model).toLowerCase()===String(model||'').replace(/^CR[SN]\b/i,'CR').toLowerCase())||null}
  function payloadFor(model){
    const row=rowFor(model);if(!row)return null;const opts=options(),shown=displayModel(row.model,opts.material);
    return {source:'KeySuite-CR-Product-V4.28.72',family:'CR',product:'CR',model:shown,base_model:row.model,display_model:shown,quotation_model:shown,series:row.series,stages:Number(row.stages||1),connection:String(row.connection||''),motor_kw:Number(row.motor_kw||0),motor_hp:Number(row.motor_hp||0),speed_rpm:Number(db().curves?.[row.series]?.speed_rpm||2900),pole:2,frequency_hz:50,motor_efficiency_class:'IE3',motor_phase:'3Ph',motor_voltage:415,product_mode:true,keysuite_product_group_code:'CR',keysuite_price_group_code:'CR',keysuite_material:opts.material,keysuite_seal:opts.seal,keysuite_elastomer:opts.elastomer,keysuite_connection_type:opts.connection,keysuite_bare_shaft:opts.bare,keysuite_supply_mode:opts.bare?'BARE':'COMPLETE',keysuite_dimension_override:row.dimensions||null};
  }
  function ensureFrame(){const frame=$('productCrSelectorFrame');if(frame&&frame.getAttribute('src')==='about:blank'){frameReady=false;frame.src=frame.dataset.src||'selector-cr/product.html?product=1&v=42872'}return frame}
  function post(model,action='view'){const frame=ensureFrame();if(!frame)return;const message={type:'KEYSUITE_PRODUCT_MODEL',model:String(model||'').replace(/^CR[SN]\b/i,'CR'),action,options:options()};if(frameReady){queued=null;frame.contentWindow.postMessage(message,'*')}else queued=message}
  function route(model,route){const payload=typeof model==='object'?model:payloadFor(model);if(!payload)return;routeSelection(payload,route)}
  function openCurve(model){const curve=window.KeySuiteV394411ProductCurve||window.KeySuiteV394410ProductCurve;if(curve&&typeof curve.open==='function'&&curve.open('CR',model,'CR')!==false)return;const frame=ensureFrame(),host=$('productCurveHost');if(!frame||!host)return;if(frame.parentNode!==host)host.appendChild(frame);frame.style.display='block';$('productCurveTitle').textContent=displayModel(model,options().material);$('productCurveDialog').showModal();post(model,'view')}

  function renderSeries(){const rows=seriesList();if(!selectedSeries||!rows.includes(selectedSeries))selectedSeries=rows[0]||'';const host=$('crProductSeriesList');if(!host)return;host.innerHTML=rows.map(name=>`<button type="button" class="product-series-button ${name===selectedSeries?'active':''}" data-cr-series="${esc(name)}">${esc(name)}</button>`).join('');host.querySelectorAll('[data-cr-series]').forEach(button=>button.onclick=()=>{selectedSeries=button.dataset.crSeries;renderSeries();renderModels()})}
  function renderModels(){const input=$('crProductModelInput'),query=String(input?.value||'').trim().toLowerCase();let rows=db().models.filter(row=>row.series===selectedSeries);if(query)rows=rows.filter(row=>String(row.model).toLowerCase().includes(query));$('crProductSeriesTitle').textContent=selectedSeries||'CR Models';$('crProductModelCount').textContent=`${rows.length} model${rows.length===1?'':'s'}`;const host=$('crProductModelGrid');host.innerHTML=rows.length?rows.map(row=>`<div class="product-model-row"><h3>${esc(displayModel(row.model,options().material))}</h3><div class="product-model-actions"><button class="btn secondary product-action-button" type="button" data-cr-curve="${esc(row.model)}">Curve</button><button class="btn action-assembly product-action-button" type="button" data-cr-assembly="${esc(row.model)}">Assembly</button><button class="btn action-quote product-action-button" type="button" data-cr-quote="${esc(row.model)}">Quote</button></div></div>`).join(''):'<div class="product-empty">No matching CR models.</div>';host.querySelectorAll('[data-cr-curve]').forEach(button=>button.onclick=()=>openCurve(button.dataset.crCurve));host.querySelectorAll('[data-cr-assembly]').forEach(button=>button.onclick=()=>route(button.dataset.crAssembly,'assembly'));host.querySelectorAll('[data-cr-quote]').forEach(button=>button.onclick=()=>route(button.dataset.crQuote,'quotation'))}
  function render(){const list=$('crProductModelOptions');if(!list)return;list.innerHTML=db().models.map(row=>`<option value="${esc(row.model)}"></option>`).join('');renderSeries();renderModels()}

  function routeSelection(payload,route='quotation'){
    if(!window.KeySuiteApp?.ensureQuotationPricingContext?.(`add a CR pump to the ${route==='assembly'?'Assembly':'quotation'}`))return;
    const material=String(payload.keysuite_material||options().material||'CR').toUpperCase(),base=String(payload.base_model||payload.model||'').replace(/^CR[SN]\b/i,'CR'),model=displayModel(base,material),bare=payload.keysuite_bare_shaft===true||payload.keysuite_supply_mode==='BARE';
    const found=window.KeySuitePricing?.findCrPrice?.(model,{...payload,material,seal:payload.keysuite_seal||options().seal,elastomer:payload.keysuite_elastomer||options().elastomer,bareShaft:bare,pricingMode:route==='assembly'?'assembly':'quotation'});
    if(!found){alert(`CR price not found: ${model}. The engineering selector remains available, but this model/material has no active CR price record.`);return}
    if(route!=='assembly'&&!window.KeySuitePricing?.ensureQuoteableCalculation?.(found.calc,model))return;
    const seal=payload.keysuite_seal||options().seal,elastomer=payload.keysuite_elastomer||options().elastomer,description=[`B.G.Reich Vertical Multistage Pump Model: ${model}`,bare?'(Bare shaft pump only)':`c/w\t${payload.motor_hp||found.product?.motor_hp||'-'}HP 2Pole ${payload.motor_efficiency_class||'IE3'} Motor (415V / 3Ph / 50Hz)`,`Suction & Discharge: ${payload.connection||found.product?.connection||'-'}`,`Material: ${material} / ${window.KeySuitePricing?.chcSealDescription?.(seal,elastomer)||'Mechanical Seal'}`].join('\n');
    const item={model,description,qty:1,unitPrice:Number(found.calc.finalPrice||0),pricingSource:window.KeySuitePricing.sourceSnapshot(found),productFamily:'CR',pumpData:{...payload,base_model:base,quotation_model:model,display_model:model,keysuite_material:material,keysuite_bare_shaft:bare}};
    if(route==='assembly'){item.assemblyLevel=bare?'PUMPSET_COMPONENT':'COMPLETE_PUMPSET';item.assemblySection=bare?'pump':'pumpset';window.KeySuiteAssembly?.addItem?.(item);return}
    const row=window.KeySuiteApp?.addExternalQuoteItem?.(item);if(row)window.KeySuiteApp.showPage('quotation');
  }

  function pageShown(id){if(id==='productCr')render()}
  window.addEventListener('message',event=>{const frame=$('productCrSelectorFrame'),message=event.data||{};if(event.source!==frame?.contentWindow)return;if(message.type==='KEYSUITE_PRODUCT_FRAME_READY'){frameReady=true;if(queued){const next=queued;queued=null;frame.contentWindow.postMessage(next,'*')}}});
  document.addEventListener('input',event=>{if(event.target?.id==='crProductModelInput')renderModels()});
  document.addEventListener('change',event=>{if(['crProductMaterial','crProductSeal','crProductElastomer','crProductConnection','crProductBareShaft'].includes(event.target?.id)){renderModels();const frame=$('productCrSelectorFrame');if(frameReady&&frame?.contentWindow&&frame.closest('#productCurveHost'))post(String($('productCurveTitle')?.textContent||''),'view')}});
  window.KeySuiteCRProduct={version:'4.28.72',render,pageShown,payloadFor,routeSelection};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
