import { PDFDocument, StandardFonts, rgb, degrees } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';
// Load C4/G1 first and preserve it under dedicated aliases. Then load C6/G2 into the legacy globals.
import '../shared-chc-g1/chc-data.js';
import '../shared-chc-g1/chc-selector-core.js';
import '../shared-chc/chc-data.js';
import '../shared-chc/chc-selector-core.js';
import '../shared-bfi/bfi-data.js';
import '../shared-bfi/bfi-selector-core.js';
import { CHC_DIMENSIONS } from './chc-dimensions.ts';
import { CHC_G1_DIMENSIONS } from './chc-g1-dimensions.ts';
import './es-core.js';
import './es-data.js';
import './motor-data.js';
import './v40205-motor-baseplate-data.js';
import './v40205-motor-baseplate.js';

const CHC_DB:any=(globalThis as any).KeySuiteCHCData; // C6 / G2
const CHC_CORE:any=(globalThis as any).KeySuiteCHCCore; // C6 / G2
const CHC_G1_DB:any=(globalThis as any).KeySuiteCHCG1Data;
const CHC_G1_CORE:any=(globalThis as any).KeySuiteCHCG1Core;
const BFI_DB:any=(globalThis as any).KeySuiteBFIData;
const BFI_CORE:any=(globalThis as any).KeySuiteBFICore;
const MB:any=(globalThis as any).KeySuiteMotorBaseplateV40205;
if(!CHC_DB||!CHC_CORE||!CHC_G1_DB||!CHC_G1_CORE||!BFI_DB||!BFI_CORE)throw new Error('KeySuite CHC C4/C6 / BFI selector core/data unavailable.');
function isChcFamily(fam:any){const f=String(fam||'').toUpperCase();return f==='CHC'||f==='CHC_G1'||f==='CHC_G2'}
function isBfiFamily(fam:any){return String(fam||'').toUpperCase()==='BFI'}
function chcEngine(fam:any){const f=String(fam||'').toUpperCase();return f==='CHC_G1'?{db:CHC_G1_DB,core:CHC_G1_CORE,generation:'G1',label:'CHC C4',motorEff:'IE2'}:{db:CHC_DB,core:CHC_CORE,generation:'G2',label:'CHC C6',motorEff:'IE3'}}

function chcG1DimensionVariant(material:any){
  const raw=String(material||'SS304 (Cast Iron Connection)').trim().toUpperCase().replace(/\s+/g,' ');
  if(/SS\s*316/.test(raw))return 'CHCN';
  if(/SS\s*304/.test(raw)&&!/(?:CAST\s*IRON|\bCI\b).*CONNECTION/.test(raw))return 'CHCS';
  return 'CHC';
}
function chcG1DimensionImageKey(series:any,material:any){
  const match=String(series||'').match(/CHC\s*(\d+)/i),family=match?Number(match[1]):0,variant=chcG1DimensionVariant(material);
  if([1,2,3,4,5].includes(family))return variant==='CHC'?'1':'2';
  if([8,10].includes(family))return variant==='CHC'?'3':'4';
  if(family===12)return '5';
  if([15,16,20].includes(family))return variant==='CHC'?'6':'7';
  if(family===32)return '8';
  if(family===45)return '9';
  if(family===64)return '10';
  if(family===90)return '11';
  if([120,150].includes(family))return '12';
  if(family===200)return '13';
  return '';
}

const BFI_DIMENSION_BASE:any={
  'BFI 1':{w:158,h:165,image:'bfi-1.png'},
  'BFI 2':{w:158,h:165,image:'bfi-2-3.png'},
  'BFI 3':{w:158,h:165,image:'bfi-2-3.png'},
  'BFI 4':{w:158,h:165,image:'bfi-4-5.png'},
  'BFI 5':{w:158,h:165,image:'bfi-4-5.png'},
  'BFI 8':{w:182,h:null,image:'bfi-8-11-12-13.png'},
  'BFI 11':{w:182,h:null,image:'bfi-8-11-12-13.png'},
  'BFI 12':{w:182,h:null,image:'bfi-8-11-12-13.png'},
  'BFI 13':{w:182,h:null,image:'bfi-8-11-12-13.png'},
  'BFI 10':{w:182,h:null,image:'bfi-10.png'},
  'BFI 15':{w:182,h:null,image:'bfi-15-20.png'},
  'BFI 20':{w:182,h:null,image:'bfi-15-20.png'}
};
function bfiSeriesKey(model:any,series:any=''){
  const explicit=String(series||'').trim().toUpperCase(),m=String(model||'').match(/BFI\s*(\d+)/i);
  return m?`BFI ${m[1]}`:(explicit.match(/^BFI\s+\d+$/)?explicit:'');
}
function bfiDimValue(dim:any,key:string,phase:string){
  const v=dim?.[`${key} (${phase})`];
  return v===null||v===undefined||v===''||!finite(v)?null:Number(v);
}
function bfiDimensionSummary(model:any,series:any,dim:any,phase:any,weightKg:any){
  const ph=String(phase||'3Ph')==='1Ph'?'1Ph':'3Ph',key=bfiSeriesKey(model,series),base=BFI_DIMENSION_BASE[key]||{};
  const values:any={};['L1','L2','L3','L4','L5','L6','B1','B2','H','H2'].forEach(k=>values[k]=bfiDimValue(dim,k,ph));
  const nums=(a:any[])=>a.filter(v=>v!==null&&v!==undefined&&v!==''&&finite(v)).map(Number);
  const ls=nums([values.L1,values.L2,values.L3,values.L4,values.L5,values.L6]);
  const ws=nums([base.w,values.B1,values.B2]),hs=nums([base.h,values.H,values.H2]);
  return {key,phase:ph,values,length:ls.length?Math.max(...ls):0,width:ws.length?Math.max(...ws):0,height:hs.length?Math.max(...hs):0,weight:Number(weightKg||0)||0,image:String(base.image||'')};
}


type XY={x:number,y:number};
type ChartSpec={
  yLabel:string;
  points:XY[];
  duty:XY;
  dutyLabel?:string;
  series?:Array<{points:XY[],label?:string,color?:any,width?:number,dash?:number[]}>;
  bep?:XY|null;
  bepLabel?:string;
  xLabel?:string;
  yMax?:number;
};

const finite=(v:any)=>Number.isFinite(Number(v));
const n=(v:any,d=2)=>finite(v)?Number(Number(v).toFixed(d)):0;
const fmt=(v:any,d=1)=>{const x=n(v,d);return Number.isInteger(x)?String(x):x.toFixed(d)};
const LETTER:[number,number]=[612,792];
const BLUE=rgb(0.04,0.38,0.64), DARK=rgb(0.08,0.22,0.31), GRID=rgb(0.85,0.90,0.93);
const RED=rgb(0.85,0.13,0.12), GREEN=rgb(0.02,0.50,0.33), PINK=rgb(0.90,0.68,0.69);

