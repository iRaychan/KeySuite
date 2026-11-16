/* G Series engineering view and shared web/PDF chart data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = [
    {key:'h', title:'Pump Head', unit:'Head (m)'},
    {key:'eff', title:'Efficiency', unit:'Efficiency (%)', precision:1, suffix:'%'},
    {key:'power', title:'Shaft Power', unit:'Shaft Power (kW)', precision:2, suffix:' kW'},
    {key:'npsh', title:'NPSHr', unit:'NPSHr (m)', precision:2, suffix:' m'}
  ];
  const flowUnits = {'m³/h':1,'L/s':3.6,'L/min':.06,'US gpm':.227124707,'Imp. gpm':.2727654};
  const headUnits = {m:1,ft:.3048,bar:10.19716213,kPa:.1019716213,psi:.703249615};
  const number = value => typeof value === 'number' && Number.isFinite(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hasCurve = model => (model?.curve || []).filter(p => number(p.q) && number(p.h)).length >= 2;
  const format = (v, places=2) => number(v) ? String(Number(v.toFixed(places))) : 'Unavailable';
  function chartPoints(model,key,hz=50){
    const ratio=hz/50;
    if(!hasCurve(model)||!number(hz)||hz<=0||hz>50)return [];
    // NPSHr is supplied only at reference speed. The affinity rules are for
    // flow, head and shaft power. Efficiency is estimated as constant at homologous points.
    const reference=key==='npsh';
    const scale=({h:ratio**2,power:ratio**3})[key]??1;
    return model.curve.filter(p=>number(p.q)&&number(p[key]))
      .map(p=>({x:p.q*(reference?1:ratio),y:p[key]*scale})).sort((a,b)=>a.x-b.x);
  }
  function valueAt(points,x){
    if(!number(x)||points.length<2||x<points[0].x||x>points.at(-1).x)return null;
    const i=points.findIndex(p=>p.x>=x);
    const b=points[i];
    if(i===0||b.x===x)return b.y;
    const a=points[i-1];
    return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
  }
  function ticks(max){
    const raw=(max||1)/5, magnitude=10**Math.floor(Math.log10(raw));
    const step=[1,2,2.5,5,10].find(n=>n*magnitude>=raw)*magnitude;
    return Array.from({length:Math.ceil(max/step-1e-10)+1||2},(_,i)=>i*step);
  }
  function chart(model,key,hz,duties=[]){
    const points=chartPoints(model,key,hz);
    const markers=key==='npsh'&&hz!==50?[]:duties.flatMap((d,i)=>{
      if(!d)return [];
      const y=key==='h'?d.h:valueAt(points,d.q);
      return number(y)?[{x:d.q,y,label:'D'+(i+1)}]:[];
    });
    if(key==='h'){
      const efficiency=chartPoints(model,'eff',hz);
      const best=efficiency.reduce((a,b)=>!a||b.y>a.y?b:a,null);
      if(best?.y>0){const y=valueAt(points,best.x);if(number(y))markers.push({x:best.x,y,label:'BEP'})}
    }
    const plotted=[...points,...markers];
    return {points,markers,xTicks:ticks(Math.max(1,...plotted.map(p=>p.x))),yTicks:ticks(Math.max(.1,...plotted.map(p=>p.y))*1.05)};
  }
  function svg(model,field,hz,duties,large){
    const {points,markers,xTicks,yTicks}=chart(model,field.key,hz,duties);
    if(points.length<2)return '<p class="muted">Curve data unavailable.</p>';
    const w=large?680:350,h=large?405:160,left=51,right=w-19,top=13,bottom=h-36;
    const x=v=>left+v/xTicks.at(-1)*(right-left),y=v=>bottom-v/yTicks.at(-1)*(bottom-top);
    return `<svg role="img" aria-label="${field.title} versus flow" viewBox="0 0 ${w} ${h}">
      ${xTicks.map(v=>`<path d="M${x(v)} ${top}V${bottom}" class="g-grid"/><text x="${x(v)}" y="${bottom+15}" text-anchor="middle">${format(v,3)}</text>`).join('')}
      ${yTicks.map(v=>`<path d="M${left} ${y(v)}H${right}" class="g-grid"/><text x="${left-8}" y="${y(v)+4}" text-anchor="end">${format(v,3)}</text>`).join('')}
      <path d="M${left} ${top}V${bottom}H${right}" class="g-axis"/>
      <text x="${(left+right)/2}" y="${h-4}" text-anchor="middle">Flow (m³/h)</text>
      <text transform="translate(12 ${(top+bottom)/2}) rotate(-90)" text-anchor="middle">${field.unit}</text>
      <polyline points="${points.map(p=>x(p.x)+','+y(p.y)).join(' ')}" class="g-line"/>
      ${markers.map(p=>`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="4" class="${p.label==='BEP'?'g-bep':'g-point'}"/><text x="${x(p.x)+(p.x>xTicks.at(-1)*.87?-6:6)}" y="${Math.max(12,y(p.y)-6)}" text-anchor="${p.x>xTicks.at(-1)*.87?'end':'start'}">${p.label}</text>`).join('')}
    </svg>`;
  }
  function dutyMatches(models,q,h,phase='3Ph'){
    return models.filter(m=>hasCurve(m)&&m.phase===phase).map(model=>{
      const available=valueAt(chartPoints(model,'h'),q);
      return {model,margin:available===null?null:available-h};
    }).filter(x=>x.margin!==null&&x.margin>=0).sort((a,b)=>a.margin-b.margin).map(x=>x.model);
  }
  const options = set => Object.keys(set).map(x=>`<option>${x}</option>`).join('');
  let selected, from='productG', hz=50, duties=[], extraCount=0;
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
    $('gCurveSpeed').textContent=`Guaranteed reference ${model.speed} RPM · Motor rated speed ${format(model.motor?.speed)} RPM`;
    $('gCurveBasis').textContent=adjusted?'Speed-adjusted estimate. NPSHr is shown at the guaranteed reference speed only.':'Guaranteed curve at 50 Hz. Markers indicate the entered duty points and the best efficiency point (BEP).';
    $('gPhase').value=model.phase;
    $('gVoltage').textContent=model.phase==='1Ph'?'240 V':'415 V';
    $('gChartHead').textContent=`Pump Curve · ${hz.toFixed(1)} Hz${adjusted?' (estimated)':''}`;
    $('gCurveSvg').innerHTML=svg(model,fields[0],hz,duties,true);
    $('gSecondaryCharts').innerHTML=fields.slice(1).map(f=>`<section class="g-chart"><h3>${f.title}${adjusted&&f.key==='npsh'?' · 50 Hz reference':''}</h3>${svg(model,f,hz,duties,false)}</section>`).join('');
    $('gMetrics').innerHTML=fields.slice(1).map(f=>{
      const d1=duties[0], available=d1&&!(adjusted&&f.key==='npsh')?valueAt(chartPoints(model,f.key,hz),d1.q):null;
      return `<div><span>${f.title}</span><strong>${available==null?'Unavailable':format(available,f.precision)+f.suffix}</strong><small>${d1?'At D1 flow on the pump curve':'Enter D1 to calculate'}</small></div>`;
    }).join('');
    const d1=duties[0];
    const alternatives=window.KeySuiteG.models().filter(p=>hasCurve(p)&&p.phase===model.phase&&p.model!==selected&&(!d1||(valueAt(chartPoints(p,'h',hz),d1.q)??-1)>=d1.h));
    $('gAlternatives').innerHTML=alternatives.length?alternatives.map(p=>`<button class="btn secondary" type="button" data-g-alternative="${esc(p.model)}">${esc(p.model)}</button>`).join(' '):'<p class="muted">No alternative G model with verified data for this selection.</p>';
    $('gAlternatives').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.gAlternative;render()});
  }
  function plot(){
    const input=$('gSpeed'),candidate=Number(input.value);
    if(!input.checkValidity()||!(candidate>0&&candidate<=50))throw Error('Enter an operating speed above 0 and up to 50 Hz.');
    const pairs=[[$('gDutyFlow'),$('gDutyHead')],...[...$('gDutyPoints').children].map(row=>[...row.querySelectorAll('input')])];
    const flowFactor=flowUnits[$('gFlowUnit').value],headFactor=headUnits[$('gHeadUnit').value];
    const plotted=pairs.map(([flow,head],index)=>{
      if(!flow.value&&!head.value)return null;
      if(!flow.checkValidity()||!head.checkValidity()||!(Number(flow.value)>0&&Number(head.value)>0))throw Error('Enter positive flow and head for D'+(index+1)+'.');
      return {q:Number(flow.value)*flowFactor,h:Number(head.value)*headFactor};
    });
    if(!plotted[0]&&plotted.slice(1).some(Boolean))throw Error('Enter D1 before plotting additional duty points.');
    hz=candidate;duties=plotted;
    window.KeySuiteG.message('');render();
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
        <div class="g-duty-title"><h3>Required Duty</h3><button class="btn g-pdf-button" data-g-plot>Plot</button></div>
        <label for="gDutyFlow">Flow</label><div class="g-unit-row"><input type="number" id="gDutyFlow" min="0" step="any"><select aria-label="Flow unit" id="gFlowUnit">${options(flowUnits)}</select></div>
        <label for="gDutyHead">Head</label><div class="g-unit-row"><input type="number" id="gDutyHead" min="0" step="any"><select aria-label="Head unit" id="gHeadUnit">${options(headUnits)}</select></div>
        <details open class="g-duty-details"><summary>Multiple Duty Points</summary><p>D1 is the required duty above. D2–D6 share the same units.</p><div id="gDutyPoints"></div><button class="btn secondary" data-g-add-duty>+ Duty Point</button></details>
        <label for="gSpeed">Operating Speed (Hz)</label><input id="gSpeed" type="number" min="0.01" max="50" value="50" step="any" required>
        <div class="g-value">Calculated Speed <strong id="gRpm"></strong></div>
        <label for="gEfficiency">Motor Efficiency</label><select id="gEfficiency"><option>IE1</option></select>
        <label for="gPhase">Motor Phase</label><select id="gPhase"><option value="1Ph">1 Phase</option><option value="3Ph">3 Phase</option></select>
        <div class="g-value">Motor Voltage <strong id="gVoltage"></strong></div>
       </aside>
       <div class="g-performance-main">
        <section class="g-engineering-card"><div class="g-selected"><div><small>SELECTED PUMP</small><h2 id="gCurveTitle"></h2><div id="gModelSpecs"></div></div><div><strong id="gMotorPower"></strong><small id="gCurveSpeed"></small></div></div>
         <p id="gCurveMessage" role="status"></p><div id="gMetrics" class="g-metrics"></div>
         <div class="g-chart-grid"><section class="g-chart"><h3 id="gChartHead"></h3><div id="gCurveSvg"></div><p id="gCurveBasis" class="muted"></p></section><div id="gSecondaryCharts"></div></div>
        </section>
        <section class="g-engineering-card"><h3>Alternative Models</h3><div id="gAlternatives"></div></section>
       </div>
      </div>`;
    const button=(selector,action)=>page.querySelector(selector).onclick=safely(action);
    button('[data-g-back]',()=>window.KeySuiteApp.showPage(from));
    button('[data-g-plot]',plot);
    button('[data-g-cost]',()=>window.KeySuiteG.cost(currentModel()));
    button('[data-g-assembly]',()=>window.KeySuiteG.assembly(currentModel(),conditions()));
    button('[data-g-quote]',()=>window.KeySuiteG.quote(currentModel(),conditions()));
    button('[data-g-pdf]',()=>window.KeySuiteGPdf.open(currentModel(),{hz,duties}));
    $('gPhase').onchange=()=>{
      const other=window.KeySuiteG.models().find(p=>p.base===currentModel().base&&p.phase===$('gPhase').value);
      if(other&&hasCurve(other))selected=other.model;
      render();
    };
    $('gSpeed').onchange=safely(plot);
    for(const id of ['gDutyFlow','gDutyHead','gSpeed'])$(id).onkeydown=e=>{if(e.key==='Enter')safely(plot)()};
    const add=page.querySelector('[data-g-add-duty]');
    const points=$('gDutyPoints');
    const renumber=()=>{
      extraCount=points.children.length;add.disabled=extraCount>=5;
      Array.from(points.children).forEach((row,i)=>{
        const label='D'+(i+2);row.firstElementChild.textContent=label;
        row.querySelectorAll('input').forEach(input=>input.setAttribute('aria-label',label+' '+input.dataset.kind));
        row.lastElementChild.setAttribute('aria-label','Remove '+label);
      });
    };
    add.onclick=()=>{
      if(extraCount>=5)return;
      const row=document.createElement('div');row.className='g-extra-duty';
      row.innerHTML='<b></b><input type="number" min="0" step="any" data-kind="flow" placeholder="Flow"><input type="number" min="0" step="any" data-kind="head" placeholder="Head"><button type="button" class="btn secondary">×</button>';
      row.lastElementChild.onclick=()=>{row.remove();renumber();safely(plot)()};
      points.append(row);renumber();row.querySelector('input').focus();
    };
  }
  function open(model,{origin='productG',duty}={}){
    if(!hasCurve(model))return false;
    selected=model.model;from=origin;hz=50;duties=[];extraCount=0;
    window.KeySuiteApp?.showPage?.('productGCurve');
    if(!$('productGCurve')?.classList.contains('active'))return false;
    mount();
    if(duty){$('gDutyFlow').value=duty.q;$('gDutyHead').value=duty.h;plot()}
    else render();
    $('productGCurve').scrollIntoView({block:'start'});
    return true;
  }
  window.KeySuiteGPerformance={hasCurve,chartPoints,chart,valueAt,fields,dutyMatches,open,origin:()=>from};
})();
