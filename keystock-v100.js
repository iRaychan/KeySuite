/* KeyStock V1.05 */
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
    dropdowns:['Dropdown Management','M3 4h18v3l-7 7v6l-4-2v-4L3 7z'],
    references:['Supplier & Location','M4 5h16v14H4z']
  };
  const navIcon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
  const locationLabel=id=>state.locations.find(l=>l.id===id)?.label||'Not Assigned';
  let stockFilter=emptyStockFilter();
  let historyFilter=emptyHistoryFilter();
  let movementFilter={period:'30',from:'',to:'',open:false};
  let dropdownFilter=['','','',''];
  let dropdownSeries='', dropdownKind='critical', dropdownOption='', optionDraft=null;
  let missingFilter={model:'',series:'',component:''};
  let newestFirst=false, batchEdit=null;
  const detailFilters={critical:'',normal:''};
  const detailSections={critical:false,normal:false};
  const expandedConfigurations=new Set();
  const stockV105=()=>state?.config_version==='v105';
  const stockVersion=()=>stockV105()?'V1.05':state.config_version==='v104'?'V1.04':state.config_version==='v103'?'V1.03':ledger()?'V1.02':'V1.01';
  const statusChoices=['','unconfigured','zero','positive'];
  const statusPreferenceKey=()=>{
    const a=window.KEYSUITE_ACCESS||{},user=window.KeySuiteAuth?.getSession?.()?.user?.id||a.user_id||a.email||window.KEYSUITE_PROFILE?.email;
    return a.company_id&&user?`keysuite:stock-status:${a.company_id}:${String(user).toLowerCase()}`:'';
  };
  function stockStatusPreference(value){
    const key=statusPreferenceKey();
    if(!key)return '';
    try{
      if(value===undefined){
        const saved=localStorage.getItem(key)||'';
        return statusChoices.includes(saved)?saved:'';
      }
      if(value)localStorage.setItem(key,value);
      else localStorage.removeItem(key);
    }catch(_){}
    return '';
  }
  function emptyStockFilter(){return {location:'',supplier:'',serial:'',open:false};}
  function emptyHistoryFilter(){return {model:'',serial:'',period:'all',from:'',to:'',open:false};}
  const timeFrameDays={stockMovementTime:[7,30,90],stockHistoryTime:[7,30,90,365]};
  let restoredPreferenceKey='';
  function timeFramePreference(id,filter,read=false){
    const key=statusPreferenceKey();
    if(!key)return;
    const storageKey=key.replace(':stock-status:',':stock-period:')+':'+id;
    try{
      if(!read){
        const next=JSON.stringify({period:filter.period,from:filter.from,to:filter.to});
        if(localStorage.getItem(storageKey)!==next)localStorage.setItem(storageKey,next);
        return;
      }
      const prior=JSON.parse(localStorage.getItem(storageKey));
      if(!prior||!['all','custom',...timeFrameDays[id].map(String)].includes(prior.period))return;
      filter.period=prior.period;
      for(const field of ['from','to'])filter[field]=/^\d{4}-\d{2}-\d{2}$/.test(prior[field])?prior[field]:'';
    }catch(_){}
  }
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
    batchEdit=null;
    if(next==='detail'){
      detailFilters.critical=detailFilters.normal='';
      detailSections.critical=detailSections.normal=false;
    }
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
    correction=null;batchEdit=null;entryId=uid();render();
    requestAnimationFrame(()=>{scrollRoot()?.scrollTo(0,prev.scroll);window.scrollTo(0,prev.y);});
    return true;
  }
  // A release, focus loss or pointer cancellation cancels the gesture. Keyboard Space also works.
  function hold(button, seconds, callback) {
    const label=button.textContent;
    button.cancelStockHold?.();
    button.textContent=label;
    button.stockHoldEvents?.abort();
    const events=button.stockHoldEvents=new AbortController();
    let timer, started;
    function cancel(){clearTimeout(timer);timer=undefined;button.textContent=label;}
    button.cancelStockHold=cancel;
    function start(){
      if(timer || button.disabled || busy)return;
      started=performance.now();
      const tick=()=>{
        const left=seconds-(performance.now()-started)/1000;
        if(left<=0){
          cancel();
          // The release click must not activate the freshly rendered Done Editing action.
          const suppress=e=>{e.preventDefault();e.stopImmediatePropagation();};
          const events=['pointerup','keyup','blur','pointercancel'];
          const release=()=>setTimeout(()=>{
            button.removeEventListener('click',suppress,true);
            events.forEach(name=>button.removeEventListener(name,release));
          },0);
          button.addEventListener('click',suppress,{capture:true,once:true});
          events.forEach(name=>button.addEventListener(name,release));
          callback();return;
        }
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
  let referenceTab='supplier',referenceFilter='';
  function referenceList(){
    const allowed=caps('manage_stock_'+referenceTab+'s')&&editMode;
    return state[referenceTab+'s'].filter(r=>textMatch(r.label,referenceFilter)).sort((a,b)=>natural.compare(a.label,b.label)).map(r=>`<li>${esc(r.label)}${r.retired?' (inactive)':''} ${allowed?`<button class="btn secondary" data-ref-type="${referenceTab}" data-rename-ref="${r.id}">Edit</button> ${r.retired?`<button class="btn secondary" data-ref-type="${referenceTab}" data-retire-ref="${r.id}">Restore</button>`:`<button class="btn secondary" data-remove-reference="${r.id}">Delete or deactivate</button>`}`:''}</li>`).join('');
  }
  function referencePage(){
    return `<h2>Supplier &amp; Location</h2>${['supplier','location'].map(type=>`<button class="btn secondary" data-reference-tab="${type}" aria-pressed="${type===referenceTab}">${type==='supplier'?'Supplier':'Location'}</button>`).join(' ')}
    <label>Filter<input type="search" id="masterFilter" value="${esc(referenceFilter)}"></label><button class="btn secondary" id="masterClear">Clear</button>
    ${editMode&&caps('manage_stock_'+referenceTab+'s')?`<form data-ref-form="${referenceTab}"><label>Name<input name="label" required></label><button class="btn">Add</button></form>`:''}
    <ul class="stock-ref-list" id="masterRows">${referenceList()}</ul>`;
  }
  function bindReferencePage(){
    const update=()=>{$('masterRows').innerHTML=referenceList();bindReferences();};
    $('masterFilter').oninput=e=>{referenceFilter=e.target.value;update()};
    $('masterClear').onclick=()=>{referenceFilter='';$('masterFilter').value='';update()};
    $('stockContent').querySelectorAll('[data-reference-tab]').forEach(b=>b.onclick=()=>{referenceTab=b.dataset.referenceTab;referenceFilter='';render()});
    $('masterRows').onclick=e=>{const id=e.target.closest('[data-remove-reference]')?.dataset.removeReference;if(id&&editMode&&confirm('Delete this unused entry, or deactivate it if it has history?'))save('delete_'+referenceTab,{id})};
    bindReferences();
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
  const belongs=(g,key)=>g.item_key===key||!!g.series_key&&g.series_key===item(key)?.family;
  const groups=(kind)=>state.groups.filter(g=>belongs(g,selected)&&!g.retired&&(!kind||g.kind===kind)).sort(sort);
  const options=g=>state.options.filter(o=>o.group_id===g.id&&!o.retired).sort(sort);
  const choices=()=>item()?.choices||[];
  const choiceOptions=value=>'<option value="">Unmapped — select exact configuration</option>'+choices().map(v=>`<option value="${esc(v.code)}" ${v.code===value?'selected':''}>${esc(v.label)}</option>`).join('');
  function message(text,error=false){$('stockMessage').textContent=text;$('stockMessage').className='stock-message'+(error?' error':'');}
  async function rpc(action,payload={}){
    const client=window.KeySuiteAuth?.getClient?.();
    if(!client)throw Error('Sign in to connect KeyStock.');
    const p={...payload,config_client:'v104',stock_client:'v105',...(action==='state'?{ledger_client:'v102'}:{})};
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
      if(restoredPreferenceKey!==statusPreferenceKey()){
        restoredPreferenceKey=statusPreferenceKey();
        timeFramePreference('stockHistoryTime',historyFilter,true);
        timeFramePreference('stockMovementTime',movementFilter,true);
      }
      status=stockStatusPreference()||status;
      render();
      const writable=data.can_manage||Object.values(data.permissions).some(Boolean);
      message(`KeyStock ${stockVersion()} · ${items().length.toLocaleString()} catalogue models · ${writable?'Editing available':'Read only'}`);
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
      await window.KeySuiteStockCost?.refresh();
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
  const optionLabel=value=>(Array.isArray(value)?value:[value]).map(id=>state.options.find(o=>o.id===id)?.label||'').filter(Boolean).join(', ')||'—';
  function configLabel(config){const terms=[];for(const [gid,oid] of Object.entries(config.selections||{})){const g=state.groups.find(g=>g.id===gid);terms.push(`${g?.label||'Retired group'}: ${optionLabel(oid)}`);}if(config.variant)terms.unshift(config.variant);return terms.join(' · ')||'Unconfigured';}
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
        const row=byLocation.get(location)||{config,location,quantity:0,complete:0,incomplete:0,reserved:0,missing:new Map()};
        row.quantity+=b.total??Number(b.quantity);
        row.complete+=Number(b.quantity);
        row.incomplete+=Number(b.incomplete||0);
        row.reserved+=Number(b.reserved||0);
        for(const q of missing.get(b.id)||[])row.missing.set(q.option_id,(row.missing.get(q.option_id)||0)+Number(q.missing_quantity));
        byLocation.set(location,row);
      }
      const list=configs.get(config.item_key)||[];
      list.push(...byLocation.values());configs.set(config.item_key,list);
    }
    return items().flatMap(item=>{
      const rows=configs.get(item.key)||[];
      return rows.length?rows.map(r=>({...r,item,assemblable:stockV105()?r.complete:Math.max(0,r.quantity-Math.max(0,...r.missing.values()))}))
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
    const lots=new Map(ledger().lots.map(l=>[l.id,l])),heldSerials=new Map();
    for(const unit of state.incomplete_units||[]){
      if(unit.closed_at||!unit.serial)continue;
      const serials=heldSerials.get(unit.position_id)||[];
      serials.push(unit.serial);heldSerials.set(unit.position_id,serials);
    }
    const openings=new Map(state.opening_balances.map(b=>[b.id,b]));
    return ledger().positions.map(p=>{
      const lot=lots.get(p.lot_id);
      const opening=openings.get(lot.opening_id);
      const incomplete=Number(p.incomplete||0);
      return {...p,incomplete,total:Number(p.quantity)+incomplete,available:Number(p.quantity)-Number(p.reserved||0),
        serials:[...(p.serials||[]),...(heldSerials.get(p.id)||[])],
        opening_id:lot.opening_id,supplier:lot.supplier,supplier_id:lot.supplier_id,created_at:lot.fifo_at,
        cost:lot.unit_cost_myr,received_on:lot.received_on,legacy:!!opening,snapshot:opening?.snapshot};
    });
  }
  const leftStockColumns=['Model','Configuration','Date','Location','From','To'];
  const stockTable=(headers,rows,empty,attributes='')=>`<div class="stock-scroll"><table class="stock-phase2-table"
    data-stock-left="${headers.flatMap((h,i)=>leftStockColumns.includes(h)?[i+1]:[]).join(' ')}" ${attributes}>
    <colgroup>${headers.map(h=>`<col class="${['Model','Configuration','Date','Location','From','To'].includes(h)?'stock-col-text':'stock-col-center'} ${['Cost (RM)','Total','Reserve','Not Complete','On Hand','Actions'].includes(h)?'stock-col-metric':''}">`).join('')}</colgroup>
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
      &&(!prefix||((b.total??Number(b.quantity))>0&&locations.get(b.location_id)?.startsWith(prefix)))
      &&(!supplier.trim()||textMatch(b.supplier,supplier)||textMatch(supplierNames.get(b.supplier_id),supplier))
      &&(!stockFilter.serial.trim()||b.serials?.some(serial=>textMatch(serial,stockFilter.serial))));
  }
  function stockCheckResults(){
    const configs=configById(), totals=new Map(), reserves=new Map(), incomplete=new Map(), configured=new Set(state.configurations.map(c=>c.item_key));
    for(const b of batchesForCheck(configs)){
      const key=configs.get(b.configuration_id).item_key;
      totals.set(key,(totals.get(key)||0)+(b.total??Number(b.quantity)));
      reserves.set(key,(reserves.get(key)||0)+Number(b.reserved||0));
      incomplete.set(key,(incomplete.get(key)||0)+Number(b.incomplete||0));
    }
    const requireBatch=Boolean(stockFilter.location.trim()||stockFilter.supplier.trim()||stockFilter.serial.trim());
    const models=filtered().filter(i=>{
      const total=totals.get(i.key)||0;
      return (!requireBatch||totals.has(i.key))&&(status!=='positive'||total>0)
        &&(status!=='zero'||total===0)&&(status!=='unconfigured'||!configured.has(i.key));
    });
    const rows=models.map(i=>{
      const total=totals.get(i.key)||0, reserve=reserves.get(i.key)||0, missing=incomplete.get(i.key)||0;
      return `<tr><td><button class="stock-link" data-stock-detail="${esc(i.key)}">${esc(i.model)}</button>
        <small>${esc(i.brand)} · ${esc(i.family)}</small></td><td>${formatQty(total)}</td><td>${ledger()?formatQty(reserve):'—'}</td>
        <td>${stockV105()?formatQty(missing):'—'}</td><td>${formatQty(total-(stockV105()?reserve+missing:0))}</td></tr>`;
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
      <p class="stock-metrics-note">${stockV105()?'On Hand shows complete, unreserved pumps. Total includes reserved and incomplete pumps.':ledger()?'On Hand is physical stock, including reservations. Calculated Not Complete totals await component requirements.'
        :'On Hand is physical stock from active opening balances. Reserve and Not Complete totals are unavailable.'}</p>
      <div id="stockTable">${stockCheckResults()}</div>`;
  }
  function bindStockCheck(){
    const update=()=>{$('stockTable').innerHTML=stockCheckResults();bindStockDetailLinks();};
    $('stockCheckFilter').ontoggle=e=>{stockFilter.open=e.target.open;};
    $('stockQuery').oninput=e=>{query=e.target.value;update();};
    $('stockFamily').onchange=e=>{family=e.target.value;update();};
    $('stockStatus').onchange=e=>{status=e.target.value;stockStatusPreference(status);update();};
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
    const allBatches=batchesForCheck(configs).sort((a,b)=>(newestFirst?-1:1)*(
      (a.received_on||localDate(a.created_at)).localeCompare(b.received_on||localDate(b.created_at))
      ||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)));
    const summarize=rows=>rows.reduce((sum,b)=>{
      const reserved=Number(b.reserved||0), incomplete=Number(b.incomplete||0), complete=Number(b.quantity);
      return {total:sum.total+complete+incomplete,reserved:sum.reserved+reserved,incomplete:sum.incomplete+incomplete,
        available:sum.available+complete-(stockV105()?reserved:0)};
    },{total:0,reserved:0,incomplete:0,available:0});
    const modelStock=summarize(allBatches);
    const hasOption=(batch,option)=>Object.values(configs.get(batch.configuration_id).selections||{}).some(value=>[value].flat().includes(option));
    const batches=allBatches.filter(b=>Object.values(detailFilters).every(option=>!option||hasOption(b,option)));
    const groupFilter=kind=>{
      const button=(id,label)=>`<button type="button" class="btn secondary" data-detail-kind="${kind}" data-detail-option="${esc(id)}" aria-pressed="${detailFilters[kind]===id}">${label}</button>`;
      const openingIds=new Set(allBatches.map(batch=>batch.opening_id||batch.id));
      const shortages=kind==='critical'?state.critical_quantities.filter(entry=>openingIds.has(entry.opening_id)):[];
      const sections=groups(kind).flatMap(group=>options(group).map(option=>{
        const total=summarize(allBatches.filter(batch=>hasOption(batch,option.id))).available;
        const missing=shortages.filter(entry=>entry.option_id===option.id).reduce((sum,entry)=>sum+Number(entry.missing_quantity),0);
        return button(option.id,`${esc(option.label)} <strong>${formatQty(total)}</strong>`)+
          (missing>0?`<small>Recorded opening shortage: ${formatQty(missing)}</small>`:'');
      })).join('');
      return `<details data-detail-section="${kind}" ${detailSections[kind]?'open':''}><summary>${kind==='critical'?'Critical':'Normal'} Group</summary><div class="stock-normal-row">${button('','All')}${sections}</div></details>`;
    };
    const buckets=new Map();
    const price=n=>n==null?'—':Number(n).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
    const supportsCannibalise=stockV105()&&ledgerCap('move_stock')
      &&(state.parts||[]).some(p=>p.series_key===model.family&&!p.retired);
    const batchRows=new Map(batches.map(b=>{
      const config=configs.get(b.configuration_id);
      const group=config.variant?'variant:'+config.variant:'configuration:'+config.id;
      if(!buckets.has(group))buckets.set(group,[]);
      buckets.get(group).push(b);
      const qty=summarize([b]);
      const values=[b.received_on||localDate(b.created_at),locationLabel(b.location_id),price(b.cost),formatQty(qty.total),formatQty(qty.reserved),stockV105()?formatQty(qty.incomplete):'—',formatQty(qty.available)];
      const actions=ledger()?[
        ['adjust','+','adjust_stock','Add or adjust stock'],
        ['reserve','R','reserve_stock','Reserve stock'],
        ['issue','−','confirm_stock_out','Deduct stock']
      ].filter(([action, ,permission])=>ledgerCap(permission)&&(action==='adjust'||qty.available>0)).map(([action,label,,title])=>
        `<button type="button" class="stock-row-action ${action}" data-row-action="${action}" data-position="${b.id}" aria-label="${title}">${label}</button>`).join('')+(editMode&&ledgerCap('edit_stock_batch')?`<button type="button" class="stock-row-action" data-edit-position="${b.id}" aria-label="Edit batch">✎</button>`:'')+(editMode&&ledgerCap('delete_stock_batch')?`<button type="button" class="stock-row-action delete-batch" data-cancel-position="${b.id}" aria-label="Delete batch">×</button>`:''):'';
      const canStrip=supportsCannibalise&&(qty.available>=1||qty.incomplete>0);
      return [b.id,`<tr>${values.map(v=>`<td>${esc(v)}</td>`).join('')}<td><div class="stock-row-actions">${actions}${canStrip?`<button type="button" class="stock-row-action" data-row-action="cannibalise" data-position="${b.id}">Cannibalise</button>`:actions?'':'—'}</div></td></tr>`];
    }));
    const metrics=['Cost (RM)','Total','Reserve','Not Complete','On Hand'];
    const headings=labels=>labels.map(label=>`<th scope="col">${esc(label)}</th>`).join('');
    const rows=[...buckets.entries()].map(([group,members],index)=>{
      const config=configs.get(members[0].configuration_id),variant=config.variant||configLabel(config);
      const qty=summarize(members),key=JSON.stringify([selected,group]),open=expandedConfigurations.has(key);
      const costs=members.filter(b=>b.quantity>0&&b.cost!=null).map(b=>Number(b.cost));
      return `<tbody><tr class="stock-configuration-summary">
        <th scope="row"><button type="button" class="stock-link" aria-expanded="${open}" aria-controls="bucket-${index}" data-bucket="${esc(key)}">${open?'▾':'▸'} ${esc(variant)}</button></th>
        <td></td><td>${costs.length?price(Math.max(...costs)):'—'}</td><td>${formatQty(qty.total)}</td>
        <td>${formatQty(qty.reserved)}</td><td>${stockV105()?formatQty(qty.incomplete):'—'}</td><td>${formatQty(qty.available)}</td><td></td>
      </tr></tbody>
      <tbody class="stock-configuration-batches" ${open?'':'hidden'} id="bucket-${index}">
        <tr>${headings(['Date','Location',...metrics,'Actions'])}</tr>${members.map(b=>batchRows.get(b.id)).join('')}
      </tbody>`;
    });
    const configurationTable=`<div class="stock-scroll"><table class="stock-phase2-table stock-configuration-table${supportsCannibalise?' has-cannibalise':''}" aria-label="Configuration stock">
      <colgroup><col><col><col><col><col><col><col><col></colgroup>
      <thead><tr>${headings(['Configuration','',...metrics,''])}</tr></thead>
      ${rows.join('')||'<tbody><tr><td colspan="8">No stock matches these filters.</td></tr></tbody>'}
      </table></div>`;
    return `<div class="stock-detail-head"><button class="btn secondary" id="stockDetailBack">Back</button><h2>${esc(model.model)}</h2></div>
      <div class="stock-detail-metrics">${[['Total',formatQty(modelStock.total)],['Reserve',ledger()?formatQty(modelStock.reserved):'—'],['Not Complete',stockV105()?formatQty(modelStock.incomplete):'—'],['On Hand',formatQty(modelStock.available)]].map(([label,value],i)=>
        `<div><b>${label}</b>${i===1||i===2?`<button class="stock-link" data-stock-metric="${i}">${value}<span class="stock-sr"> View ${label} details</span></button>`:`<strong>${value}</strong>`}</div>`).join('')}</div>
      <p id="stockMetricStatus" class="stock-metrics-note" role="status" hidden></p>
      ${groupFilter('critical')}${groupFilter('normal')}<h3>Stock by configuration</h3>
      ${editMode&&ledgerCap('edit_stock_batch')&&batchEdit?stockBatchEditor(batchEdit):''}
      <label>Sort by date<select id="stockDateOrder"><option value="oldest">Oldest First</option><option value="newest" ${newestFirst?'selected':''}>Newest First</option></select></label>
      <p class="stock-metrics-note">Opening dates identify the historical count. Purchase batches show their receiving date.</p>
      ${configurationTable}
      ${stockV105()?componentAvailability(model,allBatches,configs):''}`;
  }
  function stockBatchEditor(batch){
    const config=state.configurations.find(c=>c.id===batch.configuration_id);
    if(!config)return '';
    const active=groups(),linked=active.some(g=>g.kind==='linked');
    const lot=ledger().lots.find(l=>l.id===batch.lot_id);
    const shared=ledger().positions.some(p=>p.lot_id===batch.lot_id&&p.id!==batch.id&&Number(p.quantity)>0);
    const selections=active.map(g=>{
      const prior=[config.selections[g.id]].flat().filter(Boolean),multiple=g.kind==='normal'&&g.series_key;
      const choices=state.options.filter(option=>option.group_id===g.id&&(!option.retired||prior.includes(option.id))).sort(sort);
      return `<label>${esc(g.label)}<select data-correction-group="${g.id}" ${multiple?'multiple':''}>${multiple?'':'<option value="">Select an option</option>'}
       ${choices.map(o=>`<option value="${o.id}" ${prior.includes(o.id)?'selected':''}>${esc(o.label)}${o.retired?' (archived)':''}</option>`).join('')}</select></label>`;
    }).join('');
    const quantityEditable=stockV105()&&batch.original_quantity!=null&&!batch.serialised&&!batch.incomplete;
    return `<form id="stockBatchCorrection" class="stock-inline-fields">
      <h3>Edit Stock Batch</h3>
      <details><summary>Goods Details</summary><div class="stock-inline-fields">
      ${linked?'':`<label>Pricelist configuration<select name="variant">${choiceOptions(config.variant)}</select></label>`}
      ${selections}
      </div></details>
      <details open><summary>Goods Cost, Location &amp; Quantity</summary><div class="stock-inline-fields">
      <label>Location<select name="location"><option value="">Not Assigned</option>${refOptions('location',batch.location_id)}</select></label>
      <label>Original Quantity<input readonly value="${esc(batch.original_quantity??(stockV105()?'—':batch.quantity))}"></label>
      ${quantityEditable?`<label>Corrected Quantity<input name="corrected" type="number" min="0" step="any" required value="${esc(batch.effective_quantity)}"></label>
      <label>Quantity Adjustment<input name="adjustment" readonly value="0"></label>`:'<p>Receiving quantity is read-only for this batch.</p>'}
      ${state.can_cost?`<label>Landed unit cost (RM)<input name="cost" type="number" min="0" step="any" value="${batch.cost??''}" ${shared?'disabled':''}></label>`:''}
      ${state.can_cost?'<label>Total Stock Value (RM)<input name="stock_value" readonly></label>':''}
      <label>Remark<input name="remark" value="${esc(lot.remarks)}" ${shared?'disabled':''}></label>
      ${shared?'<p>Cost and remark are shared by the active positions in this receiving lot.</p>':''}
      <label>Correction reason<input name="reason" required></label>
      </div></details>
      <div class="stock-inline-footer"><button class="btn">Save Correction</button><button type="button" class="btn secondary" id="stockBatchCancel">Cancel</button></div>
    </form>`;
  }
  function bindStockBatchEditor(){
    const form=$('stockBatchCorrection');
    if(!form)return;
    const batch=batchEdit;
    $('stockBatchCancel').onclick=()=>{batchEdit=null;render();};
    const controls=[...form.querySelectorAll('[data-correction-group]')];
    const readSelections=()=>Object.fromEntries(controls.flatMap(control=>{
      const value=control.multiple?[...control.selectedOptions].map(o=>o.value).sort():control.value;
      return value.length?[[control.dataset.correctionGroup,value]]:[];
    }));
    const initialSelections=JSON.stringify(readSelections());
    const initialVariant=form.elements.variant?.value;
    const initialCost=form.elements.cost?.value,initialRemark=form.elements.remark.value;
    const updateValue=()=>{
      const previous=Number(batch.effective_quantity??batch.quantity);
      const delta=form.elements.corrected?.value!==undefined?Number(form.elements.corrected.value)-previous:0;
      if(form.elements.adjustment)form.elements.adjustment.value=Number(delta.toFixed(12));
      if(form.elements.stock_value)form.elements.stock_value.value=form.elements.cost.value===''?'—':
        ((Number(batch.quantity)+Number(batch.incomplete||0)+delta)*Number(form.elements.cost.value)).toFixed(2);
    };
    form.oninput=updateValue;updateValue();
    form.onsubmit=e=>{
      e.preventDefault();
      if(!editMode||!ledgerCap('edit_stock_batch'))return;
      const fields=new FormData(form);
      const draft=readSelections();
      const payload={position:batch.id,revision:batch.edit_revision??0,expected_quantity:batch.quantity,location_id:fields.get('location'),reason:fields.get('reason')};
      if(JSON.stringify(draft)!==initialSelections||fields.has('variant')&&fields.get('variant')!==initialVariant){
        payload.selections=draft;
        if(fields.has('variant'))payload.variant=fields.get('variant');
      }
      if(fields.has('remark')&&fields.get('remark')!==initialRemark)payload.remark=fields.get('remark');
      if(fields.has('cost')&&fields.get('cost')!==initialCost)payload.unit_cost_myr=fields.get('cost')===''?null:Number(fields.get('cost'));
      if(fields.has('corrected')&&Number(fields.get('corrected'))!==Number(batch.effective_quantity)){
        payload.corrected_quantity=fields.get('corrected');
        submitRequest(form,'edit_batch',payload,()=>{batchEdit=null;});
      }else save('edit_batch',payload,()=>{batchEdit=null;});
    };
  }
  function bindStockDetail(){
    const root=$('stockContent');
    root.querySelectorAll('[data-detail-section]').forEach(node=>node.ontoggle=()=>{if(node.isConnected)detailSections[node.dataset.detailSection]=node.open;});
    root.querySelectorAll('[data-detail-option]').forEach(button=>button.onclick=()=>{
      detailSections[button.dataset.detailKind]=true;
      detailFilters[button.dataset.detailKind]=button.dataset.detailOption;render();
    });
    root.querySelectorAll('[data-edit-position]').forEach(button=>button.onclick=()=>{
      if(!editMode||!ledgerCap('edit_stock_batch'))return;
      const batch=currentBatches().find(b=>b.id===button.dataset.editPosition);
      if(!batch)return;
      if(Number(batch.reserved)>0)return message('Release active reservations before correcting this batch.',true);
      batchEdit=batch;render();$('stockBatchCorrection')?.scrollIntoView({block:'nearest'});
    });
    bindStockBatchEditor();
    root.querySelectorAll('[data-bucket]').forEach(b=>b.onclick=()=>{
      const row=$(b.getAttribute('aria-controls')),key=b.dataset.bucket;
      row.hidden=!row.hidden;
      if(row.hidden)expandedConfigurations.delete(key);else expandedConfigurations.add(key);
      b.setAttribute('aria-expanded',String(!row.hidden));
      b.textContent=(row.hidden?'▸':'▾')+b.textContent.slice(1);
    });
    $('stockContent').querySelectorAll('[data-cancel-position]').forEach(b=>b.onclick=()=>{if(!editMode||!ledgerCap('delete_stock_batch'))return;const reason=prompt('Reason for cancelling this receiving batch')?.trim();if(reason&&confirm('Cancel the entire batch and record a reversal?'))save('cancel_batch',{position:b.dataset.cancelPosition,reason,request_id:uid()})});
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
  const partPurpose={customer:'Customer spare part',repair:'Repair another pump',spare:'Keep as spare stock'};
  const partSpecs=(part,config)=>Object.fromEntries((part.group_ids||[]).map(id=>[id,config?.selections?.[id]??null]));
  const specNames=specs=>Object.entries(specs||{}).map(([id,value])=>{
    const group=state.groups.find(g=>g.id===id);
    const labels=[value].flat().filter(Boolean).map(v=>state.options.find(o=>o.id===v)?.label||v);
    return `${group?.label||'Recorded specification'}: ${labels.join(', ')||'Unspecified'}`;
  }).join(' · ');
  const savedSpecNames=part=>Object.values(part.specification_labels||{}).map(x=>`${x.group}: ${x.options.join(', ')||'Unspecified'}`).join(' · ');
  const partRows=()=>state.missing_components||[];
  const unitById=id=>(state.incomplete_units||[]).find(u=>u.id===id);
  const unitLabel=u=>u?.serial||u?.id.slice(0,8)||'—';
  const sameSpecs=(a,b)=>JSON.stringify(Object.entries(a||{}).sort())===JSON.stringify(Object.entries(b||{}).sort());
  function componentAvailability(model,batches,configs){
    const parts=(state.parts||[]).filter(p=>p.series_key===model.family&&!p.retired);
    if(!parts.length)return '';
    const summaries=new Map(),batchIds=new Set(batches.map(b=>b.id));
    const openUnits=new Map((state.incomplete_units||[]).filter(u=>batchIds.has(u.position_id)&&!u.closed_at).map(u=>[u.id,u]));
    const add=(part,specs,present,spare)=>{
      const key=part.id+':'+JSON.stringify(Object.entries(specs).sort());
      const row=summaries.get(key)||{part,specs,present:0,spare:0};
      row.present+=present;row.spare+=spare;summaries.set(key,row);
    };
    for(const part of parts)for(const batch of batches){
      add(part,partSpecs(part,configs.get(batch.configuration_id)),(batch.total??Number(batch.quantity))*part.units_per_pump,0);
    }
    const allConfigs=configById();
    for(const missing of partRows()){
      const part=parts.find(p=>p.id===missing.part_id);
      if(!part)continue;
      const unit=unitById(missing.unit_id);
      if(!missing.restored_event&&openUnits.has(missing.unit_id))add(part,missing.specifications,-Number(missing.quantity),0);
      if(missing.spare_available>0&&allConfigs.get(unit?.configuration_id)?.item_key===model.key)
        add(part,missing.specifications,0,Number(missing.spare_available));
    }
    return `<details class="stock-component-availability"><summary>Physical Component Availability</summary>
      ${stockTable(['Component','Specifications','Present in pumps','Separate spare stock'],[...summaries.values()].map(row=>
        textRow([row.part.label,specNames(row.specs),formatQty(row.present),formatQty(row.spare)])),'No components recorded.')}</details>`;
  }
  function cannibalisationRecords(){
    if(!stockV105())return '';
    const configs=configById(),models=new Map(items().map(i=>[i.key,i]));
    const events=new Map(ledger().events.map(e=>[e.id,e]));
    const rows=partRows().flatMap(part=>{
      const unit=unitById(part.unit_id),cfg=configs.get(unit?.configuration_id);
      const model=models.get(cfg?.item_key),event=events.get(part.removed_event),restoration=events.get(part.restored_event);
      if(!model||!event||!textMatch(model.model,missingFilter.model)||!textMatch(model.family,missingFilter.series)
        ||!textMatch(part.part_label,missingFilter.component))return [];
      return [`<tr>${[model.model,configLabel(cfg),locationLabel(unit.location_id),unitLabel(unit),part.part_label,
        savedSpecNames(part)||specNames(part.specifications),part.quantity,event.effective_on,partPurpose[part.purpose],
        event.reference,restoration?'Restored':'Missing',part.spare_available].map(x=>`<td>${esc(x)}</td>`).join('')}
        <td><details class="stock-movement-detail"><summary>Details</summary>
        <p>Batch ${esc(unit.lot_id)} · Position ${esc(unit.position_id)}</p><p>Removed by ${esc(event.actor)} · ${esc(event.reason)} · ${esc(event.remark)}</p>
        ${restoration?`<p>Restored ${esc(restoration.effective_on)} by ${esc(restoration.actor)} · ${esc(restoration.reference)} · ${esc(restoration.reason)}</p>`:''}</details>
        ${!restoration&&ledgerCap('move_stock')?`<button type="button" class="btn secondary" data-restore-part="${part.id}">Restore Parts</button>`:''}</td></tr>`];
    });
    return `<h3>Cannibalisation &amp; Restoration</h3><div id="stockRestorePanel"></div>
      ${stockTable(['Model','Configuration','Location','Pump','Component','Specifications','Qty','Date','Purpose','Reference','Status','Spare Stock','Actions'],
        rows,'No cannibalisation records match these filters.')}`;
  }
  function bindRestoreParts(){
    $('stockMissingResults').querySelectorAll('[data-restore-part]').forEach(button=>button.onclick=()=>{
      const part=partRows().find(p=>p.id===button.dataset.restorePart);
      const configs=configById(),key=configs.get(unitById(part.unit_id)?.configuration_id)?.item_key;
      const donors=partRows().filter(p=>p.spare_available>=part.quantity&&p.part_id===part.part_id&&sameSpecs(p.specifications,part.specifications)
        &&configs.get(unitById(p.unit_id)?.configuration_id)?.item_key===key);
      const root=$('stockRestorePanel');
      root.innerHTML=`<form class="stock-inline-fields"><h3>Restore ${esc(part.part_label)}</h3>
        <label>Pump<input readonly value="${esc(unitLabel(unitById(part.unit_id)))}"></label>
        <label>Required specifications<textarea readonly rows="2">${esc(savedSpecNames(part)||specNames(part.specifications))}</textarea></label>
        <label>Quantity<input readonly value="${esc(part.quantity)}"></label>
        <label>Replacement source<select name="spare_source"><option value="">External replacement</option>
          ${donors.map(p=>`<option value="${p.id}">Retained spare · ${esc(unitLabel(unitById(p.unit_id)))} · ${p.spare_available} available</option>`).join('')}</select></label>
        <label data-external>Replacement reference<input name="replacement_reference" required></label>
        ${dateField()}<label>Reason<input name="reason" required></label><label>Remark<input name="remark"></label>
        <label>Verify matching part and specifications<input type="checkbox" required></label>
        <div class="stock-inline-footer"><button class="btn">Restore Parts</button><button type="button" class="btn secondary" data-restore-cancel>Cancel</button></div></form>`;
      const form=root.querySelector('form'),reference=form.elements.replacement_reference;
      form.elements.spare_source.onchange=e=>{reference.disabled=!!e.target.value;root.querySelector('[data-external]').hidden=reference.disabled;};
      root.querySelector('[data-restore-cancel]').onclick=()=>root.replaceChildren();
      form.onsubmit=e=>{
        e.preventDefault();
        submitLedger(form,'restore_parts',{...formData(form),missing_id:part.id,part_id:part.part_id,quantity:part.quantity,specifications:part.specifications});
      };
      root.scrollIntoView?.({block:'nearest'});
    });
  }
  function missingResults(){
    return stockTable(['Model','Configuration','Missing Component','Qty Affected','Required','Available','Shortage'],missingRows(),'No recorded opening shortages match these filters.')+cannibalisationRecords();
  }
  function missingParts(){
    return `<h2>Missing Parts</h2><p class="stock-metrics-note">Historical opening shortages and tracked component removals are displayed in separate tables.</p>
      <div class="stock-tools">${Object.entries(missingFilter).map(([key,value])=>
        `<label>${{model:'Model',series:'Series',component:'Component'}[key]}<input type="search" data-missing-filter="${key}" value="${esc(value)}"></label>`).join('')}</div>
      <div id="stockMissingResults">${missingResults()}</div>`;
  }
  function timeFrame(id,filter,days){
    const choices=[...days.map(n=>[String(n),'Last '+n+' Days']),['all','All Time'],['custom','Custom Date Range']];
    const label=choices.find(([value])=>value===filter.period)[1];
    return `<details id="${id}" ${filter.open?'open':''}><summary>Time Frame · ${label}</summary>
      <div class="stock-inline-fields"><label>Period<select data-period>${choices.map(([value,label])=>
        `<option value="${value}" ${value===filter.period?'selected':''}>${label}</option>`).join('')}</select></label>
        ${filter.period==='custom'?`<label>From<input type="date" data-date="from" value="${esc(filter.from)}"></label>
          <label>To<input type="date" data-date="to" value="${esc(filter.to)}"></label>`:''}</div></details>`;
  }
  function bindTimeFrame(id,filter,refresh){
    const element=$(id);
    element.ontoggle=()=>{if(element.isConnected)filter.open=element.open;};
    element.querySelector('[data-period]').onchange=e=>{
      filter.period=e.target.value;
      filter.open=element.open;
      timeFramePreference(id,filter);
      element.outerHTML=timeFrame(id,filter,timeFrameDays[id]);
      bindTimeFrame(id,filter,refresh);
      $(id).querySelector('[data-period]').focus();
      refresh?.();
    };
    element.querySelectorAll('[data-date]').forEach(input=>input.onchange=()=>{
      filter[input.dataset.date]=input.value;
      timeFramePreference(id,filter);
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
      const components=partRows().filter(m=>m.removed_event===e.id||m.restored_event===e.id);
      const note=components.length?[...new Set(components.map(x=>x.part_label+' · '+partPurpose[x.purpose]))].join(', '):'Recorded';
      rows.push({date:e.effective_on,at:e.recorded_at,values:[e.effective_on,e.model,e.serials.join(', ')||'—',
        actionLabels[e.kind]||e.kind,formatQty(Number(e.quantity)),e.reference||'—',e.customer||e.supplier||'—',
        [...new Set([e.source_location,e.destination_location].filter(Boolean))].join(' → ')||'—',note]});
    }
    if(!historyFilter.serial.trim())for(const correction of state.quantity_corrections||[]){
      const detail=correction.detail, model=models.get(configs.get(detail.configuration)?.item_key);
      if(!model||!textMatch(model.model,historyFilter.model))continue;
      const date=localDate(correction.at);
      const values=[date,model.model,'—','Receiving Quantity Correction',formatQty(Number(detail.adjustment)),'—','—',locationLabel(detail.location)];
      const audit=`<details class="stock-movement-detail"><summary>${esc(detail.previous_quantity)} → ${esc(detail.corrected_quantity)}</summary>
        <p>Original quantity ${esc(detail.original_quantity)} · On Hand ${esc(detail.previous_on_hand)} → ${esc(detail.corrected_on_hand)}</p>
        ${Object.hasOwn(correction,'previous_stock_value')?`<p>Stock value (RM) ${esc(correction.previous_stock_value??'—')} → ${esc(correction.corrected_stock_value??'—')}</p>`:''}
        <p>Batch ${esc(detail.lot)} · Position ${esc(detail.position)}</p>
        <p>${esc(correction.actor)} · ${esc(new Date(correction.at).toLocaleString())} · ${esc(detail.reason)}</p></details>`;
      rows.push({date,at:correction.at,html:`<tr>${values.map(v=>`<td>${esc(v)}</td>`).join('')}<td>${audit}</td></tr>`});
    }
    const visible=rows.filter(e=>matchesPeriod(e.date,historyFilter))
      .sort((a,b)=>b.date.localeCompare(a.date)||b.at.localeCompare(a.at)).map(e=>e.html||textRow(e.values));
    const current=currentBatches().reduce((sum,b)=>sum+(!b.voided_at
      &&configs.get(b.configuration_id)?.item_key===historyFilter.selected?(b.total??Number(b.quantity)):0),0);
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
      ${timeFrame('stockHistoryTime',historyFilter,timeFrameDays.stockHistoryTime)}
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
  const groupingLabels={linked:'Pricelist Link',critical:'Critical Group',normal:'Normal Group',parts:'Cannibalisation Parts'};
  let linkDraft=null;
  const arrangements=()=>state.groups.filter(g=>g.series_key===dropdownSeries&&g.kind==='linked'&&!g.retired).sort(sort);
  const seriesMappings=()=> (state.series_mappings||[]).filter(m=>m.series_key===dropdownSeries&&!m.retired);
  function mappingStatus(m,configurations){
    const gs=arrangements();
    if(!configurations.has(m.variant))return 'Unavailable Pricelist configuration';
    if(!gs.length||Object.keys(m.selections).length!==gs.length||gs.some(g=>!options(g).some(o=>o.id===m.selections[g.id])))return 'Incomplete — update combination';
    if(seriesMappings().some(x=>x.id!==m.id&&JSON.stringify(Object.entries(x.selections).sort())===JSON.stringify(Object.entries(m.selections).sort())))return 'Ambiguous — review mappings';
    return 'Mapped';
  }
  function pricelistDetails(option,members,configurations,editable){
    if(!['v104','v105'].includes(state.config_version))return '<p>The KeyStock V1.04 migration is required for Pricelist Link editing.</p>';
    const gs=arrangements(),maps=seriesMappings(),disabled=editable?'':'disabled';
    const button=(action,id,label)=>`<button type="button" class="btn secondary" data-link-action="${action}" data-id="${esc(id||'')}" ${disabled}>${label}</button>`;
    let form='';
    if(linkDraft&&editable){
      const d=linkDraft;
      form=`<form id="stockLinkForm"><h3>${d.id?'Edit':'Add'} ${d.type==='arrangement'?'dropdown arrangement':d.type==='option'?'selection option':'exact mapping'}</h3>`;
      if(d.type==='mapping')form+=`<label>Exact Pricelist configuration<select name="variant" required>${[...configurations.values()].map(v=>`<option value="${esc(v.id)}" ${d.variant===v.id?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label>`+
        gs.map(g=>`<label>${esc(g.label)}<select data-map-group="${g.id}" required><option value="">Select</option>${options(g).map(o=>`<option value="${o.id}" ${d.selections?.[g.id]===o.id?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`).join('');
      else form+=`<label>Name<input name="label" maxlength="120" required value="${esc(d.label||'')}"></label>${d.type==='arrangement'?`<label>Display order<input name="sort_order" type="number" step="1" min="0" max="9999" value="${d.sort_order||0}"></label>`:''}`;
      form+='<div class="stock-actions"><button class="btn">Save</button><button type="button" class="btn secondary" id="stockLinkCancel">Cancel</button></div></form><hr>';
    }
    return form+(option?`<h3>${esc(option.label)}</h3>${dropdownSeries==='KV'&&window.KeySuiteKVV50026?.materials?.[option.id]?`<p>${esc(window.KeySuiteKVV50026.materials[option.id])}</p>`:''}<p><strong>${maps.some(m=>m.variant===option.id&&mappingStatus(m,configurations)==='Mapped')?'Mapped':'Unmapped'}</strong> · Valid for ${option.models.length} of ${members.length} models.</p>
      <details><summary>Applicable models</summary><ul>${option.models.map(m=>`<li>${esc(m.model)}</li>`).join('')}</ul></details>
      <h4>Saved mappings</h4>${maps.filter(m=>m.variant===option.id).map(m=>`<div class="stock-link-record"><strong>${esc(mappingStatus(m,configurations))}</strong><p>${Object.entries(m.selections).map(([id,value])=>`${esc(state.groups.find(g=>g.id===id)?.label||'Removed arrangement')}: ${esc(state.options.find(o=>o.id===value)?.label||'Removed option')}`).join('<br>')}</p><div class="stock-actions">${button('edit-mapping',m.id,'Edit')}${button('delete-mapping',m.id,'Delete')}</div></div>`).join('')||'<p>No saved mapping for this configuration.</p>'}
      ${gs.length?button('add-mapping','','＋ Add Mapping'):'<p>Create a dropdown arrangement below to define a combination.</p>'}`:'<p>No Pricelist configurations for this series.</p>')+
      `<hr><h3>Dropdown arrangements</h3><p class="stock-browser-note">Shared across this series. Each combination must select one option from every arrangement. Model availability is checked when stock is received.</p>
      ${gs.map(g=>`<details class="stock-link-record"><summary>${esc(g.label)}</summary><div class="stock-actions">${button('edit-arrangement',g.id,'Edit arrangement')}${button('delete-arrangement',g.id,'Delete arrangement')}</div>
      ${options(g).map(o=>`<div class="stock-link-option"><span>${esc(o.label)}</span>${button('edit-option',o.id,'Edit')}${button('delete-option',o.id,'Delete')}</div>`).join('')||'<p>No selection options yet.</p>'}${button('add-option',g.id,'＋ Add Selection Option')}</details>`).join('')}
      ${button('add-arrangement','','＋ Add Dropdown Arrangement')}${maps.filter(m=>!configurations.has(m.variant)).map(m=>`<div class="stock-link-record">Unavailable: ${esc(m.variant)} ${button('edit-mapping',m.id,'Repair')}${button('delete-mapping',m.id,'Delete')}</div>`).join('')}
      ${editable?'':'<p class="stock-browser-note">Hold “Hold 3s to Edit” to make changes.</p>'}`;
  }
  function bindPricelist(){
    const editable=()=>!busy&&editMode&&canDropdowns();
    $('stockContent').querySelectorAll('[data-link-action]').forEach(b=>b.onclick=()=>{
      if(!editable())return;
      const [action,type]=b.dataset.linkAction.split('-'),id=b.dataset.id;
      const source=type==='arrangement'?state.groups:type==='option'?state.options:seriesMappings();
      const old=source.find(x=>x.id===id);
      if(action==='delete'){
        if(!old||!(type==='option'?confirmOptionRemoval(old):window.confirm(`Delete this ${type}? Existing stock history is retained.`)))return;
        save(type==='arrangement'?'arrangement_delete':type==='option'?'link_option_delete':'series_mapping_delete',
          {series_key:dropdownSeries,id,revision:old.revision,group_id:old.group_id},()=>{linkDraft=null;});return;
      }
      linkDraft={type,...(action==='edit'?structuredClone(old):type==='mapping'?{variant:dropdownOption,selections:{}}:type==='option'?{group_id:id}:{})};
      render();$('stockLinkForm')?.scrollIntoView({block:'nearest'});
    });
    if($('stockLinkCancel'))$('stockLinkCancel').onclick=()=>{linkDraft=null;render();};
    if($('stockLinkForm'))$('stockLinkForm').onsubmit=e=>{
      e.preventDefault();if(!editable()||!linkDraft)return;
      const f=e.target,d=linkDraft;
      if(d.type==='mapping'){
        d.variant=f.elements.variant.value;
        d.selections=Object.fromEntries([...f.querySelectorAll('[data-map-group]')].map(s=>[s.dataset.mapGroup,s.value]));
      }else{d.label=f.elements.label.value;if(d.type==='arrangement')d.sort_order=Number(f.elements.sort_order.value);}
      save(d.type==='arrangement'?'arrangement_save':d.type==='option'?'link_option_save':'series_mapping_save',
        {...d,series_key:dropdownSeries},()=>{if(d.type==='mapping')dropdownOption=d.variant;linkDraft=null;});
    };
  }
  function confirmOptionRemoval(option){
    const referenced=state.configurations.some(c=>[c.selections?.[option.group_id]].flat().includes(option.id))
      ||state.critical_quantities.some(q=>q.option_id===option.id)
      ||[...state.mappings,...(state.series_mappings||[])].some(m=>m.selections?.[option.group_id]===option.id);
    const warning=referenced?' Existing stock and historical labels are retained. Pricelist combinations using this option will be removed from future receiving.':'';
    return window.confirm(`Remove “${option.label}” from future stock selections?${warning}`);
  }
  function seriesDropdowns(){
    if(!['v103','v104','v105'].includes(state.config_version))return '<h2>Dropdown Management</h2><p>The V1.04 database update is required for this interface.</p>';
    const catalog=state.catalog||[], series=[...new Set(catalog.map(i=>i.family))];
    const preferred=['ES','ISO','CHC_G1','CHC_G2','CR','KV','BSV','BSW'];
    series.sort((a,b)=>(preferred.includes(a)?preferred.indexOf(a):99)-(preferred.includes(b)?preferred.indexOf(b):99)||natural.compare(a,b));
    if(!series.includes(dropdownSeries)){dropdownSeries=series[0]||'';dropdownOption='';optionDraft=null;}
    const members=catalog.filter(i=>i.family===dropdownSeries), label=seriesLabels[dropdownSeries]||dropdownSeries;
    const group=state.groups.find(g=>g.series_key===dropdownSeries&&g.kind===dropdownKind&&!g.retired);
    const configurations=new Map();
    for(const model of members)for(const choice of model.choices||[]){
      if(!configurations.has(choice.code))configurations.set(choice.code,{id:choice.code,label:choice.label,models:[]});
      configurations.get(choice.code).models.push(model);
    }
    const seriesParts=()=> (state.parts||[]).filter(p=>p.series_key===dropdownSeries&&!p.retired);
    const list=dropdownKind==='linked'?[...configurations.values()]:dropdownKind==='parts'?seriesParts():group?options(group):[];
    if(!list.some(o=>o.id===dropdownOption))dropdownOption=list[0]?.id||'';
    const option=list.find(o=>o.id===dropdownOption), editable=editMode&&canDropdowns();
    const row=(attribute,id,text,active,sub='')=>`<button type="button" class="stock-browser-row" ${attribute}="${esc(id)}" aria-pressed="${active}"><span>${esc(text)}${sub?`<small>${esc(sub)}</small>`:''}</span><span aria-hidden="true">›</span></button>`;
    let details='';
    if(dropdownKind==='linked'){
      details=pricelistDetails(option,members,configurations,editable);
    }else if(dropdownKind==='parts'){
      const active=state.groups.filter(g=>g.series_key===dropdownSeries&&!g.retired&&['linked','critical','normal'].includes(g.kind)).sort(sort);
      details=optionDraft&&editable?`<form id="stockSeriesOptionForm"><h3>${optionDraft.id?'Edit Part':'Add Part'}</h3>
        <label>Part name<input name="label" required maxlength="120" value="${esc(optionDraft.label)}"></label>
        <label>Units per pump<input name="units_per_pump" type="number" required min="1" max="10000" value="${optionDraft.units_per_pump??1}"></label>
        <label>Stock specification mappings<select name="group_ids" multiple size="6" required>
          ${active.map(g=>`<option value="${g.id}" ${optionDraft.group_ids?.includes(g.id)?'selected':''}>${esc(groupingLabels[g.kind])} · ${esc(g.label)}</option>`).join('')}</select></label>
        ${active.length?'':'<p>Set up a stock specification group for this series first.</p>'}
        <div class="stock-actions"><button class="btn">Save Part</button><button type="button" class="btn secondary" id="stockOptionCancel">Cancel</button></div></form>`:
        `<p class="stock-browser-applies">Available to all ${members.length} ${esc(label)} models</p>
        ${option?`<h3>${esc(option.label)}</h3><p>Units per pump: ${option.units_per_pump}</p>
          <ul>${option.group_ids.map(id=>{const g=state.groups.find(g=>g.id===id);return `<li>${esc(groupingLabels[g?.kind]||'Stock group')} · ${esc(g?.label||id)}${g?.retired?' (archived)':''}</li>`;}).join('')}</ul>
          <div class="stock-actions"><button class="btn secondary" id="stockOptionEdit" ${editable?'':'disabled'}>Edit</button>
          <button class="btn stock-danger" id="stockOptionDelete" ${editable?'':'disabled'}>Deactivate</button></div>`:'<p>No parts configured for this series.</p>'}`;
    }else if(optionDraft&&editable){
      details=`<form id="stockSeriesOptionForm"><h3>${optionDraft.id?'Edit option':'Add option'}</h3>
        <label>Option name<input name="label" maxlength="120" required value="${esc(optionDraft.label)}" autocomplete="off"></label>
        <p>Applies to all ${members.length} ${esc(label)} models.</p><div class="stock-actions"><button class="btn">Save option</button><button type="button" class="btn secondary" id="stockOptionCancel">Cancel</button></div></form>`;
    }else{
      details=`<p class="stock-browser-applies">✓ Available to all ${members.length} ${esc(label)} models</p>
        ${option?`<hr><small>Selected option</small><h3>${esc(option.label)}</h3><div class="stock-actions">
        <button type="button" class="btn secondary" id="stockOptionEdit" ${editable?'':'disabled'}>Edit</button>
        <button type="button" class="btn stock-danger" id="stockOptionDelete" ${editable?'':'disabled'}>Delete</button></div>`:'<p>No options yet. Add an option to configure this series.</p>'}
        <hr><p class="stock-browser-note">${dropdownKind==='critical'?'Shared component definitions.':'Independent options; select all applicable options when receiving stock.'} No additional group creation is required.</p>
        ${editable?'':'<p class="stock-browser-note">Hold the “Hold 3s to Edit” button to make changes.</p>'}`;
    }
    return `<div class="stock-browser-heading"><div><h2>Dropdown Management</h2><p>Configure once for every model in a series</p></div><span>${editable?'Editing enabled':'View mode'}</span></div>
      <div class="stock-browser-scroll" tabindex="0" aria-label="Four-column dropdown configuration"><div class="stock-browser">
        <section aria-labelledby="stockSeriesTitle"><h3 id="stockSeriesTitle">1. Series</h3>${series.map(s=>row('data-series',s,seriesLabels[s]||s,s===dropdownSeries)).join('')}</section>
        <section aria-labelledby="stockGroupingTitle"><h3 id="stockGroupingTitle">2. Grouping</h3>${Object.entries(groupingLabels).filter(([k])=>k!=='parts'||stockV105()).map(([k,v])=>row('data-grouping',k,v,k===dropdownKind)).join('')}</section>
        <section aria-labelledby="stockOptionsTitle"><h3 id="stockOptionsTitle">3. ${dropdownKind==='linked'?'Configurations':dropdownKind==='parts'?'Parts':dropdownKind==='critical'?'Critical Options':'Normal Options'}</h3>
        ${list.map(o=>row('data-series-option',o.id,o.label,o.id===dropdownOption,dropdownKind==='linked'?(seriesMappings().some(m=>m.variant===o.id&&mappingStatus(m,configurations)==='Mapped')?'Mapped':'Unmapped'):'')).join('')||'<p class="stock-browser-note">No options configured.</p>'}
        ${dropdownKind==='linked'?'':`<button type="button" class="btn secondary stock-option-add" id="stockOptionAdd" ${editable?'':'disabled'}>＋ Add Option</button>`}</section>
        <section aria-labelledby="stockDetailsTitle"><h3 id="stockDetailsTitle">4. Option Details</h3><p>${esc(label)} — ${groupingLabels[dropdownKind]}</p>${details}</section>
      </div></div><p class="stock-browser-note">Series settings are shared automatically. Scroll horizontally on narrower screens.</p>`;
  }
  function bindSeriesDropdowns(){
    const root=$('stockContent');
    root.querySelectorAll('[data-series],[data-grouping],[data-series-option]').forEach(b=>b.onclick=()=>{
      if(b.dataset.series){dropdownSeries=b.dataset.series;dropdownOption='';}
      if(b.dataset.grouping){dropdownKind=b.dataset.grouping;dropdownOption='';}
      if(b.dataset.seriesOption)dropdownOption=b.dataset.seriesOption;
      optionDraft=null;linkDraft=null;render();
    });
    const editable=()=>!busy&&editMode&&canDropdowns();
    bindPricelist();
    if($('stockOptionAdd'))$('stockOptionAdd').onclick=()=>{if(!editable())return;optionDraft={label:''};render();$('stockSeriesOptionForm').elements.label.focus();};
    const records=dropdownKind==='parts'?state.parts:state.options;
    if($('stockOptionEdit'))$('stockOptionEdit').onclick=()=>{if(!editable())return;optionDraft={...records.find(o=>o.id===dropdownOption)};render();$('stockSeriesOptionForm').elements.label.focus();};
    if($('stockOptionCancel'))$('stockOptionCancel').onclick=()=>{optionDraft=null;render();};
    if($('stockSeriesOptionForm'))$('stockSeriesOptionForm').onsubmit=e=>{
      e.preventDefault();if(!editable())return;
      const label=e.target.elements.label.value.trim();
      if(!label)return message('Enter an option name.',true);
      // Keep a failed draft available for correction or a refresh after a conflict.
      optionDraft.label=label;
      const data={series_key:dropdownSeries,kind:dropdownKind,id:optionDraft.id,revision:optionDraft.revision,label};
      if(dropdownKind==='parts'){
        data.units_per_pump=e.target.elements.units_per_pump.value;
        data.group_ids=[...e.target.elements.group_ids.selectedOptions].map(o=>o.value);
        Object.assign(optionDraft,data);
      }
      save(dropdownKind==='parts'?'part_save':'series_option_save',data,result=>{
        dropdownOption=result.id;optionDraft=null;
      });
    };
    if($('stockOptionDelete'))$('stockOptionDelete').onclick=()=>{
      if(!editable())return;
      const option=records.find(o=>o.id===dropdownOption),part=dropdownKind==='parts';
      if(!option||!(part?confirm('Deactivate this part for new removals?'):confirmOptionRemoval(option)))return;
      save(part?'part_retire':'series_option_delete',{series_key:dropdownSeries,kind:dropdownKind,id:option.id,revision:option.revision},()=>{dropdownOption='';});
    };
  }
  const today=()=>localDate(Date.now());
  const actionLabels={issue:'Stock Out',return:'Customer Return',write_off:'Write Off',transfer:'Transfer Location',
    reconfigure:'Reconfigure Stock',adjust:'Add / Adjust Stock',reserve:'Reservation',release:'Return to Available',receive:'Receiving',
    cannibalise:'Cannibalise Stock',restore_parts:'Restore Parts'};
  const dateField=()=>`<label>Date<input type="date" name="date" value="${today()}" required></label>`;
  const qtyField=(max='')=>`<label>Quantity<input type="number" name="quantity" min="0" step="any" max="${max}" required></label>`;
  const serialField=(help='One serial per line or comma-separated')=>
    `<label>Serial numbers<textarea name="serials" placeholder="${esc(help)}"></textarea></label>`;
  const serialValues=value=>String(value||'').split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  const requestDrafts=new WeakMap();
  function submitRequest(form,action,p,after){
    if(busy)return;
    const signature=JSON.stringify([action,p]);
    const previous=requestDrafts.get(form);
    const requestId=previous?.signature===signature?previous.id:uid();
    requestDrafts.set(form,{signature,id:requestId});
    save(action,{...p,request_id:requestId},after);
  }
  const submitLedger=(form,action,p,after)=>submitRequest(form,'ledger_'+action,p,after);
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
    transfer:'move_stock',reconfigure:'move_stock',adjust:'adjust_stock',cannibalise:'move_stock'
  };
  const movementSelect=(name,label,choices,value,placeholder='Select '+label.toLowerCase())=>
    `<label>${label}<select name="${name}" required><option value="">${placeholder}</option>${choices.map(([id,text])=>
      `<option value="${esc(id)}" ${value===id?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
  function movementInputs(form,action,initialPosition){
    const configs=configById(),models=new Map(items().map(i=>[i.key,i]));
    const locations=new Map(state.locations.map(x=>[x.id,x]));
    const batches=currentBatches().filter(b=>!b.location_id||!locations.get(b.location_id)?.retired).sort((a,b)=>
      (a.received_on||localDate(a.created_at)).localeCompare(b.received_on||localDate(b.created_at))||
      Number(!a.opening_id)-Number(!b.opening_id)||Date.parse(a.created_at)-Date.parse(b.created_at)||a.lot_id.localeCompare(b.lot_id)||a.id.localeCompare(b.id));
    const partMode=action==='cannibalise',forcedBatch=partMode||action==='adjust';
    const sources=batches.filter(b=>action==='adjust'?b.quantity>0:partMode?b.available>=1||b.incomplete>0:b.available>0);
    const initial=sources.find(b=>b.id===initialPosition);
    const initialModel=models.get(configs.get(initial?.configuration_id)?.item_key);
    const draft={series:initialModel?.family||'',model:initialModel?.key||'',configuration:initial?.configuration_id||'',
      source_location:initial?(initial.location_id||'unassigned'):'',batch_method:forcedBatch?'manual':'fifo',
      position_id:initial?.id||'',date:today()};
    const modelKey=b=>configs.get(b.configuration_id)?.item_key;
    const sourceLoc=b=>b.location_id||'unassigned';
    const unique=(rows,key,label)=>[...new Map(rows.map(r=>[key(r),label(r)])).entries()];
    const returns=ledger().events.filter(e=>e.kind==='issue'&&e.quantity>e.returned);
    const candidates=()=>sources.filter(b=>b.configuration_id===draft.configuration&&sourceLoc(b)===draft.source_location);
    const chosen=()=>draft.batch_method==='manual'?candidates().filter(b=>b.id===draft.position_id):candidates();
    const replacementUnits=()=> (state.incomplete_units||[]).filter(u=>u.position_id===draft.position_id&&!u.closed_at);
    const activePart=()=> (state.parts||[]).find(p=>p.id===draft.part_id&&!p.retired);
    const update=()=>{
      const selected=chosen(), source=selected[0], part=activePart();
      const delivery=returns.find(e=>e.id===draft.movement_id);
      const existing=partMode&&draft.unit_id&&draft.unit_id!=='new';
      const qty=existing?1:Number(draft.quantity||0);
      const available=delivery?Number(delivery.quantity)-Number(delivery.returned):
        selected.reduce((n,b)=>n+Math.max(0,b.available),0);
      let remaining=qty;
      let tracked=!!delivery?.serials.length;
      for(const batch of selected){
        if((batch.serialised||(!stockV105()&&batch.serials?.length))&&(forcedBatch||remaining>0||!qty))tracked=true;
        remaining=Math.max(0,remaining-batch.available);
        if(qty&&!remaining&&!forcedBatch)break;
      }
      if(form.elements.available)form.elements.available.value=existing?'1 incomplete pump':formatQty(available);
      if(form.elements.quantity){
        form.elements.quantity.readOnly=!!existing;
        if(existing)form.elements.quantity.value='1';
        form.elements.quantity.max=action==='adjust'?'':String(existing?1:partMode?Math.min(10000,Math.floor(available)):available);
      }
      form.elements.serials.closest('label').hidden=!tracked||!!existing;
      form.elements.serials.disabled=!tracked||!!existing;
      if(form.elements.part_quantity)form.elements.part_quantity.value=part&&qty?qty*part.units_per_pump:'';
      let preview='';
      if(action==='transfer'&&source&&draft.location_id&&qty>0&&qty<=available){
        const physical=id=>batches.filter(b=>b.configuration_id===source.configuration_id&&b.location_id===id)
          .reduce((n,b)=>n+(b.total??Number(b.quantity)),0);
        const from=physical(source.location_id),to=physical(draft.location_id);
        const total=batches.filter(b=>b.configuration_id===source.configuration_id).reduce((n,b)=>n+(b.total??Number(b.quantity)),0);
        preview=`${locationLabel(source.location_id)} ${formatQty(from)} → ${formatQty(from-qty)}. ${locationLabel(draft.location_id)} ${formatQty(to)} → ${formatQty(to+qty)}. Total for this configuration stays ${formatQty(total)}.`;
      }else if(partMode&&source&&part&&qty>0&&(existing||qty<=available)){
        const modelBatches=batches.filter(b=>modelKey(b)===draft.model);
        const total=modelBatches.reduce((n,b)=>n+(b.total??Number(b.quantity)),0), incomplete=modelBatches.reduce((n,b)=>n+b.incomplete,0);
        const ready=modelBatches.reduce((n,b)=>n+b.available,0), delta=existing?0:qty;
        preview=`Total ${formatQty(total)} · Not Complete ${formatQty(incomplete)} → ${formatQty(incomplete+delta)} · On Hand ${formatQty(ready)} → ${formatQty(ready-delta)}.`;
      }else if(source&&qty>0&&(action==='adjust'||qty<=available)){
        const delta=action==='adjust'?qty:-qty;
        preview=`Available in selected source ${formatQty(available)} → ${formatQty(available+delta)}.`;
      }else if(delivery&&qty>0&&qty<=available)preview=`Unreturned delivery ${formatQty(available)} → ${formatQty(available-qty)}. Destination receives ${formatQty(qty)}.`;
      form.querySelector('output').textContent=preview;
    };
    const draw=()=>{
      const bySeries=sources.filter(b=>models.get(modelKey(b))?.family===draft.series);
      const byModel=bySeries.filter(b=>modelKey(b)===draft.model);
      const byConfig=byModel.filter(b=>b.configuration_id===draft.configuration);
      const selected=chosen(), source=selected[0], part=activePart(), existing=draft.unit_id&&draft.unit_id!=='new';
      const cfg=configs.get(draft.configuration);
      const related=state.groups.filter(g=>cfg&&belongs(g,cfg.item_key)&&g.kind==='normal'&&!g.retired);
      const eligibleParts=(state.parts||[]).filter(p=>!p.retired&&p.series_key===draft.series
        &&!partRows().some(m=>m.unit_id===draft.unit_id&&m.part_id===p.id&&!m.restored_event));
      const choices=related.flatMap(g=>options(g).filter(o=>o.id!==cfg.selections[g.id]).map(o=>
        [g.id+':'+o.id,(g.series_key?(cfg.selections[g.id]?.includes(o.id)?'Remove · ':'Add · '):g.label+' · ')+o.label]));
      const batchChoices=candidates().map(b=>[b.id,`${b.received_on||localDate(b.created_at)} · ${b.lot_id.slice(0,8)} · ${formatQty(b.available)} available`]);
      form.innerHTML=`${action==='return'?movementSelect('movement_id','Original delivery',returns.map(e=>[e.id,`${e.reference} · ${e.model} · ${e.quantity-e.returned} unreturned`]),draft.movement_id):
        movementSelect('series','Series',unique(sources,b=>models.get(modelKey(b))?.family,b=>seriesLabels[models.get(modelKey(b))?.family]||models.get(modelKey(b))?.family).filter(([id])=>id),draft.series)
        +movementSelect('model','Model',unique(bySeries,modelKey,b=>models.get(modelKey(b)).model),draft.model)
        +movementSelect('configuration','Configuration',unique(byModel,b=>b.configuration_id,b=>configLabel(configs.get(b.configuration_id))),draft.configuration)
        +movementSelect('source_location','Source Location',unique(byConfig,sourceLoc,b=>locationLabel(b.location_id)),draft.source_location)
        +(!forcedBatch&&stockV105()&&action!=='return'?movementSelect('batch_method','Batch Selection Method',[['fifo','FIFO'],['manual','Manual']],draft.batch_method):'')
        +(draft.batch_method==='manual'?movementSelect('position_id','Source Batch',batchChoices,draft.position_id):'')}
        ${partMode?movementSelect('unit_id','Pump Selection',[['new','Complete pump(s)'],...replacementUnits().map(u=>[u.id,'Incomplete pump · '+unitLabel(u)])],draft.unit_id||'new'):''}
        <label>Available Quantity<input name="available" readonly></label>
        ${['transfer','return'].includes(action)?movementSelect('location_id','Destination Location',
          state.locations.filter(l=>!l.retired&&(action==='return'||source?.location_id!==l.id)).map(l=>[l.id,l.label]),draft.location_id):''}
        ${action==='reconfigure'?movementSelect('choice','Change one Normal Group option',choices,draft.choice):''}
        ${partMode?`${state.can_cost?`<label>Original Landed Unit Cost (RM)<input readonly value="${esc(source?.cost??'—')}"></label>`:''}
          ${movementSelect('part_id','Part Removed',eligibleParts.map(p=>[p.id,p.label]),draft.part_id)}
          <label>Applicable Part Specifications<textarea readonly rows="2">${esc(part?specNames(partSpecs(part,cfg)):'')}</textarea></label>`:''}
        <label>${partMode?'Pump Quantity Affected':action==='transfer'?'Transfer Quantity':'Quantity'}
          <input type="number" name="quantity" min="${partMode?1:0}" step="${partMode?1:'any'}" required value="${esc(existing?1:draft.quantity)}"></label>
        ${partMode?`<label>Part Quantity Removed<input name="part_quantity" readonly></label>
          ${movementSelect('purpose','Purpose',Object.entries(partPurpose),draft.purpose)}`:''}
        <label>Date<input type="date" name="date" required value="${esc(draft.date)}"></label>
        <label>Serial numbers<textarea name="serials">${esc(draft.serials)}</textarea></label>
        <label>Reason<input name="reason" required value="${esc(draft.reason)}"></label>
        <label>Reference<input name="reference" ${['return','issue'].includes(action)?'required':''} value="${esc(draft.reference)}"></label>
        <label>Remark<input name="remark" value="${esc(draft.remark)}"></label>
        <output class="stock-inline-footer" aria-live="polite"></output>
        <div class="stock-inline-footer"><button class="btn">Save ${esc(actionLabels[action])}</button></div>`;
      update();
    };
    const dependent=['series','model','configuration','source_location','batch_method','position_id','unit_id','part_id'];
    form.oninput=e=>{if(e.target.name)draft[e.target.name]=e.target.value;if(e.target.name==='quantity')update();};
    form.onchange=e=>{
      const name=e.target.name;
      draft[name]=e.target.value;
      if(dependent.includes(name)||name==='movement_id'){
        for(const field of dependent.slice(dependent.indexOf(name)+1)){
          if(field!=='batch_method')delete draft[field];
        }
        if(name!=='part_id')delete draft.serials;
        if(name==='source_location')delete draft.location_id;
        draw();
        form.elements[name]?.focus();
      }else update();
    };
    form.onsubmit=e=>{
      e.preventDefault();
      const p=formData(form), source=chosen()[0];
      if(action!=='return'&&!source)return message('Select eligible source stock.',true);
      if(source){
        p.position_id=source.id;
        p.source_configuration=source.configuration_id;
        p.source_location=source.location_id;
      }
      if(p.choice){[p.group_id,p.option_id]=p.choice.split(':');delete p.choice;}
      if(partMode){
        p.part_revision=activePart()?.revision;
        p.unit_id=p.unit_id==='new'?null:p.unit_id;
      }
      delete p.available;delete p.series;delete p.model;delete p.configuration;
      p.serials=serialValues(p.serials);
      submitLedger(form,action,p,()=>{actionContext=null;});
    };
    draw();
  }
  function movementResults(){
    const events=ledger().events.filter(e=>(Object.hasOwn(movementTypes,e.kind)||e.kind==='restore_parts')&&matchesPeriod(e.effective_on,movementFilter));
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
    const actions=Object.keys(movementTypes).filter(action=>ledgerCap(movementTypes[action])&&(action!=='cannibalise'||stockV105()));
    const action=actions.includes(actionContext?.action)?actionContext.action:actions[0];
    return `<h2>Stock Movement</h2>${timeFrame('stockMovementTime',movementFilter,timeFrameDays.stockMovementTime)}
      ${action?`<details id="stockMovementFormPanel" ${actionContext?.position?'open':''}><summary>Record stock movement</summary>
        <div class="stock-inline-fields stock-movement-type"><label>Movement Type<select id="stockMovementAction">${actions.map(a=>`<option value="${a}" ${action===a?'selected':''}>${actionLabels[a]}</option>`).join('')}</select></label></div>
        <form class="stock-inline-fields" id="stockMovementForm"></form></details>`:''}
      <div id="stockMovementResults">${movementResults()}</div>`;
  }
  function bindMovement(){
    bindTimeFrame('stockMovementTime',movementFilter,()=>{$('stockMovementResults').innerHTML=movementResults();});
    const selector=$('stockMovementAction');
    if(!selector)return;
    const form=$('stockMovementForm');
    selector.onchange=()=>movementInputs(form,selector.value);
    movementInputs(form,selector.value,actionContext?.position);
  }
  function receiptRow(){
    return `<tr data-receipt-row>
      <td><input name="model" aria-label="Model" list="stockReceiptModels" required placeholder="Enter model"></td>
      <td><input name="cost" aria-label="Landed cost / unit (MYR)" type="number" min="0" step="any" ${state.can_cost?'':'disabled'} placeholder="${state.can_cost?'Optional':'Restricted'}"></td>
      <td><input name="quantity" aria-label="Quantity" type="number" min="0" step="any" required></td>
      <td><select name="location_id" aria-label="Location" required><option value="">Select location</option>${refOptions('location')}</select></td>
      <td><input name="remark" aria-label="Remark"></td><td><button type="button" class="btn secondary" data-remove-row>Delete</button></td>
    </tr>`;
  }
  function receiveView(){
    return `<h2>Add Stock</h2><form id="stockReceiveForm">
      <details open><summary>General</summary><div class="receipt-general">
        <label>Series<select id="stockReceiveSeries" name="family" required><option value="">Select series</option>
          ${Object.entries(seriesLabels).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label>
        <label>Supplier<select name="supplier_id" required><option value="">Select supplier</option>${refOptions('supplier')}</select></label>
        ${dateField()}
        <label>Reference<input name="reference"></label>
      </div></details>
      <details><summary>Pricelist Link</summary><label>Configuration<select id="receiptVariant" required></select></label><p role="status" id="receiptCompatibility"></p></details>
      <details><summary>Critical Group</summary><div id="receiptCritical"></div></details>
      <details><summary>Normal Group</summary><div id="stockReceiptConfig"></div></details>
      <details open><summary>Stock</summary><datalist id="stockReceiptModels"></datalist>
        ${stockTable(['Model','Landed Cost (RM)','Qty','Location','Remark','Delete'],[receiptRow()],'','id="stockReceiptRows"')}
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
      config.querySelectorAll('fieldset[data-row]').forEach(panel=>{
        const row=rows.children[Number(panel.dataset.row)];
        if(row)drafts.set(row,{key:panel.dataset.key,groups:Object.fromEntries([...panel.querySelectorAll('select')].map(s=>[s.dataset.receiveGroup,s.multiple?[...s.selectedOptions].map(o=>o.value).sort():s.value]))});
      });
    }
    function configurations(model){
      const linked=state.groups.filter(g=>belongs(g,model.key)&&!g.retired&&g.kind==='linked');
      const choices=model.choices||[];
      if(!linked.length)return choices.length?choices.map(v=>({variant:v.code,label:v.label,selections:{}})):[{variant:'',label:'Unmapped',selections:{}}];
      const mappings=[...(state.series_mappings||[]).filter(m=>m.series_key===model.family),...state.mappings.filter(m=>m.item_key===model.key)];
      return mappings.filter(m=>!m.retired&&choices.some(v=>v.code===m.variant)&&Object.keys(m.selections).length===linked.length&&linked.every(g=>options(g).some(o=>o.id===m.selections[g.id]))).map(m=>({...m,label:m.variant+' · '+Object.values(m.selections).map(optionLabel).join(' / ')}));
    }
    let offered=[];
    function renderConfigurations(){
      const select=$('receiptVariant'), previous=select.value;
      const selectedRows=[...rows.children].map((row,index)=>({row,index,model:findModel(row.querySelector('[name=model]').value)})).filter(x=>x.model);
      const [first]=selectedRows;
      const key=m=>JSON.stringify([m.variant,Object.entries(m.selections).sort()]);
      const match=(m,model)=>{const list=configurations(model).filter(x=>x.variant===m.variant);return list.find(x=>key(x)===key(m))||(list.length===1?list[0]:null)};
      offered=first?configurations(first.model).map(m=>({key:key(m),label:m.label,variant:m.variant,byModel:new Map(selectedRows.map(x=>[x.model.key,match(m,x.model)]))})):[];
      select.innerHTML='<option value="">Select configuration</option>'+offered.filter(m=>[...m.byModel.values()].every(Boolean)).map(m=>`<option value="${esc(m.key)}">${esc(m.label)}</option>`).join('');
      select.value=previous;
      if(!select.value&&select.options.length===2)select.selectedIndex=1;
      $('receiptCompatibility').textContent=first&&select.options.length===1?'No common configuration for '+selectedRows.map(x=>x.model.model).join(', '):'';
      config.innerHTML=selectedRows.map(({row,index,model})=>{
        const groups=state.groups.filter(g=>belongs(g,model.key)&&!g.retired&&g.kind==='normal').sort(sort);
        const draft=drafts.get(row)?.key===model.key?drafts.get(row).groups:{};
        return `<fieldset data-row="${index}" data-key="${esc(model.key)}"><legend>${esc(model.model)}</legend>${groups.map(g=>`<label>${esc(g.label)}<select data-receive-group="${g.id}" ${g.series_key?'multiple':'required'}>${g.series_key?'':'<option value="">Select</option>'}${options(g).map(o=>`<option value="${o.id}" ${[draft[g.id]].flat().includes(o.id)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`).join('')||'No normal options'}</fieldset>`;
      }).join('');
      $('receiptCritical').textContent=selectedRows.map(({model})=>{const labels=state.groups.filter(g=>belongs(g,model.key)&&!g.retired&&g.kind==='critical').flatMap(g=>options(g).map(o=>o.label));return labels.length?model.model+' · '+labels.join(', '):''}).filter(Boolean).join('; ')||'No critical options for the selected models.';
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
    $('receiptVariant').addEventListener('invalid',()=>{$('receiptVariant').closest('details').open=true;message($('receiptCompatibility').textContent||'Select a compatible Pricelist Link configuration.',true);});
    series.onchange=changeSeries;
    changeSeries();
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
      const shared=offered.find(x=>x.key===$('receiptVariant').value);
      if(!shared){$('receiptVariant').closest('details').open=true;return message($('receiptCompatibility').textContent||'Select a compatible Pricelist Link configuration.',true);}
      p.shared_variant=shared.variant;
      for(const [index,row] of [...rows.children].entries()){
        const field=name=>row.querySelector(`[name="${name}"]`).value;
        const model=findModel(field('model')), draft=drafts.get(row);
        if(!model||draft?.key!==model.key)return message(`Row ${index+1}: select an unambiguous model from the chosen series.`,true);
        const mapping=shared.byModel.get(model.key);
        if(!mapping)return message('Configuration is incompatible with '+model.model,true);
        const data={item_key:model.key,selections:{...draft.groups,...mapping.selections},variant:shared.variant,
          location_id:field('location_id'),quantity:field('quantity'),remark:field('remark')};
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
        <button class="btn" ${editMode?'':'disabled'}>Save serial rule</button>
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
      if(!editMode||!canDropdowns())return message('Hold 3s to Edit before saving.',true);
      submitLedger(f,'serial_policy',{scope:scope.value,subject:subject.value,required:required.value===''?null:required.value==='true'});
    };
  }
  function configurationTable(rows) {
    const columns=kind=>[...new Set(rows.flatMap(r=>Object.keys(r.config.selections)))].map(id=>
      state.groups.find(g=>g.id===id)).filter(g=>g?.kind===kind).sort(sort);
    const normal=columns('normal'), linked=columns('linked');
    const cell=(r,g)=>esc(optionLabel(r.config.selections[g.id]));
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
          <p>${stockV105()?`Complete ${formatQty(r.complete)} · Not Complete ${formatQty(r.incomplete)} · On Hand ${formatQty(r.complete-r.reserved)}`:`Assemblable stock ${ledger()?'Unknown':formatQty(r.assemblable)}`}</p>
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
          <div><small>Assemblable Stock</small><strong>${ledger()&&!stockV105()?'—':formatQty(assemblable)}</strong></div>
          <div><small>Reserved Stock</small><span>${ledger()?formatQty(reserved):'—'}</span></div>
          <div><small>Available to Promise</small><span>${stockV105()?formatQty(assemblable-reserved):'—'}</span></div>
          ${count?`<button class="btn secondary" aria-expanded="${open}" data-expand-model="${esc(key)}">${open?'▾':'▸'} ${count} configuration${count===1?'':'s'}</button>`:'<small>Not Configured</small>'}
        </div>${open&&configs.length?configurationTable(configs):''}</article>`);
    }
    return `<div class="stock-summary"><span>${cards.length.toLocaleString()} models shown</span><span>${items().length.toLocaleString()} catalogue models</span></div>
      <p class="stock-metrics-note">${stockV105()?'Assemblable Stock reflects complete pumps. Available to Promise excludes reservations.':ledger()?'Assemblable and Available to Promise quantities await component requirements.'
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
  const editFormSelector='#stockBatchCorrection,#stockSeriesOptionForm,#stockLinkForm,#stockSerialPolicy,#stockItemForm,#stockInputForm,#stockGroupForm,#stockMappingForm,[data-ref-form]';
  const editFormDefaults=new WeakMap();
  const editFormValues=form=>JSON.stringify([...form.querySelectorAll('input,select,textarea')]
    .filter(field=>!field.disabled&&!field.readOnly)
    .map(field=>field.validity.badInput?null:field.multiple?[...field.selectedOptions].map(option=>option.value):
      ['checkbox','radio'].includes(field.type)?field.checked:field.value));
  function bindEditToggle(){
    let edit=$('stockEdit');
    const mode=editMode?'editing':'locked';
    if(edit.dataset.mode!==mode){
      const restoreFocus=document.activeElement===edit;
      edit.cancelStockHold?.();
      const replacement=edit.cloneNode(false);
      replacement.dataset.mode=mode;
      edit.replaceWith(replacement);
      edit=replacement;
      if(restoreFocus)edit.focus();
      edit.textContent=editMode?'Done Editing':'Hold 3s to Edit';
      if(editMode){
        edit.onclick=()=>{
          if(busy)return;
          const dirty=[...$('stockContent').querySelectorAll(editFormSelector)].some(form=>
            editFormDefaults.get(form)!==editFormValues(form));
          if(dirty&&!window.confirm('Discard unsaved KeyStock changes and exit editing? Cancel to stay in editing mode and save your changes.'))return;
          editMode=false;editKey='';optionDraft=null;linkDraft=null;batchEdit=null;correction=null;
          render();
        };
      }else hold(edit,3,()=>{
        if(edit.hidden||edit.disabled||busy)return;
        editMode=true;editKey='';
        if(['items','dropdowns','references','detail'].includes(tab))render();else moveTo('items');
      });
    }
    if(!editMode)edit.cancelStockHold?.();
    edit.hidden=tab==='references'?!(caps('manage_stock_locations')||caps('manage_stock_suppliers')):tab==='detail'?!(mayEdit()||ledgerCap('delete_stock_batch')||ledgerCap('edit_stock_batch')):tab==='dropdowns'?!canDropdowns():!mayEdit();
  }
  function render() {
    if(!state)return;
    if((tab==='input'&&!ledger()&&!state.can_manage)||(tab==='dropdowns'&&!canDropdowns())
      ||(tab==='receive'&&!ledgerCap('receive_stock')))tab='check';
    bindEditToggle();
    $('stockVersion').textContent=stockVersion();
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
    if(tab==='references')body=referencePage();
    else if(tab==='check')body=stockCheck();
    else if(tab==='detail')body=stockDetail();
    else if(tab==='missing')body=missingParts();
    else if(tab==='history')body=stockHistory();
    else if(tab==='receive')body=receiveView();
    else if(tab==='reservations')body=ledger()?reservationsView():'<h2>Reservations</h2><p>The current database has no reservation ledger. Reservation balances and stock-out actions are unavailable.</p>';
    else if(tab==='movement')body=ledger()?movementView():`<h2>Stock Movement</h2>${timeFrame('stockMovementTime',movementFilter,[7,30,90])}
      <p>The current database has no stock movement ledger.</p>`;
    else if(tab==='location')body=filters()+`<label>Location<select id="stockLocation"><option value="">Not Assigned</option>${refOptions('location',location,true)}</select></label>
        <div id="stockTable">${table()}</div>`;
    else if(tab==='items')body=filters()+management();
    else if(tab==='input')body=filters(true)+(ledger()?(item()?history(item()):'<p>Select a model to view original opening balances.</p>'):inputForm());
    else body=seriesDropdowns()+serialPolicyView();
    $('stockContent').innerHTML=body;
    if(tab==='references')bindReferencePage();
    else if(tab==='check')bindStockCheck();
    else if(tab==='detail')bindStockDetail();
    else if(tab==='history')bindStockHistory();
    else if(tab==='receive')bindReceive();
    else if(tab==='reservations'&&ledger())bindReservations();
    else if(tab==='movement'){
      if(ledger())bindMovement();else bindTimeFrame('stockMovementTime',movementFilter);
    }
    else if(tab==='missing'){
      bindRestoreParts();
      $('stockContent').querySelectorAll('[data-missing-filter]').forEach(input=>input.oninput=()=>{
        missingFilter[input.dataset.missingFilter]=input.value;
        $('stockMissingResults').innerHTML=missingResults();bindRestoreParts();
      });
    }else{
      bindFilters();bindInput();bindDropdowns();bindManagement();bindReferences();bindRows();
      if(tab==='dropdowns'){bindSeriesDropdowns();bindSerialPolicy();}
      if($('stockLocation'))$('stockLocation').onchange=e=>{
        location=e.target.value;
        $('stockTable').innerHTML=table();
        bindRows();
      };
    }
    $('stockContent').querySelectorAll(editFormSelector).forEach(form=>editFormDefaults.set(form,editFormValues(form)));
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
      state=null;selected='';family='';query='';location='';status=stockStatusPreference();tab='check';trail.length=0;batchEdit=null;
      expanded.clear();expandedConfigurations.clear();editMode=false;editKey='';correction=null;entryId=uid();
      stockFilter=emptyStockFilter();
      historyFilter=emptyHistoryFilter();
      movementFilter={period:'30',from:'',to:'',open:false};
      restoredPreferenceKey='';
      missingFilter={model:'',series:'',component:''};
      dropdownFilter=['','','',''];
      dropdownSeries='';dropdownKind='critical';dropdownOption='';optionDraft=null;linkDraft=null;
      newestFirst=false;
      actionContext=null;
      clearStockView();
      message('');
    });
    window.addEventListener('keysuite-permissions-changed',()=>{
      refreshVisibility();
      state=null;editMode=false;editKey='';optionDraft=null;linkDraft=null;++request;
      clearStockView();
      if($('keyStock').classList.contains('active'))load();
    });
  }
  window.KeyStock={version:'1.05',refresh:load,back,resetTab:()=>{tab='check';correction=null;actionContext=null;entryId=uid();render();},stockRows:()=>state?stockRows():[],resolve:(s,d)=>state?resolve(s,d):null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