function b64bytes(s:string){const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
const KEYCHC_PUBLIC_BASE_FALLBACK='https://iraychan.github.io/KeySuite';
function publicAssetBases(baseUrl:any){
  const out:string[]=[];
  const add=(value:any)=>{const clean=String(value||'').trim().replace(/\/+$/,'');if(clean&&!out.includes(clean))out.push(clean)};
  add(baseUrl);add(KEYCHC_PUBLIC_BASE_FALLBACK);add('https://raw.githubusercontent.com/iRaychan/KeySuite/main');
  return out;
}
async function embedPublicPng(pdf:any,baseUrl:any,relativePath:string){
  const cleanPath=String(relativePath||'').replace(/^\/+/,''),errors:string[]=[];
  for(const base of publicAssetBases(baseUrl)){
    const url=`${base}/${cleanPath}${cleanPath.includes('?')?'&':'?'}v=42605`;
    try{
      const response=await fetch(url,{headers:{'Accept':'image/png'}});
      if(!response.ok){errors.push(`${response.status} ${url}`);continue}
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.length<8||bytes[0]!==0x89||bytes[1]!==0x50||bytes[2]!==0x4e||bytes[3]!==0x47){errors.push(`Not PNG ${url}`);continue}
      return await pdf.embedPng(bytes);
    }catch(error){errors.push(`${error instanceof Error?error.message:String(error)} ${url}`)}
  }
  throw new Error(`CHC C4 dimension drawing could not be loaded (${cleanPath}). ${errors.join(' | ')}`);
}
async function embedPublicJpg(pdf:any,baseUrl:any,relativePath:string){
  const cleanPath=String(relativePath||'').replace(/^\/+/,''),errors:string[]=[];
  for(const base of publicAssetBases(baseUrl)){
    const url=`${base}/${cleanPath}${cleanPath.includes('?')?'&':'?'}v=42605`;
    try{
      const response=await fetch(url,{headers:{'Accept':'image/jpeg'}});
      if(!response.ok){errors.push(`${response.status} ${url}`);continue}
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8){errors.push(`Not JPEG ${url}`);continue}
      return await pdf.embedJpg(bytes);
    }catch(error){errors.push(`${error instanceof Error?error.message:String(error)} ${url}`)}
  }
  throw new Error(`Optimized PDF image could not be loaded (${cleanPath}). ${errors.join(' | ')}`);
}
function reportLogoPayload(value:any){
  const raw=String(value||'').trim();
  if(!raw)return null;
  const data=raw.match(/^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/i);
  if(data)return {type:/png/i.test(data[1])?'png':'jpg',bytes:b64bytes(data[2].replace(/\s+/g,''))};
  if(/^iVBOR/i.test(raw))return {type:'png',bytes:b64bytes(raw.replace(/\s+/g,''))};
  if(/^\/9j\//.test(raw))return {type:'jpg',bytes:b64bytes(raw.replace(/\s+/g,''))};
  return null;
}
async function embedReportLogo(pdf:any,value:any,baseUrl:any,optimizePdf=true){
  const custom=reportLogoPayload(value);
  if(custom){
    try{return custom.type==='jpg'?await pdf.embedJpg(custom.bytes):await pdf.embedPng(custom.bytes)}catch(_){}
  }
  // V4.26.05: keep large static PDF artwork out of the Edge Function bundle.
  // Fetch it from the deployed KeySuite web assets instead, with GitHub as fallback.
  if(optimizePdf){
    try{return await embedPublicJpg(pdf,baseUrl,'assets/keybot-pdf/report-logo.jpg')}catch(_){}
    return await embedPublicPng(pdf,baseUrl,'assets/keybot-pdf/report-logo.png');
  }
  try{return await embedPublicPng(pdf,baseUrl,'assets/keybot-pdf/report-logo.png')}catch(_){}
  return await embedPublicJpg(pdf,baseUrl,'assets/keybot-pdf/report-logo.jpg');
}
function sampleFit(f:any,count=120,core:any=CHC_CORE){return core.sampleFit(f,count)}
// V4.26.05: match KeySelector V4.25.13 display-only Power smoothing.
// Ignore the zero-flow hydraulic power point, estimate a non-zero shut-off power
// from the first two positive-flow points, then use shape-preserving cubic
// interpolation. Selection, duty calculations and motor sizing remain unchanged.
function keysuitePowerSmoothFit(fit:any){
  const grouped:any[]=[];
  for(const p of (fit?.pts||[])){const x=Number(p?.x),y=Number(p?.y);if(!(finite(x)&&x>1e-9&&finite(y)&&y>=0))continue;const last=grouped[grouped.length-1];if(last&&Math.abs(last.x-x)<1e-9){last.sum+=y;last.count++;last.y=last.sum/last.count}else grouped.push({x,y,sum:y,count:1});}
  grouped.sort((a:any,b:any)=>a.x-b.x);if(grouped.length<2)return null;
  const x1=grouped[0].x,x2=grouped[1].x,y1=grouped[0].y,y2=grouped[1].y;if(!(x2>x1&&y1>0))return null;
  const slope=(y2-y1)/(x2-x1);let y0=y1-slope*x1;const minY=Math.max(y1*.15,1e-6),maxY=Math.max(y1*1.75,minY);if(!finite(y0))y0=y1;y0=Math.max(minY,Math.min(maxY,y0));
  const pts=[{x:0,y:y0},...grouped.map((p:any)=>({x:p.x,y:p.y}))],n=pts.length,h:number[]=[],delta:number[]=[];
  for(let i=0;i<n-1;i++){h[i]=pts[i+1].x-pts[i].x;if(!(h[i]>0))return null;delta[i]=(pts[i+1].y-pts[i].y)/h[i]}
  const d=new Array(n).fill(0);
  if(n===2){d[0]=d[1]=delta[0]}else{
    for(let i=1;i<n-1;i++){const a=delta[i-1],b=delta[i];if(a===0||b===0||Math.sign(a)!==Math.sign(b))d[i]=0;else{const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];d[i]=(w1+w2)/(w1/a+w2/b)}}
    const edge=(h0:number,h1:number,s0:number,s1:number)=>{let m=((2*h0+h1)*s0-h0*s1)/(h0+h1);if(Math.sign(m)!==Math.sign(s0))m=0;else if(Math.sign(s0)!==Math.sign(s1)&&Math.abs(m)>Math.abs(3*s0))m=3*s0;return finite(m)?m:0};
    d[0]=edge(h[0],h[1],delta[0],delta[1]);d[n-1]=edge(h[n-2],h[n-3],delta[n-2],delta[n-3]);
  }
  return {pts,d,min:0,max:pts[n-1].x,y0};
}
function keysuitePowerSmoothValue(smooth:any,x:number){
  x=Number(x);if(!smooth||!finite(x))return NaN;const pts=smooth.pts||[],d=smooth.d||[];if(!pts.length||x<pts[0].x-1e-9||x>pts[pts.length-1].x+1e-9)return NaN;
  if(x<=pts[0].x+1e-9)return pts[0].y;if(x>=pts[pts.length-1].x-1e-9)return pts[pts.length-1].y;let lo=0,hi=pts.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(pts[mid].x<=x)lo=mid;else hi=mid}
  const a=pts[lo],b=pts[hi],hh=b.x-a.x;if(!(hh>0))return a.y;const t=(x-a.x)/hh,t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*a.y+(t3-2*t2+t)*hh*d[lo]+(-2*t3+3*t2)*b.y+(t3-t2)*hh*d[hi];
}
function sampleSmoothPower(fit:any,count=180,yScale=1,core:any=CHC_CORE){
  const smooth=keysuitePowerSmoothFit(fit);if(!smooth)return sampleFit(fit,count,core).map((p:any)=>({x:Number(p.x),y:Number(p.y)*yScale}));const out:XY[]=[];for(let i=0;i<=count;i++){const x=smooth.max*i/count,y=keysuitePowerSmoothValue(smooth,x);if(finite(y))out.push({x,y:Math.max(0,y*yScale)});}return out;
}
function sampleEsFit(points:XY[],order:number,yScale=1,count=180){
  const core=(globalThis as any).ESCore;
  const clean=(points||[]).filter(p=>finite(p.x)&&finite(p.y)).sort((a,b)=>a.x-b.x);
  if(!core||clean.length<2)return clean.map(p=>({x:Number(p.x),y:Number(p.y)*yScale}));
  const fit=core.polyFit(clean.map(p=>Number(p.x)),clean.map(p=>Number(p.y)),order);
  if(!fit)return clean.map(p=>({x:Number(p.x),y:Number(p.y)*yScale}));
  const out:XY[]=[];
  for(let i=0;i<=count;i++){
    const x=fit.min+(fit.max-fit.min)*i/count;
    const y=core.polyEval(fit,x,false);
    if(finite(y))out.push({x:Number(x),y:Math.max(0,Number(y)*yScale)});
  }
  return out;
}
function selectChc(q:number,h:number,forcedModel:string='',family:string='CHC'){
  const engine=chcEngine(family),db=engine.db,core=engine.core;
  const wanted=String(forcedModel||'').replace(/^VMS\b/i,'CHC').replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC').trim().toUpperCase();
  if(wanted){const row=(db?.models||[]).find((m:any)=>String(m.model||'').toUpperCase()===wanted);if(!row)return null;return core.evaluateModel(db,row,q,h,50)}
  return core.select(db,q,h,50).selected;
}

function selectBfi(q:number,h:number,forcedModel:string=''){
  const wanted=String(forcedModel||'').replace(/[TE]$/i,'').trim().toUpperCase();
  if(wanted){const row=(BFI_DB?.models||[]).find((m:any)=>String(m.model||'').toUpperCase()===wanted);if(!row)return null;return BFI_CORE.evaluateModel(BFI_DB,row,q,h,50)}
  return BFI_CORE.select(BFI_DB,q,h,50).selected;
}

