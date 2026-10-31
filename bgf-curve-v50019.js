/* KeySuite V5.00.19 — BGF 350M / 350E workbook performance curves. */
(()=>{'use strict';
  const BASE_RPM=2900;
  const BASE={
    flow:[0,1.11,2.02,3.04,4.13,5.08,6.15,7.18,8.16,9.25,10.28,11.32],
    head:[64.39,62.73,61.17,59.88,57.47,54.15,51.76,49.58,47.84,42.86,36.59,27.09],
    efficiency:[0,20,26.6520467836,36.3742690058,43.1286549708,46.7543859649,47.1929824561,50.7456140351,51.1988304094,47.7777777778,42.3,35.3],
    npshr:[3,3.05,3.1,3.2,3.3,3.4,3.5,3.65,3.8,3.95,4.1,4.5],
    shutoffPowerKw:.68
  };
  const MODELS={
    'BGF 350M':{drive:'Motor',fixed:true,rpm:BASE_RPM,minRpm:BASE_RPM,maxRpm:BASE_RPM},
    'BGF 350E':{drive:'Engine',fixed:false,rpm:BASE_RPM,minRpm:1800,maxRpm:3500}
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const fmt=(value,digits=1)=>Number(value).toLocaleString('en-MY',{maximumFractionDigits:digits,minimumFractionDigits:0});
  function hasCurve(model){return !!MODELS[String(model||'').toUpperCase()]}
  function pointsAt(rpm){
    const ratio=Number(rpm)/BASE_RPM,flow=BASE.flow.map(value=>value*ratio),head=BASE.head.map(value=>value*ratio*ratio),efficiency=[...BASE.efficiency],npshr=BASE.npshr.map(value=>value*ratio*ratio);
    const power=BASE.flow.map((q,index)=>index===0?BASE.shutoffPowerKw:Math.max(BASE.shutoffPowerKw,(998.3*9.80665*(q/3600)*BASE.head[index]/Math.max(BASE.efficiency[index]/100,.01))/1000)).map(value=>value*ratio*ratio*ratio);
    return {flow,head,efficiency,npshr,power};
  }
  function chart(title,xs,ys,unit,main=false){
    const width=main?760:420,height=main?430:190,left=54,right=16,top=18,bottom=38,maxX=Math.max(...xs)*1.04||1,maxY=Math.max(...ys)*1.08||1,x=value=>left+(width-left-right)*(value/maxX),y=value=>top+(height-top-bottom)*(1-value/maxY),path=xs.map((value,index)=>`${index?'L':'M'}${x(value).toFixed(1)},${y(ys[index]).toFixed(1)}`).join(' ');
    let ticks='';for(let i=0;i<=5;i++){const xv=maxX*i/5,yv=maxY*i/5;ticks+=`<line class="bgf-axis" x1="${x(xv)}" y1="${height-bottom}" x2="${x(xv)}" y2="${height-bottom+4}"/><text class="bgf-tick" x="${x(xv)}" y="${height-bottom+17}" text-anchor="middle">${fmt(xv,1)}</text><line class="bgf-axis" x1="${left-4}" y1="${y(yv)}" x2="${left}" y2="${y(yv)}"/><text class="bgf-tick" x="${left-7}" y="${y(yv)+3}" text-anchor="end">${fmt(yv,1)}</text>`}
    return `<section class="bgf-chart ${main?'bgf-chart-main':''}"><h3>${esc(title)}</h3><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><line class="bgf-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}"/><line class="bgf-axis" x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}"/>${ticks}<path class="bgf-line" d="${path}"/><text class="bgf-axis-label" x="${(left+width-right)/2}" y="${height-6}" text-anchor="middle">Flow (m³/h)</text><text class="bgf-axis-label" x="8" y="12">${esc(unit)}</text></svg></section>`;
  }
  function ensureDialog(){
    let dialog=document.getElementById('bgfCurveDialog');if(dialog)return dialog;
    const style=document.createElement('style');style.id='bgfCurveStyle';style.textContent=`
      #bgfCurveDialog{width:min(1480px,calc(100vw - 24px));max-width:none;max-height:calc(100vh - 24px);padding:0;border:0;border-radius:14px;background:#eef3f7;color:#203542;box-shadow:0 20px 70px #102a3d66;overflow:auto}#bgfCurveDialog::backdrop{background:#102a3d99}
      .bgf-curve-head{position:sticky;top:0;z-index:4;display:flex;align-items:center;gap:16px;padding:15px 18px;background:#fff;border-bottom:4px solid #0f629c}.bgf-curve-head img{height:48px;width:auto;padding:4px 8px;border:1px solid #d8e3ea;border-radius:8px}.bgf-curve-title{min-width:0}.bgf-curve-title h2{margin:0;color:#15384f}.bgf-curve-title p{margin:4px 0 0;color:#687b89;font-size:12px}.bgf-curve-close{margin-left:auto;width:auto;min-width:86px;padding:9px 13px;border:1px solid #b9cad6;border-radius:8px;background:#f5f9fc;color:#36566d;font-weight:800;cursor:pointer}
      .bgf-curve-body{max-width:1480px;margin:0 auto;padding:17px}.bgf-speed-card{display:flex;align-items:center;gap:14px;margin-bottom:14px;padding:12px 14px;border:1px solid #d8e3ea;border-radius:12px;background:#fff}.bgf-speed-card label{font-weight:800}.bgf-speed-card input{width:min(380px,42vw)}.bgf-speed-card output{min-width:88px;color:#0f629c;font-size:18px;font-weight:900}.bgf-speed-note{margin-left:auto;color:#687b89;font-size:12px;text-align:right}
      .bgf-chart-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(310px,.85fr);grid-template-rows:repeat(3,178px);gap:10px}.bgf-chart{min-width:0;display:flex;flex-direction:column;overflow:hidden;padding:11px;border:1px solid #d8e3ea;border-radius:11px;background:#fff}.bgf-chart-main{grid-row:1/4;height:554px}.bgf-chart h3{margin:0 0 6px;color:#15384f;font-size:14px}.bgf-chart svg{flex:1 1 auto;width:100%;height:100%;min-height:0;background:#fff}.bgf-axis{stroke:#7b8794;stroke-width:1}.bgf-line{fill:none;stroke:#0f629c;stroke-width:2.4}.bgf-tick{font:10px Arial;fill:#536171}.bgf-axis-label{font:11px Arial;fill:#15384f;font-weight:700}.bgf-curve-source{margin:12px 2px 0;color:#687b89;font-size:11px;line-height:1.45}
      @media(max-width:920px){.bgf-chart-grid{grid-template-columns:1fr;grid-template-rows:none}.bgf-chart-main{grid-row:auto;height:500px}.bgf-chart{height:210px}.bgf-speed-card{align-items:flex-start;flex-wrap:wrap}.bgf-speed-note{width:100%;text-align:left}}
    `;document.head.appendChild(style);
    dialog=document.createElement('dialog');dialog.id='bgfCurveDialog';dialog.innerHTML='<header class="bgf-curve-head"><img src="selector-cr/bgreich-logo.png" alt="B.G.REICH"><div class="bgf-curve-title"><h2 id="bgfCurveTitle"></h2><p id="bgfCurveSubtitle"></p></div><button class="bgf-curve-close" type="button">Close</button></header><div class="bgf-curve-body"><div id="bgfSpeedHost"></div><div id="bgfCharts" class="bgf-chart-grid"></div><p class="bgf-curve-source">Source: 004 - BGF 261030 - V1.0.xlsx, BGF Data rows 4–5. The 350E speed view applies pump affinity scaling from the workbook’s 2900 rpm reference curve; efficiency is retained at corresponding normalized flow.</p></div>';
    dialog.querySelector('.bgf-curve-close').onclick=()=>dialog.close();document.body.appendChild(dialog);return dialog;
  }
  function render(model,rpm){
    const config=MODELS[model],dialog=ensureDialog(),speed=config.fixed?config.rpm:clamp(Number(rpm)||config.rpm,config.minRpm,config.maxRpm),data=pointsAt(speed),host=dialog.querySelector('#bgfSpeedHost');
    dialog.querySelector('#bgfCurveTitle').textContent=`${model} Performance Curve`;dialog.querySelector('#bgfCurveSubtitle').textContent=config.fixed?`${config.drive} drive · fixed ${speed} rpm`:`${config.drive} drive · variable ${config.minRpm}–${config.maxRpm} rpm`;
    host.innerHTML=config.fixed?`<div class="bgf-speed-card"><label>Operating Speed</label><output>${fmt(speed,0)} rpm</output><span class="bgf-speed-note">Fixed-speed motor curve</span></div>`:`<div class="bgf-speed-card"><label for="bgfCurveRpm">Operating Speed</label><input id="bgfCurveRpm" type="range" min="${config.minRpm}" max="${config.maxRpm}" step="50" value="${speed}"><output>${fmt(speed,0)} rpm</output><span class="bgf-speed-note">Workbook range: ${config.minRpm}–${config.maxRpm} rpm</span></div>`;
    dialog.querySelector('#bgfCharts').innerHTML=chart('Head Curve',data.flow,data.head,'Head (m)',true)+chart('Efficiency Curve',data.flow,data.efficiency,'Efficiency (%)')+chart('Shaft Power Curve',data.flow,data.power,'Power (kW)')+chart('NPSHr Curve',data.flow,data.npshr,'NPSHr (m)');
    const slider=host.querySelector('#bgfCurveRpm');if(slider)slider.oninput=()=>render(model,Number(slider.value));return dialog;
  }
  function open(model){model=String(model||'').toUpperCase();if(!hasCurve(model))return false;const dialog=render(model,MODELS[model].rpm);if(!dialog.open)dialog.showModal();return true}
  window.KeySuiteBGFCurves={version:'5.00.19',source:'004 - BGF 261030 - V1.0.xlsx',baseRpm:BASE_RPM,models:Object.keys(MODELS),hasCurve,pointsAt,open};
})();
