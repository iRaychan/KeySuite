/* G Series engineering view and shared web/PDF chart data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = [
    {key:'h', title:'Pump Head', unit:'Head (m)'},
    {key:'eff', title:'Efficiency', unit:'Efficiency (%)', precision:1, suffix:'%'},
    {key:'power', title:'Shaft Power', unit:'Shaft Power (HP)', precision:2, suffix:' HP'},
    {key:'npsh', title:'NPSHr', unit:'NPSHr (m)', precision:2, suffix:' m'}
  ];
  const flowUnits = {'m³/h':1,'L/s':3.6,'L/min':.06,'US gpm':.227124707,'Imp. gpm':.2727654};
  const headUnits = {m:1,ft:.3048,bar:10.19716213,kPa:.1019716213,psi:.703249615};
  const number = value => typeof value === 'number' && Number.isFinite(value);
  const core = window.KeySuiteBFICore;
  const view = window.KeySuiteBFICurveView;
  const orders = {h:2,eff:5,power:3,npsh:3};
  const toHP = kw => number(kw) ? kw / 0.745699872 : null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hasCurve = model => (model?.curve || []).filter(p => number(p.q) && number(p.h)).length >= 2;
  const format = (v, places=2) => number(v) ? String(Number(v.toFixed(places))) : 'Unavailable';
  function curveFit(model,key,hz=50){
    const ratio=hz/50;
    if(!hasCurve(model)||!window.KeySuiteOperatingSpeed.valid(hz))return null;
    const scale=({h:ratio**2,power:ratio**3,npsh:ratio**2})[key]??1;
    return core.fitCurve({flow:model.curve.map(p=>p.q),[key]:model.curve.map(p=>p[key])},key,orders[key],ratio,scale);
  }
  function valueAt(fit,q){
    if(!fit||!number(q)||q<fit.min||q>fit.max)return null;
    const value=core.fitValue(fit,q);
    return number(value)?Math.max(0,value):null;
  }
  const ratedDuty = (model,hz=50) => core.ratedDuty(curveFit(model,'h',hz),curveFit(model,'eff',hz));
  function dutyPerformance(model,hz,duty){
    return Object.fromEntries(Object.keys(orders).map(key=>[key,valueAt(curveFit(model,key,hz),duty?.q)]));
  }
  function ticks(max){
    const raw=(max||1)/5, magnitude=10**Math.floor(Math.log10(raw));
    const step=[1,2,2.5,5,10].find(n=>n*magnitude>=raw)*magnitude;
    return Array.from({length:Math.ceil(max/step-1e-10)+1||2},(_,i)=>i*step);
  }
  function chart(model,key,hz,duties=[],powerHP=true,performance){
    const fit=curveFit(model,key,hz);
    const convert=key==='power'&&powerHP?toHP:v=>v;
    const points=core.sampleFit(fit,120).map(p=>({x:p.x,y:convert(Math.max(0,p.y))}));
    const markers=duties.flatMap((d,i)=>{
      if(!d)return [];
      const y=key==='h'?d.h:convert(i===0&&performance?performance[key]:valueAt(fit,d.q));
      return number(y)?[{x:d.q,y,label:'D'+(i+1)}]:[];
    });
    if(key==='h'){
      const best=core.bestEfficiency(curveFit(model,'eff',hz));
      if(best.eff>0){const y=valueAt(fit,best.flow);if(number(y))markers.push({x:best.flow,y,label:'BEP'})}
    }
    const plotted=[...points,...markers];
    return {points,markers,xTicks:ticks(Math.max(1,...plotted.map(p=>p.x))),yTicks:ticks(Math.max(.1,...plotted.map(p=>p.y))*1.05)};
  }
  function svg(model,field,hz,duties,large,pdf=false,performance){
    const {points,markers,xTicks,yTicks}=chart(model,field.key,hz,duties,true,performance);
    if(points.length<2)return '<p class="muted">Curve data unavailable.</p>';
    const w=700,h=large?(pdf?270:440):216,left=72,right=w-28,top=18,bottom=h-46;
    const x=v=>left+v/xTicks.at(-1)*(right-left),y=v=>bottom-v/yTicks.at(-1)*(bottom-top);
    return `<svg role="img" aria-label="${field.title} versus flow" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" font-family="Arial, sans-serif" font-size="11" fill="#718096">
      ${xTicks.map(v=>`<path d="M${x(v)} ${top}V${bottom}" stroke="#eef2f5"/><text x="${x(v)}" y="${bottom+21}" text-anchor="middle">${view.fmtTick(v)}</text>`).join('')}
      ${yTicks.map(v=>`<path d="M${left} ${y(v)}H${right}" stroke="#e8edf3"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${view.fmtTick(v)}</text>`).join('')}
      <text x="${(left+right)/2}" y="${h-5}" text-anchor="middle" font-weight="700" fill="#546274">Flow (m³/hr)</text>
      <text transform="translate(23 ${(top+bottom)/2}) rotate(-90)" text-anchor="middle" font-weight="700" fill="#546274">${field.unit}</text>
      <polyline points="${points.map(p=>x(p.x)+','+y(p.y)).join(' ')}" fill="none" stroke="#1264a3" stroke-width="${pdf?1.8:3}" stroke-linecap="round" stroke-linejoin="round"/>
      ${markers.map(p=>{
        if(p.label==='D1'&&field.key!=='h'){
          const label=format(p.y,pdf?1:field.precision)+field.suffix;
          return view.metricMarker(x(p.x),y(p.y),w,{r:28,t:18},label);
        }
        const color=p.label==='BEP'?'#15834b':'#d34242';
        return `<circle cx="${x(p.x)}" cy="${y(p.y)}" r="5" fill="${color}" stroke="white" stroke-width="2"/><text x="${x(p.x)+8}" y="${Math.max(12,y(p.y)-7)}" fill="${color}" font-weight="800">${p.label}</text>`;
      }).join('')}
    </svg>`;
  }
  function dutyMatches(models,q,h,phase='3Ph'){
    return models.filter(m=>hasCurve(m)&&m.phase===phase).map(model=>{
      const available=valueAt(curveFit(model,'h'),q);
      return {model,margin:available===null?null:available-h};
    }).filter(x=>x.margin!==null&&x.margin>=0).sort((a,b)=>a.margin-b.margin).map(x=>x.model);
  }
  const options = set => Object.keys(set).map(x=>`<option>${x}</option>`).join('');
  let selected, from='productG', hz=50, duties=[], automatic=false, cleared=false, summaryCollapsed=true;
  const currentModel=()=>window.KeySuiteG.models().find(p=>p.model===selected);
  const conditions=()=>({frequency_hz:hz,speed_rpm:Math.round(currentModel().speed*hz/50),flow_m3h:duties[0]?.q??null,head_m:duties[0]?.h??null,duty_points:duties.slice()});
  function render(){
    const model=currentModel(), adjusted=hz!==50;
    if(!model)return;
    $('gCurveHeading').textContent='Product Curve · '+model.model;
    $('gCurveTitle').textContent=model.model;
    $('gModelSpecs').textContent=`${model.inlet} × ${model.outlet} · ${model.phase==='1Ph'?'1 Phase':'3 Phase'}`;
    $('gMotorPower').textContent=`${model.hp} HP | IE1 · ${model.kw} kW`;
    $('gRpm').textContent=`${Math.round(model.speed*hz/50)} RPM`;
    $('gCurveSpeed').textContent=`Reference ${model.speed} RPM · Plotted at ${hz.toFixed(1)} Hz`;
    $('gPhase').value=model.phase;
    $('gVoltage').textContent=model.phase==='1Ph'?'240 V':'415 V';
    const d1=duties[0], performance=dutyPerformance(model,hz,d1);
    $('gCharts').innerHTML=view.chartLayout({
      headTitle:`Pump Curve · ${hz.toFixed(1)} Hz${adjusted?' (estimated)':''}`,
      headSvg:svg(model,fields[0],hz,duties,true),
      note:adjusted?'Curves at this frequency are speed-adjusted estimates.':'Guaranteed reference curves at 50 Hz.',
      metrics:fields.slice(1).map(field=>({title:field.title,svg:svg(model,field,hz,duties,false,false,performance)}))
    });
    const dutyText=d1?`${format(d1.q)} m³/h @ ${format(d1.h)} m`:'Unavailable';
    $('gDutyLabel').textContent=automatic?'BEP-based rated duty':'';
    $('gPrimaryDuty').innerHTML=view.dutyRow(1,d1?format(d1.q/flowUnits[$('gFlowUnit').value],3):'',d1?format(d1.h/headUnits[$('gHeadUnit').value],3):'',$('gFlowUnit').value,$('gHeadUnit').value);
    $('gPrimaryDuty').querySelector('button').onclick=safely(()=>{
      $('gDutyFlow').value=$('gDutyHead').value='';
      cleared=true;plot();
    });
    const summary=[
      ['Required Duty',dutyText],
      ['Pump Head',performance.h==null?'Unavailable':format(performance.h)+' m'],
      ['Motor Size',model.hp+' HP / '+model.kw+' kW'],
      ['Shut-off Head',format(valueAt(curveFit(model,'h',hz),0))+' m']
    ].map(([label,value])=>`<div class="g-summary-detail"><span>${label}</span><strong>${value}</strong></div>`).join('');
    $('gMetrics').innerHTML=summary+fields.slice(1).map(f=>{
      const available=performance[f.key], power=f.key==='power';
      const value=power?toHP(available):available;
      return `<div><span>${f.title}</span><strong>${value==null?'Unavailable':format(value,f.precision)+(power?' HP':f.suffix)}</strong><small>${d1?(power&&available!=null?format(available,2)+' kW at D1':'At D1 flow on the pump curve'):'Enter D1 to calculate'}</small></div>`;
    }).join('');
    view.syncSummary($('gSummaryToggle'),$('gMetrics'),summaryCollapsed);
    const alternatives=window.KeySuiteG.models().filter(p=>hasCurve(p)&&p.phase===model.phase&&p.model!==selected&&duties.every(d=>!d||(valueAt(curveFit(p,'h',hz),d.q)??-1)>=d.h));
    $('gAlternatives').innerHTML=alternatives.length?alternatives.map(p=>`<button class="btn secondary" type="button" data-g-alternative="${esc(p.model)}">${esc(p.model)}</button>`).join(' '):'<p class="muted">No alternative G model with verified data for this selection.</p>';
    $('gAlternatives').querySelectorAll('button').forEach(b=>b.onclick=safely(()=>{selected=b.dataset.gAlternative;plot()}));
  }
  function plot(){
    const input=$('gSpeed'),candidate=Number(input.value)/($('gSpeedUnit').value==='rpm'?currentModel().speed/50:1);
    if(!input.checkValidity()||!(candidate>0&&candidate<=window.KeySuiteOperatingSpeed.MAX_HZ))throw Error('Enter an operating speed above 0 and up to 60 Hz.');
    const pairs=[[$('gDutyFlow'),$('gDutyHead')],...[...$('gDutyPoints').children].map(row=>[...row.querySelectorAll('input')])];
    const flowFactor=flowUnits[$('gFlowUnit').value],headFactor=headUnits[$('gHeadUnit').value];
    const partial=!!pairs[0][0].value!==!!pairs[0][1].value;
    const plotted=pairs.map(([flow,head],index)=>{
      if(index===0&&partial)return null;
      if(!flow.value&&!head.value)return null;
      if(!flow.checkValidity()||!head.checkValidity()||!(Number(flow.value)>0&&Number(head.value)>0))throw Error('Enter positive flow and head for D'+(index+1)+'.');
      return {q:Number(flow.value)*flowFactor,h:Number(head.value)*headFactor};
    });
    const auto=!cleared&&!partial&&!plotted[0]?ratedDuty(currentModel(),candidate):null;
    if(auto)plotted[0]=auto;
    automatic=!!auto;
    hz=candidate;duties=plotted;
    window.KeySuiteOperatingSpeed.paint(input,hz);
    window.KeySuiteG.message(partial?'Enter both Flow and Head to plot D1.':'',partial);render();
  }
  function safely(action){return async()=>{try{await action()}catch(error){window.KeySuiteG.message(error.message,true)}}}
  function mount(){
    const page=$('productGCurve');
    page.innerHTML=`<div class="page-title-row g-page-title"><h2 id="gCurveHeading"></h2><button class="btn secondary" type="button" data-g-back>← Back</button></div>
      <header class="g-engineering-header"><img src="selector-bgf/bgreich-logo.png" alt="B.G.REICH"><div><h2>G Series</h2><small class="muted">Database Version: 261113-V1.0</small></div>
        <div class="g-header-actions"><button class="btn keysuite-cost-button" data-g-cost>Cost</button><button class="btn g-pdf-button" data-g-pdf>PDF</button><button class="btn action-assembly" data-g-assembly>Assembly</button><button class="btn action-quote" data-g-quote>Quote</button></div>
      </header>
      <div class="g-engineering-body">
       <aside class="g-engineering-card g-duty-form">
        <div class="g-duty-title"><h3>Required Duty</h3><label class="g-enhanced" title="Enhanced curve data is unavailable for G Series"><input type="checkbox" disabled> Enhanced</label><button class="btn g-pdf-button" data-g-plot>Plot</button></div>
        <label for="gDutyFlow">Flow</label><div class="g-unit-row"><input type="number" id="gDutyFlow" min="0" step="any"><select aria-label="Flow unit" id="gFlowUnit">${options(flowUnits)}</select></div>
        <label for="gDutyHead">Head</label><div class="g-unit-row"><input type="number" id="gDutyHead" min="0" step="any"><select aria-label="Head unit" id="gHeadUnit">${options(headUnits)}</select></div>
        <details open class="settings"><summary>Multiple Duty Points</summary><div class="settings-body">
          <div class="hint">D1 is the Required Duty above. D2–D6 are reference points and do not change D1.</div>
          <div id="gPrimaryDuty" class="duty-point-list"></div><div id="gDutyLabel" class="hint" role="status"></div>
          <div id="gDutyPoints" class="duty-point-list"></div><button class="add-duty-btn" type="button" data-g-add-duty>+ Duty Point</button>
          <div class="hint" style="margin:8px 0 0">Extra duty points use the same Flow and Head units selected for D1.</div>
        </div></details>
        <label for="gSpeed">Operating Speed</label><div class="g-unit-row"><input id="gSpeed" type="number" min="0.01" max="60" value="50" step="any" required><select id="gSpeedUnit" aria-label="Operating speed unit"><option value="hz">Hz</option><option value="rpm">RPM</option></select></div>
        <div class="frequency-info">0 Hz = 0 RPM · 50 Hz = <span id="gSpeedLimit"></span> RPM · 60 Hz = <span id="gSpeedMax"></span> RPM (Max)</div>
        <div class="motor-note">Changing operating speed updates this model’s curves live. Curves away from 50 Hz are speed-adjusted estimates.</div>
        <div class="speed-display"><span>Calculated Speed</span><b id="gRpm"></b></div>
        <label for="gEfficiency">Motor Efficiency</label><select id="gEfficiency"><option>IE1</option></select>
        <label for="gPhase">Motor Phase</label><select id="gPhase"><option value="1Ph">1 Phase</option><option value="3Ph">3 Phase</option></select>
        <div class="g-value">Motor Voltage <strong id="gVoltage"></strong></div>
       </aside>
       <div class="g-performance-main">
        <section class="g-engineering-card"><div class="g-selected"><div><small>SELECTED PUMP</small><h2 id="gCurveTitle"></h2><div id="gModelSpecs"></div><span class="g-selected-badge">SELECTED</span></div><div><strong id="gMotorPower"></strong><small id="gCurveSpeed"></small><div class="selection-action-row"><button id="gSummaryToggle" class="summary-toggle-btn" type="button" aria-controls="gMetrics">Summary ▶</button></div></div></div>
         <p id="gCurveMessage" role="status"></p><div id="gMetrics" class="g-metrics"></div>
         <div id="gCharts"></div>
        </section>
        <section class="g-engineering-card"><h3>Alternative Models</h3><div id="gAlternatives"></div></section>
       </div>
      </div>`;
    const button=(selector,action)=>page.querySelector(selector).onclick=safely(action);
    button('[data-g-back]',()=>window.KeySuiteApp.showPage(from));
    button('[data-g-plot]',plot);
    $('gSummaryToggle').onclick=()=>{
      summaryCollapsed=!summaryCollapsed;
      view.syncSummary($('gSummaryToggle'),$('gMetrics'),summaryCollapsed);
    };
    button('[data-g-cost]',()=>window.KeySuiteG.cost(currentModel()));
    button('[data-g-assembly]',()=>window.KeySuiteG.assembly(currentModel(),conditions()));
    button('[data-g-quote]',()=>window.KeySuiteG.quote(currentModel(),conditions()));
    button('[data-g-pdf]',()=>{
      plot();
      if(!duties[0])throw Error('Set a valid rated duty before opening the PDF.');
      window.KeySuiteGPdf.open(currentModel(),{hz,duties,performance:dutyPerformance(currentModel(),hz,duties[0])});
    });
    $('gPhase').onchange=safely(()=>{
      const other=window.KeySuiteG.models().find(p=>p.base===currentModel().base&&p.phase===$('gPhase').value);
      if(other&&hasCurve(other))selected=other.model;
      plot();
    });
    $('gSpeed').onchange=safely(plot);
    $('gSpeed').dataset.baseRpm=String(currentModel().speed);
    $('gSpeed').oninput=safely(plot);
    window.KeySuiteOperatingSpeed.configure($('gSpeed'),$('gSpeedUnit'),currentModel().speed);
    $('gSpeedLimit').textContent=currentModel().speed;
    $('gSpeedMax').textContent=currentModel().speed*window.KeySuiteOperatingSpeed.MAX_HZ/50;
    $('gSpeedUnit').onchange=safely(()=>{
      const rpm=$('gSpeedUnit').value==='rpm', speed=$('gSpeed');
      speed.max=rpm?currentModel().speed*window.KeySuiteOperatingSpeed.MAX_HZ/50:window.KeySuiteOperatingSpeed.MAX_HZ;
      speed.value=rpm?hz*currentModel().speed/50:hz;
      plot();
    });
    for(const id of ['gDutyFlow','gDutyHead']){
      $(id).oninput=()=>{cleared=false;};
      $(id).onchange=safely(plot);
    }
    for(const id of ['gDutyFlow','gDutyHead','gSpeed'])$(id).onkeydown=e=>{if(e.key==='Enter')safely(plot)()};
    const add=page.querySelector('[data-g-add-duty]');
    const points=$('gDutyPoints');
    const extraInputs=()=>Array.from(points.children,row=>Array.from(row.querySelectorAll('input'),input=>input.value));
    const drawRows=values=>{
      points.innerHTML=values.map(([flow,head],i)=>view.dutyRow(i+2,flow,head,$('gFlowUnit').value,$('gHeadUnit').value,true)).join('');
      view.updateAddButton(add,values.length);
      Array.from(points.children).forEach((row,i)=>{
        row.querySelector('button').onclick=safely(()=>{
          const data=extraInputs();data.splice(i,1);drawRows(data);plot();
        });
        row.querySelectorAll('input').forEach(input=>{
          const refresh=()=>{if(Array.from(row.querySelectorAll('input')).every(field=>field.value!==''))safely(plot)();};
          input.onchange=refresh;
          input.onkeydown=event=>{if(event.key==='Enter')refresh();};
        });
      });
    };
    $('gFlowUnit').onchange=$('gHeadUnit').onchange=safely(()=>{drawRows(extraInputs());plot();});
    add.onclick=()=>{
      if(points.children.length>=5)return;
      drawRows([...extraInputs(),['','']]);
      points.lastElementChild.querySelector('input').focus();
    };
  }
  function open(model,{origin='productG',duty}={}){
    if(!hasCurve(model))return false;
    selected=model.model;from=origin;hz=50;duties=[];cleared=false;summaryCollapsed=true;
    window.KeySuiteApp?.showPage?.('productGCurve');
    if(!$('productGCurve')?.classList.contains('active'))return false;
    mount();
    if(duty){$('gDutyFlow').value=duty.q;$('gDutyHead').value=duty.h}
    plot();
    $('productGCurve').scrollIntoView({block:'start'});
    return true;
  }
  window.KeySuiteGPerformance={hasCurve,curveFit,chart,svg,valueAt,ratedDuty,dutyPerformance,toHP,fields,dutyMatches,open,origin:()=>from};
})();