const BFI_ENHANCED_MAX_HZ=60;
const BFI_ENHANCED_MAX_RATIO=BFI_ENHANCED_MAX_HZ/Number(BFI_DB?.base_hz||50);
const BFI_ENHANCED_MAX_RPM=3480;
function bfiMixedRawPoint(curve:any,mix:any,i:number){
  const q=Number(curve?.flow?.[i]),hf=Number(curve?.head_per_stage?.[i]);if(!finite(q)||!finite(hf))return null;
  const hs=mix.small>0?Number(curve?.head_per_stage_2?.[i]):0,hss=mix.smallest>0?Number(curve?.head_per_stage_3?.[i]):0;
  const ef=Number(curve?.efficiency?.[i]),es=mix.small>0?Number(curve?.efficiency_2?.[i]):0,ess=mix.smallest>0?Number(curve?.efficiency_3?.[i]):0,np=Number(curve?.npshr?.[i]);
  if(mix.small>0&&(!finite(hs)||!finite(es)))return null;if(mix.smallest>0&&(!finite(hss)||!finite(ess)))return null;if(!finite(ef))return null;
  const head=mix.full*hf+mix.small*hs+mix.smallest*hss,eff=Math.max(1,Math.min(100,(mix.full*ef+mix.small*es+mix.smallest*ess)/mix.total));
  return {q,head,eff,npsh:finite(np)?Math.max(0,np):0};
}
function bfiEnhancedFit(raw:any[],key:string,order:number){
  const pts:any[]=[],seen=new Set<string>();for(const p of raw||[]){const x=Number(p?.flow),y=Number(p?.[key]);if(!finite(x)||!finite(y))continue;const k=x.toFixed(7);if(seen.has(k))continue;seen.add(k);pts.push({x,y});}
  pts.sort((a,b)=>a.x-b.x);if(pts.length<2)return null;const ord=Math.min(order,pts.length-1);return {pts,c:BFI_CORE.polyfit(pts.map((p:any)=>p.x),pts.map((p:any)=>p.y),ord),order:ord,min:pts[0].x,max:pts[pts.length-1].x};
}
function bfiInterpolatedFit(points:any[]){
  const pts=(points||[]).filter((p:any)=>finite(p?.x)&&finite(p?.y)).sort((a:any,b:any)=>a.x-b.x);if(pts.length<2)return null;
  return {pts,min:pts[0].x,max:pts[pts.length-1].x};
}
function bfiInterpolatedValue(fit:any,x:number){
  const pts=fit?.pts||[];if(!pts.length)return NaN;if(x<=pts[0].x)return Number(pts[0].y);if(x>=pts[pts.length-1].x)return Number(pts[pts.length-1].y);
  for(let i=1;i<pts.length;i++)if(x<=pts[i].x){const a=pts[i-1],b=pts[i],r=(x-a.x)/(b.x-a.x||1);return a.y+(b.y-a.y)*r;}return Number(pts[pts.length-1].y);
}
function bfiEnhancedCurveData(m:any){
  const curve=BFI_DB?.curves?.[m.series]||BFI_DB?.curves?.[String(m.series||'').replace(/\D/g,'')];if(!curve)return null;const mix=BFI_CORE.parseImpellerMix(m),motorKw=Number(m.motor_kw);if(!(motorKw>0))return null;
  const raw:any[]=[];for(let i=0;i<(curve.flow||[]).length;i++){const p=bfiMixedRawPoint(curve,mix,i);if(!p||!(p.head>0))continue;const basePower=p.q>0?9.81*p.q*p.head/3600/(p.eff/100):0;let ratio=BFI_ENHANCED_MAX_RATIO;if(basePower>0){const limited=Math.cbrt(motorKw/basePower);if(finite(limited))ratio=Math.min(BFI_ENHANCED_MAX_RATIO,limited)}ratio=Math.max(.05,ratio);raw.push({baseFlow:p.q,baseHead:p.head,basePower,ratio,hz:Number(BFI_DB.base_hz||50)*ratio,flow:p.q*ratio,head:p.head*ratio*ratio,eff:p.eff,npsh:p.npsh*ratio*ratio,power:basePower*ratio*ratio*ratio});}
  if(raw.length<2)return null;const headFit=bfiEnhancedFit(raw,'head',2),effFit=bfiEnhancedFit(raw,'eff',5),npshFit=bfiEnhancedFit(raw,'npsh',3),powerFit=bfiEnhancedFit(raw,'power',6),hzFit=bfiInterpolatedFit(raw.map(p=>({x:p.flow,y:p.hz})));if(!headFit||!effFit||!npshFit||!powerFit||!hzFit)return null;return {raw,headFit,effFit,npshFit,powerFit,hzFit};
}
function evaluateEnhancedBfi(m:any,q:number,h:number){
  const data=bfiEnhancedCurveData(m);if(!data||q<data.headFit.min-1e-9||q>data.headFit.max+1e-9)return null;const predHead=BFI_CORE.fitValue(data.headFit,q);if(!finite(predHead)||predHead<=0)return null;
  const eff=Math.max(1,Math.min(100,BFI_CORE.fitValue(data.effFit,q))),npsh=Math.max(0,BFI_CORE.fitValue(data.npshFit,q)),shaft=Math.max(0,BFI_CORE.fitValue(data.powerFit,q)),operatingHz=Math.max(0,bfiInterpolatedValue(data.hzFit,q));
  return {...m,enhanced:true,predHead,margin:predHead-h,eff,npsh,shaft,headFit:data.headFit,effFit:data.effFit,npshFit:data.npshFit,powerFit:data.powerFit,operatingHz,operatingRpm:operatingHz*58,rpm:BFI_ENHANCED_MAX_RPM,curveHz:BFI_ENHANCED_MAX_HZ};
}
function selectBfiEnhanced(q:number,h:number,forcedModel:string=''){
  const wanted=String(forcedModel||'').replace(/[TE]$/i,'').trim().toUpperCase();
  if(wanted){const row=(BFI_DB?.models||[]).find((m:any)=>String(m.model||'').toUpperCase()===wanted);return row?evaluateEnhancedBfi(row,q,h):null;}
  let rows=(BFI_DB?.models||[]).map((m:any)=>evaluateEnhancedBfi(m,q,h)).filter((x:any)=>x&&x.margin>=-.01&&Number(x.motor_kw)+1e-9>=Number(x.shaft));if(!rows.length)rows=(BFI_DB?.models||[]).map((m:any)=>evaluateEnhancedBfi(m,q,h)).filter((x:any)=>x&&x.margin>=-.01);rows.sort((a:any,b:any)=>BFI_CORE.mostSuitableCompare(a,b,q));return rows[0]||null;
}

