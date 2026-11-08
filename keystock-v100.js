/* KeyStock V1.01: catalogue references, configurable options and opening balances only. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto.randomUUID(), sort=(a,b)=>(a.sort_order-b.sort_order)||String(a.id).localeCompare(String(b.id));
  let state=null, tab='check', selected='', family='', query='', location='', busy=false, request=0, entryId=uid(), correction=null;
  const pages={check:'Stock Check',items:'Stock Item Management',input:'Stock Input',dropdowns:'Dropdown Management',location:'Stock by Location'};
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
    if(key){selected=key;family=item().family;query='';}
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
  async function rpc(action,payload={}){const client=window.KeySuiteAuth?.getClient?.();if(!client)throw Error('Sign in to connect KeyStock.');const {data,error}=await client.rpc('keysuite_stock_v100',{p_action:action,p_payload:payload});if(error)throw error;return data;}
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
      message(`KeyStock V1.01 · ${items().length.toLocaleString()} catalogue models · ${writable?'Editing available':'Read only'}`);
      return true;
    }catch(e){
      if(token!==request)return false;
      state=null;
      $('stockEdit').hidden=true;
      $('stockContent').innerHTML='';
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
    for(const b of state.opening_balances){
      if(b.voided_at)continue;
      const list=active.get(b.configuration_id)||[];
      list.push(b);active.set(b.configuration_id,list);
    }
    for(const q of state.critical_quantities){
      const list=missing.get(q.opening_id)||[];
      list.push(q);missing.set(q.opening_id,list);
    }
    for(const config of state.configurations){
      const byLocation=new Map();
      for(const b of active.get(config.id)||[]){
        const location=b.location_id||'';
        const row=byLocation.get(location)||{config,location,quantity:0,missing:new Map()};
        row.quantity+=Number(b.quantity);
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
          <p>Assemblable stock ${formatQty(r.assemblable)}</p>
          <dl>${[...r.missing].map(([id,qty])=>`<dt>${esc(state.options.find(o=>o.id===id)?.label||'Historical part')}</dt><dd>${formatQty(qty)} missing</dd>`).join('')||'<dd>No missing parts recorded</dd>'}</dl>
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
      if(tab==='check' && ((status==='positive'&&total<=0)||(status==='zero'&&total!==0)||(status==='unconfigured'&&configs.length)))continue;
      const open=expanded.has(key), power=rating(i);
      const count=new Set(configs.map(r=>r.config.id)).size;
      cards.push(`<article class="stock-model">
        <div class="stock-model-row">
          <div><button class="stock-link" data-item="${esc(key)}">${esc(i.model)}</button>
            <small>${esc(i.brand)} · ${esc(i.family)}${i.unavailable?' · Source unavailable':''}</small></div>
          <div class="stock-rating">${power?`<small>Rating</small>${power.value} ${power.unit}`:''}</div>
          <div><small>Physical On Hand</small><strong>${formatQty(total)}</strong></div>
          <div><small>Assemblable Stock</small><strong>${formatQty(assemblable)}</strong></div>
          <div><small>Reserved Stock</small><span>—</span></div>
          <div><small>Available to Promise</small><span>—</span></div>
          ${count?`<button class="btn secondary" aria-expanded="${open}" data-expand-model="${esc(key)}">${open?'▾':'▸'} ${count} configuration${count===1?'':'s'}</button>`:'<small>Not Configured</small>'}
        </div>${open&&configs.length?configurationTable(configs):''}</article>`);
    }
    return `<div class="stock-summary"><span>${cards.length.toLocaleString()} models shown</span><span>${items().length.toLocaleString()} catalogue models</span></div>
      <p class="stock-metrics-note">Totals are for overview. Reservations and Available to Promise are not tracked in this phase.</p>
      ${cards.join('')||'<p>No stock matches this filter.</p>'}`;
  }
  function selectors(kind,values={}){return groups(kind).map(g=>`<label>${esc(g.label)}<select data-stock-group="${g.id}" data-kind="${g.kind}" required><option value="">Select</option>${options(g).map(o=>`<option value="${o.id}" ${values[g.id]===o.id?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`).join('');}
  function selections(root=$('stockContent'),linkedOnly=false){return Object.fromEntries([...root.querySelectorAll('[data-stock-group]')].filter(n=>!linkedOnly||n.dataset.kind==='linked').map(n=>[n.dataset.stockGroup,n.value]).filter(x=>x[1]));}
  function resolve(selections,direct=''){const gs=groups('linked');if(!gs.length)return choices().find(v=>v.code===direct)||null;const s=Object.fromEntries(gs.filter(g=>selections[g.id]).map(g=>[g.id,selections[g.id]]));const equal=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());if(Object.keys(s).length!==gs.length)return null;const m=state.mappings.find(m=>m.item_key===selected&&!m.retired&&equal(m.selections,s));return m?choices().find(v=>v.code===m.variant)||null:null;}
  function inputForm(){const i=item();if(!i)return '<p>Select a model from the catalogue.</p>';const config=correction?state.configurations.find(c=>c.id===correction.configuration_id):null;const vals=config?.selections||{};const cost=state.purchase_costs?.find(c=>c.opening_id===correction?.id)?.unit_cost_myr;
    return `<h2>${esc(i.model)}</h2><p>${esc(i.brand)} · ${esc(i.family)}</p>${i.unavailable?'<p>This source model is unavailable. Existing stock remains visible.</p>':''}<form id="stockInputForm" class="stock-form"><div class="stock-wide stock-message">${correction?'Correcting an opening balance. The original entry remains in the audit history.':'Opening balance only. Enter each initial physical stock lot once.'}</div>${selectors('linked',vals)}${selectors('normal',vals)}${!groups('linked').length&&!i.independent?`<label>Pricelist configuration<select id="stockVariant">${choiceOptions(config?.variant||'')}</select></label>`:''}<div class="stock-wide" id="stockResolution"></div><details class="stock-wide"><summary>Critical Parts</summary><div class="stock-form">${groups('critical').map(g=>`<fieldset><legend>${esc(g.label)}</legend>${options(g).map(o=>`<label>${esc(o.label)} — missing quantity<input data-critical="${o.id}" type="number" min="0" step="any" value="${state.critical_quantities.find(q=>q.opening_id===correction?.id&&q.option_id===o.id)?.missing_quantity??0}"></label>`).join('')}</fieldset>`).join('')||'<p>No critical dropdowns configured.</p>'}</div></details><label>Quantity<input name="quantity" type="number" min="0" step="any" value="${correction?.quantity??''}" required></label>${inlineReference('location',correction?.location_id||'')}${inlineReference('supplier',correction?.supplier_id||'')}${state.can_cost?`<label>Unit Purchase Cost MYR (optional)<input name="unit_cost_myr" type="number" min="0" step="any" value="${cost??''}" placeholder="Not entered"><small>Blank is unknown, not zero.</small></label>`:''}<label class="stock-wide">Remarks (optional)<textarea name="remarks">${esc(correction?.remarks||'')}</textarea></label>${correction?'<label class="stock-wide">Correction reason<input name="correction_reason" required></label>':''}<div class="stock-wide stock-actions"><button class="btn" ${state.can_manage&&!i.unavailable?'':'disabled'}>Save Opening Balance</button><button type="button" class="btn secondary" id="stockNewEntry">New Entry</button></div></form>${history(i)}`;}
  function history(i){const ids=new Set(state.configurations.filter(c=>c.item_key===i.key).map(c=>c.id));const rows=state.opening_balances.filter(b=>ids.has(b.configuration_id)).sort((a,b)=>b.created_at.localeCompare(a.created_at));return `<details style="margin-top:20px"><summary>Opening balance history (${rows.length})</summary><div class="stock-scroll"><table><thead><tr><th>Date / Status</th><th>Recorded Configuration</th><th>Quantity</th><th>Supplier / Remarks</th>${state.can_cost?'<th>Unit Cost MYR</th>':''}<th></th></tr></thead><tbody>${rows.map(b=>`<tr><td>${esc(new Date(b.created_at).toLocaleString())}<small>${b.voided_at?'Corrected: '+esc(b.void_reason):'Active'}</small></td><td>${esc(b.snapshot.variant)}<small>${esc(Object.values(b.snapshot.selections||{}).map(s=>s.label+': '+s.option).join(' · '))}</small></td><td>${b.quantity}</td><td>${esc(b.supplier)}<small>${esc(b.remarks)}</small></td>${state.can_cost?`<td>${state.purchase_costs?.find(c=>c.opening_id===b.id)?.unit_cost_myr??'Not entered'}</td>`:''}<td>${!b.voided_at&&state.can_manage?`<button class="btn secondary" data-correct="${b.id}">Correct</button>`:''}</td></tr>`).join('')}</tbody></table></div></details>`;}
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
      ${!item().independent?`<h3>Pricelist Mappings</h3><p>Choose an exact existing Pricelist configuration for all linked selections.</p>
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
    $('stockTabs').innerHTML=Object.entries(pages).map(([key,label])=>
      `<button class="btn secondary ${tab===key?'active':''}" data-tab="${key}">${label}</button>`).join('');
    $('stockTabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>moveTo(b.dataset.tab));
    let body;
    if(tab==='check'||tab==='location'){
      const controls=tab==='location'
        ? `<label>Location<select id="stockLocation"><option value="">Not Assigned</option>${refOptions('location',location,true)}</select></label>
           ${manageReferences('location')}`
        : `<label>Stock Status<select id="stockStatus">${[['','All statuses'],['unconfigured','Not Configured'],['zero','Zero Stock'],['positive','In Stock']].map(([value,label])=>`<option value="${value}" ${value===status?'selected':''}>${label}</option>`).join('')}</select></label>`;
      body=filters()+controls+`<div id="stockTable">${table()}</div>`;
    }else if(tab==='items')body=filters()+management()+manageReferences('supplier');
    else if(tab==='input')body=filters(true)+inputForm();
    else body=state.can_manage?filters(true)+dropdowns():'<p>Owner or Admin access is required to manage dropdowns.</p>';
    $('stockContent').innerHTML=body;
    bindFilters();bindInput();bindDropdowns();bindManagement();bindReferences();bindRows();
    const refreshTable=()=>{$('stockTable').innerHTML=table();bindRows();};
    if($('stockStatus')) $('stockStatus').onchange=e=>{status=e.target.value;refreshTable();};
    if($('stockLocation')) $('stockLocation').onchange=e=>{location=e.target.value;refreshTable();};
  }
  function bindRows() {
    $('stockContent').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>moveTo('input',b.dataset.item));
    $('stockContent').querySelectorAll('[data-expand-model]').forEach(b=>b.onclick=()=>{
      const key=b.dataset.expandModel;
      if(expanded.has(key))expanded.delete(key);else expanded.add(key);
      $('stockTable').innerHTML=table();
      bindRows();
      [...$('stockTable').querySelectorAll('[data-expand-model]')].find(n=>n.dataset.expandModel===key)?.focus({preventScroll:true});
    });
  }
  function install(){if($('keyStock'))return;const main=document.querySelector('main');if(!main)return;const section=document.createElement('section');section.id='keyStock';section.className='page';section.innerHTML='<div class="stock-heading"><h1>KeyStock <small>V1.01</small></h1><div id="stockEditActions"><button class="btn secondary" id="stockEdit" hidden>Hold 3s to Edit</button><button class="btn secondary" id="stockRefresh">Refresh</button></div></div><div id="stockMessage" class="stock-message"></div><div id="stockTabs" class="stock-tabs"></div><div id="stockContent" class="card"></div>';main.append(section);const nav=document.createElement('button');nav.type='button';nav.textContent='KeyStock';nav.dataset.page='keyStock';nav.id='keyStockNav';nav.onclick=()=>window.KeySuiteApp.showPage('keyStock');$('keyAiNavButton')?.before(nav);$('stockRefresh').onclick=load;window.addEventListener('KEYSUITE_PAGE_CHANGED',e=>{if(e.detail?.page==='keyStock'){trail.length=0;if(state)render();else load();}});window.addEventListener('KEYSUITE_AUTH_CONTEXT_READY',()=>{++authContext;state=null;selected='';family='';query='';location='';status='';tab='check';trail.length=0;expanded.clear();editMode=false;editKey='';correction=null;entryId=uid();$('stockEdit').hidden=true;++request;$('stockContent').innerHTML='';});window.addEventListener('keysuite-permissions-changed',()=>{state=null;editMode=false;editKey='';++request;$('stockEdit').hidden=true;if($('keyStock').classList.contains('active'))load();else $('stockContent').innerHTML='';});}
  window.KeyStock={version:'1.01',refresh:load,back,resetTab:()=>{tab='check';correction=null;entryId=uid();render();},stockRows:()=>state?stockRows():[],resolve:(s,d)=>state?resolve(s,d):null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
