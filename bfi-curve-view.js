/* BFI curve presentation shared with the G engineering view. */
(() => {
  'use strict';
function fmtTick(v){
 const a=Math.abs(v);
 if(a>=1000)return String(Math.round(v));
 if(a>=10)return Number(v.toFixed(1)).toString();
 return Number(v.toFixed(2)).toString();
}
function effAxis(v){return v<50?{step:10,max:50}:v<=80?{step:20,max:80}:{step:20,max:100}}
function metricMarker(px,py,W,p,valueText){
   const lx=px+8>W-p.r-62?px-8:px+8,anchor=lx<px?'end':'start',ly=py-8<p.t+10?py+17:py-8;
   return `<circle cx="${px}" cy="${py}" r="5.5" fill="#d34242" stroke="#fff" stroke-width="2"/><text x="${lx}" y="${ly}" text-anchor="${anchor}" font-family="Arial" font-size="10.5" font-weight="800" fill="#d34242">${valueText}</text>`;
}
function chartLayout({headTitle,headSvg,note,metrics}){
  return `<div class="curve-grid">
    <div class="chart-card chart-main"><div class="chart-title">${headTitle}</div>${headSvg}<div class="chart-note">${note}</div></div>
    <div class="chart-stack">${metrics.map(({title,svg})=>`<div class="chart-card chart-aux"><div class="chart-title">${title}</div>${svg}</div>`).join('')}</div>
  </div>`;
}
function dutyRow(number, flow, head, flowUnit, headUnit, editable=false) {
  const label = 'D'+number;
  const cell = (name,value,unit) => editable
    ? '<span class="duty-point-cell"><input aria-label="'+label+' '+name+'" type="number" min="0" step="any" value="'+value+'" data-duty-field="'+name+'"><span class="duty-point-unit">'+unit+'</span></span>'
    : '<span>'+(value!==''?Number(value).toLocaleString()+' '+unit:'—')+'</span>';
  return '<div class="'+(editable?'duty-point-row':'duty-point-primary')+'"><span class="duty-point-tag">'+label+'</span>'
    +cell('flow',flow,flowUnit)+cell('head',head,headUnit)
    +'<button class="duty-point-remove" type="button" aria-label="'+(editable?'Remove ':'Clear ')+label+'">×</button></div>';
}
function updateAddButton(button, count) {
  button.disabled=count>=5;
  button.textContent=button.disabled?'Maximum D1–D6 reached':'+ Duty Point';
}
function syncSummary(button, container, collapsed) {
  button.textContent=collapsed?'Summary ▶':'Summary ▼';
  button.setAttribute('aria-expanded',String(!collapsed));
  container.classList.toggle('summary-collapsed',collapsed);
}
window.KeySuiteBFICurveView={fmtTick,effAxis,metricMarker,chartLayout,dutyRow,updateAddButton,syncSummary};
})();