function esSelect(q:number,h:number,pole:number,forcedModel:string=''){
  const core=(globalThis as any).ESCore,db=(globalThis as any).ES_SELECTOR_DB;
  if(!core||!db)throw new Error('ES selector engine is unavailable in the Telegram function.');
  const rpm=Number(pole)===2?2900:Number(pole)===4?1450:0;
  if(!rpm)throw new Error('ES selection requires 2 Pole or 4 Pole.');
  const wanted=String(forcedModel||'').replace(/^ES\s+/i,'').trim().toUpperCase();let r:any=null;
  if(wanted){const pump=(db.pumps||[]).find((x:any)=>String(x.model||'').toUpperCase()===wanted&&Number(x.rpm||0)===rpm);if(!pump)return null;r=core.buildResult(pump,'trim',q/3.6,h,{});}
  else{const results=core.selectPumpsMulti(db,{dutyPoints:[{label:'D1',totalFlowLps:q/3.6,headM:h,pumps:1}],mode:'trim',rpm});r=Array.isArray(results)?results[0]:null;}
  if(!r)return null;
  const p=r.pump,d=r.dutyPoints?.[0]||{},perf=d.performance||r.performance||{},motor=d.motor||r.motor||{};
  const points=core.curvePoints(p,Number(r.impellerMm),Number(r.speedRatio||1),120)||[];
  return {result:r,pump:p,duty:d,perf,motor,points,pole:Number(pole),rpm};
}
function motorTech(hp:number,pole:number,efficiencyClass:string='IE3',phase:string='3Ph'){
  const ph=String(phase||'3Ph')==='1Ph'?'1Ph':'3Ph',lookupClass=String(efficiencyClass||'IE3').toUpperCase()==='IE1'?'IE':String(efficiencyClass||'IE3').toUpperCase(),voltage=ph==='1Ph'?240:415;
  try{
    if(MB&&typeof MB.lookupMotor==='function'){
      const x=MB.lookupMotor({hp,pole,efficiencyClass:lookupClass,voltage,phase:ph,hz:50});
      if(x&&x.available)return x;
    }
  }catch(_){}
  const db=(globalThis as any).KEYSUITE_MOTOR_TECH_DB;
  const row=(db?.[lookupClass]||db?.IE3||[]).find((x:any)=>Math.abs(Number(x.hp)-Number(hp))<.011);
  const ratedAmp=ph==='1Ph'?row?.amp1:row?.amp3;
  return row&&ratedAmp!=null?{available:true,model:row.model,rpm:row.rpm,ratedAmp,eff100:row.eff100,eff75:row.eff75,pf100:row.pf100,pf75:row.pf75}:null;
}
function esPumpset(model:string,motorHp:number,motorKw:number,pole:number){
  try{
    return MB&&typeof MB.calculateEsPumpset==='function'
      ?MB.calculateEsPumpset({model,motorHp,motorKw,pole,efficiencyClass:'IE3',voltage:415,phase:'3Ph',hz:50})
      :null;
  }catch(_){return null}
}
function dutyParts(dutyText:string){
  const parts=String(dutyText||'').split(/\s+@\s+/);
  return {flow:(parts[0]||'-').trim(),head:(parts.slice(1).join(' @ ')||'-').trim()};
}
function niceAxis(v:number,targetIntervals=5){
  const value=Math.max(Number(v)||0,1e-9),minIntervals=4,maxIntervals=7,preferred=[1,2,2.5,5,10];
  const raw=value/targetIntervals,exponent=Math.floor(Math.log10(raw));
  let best:any=null;
  for(let e=exponent-1;e<=exponent+2;e++){
    const mag=Math.pow(10,e);
    for(const mult of preferred){
      const step=mult*mag;if(!(step>0))continue;
      const max=Math.ceil(value/step-1e-12)*step,intervals=Math.round(max/step);
      if(intervals<minIntervals||intervals>maxIntervals)continue;
      const score=Math.abs(intervals-targetIntervals)+(max-value)/Math.max(value,1e-9)*.35;
      if(!best||score<best.score)best={step,max,score};
    }
  }
  if(!best){const step=Math.pow(10,exponent);best={step,max:Math.ceil(value/step)*step};}
  return {step:Number(best.step),max:Number(best.max)};
}
function interpolate(points:XY[],x:number){
  const p=points.filter(a=>finite(a.x)&&finite(a.y)).sort((a,b)=>a.x-b.x);
  if(!p.length)return NaN;
  if(x<=p[0].x)return p[0].y;if(x>=p[p.length-1].x)return p[p.length-1].y;
  for(let i=1;i<p.length;i++)if(x<=p[i].x){
    const a=p[i-1],b=p[i],r=(x-a.x)/(b.x-a.x||1);return a.y+(b.y-a.y)*r;
  }
  return p[p.length-1].y;
}
function bepFromEff(headPoints:XY[],effPoints:XY[]){
  if(!effPoints.length)return null;
  let best=effPoints[0];for(const p of effPoints)if(p.y>best.y)best=p;
  return {x:best.x,y:interpolate(headPoints,best.x)};
}
function opFromSystem(headPoints:XY[],q:number,h:number){
  if(!(q>0&&h>0)||headPoints.length<2)return null;
  let best:any=null;
  const maxX=Math.max(...headPoints.map(p=>p.x),q)*1.05;
  for(let i=0;i<=800;i++){
    const x=maxX*i/800,pump=interpolate(headPoints,x),sys=h*Math.pow(x/q,2),d=Math.abs(pump-sys);
    if(!best||d<best.d)best={x,y:pump,d};
  }
  return best?{x:best.x,y:best.y}:null;
}
function systemPoints(q:number,h:number,maxX:number){
  const out:XY[]=[];for(let i=0;i<=90;i++){const x=maxX*i/90;out.push({x,y:h*Math.pow(x/q,2)})}return out;
}
function textWidth(font:any,text:string,size:number){try{return font.widthOfTextAtSize(String(text),size)}catch(_){return String(text).length*size*.52}}
function drawRight(page:any,font:any,text:string,right:number,y:number,size:number,color:any=DARK){
  page.drawText(String(text),{x:right-textWidth(font,String(text),size),y,size,font,color});
}
function drawCentered(page:any,font:any,text:string,cx:number,y:number,size:number,color:any=DARK){
  page.drawText(String(text),{x:cx-textWidth(font,String(text),size)/2,y,size,font,color});
}
function drawReportHeader(page:any,logo:any,bold:any,model:string){
  const x=47,right=564,lineY=738.7,logoH=28.3,logoW=139.2;
  if(logo)page.drawImage(logo,{x,y:740.7,width:logoW,height:logoH});
  drawRight(page,bold,model,right,744,23,DARK);
  page.drawLine({start:{x,y:lineY},end:{x:right,y:lineY},thickness:2.2,color:BLUE});
}
function drawDutyDrive(page:any,bold:any,font:any,duty:string,motorHp:number,pole:number,hz:number){
  drawCentered(page,bold,duty,306,712,11.5,RED);
  drawRight(page,font,`${fmt(motorHp,2)} HP ${pole}P`,564,723,11,BLUE);
  drawRight(page,font,`${fmt(hz,1)} Hz`,564,707,11,BLUE);
}
function drawPolyline(page:any,pts:XY[],X:(v:number)=>number,Y:(v:number)=>number,color:any,thickness:number){
  let prev:XY|null=null;
  for(const p of pts){
    if(!finite(p.x)||!finite(p.y)){prev=null;continue}
    if(prev)page.drawLine({start:{x:X(prev.x),y:Y(prev.y)},end:{x:X(p.x),y:Y(p.y)},thickness,color});
    prev=p;
  }
}
function drawMarker(page:any,bold:any,X:any,Y:any,p:XY|null|undefined,label:string,color:any,dx=7,dy=5){
  if(!p||!finite(p.x)||!finite(p.y))return;
  page.drawCircle({x:X(p.x),y:Y(p.y),size:4.2,color,borderColor:rgb(1,1,1),borderWidth:1});
  if(label)page.drawText(label,{x:X(p.x)+dx,y:Y(p.y)+dy,size:8.5,font:bold,color});
}
function drawFrozenChart(page:any,font:any,bold:any,x:number,y:number,w:number,h:number,s:ChartSpec,xAxisShared:any){
  page.drawRectangle({x,y,width:w,height:h,borderWidth:.7,borderColor:rgb(.80,.87,.91),color:rgb(.995,.998,1)});
  const pad={l:58,r:24,t:14,b:43},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const allSeries=(s.series&&s.series.length?s.series:[{points:s.points}]);
  const allY=allSeries.flatMap(z=>z.points.map(p=>p.y)).concat([s.duty.y,s.bep?.y||0]).filter(finite);
  const xAxis=(xAxisShared&&xAxisShared.max&&xAxisShared.step)?xAxisShared:niceAxis(Number(xAxisShared)||1,5);
  const yAxis=s.yMax?niceAxis(Number(s.yMax),5):niceAxis(Math.max(1,...allY)*1.03,5);
  if(s.yMax){yAxis.max=Number(s.yMax);yAxis.step=niceAxis(Number(s.yMax),5).step;}
  const xmax=xAxis.max,ymax=yAxis.max;
  const X=(v:number)=>x+pad.l+Math.max(0,Math.min(xmax,Number(v)))/xmax*pw;
  const Y=(v:number)=>y+pad.b+Math.max(0,Math.min(ymax,Number(v)))/ymax*ph;

  for(let xv=0;xv<=xmax+1e-9;xv+=xAxis.step){
    const xx=X(xv);
    page.drawLine({start:{x:xx,y:y+pad.b},end:{x:xx,y:y+pad.b+ph},thickness:.35,color:GRID});
    drawCentered(page,font,fmt(xv,1),xx,y+20,7,rgb(.35,.43,.50));
  }
  for(let yv=0;yv<=ymax+1e-9;yv+=yAxis.step){
    const yy=Y(yv);
    page.drawLine({start:{x:x+pad.l,y:yy},end:{x:x+pad.l+pw,y:yy},thickness:.35,color:GRID});
    drawRight(page,font,fmt(yv,1),x+pad.l-8,yy-2.5,7,rgb(.35,.43,.50));
  }

  const xl='Flow (m³/hr)';
  page.drawText(xl,{x:x+w/2-textWidth(bold,xl,8.2)/2,y:y+5,size:8.2,font:bold,color:rgb(.25,.34,.40)});
  page.drawText(s.yLabel,{x:x+16,y:y+h/2-textWidth(bold,s.yLabel,8)/2,size:8,font:bold,color:rgb(.25,.34,.40),rotate:degrees(90)});

  allSeries.forEach((ser:any)=>{
    const color=ser.color||BLUE,width=ser.width||2.1;drawPolyline(page,ser.points,X,Y,color,width);
    if(ser.label&&ser.points?.length){
      const ep=ser.points[ser.points.length-1];
      if(finite(ep.x)&&finite(ep.y))page.drawText(ser.label,{x:Math.min(x+w-90,X(ep.x)+7),y:Y(ep.y)-2,size:7.6,font:bold,color});
    }
  });
  drawMarker(page,bold,X,Y,s.duty,s.dutyLabel||'',RED,7,5);
  drawMarker(page,bold,X,Y,s.bep||null,s.bepLabel||'BEP',GREEN,7,5);
}
function drawPage1(page:any,logo:any,font:any,bold:any,args:any){
  drawReportHeader(page,logo,bold,args.model);drawDutyDrive(page,bold,font,args.dutyText,args.motorHp,args.pole,args.hz);
  const x=47,w=517,maxFlow=Math.max(1,...args.charts.flatMap((z:ChartSpec)=>(z.series&&z.series.length?z.series.flatMap(s=>s.points):z.points).map((p:any)=>p.x)),args.q),xAxis=niceAxis(maxFlow,5);
  drawFrozenChart(page,font,bold,x,505,w,190,args.charts[0],xAxis);
  drawFrozenChart(page,font,bold,x,347,w,154,args.charts[1],xAxis);
  drawFrozenChart(page,font,bold,x,189,w,154,args.charts[2],xAxis);
  drawFrozenChart(page,font,bold,x,31,w,154,args.charts[3],xAxis);
  drawRight(page,font,'ISO 9906:Grade 3B',564,14,7.5,rgb(.45,.53,.58));
}
function fitText(font:any,text:string,size:number,maxW:number){
  let s=size;while(s>6&&textWidth(font,text,s)>maxW)s-=.3;return s;
}
function drawTechHeader(page:any,logo:any,font:any,bold:any){
  if(logo)page.drawImage(logo,{x:47,y:740.7,width:139.2,height:28.3});
  page.drawText('Project:',{x:207,y:744,size:9.5,font:bold,color:rgb(0,0,0)});
  page.drawText('-',{x:207,y:729,size:9.5,font:font.regular,color:rgb(0,0,0)});
  drawRight(page,bold,'TECHNICAL DATA',564,744,9.5,rgb(0,0,0));
}
function drawCellText(page:any,font:any,text:string,x:number,y:number,w:number,h:number,bold=false,indent=0){
  const f=bold?font.bold:font.regular;
  const raw=String(text??'-'),size=fitText(f,raw,9.3,w-10-indent);
  page.drawText(raw,{x:x+6+indent,y:y+h/2-size*.36,size,font:f,color:rgb(.03,.03,.03)});
}
function drawSection(page:any,font:any,title:string,y:number){ // returns new y
  const x=42,w=511,h=20;
  page.drawRectangle({x,y:y-h,width:w,height:h,color:PINK,borderColor:rgb(.05,.05,.05),borderWidth:1.2});
  drawCentered(page,font.bold,title,x+w/2,y-h+5.3,10,rgb(.03,.03,.03));
  return y-h;
}
function drawRow4(page:any,font:any,vals:any[],y:number,h=18,weights=[.22,.28,.22,.28]){ // returns new y
  const x=42,w=511,widths=weights.map((z:number)=>w*z);
  let xx=x;
  for(let i=0;i<4;i++){
    page.drawRectangle({x:xx,y:y-h,width:widths[i],height:h,borderColor:rgb(.15,.15,.15),borderWidth:.55});
    const v=vals[i]&&typeof vals[i]==='object'?vals[i]:{text:vals[i]};
    drawCellText(page,font,v?.text??'',xx,y-h,widths[i],h,!!v?.bold,Number(v?.indent||0));
    xx+=widths[i];
  }
  return y-h;
}
function drawPage2(page:any,logo:any,font:any,bold:any,a:any){
  drawTechHeader(page,logo,font,bold);
  const d=dutyParts(a.dutyText),mt=a.motorTech||{};
  let y=718;
  y=drawSection(page,font,'Operating Data',y);
  y=drawRow4(page,font,['Application','-','',''],y);
  y=drawRow4(page,font,['Location','-','Capacity',d.flow],y);
  y=drawRow4(page,font,['Fluid','Water, Clean','Pressure',d.head],y);
  y=drawRow4(page,font,['Density','0.9983 kg/dm³','Temperature','20 °C'],y);
  y=drawRow4(page,font,['Kin. Viscosity','1.005 mm²/s','',''],y);
  y-=8;

  y=drawSection(page,font,'Pump',y);
  y=drawRow4(page,font,['Brand',a.brand||'B.G.Reich','Country of Origin','Malaysia'],y);
  y=drawRow4(page,font,['Type',a.family==='CHC'?`${a.series||'VMS'} Pump`:a.family==='BFI'?'HMS Pump':`${a.series||'ES'} End Suction Pump`,'Country of Manufacture','China'],y);
  y=drawRow4(page,font,['Model',{text:a.model,bold:true},'Suction Size',a.suction],y);
  y=drawRow4(page,font,['Speed',`${fmt(a.rpm,0)} rpm`,'Discharge Size',a.discharge],y);
  y=drawRow4(page,font,['Material: -','', 'Efficiency',`${fmt(a.eff,1)} %`],y);
  y=drawRow4(page,font,[{text:'Casing',indent:10},a.material.casing,'Brake HP',`${fmt(a.brakeHp,1)} HP`],y);
  y=drawRow4(page,font,[{text:'Impeller',indent:10},a.material.impeller,(a.family==='CHC'||a.family==='BFI')?'No. of Stage':'Impeller Diameter',(a.family==='CHC'||a.family==='BFI')?`${fmt(a.stages,0)} ${Number(a.stages)===1?'Stage':'Stages'}`:`${fmt(a.impellerMm,1)} mm`],y);
  y=drawRow4(page,font,[{text:'Shaft',indent:10},a.material.shaft,'NPSHr',`${fmt(a.npsh,1)} Mtr`],y);
  y=drawRow4(page,font,['Shaft Seal',a.material.seal,'Max Casing Pressure',`${fmt(a.maxPressure,1)} Bar`],y);
  y=drawRow4(page,font,['Bearing Type',a.family==='CHC'?'Bush':'Ball','',''],y);
  y-=8;

  y=drawSection(page,font,'Motor',y);
  y=drawRow4(page,font,['Brand',a.brand||'B.G.Reich','Country of Origin','Malaysia'],y);
  y=drawRow4(page,font,['Type','TEFC','Country of Manufacture','China'],y);
  y=drawRow4(page,font,['Model',mt.model||'Data Not Available','Efficiency:',a.motorEfficiencyClass||'IE3'],y);
  y=drawRow4(page,font,['Rated Power',`${fmt(a.motorHp,2)} HP / ${fmt(a.motorKw,2)} kW`,'100%',mt.eff100!=null?`${fmt(mt.eff100,1)} %`:'-'],y);
  y=drawRow4(page,font,['Speed',mt.rpm!=null?`${fmt(mt.rpm,0)} rpm`:'-','75%',mt.eff75!=null?`${fmt(mt.eff75,1)} %`:'-'],y);
  y=drawRow4(page,font,['Rated FL Amp',mt.ratedAmp!=null?`${fmt(mt.ratedAmp,2)} Amp`:(mt.amp3!=null?`${fmt(mt.amp3,2)} Amp`:'-'),'Power Factor:-',''],y);
  y=drawRow4(page,font,['Frequency',`${fmt(a.hz,0)} Hz`,'100%',mt.pf100!=null?fmt(mt.pf100,2):'-'],y);
  const motorVoltage=a.family==='BFI'&&String(a.phase||'3Ph')==='1Ph'?240:415,motorPhaseText=a.family==='BFI'&&String(a.phase||'3Ph')==='1Ph'?'1 Phase':'3 Phase';
  y=drawRow4(page,font,['Rated Voltage',`${motorVoltage} Volt`,'75%',mt.pf75!=null?fmt(mt.pf75,2):'-'],y);
  y=drawRow4(page,font,['Phase',motorPhaseText,'Protection','IP 55'],y);
  y=drawRow4(page,font,['Insulation Class','Class F','',''],y);
  y-=8;

  y=drawSection(page,font,'Pumpset',y);
  y=drawRow4(page,font,['Dimension: -','', 'Weight',a.pumpset.weight],y);
  // V4.23.10: CHC and BFI are close-coupled/multistage outputs here; do not print a Coupling Type placeholder.
  y=a.family==='ES'
    ?drawRow4(page,font,[{text:'Length',indent:10},a.pumpset.length,'Coupling Type','Flexible'],y)
    :drawRow4(page,font,[{text:'Length',indent:10},a.pumpset.length,'',''],y);
  y=drawRow4(page,font,[{text:'Width',indent:10},a.pumpset.width,'',''],y);
  y=drawRow4(page,font,[{text:'Height',indent:10},a.pumpset.height,'',''],y);

  page.drawText('* Approximate dimension & weight',{x:42,y:y-15,size:7.5,font:font.regular,color:rgb(.15,.15,.15)});
  drawCentered(page,font.regular,`${a.brand||'B.G.Reich'} reserves the right to make modifications without notice.`,306,y-32,8,rgb(.20,.20,.20));
}
function drawDimensionHeader(page:any,logo:any,bold:any,model:string){drawReportHeader(page,logo,bold,model)}
function drawDimensionTable(page:any,font:any,x:number,y:number,leftRows:[string,string][],rightRows:[string,string][],rowH=16,widths=[64.629921,108.566929,64.629921,108.566929]){
  const leftCount=leftRows.length,rightCount=rightRows.length,total=widths.reduce((a,b)=>a+b,0);
  const line1=x;
  const line2=x+widths[0];
  const line3=x+widths[0]+widths[1]; // one centre line only
  const line4=line3+widths[2];
  const line5=x+total;
  const top=y+3;
  const leftBottom=y-leftCount*rowH+3;
  const rightBottom=y-rightCount*rowH+3;
  const centreBottom=y-Math.max(leftCount,rightCount)*rowH+3;

  // Global Page 3 dimension-table rule (V4.23.06):
  // Line 1/2 follow the left block, Line 4/5 follow the right block.
  // Line 3 is the single centre divider and ALWAYS spans the full/main
  // dimension block (the longer side), matching the established CHC layout.
  [line1,line2].forEach(xx=>page.drawLine({
    start:{x:xx,y:top},end:{x:xx,y:leftBottom},thickness:.55,color:rgb(.1,.1,.1)
  }));
  page.drawLine({
    start:{x:line3,y:top},end:{x:line3,y:centreBottom},thickness:.55,color:rgb(.1,.1,.1)
  });
  [line4,line5].forEach(xx=>page.drawLine({
    start:{x:xx,y:top},end:{x:xx,y:rightBottom},thickness:.55,color:rgb(.1,.1,.1)
  }));

  const rows=Math.max(leftCount,rightCount);
  for(let i=0;i<rows;i++){
    const yy=y-i*rowH,l=leftRows[i],r=rightRows[i];
    if(l){
      page.drawText(String(l[0]),{x:x+9,y:yy-9,size:9,font:font.regular,color:rgb(.03,.03,.03)});
      page.drawText(String(l[1]),{x:x+widths[0]+9,y:yy-9,size:9,font:font.regular,color:rgb(.03,.03,.03)});
    }
    if(r){
      page.drawText(String(r[0]),{x:line3+9,y:yy-9,size:9,font:font.regular,color:rgb(.03,.03,.03)});
      page.drawText(String(r[1]),{x:line4+9,y:yy-9,size:9,font:font.regular,color:rgb(.03,.03,.03)});
    }
  }
}
function drawPage3CHC(page:any,logo:any,font:any,bold:any,a:any,dimImage:any){
  drawDimensionHeader(page,logo,bold,a.model);
  drawCentered(page,bold,'Dimension',306,668,20,rgb(.03,.03,.03));
  page.drawLine({start:{x:255,y:664},end:{x:357,y:664},thickness:1.2,color:rgb(.03,.03,.03)});
  if(dimImage){
    // Keep a clear gap below the Dimension heading.
    // Standard CHC image zone: top <= ~625 pt, bottom >= ~245 pt.
    const d=dimImage.scale(1),maxW=315,maxH=380,scale=Math.min(maxW/d.width,maxH/d.height);
    page.drawImage(dimImage,{x:297.5-d.width*scale/2,y:245,width:d.width*scale,height:d.height*scale});
  }
  const tableX=132.803150,tableWidths=[64.629921,108.566929,64.629921,108.566929];
  page.drawText('Table Dimensions',{x:tableX,y:205,size:11.5,font:bold,color:rgb(.03,.03,.03)});
  const d=a.dim||{};
  drawDimensionTable(page,font,tableX,187,[
    ['B1',d.b1?`${fmt(d.b1,0)} mm`:'-'],
    ['B2',d.b2?`${fmt(d.b2,0)} mm`:'-'],
    ['B1+B2',d.height?`${fmt(d.height,0)} mm`:'-'],
    ['D1',d.d1?`${fmt(d.d1,0)} mm`:'-'],
    ['D2',d.d2?`${fmt(d.d2,0)} mm`:'-']
  ],[['Weight',d.weight?`${fmt(d.weight,0)} kG`:'-']],16,tableWidths);
  page.drawText('* Approximate dimension & weight',{x:tableX,y:92,size:8,font:font.regular,color:rgb(.10,.10,.10)});
}

