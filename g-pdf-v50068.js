/* G technical report: three pages, workbook Pg 2 and Pg 3 data. */
(()=>{'use strict';
let loading;
function jsPdf(){
 if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
 if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/jspdf-2.5.2.umd.min.js';s.onload=()=>resolve(window.jspdf.jsPDF);s.onerror=reject;document.head.appendChild(s)});
 return loading;
}
function image(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=path})}
function line(doc,label,value,x,y){doc.setFont('helvetica','normal');doc.text(String(label),x,y);doc.setFont('helvetica','bold');doc.text(String(value??'—'),x+42,y)}
function heading(doc,title,n){
 doc.setFillColor(15,98,156);doc.rect(0,0,210,21,'F');doc.setFont('helvetica','bold');doc.setTextColor(255);doc.setFontSize(15);doc.text('B.G.Reich  |  G Series',15,14);
 doc.setTextColor(32,53,66);doc.setFontSize(16);doc.text(title,15,34);
 doc.setDrawColor(210,226,235);doc.line(15,40,195,40);
 doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('B.G.Reich reserves the right to make modifications without notice.',15,282);doc.text('Page '+n+' of 3',180,282);
}
function curve(doc,p){
 if(!p.curve?.length){doc.setFontSize(12);doc.text('Performance curve data is not supplied for this model.',20,105);return}
 const points=p.curve, x0=30,y0=200,w=150,h=105;
 const qmax=Math.max(...points.map(v=>v.q)),hmax=Math.max(...points.map(v=>v.h))*1.1;
 doc.setDrawColor(120);doc.line(x0,y0,x0+w,y0);doc.line(x0,y0,x0,y0-h);
 doc.setFontSize(9);doc.text('Flow (m3/h)',x0+w-23,y0+8);doc.text('Head (m)',x0-14,y0-h-3);
 doc.setDrawColor(15,98,156);doc.setLineWidth(.65);
 for(let i=1;i<points.length;i++)doc.line(x0+points[i-1].q/qmax*w,y0-points[i-1].h/hmax*h,x0+points[i].q/qmax*w,y0-points[i].h/hmax*h);
 doc.setLineWidth(.2);doc.setFontSize(8);doc.text('Source: G Data row '+p.row+'; only supplied points are plotted.',30,218);
}
async function open(p){
 const JS=await jsPdf(),doc=new JS({unit:'mm',format:'a4'});
 heading(doc,'Performance Summary · '+p.model,1);
 doc.setFontSize(11);line(doc,'Model',p.model,18,55);line(doc,'Motor',p.hp+' HP · '+p.phase,18,65);line(doc,'Speed',p.speed+' rpm',18,75);line(doc,'Connection',p.inlet+' × '+p.outlet,18,85);
 curve(doc,p);
 doc.addPage();heading(doc,'Operating and Technical Data · '+p.model,2);
 doc.setFontSize(10);doc.setTextColor(32,53,66);
 doc.setFont('helvetica','bold');doc.text('Operating Data',18,52);
 line(doc,'Application','—',18,62);line(doc,'Location','—',18,70);line(doc,'Fluid','Water, Clean',18,78);
 if(p.base==='G32-10-2'){line(doc,'Capacity','4.9 L/s (sheet example)',18,86);line(doc,'Pressure','20 m (sheet example)',18,94)}
 line(doc,'Density','0.9983 kg/dm3',18,102);line(doc,'Temperature','20 C',18,110);line(doc,'Kin. viscosity','1.005 mm2/s',18,118);
 line(doc,'Origin','Malaysia',107,62);line(doc,'Manufacture','China',107,70);
 doc.setFont('helvetica','bold');doc.text('Pump',18,134);
 line(doc,'Brand','B.G.Reich',18,144);line(doc,'Type','Close-coupled',18,152);line(doc,'Model',p.model,18,160);line(doc,'Speed',p.speed+' rpm',18,168);
 line(doc,'Casing','Cast Iron',18,176);line(doc,'Impeller','Stainless Steel',18,184);line(doc,'Shaft','Stainless Steel',18,192);line(doc,'Shaft Seal','Mechanical Seal',18,200);
 line(doc,'Impeller type','Closed',107,144);line(doc,'Bearing','Ball',107,152);
 if(p.base==='G32-10-2'){line(doc,'Efficiency','54.12 % (example)',107,160);line(doc,'Brake HP','0.8 HP (example)',107,168)}
 doc.setFont('helvetica','bold');doc.text('Motor · IE1 2 Pole',18,216);
 line(doc,'Model',p.motor.model,18,226);line(doc,'Rated power',p.hp+' HP',18,234);line(doc,'Speed',p.motor.speed+' rpm',18,242);
 line(doc,'FL Amp',p.phase==='1Ph'?p.motor.amp1:p.motor.amp3,18,250);line(doc,'Frequency','50 Hz',18,258);line(doc,'Voltage / phase',p.phase==='1Ph'?'240 V / 1 Ph':'415 V / 3 Ph',18,266);
 line(doc,'Motor brand','B.G.Reich',107,218);line(doc,'Motor type','TEFC',107,226);
 const eff=p.phase==='1Ph'?p.motor.efficiency1:p.motor.efficiency3,pf=p.phase==='1Ph'?p.motor.pf1:p.motor.pf3;
 line(doc,'Motor efficiency',typeof eff==='number'?eff+' %':'—',107,234);line(doc,'Power factor',typeof pf==='number'?pf:'—',107,242);
 line(doc,'Protection','IP 44',107,250);line(doc,'Insulation','Class B',107,258);
 line(doc,'Weight',p.weight+' kg',107,266);
 doc.addPage();heading(doc,'Dimension · '+p.model,3);
 const im=await image('assets/v50068/g-dimension.png');
 doc.addImage(im,'PNG',16,51,178,93);
 doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text('Table Dimensions',18,159);
 const dims=[['L',p.dimensions.L+' mm'],['L1',p.dimensions.L1+' mm'],['A',p.dimensions.A+' mm'],['B',p.dimensions.B+' mm'],['H',p.dimensions.H+' mm'],['H1',p.dimensions.H1+' mm'],['Inlet',p.inlet],['Outlet',p.outlet],['Weight',p.weight+' kg']];
 dims.forEach(([k,v],i)=>line(doc,k,v,i<5?18:108,171+(i<5?i:i-5)*13));
 doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('* Approximate dimension and weight. Drawing from G workbook, Pg 3 G Dimension.',18,245);
 doc.save('G_'+p.model+'.pdf');
}
window.KeySuiteGPdf={open};
})();
