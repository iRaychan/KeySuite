/* G Series three-page technical PDF. Data: G Pg 2/Pg 3 and IE1 2 Pole motor workbook. */
(()=>{'use strict';let loading;
function jsPdf(){if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/jspdf-2.5.2.umd.min.js';s.onload=()=>resolve(window.jspdf.jsPDF);s.onerror=reject;document.head.appendChild(s)});return loading}
function image(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=path})}
function loadInputs(){
 return Promise.all([jsPdf(),image('selector-bgf/bgreich-logo.png'),image('assets/v50068/g-dimension.png')]);
}
const fmt=(v,u='')=>v==null||v===''||v==='-'?'-':String(v)+u;
const round=(v,n=2)=>Number.isFinite(v)?Number(v.toFixed(n)):null;
function text(doc,value,x,y,size=9,bold=false,align='left'){
 doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(25,58,77);
 doc.text(String(value),x,y,{align});
}
function fit(doc,img,x,y,w,h){
 const ratio=img.naturalWidth/img.naturalHeight,width=Math.min(w,h*ratio),height=width/ratio;
 doc.addImage(img.src,'PNG',x+(w-width)/2,y+(h-height)/2,width,height);
}
function header(doc,logo,label,p,page){
 fit(doc,logo,15,9,48,15);
 text(doc,label,195,16,13,true,'right');
 text(doc,page===1?p.hp+' HP '+p.pole+'P · '+(p.phase==='3Ph'?'3 Phase':'1 Phase'):p.model,195,23,9,true,'right');
 doc.setDrawColor(25,58,77);doc.setLineWidth(.3);doc.line(15,28,195,28);
 text(doc,'B.G.Reich reserves the right to make modifications without notice.',105,287,8,false,'center');
 text(doc,page+' / 3',195,287,8,false,'right');
}
function section(doc,label,rows,y){
 const h=6.65;
 doc.setFillColor(249,219,228);doc.setDrawColor(154,164,173);doc.setLineWidth(.2);
 doc.rect(15,y,180,7.3,'FD');text(doc,label,105,y+5,10,true,'center');y+=7.3;
 for(const row of rows){
  doc.setDrawColor(175,185,193);doc.rect(15,y,180,h);
  for(const x of [61,106,153])doc.line(x,y,x,y+h);
  row.forEach((value,i)=>text(doc,value===''?'':fmt(value),[17,63,108,155][i],y+4.45,8.1));
  y+=h;
 }
 return y+4;
}
function vectorChart(doc,p,field,hz,duties,y){
 const {points,markers,xTicks,yTicks}=window.KeySuiteGPerformance.chart(p,field.key,hz,duties);
 const left=38,right=193,top=y+4,bottom=y+40;
 text(doc,field.unit+(field.key==='npsh'&&hz!==50?' - 50 Hz reference':''),15,y+1,9,true);
 if(points.length<2){text(doc,'Curve data unavailable.',left,y+18);return}
 const x=v=>left+v/xTicks.at(-1)*(right-left),v=z=>bottom-z/yTicks.at(-1)*(bottom-top);
 doc.setDrawColor(218,229,237);doc.setLineWidth(.15);
 for(const tick of xTicks){doc.line(x(tick),top,x(tick),bottom);text(doc,round(tick,3),x(tick),bottom+3.5,7,false,'center')}
 for(const tick of yTicks){doc.line(left,v(tick),right,v(tick));text(doc,round(tick,3),left-2,v(tick)+.8,7,false,'right')}
 doc.setDrawColor(123,147,166);doc.line(left,top,left,bottom);doc.line(left,bottom,right,bottom);
 text(doc,'Flow (m³/h)',(left+right)/2,bottom+7,7.5,false,'center');
 doc.setDrawColor(8,102,166);doc.setLineWidth(.45);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];doc.line(x(a.x),v(a.y),x(b.x),v(b.y))}
 for(const pt of markers){
  doc.setFillColor(...(pt.label==='BEP'?[0,113,64]:[208,39,75]));
  doc.circle(x(pt.x),v(pt.y),.9,'F');
  const flip=x(pt.x)>171;
  text(doc,pt.label,x(pt.x)+(flip?-1.7:1.7),v(pt.y)-1.8,7,true,flip?'right':'left');
 }
}
function technical(doc,p,hz,duties){
 const perf=window.KeySuiteGPerformance,d1=duties[0],m=p.motor||{},d=p.dimensions||{},three=p.phase==='3Ph';
 const atDuty=key=>d1&&(key!=='npsh'||hz===50)?round(perf.valueAt(perf.chartPoints(p,key,hz),d1.q)):null;
 let y=34;
 y=section(doc,'Operating Data',[
  ['Application','-','Location','-'],
  ['Fluid','Water, Clean','Capacity at D1',fmt(d1&&round(d1.q),' m³/h')],
  ['Density','0.9983 kg/dm³','Head at D1',fmt(d1&&round(d1.h),' m')],
  ['Kin. Viscosity','1.005 mm²/s','Temperature','20 °C'],
  ['Curve Basis',hz===50?'Guaranteed reference':'Speed-adjusted estimate','Plotted Speed',fmt(Math.round(p.speed*hz/50),' rpm')]
 ],y);
 y=section(doc,'Pump',[
  ['Brand','B.G.Reich','Country of Origin','Malaysia'],
  ['Type','Close-coupled','Country of Manufacture','China'],
  ['Model',p.model,'Suction Size',p.inlet],
  ['Guaranteed Curve Speed',fmt(p.speed,' rpm'),'Discharge Size',p.outlet],
  ['Casing','Cast Iron','Efficiency at D1 Flow',fmt(atDuty('eff'),' %')],
  ['Impeller','Stainless Steel','Shaft Power at D1 Flow',fmt(atDuty('power'),' kW')],
  ['Shaft','Stainless Steel','NPSHr at D1 Flow',fmt(atDuty('npsh'),' m')],
  ['Shaft Seal','Mechanical Seal','Impeller Type','Closed'],
  ['Bearing Type','Ball','','']
 ],y);
 y=section(doc,'Motor',[
  ['Brand','B.G.Reich','Country of Origin','Malaysia'],
  ['Type','TEFC','Country of Manufacture','China'],
  ['Model',m.model,'Efficiency Class','IE1'],
  ['Rated Power',p.hp+' HP / '+p.kw+' kW','Efficiency at 100%',fmt(three?m.efficiency3:m.efficiency1,' %')],
  ['Motor Rated Speed',fmt(m.speed,' rpm'),'Power Factor at 100%',fmt(three?m.pf3:m.pf1)],
  ['Rated FL Amp',fmt(three?m.amp3:m.amp1,' A'),'Protection','IP 44'],
  ['Rated Voltage',three?'415 V':'240 V','Insulation Class','Class B'],
  ['Phase',three?'3 Phase':'1 Phase','Rated Frequency','50 Hz']
 ],y);
 y=section(doc,'Pumpset',[
  ['Length',fmt(d.L,' mm'),'Weight',fmt(p.weight,' kg')],
  ['Width',fmt(d.B,' mm'),'Height',fmt(d.H,' mm')]
 ],y);
 text(doc,'* Approximate dimension and weight',15,y+1,8);
}
function build(JS,p,{hz=50,duties=[]}={},logo,drawing){
 const doc=new JS({unit:'mm',format:'a4',compress:true});
 doc.setProperties({title:'G Series - '+p.model,subject:'B.G.Reich engineering data'});
 header(doc,logo,p.model,p,1);
 const d1=duties[0],speed=Math.round(p.speed*hz/50);
 text(doc,d1?round(d1.q)+' m³/h @ '+round(d1.h)+' m':'Performance Curves',105,39,14,true,'center');
 text(doc,hz===50?'Guaranteed reference: 50 Hz / '+p.speed+' rpm':'Estimated: '+hz+' Hz / '+speed+' rpm. Guaranteed reference: '+p.speed+' rpm.',105,46,9,false,'center');
 window.KeySuiteGPerformance.fields.forEach((field,i)=>vectorChart(doc,p,field,hz,duties,55+i*54));
 doc.addPage();
 header(doc,logo,'TECHNICAL DATA',p,2);
 technical(doc,p,hz,duties);
 doc.addPage();
 header(doc,logo,'DIMENSION',p,3);
 text(doc,'Dimension',105,42,16,true,'center');
 fit(doc,drawing,16,48,178,129);
 const d=p.dimensions||{};
 const y=section(doc,'Table Dimensions',[
  ['L',fmt(d.L,' mm'),'L1',fmt(d.L1,' mm')],
  ['A',fmt(d.A,' mm'),'B',fmt(d.B,' mm')],
  ['H',fmt(d.H,' mm'),'H1',fmt(d.H1,' mm')],
  ['Suction',p.inlet,'Discharge',p.outlet],
  ['Weight',fmt(p.weight,' kg'),'','']
 ],184);
 text(doc,'* Approximate dimension and weight',15,y+2,8);
 return doc;
}
async function open(p,options){
 const [JS,logo,drawing]=await loadInputs();
 build(JS,p,options,logo,drawing).save('G_'+p.model+'.pdf');
}
window.KeySuiteGPdf={open,build};
})();