function drawPage3BFI(page:any,logo:any,font:any,bold:any,a:any,dimImage:any){
  drawDimensionHeader(page,logo,bold,a.model);drawCentered(page,bold,'Dimension',306,668,20,rgb(.03,.03,.03));
  page.drawLine({start:{x:255,y:664},end:{x:357,y:664},thickness:1.2,color:rgb(.03,.03,.03)});
  if(dimImage){
    const d=dimImage.scale(1),maxW=445,maxH=245,baseScale=Math.min(maxW/d.width,maxH/d.height),scale=baseScale*.8;
    const oldHeight=d.height*baseScale,newHeight=d.height*scale,drawY=355+(oldHeight-newHeight)/2;
    page.drawImage(dimImage,{x:297.5-d.width*scale/2,y:drawY,width:d.width*scale,height:newHeight});
  }
  const summary=a.bfiDimension||bfiDimensionSummary(a.model,a.series,a.dim,a.phase,a.weightKg),values=summary.values||{};
  const row=(k:string)=>values[k]===null||values[k]===undefined||values[k]===''||!finite(values[k])?null:[k,`${fmt(values[k],0)} mm`] as [string,string];
  const left=['L1','L2','L3','L4','L5','L6'].map(row).filter(Boolean) as [string,string][];
  const right=['B1','B2','H','H2'].map(row).filter(Boolean) as [string,string][];
  if(summary.weight>0)right.push(['Weight',`${fmt(summary.weight,1)} kG`]);
  const tableX=132.803150,tableWidths=[64.629921,108.566929,64.629921,108.566929];
  page.drawText('Table Dimensions',{x:tableX,y:310,size:11.5,font:bold,color:rgb(.03,.03,.03)});
  drawDimensionTable(page,font,tableX,292,left,right,16,tableWidths);
  page.drawText('* Approximate dimension & weight',{x:tableX,y:178,size:8,font:font.regular,color:rgb(.10,.10,.10)});
}
function drawPage3ES(page:any,logo:any,font:any,bold:any,a:any,dimImage:any){
  drawDimensionHeader(page,logo,bold,a.model);
  drawCentered(page,bold,'Dimension',306,668,20,rgb(.03,.03,.03));
  page.drawLine({start:{x:255,y:664},end:{x:357,y:664},thickness:1.2,color:rgb(.03,.03,.03)});
  if(dimImage){
    const d=dimImage.scale(1),maxW=445,maxH=360,scale=Math.min(maxW/d.width,maxH/d.height);
    page.drawImage(dimImage,{x:297.5-d.width*scale/2,y:370,width:d.width*scale,height:d.height*scale});
  }
  const ps=a.esPumpset, X=ps?.dimensions||{}, P=ps?.pump||{}, M=ps?.motor||{}, B=ps?.baseplate||{};
  const lon=X.longitudinal||{},wid=X.width||{},ht=X.height||{},mount=X.mounting||{};
  const motorH=Number(M?.dimension?.H),pumpH1=Number(P?.h1),stool=finite(motorH)&&finite(pumpH1)&&motorH>pumpH1?Math.ceil(motorH-pumpH1)+3:null;
  const tableX=132.803150,tableWidths=[64.629921,108.566929,64.629921,108.566929];
  page.drawText('Table Dimensions',{x:tableX,y:284,size:11.5,font:bold,color:rgb(.03,.03,.03)});
  drawDimensionTable(page,font,tableX,266,[
    ['L1',finite(lon.L1)?`${fmt(lon.L1,0)} mm`:'-'],['L2',finite(lon.L2)?`${fmt(lon.L2,0)} mm`:'-'],
    ['L3',finite(lon.L3)?`${fmt(lon.L3,0)} mm`:'-'],['L4',finite(lon.L4)?`${fmt(lon.L4,0)} mm`:'-'],
    ['L5',finite(lon.L5)?`${fmt(lon.L5,0)} mm`:'-'],['W1',finite(wid.W1)?`${fmt(wid.W1,0)} mm`:'-'],
    ['W2',finite(wid.W2)?`${fmt(wid.W2,0)} mm`:'-'],['H1',finite(ht.H1)?`${fmt(ht.H1,0)} mm`:'-'],
    ['H2',finite(ht.H2)?`${fmt(ht.H2,0)} mm`:'-'],['H3',finite(ht.H3)?`${fmt(ht.H3,0)} mm`:'-'],
    ['H4',stool!=null&&finite(stool)?`${fmt(stool,0)} mm`:'-']
  ],[
    ['DNA',P.suction||a.suction||'-'],['DNM',P.discharge||a.discharge||'-'],
    ['A',finite(P.A)?`${fmt(P.A,0)} mm`:'-'],
    ['D',finite(mount.holeCount)&&finite(mount.boreMm)?`${fmt(mount.holeCount,0)} x ${fmt(mount.boreMm,0)} mm`:'-'],
    ['Weight',finite(X?.overall?.estimatedPumpsetWeightKg)?`${fmt(X.overall.estimatedPumpsetWeightKg,0)} kG`:'-']
  ],14,tableWidths);
  page.drawText('* Approximate dimension & weight',{x:tableX,y:91,size:8,font:font.regular,color:rgb(.10,.10,.10)});
}
function materialFor(fam:string,option:any=''){
  const m=String(option||'').toUpperCase().replace(/\s+/g,'');
  if(isBfiFamily(fam))return {casing:'Stainless Steel 304',impeller:'Stainless Steel 304',shaft:'Stainless Steel 304',seal:'Mechanical Seal'};
  if(isChcFamily(fam)){
    if(m==='SS316')return {casing:'SS316',impeller:'SS316',shaft:'SS316',seal:'Mechanical Seal'};
    if(m==='SS304')return {casing:'SS304',impeller:'SS304',shaft:'SS304',seal:'Mechanical Seal'};
    return {casing:'SS (CI Connection)',impeller:'Stainless Steel',shaft:'Stainless Steel',seal:'Mechanical Seal'};
  }
  if(m==='SS316')return {casing:'SS316',impeller:'SS316',shaft:'SS316',seal:'Mechanical Seal'};
  if(m==='SS304')return {casing:'SS304',impeller:'SS304',shaft:'SS304',seal:'Mechanical Seal'};
  return {casing:'Cast Iron',impeller:'Stainless Steel',shaft:'Stainless Steel',seal:'Mechanical Seal'};
}

