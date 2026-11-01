/* KeySuite V5.00.26 — BGF adapter for the locked Standard Selector Responsive Layout. */
(()=>{'use strict';
  const $=id=>document.getElementById(id);
  document.title='KeySelector BGF Series';
  const headerTitle=document.querySelector('header h1'),headerMeta=document.querySelector('header p');
  if(headerTitle)headerTitle.textContent='BGF Series';
  if(headerMeta)headerMeta.textContent='Database Version: 261030-V1.0 · KeySelector BGF · KeySuite V5.00.26';
  document.querySelectorAll('aside.inputs *').forEach(node=>{if(node.childNodes.length===1&&node.firstChild?.nodeType===3)node.textContent=node.textContent.replace(/KV/g,'BGF')});
  const headInput=$('head'),headRow=headInput?.closest('.row');
  if(headRow){
    const drive=document.createElement('div');drive.id='bgfDriveControl';drive.innerHTML='<label for="bgfDrive">Drive</label><select id="bgfDrive"><option value="MOTOR" selected>Motor</option><option value="ENGINE">Engine</option></select><div id="bgfEngineSpeed" hidden><label for="bgfEngineRpm">Engine Speed</label><div class="row"><input id="bgfEngineRpm" type="number" min="1800" max="3500" step="50" value="2900"><div class="voltage-display">RPM</div></div></div>';
    headRow.insertAdjacentElement('afterend',drive);
  }
  const driveSelect=$('bgfDrive'),engineSpeed=$('bgfEngineSpeed'),standardSpeed=$('standardSpeedControls'),motorOptions=document.querySelector('.motor-options'),motorVoltage=$('motorVoltageDisplay'),motorNote=$('motorDataNote');
  function selectedDrive(){return driveSelect?.value==='ENGINE'?'Engine':'Motor'}
  function syncDriveUi(){
    const engine=selectedDrive()==='Engine';
    if(engineSpeed)engineSpeed.hidden=!engine;
    if(standardSpeed)standardSpeed.hidden=true;
    if(motorOptions)motorOptions.hidden=engine;
    const voltageLabel=motorVoltage?.previousElementSibling;if(voltageLabel)voltageLabel.hidden=engine;
    if(motorVoltage)motorVoltage.hidden=engine;
    if(motorNote){motorNote.hidden=false;motorNote.textContent=engine?'Diesel Engine · electrical voltage / phase / frequency not applicable':'IE3 · 3 Phase · 415 V / 50 Hz';}
  }
  driveSelect?.addEventListener('change',()=>{syncDriveUi();alternatives.innerHTML='';out.innerHTML='<div class="warning">Drive changed. Press Select to calculate the corresponding BGF 350 model.</div>'});
  syncDriveUi();
  window.addEventListener('message',event=>{
    const message=event.data||{};
    if(message.type!=='KEYSUITE_PRODUCT_MODEL'||!/^BGF\s+350[ME]$/i.test(String(message.model||'')))return;
    const engine=/E$/i.test(String(message.model));
    if(driveSelect)driveSelect.value=engine?'ENGINE':'MOTOR';
    if(engine&&$('bgfEngineRpm'))$('bgfEngineRpm').value=String(Math.max(1800,Math.min(3500,Number(message.rpm||message.options?.rpm)||2900)));
    syncDriveUi();
  },true);

  const baseVisibleModel=keykvVisibleModelName;
  keykvVisibleModelName=function(model){return String(model||baseVisibleModel(model,false)||'').trim()};
  keysuiteKvPresentationAlias=function(value){return String(value??'').replace(/^KV\b/i,'BGF')};
  keysuiteKvMaterialDisplay=function(){return {casing:'Cast Iron',impeller:'Brass',shaft:'Stainless Steel'}};
  keysuiteKvSealDisplay=function(){return 'Mechanical Seal'};

  const baseRenderSelected=renderSelected;
  renderSelected=function(){
    baseRenderSelected();
    const best=selectionState.models?.[selectionState.selectedIndex||0],engine=/E$/i.test(String(best?.model||''));
    const eyebrow=out.querySelector('.selection-eyebrow');if(eyebrow)eyebrow.textContent='Selected BGF Pump';
    const driveModel=out.querySelector('.drive-model');if(driveModel)driveModel.textContent=engine?`${formatHP(best.motor_hp)} | Engine`:`${formatHP(best.motor_hp)} | IE3 Motor`;
    out.querySelectorAll('.kpi').forEach(kpi=>{const label=kpi.querySelector('span');if(label?.textContent==='Motor Size')label.textContent=engine?'Engine Size':'Motor Size'});
  };

  function runBgf(){
    const rawFlowText=String(flowInput.value??'').trim(),rawHeadText=String(headInput.value??'').trim(),rawFlow=Number(rawFlowText),rawHead=Number(rawHeadText),flowUnit=flowUnitInput.value,headUnit=headUnitInput.value;
    const q=flowToM3h(rawFlow,flowUnit),h=headToM(rawHead,headUnit),engine=selectedDrive()==='Engine',rpm=engine?Math.max(1800,Math.min(3500,Number($('bgfEngineRpm')?.value)||2900)):2900,hz=rpm/58,enhanced=!!enhancedMode?.checked;
    if(!(q>0&&h>0)){out.innerHTML='<div class="warning">Flow and Head must be above 0.</div>';alternatives.innerHTML='';return}
    const wanted=engine?'E':'M',models=DB.models.filter(model=>String(model.model).endsWith(wanted));
    let all=models.map(model=>enhanced?evaluateEnhancedModel(model,q,h):KEYSUITE_KV_CORE.evaluateModel(DB,model,q,h,hz)).filter(item=>item&&item.margin>=-.01);
    all.forEach(item=>item._keysuiteDutyFlow=q);all.sort(keykvMostSuitableCompare);
    if(!all.length){out.innerHTML=`<div class="warning">No verified ${engine?'engine':'motor'} BGF model satisfies ${q.toFixed(1)} m³/h @ ${h.toFixed(1)} m at ${rpm.toFixed(0)} rpm.</div>`;alternatives.innerHTML='';return}
    selectionState={q,h,hz,selectionHz:hz,curveHz:hz,rawFlow,rawHead,rawFlowText,rawHeadText,flowUnit,headUnit,motorEffClass:'IE3',motorPhase:'3Ph',motorVoltage:415,models:all,selectedIndex:0,enhanced,drive_type:selectedDrive(),primaryDutyCleared:false};
    renderAlternatives();renderSelected();
  }
  run=runBgf;go.onclick=runBgf;

  const baseCurrentSelection=window.__KEYSUITE_CURRENT_SELECTION;
  const bgfCurrentSelection=function(){
    const payload=baseCurrentSelection();if(!payload)return null;
    const engine=/E$/i.test(String(payload.model||'')),rpm=engine?Math.max(1800,Math.min(3500,Number($('bgfEngineRpm')?.value)||payload.speed_rpm||2900)):2900;
    return {...payload,source:'KeySuite-BGF-V5.00.26',family:'BGF',product:'BGF',generation_code:'BGF',keysuite_generation_code:'BGF',keysuite_product_group_code:'BGF',keysuite_price_group_code:'BGF',drive_type:engine?'Engine':'Motor',speed_rpm:rpm,operating_speed_rpm:rpm,frequency_hz:engine?null:50,motor_voltage:engine?null:415,motor_phase:engine?null:'3Ph',keysuite_material:'CI / BZ / SS / Mechanical Seal',keysuite_seal:'Mechanical Seal',keysuite_elastomer:'',keysuite_connection_type:'fixed',keysuite_bare_shaft:false,keysuite_supply_mode:'COMPLETE'};
  };
  window.__KEYSUITE_CURRENT_SELECTION=bgfCurrentSelection;
  parent.postMessage({type:'KEYSUITE_PRODUCT_FRAME_READY',family:'BGF'},'*');
})();
