/* KeySuite V5.00.27 — KV Product impeller configuration, following the CR editor method. */
(()=>{'use strict';
  let open=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfgFor=m=>m._keysuiteKvImpellerConfig||(m._keysuiteKvImpellerConfig={original:Number(m.stages||1),full:Number(m.fullImpellers??m.stages??1),small:Number(m.smallImpellers||0),mini:Number(m.smallestImpellers||0)});
  function normalize(m,changed,value){
    const c=cfgFor(m),total=c.original,n=Math.max(0,Math.min(total,Math.round(Number(value)||0)));
    c[changed]=n;let left=total-n;
    for(const k of ['full','small','mini'].filter(k=>k!==changed)){c[k]=Math.max(0,Math.min(left,Number(c[k])||0));left-=c[k]}
    if(left)c.full+=left;
    Object.assign(m,{totalImpellers:total,fullImpellers:c.full,smallImpellers:c.small,smallestImpellers:c.mini});
  }
  function options(max,selected){return Array.from({length:max+1},(_,i)=>`<option value="${i}" ${i===selected?'selected':''}>${i}</option>`).join('')}
  function html(m){
    const c=cfgFor(m),curve=DB.curves?.[m.series]||{},allowS=Array.isArray(curve.head_per_stage_2)&&curve.head_per_stage_2.length,allowM=Array.isArray(curve.head_per_stage_3)&&curve.head_per_stage_3.length;
    return `<details class="impeller-editor" ${open?'open':''}><summary class="impeller-editor-summary"><div class="impeller-editor-summary-main"><div class="impeller-editor-title"><span class="impeller-editor-chevron">▶</span>Impeller Configuration</div><div class="impeller-editor-sub">Base ${esc(m.model)} · ${c.original} original impeller${c.original===1?'':'s'} · F + S + M must equal ${c.original}</div></div><div class="impeller-editor-badge">${c.full+c.small+c.mini} / ${c.original} remaining</div></summary><div class="impeller-editor-body"><div class="impeller-editor-grid"><div class="impeller-editor-field"><label>F · Full</label><select data-kv-impeller="full">${options(c.original,c.full)}</select></div><div class="impeller-editor-field"><label>S · Small</label><select data-kv-impeller="small" ${allowS?'':'disabled'}>${options(c.original,c.small)}</select></div><div class="impeller-editor-field"><label>M · Mini</label><select data-kv-impeller="mini" ${allowM?'':'disabled'}>${options(c.original,c.mini)}</select></div></div><div class="impeller-editor-meta"><div><span>Final Model</span><b>${esc(keykvVisibleModelName(m.model,false))}</b></div><div><span>Physical Impellers</span><b>${c.original}</b></div><div><span>Configuration</span><b>${c.full}F + ${c.small}S + ${c.mini}M</b></div></div><div class="impeller-editor-note">The configuration uses this KV family’s own full/small/mini workbook curves. Unavailable impeller sizes remain disabled.</div></div></details>`;
  }
  function mount(){
    const m=selectionState?.models?.[selectionState.selectedIndex||0],host=document.querySelector('#out .curve-grid');if(!m||!host)return;
    let wrap=document.getElementById('kvImpellerConfiguration');if(!wrap){wrap=document.createElement('div');wrap.id='kvImpellerConfiguration';host.before(wrap)}wrap.innerHTML=html(m);
    const details=wrap.querySelector('details');details?.addEventListener('toggle',()=>{open=details.open});
    wrap.querySelectorAll('[data-kv-impeller]').forEach(select=>select.addEventListener('change',()=>{normalize(m,select.dataset.kvImpeller,select.value);renderSelected()}));
  }
  const baseRender=window.renderSelected;window.renderSelected=function(){baseRender.apply(this,arguments);mount()};
  const baseCurrent=window.currentSelection;window.currentSelection=function(){const p=baseCurrent.apply(this,arguments),m=selectionState?.models?.[selectionState.selectedIndex||0];if(!p||!m)return p;const c=cfgFor(m);return {...p,impeller_full:c.full,impeller_small:c.small,impeller_mini:c.mini,total_impellers:c.original,export_state:{...(p.export_state||{}),models:[m]}}};
  window.__KEYSUITE_CURRENT_SELECTION=window.currentSelection;
})();