export function selectPumpSummary(family:string,q:number,h:number,esPole=0,forcedModel:string=''){
  const fam=String(family||'').toUpperCase();
  if(!(Number(q)>0&&Number(h)>0))throw new Error('Flow and head are required for pump selection.');
  if(isChcFamily(fam)){
    const engine=chcEngine(fam),s:any=selectChc(Number(q),Number(h),forcedModel,fam);
    if(!s)throw new Error(`No ${engine.label} model can meet ${fmt(q)} m³/hr @ ${fmt(h)} Mtr.`);
    return {brand:'B.G.Reich',family:'CHC',series:engine.label,generation_code:engine.generation,keysuite_generation_code:engine.generation,model:String(s.model||''),motor_kw:Number(s.motor_kw||0),motor_hp:Number(s.motor_hp||0),efficiency:Number(s.eff||0),npshr:Number(s.npsh||0),rpm:Number(s.rpm||engine.db?.curves?.[s.series]?.speed_rpm||2900),pole:2,stages:Number(s.stages||0),connection:String(s.connection||'-'),requested_flow_m3h:Number(q),requested_head_m:Number(h),selector_core_version:engine.core.VERSION};
  }
  if(isBfiFamily(fam)){
    const s:any=selectBfi(Number(q),Number(h),forcedModel);if(!s)throw new Error(`No BFI model can meet ${fmt(q)} m³/hr @ ${fmt(h)} Mtr.`);
    const base=String(s.model||'').replace(/T$/i,''),phases=Array.isArray(s.phases)&&s.phases.length?s.phases:['3Ph'],phase=phases.includes('3Ph')?'3Ph':String(phases[0]||'1Ph'),display=phase==='3Ph'?`${base}T`:base;
    return {brand:'B.G.Reich',family:'BFI',series:String(s.series||'BFI'),model:base,base_model:base,display_model:display,quotation_model:display,motor_phase:phase,motor_efficiency_class:phase==='1Ph'?'IE1':'IE2',motor_kw:Number(s.motor_kw||0),motor_hp:Number(s.motor_hp||0),efficiency:Number(s.eff||0),npshr:Number(s.npsh||0),rpm:Number(s.rpm||2900),pole:2,stages:Number(s.stages||0),connection:String(s.connection||'-'),requested_flow_m3h:Number(q),requested_head_m:Number(h),selector_core_version:BFI_CORE.VERSION};
  }
  if(fam==='ES'){
    const pole=Number(esPole);
    if(pole!==2&&pole!==4)throw new Error('ES selection requires 2 Pole or 4 Pole.');
    const s:any=esSelect(Number(q),Number(h),pole,forcedModel);
    if(!s)throw new Error(`No ES ${pole} Pole model can meet ${fmt(q)} m³/hr @ ${fmt(h)} Mtr.`);
    return {brand:'B.G.Reich',family:'ES',series:'ES',model:`ES ${s.pump.model}`,motor_kw:Number(s.motor.motorKw||0),motor_hp:Number(s.motor.motorHp||0),efficiency:Number(s.perf.efficiencyPct||0),npshr:Number(s.perf.npshrM||0),rpm:Number(s.perf.rpm||s.pump.rpm||(pole===2?2900:1450)),pole,impeller_mm:Number(s.result.impellerMm||0),suction:String(s.pump.dimensions?.suction||'-'),discharge:String(s.pump.dimensions?.discharge||'-'),requested_flow_m3h:Number(q),requested_head_m:Number(h),selector_core_version:'ESCore'};
  }
  throw new Error('Unsupported pump family.');
}

