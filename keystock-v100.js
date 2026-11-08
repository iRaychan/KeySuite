/* KeyStock V1.01: catalogue references, configurable options and opening balances only. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto.randomUUID(), sort=(a,b)=>(a.sort_order-b.sort_order)||String(a.id).localeCompare(String(b.id));
  let state=null, tab='check', selected='', family='', query='', location='', busy=false, request=0, entryId=uid(), correction=null;
  const pages={
    check:['Stock Check','M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
    missing:['Missing Parts','M12 3l9 5v8l-9 5-9-5V8l9-5Zm0 5v5m0 3v.1'],
    reservations:['Reservations','M6 4h12v16l-6-4-6 4z'],
    movement:['Stock Movement','M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4'],
    history:['Stock History','M3 12a9 9 0 1 0 3-7M3 3v5h5m4-2v6l4 2'],
    receive:['Add Stock','M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0 8 4 8-4m-8 4v10'],
    dropdowns:['Dropdown Management','M3 4h18v3l-7 7v6l-4-2v-4L3 7z']
  };
  const navIcon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
  const locationLabel=id=>state.locations.find(l=>l.id===id)?.label||'Not Assigned';
  let stockFilter=emptyStockFilter();
  let historyFilter=emptyHistoryFilter();
  let movementFilter={period:'30',from:'',to:'',open:false};
  let dropdownFilter=['','','',''];
  let missingFilter={model:'',series:'',component:''};
  let newestFirst=false;
  function emptyStockFilter(){return {location:'',supplier:'',serial:'',open:false};}
  function emptyHistoryFilter(){return {model:'',serial:'',period:'all',from:'',to:'',open:false};}
  const ledger=()=>state?.ledger;
  const ledgerCap=key=>state?.ledger_permissions?.[key]===true;
  const canDropdowns=()=>ledger()?ledgerCap('manage_stock_dropdowns'):state.can_manage;
  let actionContext=null;
  const caps = key => state?.permissions?.[key] === true;
  const mayEdit = () => ['add_stock_model','edit_stock_model','delete_stock_model'].some(caps);
  const natural = new Intl.Collator('en',{numeric:true,sensitivity:'base'});
  const rating = i => {
    if (i.family.toUpperCase() !== 'MOTOR') return null;
    const explicit = i.model.match(/(\d+(?:\.\d+)?)\s*(kW|HP)\b/i);
    const model = i.model.match(/^\d?BM(\d+(?:\.\d+)?)-/i);
    const value = explicit?.[1] ?? i.rating ?? model?.[1];
    return value == null || value === '' || !Number.isFinite(Number(value))
      ? null : {value:Number(value),unit:(explicit?.[2] || i.rating_unit || 'HP').toUpperCase()};
  };
  function modelCompare(a,b) {
    const order = natural.compare(a.brand,b.brand) || natural.compare(a.family,b.family);
    if (order) return order;
    const x=rating(a), y=rating(b);
    if (x && y) {
      const motorOrder=natural.compare(x.unit,y.unit) || x.value-y.value;
      if (motorOrder) return motorOrder;
    } else if (x || y) return x ? -1 : 1;
    return natural.compare(a.model,b.model) || natural.compare(a.key,b.key);
  }
  let authContext=0;
  let editMode=false, editKey='', status='';
  const trail=[];
  const expanded=new Set();
  const scrollRoot=()=>document.querySelector('main');
  function moveTo(next,key) {
    if (next===tab && (!key || key===selected)) return;
    trail.push({tab,selected,family,query,location,status,scroll:scrollRoot()?.scrollTop||0,y:window.scrollY});
    if (trail.length>40) trail.shift();
    tab=next;
    if(key){selected=key;if(next!=='detail'){family=item().family;query='';}}
    correction=null;
    entryId=uid();
    render();
    scrollRoot()?.scrollTo(0,0);
    window.scrollTo(0,0);
  }
  function back() {
    const prev=trail.pop();
    if(!prev)return false;
    ({tab,selected,family,query,location,status}=prev);
    correction=null;entryId=uid();render();
    requestAnimationFrame(()=>{scrollRoot()?.scrollTo(0,prev.scroll);window.scrollTo(0,prev.y);});
    return true;
  }
  // A release, focus loss or pointer cancellation cancels the gesture. Keyboard Space also works.
  function hold(button, seconds, callback) {
    button.cancelStockHold?.();
    button.stockHoldEvents?.abort();
    const events=button.stockHoldEvents=new AbortController();
    let timer, started;
    const label=button.textContent;
    function cancel(){clearTimeout(timer);timer=undefined;button.textContent=label;}
    button.cancelStockHold=cancel;
    function start(){
      if(timer || button.disabled || busy)return;
      started=performance.now();
      const tick=()=>{
        const left=seconds-(performance.now()-started)/1000;
        if(left<=0){cancel();callback();return;}
        button.textContent=`Hold ${Math.ceil(left)}s`;
        timer=setTimeout(tick,80);
      };
      tick();
    }
    button.onpointerdown=e=>{
      if(e.button!==0)return;
      button.setPointerCapture(e.pointerId);
      start();
    };
    for(const event of ['pointerup','pointercancel','lostpointercapture','blur']) button.addEventListener(event,cancel,{signal:events.signal});
    button.onkeydown=e=>{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();if(!e.repeat)start();}};
    button.onkeyup=cancel;
    button.oncontextmenu=e=>e.preventDefault();
    button.onclick=e=>e.preventDefault();
  }
  function refOptions(type,value='',includeRetired=false) {
    return state[type+'s'].filter(r=>includeRetired||!r.retired||r.id===value)
      .sort((a,b)=>natural.compare(a.label,b.label))
      .map(r=>`<option value="${r.id}" ${r.id===value?'selected':''}>${esc(r.label)}${r.retired?' (retired)':''}</option>`).join('');
  }
  function inlineReference(type,value='') {
    const label=type==='location'?'Location':'Supplier (optional)';
    const empty=type==='location'?'Not Assigned':'None';
    return `<div class="stock-ref"><label>${label}<select name="${type}_id"><option value="">${empty}</option>${refOptions(type,value)}</select></label>
      ${caps('manage_stock_'+type+'s')?`<button type="button" class="btn secondary" data-inline-ref="${type}" aria-label="Add ${type}">+ Add</button>`:''}</div>`;
  }
  function bindInlineReferences(form) {
    form.querySelectorAll('[data-inline-ref]').forEach(button=>button.onclick=async()=>{
      if(busy)return;
      const type=button.dataset.inlineRef, label=window.prompt(type==='location'?'New location code':'New supplier name')?.trim();
      if(!label)return;
      busy=true;button.disabled=true;
      const id=uid(), snapshot=state, token=request;
      try {
        await rpc(type,{id,label});
        if(token!==request||state!==snapshot)return;
        state[type+'s'].push({id,label,retired:false});
        const select=form.elements[type+'_id'];
        select.innerHTML=`<option value="">${type==='location'?'Not Assigned':'None'}</option>`+refOptions(type,id);
        message(`${label} added and selected.`);
      } catch(e){message(e.message,true);}
      finally{busy=false;button.disabled=false;}
    });
  }
  function manageReferences(type) {
    if(!caps('manage_stock_'+type+'s'))return '';
    const label=type==='location'?'Locations':'Suppliers';
    return `<details><summary>Manage stock ${label.toLowerCase()}</summary>
      <form class="stock-tools" data-ref-form="${type}">
        <label>${type==='location'?'Location code':'Supplier name'}<input name="label" required></label>
        <button class="btn">Add ${type}</button>
      </form>
      <ul class="stock-ref-list">${state[type+'s'].map(r=>`<li>${esc(r.label)}${r.retired?' (retired)':''}
        <button class="btn secondary" data-ref-type="${type}" data-rename-ref="${r.id}">Rename</button>
        <button class="btn secondary" data-ref-type="${type}" data-retire-ref="${r.id}">${r.retired?'Restore':'Retire'}</button></li>`).join('')}</ul>
    </details>`;
  }
  function bindReferences() {
    const root=$('stockContent');
    root.querySelectorAll('[data-ref-form]').forEach(f=>f.onsubmit=e=>{
      e.preventDefault();
      save(f.dataset.refForm,{id:uid(),label:new FormData(f).get('label')});
    });
    root.querySelectorAll('[data-rename-ref],[data-retire-ref]').forEach(b=>b.onclick=()=>{
      const type=b.dataset.refType, r=state[type+'s'].find(r=>r.id===(b.dataset.renameRef||b.dataset.retireRef));
      if(!r)return;
      if(b.dataset.renameRef){
        const label=window.prompt('New name or code',r.label)?.trim();
        if(label)save(type,{id:r.id,label,retired:r.retired});
      } else if(window.confirm(`${r.retired?'Restore':'Retire'} ${r.label}?`)){
        save(type,{id:r.id,label:r.label,retired:!r.retired});
      }
    });
  }
  function targetPicker(mapping) {
    return `<details class="stock-copy" data-copy-mode="${mapping?'mappings':'setup'}">
      <summary>${mapping?'Copy Pricelist Mappings':'Copy Setup / Apply Setup to Selected Models'}</summary>
      <p>${mapping?'Copy matching selections to the target model’s own Pricelist variant. Copy its dropdown setup first.':'Copy missing groups and options. Existing setup stays intact.'}</p>
      <div class="stock-tools"><label>Filter target models<input data-target-filter></label>
      <button class="btn secondary" data-pick="all">Select All</button>
      <button class="btn secondary" data-pick="none">Deselect All</button>
      <output aria-live="polite" data-target-count></output></div>
      <div class="stock-targets"></div>
      <div class="stock-actions">${mapping?'<button class="btn" data-copy="selected">Copy Selected Mappings</button><button class="btn secondary" data-copy="all">Copy All Mappings</button>':'<button class="btn" data-copy="setup">Apply Setup to Selected Models</button>'}</div>
    </details>`;
  }
  function bindCopy() {
    $('stockContent').querySelectorAll('[data-copy-mode]').forEach(panel=>{
      const mapping=panel.dataset.copyMode==='mappings', picked=new Set();
      const targets=items().filter(i=>i.key!==selected&&!i.unavailable&&
        (mapping ? !i.independent&&i.family===item().family : !family||i.family===family));
      const filter=panel.querySelector('[data-target-filter]');
      const list=panel.querySelector('.stock-targets');
      const count=()=>panel.querySelector('[data-target-count]').textContent=`${picked.size} selected`;
      const visible=()=>targets.filter(i=>[i.brand,i.family,i.model].join(' ').toLowerCase().includes(filter.value.trim().toLowerCase()));
      function renderTargets(){
        list.innerHTML=visible().map(i=>`<label><input type="checkbox" data-target="${esc(i.key)}" ${picked.has(i.key)?'checked':''}>${esc(i.family+' · '+i.model)}</label>`).join('')||'<p>No matching targets.</p>';
        count();
      }
      filter.oninput=renderTargets;
      list.onchange=e=>{const key=e.target.dataset.target;if(!key)return;if(e.target.checked)picked.add(key);else picked.delete(key);count();};
      panel.querySelector('[data-pick=all]').onclick=()=>{visible().forEach(i=>picked.add(i.key));renderTargets();};
      panel.querySelector('[data-pick=none]').onclick=()=>{picked.clear();renderTargets();};
      panel.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{
        if(!picked.size)return message('Select at least one target model.',true);
        const p={item_key:selected,targets:[...picked]};
        if(b.dataset.copy==='selected'){
          p.mapping_ids=[...$('stockContent').querySelectorAll('[data-select-mapping]:checked')].map(n=>n.dataset.selectMapping);
          if(!p.mapping_ids.length)return message('Select at least one saved mapping.',true);
        }
        save(mapping?'copy_mappings':'copy',p);
      });
      renderTargets();
    });
  }

  const item=key=>items().find(x=>x.key===(key||selected));
  function items(){const all=new Map((state?.catalog||[]).map(x=>[x.key,x]));for(const x of state?.items||[])if(!all.has(x.key))all.set(x.key,{...x,choices:[],unavailable:!x.independent});return [...all.values()].sort(modelCompare);}
  const groups=(kind)=>state.groups.filter(g=>g.item_key===selected&&!g.retired&&(!kind||g.kind===kind)).sort(sort);
  const options=g=>state.options.filter(o=>o.group_id===g.id&&!o.retired).sort(sort);
  const choices=()=>item()?.choices||[];
  const choiceOptions=value=>'<option value="">Unmapped — select exact configuration</option>'+choices().map(v=>`<option value="${esc(v.code)}" ${v.code===value?'selected':''}>${esc(v.label)}</option>`).join('');
  function message(text,error=false){$('stockMessage').textContent=text;$('stockMessage').className='stock-message'+(error?' error':'');}
  async function rpc(action,payload={}){
    const client=window.KeySuiteAuth?.getClient?.();
    if(!client)throw Error('Sign in to connect KeyStock.');
    const p=action==='state'?{...payload,ledger_client:'v102'}:payload;
    const {data,error}=await client.rpc('keysuite_stock_v100',{p_action:action,p_payload:p});
    if(error)throw error;
    return data;
  }
  async function load() {
    const token=++request;
    message('Loading catalogue and stock…');
    try {
      const data=await rpc('state');
      if(token!==request)return false;
      if(!data?.permissions)throw Error('The KeyStock V1.01 database migration is required.');
      state=data;
      render();
      const writable=data.can_manage||Object.values(data.permissions).some(Boolean);
      message(`KeyStock ${ledger()?'V1.02':'V1.01'} · ${items().length.toLocaleString()} catalogue models · ${writable?'Editing available':'Read only'}`);
      return true;
    }catch(e){
      if(token!==request)return false;
      state=null;
      clearStockView();
      message(`KeyStock is unavailable. ${e.message}`,true);
      return false;
    }
  }
  async function save(action,payload,after) {
    if(busy)return;
    busy=true;
    const context=authContext;
    const buttons=[...$('stockContent').querySelectorAll('button:not(:disabled)')];
    buttons.forEach(b=>b.disabled=true);
    message('Saving…');
    try {
      const result=await rpc(action,payload);
      if(context!==authContext)return;
      if(after)after(result);
      if(!await load())return;
      if(action==='copy'||action==='copy_mappings'){
        const unmapped=result.unmapped?` (${result.unmapped} Unmapped)`:'';
        message(`Copy completed. ${result.copied} copied, ${result.skipped} skipped, ${result.failed} failed${unmapped}.`);
      }else message('Saved successfully.');
    }catch(e){
      if(context===authContext)message(e.message,true);
    }finally{
      buttons.forEach(b=>b.disabled=false);
      busy=false;
    }
  }
  function filters(withModel=false){return `<div class="stock-tools"><label>Product Family<select id="stockFamily"><option value="">All families</option>${[...new Set(items().map(i=>i.family))].sort(natural.compare).map(f=>`<option ${family===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label><label>Search model / brand<input id="stockQuery" value="${esc(query)}" placeholder="Search catalogue"></label>${withModel?`<label>Model / Item<select id="stockModel"><option value="">Select a model</option>${filtered().map(i=>`<option value="${esc(i.key)}" ${i.key===selected?'selected':''}>${esc(i.model)}</option>`).join('')}</select></label>`:''}</div>`;}
  const filtered=()=>items().filter(i=>(!family||i.family===family)&&(!query||[i.brand,i.family,i.model].join(' ').toLowerCase().includes(query.toLowerCase())));
  function bindFilters(){if($('stockFamily'))$('stockFamily').onchange=e=>{family=e.target.value;render();};if($('stockQuery'))$('stockQuery').onchange=e=>{query=e.target.value;render();};if($('stockModel'))$('stockModel').onchange=e=>{selected=e.target.value;correction=null;entryId=uid();render();};}
  function configLabel(config){const terms=[];for(const [gid,oid] of Object.entries(config.selections||{})){const g=state.groups.find(g=>g.id===gid),o=state.options.find(o=>o.id===oid);terms.push(`${g?.label||'Retired group'}: ${o?.label||'Retired option'}`);}if(config.variant)terms.unshift(config.variant);return terms.join(' · ')||'Unconfigured';}
  function stockRows() {
    const active=new Map(), missing=new Map(), configs=new Map();
    for(const b of currentBatches()){
      if(b.voided_at)continue;
      const list=active.get(b.configuration_id)||[];
      list.push(b);active.set(b.configuration_id,list);
    }
    for(const q of ledger()?[]:state.critical_quantities){
      const list=missing.get(q.opening_id)||[];
      list.push(q);missing.set(q.opening_id,list);
    }
    for(const config of state.configurations){
      const byLocation=new Map();
      for(const b of active.get(config.id)||[]){
        const location=b.location_id||'';
        const row=byLocation.get(location)||{config,location,quantity:0,reserved:0,missing:new Map()};
        row.quantity+=Number(b.quantity);
        row.reserved+=Number(b.reserved||0);
        for(const q of missing.get(b.id)||[])row.missing.set(q.option_id,(row.missing.get(q.option_id)||0)+Number(q.missing_quantity));
        byLocation.set(location,row);
      }
      const list=configs.get(config.item_key)||[];
      list.push(...byLocation.values());configs.set(config.item_key,list);
    }
    return items().flatMap(item=>{
      const rows=configs.get(item.key)||[];
      return rows.length?rows.map(r=>({...r,item,assemblable:Math.max(0,r.quantity-Math.max(0,...r.missing.values()))}))
        :[{item,config:null,location:'',quantity:0,assemblable:0}];
    });
  }
  const formatQty = n => n.toLocaleString(undefined,{maximumFractionDigits:12});
  const textMatch=(value,term)=>String(value??'').toLowerCase().includes(term.trim().toLowerCase());
  const configById=()=>new Map(state.configurations.map(c=>[c.id,c]));
  const localDate=timestamp=>String(timestamp).length===10?String(timestamp)
    :new Date(timestamp).toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
  function currentBatches(){
    if(!ledger())return state.opening_balances;
    const lots=new Map(ledger().lots.map(l=>[l.id,l]));
    const openings=new Map(state.opening_balances.map(b=>[b.id,b]));
    return ledger().positions.map(p=>{
      const lot=lots.get(p.lot_id);
      const opening=openings.get(lot.opening_id);
      return {...p,supplier:lot.supplier,supplier_id:lot.supplier_id,created_at:lot.fifo_at,
        received_on:lot.received_on,legacy:!!opening,snapshot:opening?.snapshot};
    });
  }
  const stockTable=(headers,rows,empty,attributes='')=>`<div class="stock-scroll"><table class="stock-phase2-table" ${attributes}>
    <thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}">${esc(empty)}</td></tr>`}</tbody></table></div>`;
  const textRow=values=>`<tr>${values.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`;
  function batchesForCheck(configs) {
    if(tab==='detail'&&trail.at(-1)?.tab==='location'){
      return currentBatches().filter(b=>!b.voided_at&&configs.has(b.configuration_id)&&(b.location_id||'')===location);
    }
    const prefix=stockFilter.location.trim().toLowerCase();
    const supplier=stockFilter.supplier;
    const supplierNames=new Map(state.suppliers.map(s=>[s.id,s.label]));
    const locations=new Map(state.locations.map(l=>[l.id,l.label.toLowerCase()]));
    return currentBatches().filter(b=>!b.voided_at&&configs.has(b.configuration_id)
      &&(!prefix||(Number(b.quantity)>0&&locations.get(b.location_id)?.startsWith(prefix)))
      &&(!supplier.trim()||textMatch(b.supplier,supplier)||textMatch(supplierNames.get(b.supplier_id),supplier))
      &&(!stockFilter.serial.trim()||b.serials?.some(serial=>textMatch(serial,stockFilter.serial))));
  }
  function stockCheckResults(){
    const configs=configById(), totals=new Map(), reserves=new Map(), configured=new Set(state.configurations.map(c=>c.item_key));
    for(const b of batchesForCheck(configs)){
      const key=configs.get(b.configuration_id).item_key;
      totals.set(key,(totals.get(key)||0)+Number(b.quantity));
      reserves.set(key,(reserves.get(key)||0)+Number(b.reserved||0));
    }
    const requireBatch=Boolean(stockFilter.location.trim()||stockFilter.supplier.trim()||stockFilter.serial.trim());
    const models=filtered().filter(i=>{
      const total=totals.get(i.key)||0;
      return (!requireBatch||totals.has(i.key))&&(status!=='positive'||total>0)
        &&(status!=='zero'||total===0)&&(status!=='unconfigured'||!configured.has(i.key));
    });
    const rows=models.map(i=>{
      const qty=formatQty(totals.get(i.key)||0);
      return `<tr><td><button class="stock-link" data-stock-detail="${esc(i.key)}">${esc(i.model)}</button>
        <small>${esc(i.brand)} · ${esc(i.family)}</small></td><td>${qty}</td><td>${ledger()?formatQty(reserves.get(i.key)||0):'—'}</td><td>—</td><td>${qty}</td></tr>`;
    });
    return `<p class="stock-summary">${formatQty(models.length)} ${models.length===1?'model':'models'} shown</p>
      ${stockTable(['Model','Total','Reserve','Not Complete','On Hand'],rows,'No stock matches these filters.','aria-label="Stock Check results"')}`;
  }
  function stockCheck(){
    return `<label>Search Model<input id="stockQuery" type="search" value="${esc(query)}" placeholder="Search model or brand"></label>
      <details id="stockCheckFilter" ${stockFilter.open?'open':''}><summary>Filter</summary>
        <div class="stock-tools">
          <label>Location<input id="stockFilterLocation" type="search" value="${esc(stockFilter.location)}" placeholder="Location prefix"></label>
          <label>Supplier<input id="stockFilterSupplier" type="search" list="stockSupplierChoices" value="${esc(stockFilter.supplier)}">
            <datalist id="stockSupplierChoices">${state.suppliers.map(s=>`<option value="${esc(s.label)}"></option>`).join('')}</datalist>
          </label>
          <label>Serial Number<input id="stockFilterSerial" type="search" value="${esc(stockFilter.serial)}" ${ledger()?'':'disabled placeholder="Serial tracking unavailable"'}></label>
          <label>Product Family<select id="stockFamily"><option value="">All families</option>${[...new Set(items().map(i=>i.family))].sort(natural.compare).map(f=>`<option ${family===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label>
          <label>Stock Status<select id="stockStatus">${[['','All statuses'],['unconfigured','Not Configured'],['zero','Zero Stock'],['positive','In Stock']].map(([value,label])=>`<option value="${value}" ${value===status?'selected':''}>${label}</option>`).join('')}</select></label>
        </div>
      </details>
      <p class="stock-metrics-note">${ledger()?'On Hand is physical stock, including reservations. Calculated Not Complete totals await component requirements.'
        :'On Hand is physical stock from active opening balances. Reserve and Not Complete totals are unavailable.'}</p>
      <div id="stockTable">${stockCheckResults()}</div>`;
  }
  function bindStockCheck(){
    const update=()=>{$('stockTable').innerHTML=stockCheckResults();bindStockDetailLinks();};
    $('stockCheckFilter').ontoggle=e=>{stockFilter.open=e.target.open;};
    $('stockQuery').oninput=e=>{query=e.target.value;update();};
    $('stockFamily').onchange=e=>{family=e.target.value;update();};
    $('stockStatus').onchange=e=>{status=e.target.value;update();};
    $('stockFilterLocation').oninput=e=>{stockFilter.location=e.target.value;update();};
    $('stockFilterSupplier').oninput=e=>{stockFilter.supplier=e.target.value;update();};
    $('stockFilterSerial').oninput=e=>{stockFilter.serial=e.target.value;update();};
    bindStockDetailLinks();
  }
  function bindStockDetailLinks(){
    $('stockTable').querySelectorAll('[data-stock-detail]').forEach(b=>b.onclick=()=>moveTo('detail',b.dataset.stockDetail));
  }
  function stockDetail(){
    const model=item();
    if(!model)return '<p>This model is unavailable.</p>';
    const configs=new Map(state.configurations.filter(c=>c.item_key===selected).map(c=>[c.id,c]));
    const batches=batchesForCheck(configs).sort((a,b)=>(newestFirst?-1:1)*(
      (a.received_on||localDate(a.created_at)).localeCompare(b.received_on||localDate(b.created_at))
      ||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)));
    const total=formatQty(batches.reduce((sum,b)=>sum+Number(b.quantity),0));
    const reserved=formatQty(batches.reduce((sum,b)=>sum+Number(b.reserved||0),0));
    const columns=state.groups.filter(g=>g.item_key===selected&&g.kind==='normal'&&(!g.retired
      ||batches.some(b=>Object.hasOwn(configs.get(b.configuration_id).selections,g.id)))).sort(sort);
    const rows=batches.map(b=>{
      const config=configs.get(b.configuration_id);
      const values=[...columns.map(g=>(!ledger()||b.legacy&&b.id===b.lot_id?b.snapshot?.selections?.[g.id]?.option:'')
        ||state.options.find(o=>o.id===config.selections[g.id])?.label||'—'),
      config.variant||'Unmapped',locationLabel(b.location_id),
      b.received_on||(b.legacy?'Opening · '+localDate(b.created_at):localDate(b.created_at)),
      formatQty(Number(b.quantity)),ledger()?formatQty(Number(b.reserved)):'—','—',formatQty(Number(b.quantity))];
      const actions=ledger()?[
        ['adjust','+','adjust_stock','Add or adjust stock'],
        ['reserve','R','reserve_stock','Reserve stock'],
        ['issue','−','confirm_stock_out','Deduct stock']
      ].filter(([, ,permission])=>ledgerCap(permission)).map(([action,label,,title])=>
        `<button type="button" class="stock-row-action ${action}" data-row-action="${action}" data-position="${b.id}" aria-label="${title}">${label}</button>`).join(''):'';
      return `<tr>${values.map(v=>`<td>${esc(v)}</td>`).join('')}<td><div class="stock-row-actions">${actions||'—'}</div></td></tr>`;
    });
    const normal=columns.map(g=>{
      const tally=new Map();
      for(const b of batches){
        const option=configs.get(b.configuration_id).selections[g.id];
        if(option)tally.set(option,(tally.get(option)||0)+Number(b.quantity));
      }
      const choices=state.options.filter(o=>o.group_id===g.id&&(!o.retired||tally.has(o.id))).sort(sort);
      return `<div class="stock-normal-row"><b>${esc(g.label)}</b>${choices.map(o=>
        `<span>${esc(o.label)} <strong>${formatQty(tally.get(o.id)||0)}</strong></span>`).join('')}</div>`;
    }).join('');
    return `<div class="stock-detail-head"><button class="btn secondary" id="stockDetailBack">Back</button><h2>${esc(model.model)}</h2></div>
      <div class="stock-detail-metrics">${[['Total',total],['Reserve',ledger()?reserved:'—'],['Not Complete','—'],['On Hand',total]].map(([label,value],i)=>
        `<div><b>${label}</b>${i===1||i===2?`<button class="stock-link" data-stock-metric="${i}">${value}<span class="stock-sr"> View ${label} details</span></button>`:`<strong>${value}</strong>`}</div>`).join('')}</div>
      <p id="stockMetricStatus" class="stock-metrics-note" role="status" hidden></p>
      ${normal}<h3>Stock Breakdown by Configuration &amp; Location</h3>
      <label>Sort by date<select id="stockDateOrder"><option value="oldest">Oldest First</option><option value="newest" ${newestFirst?'selected':''}>Newest First</option></select></label>
      <p class="stock-metrics-note">Opening dates identify the historical count. Purchase batches show their receiving date.</p>
      ${stockTable([...columns.map(g=>g.label),'Pricelist Mapping','Location','Add In Date','Total','Reserve','Not Complete','On Hand','Actions'],rows,'No active opening balances match these filters.')}`;
  }
  function bindStockDetail(){
    $('stockDetailBack').onclick=back;
    $('stockDateOrder').onchange=e=>{newestFirst=e.target.value==='newest';render();};
    $('stockContent').querySelectorAll('[data-row-action]').forEach(button=>button.onclick=()=>{
      actionContext={action:button.dataset.rowAction,position:button.dataset.position,model:selected};
      moveTo(actionContext.action==='reserve'?'reservations':'movement');
    });
    $('stockContent').querySelectorAll('[data-stock-metric]').forEach(b=>b.onclick=()=>{
      if(b.dataset.stockMetric==='2'){
        missingFilter={model:item().model,series:item().family,component:''};
        moveTo('missing');
      }else if(ledger()){
        actionContext={model:selected};
        moveTo('reservations');
      }else{
        const notice=$('stockMetricStatus');
        notice.textContent='Reservation details require the reservation ledger.';
        notice.hidden=false;
      }
    });
  }
  function missingRows(){
    const configs=configById(), models=new Map(items().map(i=>[i.key,i]));
    const balances=new Map(state.opening_balances.filter(b=>!b.voided_at).map(b=>[b.id,b]));
    const options=new Map(state.options.map(o=>[o.id,o.label]));
    const shortages=new Map();
    for(const q of state.critical_quantities){
      const config=configs.get(balances.get(q.opening_id)?.configuration_id);
      const model=models.get(config?.item_key);
      const component=options.get(q.option_id)||'Historical component';
      if(!model||Number(q.missing_quantity)<=0||!textMatch(model.model,missingFilter.model)
        ||!textMatch(model.family,missingFilter.series)||!textMatch(component,missingFilter.component))continue;
      const key=config.id+':'+q.option_id;
      const row=shortages.get(key)||{model,config,component,quantity:0};
      row.quantity+=Number(q.missing_quantity);
      shortages.set(key,row);
    }
    return [...shortages.values()].sort((a,b)=>modelCompare(a.model,b.model)).map(row=>
      textRow([row.model.model,configLabel(row.config),row.component,'Unknown','Unknown','Unknown',formatQty(row.quantity)]));
  }
  function missingResults(){
    return stockTable(['Model','Configuration','Missing Component','Qty Affected','Required','Available','Shortage'],missingRows(),'No recorded shortages match these filters.');
  }
  function missingParts(){
    return `<h2>Missing Parts</h2><p class="stock-metrics-note">Shows shortages recorded on active opening balances. Component requirements, available components and allocation are unknown.</p>
      <div class="stock-tools">${Object.entries(missingFilter).map(([key,value])=>
        `<label>${{model:'Model',series:'Series',component:'Component'}[key]}<input type="search" data-missing-filter="${key}" value="${esc(value)}"></label>`).join('')}</div>
      <div id="stockMissingResults">${missingResults()}</div>`;
  }
  function timeFrame(id,filter,days){
    const choices=[...days.map(n=>[String(n),'Last '+n+' Days']),['all','All Time'],['custom','Custom Date Range']];
    const label=choices.find(([value])=>value===filter.period)[1];
    return `<details id="${id}" ${filter.open?'open':''}><summary>Time Frame · ${label}</summary>
      <div class="stock-tools"><label>Period<select data-period>${choices.map(([value,label])=>
        `<option value="${value}" ${value===filter.period?'selected':''}>${label}</option>`).join('')}</select></label>
        ${filter.period==='custom'?`<label>From<input type="date" data-date="from" value="${esc(filter.from)}"></label>
          <label>To<input type="date" data-date="to" value="${esc(filter.to)}"></label>`:''}</div></details>`;
  }
  function bindTimeFrame(id,filter,refresh){
    const element=$(id);
    element.ontoggle=()=>{filter.open=element.open;};
    element.querySelector('[data-period]').onchange=e=>{
      filter.period=e.target.value;
      filter.open=element.open;
      render();
      $(id).querySelector('[data-period]').focus();
    };
    element.querySelectorAll('[data-date]').forEach(input=>input.onchange=()=>{
      filter[input.dataset.date]=input.value;
      refresh?.();
    });
  }
  function matchesPeriod(timestamp,filter){
    if(filter.period==='all')return true;
    const date=localDate(timestamp);
    if(filter.period==='custom')return (!filter.from||date>=filter.from)&&(!filter.to||date<=filter.to);
    const today=localDate(Date.now());
    const start=new Date(today+'T00:00:00Z');
    start.setUTCDate(start.getUTCDate()-Number(filter.period)+1);
    return date>=start.toISOString().slice(0,10)&&date<=today;
  }
  function stockHistoryResults(){
    const configs=configById(), models=new Map(items().map(i=>[i.key,i]));
    const entries=[];
    for(const b of historyFilter.serial.trim()?[]:state.opening_balances){
      const model=models.get(configs.get(b.configuration_id)?.item_key);
      if(!model||!textMatch(model.model,historyFilter.model))continue;
      entries.push({b,model,timestamp:b.created_at,type:'Opening balance',status:b.voided_at?'Corrected':'Active'});
      if(b.voided_at)entries.push({b,model,timestamp:b.voided_at,type:'Opening balance correction',status:'Recorded'});
    }
    const events=ledger()?.events||[];
    const rows=entries.map(({b,model,timestamp,type,status})=>({date:localDate(timestamp),at:timestamp,values:[
      localDate(timestamp),b.snapshot?.model||model.model,'—',type,formatQty(Number(b.quantity)),'—',
      b.supplier||'—',locationLabel(b.location_id),status
    ]}));
    for(const e of events){
      if(!textMatch(e.model,historyFilter.model)
        ||(historyFilter.serial.trim()&&!e.serials.some(s=>textMatch(s,historyFilter.serial))))continue;
      rows.push({date:e.effective_on,at:e.recorded_at,values:[e.effective_on,e.model,e.serials.join(', ')||'—',
        actionLabels[e.kind]||e.kind,formatQty(Number(e.quantity)),e.reference||'—',e.customer||e.supplier||'—',
        [e.source_location,e.destination_location].filter(Boolean).join(' → ')||'—','Recorded']});
    }
    const visible=rows.filter(e=>matchesPeriod(e.date,historyFilter))
      .sort((a,b)=>b.date.localeCompare(a.date)||b.at.localeCompare(a.at)).map(e=>textRow(e.values));
    const current=currentBatches().reduce((sum,b)=>sum+(!b.voided_at
      &&configs.get(b.configuration_id)?.item_key===historyFilter.selected?Number(b.quantity):0),0);
    const lifetime=kind=>formatQty(events.reduce((n,e)=>n+(e.kind===kind&&e.item_key===historyFilter.selected?Number(e.quantity):0),0));
    return `${historyFilter.selected?`<div class="stock-detail-metrics stock-history-metrics">
      <div><b>Total Purchased</b><strong>${ledger()?lifetime('receive'):'—'}</strong></div>
      <div><b>Total Delivered</b><strong>${ledger()?lifetime('issue'):'—'}</strong></div>
      <div><b>Current Stock</b><strong>${formatQty(current)}</strong></div></div>`:''}
      ${stockTable(['Date','Model','Serial Number','Movement Type','Qty','Reference','Supplier / Customer','Location','Status'],visible,
        ledger()?'No stock events match these filters.':'No opening-balance events match these filters.')}`;
  }
  function stockHistory(){
    return `<h2>Stock History</h2><p class="stock-metrics-note">${ledger()?'Lifetime purchases and deliveries count recorded receipts and issues. Opening balances and returns are listed separately.'
      :'Opening balances and corrections are available. Purchases, deliveries and serial history require the transaction ledger.'}</p>
      <div class="stock-tools">
        <label>Search Model<input id="stockHistoryModel" type="search" value="${esc(historyFilter.model)}"></label>
        <label>Search Serial Number<input id="stockHistorySerial" type="search" value="${esc(historyFilter.serial)}" ${ledger()?'':'disabled placeholder="Serial tracking unavailable"'}></label>
        <label>Lifetime summary model<select id="stockHistorySelection"><option value="">Select a model</option>
          ${items().map(i=>`<option value="${esc(i.key)}" ${i.key===historyFilter.selected?'selected':''}>${esc(i.model)} · ${esc(i.family)}</option>`).join('')}</select></label>
      </div>
      ${timeFrame('stockHistoryTime',historyFilter,[30,90,365])}
      <div id="stockHistoryResults">${stockHistoryResults()}</div>`;
  }
  function bindStockHistory(){
    const refresh=()=>{$('stockHistoryResults').innerHTML=stockHistoryResults();};
    $('stockHistoryModel').oninput=e=>{historyFilter.model=e.target.value;refresh();};
    $('stockHistorySerial').oninput=e=>{historyFilter.serial=e.target.value;refresh();};
    $('stockHistorySelection').onchange=e=>{historyFilter.selected=e.target.value;refresh();};
    bindTimeFrame('stockHistoryTime',historyFilter,refresh);
  }
  function dropdownOverviewRows(){
    const models=new Map(items().map(i=>[i.key,i]));
    const kindLabels={linked:'Pricelist Link',critical:'Critical Group',normal:'Normal Group'};
    const rows=[];
    for(const g of state.groups){
      const model=models.get(g.item_key);
      if(g.retired||!model)continue;
      const labels=options(g).map(o=>o.label);
      if(g.kind==='linked'){
        for(const m of state.mappings){
          if(!m.retired&&m.item_key===g.item_key&&Object.hasOwn(m.selections,g.id))labels.push(configLabel(m));
        }
      }
      const values=[model.family,kindLabels[g.kind],g.label,labels.join(' · ')];
      if(!values.every((v,i)=>textMatch(v,dropdownFilter[i])))continue;
      rows.push({model,g,values});
    }
    rows.sort((a,b)=>modelCompare(a.model,b.model)||sort(a.g,b.g));
    return rows.length?rows.map(({model,values})=>`<tr><td>${esc(values[0])}<small>
      <button class="stock-link" data-dropdown-model="${esc(model.key)}">${esc(model.model)}</button></small>
      </td>${values.slice(1).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')
      :'<tr><td colspan="4">No groups match these filters.</td></tr>';
  }
  function dropdownOverview(){
    return `<details open><summary>Configured groups</summary><div class="stock-scroll">
      <table class="stock-phase2-table"><thead><tr>${['Series','Grouping Type','Group','Options / Mapping'].map((title,i)=>
        `<th scope="col">${title}<input type="search" data-dropdown-filter="${i}" aria-label="Filter ${title}" value="${esc(dropdownFilter[i])}"></th>`).join('')}</tr></thead>
      <tbody id="stockDropdownOverview">${dropdownOverviewRows()}</tbody></table></div></details>`;
  }
  function bindDropdownOverview(){
    const rows=$('stockDropdownOverview');
    rows.onclick=e=>{
      const button=e.target.closest('[data-dropdown-model]');
      if(!button)return;
      selected=button.dataset.dropdownModel;
      family=item().family;
      query='';
      render();
      $('stockModel')?.focus();
    };
    $('stockContent').querySelectorAll('[data-dropdown-filter]').forEach(input=>input.oninput=()=>{
      dropdownFilter[Number(input.dataset.dropdownFilter)]=input.value;
      rows.innerHTML=dropdownOverviewRows();
    });
  }

  const seriesLabels={ES:'ES',ISO:'ISO',CHC_G1:'CHC C4',CHC_G2:'CHC C6',CR:'CR',KV:'KV',BSW:'BSW',BSV:'BSV',MOTOR:'Motor',BGF:'BGF',BFI:'BFI'};
  const today=()=>localDate(Date.now());
  const actionLabels={issue:'Stock Out',return:'Customer Return',write_off:'Write Off',transfer:'Transfer Location',
    reconfigure:'Reconfigure Stock',adjust:'Add / Adjust Stock',reserve:'Reservation',release:'Return to Available',receive:'Receiving'};
  const dateField=()=>`<label>Date<input type="date" name="date" value="${today()}" required></label>`;
  const qtyField=(max='')=>`<label>Quantity<input type="number" name="quantity" min="0" step="any" max="${max}" required></label>`;
  const serialField=(help='One serial per line or comma-separated')=>
    `<label>Serial numbers<textarea name="serials" placeholder="${esc(help)}"></textarea></label>`;
  const serialValues=value=>String(value||'').split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  const requestDrafts=new WeakMap();
  function submitLedger(form,action,p,after){
    if(busy)return;
    const signature=JSON.stringify([action,p]);
    const previous=requestDrafts.get(form);
    const requestId=previous?.signature===signature?previous.id:uid();
    requestDrafts.set(form,{signature,id:requestId});
    save('ledger_'+action,{...p,request_id:requestId},after);
  }
  function formData(form){
    const values=Object.fromEntries(new FormData(form));
    return Object.fromEntries(Object.entries(values).filter(([,value])=>value!==''));
  }
  function configuredModels(modelKey=''){
    const positions=ledger().positions, configs=configById(), models=new Map(items().map(i=>[i.key,i]));
    const available=new Map();
    for(const p of positions){
      const amount=Number(p.quantity)-Number(p.reserved);
      available.set(p.configuration_id,(available.get(p.configuration_id)||0)+amount);
    }
    return [...available].flatMap(([id,quantity])=>{
      const config=configs.get(id), model=models.get(config.item_key);
      return model&&quantity>0&&(!modelKey||model.key===modelKey)?[{id,config,model,quantity}]:[];
    }).sort((a,b)=>modelCompare(a.model,b.model)||natural.compare(configLabel(a.config),configLabel(b.config)));
  }
  function configOptions(){
    const position=ledger().positions.find(p=>p.id===actionContext?.position);
    const configured=configuredModels(position?actionContext.model:'');
    return configured.map(({id,config,model,quantity})=>`<option value="${id}" ${position?.configuration_id===id?'selected':''}>
      ${esc(model.model)} · ${esc(configLabel(config))} · ${formatQty(quantity)} available</option>`).join('');
  }
  function reservationsView(){
    const configs=configById(), models=new Map(items().map(i=>[i.key,i]));
    const reservations=ledger().reservations.filter(r=>!actionContext?.model||configs.get(r.configuration_id)?.item_key===actionContext.model);
    const position=ledger().positions.find(p=>p.id===actionContext?.position);
    const form=ledgerCap('reserve_stock')?`<details id="stockReservationFormPanel" ${position?'open':''}><summary>Create reservation</summary>
      <form class="stock-form" id="stockReservationForm">
        <label>Model and configuration<select name="configuration_id" required ${position?'disabled':''}><option value="">Select stock</option>${configOptions()}</select></label>
        ${qtyField()}${dateField()}
        <label>Search Customer<input id="stockCustomerQuery" type="search" autocomplete="off" placeholder="Search KeySuite customers"></label>
        <label>Customer<select name="customer_id" required><option value="">Select a customer</option></select></label>
        <label>Reason<input name="reason" required></label>
        <label>Reference / Quotation Number<input name="reference"></label>
        <label>Remark<input name="remark"></label>
        <div class="stock-wide"><button class="btn">Reserve Stock</button></div>
      </form></details>`:'';
    return `<h2>Reservations</h2>
      ${actionContext?.model?`<div class="stock-actions"><button class="btn secondary" id="stockAllReservations">Show all reservations</button></div>`:''}
      ${form}
      ${reservations.map(r=>{
        const model=models.get(configs.get(r.configuration_id)?.item_key);
        const remaining=r.released_at?0:Number(r.quantity)-Number(r.fulfilled);
        const status=r.released_at?'Released':remaining===0?'Fulfilled':r.fulfilled>0?'Partially fulfilled':'Open';
        return `<details class="stock-reservation" data-reservation="${r.id}"><summary>${esc(model?.model||'Historical model')} ·
          ${esc(r.customer)} · ${formatQty(remaining)} open · ${status}</summary>
          <p>${esc(r.reserved_on)} · ${formatQty(Number(r.quantity))} reserved · ${formatQty(Number(r.fulfilled))} delivered</p>
          <p>${esc(r.reason)} · ${esc(r.reference)} · ${esc(r.remark)}</p>
          ${remaining>0&&ledgerCap('confirm_stock_out')?`<form class="stock-form" data-fulfill="${r.id}">
            ${qtyField(remaining)}${dateField()}<label>Delivery reference<input name="reference" required></label>
            ${serialField('Enter serials when the allocated batch is tracked')}
            <div class="stock-wide"><button class="btn">Confirm Stock Out</button></div></form>`:''}
          ${remaining>0&&ledgerCap('reserve_stock')?`<form data-release="${r.id}"><button class="btn secondary">Return to Available</button></form>`:''}
        </details>`;
      }).join('')||'<p>No reservations match this view.</p>'}`;
  }
  function bindReservations(){
    const clear=$('stockAllReservations');
    if(clear)clear.onclick=()=>{actionContext=null;render();};
    const form=$('stockReservationForm');
    if(form){
      const input=$('stockCustomerQuery'), select=form.elements.customer_id;
      let seq=0, timer;
      input.oninput=()=>{
        const token=++seq;
        clearTimeout(timer);
        select.replaceChildren(new Option('Select a customer',''));
        const term=input.value.trim();
        if(!term)return;
        timer=setTimeout(async()=>{
          try{
            const client=window.KeySuiteAuth.getClient();
            const {data,error}=await client.from('ks_customers').select('id,company_name').eq('status','active')
              .ilike('company_name','%'+term.replace(/[\\%_]/g,'\\$&')+'%').order('company_name').limit(25);
            if(!form.isConnected||token!==seq)return;
            if(error)throw error;
            for(const row of data||[])select.add(new Option(row.company_name,row.id));
          }catch(error){if(form.isConnected&&token===seq)message(error.message,true);}
        },180);
      };
      form.onsubmit=e=>{
        e.preventDefault();
        const p=formData(form);
        if(actionContext?.position)p.position_id=actionContext.position;
        submitLedger(form,'reserve',p,()=>{actionContext=null;});
      };
    }
    $('stockContent').querySelectorAll('[data-fulfill]').forEach(f=>f.onsubmit=e=>{
      e.preventDefault();
      const p=formData(f);
      submitLedger(f,'fulfill',{...p,reservation_id:f.dataset.fulfill,serials:serialValues(p.serials)});
    });
    $('stockContent').querySelectorAll('[data-release]').forEach(f=>f.onsubmit=e=>{
      e.preventDefault();
      if(window.confirm('Release the remaining reserved stock?'))submitLedger(f,'release',{reservation_id:f.dataset.release});
    });
  }

  const movementTypes={
    issue:'confirm_stock_out',return:'adjust_stock',write_off:'adjust_stock',
    transfer:'move_stock',reconfigure:'move_stock',adjust:'adjust_stock'
  };
  function positionOptions(){
    const configs=configById(), models=new Map(items().map(i=>[i.key,i]));
    return ledger().positions.filter(p=>p.quantity>p.reserved||p.id===actionContext?.position).map(p=>{
      const c=configs.get(p.configuration_id);
      const model=models.get(c?.item_key);
      return `<option value="${p.id}" ${p.id===actionContext?.position?'selected':''}>
        ${esc(model?.model||'Historical model')} · ${esc(configLabel(c))} · ${esc(locationLabel(p.location_id))} ·
        ${formatQty(Number(p.quantity)-Number(p.reserved))} available in batch</option>`;
    }).join('');
  }
  function movementFields(action){
    const returns=ledger().events.filter(e=>e.kind==='issue'&&e.quantity>e.returned);
    return `${action==='return'?`<label>Original delivery<select name="movement_id" required><option value="">Select stock out</option>
      ${returns.map(e=>`<option value="${e.id}">${esc(e.reference)} · ${esc(e.model)} · ${formatQty(e.quantity-e.returned)} unreturned</option>`).join('')}</select></label>`:
      `<label>Source configuration and location<select name="position_id" required><option value="">Select stock</option>${positionOptions()}</select></label>`}
      ${['transfer','return'].includes(action)?`<label>Destination location<select name="location_id" required><option value="">Select location</option>${refOptions('location')}</select></label>`:''}
      ${action==='reconfigure'?'<div class="stock-wide" id="stockReconfigureOptions"></div>':''}
      ${qtyField()}${dateField()}${serialField('Enter serials when the batch is tracked')}
      <label>Reason<input name="reason" required></label>
      <label>Reference<input name="reference" ${['return','issue'].includes(action)?'required':''}></label>
      <label>Remark<input name="remark"></label>
      <div class="stock-wide"><button class="btn">Save ${esc(actionLabels[action])}</button></div>`;
  }
  function movementResults(){
    const events=ledger().events.filter(e=>Object.hasOwn(movementTypes,e.kind)&&matchesPeriod(e.effective_on,movementFilter));
    const rows=events.map(e=>{
      const details=`<details class="stock-movement-detail"><summary>${esc(actionLabels[e.kind])}</summary>
        <p>Recorded ${esc(new Date(e.recorded_at).toLocaleString())}</p>
        ${e.serials.length?`<p>Serial numbers: ${esc(e.serials.join(', '))}</p>`:''}
        ${e.remark?`<p>${esc(e.remark)}</p>`:''}</details>`;
      const fields=[e.model,formatQty(Number(e.quantity)),e.kind==='return'?(e.customer||'Customer return'):(e.source_location||'—'),
        e.destination_location||e.customer||'—',e.reason,e.reference,e.actor];
      return `<tr><td>${esc(e.effective_on)}</td><td>${details}</td>${fields.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`;
    });
    return stockTable(['Date','Type','Model','Qty','From','To','Reason','Reference','Operator'],rows,'No stock movements match this period.');
  }
  function movementView(){
    const actions=Object.keys(movementTypes).filter(action=>ledgerCap(movementTypes[action]));
    const action=actions.includes(actionContext?.action)?actionContext.action:actions[0];
    return `<h2>Stock Movement</h2>${timeFrame('stockMovementTime',movementFilter,[7,30,90])}
      ${action?`<details id="stockMovementFormPanel" ${actionContext?.position?'open':''}><summary>Record stock movement</summary>
        <label>Movement type<select id="stockMovementAction">${actions.map(a=>`<option value="${a}" ${action===a?'selected':''}>${actionLabels[a]}</option>`).join('')}</select></label>
        <form class="stock-form" id="stockMovementForm">${movementFields(action)}</form></details>`:''}
      <div id="stockMovementResults">${movementResults()}</div>`;
  }
  function bindMovement(){
    bindTimeFrame('stockMovementTime',movementFilter,()=>{$('stockMovementResults').innerHTML=movementResults();});
    const selector=$('stockMovementAction');
    if(!selector)return;
    const form=$('stockMovementForm');
    const bind=()=>{
      const action=selector.value;
      const source=form.elements.position_id;
      if(action==='reconfigure'){
        const refresh=()=>{
          const pos=ledger().positions.find(p=>p.id===source.value);
          const cfg=state.configurations.find(c=>c.id===pos?.configuration_id);
          const relevant=state.groups.filter(g=>g.item_key===cfg?.item_key&&g.kind==='normal'&&!g.retired);
          $('stockReconfigureOptions').innerHTML=`<label>Change one Normal Group option<select name="choice" required>
            <option value="">Select group and option</option>${relevant.flatMap(g=>options(g).filter(o=>o.id!==cfg.selections[g.id])
              .map(o=>`<option value="${g.id}:${o.id}">${esc(g.label)} · ${esc(o.label)}</option>`)).join('')}</select></label>`;
        };
        source.onchange=refresh;refresh();
      }
      form.onsubmit=e=>{
        e.preventDefault();
        const p=formData(form);
        if(p.choice){[p.group_id,p.option_id]=p.choice.split(':');delete p.choice;}
        submitLedger(form,action,{...p,serials:serialValues(p.serials)},()=>{actionContext=null;});
      };
    };
    selector.onchange=()=>{form.innerHTML=movementFields(selector.value);bind();};
    bind();
  }
  function serialPolicy(item){
    const policies=ledger().serial_policy;
    return (policies.find(p=>p.scope==='product'&&p.subject===item.key)
      ||policies.find(p=>p.scope==='series'&&p.subject===item.family))?.required===true;
  }
  function receiptRow(){
    return `<tr data-receipt-row>
      <td><input name="model" aria-label="Model" list="stockReceiptModels" required placeholder="Enter model"></td>
      <td><input name="cost" aria-label="Cost (RM)" type="number" min="0" step="any" ${state.can_cost?'':'disabled'} placeholder="${state.can_cost?'Optional':'Restricted'}"></td>
      <td><input name="quantity" aria-label="Quantity" type="number" min="0" step="any" required></td>
      <td><select name="location_id" aria-label="Location" required><option value="">Select location</option>${refOptions('location')}</select></td>
      <td><input name="remark" aria-label="Remark"></td><td><button type="button" class="btn secondary" data-remove-row>Delete</button></td>
    </tr>`;
  }
  function receiveView(){
    return `<h2>Add Stock</h2><form id="stockReceiveForm">
      <details open><summary>General</summary><div class="stock-form">
        <label>Series<select id="stockReceiveSeries" name="family" required><option value="">Select series</option>
          ${Object.entries(seriesLabels).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label>
        ${inlineReference('supplier').replace('Supplier (optional)','Supplier').replace('<select name="supplier_id">','<select name="supplier_id" required>')}
        ${dateField()}
        <label>Reference<input name="reference"></label>
        <div id="stockReceiptConfig" class="stock-wide"></div>
      </div></details>
      <details open><summary>Stock</summary><datalist id="stockReceiptModels"></datalist>
        ${stockTable(['Model','Cost (RM)','Qty','Location','Remark','Delete'],[receiptRow()],'','id="stockReceiptRows"')}
        <div class="stock-actions"><button type="button" id="stockAddReceiptRow" class="btn secondary">Add row</button></div>
      </details>
      <div class="stock-actions"><button class="btn">Save Receiving</button></div></form>`;
  }
  function bindReceive(){
    const form=$('stockReceiveForm'), series=$('stockReceiveSeries'), config=$('stockReceiptConfig');
    const list=$('stockReceiptModels'), rows=$('stockReceiptRows').tBodies[0];
    const drafts=new WeakMap();
    let models=[];
    const norm=value=>value.trim().toLowerCase().replace(/\s+/g,' ');
    function findModel(value){
      const text=norm(value);
      if(!text)return;
      const options=models.filter(({label})=>norm(label)===text);
      if(options.length===1)return options[0].model;
      const candidates=models.filter(({model})=>norm(model.model)===text||norm(model.model).endsWith(' '+text));
      if(candidates.length===1)return candidates[0].model;
    }
    function storeConfigurations(){
      config.querySelectorAll('fieldset').forEach((panel,i)=>{
        const row=rows.children[Number(panel.dataset.row)];
        if(!row)return;
        drafts.set(row,{key:panel.dataset.key,groups:Object.fromEntries([...panel.querySelectorAll('[data-receive-group]')]
          .map(s=>[s.dataset.receiveGroup,s.value])),variant:panel.querySelector('[data-receive-variant]')?.value||'',
          serials:panel.querySelector('[name=serials]')?.value||''});
      });
    }
    function renderConfigurations(){
      config.innerHTML=[...rows.children].map((row,index)=>{
        const model=findModel(row.querySelector('[name=model]').value);
        if(!model)return '';
        const groups=state.groups.filter(g=>g.item_key===model.key&&!g.retired&&g.kind!=='critical').sort(sort);
        const old=drafts.get(row), draft=old?.key===model.key?old:{groups:{}};
        const choices=model.choices||[];
        return `<fieldset data-row="${index}" data-key="${esc(model.key)}"><legend>Row ${index+1} · ${esc(model.model)}</legend>
          <div class="stock-form">${groups.map(g=>`<label>${g.kind==='linked'?'Pricelist Link · ':''}${esc(g.label)}
            <select data-receive-group="${g.id}" required><option value="">Select</option>${options(g).map(o=>
              `<option value="${o.id}" ${draft.groups[g.id]===o.id?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`).join('')}
          ${groups.some(g=>g.kind==='linked')||!choices.length?'':`<label>Existing Pricelist configuration<select data-receive-variant>
            <option value="">Unmapped</option>${choices.map(v=>`<option value="${esc(v.code)}" ${draft.variant===v.code?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label>`}
          <label>Serial numbers ${serialPolicy(model)?'(required)':'(optional)'}
            <textarea name="serials" ${serialPolicy(model)?'required':''} placeholder="One per unit">${esc(draft.serials||'')}</textarea></label>
          </div></fieldset>`;
      }).join('');
    }
    function changeSeries(){
      storeConfigurations();
      const members=items().filter(i=>i.family===series.value&&!i.unavailable&&!i.independent);
      const counts=new Map();
      members.forEach(m=>counts.set(norm(m.model),(counts.get(norm(m.model))||0)+1));
      models=members.map(model=>({model,label:counts.get(norm(model.model))>1?model.model+' · '+model.key:model.model}));
      list.innerHTML=models.map(({label})=>`<option value="${esc(label)}"></option>`).join('');
      renderConfigurations();
    }
    series.onchange=changeSeries;
    rows.onchange=e=>{if(e.target.name==='model'){storeConfigurations();renderConfigurations();}};
    rows.onclick=e=>{
      const button=e.target.closest('[data-remove-row]');
      if(!button||rows.children.length===1)return;
      storeConfigurations();
      button.closest('tr').remove();
      renderConfigurations();
    };
    $('stockAddReceiptRow').onclick=()=>{
      if(rows.children.length>=200)return;
      storeConfigurations();
      rows.insertAdjacentHTML('beforeend',receiptRow());
      renderConfigurations();
      rows.lastElementChild.querySelector('input').focus();
    };
    bindInlineReferences(form);
    form.onsubmit=e=>{
      e.preventDefault();
      storeConfigurations();
      const p={family:series.value,supplier_id:form.elements.supplier_id.value,date:form.elements.date.value,
        reference:form.elements.reference.value,rows:[]};
      for(const [index,row] of [...rows.children].entries()){
        const field=name=>row.querySelector(`[name="${name}"]`).value;
        const model=findModel(field('model')), draft=drafts.get(row);
        if(!model||draft?.key!==model.key)return message(`Row ${index+1}: select an unambiguous model from the chosen series.`,true);
        const data={item_key:model.key,selections:draft.groups,variant:draft.variant,
          location_id:field('location_id'),quantity:field('quantity'),remark:field('remark'),serials:serialValues(draft.serials)};
        if(state.can_cost&&field('cost')!=='')data.unit_cost_myr=field('cost');
        p.rows.push(data);
      }
      submitLedger(form,'receive',p);
    };
  }
  function serialPolicyView(){
    if(!ledger()||!ledgerCap('manage_stock_dropdowns'))return '';
    return `<details><summary>Serial tracking</summary>
      <form id="stockSerialPolicy" class="stock-tools">
        <label>Apply to<select name="scope"><option value="series">Series</option><option value="product">Product</option></select></label>
        <label>Series or product<select name="subject" required></select></label>
        <label>Serial tracking<select name="required"><option value="">Use default / inherit</option><option value="true">Required</option><option value="false">Optional</option></select></label>
        <button class="btn">Save serial rule</button>
      </form><p class="stock-metrics-note">Product rules override series rules for new receipts. Existing lots retain their tracking.</p></details>`;
  }
  function bindSerialPolicy(){
    const f=$('stockSerialPolicy');
    if(!f)return;
    const scope=f.elements.scope, subject=f.elements.subject, required=f.elements.required;
    function updateRule(){
      const row=ledger().serial_policy.find(p=>p.scope===scope.value&&p.subject===subject.value);
      required.value=row?String(row.required):'';
    }
    function updateSubjects(){
      const available=scope.value==='series'?Object.entries(seriesLabels):items().filter(i=>Object.hasOwn(seriesLabels,i.family)&&!i.unavailable&&!i.independent)
        .map(i=>[i.key,`${seriesLabels[i.family]} · ${i.model}`]);
      subject.replaceChildren(new Option('Select', ''),...available.map(([key,label])=>new Option(label,key)));
      updateRule();
    }
    scope.onchange=updateSubjects;subject.onchange=updateRule;updateSubjects();
    f.onsubmit=e=>{
      e.preventDefault();
      submitLedger(f,'serial_policy',{scope:scope.value,subject:subject.value,required:required.value===''?null:required.value==='true'});
    };
  }
  function configurationTable(rows) {
    const columns=kind=>[...new Set(rows.flatMap(r=>Object.keys(r.config.selections)))].map(id=>
      state.groups.find(g=>g.id===id)).filter(g=>g?.kind===kind).sort(sort);
    const normal=columns('normal'), linked=columns('linked');
    const cell=(r,g)=>esc(state.options.find(o=>o.id===r.config.selections[g.id])?.label||'—');
    const locationLabel=r=>state.locations.find(l=>l.id===r.location)?.label||'Not Assigned';
    return `<div class="stock-scroll"><table class="stock-config-table">
      <thead><tr>${normal.map(g=>`<th>${esc(g.label)}</th>`).join('')}
        <th>Quantity</th><th>Location</th><th>Configuration details</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>${normal.map(g=>`<td>${cell(r,g)}</td>`).join('')}
        <td>${formatQty(r.quantity)}</td><td>${esc(locationLabel(r))}</td><td>
        <details><summary>Materials and Pricelist</summary>
          <dl>${linked.map(g=>`<dt>${esc(g.label)}</dt><dd>${cell(r,g)}</dd>`).join('')}
          <dt>Pricelist configuration</dt><dd>${esc(r.config.variant||(r.item.independent?'Independent item':'Unmapped'))}</dd></dl>
        </details>
        <details><summary>Critical Parts</summary>
          <p>Assemblable stock ${ledger()?'Unknown':formatQty(r.assemblable)}</p>
          <dl>${[...r.missing].map(([id,qty])=>`<dt>${esc(state.options.find(o=>o.id===id)?.label||'Historical part')}</dt><dd>${formatQty(qty)} missing</dd>`).join('')||(ledger()?'<dd>Component requirements pending</dd>':'<dd>No missing parts recorded</dd>')}</dl>
        </details>
        </td></tr>`).join('')}</tbody></table></div>`;
  }
  function table() {
    const models=new Map(), allowed=new Set(filtered().map(i=>i.key));
    for(const row of stockRows()){
      if(!allowed.has(row.item.key))continue;
      if(tab==='location'&&(!row.config||row.location!==location))continue;
      const list=models.get(row.item.key)||[];
      list.push(row);models.set(row.item.key,list);
    }
    const cards=[];
    for(const [key,rows] of models){
      const i=rows[0].item, configs=rows.filter(r=>r.config);
      const total=rows.reduce((n,r)=>n+r.quantity,0), assemblable=rows.reduce((n,r)=>n+r.assemblable,0);
      const reserved=rows.reduce((n,r)=>n+(r.reserved||0),0);
      if(tab==='check' && ((status==='positive'&&total<=0)||(status==='zero'&&total!==0)||(status==='unconfigured'&&configs.length)))continue;
      const open=expanded.has(key), power=rating(i);
      const count=new Set(configs.map(r=>r.config.id)).size;
      cards.push(`<article class="stock-model">
        <div class="stock-model-row">
          <div><button class="stock-link" data-item="${esc(key)}">${esc(i.model)}</button>
            <small>${esc(i.brand)} · ${esc(i.family)}${i.unavailable?' · Source unavailable':''}</small></div>
          <div class="stock-rating">${power?`<small>Rating</small>${power.value} ${power.unit}`:''}</div>
          <div><small>Physical On Hand</small><strong>${formatQty(total)}</strong></div>
          <div><small>Assemblable Stock</small><strong>${ledger()?'—':formatQty(assemblable)}</strong></div>
          <div><small>Reserved Stock</small><span>${ledger()?formatQty(reserved):'—'}</span></div>
          <div><small>Available to Promise</small><span>—</span></div>
          ${count?`<button class="btn secondary" aria-expanded="${open}" data-expand-model="${esc(key)}">${open?'▾':'▸'} ${count} configuration${count===1?'':'s'}</button>`:'<small>Not Configured</small>'}
        </div>${open&&configs.length?configurationTable(configs):''}</article>`);
    }
    return `<div class="stock-summary"><span>${cards.length.toLocaleString()} models shown</span><span>${items().length.toLocaleString()} catalogue models</span></div>
      <p class="stock-metrics-note">${ledger()?'Assemblable and Available to Promise quantities await component requirements.'
        :'Totals are for overview. Reservations and Available to Promise are not tracked in this phase.'}</p>
      ${cards.join('')||'<p>No stock matches this filter.</p>'}`;
  }
  function selectors(kind,values={}){return groups(kind).map(g=>`<label>${esc(g.label)}<select data-stock-group="${g.id}" data-kind="${g.kind}" required><option value="">Select</option>${options(g).map(o=>`<option value="${o.id}" ${values[g.id]===o.id?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`).join('');}
  function selections(root=$('stockContent'),linkedOnly=false){return Object.fromEntries([...root.querySelectorAll('[data-stock-group]')].filter(n=>!linkedOnly||n.dataset.kind==='linked').map(n=>[n.dataset.stockGroup,n.value]).filter(x=>x[1]));}
  function resolve(selections,direct=''){const gs=groups('linked');if(!gs.length)return choices().find(v=>v.code===direct)||null;const s=Object.fromEntries(gs.filter(g=>selections[g.id]).map(g=>[g.id,selections[g.id]]));const equal=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());if(Object.keys(s).length!==gs.length)return null;const m=state.mappings.find(m=>m.item_key===selected&&!m.retired&&equal(m.selections,s));return m?choices().find(v=>v.code===m.variant)||null:null;}
  function inputForm(){const i=item();if(!i)return '<p>Select a model from the catalogue.</p>';const config=correction?state.configurations.find(c=>c.id===correction.configuration_id):null;const vals=config?.selections||{};const cost=state.purchase_costs?.find(c=>c.opening_id===correction?.id)?.unit_cost_myr;
    return `<h2>${esc(i.model)}</h2><p>${esc(i.brand)} · ${esc(i.family)}</p>${i.unavailable?'<p>This source model is unavailable. Existing stock remains visible.</p>':''}<form id="stockInputForm" class="stock-form"><div class="stock-wide stock-message">${correction?'Correcting an opening balance. The original entry remains in the audit history.':'Opening balance only. Enter each initial physical stock lot once.'}</div>${selectors('linked',vals)}${selectors('normal',vals)}${!groups('linked').length&&!i.independent?`<label>Pricelist configuration<select id="stockVariant">${choiceOptions(config?.variant||'')}</select></label>`:''}<div class="stock-wide" id="stockResolution"></div><details class="stock-wide"><summary>Critical Parts</summary><div class="stock-form">${groups('critical').map(g=>`<fieldset><legend>${esc(g.label)}</legend>${options(g).map(o=>`<label>${esc(o.label)} — missing quantity<input data-critical="${o.id}" type="number" min="0" step="any" value="${state.critical_quantities.find(q=>q.opening_id===correction?.id&&q.option_id===o.id)?.missing_quantity??0}"></label>`).join('')}</fieldset>`).join('')||'<p>No critical dropdowns configured.</p>'}</div></details><label>Quantity<input name="quantity" type="number" min="0" step="any" value="${correction?.quantity??''}" required></label>${inlineReference('location',correction?.location_id||'')}${inlineReference('supplier',correction?.supplier_id||'')}${state.can_cost?`<label>Unit Purchase Cost MYR (optional)<input name="unit_cost_myr" type="number" min="0" step="any" value="${cost??''}" placeholder="Not entered"><small>Blank is unknown, not zero.</small></label>`:''}<label class="stock-wide">Remarks (optional)<textarea name="remarks">${esc(correction?.remarks||'')}</textarea></label>${correction?'<label class="stock-wide">Correction reason<input name="correction_reason" required></label>':''}<div class="stock-wide stock-actions"><button class="btn" ${state.can_manage&&!i.unavailable?'':'disabled'}>Save Opening Balance</button><button type="button" class="btn secondary" id="stockNewEntry">New Entry</button></div></form>${history(i)}`;}
  function history(i){
    const ids=new Set(state.configurations.filter(c=>c.item_key===i.key).map(c=>c.id));
    const rows=state.opening_balances.filter(b=>ids.has(b.configuration_id)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
    return `<details style="margin-top:20px"><summary>Opening balance history (${rows.length})</summary><div class="stock-scroll">
      <table><thead><tr><th>Date / Status</th><th>Recorded Configuration</th><th>Quantity</th><th>Supplier / Remarks</th>
      ${state.can_cost?'<th>Unit Cost MYR</th>':''}<th></th></tr></thead>
      <tbody>${rows.map(b=>`<tr><td>${esc(new Date(b.created_at).toLocaleString())}<small>
        ${b.voided_at?'Corrected: '+esc(b.void_reason):ledger()?'Opening count':'Active'}</small></td>
        <td>${esc(b.snapshot.variant)}<small>${esc(Object.values(b.snapshot.selections||{}).map(s=>s.label+': '+s.option).join(' · '))}</small></td>
        <td>${b.quantity}</td><td>${esc(b.supplier)}<small>${esc(b.remarks)}</small></td>
        ${state.can_cost?`<td>${state.purchase_costs?.find(c=>c.opening_id===b.id)?.unit_cost_myr??'Not entered'}</td>`:''}
        <td>${!ledger()&&!b.voided_at&&state.can_manage?`<button class="btn secondary" data-correct="${b.id}">Correct</button>`:''}</td></tr>`).join('')}
      </tbody></table></div></details>`;
  }
  function bindInput(){if(!$('stockInputForm'))return;bindInlineReferences($('stockInputForm'));const update=()=>{const matched=resolve(selections(),$('stockVariant')?.value||'');$('stockResolution').textContent=item()?.independent?'Independent stock item — no Pricelist link':matched?`Mapped to existing Pricelist: ${item().family} · ${item().model} · ${matched.label}`:'Unmapped — no exact Pricelist combination. No price will be substituted.';};$('stockInputForm').onchange=update;update();$('stockNewEntry').onclick=()=>{correction=null;entryId=uid();render();};$('stockInputForm').onsubmit=e=>{e.preventDefault();if(!state.can_manage)return;const f=new FormData(e.target),p={id:entryId,item_key:selected,selections:selections(),variant:$('stockVariant')?.value||'',quantity:Number(f.get('quantity')),location_id:f.get('location_id'),supplier_id:f.get('supplier_id'),remarks:f.get('remarks'),critical:[...e.target.querySelectorAll('[data-critical]')].map(n=>({option_id:n.dataset.critical,missing_quantity:Number(n.value)}))};if(state.can_cost)p.unit_cost_myr=f.get('unit_cost_myr')===''?null:Number(f.get('unit_cost_myr'));if(correction){p.corrects=correction.id;p.correction_reason=f.get('correction_reason');}save('opening',p,()=>{correction=null;entryId=uid();});};$('stockContent').querySelectorAll('[data-correct]').forEach(b=>b.onclick=()=>{correction=state.opening_balances.find(e=>e.id===b.dataset.correct);entryId=uid();render();});}
  function groupEditor(g={id:uid(),kind:'normal',label:'',sort_order:groups().length}){const opts=state.options.filter(o=>o.group_id===g.id).sort(sort);return `<form id="stockGroupForm" data-id="${g.id}" class="stock-form"><label>Dropdown Type<select name="kind" ${g.label?'disabled':''}>${['critical','linked','normal'].map(k=>`<option value="${k}" ${g.kind===k?'selected':''}>${{critical:'Critical Dropdown',linked:'Pricelist Linked Dropdown',normal:'Normal Dropdown'}[k]}</option>`).join('')}</select></label><label>Dropdown Label<input name="label" value="${esc(g.label)}" required></label><label>Group order<input name="sort_order" type="number" step="1" value="${g.sort_order}"></label><div class="stock-wide stock-options" id="stockOptions">${opts.map(optionEditor).join('')}</div><div class="stock-wide stock-actions"><button type="button" class="btn secondary" id="stockAddOption">Add Option</button><button class="btn">Save Group</button><button type="button" class="btn secondary" id="stockCancelGroup">Cancel</button></div></form>`;}
  function optionEditor(o={id:uid(),label:'',retired:false}){return `<div class="stock-option" data-id="${o.id}"><input aria-label="Option label" value="${esc(o.label)}" required><button type="button" class="btn secondary" data-move="-1" aria-label="Move option up">↑</button><button type="button" class="btn secondary" data-move="1" aria-label="Move option down">↓</button><label><input type="checkbox" ${o.retired?'checked':''}>Retired</label></div>`;}
  function bindGroup(g){$('stockGroupEditor').innerHTML=groupEditor(g);const f=$('stockGroupForm');$('stockAddOption').onclick=()=>{$('stockOptions').insertAdjacentHTML('beforeend',optionEditor());};$('stockOptions').onclick=e=>{const b=e.target.closest('[data-move]');if(!b)return;const row=b.closest('.stock-option');if(b.dataset.move==='-1'&&row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);if(b.dataset.move==='1'&&row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);};$('stockCancelGroup').onclick=()=>{$('stockGroupEditor').innerHTML='';};f.onsubmit=e=>{e.preventDefault();const fd=new FormData(f);save('group',{item_key:selected,id:f.dataset.id,kind:g?.kind||fd.get('kind'),label:fd.get('label'),sort_order:Number(fd.get('sort_order')),options:[...$('stockOptions').children].map((r,n)=>({id:r.dataset.id,label:r.querySelector('input').value,retired:r.querySelector('[type=checkbox]').checked,sort_order:n}))});};}
  function dropdowns() {
    if (!item()) return '<p>Select a model to configure dropdowns.</p>';
    const mappings = state.mappings.filter(m=>m.item_key===selected&&!m.retired);
    const conflicts = state.duplicate_groups.filter(g=>g.item_key===selected);
    return `<h2>${esc(item().model)}</h2>
      ${conflicts.length?`<p class="stock-message error">Duplicate groups retained for review: ${conflicts.map(g=>esc(g.label+' ('+g.kind+', '+g.count+')')).join(', ')}. Review their options and historical references before changing them.</p>`:''}
      <div class="stock-actions"><button class="btn" id="stockAddGroup">Add Group</button></div>
      ${groups().map(g=>`<div class="stock-tools"><b>${esc(g.label)}</b><span class="stock-badge">${esc(g.kind)}</span>
        <span>${options(g).map(o=>esc(o.label)).join(' · ')}</span><button class="btn secondary" data-edit-group="${g.id}">Edit Group</button></div>`).join('')}
      <div id="stockGroupEditor"></div><hr>
      ${!item().independent&&state.can_manage?`<h3>Pricelist Mappings</h3><p>Choose an exact existing Pricelist configuration for all linked selections.</p>
      <form id="stockMappingForm" class="stock-form">${selectors('linked')}
        <label>Existing Pricelist Configuration<select name="variant" required>${choiceOptions('')}</select></label>
        <div class="stock-wide"><button class="btn" ${groups('linked').length?'':'disabled'}>Save Mapping</button></div>
      </form>
      <div class="stock-ref-list">${mappings.map(m=>`<div><label><input type="checkbox" data-select-mapping="${m.id}">${esc(configLabel(m))}</label>
        ${caps('delete_stock_mapping')?`<button class="btn stock-danger" data-delete-mapping="${m.id}">Hold 5s to Delete</button>`:''}</div>`).join('')}</div>
      ${mappings.length?targetPicker(true):''}`:''}
      ${targetPicker(false)}`;
  }
  function bindDropdowns() {
    if (!$('stockAddGroup')) return;
    $('stockAddGroup').onclick=()=>bindGroup();
    $('stockContent').querySelectorAll('[data-edit-group]').forEach(b=>b.onclick=()=>bindGroup(state.groups.find(g=>g.id===b.dataset.editGroup)));
    if ($('stockMappingForm')) $('stockMappingForm').onsubmit=e=>{
      e.preventDefault();
      save('mapping',{item_key:selected,selections:selections(e.target,true),variant:new FormData(e.target).get('variant')});
    };
    $('stockContent').querySelectorAll('[data-delete-mapping]').forEach(b=>hold(b,5,()=>{
      if(window.confirm('Retire this KeyStock mapping? Existing stock configurations retain their recorded variant.')){
        save('delete_mapping',{item_key:selected,id:b.dataset.deleteMapping});
      }
    }));
    bindCopy();
  }
  function eligible(i) {
    return !state.configurations.some(c=>c.item_key===i.key)
      && !state.groups.some(g=>g.item_key===i.key)
      && !state.mappings.some(m=>m.item_key===i.key);
  }
  function management() {
    const current=state.items.find(i=>i.independent&&i.key===editKey);
    const canForm=editMode&&(current?caps('edit_stock_model'):caps('add_stock_model'));
    return `<h2>Manual stock models</h2>
      ${!editMode&&mayEdit()?'<p>Hold Edit in the KeyStock header for three seconds to unlock model management.</p>':''}
      ${canForm?`<form id="stockItemForm" class="stock-form">
        <label>Brand<input name="brand" required value="${esc(current?.brand||'')}"></label>
        <label>Series / Family<input name="family" value="${esc(current?.family||'SPARES')}" required></label>
        <label>Model / Item<input name="model" required value="${esc(current?.model||'')}"></label>
        <label class="stock-wide">Stock notes<textarea name="notes">${esc(current?.notes||'')}</textarea></label>
        <div class="stock-wide stock-actions"><button class="btn">${current?'Save Model':'Add Manual Model'}</button>
          ${current?'<button type="button" class="btn secondary" id="stockCancelItem">Cancel</button>':''}</div>
      </form>`:''}
      <div class="stock-scroll"><table><thead><tr><th>Brand</th><th>Series</th><th>Model</th><th>Stock notes</th><th>Actions</th></tr></thead>
      <tbody>${filtered().filter(i=>i.independent).map(i=>`<tr><td>${esc(i.brand)}</td><td>${esc(i.family)}</td>
        <td><button class="stock-link" data-item="${esc(i.key)}">${esc(i.model)}</button></td><td>${esc(i.notes)}</td>
        <td>${editMode&&caps('edit_stock_model')?`<button class="btn secondary" data-edit-item="${esc(i.key)}">Edit model</button>`:''}
        ${editMode&&caps('delete_stock_model')?(eligible(i)?`<button class="btn stock-danger" data-delete-item="${esc(i.key)}">Hold 5s to Delete</button>`:'<small>Stock history or setup exists</small>'):''}</td></tr>`).join('')||'<tr><td colspan="5">No manual models match.</td></tr>'}</tbody></table></div>`;
  }
  function bindManagement() {
    if($('stockItemForm')) $('stockItemForm').onsubmit=e=>{
      e.preventDefault();
      const p=Object.fromEntries(new FormData(e.target));
      p.id=editKey?editKey.slice('MANUAL:'.length):uid();
      save('item',p,()=>{editKey='';family='';query='';});
    };
    if($('stockCancelItem')) $('stockCancelItem').onclick=()=>{editKey='';render();};
    $('stockContent').querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>{
      editKey=b.dataset.editItem;render();$('stockItemForm')?.scrollIntoView({block:'nearest'});
    });
    $('stockContent').querySelectorAll('[data-delete-item]').forEach(b=>hold(b,5,()=>{
      if(window.confirm(`Delete manual model ${item(b.dataset.deleteItem)?.model}?`)){
        save('delete_item',{item_key:b.dataset.deleteItem},()=>{if(editKey===b.dataset.deleteItem)editKey='';});
      }
    }));
  }
  function render() {
    if(!state)return;
    const edit=$('stockEdit');
    edit.hidden=!mayEdit();
    edit.cancelStockHold?.();
    edit.textContent=editMode?'Done Editing':'Hold 3s to Edit';
    hold(edit,3,()=>{editMode=true;editKey='';if(tab==='items')render();else moveTo('items');});
    if(editMode){
      edit.onpointerdown=null;edit.onkeydown=null;
      edit.onclick=()=>{editMode=false;editKey='';render();};
    }
    if((tab==='input'&&!ledger()&&!state.can_manage)||(tab==='dropdowns'&&!canDropdowns())
      ||(tab==='receive'&&!ledgerCap('receive_stock')))tab='check';
    $('stockVersion').textContent=ledger()?'V1.02':'V1.01';
    const currentTab=tab==='detail'?'check':tab;
    const pageItems=Object.entries(pages).filter(([key])=>
      (key!=='dropdowns'||canDropdowns())&&(key!=='receive'||ledgerCap('receive_stock')));
    const firstManagement=pageItems.find(([key])=>key==='receive'||key==='dropdowns')?.[0];
    $('stockTabs').innerHTML=pageItems
      .map(([key,[label,path]])=>`${key===firstManagement?'<div class="stock-management-label">Management</div>':''}
        <button type="button" data-tab="${key}" ${currentTab===key?'aria-current="page"':''}>${navIcon(path)}<span>${label}</span></button>`).join('');
    $('stockTabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
      if(actionContext&&b.dataset.tab===tab){actionContext=null;render();return;}
      actionContext=null;moveTo(b.dataset.tab);
    });
    const utilities=$('stockUtilities');
    utilities.hidden=false;
    utilities.innerHTML=`<summary>Existing stock tools</summary><div class="stock-actions">
      <button type="button" class="btn secondary" data-stock-tool="location">Stock by Location</button>
      ${mayEdit()||caps('manage_stock_suppliers')?`<button type="button" class="btn secondary" data-stock-tool="items">Stock Item Management</button>`:''}
      ${state.can_manage||ledger()?`<button type="button" class="btn secondary" data-stock-tool="input">Opening Balance Records</button>`:''}
      </div>`;
    utilities.querySelectorAll('[data-stock-tool]').forEach(b=>b.onclick=()=>{utilities.open=false;moveTo(b.dataset.stockTool);});
    let body;
    if(tab==='check')body=stockCheck();
    else if(tab==='detail')body=stockDetail();
    else if(tab==='missing')body=missingParts();
    else if(tab==='history')body=stockHistory();
    else if(tab==='receive')body=receiveView();
    else if(tab==='reservations')body=ledger()?reservationsView():'<h2>Reservations</h2><p>The current database has no reservation ledger. Reservation balances and stock-out actions are unavailable.</p>';
    else if(tab==='movement')body=ledger()?movementView():`<h2>Stock Movement</h2>${timeFrame('stockMovementTime',movementFilter,[7,30,90])}
      <p>The current database has no stock movement ledger.</p>`;
    else if(tab==='location')body=filters()+`<label>Location<select id="stockLocation"><option value="">Not Assigned</option>${refOptions('location',location,true)}</select></label>
        ${manageReferences('location')}<div id="stockTable">${table()}</div>`;
    else if(tab==='items')body=filters()+management()+manageReferences('supplier');
    else if(tab==='input')body=filters(true)+(ledger()?(item()?history(item()):'<p>Select a model to view original opening balances.</p>'):inputForm());
    else body=dropdownOverview()+serialPolicyView()+filters(true)+dropdowns();
    $('stockContent').innerHTML=body;
    if(tab==='check')bindStockCheck();
    else if(tab==='detail')bindStockDetail();
    else if(tab==='history')bindStockHistory();
    else if(tab==='receive')bindReceive();
    else if(tab==='reservations'&&ledger())bindReservations();
    else if(tab==='movement'){
      if(ledger())bindMovement();else bindTimeFrame('stockMovementTime',movementFilter);
    }
    else if(tab==='missing'){
      $('stockContent').querySelectorAll('[data-missing-filter]').forEach(input=>input.oninput=()=>{
        missingFilter[input.dataset.missingFilter]=input.value;
        $('stockMissingResults').innerHTML=missingResults();
      });
    }else{
      bindFilters();bindInput();bindDropdowns();bindManagement();bindReferences();bindRows();
      if(tab==='dropdowns'){bindDropdownOverview();bindSerialPolicy();}
      if($('stockLocation'))$('stockLocation').onchange=e=>{
        location=e.target.value;
        $('stockTable').innerHTML=table();
        bindRows();
      };
    }
  }
  function bindRows() {
    $('stockContent').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>moveTo(state.can_manage?'input':'detail',b.dataset.item));
    $('stockContent').querySelectorAll('[data-expand-model]').forEach(b=>b.onclick=()=>{
      const key=b.dataset.expandModel;
      if(expanded.has(key))expanded.delete(key);else expanded.add(key);
      $('stockTable').innerHTML=table();
      bindRows();
      [...$('stockTable').querySelectorAll('[data-expand-model]')].find(n=>n.dataset.expandModel===key)?.focus({preventScroll:true});
    });
  }
  function clearStockView(){
    $('stockEdit').hidden=true;
    $('stockUtilities').hidden=true;
    $('stockUtilities').replaceChildren();
    $('stockTabs').replaceChildren();
    $('stockContent').replaceChildren();
  }
  function install(){
    const main=document.querySelector('main');
    if($('keyStock')||!main)return;
    const section=document.createElement('section');
    section.id='keyStock';
    section.className='page';
    section.innerHTML=`<div class="stock-heading"><h1>KeyStock <small id="stockVersion">V1.02</small></h1>
      <div id="stockEditActions"><button class="btn secondary" id="stockEdit" hidden>Hold 3s to Edit</button>
      <button class="btn secondary" id="stockRefresh">Refresh</button></div></div>
      <div id="stockMessage" class="stock-message" role="status"></div>
      <details id="stockUtilities" hidden></details>
      <div class="stock-workspace"><div id="stockTabs" class="stock-tabs" role="navigation" aria-label="KeyStock"></div>
      <div id="stockContent" class="card"></div></div>`;
    main.append(section);
    const nav=document.createElement('button');
    nav.type='button';
    nav.innerHTML='<span>KeyStock</span>'+navIcon('M12 2l4 2.3v4.5L12 11 8 8.8V4.3L12 2zM8 4.3l4 2.3 4-2.3m-4 2.3V11m-5 0 4 2.3v4.5L7 20l-4-2.2v-4.5L7 11zm-4 2.3 4 2.3 4-2.3m-4 2.3V20m10-9 4 2.3v4.5L17 20l-4-2.2v-4.5l4-2.3zm-4 2.3 4 2.3 4-2.3m-4 2.3V20');
    nav.dataset.page='keyStock';
    nav.id='keyStockNav';
    nav.onclick=()=>window.KeySuiteApp.showPage('keyStock');
    $('keyAiNavButton')?.before(nav);
    const refreshVisibility=()=>{nav.hidden=window.KeySuitePermissions?.level('view_stock')==='none';};
    refreshVisibility();
    $('stockRefresh').onclick=load;
    window.addEventListener('KEYSUITE_PAGE_CHANGED',e=>{
      if(e.detail?.page!=='keyStock')return;
      if(tab==='detail')back();
      trail.length=0;
      if(state)render();else load();
    });
    window.addEventListener('KEYSUITE_AUTH_CONTEXT_READY',()=>{
      refreshVisibility();
      ++authContext;++request;
      state=null;selected='';family='';query='';location='';status='';tab='check';trail.length=0;
      expanded.clear();editMode=false;editKey='';correction=null;entryId=uid();
      stockFilter=emptyStockFilter();
      historyFilter=emptyHistoryFilter();
      movementFilter={period:'30',from:'',to:'',open:false};
      missingFilter={model:'',series:'',component:''};
      dropdownFilter=['','','',''];
      newestFirst=false;
      actionContext=null;
      clearStockView();
      message('');
    });
    window.addEventListener('keysuite-permissions-changed',()=>{
      refreshVisibility();
      state=null;editMode=false;editKey='';++request;
      clearStockView();
      if($('keyStock').classList.contains('active'))load();
    });
  }
  window.KeyStock={version:'1.02',refresh:load,back,resetTab:()=>{tab='check';correction=null;actionContext=null;entryId=uid();render();},stockRows:()=>state?stockRows():[],resolve:(s,d)=>state?resolve(s,d):null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