export function selectPumpCandidates(family:string,q:number,h:number,esPole=0,limit=6){
  const fam=String(family||'').toUpperCase(),max=Math.max(1,Math.min(12,Math.trunc(Number(limit)||6)));
  if(!(Number(q)>0&&Number(h)>0))return [];
  if(isChcFamily(fam)){
    const engine=chcEngine(fam),result=engine.core.select(engine.db,Number(q),Number(h),50),rows=Array.isArray(result?.candidates)?result.candidates:[];
    return rows.slice(0,max).map((x:any,rank:number)=>({brand:'B.G.Reich',family:'CHC',series:engine.label,generation_code:engine.generation,keysuite_generation_code:engine.generation,model:String(x.model||''),motor_kw:Number(x.motor_kw||0),motor_hp:Number(x.motor_hp||0),efficiency:Number(x.eff||0),npshr:Number(x.npsh||0),rpm:Number(x.rpm||engine.db?.curves?.[x.series]?.speed_rpm||2900),pole:2,stages:Number(x.stages||0),connection:String(x.connection||'-'),requested_flow_m3h:Number(q),requested_head_m:Number(h),selector_core_version:engine.core.VERSION,selector_rank:rank+1}));
  }
  if(isBfiFamily(fam)){
    const result=BFI_CORE.select(BFI_DB,Number(q),Number(h),50),rows=Array.isArray(result?.candidates)?result.candidates:[];
    return rows.slice(0,max).map((x:any,rank:number)=>{const base=String(x.model||'').replace(/T$/i,''),phases=Array.isArray(x.phases)&&x.phases.length?x.phases:['3Ph'],phase=phases.includes('3Ph')?'3Ph':String(phases[0]||'1Ph'),display=phase==='3Ph'?`${base}T`:base;return {brand:'B.G.Reich',family:'BFI',series:String(x.series||'BFI'),model:base,base_model:base,display_model:display,quotation_model:display,motor_phase:phase,motor_efficiency_class:phase==='1Ph'?'IE1':'IE2',motor_kw:Number(x.motor_kw||0),motor_hp:Number(x.motor_hp||0),efficiency:Number(x.eff||0),npshr:Number(x.npsh||0),rpm:Number(x.rpm||2900),pole:2,stages:Number(x.stages||0),connection:String(x.connection||'-'),requested_flow_m3h:Number(q),requested_head_m:Number(h),selector_core_version:BFI_CORE.VERSION,selector_rank:rank+1};});
  }
  if(fam==='ES'){
    const pole=Number(esPole),core=(globalThis as any).ESCore,db=(globalThis as any).ES_SELECTOR_DB;if(!core||!db||![2,4].includes(pole))return [];
    const rpm=pole===2?2900:1450,results=core.selectPumpsMulti(db,{dutyPoints:[{label:'D1',totalFlowLps:Number(q)/3.6,headM:Number(h),pumps:1}],mode:'trim',rpm});
    return (Array.isArray(results)?results:[]).slice(0,max).map((r:any,rank:number)=>{const pump=r?.pump||{},d=r?.dutyPoints?.[0]||{},perf=d?.performance||r?.performance||{},motor=d?.motor||r?.motor||{};return {brand:'B.G.Reich',family:'ES',series:'ES',model:`ES ${String(pump.model||'')}`.trim(),motor_kw:Number(motor.motorKw||0),motor_hp:Number(motor.motorHp||0),efficiency:Number(perf.efficiencyPct||0),npshr:Number(perf.npshrM||0),rpm:Number(perf.rpm||pump.rpm||rpm),pole,impeller_mm:Number(r?.impellerMm||d?.impellerMm||0),suction:String(pump.dimensions?.suction||'-'),discharge:String(pump.dimensions?.discharge||'-'),requested_flow_m3h:Number(q),requested_head_m:Number(h),selector_core_version:'ESCore',selector_rank:rank+1};});
  }
  return [];
}

export async function generateCurvePdf(family:string,q:number,h:number,dutyText:string,baseUrl:string,esPole=0,forcedModel:string='',displayIdentity:any=null){
  const optimizePdf=displayIdentity?.optimized_pdf!==false;
  const fam=String(family||'').toUpperCase(),isChc=isChcFamily(fam),isBfi=isBfiFamily(fam),engine=isChc?chcEngine(fam):null;
  let model='',motorKw=0,motorHp=0,eff=0,npsh=0,selectionShaft=0,dutyBrakeHp=0,rpm=0,pole=2,hz=50;
  let suction='-',discharge='-',stages=0,impellerMm=0,maxPressure=0,dim:any={},esPs:any=null,weightKg=0,phase='3Ph';
  let headPoints:XY[]=[],effPoints:XY[]=[],powerPoints:XY[]=[],npsPoints:XY[]=[];

  if(isChc){
    const s=selectChc(q,h,forcedModel,fam);if(!s)throw new Error(`No ${engine?.label||'CHC'} model can meet ${fmt(q)} m³/hr @ ${fmt(h)} Mtr.`);
    model=String(s.model);motorKw=Number(s.motor_kw||0);motorHp=Number(s.motor_hp||0);eff=Number(s.eff||0);npsh=Number(s.npsh||0);
    selectionShaft=Number(s.shaft||0);rpm=Number(engine?.db?.curves?.[s.series]?.speed_rpm||2900);pole=2;hz=50;
    suction=String(s.connection||'-');discharge=String(s.connection||'-');stages=Number(s.stages||0);maxPressure=Number(s.max_pressure_bar||0);dim=((engine?.generation==='G1'?CHC_G1_DIMENSIONS:CHC_DIMENSIONS) as any)[s.model]||{};
    headPoints=sampleFit(s.headFit,120,engine?.core);effPoints=sampleFit(s.effFit,120,engine?.core);
    powerPoints=sampleSmoothPower(s.powerFit,180,1.34102209,engine?.core);
    npsPoints=sampleFit(s.npshFit,120,engine?.core);
  }else if(isBfi){
    const identityModel=String(displayIdentity?.model||displayIdentity?.display_model||forcedModel||''),enhanced=!!displayIdentity?.enhanced||!!displayIdentity?.enhanced_curve||/E$/i.test(identityModel)||/E$/i.test(String(forcedModel||''));
    const s:any=enhanced?selectBfiEnhanced(q,h,forcedModel):selectBfi(q,h,forcedModel);if(!s)throw new Error(`No BFI${enhanced?' Enhanced':''} model can meet ${fmt(q)} m³/hr @ ${fmt(h)} Mtr.`);
    model=String(s.model).replace(/[TE]$/i,'');motorKw=Number(s.motor_kw||0);motorHp=Number(s.motor_hp||0);eff=Number(s.eff||0);npsh=Number(s.npsh||0);selectionShaft=Number(s.shaft||0);rpm=enhanced?BFI_ENHANCED_MAX_RPM:Number(s.rpm||2900);pole=2;hz=enhanced?BFI_ENHANCED_MAX_HZ:50;
    suction=String(s.inlet||s.connection||'-');discharge=String(s.outlet||s.connection||'-');stages=Number(s.stages||0);maxPressure=Number(s.max_pressure_bar||0);dim=s.dimensions||{};weightKg=Number(s.weight_kg||0);{const phases=Array.isArray(s.phases)&&s.phases.length?s.phases:['3Ph'],identityPhase=String(displayIdentity?.motor_phase||displayIdentity?.phase||'');phase=enhanced?'3Ph':(identityPhase==='1Ph'||identityPhase==='3Ph'?identityPhase:(/T$/i.test(identityModel)?'3Ph':(phases.includes('1Ph')?'1Ph':'3Ph')));if(!phases.includes(phase))phase=phases.includes('3Ph')?'3Ph':String(phases[0]||'1Ph')}
    headPoints=sampleFit(s.headFit,120,BFI_CORE);effPoints=sampleFit(s.effFit,120,BFI_CORE);powerPoints=sampleSmoothPower(s.powerFit,180,1.34102209,BFI_CORE);npsPoints=sampleFit(s.npshFit,120,BFI_CORE);
    if(enhanced){displayIdentity={...(displayIdentity||{}),enhanced:true,enhanced_curve:true,motor_phase:'3Ph'};}
  }else if(fam==='ES'){
    pole=Number(esPole);if(pole!==2&&pole!==4)throw new Error('ES selection requires 2 Pole or 4 Pole.');
    const s=esSelect(q,h,pole,forcedModel);if(!s)throw new Error(`No ES ${pole} Pole model can meet ${fmt(q)} m³/hr @ ${fmt(h)} Mtr.`);
    model=`ES ${s.pump.model}`;motorKw=Number(s.motor.motorKw||0);motorHp=Number(s.motor.motorHp||0);eff=Number(s.perf.efficiencyPct||0);npsh=Number(s.perf.npshrM||0);
    selectionShaft=Number(s.perf.shaftKw||0);dutyBrakeHp=Number(s.perf.bhp||selectionShaft*1.34102209);rpm=Number(s.perf.rpm||s.pump.rpm||0);hz=Number(s.perf.frequencyHz||50);
    suction=String(s.pump.dimensions?.suction||'-');discharge=String(s.pump.dimensions?.discharge||'-');impellerMm=Number(s.result.impellerMm||0);maxPressure=Number(s.pump.dimensions?.casing_pressure_bar||0);dim=s.pump.dimensions||{};
    const pts=(s.points||[]).filter((p:any)=>finite(p.flowM3h));
    const rawHead=pts.map((p:any)=>({x:Number(p.flowM3h),y:Number(p.headM)}));
    const rawEff=pts.map((p:any)=>({x:Number(p.flowM3h),y:Number(p.efficiencyPct)}));
    const rawPowerKw=pts.map((p:any)=>({x:Number(p.flowM3h),y:Number(p.shaftKw)}));
    const rawNpsh=pts.map((p:any)=>({x:Number(p.flowM3h),y:Number(p.npshrM)}));
    // Same curve fitting as KeySelector ES Product.
    headPoints=sampleEsFit(rawHead,2,1);
    effPoints=sampleEsFit(rawEff,6,1);
    powerPoints=sampleEsFit(rawPowerKw,6,1/0.746);
    npsPoints=sampleEsFit(rawNpsh,3,1);
    esPs=esPumpset(s.pump.model,motorHp,motorKw,pole);
  }else throw new Error('Unsupported pump family.');

  // Frozen KeySelector PDF displays Brake HP at the REQUIRED duty head.
  const requiredBrakeKw=9.81*q*h/3600/(Math.max(1,eff)/100), brakeHp=fam==='ES'&&dutyBrakeHp>0?dutyBrakeHp:requiredBrakeKw*1.34102209;
  const bep=bepFromEff(headPoints,effPoints);
  let headEnvelope:any=null;
  if(fam==='ES'){
    const core=(globalThis as any).ESCore,selected=esSelect(q,h,pole,forcedModel),pump=selected?.pump,ratio=Number(selected?.result?.speedRatio||1);
    if(pump){
      const maxD=Number(core.dmax(pump)),minD=Number(core.dmin(pump)),selD=Number(selected.result.impellerMm);
      const defs:any[]=[];const add=(d:number)=>{if(!defs.some(x=>Math.abs(x-d)<.01))defs.push(d)};
      add(maxD);add(selD);add(minD);
      headEnvelope=defs.map((d:number)=>{
        const selectedCurve=Math.abs(d-selD)<.01;
        const raw=(core.curvePoints(pump,d,ratio,120)||[]).filter((p:any)=>finite(p.flowM3h)).map((p:any)=>({x:Number(p.flowM3h),y:Number(p.headM)}));
        const pts=sampleEsFit(raw,2,1);
        const exactFullMin=!!String(forcedModel||'').trim()&&Math.abs(selD-maxD)<.01;
        const label=exactFullMin?(Math.abs(d-maxD)<.01?`Full Size Ø${fmt(d,d%1?1:0)}`:Math.abs(d-minD)<.01?`Min Size Ø${fmt(d,d%1?1:0)}`:`Ø${fmt(d,d%1?1:0)}`):`Ø${fmt(d,d%1?1:0)}`;
        return {points:pts,label,color:selectedCurve?BLUE:rgb(.36,.55,.68),width:selectedCurve?2.5:1.35};
      });
    }
  }
  const xLabel='Flow (m³/hr)';
  const charts:ChartSpec[]=[
    {yLabel:'Head (m)',points:headPoints,series:headEnvelope,duty:{x:q,y:h},bep,bepLabel:'BEP',xLabel,dutyLabel:''},
    {yLabel:'Efficiency (%)',points:effPoints,duty:{x:q,y:eff},xLabel,yMax:100,dutyLabel:`${fmt(eff,1)}%`},
    {yLabel:fam==='ES'?'Total Power (HP)':'Power (HP)',points:powerPoints,duty:{x:q,y:brakeHp},xLabel,dutyLabel:`${fmt(brakeHp,1)} HP`},
    {yLabel:fam==='ES'?'NPSH (m)':'NPSHr (m)',points:npsPoints,duty:{x:q,y:npsh},xLabel,dutyLabel:`${fmt(npsh,1)} Mtr`}
  ];
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const font={regular,bold};
  const logo=await embedReportLogo(pdf,displayIdentity?.logo,baseUrl,optimizePdf);
  let dimImage:any=null;
  if(isChc){
    const series=String((selectChc(q,h,forcedModel,fam) as any)?.series||'');
    let b64='';
    if(engine?.generation==='G1'){
      const key=chcG1DimensionImageKey(series,displayIdentity?.material);
      if(key){if(optimizePdf){try{dimImage=await embedPublicJpg(pdf,baseUrl,`assets/pdf-optimized/chc-g1-dimensions/${key}.jpg`)}catch(_){dimImage=await embedPublicPng(pdf,baseUrl,`assets/chc-g1-dimensions/${key}.png`)}}else dimImage=await embedPublicPng(pdf,baseUrl,`assets/chc-g1-dimensions/${key}.png`);}
    }else{
      const match=series.match(/CHC\s*(\d+)/i),slug=match?`chc-${match[1]}`:'';
      if(slug){
        if(optimizePdf){
          try{dimImage=await embedPublicJpg(pdf,baseUrl,`assets/keybot-pdf/chc-dimensions/${slug}.jpg`)}
          catch(_){dimImage=await embedPublicPng(pdf,baseUrl,`assets/keybot-pdf/chc-dimensions-png/${slug}.png`)}
        }else dimImage=await embedPublicPng(pdf,baseUrl,`assets/keybot-pdf/chc-dimensions-png/${slug}.png`);
      }
    }
  }else if(isBfi){
    const summary=bfiDimensionSummary(model,'',dim,phase,weightKg);
    if(summary.image){try{if(optimizePdf){const jpg=String(summary.image).replace(/\.png$/i,'.jpg');try{dimImage=await embedPublicJpg(pdf,baseUrl,`assets/pdf-optimized/bfi-dimensions/${jpg}`)}catch(_){dimImage=await embedPublicPng(pdf,baseUrl,`assets/bfi-dimensions/${summary.image}`)}}else dimImage=await embedPublicPng(pdf,baseUrl,`assets/bfi-dimensions/${summary.image}`)}catch(error){console.warn('BFI dimension drawing unavailable',error)}}
  }else if(optimizePdf){try{dimImage=await embedPublicJpg(pdf,baseUrl,'assets/keybot-pdf/es-dimension.jpg')}catch(_){dimImage=await embedPublicPng(pdf,baseUrl,'assets/keybot-pdf/es-dimension.png')}}else dimImage=await embedPublicPng(pdf,baseUrl,'assets/keybot-pdf/es-dimension.png');

  const bfiMotorEff=phase==='1Ph'?'IE1':'IE2',mt=motorTech(motorHp,pole,isChc?String(engine?.motorEff||'IE3'):isBfi?bfiMotorEff:'IE3',phase);
  const pumpEnvelope=isChc?(Number(dim.d1||0)/2+Number(dim.d2||0)):0;
  const chcLength=isChc?Math.max(pumpEnvelope,Number(dim.pumpL||0)):0,chcWidth=isChc?Math.max(pumpEnvelope,Number(dim.pumpW||0)):0;
  const bfiDimension=isBfi?bfiDimensionSummary(model,'',dim,phase,weightKg):null;
  const pumpset=isChc
    ?{length:chcLength?`${fmt(chcLength,0)} mm`:'-',width:chcWidth?`${fmt(chcWidth,0)} mm`:'-',height:dim.height?`${fmt(dim.height,0)} mm`:'-',weight:dim.weight?`${fmt(dim.weight,0)} kG`:'-'}
    :isBfi?{length:bfiDimension?.length?`${fmt(bfiDimension.length,0)} mm`:'-',width:bfiDimension?.width?`${fmt(bfiDimension.width,0)} mm`:'-',height:bfiDimension?.height?`${fmt(bfiDimension.height,0)} mm`:'-',weight:bfiDimension?.weight?`${fmt(bfiDimension.weight,1)} kG`:'-'}
    :{length:esPs?.dimensions?.overall?.lengthMm?`${fmt(esPs.dimensions.overall.lengthMm,0)} mm`:'-',width:esPs?.dimensions?.overall?.widthMm?`${fmt(esPs.dimensions.overall.widthMm,0)} mm`:'-',height:esPs?.dimensions?.overall?.heightMm?`${fmt(esPs.dimensions.overall.heightMm,0)} mm`:'-',weight:esPs?.dimensions?.overall?.estimatedPumpsetWeightKg?`${fmt(esPs.dimensions.overall.estimatedPumpsetWeightKg,0)} kg`:'-'};

  const displayBrand=String(displayIdentity?.brand||'B.G.Reich').trim()||'B.G.Reich',displaySeries=String(displayIdentity?.series||(isChc?String(engine?.label||'CHC'):isBfi?'BFI':'ES')).trim()||(isChc?String(engine?.label||'CHC'):isBfi?'BFI':'ES');let displayModel=String(displayIdentity?.model||model).trim()||model;if(isBfi){const enhanced=!!displayIdentity?.enhanced||!!displayIdentity?.enhanced_curve||/E$/i.test(displayModel)||/E$/i.test(String(forcedModel||'')),aliased=displayModel.replace(/[TE]$/i,'');displayModel=enhanced?aliased+'E':phase==='3Ph'?aliased+'T':aliased;}
  const pageArgs={family:isChc?'CHC':fam,brand:displayBrand,series:displaySeries,model:displayModel,masterModel:model,dutyText,q,motorHp,motorKw,pole,hz,rpm,eff,npsh,brakeHp,suction,discharge,stages,impellerMm,maxPressure,dim,esPumpset:esPs,motorTech:mt,motorEfficiencyClass:isChc?String(engine?.motorEff||'IE3'):isBfi?bfiMotorEff:'IE3',pumpset,bfiDimension,weightKg,phase,material:materialFor(isChc?'CHC':fam,displayIdentity?.material),charts};

  const p1=pdf.addPage(LETTER);drawPage1(p1,logo,regular,bold,pageArgs);
  const p2=pdf.addPage(LETTER);drawPage2(p2,logo,font,bold,pageArgs);
  const p3=pdf.addPage(LETTER);isChc?drawPage3CHC(p3,logo,font,bold,pageArgs,dimImage):isBfi?drawPage3BFI(p3,logo,font,bold,pageArgs,dimImage):drawPage3ES(p3,logo,font,bold,pageArgs,dimImage);

  pdf.setTitle(`${displayModel} Selection`);
  pdf.setSubject('KeySuite KeySelector frozen-layout pump performance report');
  pdf.setProducer('KeySuite KeyBot - KeySelector Frozen Layout');

  const bytes=await pdf.save({useObjectStreams:true}),safe=displayModel.replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');
  return {
    bytes:new Uint8Array(bytes),filename:`${safe||fam}_Selection.pdf`,model:displayModel,master_model:model,brand:displayBrand,series:displaySeries,
    motor_kw:motorKw,motor_hp:motorHp,efficiency:eff,npshr:npsh,shaft_kw:selectionShaft,
    pole:fam==='ES'?pole:null,rpm,selector_core_version:isChc?engine?.core?.VERSION:isBfi?BFI_CORE.VERSION:null,
    pdf_layout:'KeySelector frozen layout',pdf_layout_version:'4.23.18'
  };
}
