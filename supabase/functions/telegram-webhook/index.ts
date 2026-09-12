import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateCurvePdf, selectPumpSummary, selectPumpCandidates } from './curve-pdf.ts';

const KEYBOT_ES_MB:any=(globalThis as any).KeySuiteMotorBaseplateV40205;

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const env=(...names:string[])=>{for(const name of names){const value=Deno.env.get(name);if(value)return value}return ''};

type SmartOption={key:string;label:string};
type SmartQuestion={field:string;label:string;prompt:string;options?:SmartOption[]};

async function telegramSend(token:string,chatId:string,text:string,replyMarkup:any=null){
  if(!token||!chatId)return;
  const body:any={chat_id:chatId,text};if(replyMarkup)body.reply_markup=replyMarkup;
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  if(!response.ok){const detail=await response.text().catch(()=>response.statusText);console.error('Telegram sendMessage failed',response.status,detail)}
}

async function telegramSendDocument(token:string,chatId:string,bytes:Uint8Array,filename:string,caption:string){
  if(!token||!chatId||!bytes?.length)return {ok:false,error:'Missing Telegram document data.'};
  const form=new FormData();
  form.append('chat_id',chatId);
  form.append('caption',caption);
  form.append('document',new Blob([bytes],{type:'application/pdf'}),filename);
  const response=await fetch(`https://api.telegram.org/bot${token}/sendDocument`,{method:'POST',body:form});
  if(!response.ok){
    const detail=await response.text().catch(()=>response.statusText);
    console.error('Telegram sendDocument failed',response.status,detail);
    return {ok:false,error:detail||response.statusText};
  }
  return {ok:true};
}
function curveFamily(source:string){
  const raw=String(source||''),chc=/\bchc\b/i.test(raw),bfi=/\bbfi\b/i.test(raw),es=/\bes\b/i.test(raw);
  if(Number(chc)+Number(bfi)+Number(es)>1)return 'AMBIGUOUS';
  return chc?'CHC':bfi?'BFI':es?'ES':null;
}
function curveEsPole(source:string){
  const s=String(source||'');
  const p2=/\b2\s*-?\s*p(?:ole)?s?\b/i.test(s);
  const p4=/\b4\s*-?\s*p(?:ole)?s?\b/i.test(s);
  if(p2&&p4)return 'AMBIGUOUS';
  return p2?2:p4?4:null;
}
function esPoleRpm(pole:any){
  return Number(pole)===2?2900:Number(pole)===4?1450:0;
}
function esPoleLabel(pole:any){
  return Number(pole)===2?'ES 2 Pole':Number(pole)===4?'ES 4 Pole':'ES';
}
function selectorCurveUrl(baseUrl:string,family:string,flowM3h:number,headM:number,display:any={},esPole:any=null){
  const base=String(baseUrl||'').trim().replace(/\/+$/,'');
  if(!base)return '';
  const route=String(family).toUpperCase()==='CHC_G1'?'selector-g1/':String(family).toUpperCase().startsWith('CHC')?'selector/':String(family).toUpperCase()==='BFI'?'selector-bfi/':'selector-es/';
  const params=new URLSearchParams({
    auto:'curve',source:'telegram',flowM3h:String(flowM3h),headM:String(headM),
    rawFlow:String(display?.raw_flow??flowM3h),flowUnit:String(display?.flow_unit||'m3h'),
    rawHead:String(display?.raw_head??headM),headUnit:String(display?.head_unit||'m')
  });
  if(family==='ES'&&(Number(esPole)===2||Number(esPole)===4)){
    params.set('esPole',String(Number(esPole)));
    params.set('rpm',String(esPoleRpm(esPole)));
  }
  return `${base}/${route}?${params.toString()}`;
}
function senderResponseMode(value:any){
  const mode=String(value||'nothing').trim().toLowerCase();
  return mode==='curve_price'||mode==='curve_only'?mode:'nothing';
}
function parseAiJson(text:string){
  let cleaned=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  if(!cleaned)return null;
  for(let i=0;i<3;i++){
    try{const parsed=JSON.parse(cleaned);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;if(typeof parsed==='string'){cleaned=parsed.trim();continue}}catch(_){/* try extracting the object below */}
    const first=cleaned.indexOf('{'),last=cleaned.lastIndexOf('}');
    if(first>=0&&last>first){try{const parsed=JSON.parse(cleaned.slice(first,last+1));if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed}catch(_){}}
    break;
  }
  return {raw_output:cleaned};
}
function strings(value:any,max=20){
  if(typeof value==='string'&&value.trim().startsWith('[')){try{value=JSON.parse(value)}catch(_){}}
  return (Array.isArray(value)?value:[]).map(v=>String(v||'').trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,max);
}
function firstNumber(match:RegExpMatchArray|null){const n=Number(match?.[1]);return Number.isFinite(n)?n:null}
function unitKey(value:any){return String(value||'').toLowerCase().replace(/³/g,'3').replace(/\s+/g,' ').trim()}
function flowToM3h(value:any,unit:any){
  const n=Number(value);if(!Number.isFinite(n))return null;const u=unitKey(unit).replace(/\./g,'');
  if(!u||/(?:m3\s*\/\s*(?:h|hr|hour)|m3h|m3ph)/.test(u))return n;
  if(/(?:l\s*\/\s*s|lps|l\s*per\s*sec)/.test(u))return n*3.6;
  if(/(?:l\s*\/\s*(?:min|minute)|lpm)/.test(u))return n*0.06;
  if(/(?:imp(?:erial)?\s*gpm|igpm)/.test(u))return n*0.2727654;
  if(/(?:us\s*gpm|usgpm)/.test(u))return n*0.227124707;
  return null;
}
function headToM(value:any,unit:any){
  const n=Number(value);if(!Number.isFinite(n))return null;const u=unitKey(unit).replace(/\./g,'');
  if(!u||/^(?:m|mtr|metre|meter|metres|meters)(?:\s*head)?$/.test(u))return n;
  if(/^(?:ft|feet|foot)(?:\s*head)?$/.test(u))return n*0.3048;
  if(/^bar$/.test(u))return n*10.19716213;
  if(/^kpa$/.test(u))return n*0.1019716213;
  if(/^psi$/.test(u))return n*0.703249615;
  return null;
}

function oneDecimal(value:any){
  const n=Number(value);
  if(!Number.isFinite(n))return '-';
  const r=Math.round((n+Number.EPSILON)*10)/10;
  return Number.isInteger(r)?String(r):r.toFixed(1);
}
function inputNumber(value:any){
  const n=Number(value);
  if(!Number.isFinite(n))return '-';
  const r=Math.round((n+Number.EPSILON)*100)/100;
  if(Number.isInteger(r))return String(r);
  return r.toFixed(2).replace(/0$/,'');
}
function flowUnitLabel(unit:any){
  const u=unitKey(unit).replace(/\./g,'');
  if(/(?:m3\s*\/\s*(?:h|hr|hour)|m3h|m3ph)/.test(u))return 'm³/hr';
  if(/(?:l\s*\/\s*s|lps|l\s*per\s*sec)/.test(u))return 'Lps';
  if(/(?:l\s*\/\s*(?:min|minute)|lpm)/.test(u))return 'Lpm';
  if(/(?:imp(?:erial)?\s*gpm|igpm)/.test(u))return 'IGPM';
  if(/(?:us\s*gpm|usgpm)/.test(u))return 'US GPM';
  return String(unit||'').trim();
}
function headUnitLabel(unit:any){
  const u=unitKey(unit).replace(/\./g,'');
  if(/^(?:m|mtr|metre|meter|metres|meters)(?:\s*head)?$/.test(u))return 'Mtr';
  if(/^(?:ft|feet|foot)(?:\s*head)?$/.test(u))return 'Ft';
  if(/^bar$/.test(u))return 'bar';
  if(/^kpa$/.test(u))return 'kPa';
  if(/^psi$/.test(u))return 'psi';
  return String(unit||'').trim();
}
function flowUnitCode(unit:any){
  const u=unitKey(unit).replace(/\./g,'');
  if(/(?:m3\s*\/\s*(?:h|hr|hour)|m3h|m3ph)/.test(u))return 'm3h';
  if(/(?:l\s*\/\s*s|lps|l\s*per\s*sec)/.test(u))return 'lps';
  if(/(?:l\s*\/\s*(?:min|minute)|lpm)/.test(u))return 'lpm';
  if(/(?:imp(?:erial)?\s*gpm|igpm)/.test(u))return 'igpm';
  if(/(?:us\s*gpm|usgpm)/.test(u))return 'usgpm';
  return '';
}
function headUnitCode(unit:any){
  const u=unitKey(unit).replace(/\./g,'');
  if(/^(?:m|mtr|metre|meter|metres|meters)(?:\s*head)?$/.test(u))return 'm';
  if(/^(?:ft|feet|foot)(?:\s*head)?$/.test(u))return 'ft';
  if(/^bar$/.test(u))return 'bar';
  if(/^kpa$/.test(u))return 'kpa';
  if(/^psi$/.test(u))return 'psi';
  return '';
}
function dutyDisplay(source:string,flowM3h:any,headM:any){
  const s=String(source||'');
  const fm=s.match(/(\d+(?:\.\d+)?)\s*(m3\s*\/\s*(?:h|hr|hour)|m³\s*\/\s*(?:h|hr|hour)|m3h|m3ph|l\s*\/\s*s|lps|l\s*\/\s*(?:min|minute)|lpm|us\s*gpm|usgpm|imp(?:erial)?\s*gpm|igpm)\b/i);
  const hm=s.match(/(?:head\s*[:=]?\s*)?(\d+(?:\.\d+)?)\s*(mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)\s*(?:head)?\b/i);

  const q=Number(flowM3h),h=Number(headM);
  let flowText=Number.isFinite(q)?`${oneDecimal(q)} m³/hr`:'-';
  let headText=Number.isFinite(h)?`${oneDecimal(h)} Mtr`:'-';

  if(fm){
    const raw=Number(fm[1]),label=flowUnitLabel(fm[2]);
    const common=/^m³\/hr$/i.test(label);
    flowText=common?`${inputNumber(raw)} ${label}`:`${inputNumber(raw)} ${label} (${oneDecimal(q)} m³/hr)`;
  }
  if(hm){
    const raw=Number(hm[1]),label=headUnitLabel(hm[2]);
    const common=/^Mtr$/i.test(label);
    headText=common?`${inputNumber(raw)} ${label}`:`${inputNumber(raw)} ${label} (${oneDecimal(h)} Mtr)`;
  }
  return {
    flow_text:flowText,head_text:headText,duty_text:`${flowText} @ ${headText}`,
    raw_flow:fm?Number(fm[1]):q,flow_unit:fm?flowUnitCode(fm[2]):'m3h',
    raw_head:hm?Number(hm[1]):h,head_unit:hm?headUnitCode(hm[2]):'m'
  };
}
function sessionDutyText(session:any,item:any=null){
  const c=sessionContext(session),q=Number(item?.requested_flow_m3h??session?.flow_m3h??0),h=Number(item?.requested_head_m??session?.head_m??0);
  const saved=String(item?.duty_text||c.guided_duty_text||c.duty_text||'').trim();
  return saved||`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`;
}
function normaliseUnits(d:any){
  if(d.flow_value!==null&&d.flow_value!==undefined){const q=flowToM3h(d.flow_value,d.flow_unit);if(q!==null){d.flow_value=Number(q.toFixed(3));d.flow_unit='m³/hr'}}
  if(d.head_value!==null&&d.head_value!==undefined){const h=headToM(d.head_value,d.head_unit);if(h!==null){d.head_value=Number(h.toFixed(3));d.head_unit='m'}}
  return d;
}
function normalFluid(value:any){
  const s=String(value||'').trim();if(!s)return null;
  if(/\bwater\b/i.test(s))return 'Water';
  if(/\boil\b/i.test(s))return 'Oil';
  return s;
}
function extractFacts(source:string){
  const s=String(source||''),lower=s.toLowerCase();
  let duty=firstNumber(s.match(/(\d+)\s*duty\b/i));
  let onDemand=firstNumber(s.match(/(\d+)\s*(?:on\s*demand|demand)\b/i));
  let standby=firstNumber(s.match(/(\d+)\s*standby\b/i));
  const compactDS=s.match(/\b(\d+)\s*d(?:uty)?\s*(?:\+|\/|,)\s*(\d+)\s*s(?:tandby)?\b/i);
  if(compactDS){duty=Number(compactDS[1]);standby=Number(compactDS[2])}
  const compactDOS=s.match(/\b(\d+)\s*d(?:uty)?\s*(?:\+|\/|,)\s*(\d+)\s*(?:od|on\s*demand)\s*(?:\+|\/|,)\s*(\d+)\s*s(?:tandby)?\b/i);
  if(compactDOS){duty=Number(compactDOS[1]);onDemand=Number(compactDOS[2]);standby=Number(compactDOS[3])}
  const genericPump=firstNumber(s.match(/\b(\d+)\s*(?:pumps?|pump\s*system|pump\s*set)\b/i));
  const flowMatch=s.match(/(\d+(?:\.\d+)?)\s*(m3\s*\/\s*(?:h|hr|hour)|m³\s*\/\s*(?:h|hr|hour)|m3h|m3ph|l\s*\/\s*s|lps|l\s*\/\s*(?:min|minute)|lpm|us\s*gpm|usgpm|imp(?:erial)?\s*gpm|igpm)\b/i);
  const headMatch=s.match(/(?:head\s*[:=]?\s*)?(\d+(?:\.\d+)?)\s*(mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)\s*(?:head)?\b/i);
  const voltageMatch=s.match(/(\d+(?:\.\d+)?)\s*v\b/i);
  const hzMatch=s.match(/(\d+(?:\.\d+)?)\s*hz\b/i);
  const phaseMatch=s.match(/\b([13])\s*(?:ph|phase)\b/i);
  let application:string|null=null;
  if(/\bbooster\b/i.test(s))application='Booster';else if(/\btransfer\b/i.test(s))application='Transfer';
  let fluid:string|null=null;
  if(/\bwater\b/i.test(s))fluid='Water';
  else if(/\boil\b/i.test(s))fluid='Oil';
  else {
    const fluidMatch=s.match(/\b(?:fluid|liquid)\s*(?:is|:|=)?\s*([a-z][a-z0-9 +./-]{2,40})/i);
    if(fluidMatch)fluid=fluidMatch[1].trim().replace(/[,.].*$/,'');
  }
  let material:string|null=null;
  if(/\b(?:ss\s*304|stainless\s*steel\s*304)\b/i.test(s))material='Stainless Steel 304';
  else if(/\b(?:ss\s*316|stainless\s*steel\s*316)\b/i.test(s))material='Stainless Steel 316';
  else if(/\bcast\s*iron\b[^\n]{0,30}\bstainless\s*steel\b/i.test(s)||/\bci\s*[/+-]\s*ss\b/i.test(s))material='Cast Iron / Stainless Steel';
  else if(/\bstandard\s+material\b/i.test(s))material='Standard Material';
  let elastomer:string|null=null;
  if(/\bepdm\b/i.test(s))elastomer='EPDM';
  else if(/\bviton\b/i.test(s))elastomer='Viton';
  else if(/\bnbr\b/i.test(s))elastomer='NBR';
  else if(/\bstandard\s+(?:seal|elastomer)\b/i.test(s))elastomer='Standard';
  let installation:string|null=null;
  if(/\boutdoor\b/i.test(s))installation='Outdoor';else if(/\bindoor\b/i.test(s))installation='Indoor';
  let suctionCondition:string|null=null;
  if(/\bsuction\s+lift\b/i.test(s))suctionCondition='Suction Lift';
  else if(/\bflooded\s+suction\b|\bpositive\s+suction\b/i.test(s))suctionCondition='Flooded / Positive Suction';
  else if(/\bsuction\s+(?:condition\s+)?unknown\b/i.test(s))suctionCondition='Unknown';
  let fluidTemperature:string|null=null;
  const tempMatch=s.match(/(-?\d+(?:\.\d+)?)\s*(?:(?:deg(?:ree)?s?)\s*)?(?:°\s*)?c\b/i);
  if(tempMatch)fluidTemperature=`${Number(tempMatch[1])}°C`;
  let flowBasis:string|null=null;
  if(/\btotal\s+(?:system\s+)?flow\b/i.test(s)||/\bsystem\s+flow\b/i.test(s)||/\b(?:m3|m³|l\s*\/\s*s|lps|lpm|gpm)\b[^\n]{0,24}\btotal\b/i.test(lower))flowBasis='total_system';
  if(/\bper\s+(?:duty\s+)?pump\b/i.test(s)||/\beach\s+(?:duty\s+)?pump\b/i.test(s)||/\bper\s+duty\b/i.test(s))flowBasis='per_duty_pump';
  const explicitArrangement=duty!==null||onDemand!==null||standby!==null;
  if(genericPump!==null&&explicitArrangement){
    if(duty===null)duty=1;
    const known=Number(duty||0)+Number(onDemand||0)+Number(standby||0);
    if(onDemand===null&&genericPump>known)onDemand=genericPump-known;
  }
  const pumpQuantity=genericPump!==null?genericPump:(explicitArrangement?Number(duty||0)+Number(onDemand||0)+Number(standby||0):null);
  const dutyConfiguration=explicitArrangement?[duty!==null?`${duty} Duty`:null,onDemand!==null?`${onDemand} On Demand`:null,standby!==null?`${standby} Standby`:null].filter(Boolean).join(' + '):null;
  const flowRaw=flowMatch?Number(flowMatch[1]):null,headRaw=headMatch?Number(headMatch[1]):null;
  const flowValue=flowMatch?flowToM3h(flowRaw,flowMatch[2]):null,headValue=headMatch?headToM(headRaw,headMatch[2]):null;
  return {
    application,system_type:application?`${application} System`:null,pump_quantity:pumpQuantity,duty_configuration:dutyConfiguration,
    flow_value:flowValue===null?null:Number(flowValue.toFixed(3)),flow_unit:flowValue===null?null:'m³/hr',flow_basis:flowBasis,
    head_value:headValue===null?null:Number(headValue.toFixed(3)),head_unit:headValue===null?null:'m',fluid,fluid_temperature:fluidTemperature,material,elastomer,installation,suction_condition:suctionCondition,
    voltage:firstNumber(voltageMatch),phase:phaseMatch?`${phaseMatch[1]} Phase`:null,frequency_hz:firstNumber(hzMatch)
  };
}
function normalApplication(value:any){const s=String(value||'').trim();if(/booster/i.test(s))return 'Booster';if(/transfer/i.test(s))return 'Transfer';return s||null}
function defaultDutyConfiguration(qty:any){
  const n=Math.max(0,Math.trunc(Number(qty)||0));
  if(n===1)return '1 Duty';
  if(n>1)return `1 Duty + ${n-1} On Demand`;
  return null;
}
function applyKeyAiDefaults(d:any){
  if(!d.application)d.application='Booster';
  if(!d.system_type)d.system_type=`${normalApplication(d.application)||'Booster'} System`;
  if(d.pump_quantity&&!d.duty_configuration)d.duty_configuration=defaultDutyConfiguration(d.pump_quantity);
  if(d.flow_value!==null&&d.flow_value!==undefined&&!d.flow_basis)d.flow_basis='per_duty_pump';
  if(!d.fluid)d.fluid='Water';
  if(!d.fluid_temperature)d.fluid_temperature='10–70°C';
  if(d.voltage===null||d.voltage===undefined)d.voltage=415;
  if(!d.phase)d.phase='3 Phase';
  if(d.frequency_hz===null||d.frequency_hz===undefined)d.frequency_hz=50;
  if(!d.material)d.material='Standard Material';
  if(!d.elastomer)d.elastomer='Standard';
  if(!d.installation)d.installation='Indoor';
  if(!d.suction_condition)d.suction_condition='Flooded / Positive Suction';
  return d;
}
function generatedSummary(d:any){
  const parts:string[]=[];
  if(d.system_type)parts.push(String(d.system_type));
  if(d.duty_configuration)parts.push(String(d.duty_configuration));
  if(d.flow_value!==null&&d.flow_value!==undefined)parts.push(`${d.flow_value} ${d.flow_unit||'m³/hr'}`);
  if(d.head_value!==null&&d.head_value!==undefined)parts.push(`${d.head_value} ${d.head_unit||'m'} head`);
  if(d.fluid)parts.push(String(d.fluid));
  if(d.voltage!==null&&d.voltage!==undefined)parts.push(`${d.voltage} V`);
  return parts.join(' · ')||'KeyAI prepared quotation requirements.';
}
function cleanQuestion(question:string,ordinaryWaterSystem:boolean){
  const q=String(question||'').trim();if(!q)return '';
  if(ordinaryWaterSystem&&/fluid temperature|viscosity|solids content|fluid properties|material/i.test(q))return '';
  return q.replace(/^[-*\d.)\s]+/,'').trim();
}
function normaliseResult(parsed:any,source:string,existing:any=null){
  const base=existing&&typeof existing==='object'&&!Array.isArray(existing)?{...existing}:{};
  const incoming=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  let d:any={...base};
  Object.entries(incoming).forEach(([key,value])=>{
    if(Array.isArray(value)){d[key]=value;return;}
    if(value!==null&&value!==undefined&&value!==''){d[key]=value;return;}
    if(!(key in d))d[key]=value;
  });
  if(typeof d.raw_output==='string'){
    const nested=parseAiJson(d.raw_output);if(nested&&!nested.raw_output)d={...base,...nested,...incoming};
  }
  const facts=extractFacts(source);
  normaliseUnits(d);
  const fields=['application','system_type','pump_quantity','duty_configuration','flow_value','flow_unit','flow_basis','head_value','head_unit','fluid','fluid_temperature','material','elastomer','installation','suction_condition','voltage','phase','frequency_hz'];
  fields.forEach(k=>{if((d[k]===null||d[k]===undefined||d[k]==='')&&facts[k]!==null&&facts[k]!==undefined&&facts[k]!=='')d[k]=facts[k]});
  // Explicit customer facts always override a previously assumed default.
  ['application','system_type','pump_quantity','duty_configuration','flow_value','flow_unit','flow_basis','head_value','head_unit','fluid','fluid_temperature','material','elastomer','installation','suction_condition','voltage','phase','frequency_hz'].forEach(k=>{
    if(facts[k]!==null&&facts[k]!==undefined&&facts[k]!=='')d[k]=facts[k];
  });
  d.fluid=normalFluid(d.fluid);
  d.application=normalApplication(d.application||facts.application);
  if(d.application&&(!d.system_type||/duty|standby|on demand/i.test(String(d.system_type))))d.system_type=`${d.application} System`;
  if(d.flow_value!==null&&d.flow_value!==undefined&&!d.flow_unit)d.flow_unit='m³/hr';
  if(d.head_value!==null&&d.head_value!==undefined&&!d.head_unit)d.head_unit='m';
  if(!['total_system','per_duty_pump'].includes(String(d.flow_basis||'')))d.flow_basis=facts.flow_basis||null;
  if(!d.pump_quantity&&facts.pump_quantity)d.pump_quantity=facts.pump_quantity;
  if(!d.duty_configuration&&facts.duty_configuration)d.duty_configuration=facts.duty_configuration;
  applyKeyAiDefaults(d);
  let critical=strings(d.critical_missing_information);
  let missing=strings(d.missing_information);
  if(d.flow_value!==null&&d.flow_value!==undefined)critical=critical.filter(v=>!/required flow|flow is not confirmed/i.test(v));
  if(d.head_value!==null&&d.head_value!==undefined)critical=critical.filter(v=>!/required head|head is not confirmed/i.test(v));
  // B4.06.04: defaults resolve all non-duty omissions. Only Flow/Head or genuine contradictions require customer follow-up.
  critical=critical.filter(v=>/required flow|flow is not confirmed|required head|head is not confirmed|contradict|conflict|ambiguous|unclear/i.test(v));
  missing=missing.filter(v=>/required flow|required head|contradict|conflict|ambiguous|unclear/i.test(v));
  const automaticCritical:string[]=[];
  if(d.flow_value===null||d.flow_value===undefined)automaticCritical.push('Required flow is not confirmed.');
  if(d.head_value===null||d.head_value===undefined)automaticCritical.push('Required head is not confirmed.');
  d.critical_missing_information=[...automaticCritical,...critical].filter((v,i,a)=>v&&a.indexOf(v)===i);
  d.missing_information=missing.filter((v,i,a)=>v&&a.indexOf(v)===i).filter(v=>!d.critical_missing_information.includes(v));
  d.clarification_questions=strings(d.clarification_questions,6).filter(q=>/flow|head|pressure|contradict|conflict|ambiguous|unclear/i.test(q));
  const summary=String(d.summary||'').trim();
  d.summary=summary&&!summary.startsWith('{')?summary:generatedSummary(d);
  if('raw_output' in d)delete d.raw_output;
  return d;
}
function summaryFrom(result:any){return String(result?.summary||generatedSummary(result||{})).trim()}
function multiDuty(d:any,source=''){return Number(d?.pump_quantity||0)>1||/\b[2-9]\d*\s*duty\b/i.test(String(d?.duty_configuration||source))}
function questionText(q:SmartQuestion){
  return q.options?.length?`${q.prompt}\n${q.options.map(o=>`${o.key}. ${o.label}`).join('\n')}`:q.prompt;
}
function buildSmartQuestions(d:any,source:string,aiQuestions:string[]=[]){
  const questions:SmartQuestion[]=[];
  if(d.flow_value===null||d.flow_value===undefined)questions.push({field:'flow',label:'Required Flow',prompt:'What is the required flow rate? Please include the unit (for example 600 L/min, 30 m3/hr, or 10 L/s).'});
  if(d.head_value===null||d.head_value===undefined)questions.push({field:'head',label:'Required Head',prompt:'What is the required head or pressure? Please include the unit (for example 45 m, 3 bar, or 300 kPa).'});
  for(const q of aiQuestions){
    if(questions.length>=3)break;
    const clean=String(q||'').trim();if(!clean)continue;
    if(!/contradict|conflict|ambiguous|unclear|confirm which/i.test(clean))continue;
    if(questions.some(existing=>existing.prompt.toLowerCase()===clean.toLowerCase()))continue;
    questions.push({field:`conflict_${questions.length+1}`,label:'Confirmation',prompt:clean});
  }
  return questions.slice(0,3);
}
function clarificationText(questions:SmartQuestion[]){
  if(!questions.length)return '';
  const heading=questions.length===1?'Thank you. I need one more detail before preparing the requirements:':'Thank you. I need a few details before preparing the requirements:';
  const body=questions.map((q,i)=>{
    const options=q.options?.length?`\n${q.options.map(o=>`   ${o.key}. ${o.label}`).join('\n')}`:'';
    return `${i+1}. ${q.prompt}${options}`;
  }).join('\n\n');
  const choiceQuestions=questions.filter(q=>q.options?.length);
  const example=choiceQuestions.length?`\n\nYou can reply with the choices together, for example: ${choiceQuestions.map((q)=>`${questions.indexOf(q)+1}${q.options?.[0]?.key||'a'}`).join(', ')}. Free-text answers are also fine.`:'\n\nYou can reply in normal text.';
  return `${heading}\n\n${body}${example}`;
}
function smartQuestionsFrom(value:any):SmartQuestion[]{
  return (Array.isArray(value)?value:[]).map((q:any)=>({
    field:String(q?.field||''),label:String(q?.label||''),prompt:String(q?.prompt||''),
    options:Array.isArray(q?.options)?q.options.map((o:any)=>({key:String(o?.key||'').toLowerCase(),label:String(o?.label||'')})).filter((o:SmartOption)=>o.key&&o.label):undefined
  })).filter((q:SmartQuestion)=>q.field&&q.prompt).slice(0,3);
}
function choiceSegments(text:string){
  const s=String(text||'');const re=/(\d+)\s*([abc])(?=$|[\s,;:/-])/gi;const matches=[...s.matchAll(re)];
  return matches.map((m,i)=>({number:Number(m[1]),choice:String(m[2]).toLowerCase(),extra:s.slice((m.index||0)+m[0].length,i+1<matches.length?(matches[i+1].index||s.length):s.length).replace(/^[\s,;:/-]+|[\s,;:/-]+$/g,'').trim()}));
}
function interpretSmartReply(text:string,questions:SmartQuestion[]){
  const overrides:any={};const understood:string[]=[];let recognized=0;
  for(const seg of choiceSegments(text)){
    const q=questions[seg.number-1];if(!q?.options?.some(o=>o.key===seg.choice))continue;
    if(q.field==='flow_basis'){
      if(seg.choice==='a'){overrides.flow_basis='total_system';understood.push(`Question ${seg.number} Flow Basis = Total system flow`);recognized++;}
      if(seg.choice==='b'){overrides.flow_basis='per_duty_pump';understood.push(`Question ${seg.number} Flow Basis = Flow per duty pump`);recognized++;}
    }else if(q.field==='fluid'){
      if(seg.choice==='a'){overrides.fluid='Water';understood.push(`Question ${seg.number} Fluid = Water`);recognized++;}
      else if(seg.choice==='b'){overrides.fluid='Oil';understood.push(`Question ${seg.number} Fluid = Oil`);recognized++;}
      else if(seg.choice==='c'&&seg.extra){overrides.fluid=seg.extra;understood.push(`Question ${seg.number} Fluid = ${seg.extra}`);recognized++;}
    }else if(q.field==='power_supply'){
      if(seg.choice==='a'){Object.assign(overrides,{voltage:415,phase:'3 Phase',frequency_hz:50});understood.push(`Question ${seg.number} Power Supply = 415V / 3Ph / 50Hz`);recognized++;}
      else if(seg.choice==='b'){Object.assign(overrides,{voltage:240,phase:'1 Phase',frequency_hz:50});understood.push(`Question ${seg.number} Power Supply = 240V / 1Ph / 50Hz`);recognized++;}
      else if(seg.choice==='c'&&seg.extra){const facts=extractFacts(seg.extra);if(facts.voltage!==null)overrides.voltage=facts.voltage;if(facts.phase)overrides.phase=facts.phase;if(facts.frequency_hz!==null)overrides.frequency_hz=facts.frequency_hz;understood.push(`Question ${seg.number} Power Supply = ${seg.extra}`);recognized++;}
    }
  }
  return {overrides,recognized,semantic:understood.length?understood.join('\n'):''};
}
function applyOverrides(d:any,overrides:any){
  Object.entries(overrides||{}).forEach(([key,value])=>{if(value!==null&&value!==undefined&&value!=='')d[key]=value});
  if(d.fluid)d.fluid=normalFluid(d.fluid);
  return d;
}


type TelegramButton={text:string;callback_data:string};
function telegramKeyboard(rows:TelegramButton[][]){return {inline_keyboard:rows}}
function telegramReplyKeyboard(rows:string[][],oneTime=false){return {keyboard:rows.map(row=>row.map(text=>({text}))),resize_keyboard:true,one_time_keyboard:oneTime}}
function telegramRemoveKeyboard(){return {remove_keyboard:true}}
async function telegramAnswerCallback(token:string,callbackId:string,text=''){
  if(!token||!callbackId)return;
  try{await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callback_query_id:callbackId,text,show_alert:false})})}catch(_){}
}
function cleanSearch(value:any){return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function levenshtein(a:string,b:string){
  a=cleanSearch(a);b=cleanSearch(b);if(!a)return b.length;if(!b)return a.length;
  const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1).fill(0);
  for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j]}
  return prev[b.length];
}
function customerMatchScore(name:any,query:any){
  const n=cleanSearch(name),q=cleanSearch(query);if(!q||!n)return 9999;if(n===q)return 0;if(n.startsWith(q))return 10;if(n.split(' ').some(x=>x.startsWith(q)))return 20;if(n.includes(q))return 30;
  const words=n.split(' ');let best=levenshtein(n,q);for(const w of words)best=Math.min(best,levenshtein(w,q));const allowance=Math.max(1,Math.floor(q.length/3));return best<=allowance?50+best:9999;
}

type KeybotLearningRow={id:string;context:string;phrase:string;meaning:string;learning_type:string;confidence:number;usage_count:number};
function learningContextFromText(value:any){
  const s=String(value||'');
  if(/\bkey\s*plc\b/i.test(s))return 'keyplc';
  if(/\b(?:gws|tank|pressure\s*(?:tank|vessel))\b/i.test(s))return 'tank';
  if(/\b(?:chc|vms|vertical\s+multistage|es|pump)\b/i.test(s)||/@/.test(s))return 'pump';
  return 'global';
}
function normalLearningContext(value:any){const v=cleanSearch(value).replace(/\s+/g,'');return ['global','keyplc','pump','tank','customer'].includes(v)?v:'global'}
function escapeRegex(value:any){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function learningProtected(value:any){
  const s=cleanSearch(value);
  if(!s)return true;
  return /\b(?:margin|discount|commission|pricing|price formula|permission|permissions|role|owner|admin|seal|quotation number|quote number|hydraulic|selector|sizing|vfd|hmi|standby|on demand|fuel price|currency rate)\b/i.test(s);
}
function learningReservedPhrase(value:any){const s=cleanSearch(value);return /^(?:hi|hello|hey|start|menu|curve|price|pricing|quotation|new request|options|done|learning|learned|teach|remember|forget)$/.test(s)}
function parseLearningTeachCommand(value:any){
  const raw=String(value||'').trim();
  const m=raw.match(/^(?:teach|remember)\s*(?:(global|key\s*plc|keyplc|pump|tank|customer)\s*)?[:\-]?\s*(.+?)\s*(?:=|->|means)\s*(.+?)\s*$/i);
  if(!m)return null;
  return {context:normalLearningContext(m[1]||'global'),phrase:String(m[2]||'').trim(),meaning:String(m[3]||'').trim()};
}
function parseLearningForgetCommand(value:any){
  const raw=String(value||'').trim();
  const m=raw.match(/^forget\s*(?:(global|key\s*plc|keyplc|pump|tank|customer)\s*)?[:\-]?\s*(.+?)\s*$/i);
  if(!m)return null;
  return {context:normalLearningContext(m[1]||'global'),phrase:String(m[2]||'').trim()};
}
async function applyKeybotLearning(service:any,companyId:string,value:any){
  const raw=String(value||'');if(!raw||!companyId)return {text:raw,used:[] as KeybotLearningRow[]};
  const ctx=learningContextFromText(raw),contexts=[...new Set(['global','customer',...(ctx==='keyplc'?['keyplc','pump']:ctx==='global'?[]:[ctx])])];
  const r=await service.from('ks_keybot_learning_v41400').select('id,context,phrase,meaning,learning_type,confidence,usage_count').eq('company_id',companyId).eq('status','approved').in('context',contexts).gte('confidence',0.7).order('phrase',{ascending:false});
  if(r.error){console.error('[KeySuite V4.14.00] Learning lookup failed',r.error);return {text:raw,used:[] as KeybotLearningRow[]}}
  const rows=(r.data||[]).filter((x:any)=>String(x.phrase||'').trim()&&String(x.meaning||'').trim()).sort((a:any,b:any)=>String(b.phrase).length-String(a.phrase).length);
  let text=raw;const used:any[]=[];
  for(const row of rows){
    const phrase=String(row.phrase||'').trim(),meaning=String(row.meaning||'').trim();if(!phrase||!meaning)continue;
    const boundary=/^[A-Za-z0-9]+$/.test(phrase)?`\\b${escapeRegex(phrase)}\\b`:escapeRegex(phrase);
    const re=new RegExp(boundary,'gi');
    if(re.test(text)){text=text.replace(re,meaning);used.push(row)}
  }
  for(const row of used){service.from('ks_keybot_learning_v41400').update({usage_count:Number(row.usage_count||0)+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.id).then(()=>{}).catch(()=>{})}
  return {text,used};
}
async function listKeybotLearning(service:any,companyId:string){
  const r=await service.from('ks_keybot_learning_v41400').select('id,context,phrase,meaning,learning_type,confidence,usage_count,updated_at').eq('company_id',companyId).eq('status','approved').order('usage_count',{ascending:false}).order('updated_at',{ascending:false}).limit(25);
  if(r.error)throw r.error;return r.data||[];
}
async function saveKeybotLearning(service:any,companyId:string,user:any,input:any){
  const phrase=String(input?.phrase||'').trim(),meaning=String(input?.meaning||'').trim(),context=normalLearningContext(input?.context);
  if(!phrase||!meaning)throw new Error('Both the phrase and meaning are required.');
  if(phrase.length>80||meaning.length>120)throw new Error('Keep the phrase under 80 characters and the meaning under 120 characters.');
  if(learningReservedPhrase(phrase))throw new Error('That phrase is reserved by the KeyBot menu and cannot be learned.');
  if(learningProtected(phrase)||learningProtected(meaning))throw new Error('That rule affects protected pricing, security or engineering behaviour and cannot be learned.');
  const existing=await service.from('ks_keybot_learning_v41400').select('id').eq('company_id',companyId).eq('context',context).ilike('phrase',phrase).eq('status','approved').maybeSingle();
  const payload={company_id:companyId,context,phrase,meaning,learning_type:'alias',confidence:1,status:'approved',approved_by_email:String(user?.email||'').toLowerCase(),source:'telegram_owner',updated_at:new Date().toISOString()};
  if(existing.data?.id){const u=await service.from('ks_keybot_learning_v41400').update(payload).eq('id',existing.data.id).select('*').single();if(u.error)throw u.error;return u.data}
  const i=await service.from('ks_keybot_learning_v41400').insert({...payload,created_by_email:String(user?.email||'').toLowerCase()}).select('*').single();if(i.error)throw i.error;return i.data;
}
async function forgetKeybotLearning(service:any,companyId:string,user:any,input:any){
  const phrase=String(input?.phrase||'').trim(),context=normalLearningContext(input?.context);if(!phrase)throw new Error('Phrase is required.');
  const r=await service.from('ks_keybot_learning_v41400').update({status:'disabled',approved_by_email:String(user?.email||'').toLowerCase(),updated_at:new Date().toISOString()}).eq('company_id',companyId).eq('context',context).ilike('phrase',phrase).eq('status','approved').select('id');
  if(r.error)throw r.error;return (r.data||[]).length;
}
function parseFlowStep(text:string){
  const s=String(text||'').trim();const n=Number((s.match(/-?\d+(?:\.\d+)?/)||[])[0]);if(!(n>0))return null;
  const lower=s.toLowerCase().replace(/³/g,'3');let unit='m3h';
  if(/l\s*\/\s*s|\blps\b/.test(lower))unit='lps';else if(/l\s*\/\s*(?:m|min)|\blpm\b/.test(lower))unit='lpm';else if(/\bus\s*gpm\b|\busgpm\b/.test(lower))unit='usgpm';else if(/\bimp(?:erial)?\s*gpm\b|\bigpm\b/.test(lower))unit='igpm';
  const value=flowToM3h(n,unit);return value&&value>0?{value:Number(value.toFixed(3)),raw:s}:null;
}
function parseHeadStep(text:string){
  const s=String(text||'').trim();const n=Number((s.match(/-?\d+(?:\.\d+)?/)||[])[0]);if(!(n>0))return null;
  const lower=s.toLowerCase();let unit='m';if(/\bbar\b/.test(lower))unit='bar';else if(/\bkpa\b/.test(lower))unit='kpa';else if(/\bpsi\b/.test(lower))unit='psi';else if(/\bft\b|\bfeet\b|\bfoot\b/.test(lower))unit='ft';
  const value=headToM(n,unit);return value&&value>0?{value:Number(value.toFixed(3)),raw:s}:null;
}
function quoteFamilyFromText(text:any){
  const s=String(text||'');
  if(/\bbfi\b/i.test(s))return 'BFI';
  if(/\b(?:chc|vms|vertical\s+multistage(?:\s+inline\s+pump)?)\b/i.test(s))return 'CHC';
  if(/\bes\s*[- ]?4\s*(?:p|pole)?\b|\b4\s*(?:p|pole)\s*es\b/i.test(s))return 'ES4';
  if(/\bes\s*[- ]?2\s*(?:p|pole)?\b|\b2\s*(?:p|pole)\s*es\b/i.test(s))return 'ES2';
  if(/\bes\s*4\s*pole/i.test(s))return 'ES4';
  if(/\bes\s*2\s*pole/i.test(s))return 'ES2';
  if(/\bes\b/i.test(s))return 'ES';
  return '';
}
function quoteChcScopeFromText(text:any){
  const s=String(text||'');
  // V4.26.05: explicit CHC generation is a hard sizing scope. Generic CHC/VMS
  // intentionally returns blank so the caller can search every CHC generation
  // actually assigned to the linked user (and Customer, when present).
  if(/\b(?:CHC|VMS)\s*(?:C4|G1)\b|\b(?:C4|G1)\s*(?:CHC|VMS)\b/i.test(s))return 'CHC_G1';
  if(/\b(?:CHC|VMS)\s*(?:C6|G2)\b|\b(?:C6|G2)\s*(?:CHC|VMS)\b/i.test(s))return 'CHC_G2';
  return '';
}

function parseDirectPumpModel(text:any){
  const raw=String(text||'');
  // BFI identity: no suffix = 1Ph/IE1, T = 3Ph/IE2 standard, E = 3Ph/IE2 Enhanced.
  // KeyBot confirms the motor phase before finalising a direct BFI model.
  const bfi=raw.match(/\bBFI\s*(\d{1,3})\s*-\s*(\d{1,3}(?:\s*-\s*\d{1,2})?)\s*([TE])?\b/i);
  if(bfi){const suffix=String(bfi[3]||'').toUpperCase();return {family:'BFI',model:`BFI ${bfi[1]}-${String(bfi[2]).replace(/\s+/g,'')}${suffix}`};}
  const chc=raw.match(/\b(?:CHC|VMS)\s*(\d{1,3})\s*-\s*(\d{1,3}(?:\s*-\s*\d{1,2})?(?:\s*-\s*\d{1,2})?)\b/i);
  if(chc)return {family:'CHC',model:`CHC ${chc[1]}-${String(chc[2]).replace(/\s+/g,'')}`};
  return null;
}
function bfiBaseModelName(value:any){return String(value||'').trim().replace(/[TE]$/i,'')}
function bfiPhaseModelName(value:any,phase:any,enhanced=false){const base=bfiBaseModelName(value),p=String(phase||'').toUpperCase();return enhanced&&p==='3PH'?`${base}E`:p==='3PH'?`${base}T`:base}
function bfiPhaseChoice(value:any){const c=cleanSearch(value);if(c==='1 phase'||c==='1ph'||c==='single phase'||c==='singlephase')return '1Ph';if(c==='3 phase'||c==='3ph'||c==='three phase'||c==='threephase')return '3Ph';return ''}
function bfiAvailablePhases(value:any){const wanted=bfiBaseModelName(value).toUpperCase(),db:any=(globalThis as any).KeySuiteBFIData,row=(db?.models||[]).find((x:any)=>String(x.model||'').toUpperCase()===wanted),phases=Array.isArray(row?.phases)?row.phases.filter((x:any)=>x==='1Ph'||x==='3Ph'):[];return phases.length?phases:['3Ph']}
function bfiPhaseMenu(value:any){const phases=bfiAvailablePhases(value),labels=phases.map((p:string)=>p==='1Ph'?'1 Phase':'3 Phase');return telegramReplyKeyboard([labels,['🔄 New Request']])}
function bfiDirectNeedsPhase(req:any){return /^BFI\b/i.test(String(req?.direct_model||''))&&!req?.bfi_phase_confirmed}
function bfiDirectRequestForPhase(req:any,phase:any){const base=bfiBaseModelName(req?.direct_model),requestedEnhanced=!!req?.bfi_requested_enhanced||/E$/i.test(String(req?.direct_model||'')),is3=String(phase)==='3Ph',enhanced=is3&&requestedEnhanced;return {...req,direct_model:bfiPhaseModelName(base,phase,enhanced),family_code:'BFI',product_type:'pump',bfi_phase_confirmed:true,bfi_motor_phase:is3?'3Ph':'1Ph',bfi_requested_enhanced:enhanced}}
function parseKeyplcSystemRequest(text:any){
  const raw=String(text||'');if(!/\bkey\s*plc\b/i.test(raw))return null;
  let qty=0;
  const near=raw.match(/\bkey\s*plc\s*(\d+)\s*(?:p|pumps?)\b/i)||raw.match(/\b(\d+)\s*pumps?\s*(?:system)?\b/i);
  if(near)qty=Math.max(1,Math.min(6,Number(near[1])||0));
  const direct=parseDirectPumpModel(raw);
  return {system_type:'KEYPLC',system_pump_qty:qty||2,system_operation:'1 Duty + balance On Demand',panel_control:'VFD + HMI',...(direct?{direct_model:direct.model,family_code:direct.family}:{})};
}
function smartQuoteRequest(text:any){
  const raw=String(text||'').trim();
  const normalized=raw.toLowerCase().replace(/³/g,'3').replace(/m3\s*[.]\s*(?:hr|h)\b/g,'m3/hr').replace(/m3\s*(?:per|\\)\s*(?:hr|h)\b/g,'m3/hr');
  const request:any={raw_input:raw};
  const family=quoteFamilyFromText(raw);if(family)request.family_code=family;
  const chcScope=quoteChcScopeFromText(raw);if(chcScope)request.chc_scope=chcScope;
  const directModel=parseDirectPumpModel(raw);if(directModel){request.direct_model=directModel.model;request.family_code=directModel.family;request.product_type='pump';if(directModel.family==='BFI'){const phases=bfiAvailablePhases(directModel.model);if(phases.length===1)Object.assign(request,bfiDirectRequestForPhase({...request,bfi_requested_enhanced:/E$/i.test(String(directModel.model||''))},phases[0]));}}
  const keyplc=parseKeyplcSystemRequest(raw);if(keyplc){Object.assign(request,keyplc);request.product_type='keyplc_system';}
  const tankIntent=!keyplc&&/\b(?:gws|tank|pressure\s*(?:tank|vessel))\b/i.test(raw);
  const pumpIntent=!keyplc&&!tankIntent&&(!!family||!!directModel||/\bpump\b/i.test(raw)||/@/.test(raw)||/\bm3\s*\/?\s*(?:h|hr)\b/i.test(normalized));
  if(tankIntent)request.product_type='tank';else if(pumpIntent)request.product_type='pump';
  let qty:number|null=null;
  const qtyMatch=raw.match(/\b(?:qty\s*[:=]?\s*)?(\d+)\s*(?:x|units?|pcs?|sets?)\b/i)||raw.match(/\b(\d+)\s*x\s*(?=[a-z])/i);
  if(qtyMatch){const n=Number(qtyMatch[1]);if(n>0&&n<=999)qty=n}if(qty)request.qty=qty;
  const flowMatch=normalized.match(/(\d+(?:\.\d+)?)\s*(m3\s*\/?\s*(?:h|hr|hour)|m3h|m3ph|l\s*\/\s*s|lps|l\s*\/\s*(?:min|minute)|lpm|us\s*gpm|usgpm|imp(?:erial)?\s*gpm|igpm)\b/i);
  if(flowMatch){const q=flowToM3h(Number(flowMatch[1]),flowMatch[2]);if(q&&q>0){request.flow_m3h=Number(q.toFixed(3));request.flow_raw=flowMatch[0]}}
  let headMatch=normalized.match(/@\s*(\d+(?:\.\d+)?)\s*(mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)\b/i);
  if(!headMatch)headMatch=normalized.match(/(?:head\s*[:=]?\s*)(\d+(?:\.\d+)?)\s*(mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)?\b/i);
  if(!headMatch&&request.flow_m3h)headMatch=normalized.match(/\b(\d+(?:\.\d+)?)\s*(mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)\b(?!\s*3)/i);
  if(headMatch){const h=headToM(Number(headMatch[1]),headMatch[2]||'m');if(h&&h>0){request.head_m=Number(h.toFixed(3));request.head_raw=headMatch[0]}}
  if((!request.flow_m3h||!request.head_m)){const bare=normalized.match(/\b(\d+(?:\.\d+)?)\s*@\s*(\d+(?:\.\d+)?)\b/);if(bare){if(!request.flow_m3h)request.flow_m3h=Number(bare[1]);if(!request.head_m)request.head_m=Number(bare[2]);request.product_type=request.product_type||'pump'}}
  if(tankIntent){
    const size=normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:l|ltr|litres?|liters?)\b/i);if(size)request.tank_size_litres=Number(size[1]);
    const pressure=normalized.match(/\b(\d+(?:\.\d+)?)\s*bar\b/i);if(pressure)request.tank_pressure_bar=Number(pressure[1]);
    const model=raw.match(/\bmodel\s*[:=]?\s*([a-z0-9][a-z0-9._\/-]{1,30})/i);if(model)request.tank_model_hint=model[1];
  }
  if(!tankIntent){const options=parsePumpOptionsText(raw);if(Object.keys(options).length)request.options=options;}
  return request;
}
function parsePumpOptionsText(text:any){
  const s=String(text||'');const out:any={};
  if(/\bss\s*316\b|\b316\s*(?:ss|stainless)?\b/i.test(s))out.material='SS316';
  else if(/\bss\s*304\b|\b304\s*(?:ss|stainless)?\b/i.test(s))out.material='SS304';
  if(/\bie\s*5\b/i.test(s))out.motor_efficiency='IE5';else if(/\bie\s*4\b/i.test(s))out.motor_efficiency='IE4';else if(/\bie\s*3\b/i.test(s))out.motor_efficiency='IE3';else if(/\bie\s*2\b/i.test(s))out.motor_efficiency='IE2';else if(/\bie\s*1\b/i.test(s))out.motor_efficiency='IE1';
  if(/\bsi?c\s*[\/-]\s*si?c\b/i.test(s))out.seal='SiC/SiC';else if(/\btc\s*[\/-]\s*tc\b/i.test(s))out.seal='TC/TC';else if(/\bcarbon\s*[\/-]\s*si?c\b/i.test(s))out.seal='Carbon/SiC';
  if(/\bepdm\b/i.test(s))out.elastomer='EPDM';else if(/\bnbr\b/i.test(s))out.elastomer='NBR';else if(/\bviton\b/i.test(s))out.elastomer='Viton';
  if(/\boval\s*(?:flange)?\b/i.test(s))out.connection='Oval Flange';else if(/\bround\s*(?:flange)?\b/i.test(s))out.connection='Round Flange';
  if(/\bbare\s*shaft\b/i.test(s))out.bare_shaft=true;
  return out;
}
function pumpOptions(existing:any={},qty:any=1){
  const o=existing&&typeof existing==='object'?existing:{};return {
    material:['Standard','SS304','SS316'].includes(String(o.material))?String(o.material):'Standard',
    motor_efficiency:['IE1','IE2','IE3','IE4','IE5'].includes(String(o.motor_efficiency))?String(o.motor_efficiency):'IE3',
    seal:['Carbon/SiC','SiC/SiC','TC/TC'].includes(String(o.seal))?String(o.seal):'Carbon/SiC',
    elastomer:['Viton','EPDM','NBR'].includes(String(o.elastomer))?String(o.elastomer):'Viton',
    connection:['Round Flange','Oval Flange'].includes(String(o.connection))?String(o.connection):'Round Flange',
    bare_shaft:!!o.bare_shaft,qty:Math.max(1,Math.min(999,Math.trunc(Number(o.qty||qty)||1)))
  };
}
function mergePumpOptions(base:any,next:any,qty:any=1){return pumpOptions({...pumpOptions(base,qty),...(next&&typeof next==='object'?next:{})},qty)}
function pumpOptionSummary(item:any){const o=pumpOptions(item?.options,item?.qty);return [`Material: ${o.material}`,`Motor: ${o.motor_efficiency}`,`Seal: ${o.seal} / ${o.elastomer}`,`Connection: ${o.connection}`,`Bare Shaft: ${o.bare_shaft?'Yes':'No'}`,`Quantity: ${o.qty}`].join('\n')}
function pumpOptionsMenu(){return telegramReplyKeyboard([['Material','Motor'],['Seal','Elastomer'],['Connection','Bare Shaft'],['Quantity'],['✅ Done','⬅️ Main Menu']])}
function pumpResultMenu(mode:any){if(mode==='curve')return simpleCurveMenu();if(mode==='price')return simplePriceMenu(true);return telegramReplyKeyboard([['📈 Curve PDF','⚙️ Options'],['🔄 New Request']])}
function chcVariantModel(value:any,material:any){
  const raw=String(value||'').trim();if(!raw)return raw;
  const base=raw.replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC');if(!/^CHC\b/i.test(base))return raw;
  return material==='SS304'?base.replace(/^CHC\b/i,'CHCS'):material==='SS316'?base.replace(/^CHC\b/i,'CHCN'):base;
}
function esPricingMaterial(value:any){
  const raw=String(value||'').trim();if(/^SS\s*304$/i.test(raw))return 'SS304';if(/^SS\s*316$/i.test(raw))return 'SS316';
  if(!raw||/^standard$/i.test(raw))return 'CI / SS / SS / MS';return raw;
}
function materialKey(value:any){return String(value||'').toUpperCase().replace(/[^A-Z0-9]+/g,'')}
function applyPumpOptionsToItem(item:any,options:any){
  const oldOptions=pumpOptions(item?.options,item?.qty),o=pumpOptions(options,item?.qty),family=String(item?.family||'').toUpperCase();let model=String(item?.model||''),displayModel=String(item?.display_model||'');
  const previousMaterial=oldOptions.material;
  if(family==='CHC'){
    model=chcVariantModel(model,o.material);
    if(displayModel)displayModel=chcVariantModel(displayModel,o.material);
  }else if(family==='BFI'){
    // V4.23.08 BFI identity: base = 1Ph/IE1, T = 3Ph/IE2 standard, E = 3Ph/IE2 Enhanced.
    const identity=String(displayModel||item?.quotation_model||model||''),base=String(item?.base_model||model||displayModel).replace(/[TE]$/i,'').trim();
    const enhanced=!!item?.enhanced||/E$/i.test(identity),hintedPhase=String(item?.motor_phase||item?.phase||'');
    const phase=enhanced?'3Ph':(hintedPhase==='1Ph'||hintedPhase==='3Ph'?hintedPhase:(/T$/i.test(identity)?'3Ph':'1Ph'));
    const variant=(value:any)=>{const v=String(value||base).replace(/[TE]$/i,'').trim();return enhanced?`${v}E`:phase==='3Ph'?`${v}T`:v};
    model=base;displayModel=variant(displayModel||base);o.motor_efficiency=phase==='1Ph'?'IE1':'IE2';
    (item as any).motor_phase=phase;(item as any).enhanced=enhanced;(item as any).enhanced_curve=enhanced;
  }
  const next:any={...item,model,...(displayModel?{display_model:displayModel}:{}),qty:o.qty,options:o,keysuite_material:family==='ES'?esPricingMaterial(o.material):o.material};
  if(family==='CHC'){
    if(item?.quotation_model)next.quotation_model=chcVariantModel(item.quotation_model,o.material);
    if(item?.pricing_model)next.pricing_model=chcVariantModel(item.pricing_model,o.material);
    next.material_variant=o.material==='SS304'?'CHCS':o.material==='SS316'?'CHCN':'CHC';
  }else if(family==='BFI'){
    const identity=String(displayModel||item?.quotation_model||''),enhanced=!!item?.enhanced||/E$/i.test(identity),phase=enhanced?'3Ph':(String(item?.motor_phase||'1Ph')==='3Ph'?'3Ph':'1Ph'),base=String(item?.base_model||model).replace(/[TE]$/i,'').trim();
    const clean=String(displayModel||base).replace(/[TE]$/i,''),display=enhanced?`${clean}E`:phase==='3Ph'?`${clean}T`:clean;
    next.model=base;next.base_model=base;next.display_model=display;next.quotation_model=display;next.motor_phase=phase;next.motor_efficiency_class=phase==='1Ph'?'IE1':'IE2';next.enhanced=enhanced;next.enhanced_curve=enhanced;next.rpm=enhanced?3480:Number(next.rpm||2900);next.frequency_hz=enhanced?60:Number(next.frequency_hz||50);next.options={...o,motor_efficiency:next.motor_efficiency_class};
    if(item?.pricing_model)next.pricing_model=String(item.pricing_model).replace(/[TE]$/i,'');
  }else if(family==='ES')next.pricing_material=esPricingMaterial(o.material);
  if(previousMaterial!==o.material){delete next.unit_price;delete next.line_total;delete next.pricing;}
  return next;
}
function activeQuoteFromSession(session:any){
  const c=sessionContext(session);if(session?.selected_customer_id&&c.keysuite_user_email){return {customer_id:String(session.selected_customer_id),customer_name:String(c.customer_name||'Selected Customer'),keysuite_user_email:String(c.keysuite_user_email||''),draft_items:draftItemsFrom(session)}}
  const a=c.active_quote;return a&&a.customer_id&&a.keysuite_user_email?{...a,draft_items:Array.isArray(a.draft_items)?a.draft_items:[]}:null;
}
function mergeQuoteRequest(base:any,next:any){
  const out={...(base&&typeof base==='object'?base:{}),...(next&&typeof next==='object'?next:{})};
  if(!out.qty)out.qty=1;return out;
}
function hasQuoteTechnicalFacts(req:any){return !!(req?.product_type||req?.flow_m3h||req?.head_m||req?.family_code||req?.direct_model||req?.system_type||req?.tank_size_litres||req?.tank_pressure_bar||req?.tank_model_hint||Number(req?.qty)>1)}
function customerQueryFromQuoteText(text:any,req:any={}){
  let s=String(text||'');
  s=s.replace(/\b(?:quote|quotation|please|prepare|need|for)\b/ig,' ')
    .replace(/\b(?:qty\s*[:=]?\s*)?\d+\s*(?:x|units?|pcs?|sets?)\b/ig,' ')
    .replace(/\b(?:chc|es\s*[- ]?[24]\s*(?:p|pole)?|pump|gws|tank|pressure\s*(?:tank|vessel))\b/ig,' ')
    .replace(/\d+(?:\.\d+)?\s*(?:m3|m³)\s*[./]?\s*(?:h|hr|hour)\b/ig,' ')
    .replace(/@\s*\d+(?:\.\d+)?\s*(?:mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)?\b/ig,' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:l|ltr|litres?|liters?|bar)\b/ig,' ')
    .replace(/\bmodel\s*[:=]?\s*[a-z0-9._\/-]+\b/ig,' ')
    .replace(/[,@;|]+/g,' ');
  return s.replace(/\s+/g,' ').trim();
}
async function keybotSession(service:any,companyId:string,chatId:string,senderId:string){
  if(!companyId||!chatId||!senderId)return null;
  const r=await service.from('ks_keybot_sessions_v41300').select('*').eq('keysuite_company_id',companyId).eq('channel','telegram').eq('chat_id',chatId).eq('sender_id',senderId).maybeSingle();
  if(r.error){console.error('[KeySuite V4.14.00] Session lookup failed',r.error);return null}
  const row:any=r.data||null;if(!row)return null;const age=Date.now()-new Date(row.updated_at||0).getTime(),c=row.context&&typeof row.context==='object'?row.context:{};const hasDraft=Array.isArray(c.draft_items)&&c.draft_items.length>0;return age>(hasDraft?30*24:12)*60*60*1000?null:row;
}
async function saveKeybotSession(service:any,companyId:string,chatId:string,senderId:string,patch:any){
  if(!companyId||!chatId||!senderId)return null;
  const payload={keysuite_company_id:companyId,channel:'telegram',chat_id:chatId,sender_id:senderId,...patch,updated_at:new Date().toISOString()};
  const r=await service.from('ks_keybot_sessions_v41300').upsert(payload,{onConflict:'keysuite_company_id,channel,chat_id,sender_id'}).select('*').single();
  if(r.error){console.error('[KeySuite V4.14.00] Session save failed',r.error);return null}return r.data;
}
function defaultRoleCustomerScope(role:any){
  const r=String(role||'').trim().toLowerCase();
  if(r==='owner'||r==='admin')return 'all';
  if(r==='dealer')return 'own';
  if(r==='user'||r==='viewer')return 'assigned';
  return 'none';
}
function normalizeCustomerScope(value:any){
  const v=String(value||'').trim().toLowerCase();
  if(v==='all'||v==='full')return 'all';
  if(v==='own'||v==='self'||v==='assigned')return 'assigned';
  return 'none';
}
async function linkedKeySuiteUser(service:any,companyId:string,senderId:string){
  if(!companyId||!senderId)return null;
  const map=await service.from('ks_keyai_sender_customer_v40903').select('keysuite_user_email').eq('keysuite_company_id',companyId).eq('channel','telegram').eq('sender_id',senderId).maybeSingle();
  if(map.error){console.error('[KeySuite V4.14.00] Telegram user link lookup failed',map.error);return null}
  const email=String(map.data?.keysuite_user_email||'').trim().toLowerCase();if(!email)return null;
  const access=await service.from('ks_user_access').select('email,display_name,role,active,company_id').eq('company_id',companyId).ilike('email',email).eq('active',true).maybeSingle();
  if(access.error||!access.data)return null;
  const role=String(access.data.role||'user').trim().toLowerCase();
  let rawViewCustomers=defaultRoleCustomerScope(role);
  const pr=await service.from('ks_role_permissions').select('permissions').eq('company_id',companyId).ilike('role',role).maybeSingle();
  if(pr.error)console.warn('[KeySuite V4.18.03] Role Customer permission lookup failed; using built-in role default',pr.error);
  else if(pr.data?.permissions&&Object.prototype.hasOwnProperty.call(pr.data.permissions,'view_customers'))rawViewCustomers=String(pr.data.permissions.view_customers||'none').trim().toLowerCase();
  const viewCustomers=normalizeCustomerScope(rawViewCustomers);
  return {...access.data,email,role,view_customers:viewCustomers,view_customers_raw:rawViewCustomers};
}
async function findAllowedCustomers(service:any,companyId:string,user:any,query:string){
  if(!user||String(user.view_customers||'none')==='none')return [];
  let q=service.from('ks_customers').select('id,company_name,assigned_user_email,status').eq('company_id',companyId).eq('status','active');
  if(String(user.view_customers)!=='all')q=q.ilike('assigned_user_email',String(user.email||''));
  const r=await q.limit(300);if(r.error){console.error('[KeySuite V4.14.00] Customer search failed',r.error);return []}
  return (r.data||[]).map((x:any)=>({...x,score:customerMatchScore(x.company_name,query)})).filter((x:any)=>x.score<9999).sort((a:any,b:any)=>a.score-b.score||String(a.company_name).localeCompare(String(b.company_name))).slice(0,8);
}
async function allowedCustomerById(service:any,companyId:string,user:any,id:string){
  if(!user||!id||String(user.view_customers||'none')==='none')return null;
  let q=service.from('ks_customers').select('id,company_name,assigned_user_email,status').eq('company_id',companyId).eq('id',id).eq('status','active');
  if(String(user.view_customers)!=='all')q=q.ilike('assigned_user_email',String(user.email||''));
  const r=await q.maybeSingle();return r.error?null:r.data;
}
// V4.18.03 Guided KeyBot Customer access follows the linked user's Role permission.
// view_customers=all/full -> all active Customers.
// view_customers=own/self/assigned -> only Customers assigned to that user.
// view_customers=none -> no Customer access.
// No role name receives a hard-coded bypass when a saved Role permission exists.
async function findGuidedCustomers(service:any,companyId:string,user:any,query:string){
  const email=String(user?.email||'').trim().toLowerCase(),scope=normalizeCustomerScope(user?.view_customers);if(!email||scope==='none')return [];
  let q=service.from('ks_customers').select('id,company_name,assigned_user_email,status').eq('company_id',companyId).eq('status','active');
  if(scope!=='all')q=q.ilike('assigned_user_email',email);
  const r=await q.limit(300);
  if(r.error){console.error('[KeySuite V4.18.03] Guided customer search failed',r.error);return []}
  return (r.data||[]).map((x:any)=>({...x,score:customerMatchScore(x.company_name,query)})).filter((x:any)=>x.score<9999).sort((a:any,b:any)=>a.score-b.score||String(a.company_name).localeCompare(String(b.company_name))).slice(0,8);
}
async function guidedAllowedCustomerById(service:any,companyId:string,user:any,id:string){
  const email=String(user?.email||'').trim().toLowerCase(),scope=normalizeCustomerScope(user?.view_customers);if(!email||!id||scope==='none')return null;
  let q=service.from('ks_customers').select('id,company_name,assigned_user_email,status').eq('company_id',companyId).eq('id',id).eq('status','active');
  if(scope!=='all')q=q.ilike('assigned_user_email',email);
  const r=await q.maybeSingle();return r.error?null:r.data;
}
async function guidedAvailableProducts(service:any,user:any,customerId:string){
  const email=String(user?.email||'').trim().toLowerCase();if(!email||!customerId)return [];
  const r=await service.rpc('keysuite_v41802_keybot_available_products',{p_user_email:email,p_customer_id:String(customerId)});
  if(r.error)throw new Error(`Assigned Product list could not be loaded: ${r.error.message||r.error}`);
  const row=(Array.isArray(r.data)?r.data[0]:r.data)||{};if(row.allowed!==true)return [];
  return Array.isArray(row.products)?row.products:[];
}

function guidedProductPermissionScope(value:any){
  const v=String(value||'').trim().toLowerCase();
  if(v==='full'||v==='all')return 'all';
  if(v==='assigned'||v==='own'||v==='self'||v==='restricted')return 'assigned';
  return 'none';
}
function guidedProductGroupMeta(groupValue:any){
  let group=String(groupValue||'').trim().toUpperCase().replace(/\s+/g,'_');
  if(group==='CHC')group='CHC_G2';
  const roleFamily=group==='CHC_G1'||group==='CHC_G2'?'CHC':group==='GWS'?'TANK':group;
  const productLabel=group==='CHC_G1'?'CHC C4':group==='CHC_G2'?'CHC C6':group==='BFI'?'BFI':group==='ES'?'End Suction':group==='MOTOR'?'Motor':group==='BASEPLATE'?'Baseplate':group==='COUPLING'?'Coupling':group==='KEYPLC'?'KeyPLC Panel':group==='MANIFOLD'?'Manifold':group==='GWS'?'GWS Tank':group;
  const productType=group==='CHC_G1'||group==='CHC_G2'||group==='BFI'||group==='ES'?'pump':group==='MOTOR'?'motor':group==='GWS'?'tank':group==='KEYPLC'?'keyplc_panel':group==='MANIFOLD'?'manifold':group==='BASEPLATE'?'baseplate':group==='COUPLING'?'coupling':group.toLowerCase();
  return {group,roleFamily,productLabel,productType,hasCurve:group==='CHC_G1'||group==='CHC_G2'||group==='BFI'||group==='ES'};
}
function guidedSelectorFamily(groupValue:any){const group=String(groupValue||'').trim().toUpperCase();return group==='CHC_G1'?'CHC_G1':group==='CHC_G2'?'CHC_G2':group==='BFI'?'BFI':group==='ES'?'ES':group==='CHC'?'CHC_G2':group}
async function guidedUserAvailableProducts(service:any,companyId:string,user:any){
  const email=String(user?.email||'').trim().toLowerCase(),role=String(user?.role||'user').trim().toLowerCase();if(!email||!companyId)return [];
  let permission=role==='owner'?'full':'assigned';
  try{
    const pr=await service.from('ks_role_permissions').select('permissions').eq('company_id',companyId).ilike('role',role).maybeSingle();
    if(!pr.error&&pr.data?.permissions&&Object.prototype.hasOwnProperty.call(pr.data.permissions,'use_product'))permission=String(pr.data.permissions.use_product||'none');
  }catch(_){}
  const permissionScope=guidedProductPermissionScope(permission);if(permissionScope==='none')return [];
  // Product permission grants access to the module. Brand / Series visibility
  // still follows Role Brand Assigned for every non-Owner user, matching KeySuite.
  const scope=role==='owner'?'all':'assigned';
  const assignedKeys=new Set<string>();
  if(scope==='assigned'){
    const sr=await service.from('ks_user_selection_scope_v41706').select('selection_scope').eq('company_id',companyId).ilike('email',email).maybeSingle();
    const raw=sr.data?.selection_scope?.keys;for(const k of Array.isArray(raw)?raw:[])assignedKeys.add(String(k||'').trim());
  }
  const [br,sr,mr]=await Promise.all([
    service.from('ks_oem_brands').select('id,brand_name,brand_key,brand_type,logo_data,active').eq('company_id',companyId).eq('active',true).limit(1000),
    service.from('ks_oem_brand_series').select('brand_id,product_group,brand_series,active').eq('company_id',companyId).eq('active',true).limit(3000),
    service.from('ks_oem_brand_family_map').select('brand_id,master_family,active').eq('company_id',companyId).eq('active',true).limit(3000)
  ]);
  const brandNames=new Map<string,string>(),brandLogos=new Map<string,string>(),masterBrandIds=new Set<string>();
  for(const b of br.data||[]){
    const bid=String(b.id),brandKey=String(b.brand_key||'').trim().toLowerCase(),brandName=String(b.brand_name||'').trim().toLowerCase(),brandType=String(b.brand_type||'').trim().toLowerCase();
    brandNames.set(bid,String(b.brand_name||b.brand_key||b.id));
    brandLogos.set(bid,String(b.logo_data||'').trim());
    if(brandType==='master'||brandKey==='b.g.reich'||brandName==='b.g.reich')masterBrandIds.add(bid);
  }
  // V4.18.09: Telegram CHC-family labels follow each Brand's configured
  // Brand Series instead of exposing internal CHC G1 / CHC G2 names.
  const brandSeriesByKey=new Map<string,string>();
  for(const r of sr.data||[]){
    const bid=String(r.brand_id||'').trim(),meta=guidedProductGroupMeta(r.product_group),series=String(r.brand_series||'').trim();
    if(bid&&series)brandSeriesByKey.set(`${bid}|${meta.group}`,series);
  }
  const allowedGroups=new Set(['CHC_G1','CHC_G2','BFI','ES','MOTOR','BASEPLATE','COUPLING','KEYPLC','MANIFOLD','GWS']);
  const candidates=new Map<string,any>();
  const add=(brandId:any,groupValue:any,brandName:any='',brandSeriesValue:any='')=>{
    const meta=guidedProductGroupMeta(groupValue);if(!allowedGroups.has(meta.group))return;
    const bid=String(brandId||'').trim();if(!bid)return;
    if(scope==='assigned'){
      const brandAll=assignedKeys.has(`${bid}|*`),groupKey=assignedKeys.has(`${bid}|${meta.group}`),familyKey=assignedKeys.has(`${bid}|${meta.roleFamily}`);
      // V4.26.05: CHC C4 and C6 are independently assignable. Honour exact
      // CHC_G1 / CHC_G2 keys when they exist; only use the old brand|CHC key
      // as a backward-compatible fallback when no generation-specific CHC key
      // has been saved for this Brand.
      const hasSpecificChc=assignedKeys.has(`${bid}|CHC_G1`)||assignedKeys.has(`${bid}|CHC_G2`);
      const allowed=brandAll||groupKey||(['CHC_G1','CHC_G2'].includes(meta.group)?(!hasSpecificChc&&familyKey):familyKey);
      if(!allowed)return;
    }
    const name=String(brandName||brandNames.get(bid)||bid).trim();
    const storedBrandSeries=String(brandSeriesValue||brandSeriesByKey.get(`${bid}|${meta.group}`)||'').trim();
    const masterChcSeries=masterBrandIds.has(bid)&&meta.group==='CHC_G1'?'CHC C4':masterBrandIds.has(bid)&&meta.group==='CHC_G2'?'CHC C6':'';
    const brandSeries=masterChcSeries||storedBrandSeries;
    // User-facing B.G.Reich generation labels are always C4/C6. Other brands
    // keep their configured selling Brand Series (for example VMS C4 / VMS C6).
    const productLabel=(meta.group==='CHC_G1'||meta.group==='CHC_G2')&&brandSeries?brandSeries:meta.productLabel;
    const key=`${bid}|${meta.group}`;if(candidates.has(key))return;
    candidates.set(key,{key,brand_id:bid,brand_name:name,brand_logo:String(brandLogos.get(bid)||'').trim(),price_group:meta.group,role_family:meta.roleFamily,product_label:productLabel,brand_series:brandSeries,has_curve:meta.hasCurve,product_type:meta.productType});
  };
  for(const r of sr.data||[])add(r.brand_id,r.product_group,'',r.brand_series);
  for(const r of mr.data||[])add(r.brand_id,r.master_family);
  // V4.21.02: the B.G.Reich master CHC assignment represents two independent
  // hydraulic generations. Generic CHC rows historically resolve to C6/G2, so
  // explicitly expose C4/G1 as well, subject to the same role/customer gates.
  for(const bid of masterBrandIds){add(bid,'CHC_G1');add(bid,'CHC_G2');add(bid,'BFI');}
  // House products exist even though they are not OEM selling-brand rows.
  for(const g of ['BASEPLATE','COUPLING','KEYPLC','MANIFOLD'])add('KEYLARGO',g,'Keylargo');
  add('GWS','GWS','GWS');
  return [...candidates.values()].sort((a:any,b:any)=>guidedNaturalCompare(`${a.brand_name} ${a.product_label}`,`${b.brand_name} ${b.product_label}`));
}
async function guidedProductsForContext(service:any,companyId:string,user:any,customerId:any){
  const cid=String(customerId||'').trim(),userProducts=await guidedUserAvailableProducts(service,companyId,user);
  if(!cid)return userProducts;
  const pr=await service.from('ks_customer_brand_price_preference_v41710').select('selection').eq('company_id',companyId).eq('customer_id',cid).maybeSingle();
  if(pr.error)throw new Error(`Customer Product Price Preference could not be loaded: ${pr.error.message||pr.error}`);
  const keys=new Set<string>((Array.isArray(pr.data?.selection?.price_keys)?pr.data.selection.price_keys:[]).map((x:any)=>String(x||'').trim()));
  return userProducts.filter((x:any)=>keys.has(`${String(x.brand_id)}|${String(x.price_group).toUpperCase()}`));
}
function guidedProductButtonLabel(product:any){return `${String(product?.brand_name||'').trim()} · ${String(product?.product_label||product?.price_group||'Product').trim()}`.slice(0,60)}
function guidedNaturalCompare(a:any,b:any){return String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'})}
function guidedUnique(values:any[]){const out:any[]=[];const seen=new Set<string>();for(const raw of values||[]){const value=String(raw??'').trim();if(!value)continue;const key=value.toLowerCase();if(seen.has(key))continue;seen.add(key);out.push(value)}return out}
function guidedKeyboardForChoices(choices:any[],includeBack=true){const rows:any[]=[];for(let i=0;i<choices.length;i+=2)rows.push(choices.slice(i,i+2).map((x:any)=>String(x.label||x.value||'').slice(0,60)));if(includeBack)rows.push(['⬅️ Back','🔄 New Request']);else rows.push(['🔄 New Request']);return telegramReplyKeyboard(rows)}
function guidedInputNavMenu(){return telegramReplyKeyboard([['⬅️ Back','🔄 New Request']])}
function freshResumeMenu(){return telegramReplyKeyboard([['🆕 New Request','↩️ Last Menu']])}
async function guidedProductPresentation(service:any,companyId:string,product:any){
  const group=String(product?.price_group||'').toUpperCase(),brandId=String(product?.brand_id||'').trim();let brandSeries='',sellingSeries='',masterSeries='';
  if(!brandId)return {brandSeries,sellingSeries,masterSeries};
  try{
    let sr=await service.from('ks_oem_brand_series').select('brand_series,product_group,active').eq('company_id',companyId).eq('brand_id',brandId).eq('active',true).eq('product_group',group).maybeSingle();
    if((sr.error||!sr.data)&&['CHC_G1','CHC_G2'].includes(group))sr=await service.from('ks_oem_brand_series').select('brand_series,product_group,active').eq('company_id',companyId).eq('brand_id',brandId).eq('active',true).eq('product_group','CHC').maybeSingle();
    if(sr.data)brandSeries=String(sr.data.brand_series||'').trim();
  }catch(_){ }
  try{
    let mr=await service.from('ks_oem_brand_family_map').select('master_family,master_series,selling_series,active').eq('company_id',companyId).eq('brand_id',brandId).eq('active',true).eq('master_family',group);
    let rows=mr.data||[];
    if((mr.error||!rows.length)&&['CHC_G1','CHC_G2'].includes(group)){mr=await service.from('ks_oem_brand_family_map').select('master_family,master_series,selling_series,active').eq('company_id',companyId).eq('brand_id',brandId).eq('active',true).eq('master_family','CHC');rows=mr.data||[]}
    const preferred=rows.find((x:any)=>/^CHC$/i.test(String(x.master_series||'')))||rows[0];if(preferred){masterSeries=String(preferred.master_series||'').trim();sellingSeries=String(preferred.selling_series||'').trim()}
  }catch(_){ }
  // V4.21.09: never expose legacy G1/G2 naming for the B.G.Reich master brand.
  if(['CHC_G1','CHC_G2'].includes(group)&&String(product?.brand_name||'').trim().toLowerCase()==='b.g.reich')brandSeries=group==='CHC_G1'?'CHC C4':'CHC C6';
  return {brandSeries,sellingSeries,masterSeries};
}
function guidedAliasModel(model:any,presentation:any,group:any){let value=String(model||'').trim(),selling=String(presentation?.sellingSeries||'').trim();if(!selling)return value;const g=String(group||'').toUpperCase();if(g==='CHC_G1'||g==='CHC_G2')value=value.replace(/^(?:CHCS|CHCN|CHC)\b/i,selling);else if(g==='BFI')value=value.replace(/^BFI\b/i,selling);else if(g==='ES')value=value.replace(/^ES\b/i,selling);return value}
async function guidedCurveDisplayIdentity(service:any,companyId:string,product:any,masterModel:any='',explicitDisplayModel:any=''){
  const group=String(product?.price_group||'').toUpperCase();
  const presentation=await guidedProductPresentation(service,companyId,product);
  const brand=String(product?.brand_name||'B.G.Reich').trim()||'B.G.Reich';
  const series=String(presentation?.brandSeries||product?.brand_series||product?.product_label||(group==='ES'?'ES':group==='BFI'?'BFI':'CHC')).trim()||(group==='ES'?'ES':group==='BFI'?'BFI':'CHC');
  const master=String(masterModel||'').trim();
  const model=String(explicitDisplayModel||'').trim()||(master?guidedAliasModel(master,presentation,group):'');
  let logo=String(product?.brand_logo||'').trim();
  const brandId=String(product?.brand_id||'').trim();
  // V4.18.11: customer-facing curve branding must follow the selected selling
  // Brand, including its saved Brand Logo. Old in-flight sessions may not yet
  // contain brand_logo, so resolve it directly from ks_oem_brands as fallback.
  if(!logo&&brandId&&brandId!=='KEYLARGO'&&brandId!=='GWS'){
    try{
      const br=await service.from('ks_oem_brands').select('logo_data').eq('company_id',companyId).eq('id',brandId).maybeSingle();
      if(!br.error&&br.data?.logo_data)logo=String(br.data.logo_data||'').trim();
    }catch(_){}
  }
  return {brand,series,model,logo};
}
function guidedChcSeries(model:any){const m=String(model||'').match(/^(?:CHCS|CHCN|CHC)\s+(\d+)/i);return m?`CHC ${m[1]}`:''}
function guidedEsSeries(model:any){const m=String(model||'').replace(/^ES\s+/i,'').match(/^(\d+)\s*-/);return m?`ES ${m[1]}`:'ES'}
async function guidedCatalogRows(service:any,product:any){
  const group=String(product?.price_group||'').toUpperCase();let q:any=null;
  if(group==='CHC_G2')q=service.from('ks_products_chc').select('*').order('source_row').limit(3000);
  else if(group==='CHC_G1')q=service.from('ks_products_chc_g1').select('*').order('source_row').limit(3000);
  else if(group==='BFI')q=service.from('ks_products_bfi').select('*').eq('status','active').order('source_row').limit(3000);
  else if(group==='ES')q=service.from('ks_products_es').select('*').order('source_row').limit(3000);
  else if(group==='GWS')q=service.from('ks_products_gws').select('*').eq('status','active').order('source_row').limit(3000);
  else if(group==='MOTOR')q=service.from('ks_products_motor').select('*').eq('active',true).order('efficiency_class').order('hp').order('pole').limit(3000);
  else if(group==='COUPLING')q=service.from('ks_products_coupling').select('*').eq('active',true).order('component_type').order('source_row').limit(3000);
  else if(group==='KEYPLC')q=service.from('ks_products_keyplc').select('*').eq('status','active').order('source_row').limit(3000);
  else if(group==='MANIFOLD')q=service.from('ks_products_manifold').select('*').eq('status','active').order('section').order('source_row').limit(3000);
  if(!q)return [];
  const r=await q;if(r.error)throw new Error(`${product?.product_label||group} catalogue could not be loaded: ${r.error.message||r.error}`);return r.data||[];
}
function guidedVariantPumpQtys(value:any){const arr=Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);return guidedUnique(arr.map((v:any)=>String(Math.max(0,Number(v?.pumpQty??v?.pump_qty??(String(v?.label||'').match(/\d+/)?.[0]||0))))).filter((x:any)=>Number(x)>0)).sort(guidedNaturalCompare)}
async function guidedCatalogLevel(service:any,companyId:string,product:any,path:any[]=[]){
  const group=String(product?.price_group||'').toUpperCase(),presentation=await guidedProductPresentation(service,companyId,product),rows=await guidedCatalogRows(service,product),p=Array.isArray(path)?path:[];
  const choice=(kind:string,value:any,label:any,meta:any={})=>({kind,value:String(value),label:String(label).slice(0,60),meta});
  if(['CHC_G1','CHC_G2'].includes(group)){
    const configuredBrandSeries=String(presentation.brandSeries||product?.brand_series||'').trim();
    // V4.18.09 promotes CHC Brand Series into the Product menu itself.
    // Do not ask the same Series again after the user has already pressed it.
    const brandSeriesAlreadySelected=!!configuredBrandSeries&&cleanSearch(product?.product_label)===cleanSearch(configuredBrandSeries);
    if(p.length===0&&configuredBrandSeries&&!brandSeriesAlreadySelected)return {title:'Choose Series:',choices:[choice('brand_series',configuredBrandSeries,configuredBrandSeries)]};
    const offset=configuredBrandSeries&&!brandSeriesAlreadySelected?1:0;let filtered=rows;
    if(p.length===offset){const vals=guidedUnique(filtered.map((r:any)=>String(r.series||guidedChcSeries(r.model)||''))).sort(guidedNaturalCompare);return {title:'Choose Pump Series:',choices:vals.map(v=>choice('series',v,guidedAliasModel(v,presentation,group)))};}
    const series=String(p[offset]?.value||'');filtered=filtered.filter((r:any)=>String(r.series||guidedChcSeries(r.model)||'').toLowerCase()===series.toLowerCase());
    const models=filtered.map((r:any)=>choice('model',String(r.id||r.model),guidedAliasModel(r.model,presentation,group),{id:String(r.id||''),master_model:String(r.model||''),display_model:guidedAliasModel(r.model,presentation,group)})).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));return {title:`${guidedAliasModel(series,presentation,group)} — choose exact Model:`,choices:models,exact:true};
  }
  if(group==='BFI'){
    const configuredBrandSeries=String(presentation.brandSeries||product?.brand_series||'BFI').trim()||'BFI';
    if(p.length===0&&configuredBrandSeries&&cleanSearch(product?.product_label)!==cleanSearch(configuredBrandSeries))return {title:'Choose Series:',choices:[choice('brand_series',configuredBrandSeries,configuredBrandSeries)]};
    const offset=p.length&&p[0]?.kind==='brand_series'?1:0;
    if(p.length===offset){const vals=guidedUnique(rows.map((r:any)=>{const m=String(r.model||'').match(/^BFI\s+(\d+)/i);return m?`BFI ${m[1]}`:'BFI'})).sort(guidedNaturalCompare);return {title:'Choose Pump Series:',choices:vals.map(v=>choice('series',v,guidedAliasModel(v,presentation,group)))};}
    const series=String(p[offset]?.value||''),family=(series.match(/(\d+)/)||[])[1]||'';const filtered=rows.filter((r:any)=>String(r.model||'').toUpperCase().startsWith(`BFI ${family}-`.toUpperCase()));
    const models=filtered.map((r:any)=>choice('model',String(r.id||r.model),guidedAliasModel(r.model,presentation,group),{id:String(r.id||''),master_model:String(r.model||''),display_model:guidedAliasModel(r.model,presentation,group)})).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));return {title:`${guidedAliasModel(series,presentation,group)} — choose exact Model:`,choices:models,exact:true};
  }
  if(group==='ES'){
    // V4.21.15: the guided ES hierarchy must come from the hydraulic ES database,
    // not the ES price table. The price table does not reliably carry pole/rpm,
    // which previously produced a blank "Choose Pole" keyboard.
    // End Suction -> Brand Series (ES) -> 2P/4P -> ES Series -> exact ES Model.
    const esBrandSeries=String(presentation.brandSeries||product?.brand_series||'ES').trim()||'ES';
    if(p.length===0)return {title:'Choose Series:',choices:[choice('brand_series',esBrandSeries,esBrandSeries)]};
    const hydraulicRows:any[]=Array.isArray((globalThis as any).ES_SELECTOR_DB?.pumps)?(globalThis as any).ES_SELECTOR_DB.pumps:rows;
    const rowPole=(r:any)=>Number(r.pole||0)||(Number(r.rpm||0)>=2000?2:Number(r.rpm||0)>0?4:0);
    if(p.length===1){
      const actualPoles=[...new Set(hydraulicRows.map((r:any)=>rowPole(r)).filter((x:any)=>x===2||x===4))].sort();
      const poles=actualPoles.length?actualPoles:[2,4];
      return {title:'Choose Pole:',choices:poles.map((pole:number)=>choice('pole',`${pole}P`,`${pole}P`,{pole}))};
    }
    const pole=Number(p[1]?.meta?.pole||String(p[1]?.value||'').match(/\d+/)?.[0]||0);
    let filtered=hydraulicRows.filter((r:any)=>!pole||rowPole(r)===pole);
    if(p.length===2){
      const vals=guidedUnique(filtered.map((r:any)=>guidedEsSeries(r.model))).sort(guidedNaturalCompare);
      return {title:`${pole?`${pole}P — `:''}Choose ES Series:`,choices:vals.map(v=>choice('es_series',v,guidedAliasModel(v,presentation,group),{pole}))};
    }
    const series=String(p[2]?.value||'');
    filtered=filtered.filter((r:any)=>guidedEsSeries(r.model).toLowerCase()===series.toLowerCase());
    const models=filtered.map((r:any)=>{const actualPole=rowPole(r)||pole,master=`ES ${String(r.model||'').replace(/^ES\s+/i,'')}`,base=guidedAliasModel(master,presentation,group);return choice('model',String(r.id||`${master}-${actualPole}P`),base,{id:String(r.id||''),master_model:master,display_model:base,pole:actualPole,rpm:Number(r.rpm||0)})}).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));
    return {title:`${guidedAliasModel(series,presentation,group)} — choose exact ES Model:`,choices:models,exact:true};
  }
  if(group==='GWS'){
    if(p.length===0){const vals=guidedUnique(rows.map((r:any)=>r.series_name||r.series_code||'GWS Tank')).sort(guidedNaturalCompare);return {title:'Choose GWS Series:',choices:vals.map(v=>choice('series',v,v))};}
    const series=String(p[0]?.value||'');let filtered=rows.filter((r:any)=>String(r.series_name||r.series_code||'GWS Tank').toLowerCase()===series.toLowerCase());
    if(p.length===1){const vals=guidedUnique(filtered.map((r:any)=>Number(r.pressure_bar||0)>0?`${inputNumber(r.pressure_bar)} bar`:'Standard')).sort(guidedNaturalCompare);return {title:`${series} — choose Pressure Rating:`,choices:vals.map(v=>choice('pressure',v,v))};}
    const pressure=String(p[1]?.value||'');filtered=filtered.filter((r:any)=>(Number(r.pressure_bar||0)>0?`${inputNumber(r.pressure_bar)} bar`:'Standard').toLowerCase()===pressure.toLowerCase());const models=filtered.map((r:any)=>choice('model',String(r.id),gwsChoiceLabel(r),{id:String(r.id),master_model:String(r.model||''),display_model:String(r.model||'')})).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));return {title:`${series} · ${pressure} — choose exact Model:`,choices:models,exact:true};
  }
  if(group==='MOTOR'){
    if(p.length===0){const vals=guidedUnique(rows.map((r:any)=>r.efficiency_class||'IE3')).sort(guidedNaturalCompare);return {title:'Choose Motor Efficiency:',choices:vals.map(v=>choice('efficiency',v,v))};}
    let filtered=rows.filter((r:any)=>String(r.efficiency_class||'IE3').toLowerCase()===String(p[0].value).toLowerCase());
    if(p.length===1){const vals=guidedUnique(filtered.map((r:any)=>`${Number(r.pole||2)} Pole`)).sort(guidedNaturalCompare);return {title:`${p[0].label} — choose Pole:`,choices:vals.map(v=>choice('pole',v,v))};}
    filtered=filtered.filter((r:any)=>`${Number(r.pole||2)} Pole`.toLowerCase()===String(p[1].value).toLowerCase());
    if(p.length===2){const vals=guidedUnique(filtered.map((r:any)=>`${inputNumber(r.hp)} HP`)).sort(guidedNaturalCompare);return {title:'Choose Motor Rating:',choices:vals.map(v=>choice('hp',v,v))};}
    filtered=filtered.filter((r:any)=>`${inputNumber(r.hp)} HP`.toLowerCase()===String(p[2].value).toLowerCase());const models=filtered.map((r:any)=>choice('model',String(r.id),String(r.model||`${p[2].value} Motor`),{id:String(r.id),master_model:String(r.model||''),display_model:String(r.model||'')})).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));return {title:'Choose exact Motor Model:',choices:models,exact:true};
  }
  if(group==='COUPLING'){
    if(p.length===0){const vals=guidedUnique(rows.map((r:any)=>String(r.component_type||'Coupling').replace(/_/g,' '))).sort(guidedNaturalCompare);return {title:'Choose Coupling Type:',choices:vals.map(v=>choice('type',v,v))};}
    const type=String(p[0]?.value||'');const models=rows.filter((r:any)=>String(r.component_type||'Coupling').replace(/_/g,' ').toLowerCase()===type.toLowerCase()).map((r:any)=>choice('model',String(r.id),String(r.model||'Coupling'),{id:String(r.id),master_model:String(r.model||''),display_model:String(r.model||'')})).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));return {title:`${type} — choose exact Model:`,choices:models,exact:true};
  }
  if(group==='KEYPLC'){
    if(p.length===0){const vals=guidedUnique(rows.map((r:any)=>`${inputNumber(r.motor_kw||String(r.model||'').replace(/[^0-9.]/g,''))} kW`)).sort(guidedNaturalCompare);return {title:'Choose KeyPLC Motor Rating:',choices:vals.map(v=>choice('kw',v,v))};}
    let filtered=rows.filter((r:any)=>`${inputNumber(r.motor_kw||String(r.model||'').replace(/[^0-9.]/g,''))} kW`.toLowerCase()===String(p[0].value).toLowerCase());
    if(p.length===1){const models=filtered.map((r:any)=>choice('panel_model',String(r.id),String(r.model||'KeyPLC Panel'),{id:String(r.id),master_model:String(r.model||''),display_model:String(r.model||''),motor_kw:Number(r.motor_kw||0),variants:r.variants})).sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));return {title:`${p[0].label} — choose Panel Model:`,choices:models};}
    const selected=filtered.find((r:any)=>String(r.id)===String(p[1]?.value))||filtered[0];const qtys=guidedVariantPumpQtys(selected?.variants);const values=qtys.length?qtys:['1','2','3','4','5','6'];return {title:`${String(selected?.model||'KeyPLC Panel')} — choose Number of Pumps:`,choices:values.map(v=>choice('pump_qty',v,`${v} ${Number(v)===1?'Pump':'Pumps'}`,{id:String(selected?.id||''),master_model:String(selected?.model||''),display_model:String(selected?.model||''),motor_kw:Number(selected?.motor_kw||0),pump_qty:Number(v)})),exact:true};
  }
  if(group==='MANIFOLD'){
    const sizing=rows.filter((r:any)=>String(r.section||'').toLowerCase()==='sizing');if(p.length===0){const vals=guidedUnique(sizing.map((r:any)=>String(r.model||''))).sort(guidedNaturalCompare);return {title:'Choose Pump Connection:',choices:vals.map(v=>choice('pump_dn',v,v))};}
    if(p.length===1)return {title:`${p[0].label} — choose Number of Pumps:`,choices:['1','2','3','4','5','6'].map(v=>choice('pump_qty',v,`${v} ${v==='1'?'Pump':'Pumps'}`))};
    if(p.length===2)return {title:'Choose Design Pressure Class:',choices:[choice('pressure_bar','7','Below 8 bar'),choice('pressure_bar','12','8–16 bar'),choice('pressure_bar','20','16–25 bar')]};
    const pumpDn=String(p[0].value),pumpQty=Number(p[1].value),bar=Number(p[2].value);const dn=Number((pumpDn.match(/\d+/)||[])[0]||0),preview=await manifoldSystemComponent(service,'','',{connection_dn:dn,shutoff_head_m:bar/.0981},pumpQty,{});return {title:'Exact Manifold:',choices:[choice('model',preview.model||'Manifold',preview.model||'Manifold',{master_model:preview.model||'Manifold',display_model:preview.model||'Manifold',pump_dn:dn,pump_qty:pumpQty,pressure_bar:bar})],exact:true};
  }
  return {title:'Enter model/details for this Product:',choices:[],manual:true};
}
function guidedAutoChoice(choice:any){return {...choice,meta:{...(choice?.meta||{}),guided_auto_skipped:true}}}
function guidedCatalogExactChoice(choice:any){return {...(choice?.meta||{}),id:String(choice?.meta?.id||choice?.value||''),master_model:String(choice?.meta?.master_model||choice?.label||choice?.value||''),display_model:String(choice?.meta?.display_model||choice?.label||choice?.value||''),guided_auto_skipped:!!choice?.meta?.guided_auto_skipped,guided_configuration_label:String(choice?.kind||'')==='pump_qty'?String(choice?.label||''):''}}
async function guidedResolveCatalogLevel(service:any,companyId:string,product:any,startPath:any[]=[]){
  let path=Array.isArray(startPath)?startPath.slice():[];
  for(let guard=0;guard<16;guard++){
    const level=await guidedCatalogLevel(service,companyId,product,path),choices=Array.isArray(level?.choices)?level.choices:[];
    if(level?.manual||choices.length!==1)return {level,path,exactChoice:null};
    const selected=guidedAutoChoice(choices[0]);path.push(selected);
    if(level?.exact)return {level,path,exactChoice:selected};
  }
  throw new Error('Product catalogue has too many automatic levels.');
}
function guidedPreviousVisibleCatalogPath(value:any){
  const path=Array.isArray(value)?value.slice():[];let removedVisible=false;
  while(path.length&&path[path.length-1]?.meta?.guided_auto_skipped)path.pop();
  if(path.length){path.pop();removedVisible=true}
  return {path,removedVisible};
}
function guidedExactActionText(customer:any,product:any,exact:any){
  return `${customer?`Customer: ${customer.company_name}\n`:''}Product: ${guidedProductButtonLabel(product)}\nModel: ${exact.display_model||exact.master_model}${exact.guided_configuration_label?`\nConfiguration: ${exact.guided_configuration_label}`:''}\n\nChoose action:`;
}
async function guidedSaveExactCatalogChoice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,product:any,path:any[],selected:any,context:any){
  const exact=guidedCatalogExactChoice(selected),group=String(product?.price_group||'').toUpperCase();
  if(group==='BFI'){
    const requestedEnhanced=/E$/i.test(String(exact.master_model||exact.display_model||'')),base=bfiBaseModelName(exact.master_model),phases=bfiAvailablePhases(base);
    if(phases.length===1){
      const phase=phases[0],enhanced=phase==='3Ph'&&requestedEnhanced,finalExact={...exact,master_model:bfiPhaseModelName(base,phase,enhanced),display_model:bfiPhaseModelName(exact.display_model||base,phase,enhanced),motor_phase:phase,bfi_phase_confirmed:true,bfi_requested_enhanced:enhanced,enhanced,enhanced_curve:enhanced};
      const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',selected_customer_id:String(customer?.id||'')||null,context:{...context,guided_product:product,guided_catalog_path:path,guided_catalog_choices:null,guided_exact_model:finalExact}});
      await telegramSend(telegramToken,chatId,guidedExactActionText(customer,product,finalExact),guidedExactActionMenu(product.has_curve===true,false));
      return saved||session;
    }
    const pendingExact={...exact,master_model:base,display_model:bfiBaseModelName(exact.display_model||exact.master_model),bfi_requested_enhanced:requestedEnhanced,bfi_phase_confirmed:false};
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_bfi_waiting_phase',selected_customer_id:String(customer?.id||'')||null,context:{...context,guided_product:product,guided_catalog_path:path,guided_catalog_choices:null,guided_exact_model:pendingExact}});
    await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n`:''}Product: ${guidedProductButtonLabel(product)}\nModel: ${pendingExact.display_model||pendingExact.master_model}\n\nChoose Motor Phase:`,bfiPhaseMenu(pendingExact.master_model));
    return saved||session;
  }
  const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',selected_customer_id:String(customer?.id||'')||null,context:{...context,guided_product:product,guided_catalog_path:path,guided_catalog_choices:null,guided_exact_model:exact}});
  await telegramSend(telegramToken,chatId,guidedExactActionText(customer,product,exact),guidedExactActionMenu(product.has_curve===true,group==='ES'));
  return saved||session;
}
async function guidedStartCatalog(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,product:any){
  const customerId=String(customer?.id||''),customerName=String(customer?.company_name||''),header=customerName?`Customer: ${customerName}\nProduct: ${guidedProductButtonLabel(product)}`:`Product: ${guidedProductButtonLabel(product)}`;
  const group=String(product?.price_group||'').toUpperCase();if(group==='BASEPLATE'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_baseplate_channel',selected_customer_id:customerId||null,context:{...sessionContext(session),guided_product:product,guided_catalog_path:[],guided_exact_model:null}});await telegramSend(telegramToken,chatId,`${header}\n\nChoose C-Channel size:`,telegramReplyKeyboard([['1½" x 3"','2" x 4"'],['2½" x 5"','3" x 6"'],['3½" x 7"','3½" x 8"'],['⬅️ Back','🔄 New Request']]));return saved}
  const resolved=await guidedResolveCatalogLevel(service,companyId,product,[]),level=resolved.level,path=resolved.path;if(level.manual){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_no_curve_price_input',selected_customer_id:customerId||null,context:{...sessionContext(session),guided_product:product,guided_catalog_path:path}});await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(product),guidedInputNavMenu());return saved}
  if(resolved.exactChoice)return await guidedSaveExactCatalogChoice(service,telegramToken,companyId,chatId,senderId,session,customer,product,path,resolved.exactChoice,sessionContext(session));
  const choices=level.choices||[],saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:customerId||null,context:{...sessionContext(session),guided_product:product,guided_catalog_path:path,guided_catalog_choices:choices,guided_exact_model:null}});await telegramSend(telegramToken,chatId,`${header}\n\n${level.title}`,guidedKeyboardForChoices(choices));return saved;
}
function guidedExactActionMenu(hasCurve:boolean,isEs=false){return hasCurve?(isEs?telegramReplyKeyboard([['📈 Curve','⚙️ Pump Configuration'],['🧩 Assemble','💰 Check Price'],['⬅️ Back','🔄 New Request']]):telegramReplyKeyboard([['📈 Curve','⚙️ Pump Configuration'],['💰 Check Price'],['⬅️ Back','🔄 New Request']])):telegramReplyKeyboard([['💰 Check Price'],['⬅️ Back','🔄 New Request']])}
async function guidedQuoteExact(service:any,customer:any,user:any,product:any,exact:any){
  const group=String(product?.price_group||'').toUpperCase(),id=String(exact?.id||''),master=String(exact?.master_model||'');let item:any=null;
  if(group==='CHC_G2'){item=directPumpInfo(master);if(!item)throw new Error(`Pump model ${master} was not found.`);item=guidedApplyProductIdentity({...item,qty:1},product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));}
  else if(group==='BFI'){item=directBfiModelInfo(master);if(!item)throw new Error(`BFI model ${master} was not found.`);item=guidedApplyProductIdentity({...item,qty:1},product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));}
  else if(group==='CHC_G1')item=await quoteChcG1ForCustomer(service,String(customer.id),String(user.email||''),String(product.brand_id||product.brand_name||'B.G.Reich'),master,1);
  else if(group==='ES'){item=guidedApplyProductIdentity({family:'ES',brand:product.brand_name,series:'ES',model:master,qty:1},product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));}
  else if(group==='GWS'){const r=await service.from('ks_products_gws').select('*').eq('id',id).eq('status','active').maybeSingle();if(!r.data)throw new Error('GWS Tank was not found.');item=await quoteGwsForCustomer(service,String(customer.id),r.data,1,String(user.email||''));}
  else if(group==='MOTOR'||group==='COUPLING'){const table=group==='MOTOR'?'ks_products_motor':'ks_products_coupling',r=await service.from(table).select('*').eq('id',id).eq('active',true).maybeSingle();if(!r.data)throw new Error(`${group} model was not found.`);item=await quoteSimpleCatalogRow(service,String(customer.id),String(user.email||''),String(product.brand_name||''),group,r.data,1);}
  else if(group==='KEYPLC'){const panel=await quoteKeyplcPanel(service,String(customer.id),String(user.email||''),Number(exact?.motor_kw||0),Number(exact?.pump_qty||1),Number(exact?.motor_kw||0));if(!panel||panel.price_missing)throw new Error('No matching KeyPLC Panel price is available.');item={family:'KEYPLC',brand:String(product.brand_name||'Keylargo'),series:'KeyPLC Panel',model:String(panel.product?.model||master||'KeyPLC Panel'),qty:1,unit_price:Number(panel.unit_price||0),pricing:panel.pricing};}
  else if(group==='MANIFOLD'){const m=await manifoldSystemComponent(service,String(customer.id),String(user.email||''),{connection_dn:Number(exact?.pump_dn||0),shutoff_head_m:Number(exact?.pressure_bar||0)/.0981},Number(exact?.pump_qty||1),{});if(!m||m.price_missing)throw new Error(m?.warning||'Manifold price is unavailable.');item={family:'MANIFOLD',brand:String(product.brand_name||'Keylargo'),series:'Manifold',model:String(m.model||master||'Manifold'),qty:1,unit_price:Number(m.unit_price||0)};}
  else throw new Error('This exact Product is not connected to a price engine yet.');
  if(exact?.display_model)item.display_model=String(exact.display_model);return item;
}

async function guidedFinishExactPrice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,product:any,exact:any){
  const c=sessionContext(session);let item:any;
  if(String(product?.price_group||'').toUpperCase()==='BASEPLATE')item=await quoteGuidedBaseplate(service,String(customer.id),String(user.email||''),exact?.baseplate||c.guided_baseplate||{},1);
  else item=await guidedQuoteExact(service,customer,user,product,exact);
  if(exact?.display_model)item.display_model=exact.display_model;
  const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...c,customer_name:customer.company_name,guided_after_customer:null,pending_item:item,guided_product:product,guided_exact_model:exact}});
  await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));
  return saved||session;
}

async function guidedFinishSelectionPrice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any){
  const c=sessionContext(session),product=c.guided_product,item=c.pending_item;if(!product||!item)throw new Error('The selected Product is no longer available.');
  const priced=await quotePumpForCustomer(service,String(customer.id),guidedApplyProductIdentity(item,product),String(user.email||''));if(String(item?.family||product?.price_group||'').toUpperCase()==='ES'&&String(c.guided_es_price_supply||'')==='bare')priced.supply_scope='Bare Pump';
  const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',flow_m3h:Number(session.flow_m3h||priced.requested_flow_m3h||0),head_m:Number(session.head_m||priced.requested_head_m||0),selected_customer_id:String(customer.id),context:{...c,customer_name:customer.company_name,guided_after_customer:null,pending_item:priced,guided_product:product}});
  await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\n${priced.supply_scope?`Supply: ${priced.supply_scope}\n\n`:''}${quotationResultText(priced)}`,guidedPriceResultMenu(true));
  return saved||session;
}

function guidedSelectionSeriesLabel(product:any){return `${String(product?.brand_name||'').trim()} · ${String(product?.brand_series||product?.product_label||product?.price_group||'Series').trim()}`.slice(0,54)}
function guidedSelectionRows(products:any[],selectedKeys:any[]=[]){
  const selected=new Set((Array.isArray(selectedKeys)?selectedKeys:[]).map(x=>String(x))),rows:string[][]=[],brands:any[]=[];
  for(const p of products||[]){const bid=String(p?.brand_id||p?.brand_name||''),name=String(p?.brand_name||'Brand').trim();let b=brands.find(x=>x.id===bid);if(!b){b={id:bid,name,items:[]};brands.push(b)}b.items.push(p)}
  for(const b of brands){const all=b.items.length>0&&b.items.every((p:any)=>selected.has(String(p.key)));rows.push([`${all?'☑':'☐'} ${b.name} · All Series`.slice(0,60)]);for(const p of b.items)rows.push([`${selected.has(String(p.key))?'☑':'☐'} ${guidedSelectionSeriesLabel(p)}`.slice(0,60)])}
  rows.push(['✅ Continue','☑ Select All']);rows.push(['☐ Clear All','⬅️ Back']);rows.push(['🔄 New Request']);return telegramReplyKeyboard(rows);
}
function guidedSelectionToggle(text:any,products:any[]){
  const raw=String(text||'').trim(),clean=raw.replace(/^[☑☐]\s*/,'');
  for(const p of products||[])if(clean===guidedSelectionSeriesLabel(p))return {kind:'series',key:String(p.key)};
  const m=clean.match(/^(.*?)\s*·\s*All Series$/i);if(m){const name=String(m[1]||'').trim(),keys=(products||[]).filter((p:any)=>String(p.brand_name||'').trim()===name).map((p:any)=>String(p.key));if(keys.length)return {kind:'brand',keys}}
  return null;
}
function guidedSelectionPumpLabel(candidate:any){
  const brand=String(candidate?.product?.brand_name||candidate?.brand||'-').trim()||'-',family=String(candidate?.family||'').toUpperCase(),baseModel=String(candidate?.display_model||candidate?.model||'-').trim()||'-';
  let model=baseModel;if(family==='ES'){const pole=Number(candidate?.pole||0);if(pole>0&&!new RegExp(`(?:^|\\s)${pole}P$`,'i').test(model))model=`${model} ${pole}P`;}
  return `${brand} - ${model}`;
}
function guidedSelectionChoiceLabel(candidate:any,index:number){const label=guidedSelectionPumpLabel(candidate);return `${index===0?'Recommended - ':''}${label}`.slice(0,60)}
function guidedSelectionResultText(q:number,h:number,candidates:any[],dutyText:string=''){
  const duty=String(dutyText||'').trim()||`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`;
  if(!candidates.length)return `Duty: ${duty}\n\nNo suitable model was found in the selected Brand / Series.`;
  const lines=[`Duty: ${duty}`,'',`Recommended - ${guidedSelectionPumpLabel(candidates[0])}`];for(const x of candidates.slice(1,6))lines.push(guidedSelectionPumpLabel(x));return lines.join('\n');
}
function guidedSelectionResultKeyboard(candidates:any[],token='legacy'){
  // V4.19.16: model choices intentionally use the normal Telegram reply keyboard.
  // The linked webhook is guaranteed to receive message updates, while callback_query
  // delivery can depend on the webhook allowed_updates configuration. The exact visible
  // label is resolved against the saved sizing candidates before Fast Search runs.
  void token;
  const rows:string[][]=[];
  (candidates||[]).slice(0,6).forEach((x:any,i:number)=>rows.push([guidedSelectionChoiceLabel(x,i)]));
  rows.push(['✏️ Change Duty','☑ Brand / Series']);
  rows.push(['⬅️ Back','🔄 New Request']);
  return telegramReplyKeyboard(rows)
}
function guidedSelectionNewToken(){try{return crypto.randomUUID().replace(/-/g,'').slice(0,10)}catch(_){return Date.now().toString(36).slice(-10)}}
async function guidedSelectSizingCandidate(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,index:number){
  const c=sessionContext(session),rows=Array.isArray(c.guided_selection_candidates)?c.guided_selection_candidates:[],chosen=rows[index];
  if(!chosen){await telegramSend(telegramToken,chatId,'That sizing result is no longer available. Please run Start Sizing again.',guidedInputNavMenu());return session}
  const product=chosen.product,customerId=String(session.selected_customer_id||''),q=Number(session.flow_m3h||chosen.requested_flow_m3h||0),h=Number(session.head_m||chosen.requested_head_m||0),pole=Number(chosen.pole||0),family=guidedSelectorFamily(product?.price_group||chosen.family),forcedModel=String(chosen.model||'').trim(),duty=sessionDutyText(session,chosen),chosenWithDuty={...chosen,duty_text:duty},pendingRequest={...(c.guided_pending_request||{}),flow_m3h:q,head_m:h,pole,force_model:forcedModel,duty_text:duty},saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_product_action',flow_m3h:q,head_m:h,selected_customer_id:customerId||null,context:{...c,guided_product:product,pending_item:chosenWithDuty,guided_pending_request:pendingRequest}});
  // V4.19.16: selecting Recommended or any alternative is a complete selection action.
  // Keep the exact stored candidate, do not ask Flow/Head again, and generate its curve now.
  let curveError='';
  try{
    if(q>0&&h>0&&forcedModel){const curveIdentity:any=await guidedCurveDisplayIdentity(service,companyId,product,forcedModel,String(chosen.display_model||''));curveIdentity.material=pumpOptions(chosen.options,chosen.qty).material;const pdf=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),family==='ES'?pole:0,forcedModel,curveIdentity);await telegramSendDocument(telegramToken,chatId,pdf.bytes,pdf.filename,`Selected - ${guidedSelectionPumpLabel(chosenWithDuty)}
${duty}
Curve: ${pdf.model}`)}
  }catch(error){curveError=error instanceof Error?error.message:String(error);console.error('[KeySuite V4.19.16] Auto curve from sizing result failed',error)}
  await telegramSend(telegramToken,chatId,`Selected - ${guidedSelectionPumpLabel(chosen)}

${quotationResultText(chosenWithDuty)}${curveError?`

Curve could not be generated automatically. Press Curve to retry.`:''}

Choose action:`,guidedProductActionMenu(family==='ES'));
  return saved||session
}
function guidedSelectionCandidateCompare(a:any,b:any){const akw=Number(a?.motor_kw||999999),bkw=Number(b?.motor_kw||999999);if(Math.abs(akw-bkw)>1e-9)return akw-bkw;const ae=Number(a?.efficiency||0),be=Number(b?.efficiency||0);if(Math.abs(ae-be)>1e-9)return be-ae;const ar=Number(a?.selector_rank||999),br=Number(b?.selector_rank||999);if(ar!==br)return ar-br;return guidedNaturalCompare(`${a?.product?.brand_name||''} ${a?.display_model||a?.model||''}`,`${b?.product?.brand_name||''} ${b?.display_model||b?.model||''}`)}
async function guidedSizeSelectedProducts(service:any,companyId:string,products:any[],q:number,h:number){
  const out:any[]=[];
  for(const product of products||[]){
    const group=String(product?.price_group||'').toUpperCase();if(product?.has_curve!==true)continue;
    const presentation=await guidedProductPresentation(service,companyId,product),series=String(presentation?.brandSeries||product?.brand_series||product?.product_label||(group==='ES'?'ES':'CHC')).trim();
    const poles=group==='ES'?[2,4]:[0];
    for(const pole of poles){let rows:any[]=[];try{rows=selectPumpCandidates(guidedSelectorFamily(group),q,h,pole,3)||[]}catch(_){rows=[]}
      for(const row of rows){const sourceDisplay=String(row.display_model||row.model||''),displayModel=guidedAliasModel(sourceDisplay,presentation,group)||sourceDisplay;out.push({...guidedApplyProductIdentity({...row,series,display_model:displayModel},product),product,display_model:displayModel,series,selector_rank:Number(row.selector_rank||999)});}
    }
  }
  const seen=new Set<string>(),dedup=out.sort(guidedSelectionCandidateCompare).filter((x:any)=>{const k=[x?.product?.key,x?.display_model||x?.model,x?.pole||0].join('|');if(seen.has(k))return false;seen.add(k);return true});return dedup.slice(0,12);
}
async function guidedOpenSelection(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,user:any,customer:any=null){
  const products=(customer?await guidedProductsForContext(service,companyId,user,String(customer.id)):await guidedUserAvailableProducts(service,companyId,user)).filter((x:any)=>x.has_curve===true);
  if(!products.length){await telegramSend(telegramToken,chatId,customer?`Customer: ${customer.company_name}\n\nNo searchable pump Brand / Series is assigned under both your User assignment and this Customer Price Preference.`:'No searchable pump Brand / Series is assigned to your KeySuite user/Role.',customer?guidedSelectedCustomerMenu():mainMenuMarkup());return session}
  const c=sessionContext(session),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:String(customer?.id||'')||null,flow_m3h:null,head_m:null,context:{...c,keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{}),guided_selection_products:products,guided_selection_keys:[],guided_selection_candidates:null,guided_product:null,pending_item:null}});
  await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}Selection\nChoose the Brand / Series you want KeyBot to search.\n\nTick one or more Series, then press Continue.`,guidedSelectionRows(products,[]));return saved||session;
}


function keybotFastLines(text:any){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);return lines.length>=2?{customer:lines[0],product:lines.slice(1).join(' ')}:null}
function keybotFastLooksLikePump(text:any){return /\b(?:CHC|VMS|SVM|BFI|ES)\b/i.test(String(text||''))}
function keybotFastLooksLikeExactPumpModel(text:any){return /\b(?:CHC|VMS|SVM|BFI|ES)\s+\d{1,3}\s*-\s*\d{1,3}(?:\s*-\s*\d{1,2})?(?:\s*-\s*\d{1,2})?(?:\s+[24]\s*P(?:OLE)?)?\b/i.test(String(text||''))}
function keybotFastExactMayOverrideSession(session:any){
  const mode=String(session?.mode||'').trim(),step=String(session?.step||'').trim();if(!mode||!step||step==='idle')return true;
  // V4.19.11: exact-model Fast Search has priority over ordinary navigation and stale
  // hydraulic prompts. Only deliberate editing fields keep ownership of typed text.
  const protectedSteps=new Set(['pump_options','draft_edit_qty','guided_catalog','guided_waiting_product','guided_fast_model_choice','guided_fast_customer_choice','guided_es_assembly_edit_pump','guided_es_assembly_edit_motor','guided_es_assembly_edit_baseplate','guided_es_assembly_coupling_type','guided_es_assembly_coupling_size','keyplc_edit_pump','keyplc_edit_panel','keyplc_edit_manifold','keyplc_edit_manifold_size','keyplc_edit_tank']);
  return !(protectedSteps.has(step)||step.startsWith('pump_option_'));
}
function keybotFastRequestedPole(text:any){const m=String(text||'').match(/\b([24])\s*P(?:OLE)?\b/i);return Number(m?.[1]||0)}
function keybotFastPrepareMatches(matches:any[],input:any){
  if(keybotFastRequestedPole(input))return matches||[];
  const groups=new Map<string,any[]>(),plain:any[]=[];
  for(const x of matches||[]){const group=String(x?.product?.price_group||'').toUpperCase();if(group!=='ES'){plain.push(x);continue}const master=String(x?.selected?.meta?.master_model||x?.selected?.label||'').trim(),key=[String(x?.product?.key||x?.product?.brand_id||x?.product?.brand_name||''),cleanSearch(master)].join('|');const arr=groups.get(key)||[];arr.push(x);groups.set(key,arr)}
  const prepared=[...plain];
  for(const arr of groups.values()){const first=arr[0],poles=[...new Set(arr.map((x:any)=>Number(x?.selected?.meta?.pole||0)).filter((p:any)=>p===2||p===4))].sort();if(poles.length<=1){prepared.push(first);continue}const meta={...(first?.selected?.meta||{}),pole:0,rpm:0,available_poles:poles,keybot_fast_choose_pole:true},display=String(meta.display_model||first?.selected?.label||meta.master_model||'').replace(/\s+[24]P$/i,'').trim();prepared.push({...first,label:`${String(first?.product?.brand_name||'Brand')} - ${display}`,selected:{...(first?.selected||{}),label:display,meta:{...meta,display_model:display}},keybot_fast_choose_pole:true})}
  return prepared.sort((a:any,b:any)=>guidedNaturalCompare(a.label,b.label));
}
async function keybotFastOpenPreparedMatch(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,match:any,context:any={}){
  const product=match?.product,group=String(product?.price_group||'').toUpperCase(),meta=match?.selected?.meta||{},poles=Array.isArray(meta.available_poles)?meta.available_poles.map((x:any)=>Number(x)).filter((x:any)=>x===2||x===4):[];
  if(group==='ES'&&(match?.keybot_fast_choose_pole===true||meta.keybot_fast_choose_pole===true)&&poles.length>1){const exact=guidedCatalogExactChoice(match.selected),c={...sessionContext(session),...context,keybot_fast_search:true,guided_product:product,guided_catalog_path:match.path||[match.selected],guided_catalog_choices:null,guided_exact_model:{...exact,pole:0,rpm:0,available_poles:poles},guided_exact_pole_action:'fast_auto'};const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_exact_es_pole',selected_customer_id:String(customer?.id||'')||null,context:c});const rows=poles.map((p:number)=>[`ES ${p} Pole`]);rows.push(['⬅️ Back','🔄 New Request']);await telegramSend(telegramToken,chatId,`Model: ${String(exact.display_model||exact.master_model||'ES')}\n\nChoose Pole:`,telegramReplyKeyboard(rows));return saved||session}
  return await keybotFastOpenMatch(service,telegramToken,companyId,chatId,senderId,session,customer,match,context);
}
function keybotFastStripBrand(text:any,products:any[]){let raw=String(text||'').trim(),picked='';const brands=guidedUnique((products||[]).map((p:any)=>String(p.brand_name||'').trim())).sort((a:any,b:any)=>b.length-a.length);for(const b of brands){const esc=b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),re=new RegExp(`^${esc}(?:\\s+|[-:·]\\s*)`,'i');if(re.test(raw)){picked=b;raw=raw.replace(re,'').trim();break}}return {brand:picked,query:raw}}
async function keybotFastModelMatches(service:any,companyId:string,products:any[],input:any){
  const scoped=keybotFastStripBrand(input,products),poleMatch=String(scoped.query||'').match(/\b([24])\s*P(?:OLE)?\b/i),requestedPole=Number(poleMatch?.[1]||0),modelQuery=String(scoped.query||'').replace(/\b[24]\s*P(?:OLE)?\b/ig,' ').replace(/\s+/g,' ').trim(),brandKey=cleanSearch(scoped.brand),query=cleanSearch(modelQuery),exact:any[]=[],partial:any[]=[];if(!query)return [];
  const esDb:any=(globalThis as any).ES_SELECTOR_DB;
  for(const product of products||[]){
    const group=String(product?.price_group||'').toUpperCase();
    if(!['CHC_G1','CHC_G2','BFI','ES'].includes(group))continue;
    if(brandKey&&cleanSearch(product.brand_name)!==brandKey)continue;
    const presentation=await guidedProductPresentation(service,companyId,product);
    if(group==='ES'){
      // V4.19.12: ES Fast Search uses the hydraulic master dataset as the model source of truth.
      // A technical/curve model must remain searchable even when the ES price catalogue has no row for it.
      const pumps=Array.isArray(esDb?.pumps)?esDb.pumps:[];
      for(const r of pumps){
        const rawModel=String(r?.model||'').trim();if(!rawModel)continue;
        const master=`ES ${rawModel.replace(/^ES\s+/i,'')}`;
        const display=guidedAliasModel(master,presentation,group)||master;
        const pole=Number(r?.pole||0)||(Number(r?.rpm||0)>=2000?2:Number(r?.rpm||0)>0?4:0);
        if(requestedPole&&pole!==requestedPole)continue;
        const labels=[display,master];let score=99;
        for(const label of labels){const k=cleanSearch(label);if(k===query)score=Math.min(score,0);else if(k.startsWith(query))score=Math.min(score,1);else if(k.includes(query))score=Math.min(score,2)}
        if(score>2)continue;
        const hydraulicId=String(r?.id||`hydraulic:${rawModel}:${pole||Number(r?.rpm||0)}`),selected={kind:'model',value:hydraulicId,label:display,meta:{id:hydraulicId,master_model:master,display_model:display,hydraulic_source:true,...(pole?{pole,rpm:Number(r?.rpm||0)}:{})}},entry={product,selected,path:[selected],label:`${String(product.brand_name||'Brand')} - ${display}${pole&&!new RegExp(`(?:^|\\s)${pole}P$`,'i').test(display)?` ${pole}P`:''}`,score};
        (score===0?exact:partial).push(entry);
      }
      continue;
    }
    if(requestedPole)continue;
    let rows:any[]=[];try{rows=await guidedCatalogRows(service,product)}catch(_){continue}
    for(const r of rows){let master=String(r.model||'').trim();if(!master)continue;const display=guidedAliasModel(master,presentation,group)||master,labels=[display,master];let score=99;for(const label of labels){const k=cleanSearch(label);if(k===query)score=Math.min(score,0);else if(k.startsWith(query))score=Math.min(score,1);else if(k.includes(query))score=Math.min(score,2)}if(score>2)continue;const selected={kind:'model',value:String(r.id||master),label:display,meta:{id:String(r.id||''),master_model:master,display_model:display}},chcGenLabel=group==='CHC_G1'?'CHC C4':group==='CHC_G2'?'CHC C6':'',entry={product,selected,path:[selected],label:`${String(product.brand_name||'Brand')} - ${chcGenLabel?`${chcGenLabel} - `:''}${display}`,score};(score===0?exact:partial).push(entry)}
  }
  const arr=exact.length?exact:partial;const seen=new Set<string>();return arr.sort((a:any,b:any)=>a.score-b.score||guidedNaturalCompare(a.label,b.label)).filter((x:any)=>{const k=[x.product?.key,x.selected?.meta?.master_model,x.selected?.meta?.pole||0].join('|');if(seen.has(k))return false;seen.add(k);return true}).slice(0,12)
}
function keybotFastMatchKeyboard(matches:any[]){const rows:any[]=[];for(const x of (matches||[]).slice(0,8))rows.push([String(x.label).slice(0,60)]);rows.push(['⬅️ Back','🔄 New Request']);return telegramReplyKeyboard(rows)}
async function keybotFastOpenMatch(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,match:any,context:any={}){
  const product=match.product,exact=guidedCatalogExactChoice(match.selected),group=String(product?.price_group||'').toUpperCase(),pole=group==='ES'?Number(exact?.pole||match?.selected?.meta?.pole||0):0,c={...sessionContext(session),...context,keybot_fast_search:true,guided_product:product,guided_catalog_path:match.path||[match.selected],guided_catalog_choices:null,guided_exact_model:exact,...(pole?{guided_exact_pole:pole}:{})};
  let saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',selected_customer_id:String(customer?.id||'')||null,context:c});
  try{
    if(product?.has_curve===true&&((group==='CHC_G1'||group==='CHC_G2'||group==='BFI')||(group==='ES'&&[2,4].includes(pole)))){
      const brand=String(product?.brand_name||'').trim()||'Brand',display=String(exact?.display_model||exact?.master_model||'').trim(),lines=[`${brand} - ${display}${group==='ES'&&!new RegExp(`(?:^|\\s)${pole}P$`,'i').test(display)?` ${pole}P`:''}`];
      if(group==='ES'){
        const rated=exactEsRatedPoint(exact?.master_model,pole);if(!rated)throw new Error('Rated point could not be resolved for this ES model.');let item:any=selectPumpSummary('ES',Number(rated.flow_m3h),Number(rated.head_m),pole,String(exact?.master_model||''));item=guidedApplyProductIdentity({...item,display_model:display},product);lines.push('Type: End Suction Pump',`Speed: ${pole}P · ${inputNumber(item.rpm||0)} rpm`,Number(item.motor_kw)>0?`Motor: ${inputNumber(item.motor_kw)} kW / ${inputNumber(item.motor_hp)} HP`:null,item.suction?`Suction: ${item.suction}`:null,item.discharge?`Discharge: ${item.discharge}`:null,Number(item.impeller_mm)>0?`Full Size Impeller: Ø${inputNumber(item.impeller_mm)} mm`:null,Number(rated.min_impeller_mm)>0?`Min Size Impeller: Ø${inputNumber(rated.min_impeller_mm)} mm`:null);saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',flow_m3h:Number(rated.flow_m3h),head_m:Number(rated.head_m),selected_customer_id:String(customer?.id||'')||null,context:{...c,pending_item:item,guided_exact_rated:rated}})||saved;
      }else{
        const info=group==='BFI'?directBfiModelInfo(exact?.master_model):directChcModelInfo(exact?.master_model,group);
        if(info)lines.push(group==='BFI'?'Type: Horizontal Multistage Pump':'Type: Vertical Multistage Inline Pump',Number(info.motor_kw)>0?`Motor: ${inputNumber(info.motor_kw)} kW / ${inputNumber(info.motor_hp)} HP`:null,info.connection?`Connection: ${info.connection}`:null);
      }
      await telegramSend(telegramToken,chatId,lines.filter(Boolean).join('\n'),telegramRemoveKeyboard());
      return await guidedSendExactRatedCurve(service,telegramToken,companyId,chatId,senderId,saved||session,customer,product,exact,pole);
    }
  }catch(error){await telegramSend(telegramToken,chatId,`Model found, but the automatic curve could not be generated.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(product?.has_curve===true,group==='ES'));return saved||session}
  await telegramSend(telegramToken,chatId,guidedExactActionText(customer,product,exact),guidedExactActionMenu(product?.has_curve===true,group==='ES'));return saved||session;
}
async function keybotFastHandleProduct(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,user:any,customer:any,productText:any){
  const products=customer?await guidedProductsForContext(service,companyId,user,String(customer.id)):await guidedUserAvailableProducts(service,companyId,user),raw=String(productText||'').trim();
  if(keybotFastLooksLikeExactPumpModel(raw)){const exactMatches=keybotFastPrepareMatches(await keybotFastModelMatches(service,companyId,products,raw),raw);if(exactMatches.length===1)return await keybotFastOpenPreparedMatch(service,telegramToken,companyId,chatId,senderId,session,customer,exactMatches[0],{keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{})});if(exactMatches.length>1){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_fast_model_choice',selected_customer_id:String(customer?.id||'')||null,context:{...sessionContext(session),keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{}),guided_fast_matches:exactMatches}});await telegramSend(telegramToken,chatId,'More than one matching model was found. Choose the desired Brand / Model:',keybotFastMatchKeyboard(exactMatches));return saved||session}await telegramSend(telegramToken,chatId,`No exact assigned pump model matched “${raw}”.`,mainMenuMarkup());return session}
  const parsed=smartQuoteRequest(productText);
  if(Number(parsed.flow_m3h)>0&&Number(parsed.head_m)>0&&keybotFastLooksLikePump(raw)){
    const scoped=keybotFastStripBrand(raw,products),brandKey=cleanSearch(scoped.brand),family=quoteFamilyFromText(raw),chcScope=quoteChcScopeFromText(raw),wanted=(products||[]).filter((p:any)=>p.has_curve===true).filter((p:any)=>!brandKey||cleanSearch(p.brand_name)===brandKey).filter((p:any)=>{const g=String(p.price_group||'').toUpperCase();if(family.startsWith('ES'))return g==='ES';if(family==='BFI')return g==='BFI';if(!['CHC_G1','CHC_G2'].includes(g))return false;return chcScope?g===chcScope:true;});
    const q=Number(parsed.flow_m3h),h=Number(parsed.head_m),candidates=await guidedSizeSelectedProducts(service,companyId,wanted,q,h);if(!candidates.length){await telegramSend(telegramToken,chatId,'No suitable model was found for that Customer / Brand / Series / Duty.',mainMenuMarkup());return session}
    if(family==='CHC'){const token=guidedSelectionNewToken(),duty=dutyDisplay(String(productText||''),q,h).duty_text,saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_selection_results',flow_m3h:q,head_m:h,selected_customer_id:String(customer?.id||'')||null,context:{...sessionContext(session),keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{}),guided_selection_products:wanted,guided_selection_keys:wanted.map((p:any)=>String(p.key)),guided_selection_candidates:candidates,guided_selection_token:token,guided_duty_text:duty,guided_pending_request:{...parsed,chc_scope:chcScope||'',flow_m3h:q,head_m:h}}});await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}${guidedSelectionResultText(q,h,candidates,duty)}`,guidedSelectionResultKeyboard(candidates,token));return saved||session}
    const chosen=candidates[0],product=chosen.product,pole=Number(chosen.pole||0),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_product_action',flow_m3h:q,head_m:h,selected_customer_id:String(customer?.id||'')||null,context:{...sessionContext(session),keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{}),guided_product:product,pending_item:chosen,guided_selection_candidates:candidates,guided_pending_request:{...parsed,pole,force_model:String(chosen.model||'')}}});await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}Recommended - ${guidedSelectionPumpLabel(chosen)}\nMotor: ${oneDecimal(chosen.motor_kw||0)} kW${pole?` · ${pole}P`:''}\nDuty: ${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr\n\nChoose action:`,guidedProductActionMenu(String(chosen.family||'').toUpperCase()==='ES'));return saved||session
  }
  if(keybotFastLooksLikePump(raw)){
    const matches=keybotFastPrepareMatches(await keybotFastModelMatches(service,companyId,products,raw),raw);if(matches.length===1)return await keybotFastOpenPreparedMatch(service,telegramToken,companyId,chatId,senderId,session,customer,matches[0],{keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{})});if(matches.length>1){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_fast_model_choice',selected_customer_id:String(customer?.id||'')||null,context:{...sessionContext(session),keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{}),guided_fast_matches:matches}});await telegramSend(telegramToken,chatId,'More than one matching model was found. Choose the desired Brand / Model:',keybotFastMatchKeyboard(matches));return saved||session}
  }
  await telegramSend(telegramToken,chatId,'No matching assigned pump model was found. Try the Brand + Model, for example OEM VMS 10-100.',mainMenuMarkup());return session
}

function guidedSelectedCustomerMenu(){return telegramReplyKeyboard([['📦 Product','🔎 Selection'],['⬅️ Back','🔄 New Request']])}
function guidedProductActionMenu(es=false){return es?telegramReplyKeyboard([['📈 Curve','⚙️ Pump Configuration'],['🧩 Assemble','💰 Check Price'],['⬅️ Back','🔄 New Request']]):telegramReplyKeyboard([['📈 Curve','⚙️ Pump Configuration'],['🧩 Add to System','💰 Check Price'],['⬅️ Back','🔄 New Request']])}
function guidedEsPriceScopeMenu(){return telegramReplyKeyboard([['Bare Pump','Complete Pumpset'],['Both'],['⬅️ Back','🔄 New Request']])}
function guidedEsAssemblyMenu(){return telegramReplyKeyboard([['Pump','Motor'],['Coupling','Baseplate'],['System','💰 Check Price'],['⬅️ Back','🔄 New Request']])}
function guidedEsSystemMenu(){return telegramReplyKeyboard([['✏️ Edit BOM','💰 Check Price'],['📈 Curve PDF'],['⬅️ Back','🔄 New Request']])}
function guidedResultMenu(hasCurve=false){return hasCurve?telegramReplyKeyboard([['📈 Curve PDF','💰 Check Price'],['⬅️ Back','🔄 New Request']]):telegramReplyKeyboard([['⬅️ Back','🔄 New Request']])}
function guidedPriceResultMenu(hasCurve=false){return hasCurve?telegramReplyKeyboard([['📈 Curve PDF'],['⬅️ Back','🔄 New Request']]):guidedResultMenu(false)}
function guidedChcPriceScopeMenu(){return telegramReplyKeyboard([['💧 Pump Price','🧩 System Price'],['💰 Both Prices'],['⬅️ Back','🔄 New Request']])}
function guidedChcSystemRequest(session:any,item:any){const opts=pumpOptions(item?.options,item?.qty),baseModel=String(item?.model||'').replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC');return {product_type:'keyplc_system',system_type:'KEYPLC',system_pump_qty:2,system_operation:'1 Duty + 1 On Demand',panel_control:'VFD + HMI',direct_model:baseModel,family_code:'CHC',flow_m3h:Number(item?.requested_flow_m3h||session?.flow_m3h||0),head_m:Number(item?.requested_head_m||session?.head_m||0),duty_text:sessionDutyText(session,item),options:{...opts,qty:2},selected_pump_item:{...item,duty_text:sessionDutyText(session,item),options:{...opts,qty:2}}}}
async function guidedRunChcPriceChoice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,choice:string){const c=sessionContext(session),product=c.guided_product,item=c.pending_item;if(!product||!item)throw new Error('The selected CHC pump is no longer available.');if(choice==='pump'){return await guidedFinishSelectionPrice(service,telegramToken,companyId,chatId,senderId,session,customer,user)}if(choice==='system'){return await sendKeyplcSystem(service,telegramToken,companyId,chatId,senderId,session,guidedChcSystemRequest(session,item),customer,user)}if(choice==='both'){const priced=await quotePumpForCustomer(service,String(customer.id),guidedApplyProductIdentity(item,product),String(user.email||''));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_product_action',flow_m3h:Number(session.flow_m3h||priced.requested_flow_m3h||0),head_m:Number(session.head_m||priced.requested_head_m||0),selected_customer_id:String(customer.id),context:{...c,customer_name:customer.company_name,pending_item:priced,guided_product:product,guided_chc_price_choice:null}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\nPump Price\n${quotationResultText(priced)}`,guidedProductActionMenu(false));return await sendKeyplcSystem(service,telegramToken,companyId,chatId,senderId,saved||session,guidedChcSystemRequest(saved||session,priced),customer,user)}throw new Error('Choose Pump Price, System Price or Both Prices.')}
function mainMenuMarkup(){return telegramReplyKeyboard([['👤 Customer','📦 Product','🔎 Selection'],['🆕 New Request']])}

async function guidedReopenCurrentMenu(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any){
  const c=sessionContext(session),step=String(session?.step||''),user=await linkedKeySuiteUser(service,companyId,senderId);
  const customer=session?.selected_customer_id&&user?await guidedAllowedCustomerById(service,companyId,user,String(session.selected_customer_id)):null;
  if(step==='guided_back_menu'){
    const targets=Array.isArray(c.guided_back_targets)?c.guided_back_targets:[];await telegramSend(telegramToken,chatId,'Go back to:',telegramReplyKeyboard([...targets.map((x:any)=>[String(x.label).slice(0,60)]),['🔄 New Request']]));return session;
  }
  if(step==='guided_waiting_customer'){
    const choices=Array.isArray(c.customer_choices)?c.customer_choices:[];
    if(choices.length){await telegramSend(telegramToken,chatId,'Choose Customer:',telegramReplyKeyboard([...choices.map((x:any)=>[String(x.label).slice(0,60)]),['⬅️ Back','🔄 New Request']]));return session}
    await telegramSend(telegramToken,chatId,'Please enter customer name.\nExample: KEY',guidedInputNavMenu());return session;
  }
  if(!user||(session?.selected_customer_id&&!customer)){await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session}
  if(step==='guided_customer_selected'&&customer){await telegramSend(telegramToken,chatId,`✅ Customer: ${customer.company_name}\n\nChoose Product or Selection:`,guidedSelectedCustomerMenu());return session}
  if(step==='guided_waiting_product'){
    const choices=Array.isArray(c.guided_product_choices)?c.guided_product_choices:[];
    await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}Choose Product:`,telegramReplyKeyboard([...choices.map((x:any)=>[String(x.label).slice(0,60)]),['🔎 Selection'],['⬅️ Back','🔄 New Request']]));return session;
  }
  if(step==='guided_catalog'&&c.guided_product){
    const startPath=Array.isArray(c.guided_catalog_path)?c.guided_catalog_path:[],resolved=await guidedResolveCatalogLevel(service,companyId,c.guided_product,startPath),level=resolved.level,path=resolved.path;
    if(resolved.exactChoice)return await guidedSaveExactCatalogChoice(service,telegramToken,companyId,chatId,senderId,session,customer,c.guided_product,path,resolved.exactChoice,c);
    const choices=level.choices||[],saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:String(customer?.id||'')||null,context:{...c,guided_catalog_path:path,guided_catalog_choices:choices}});
    await telegramSend(telegramToken,chatId,level.title,guidedKeyboardForChoices(choices));return saved||session;
  }
  if(step==='guided_exact_model_action'&&c.guided_product&&c.guided_exact_model){
    const exact=c.guided_exact_model;await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n`:''}Product: ${guidedProductButtonLabel(c.guided_product)}\nModel: ${exact.display_model||exact.master_model}\n\nChoose action:`,guidedExactActionMenu(c.guided_product.has_curve===true,String(c.guided_product.price_group||'').toUpperCase()==='ES'));return session;
  }
  if(step==='guided_exact_es_pole'&&c.guided_exact_model){
    await telegramSend(telegramToken,chatId,`Model: ${c.guided_exact_model.display_model||c.guided_exact_model.master_model}\n\nChoose ES motor speed:`,telegramReplyKeyboard([['ES 2 Pole','ES 4 Pole'],['⬅️ Back','🔄 New Request']]));return session;
  }
  if(step==='guided_selection_scope'){const products=Array.isArray(c.guided_selection_products)?c.guided_selection_products:[],keys=Array.isArray(c.guided_selection_keys)?c.guided_selection_keys:[];await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}Selection\nChoose the Brand / Series you want KeyBot to search.`,guidedSelectionRows(products,keys));return session}
  if(step==='guided_selection_waiting_duty'){await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}Selection\nEnter Flow @ Head.\nExample: 30m3/hr @ 80m`,guidedInputNavMenu());return session}
  if(step==='guided_selection_confirm_duty'){const products=Array.isArray(c.guided_selection_products)?c.guided_selection_products:[],keys=new Set(Array.isArray(c.guided_selection_keys)?c.guided_selection_keys:[]),chosen=products.filter((x:any)=>keys.has(String(x.key))).map((x:any)=>guidedSelectionSeriesLabel(x));await telegramSend(telegramToken,chatId,`Duty: ${sessionDutyText(session)}\n\nSearch:\n${chosen.map((x:string)=>`• ${x}`).join('\n')}\n\nPress Start Sizing to search the selected ranges.`,telegramReplyKeyboard([['▶️ Start Sizing'],['✏️ Change Duty','☑ Brand / Series'],['⬅️ Back','🔄 New Request']]));return session}
  if(step==='guided_selection_results'){const rows=Array.isArray(c.guided_selection_candidates)?c.guided_selection_candidates:[];await telegramSend(telegramToken,chatId,guidedSelectionResultText(Number(session.flow_m3h||0),Number(session.head_m||0),rows),guidedSelectionResultKeyboard(rows,String(c.guided_selection_token||'legacy')));return session}
  if(step==='guided_quick_waiting_product'){
    const choices=Array.isArray(c.guided_quick_choices)?c.guided_quick_choices:[];await telegramSend(telegramToken,chatId,`Duty: ${oneDecimal(session.flow_m3h)} m³/hr @ ${oneDecimal(session.head_m)} Mtr\n\nChoose from your assigned curve Products:`,telegramReplyKeyboard([...choices.map((x:any)=>[String(x.label).slice(0,60)]),['⬅️ Back','🔄 New Request']]));return session;
  }
  if(step==='guided_product_action'&&c.pending_item){const es=String(c.pending_item?.family||'').toUpperCase()==='ES';await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}${quotationResultText(c.pending_item)}\n\nChoose action:`,guidedProductActionMenu(es));return session}
  if(step==='guided_es_price_scope'&&c.pending_item){const item=c.pending_item;await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose supply for Price:`,guidedEsPriceScopeMenu());return session}
  if(step==='guided_chc_price_scope'&&c.pending_item){const item=c.pending_item;await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose Price:`,guidedChcPriceScopeMenu());return session}
  if((step==='guided_es_assembly'||step==='guided_es_system')&&c.es_assembly_bom){await telegramSend(telegramToken,chatId,guidedEsAssemblyText(c.es_assembly_bom,customer),step==='guided_es_system'?guidedEsSystemMenu():guidedEsAssemblyMenu());return session}
  if(step==='guided_es_assembly_edit_pump'){await telegramSend(telegramToken,chatId,'Enter ES pump model, or Auto to restore the selected pump.\nExample: ES 50-26',guidedInputNavMenu());return session}
  if(step==='guided_es_assembly_edit_motor'){await telegramSend(telegramToken,chatId,`Enter Motor kW and efficiency class. Pole stays with the selected ES curve.\nExample: 11kW IE3\n\nType Auto to restore ${oneDecimal(c.es_assembly_source_item?.motor_kw||0)} kW IE3.`,guidedInputNavMenu());return session}
  if(step==='guided_es_assembly_coupling_type'){await telegramSend(telegramToken,chatId,`Current Coupling: ${c.es_assembly_bom?.coupling?.model||'-'}\n\nChoose Coupling Type:`,telegramReplyKeyboard([['FCL','Tyre'],['⬅️ Back','🔄 New Request']]));return session}
  if(step==='guided_es_assembly_coupling_size'){const choices=Array.isArray(c.guided_es_coupling_choices)?c.guided_es_coupling_choices:[];await telegramSend(telegramToken,chatId,`${keybotEsCouplingTypeLabel(c.guided_es_coupling_type)} Coupling\n\nChoose Size:${choices.length?`\n${choices[0].model} is recommended for the current pumpset.`:''}`,keybotEsCouplingChoiceKeyboard(choices));return session}
  if(step==='guided_es_assembly_edit_coupling'){await telegramSend(telegramToken,chatId,'Enter Coupling model, or Auto.\nExamples: FCL 160, F70',guidedInputNavMenu());return session}
  if(step==='guided_es_assembly_edit_baseplate'){await telegramSend(telegramToken,chatId,'Enter Baseplate details, or Auto.\nExample: 2 x 4, L3 1200, W1 500',guidedInputNavMenu());return session}
  if(step==='guided_waiting_es_pole'){await telegramSend(telegramToken,chatId,'Choose ES motor speed:',telegramReplyKeyboard([['ES 2 Pole','ES 4 Pole'],['⬅️ Back','🔄 New Request']]));return session}
  if(step==='guided_price_choice'){
    const choices=Array.isArray(c.guided_price_choices)?c.guided_price_choices:[];await telegramSend(telegramToken,chatId,'More than one product matches. Please choose:',telegramReplyKeyboard([...choices.map((x:any)=>[String(x.label).slice(0,60)]),['⬅️ Back','🔄 New Request']]));return session;
  }
  if(step==='guided_baseplate_channel'){await telegramSend(telegramToken,chatId,'Choose C-Channel size:',telegramReplyKeyboard([['1½" x 3"','2" x 4"'],['2½" x 5"','3" x 6"'],['3½" x 7"','3½" x 8"'],['⬅️ Back','🔄 New Request']]));return session}
  if(step==='guided_baseplate_l3'){await telegramSend(telegramToken,chatId,`${String(c.guided_baseplate?.cChannel||'Baseplate')}\n\nEnter L3 length in mm.\nExample: 1200`,guidedInputNavMenu());return session}
  if(step==='guided_baseplate_w1'){await telegramSend(telegramToken,chatId,`L3 ${inputNumber(c.guided_baseplate?.L3||0)} mm\n\nEnter W1 width in mm.\nExample: 500`,guidedInputNavMenu());return session}
  if(step==='guided_no_curve_price_input'&&c.guided_product){await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(c.guided_product),guidedInputNavMenu());return session}
  if(step==='guided_hydraulic_price_input'&&c.guided_product){await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\nProduct: ${guidedProductButtonLabel(c.guided_product)}\n\nEnter exact model or Flow @ Head for price.`,guidedInputNavMenu());return session}
  if(step==='guided_waiting_duty'&&c.guided_product){await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n`:''}Product: ${guidedProductButtonLabel(c.guided_product)}\n\nPlease enter Flow @ Head.\nExample: 30m3/hr @ 80m`,guidedInputNavMenu());return session}
  if((step==='guided_curve_result'||step==='guided_selection_result')&&c.pending_item){await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}${quotationResultText(c.pending_item)}`,guidedResultMenu(step==='guided_curve_result'));return session}
  if(step==='guided_price_result'&&customer&&c.pending_item&&c.guided_product){await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,c.guided_product,c.pending_item),guidedResultMenu(false));return session}
  if(customer){await telegramSend(telegramToken,chatId,`✅ Customer: ${customer.company_name}\n\nChoose Product or Selection:`,guidedSelectedCustomerMenu());return session}await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session;
}
async function guidedGoBack(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any){
  if(session?.mode!=='guided'){await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session}
  const c=sessionContext(session),step=String(session?.step||''),customerId=String(session?.selected_customer_id||'');
  if(step==='guided_fast_model_choice'){
    // If Fast Search interrupted a guided Product catalogue in an older session, restore that exact catalogue stage.
    if(c.guided_product&&Array.isArray(c.guided_catalog_choices)){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:customerId||null,context:{...c,guided_fast_matches:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
    if(customerId){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_customer_selected',selected_customer_id:customerId,context:{...c,guided_fast_matches:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}});await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return saved||session;
  }
  if(step==='guided_exact_model_action'){
    if(String(c.guided_product?.price_group||'').toUpperCase()==='BASEPLATE'){
      const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_baseplate_w1',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)
    }
    const prev=guidedPreviousVisibleCatalogPath(c.guided_catalog_path);if(!prev.removedVisible){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_product',selected_customer_id:customerId,context:{...c,guided_exact_model:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:customerId,context:{...c,guided_catalog_path:prev.path,guided_exact_model:null}});
    return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_catalog'){
    const prev=guidedPreviousVisibleCatalogPath(c.guided_catalog_path);
    if(prev.removedVisible){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:customerId,context:{...c,guided_catalog_path:prev.path}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_product',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_waiting_product'||step==='guided_selection_scope'||step==='guided_no_curve_price_input'||step==='guided_hydraulic_price_input'||step==='guided_waiting_duty'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_customer_selected',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_selection_waiting_duty'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_selection_confirm_duty'||step==='guided_selection_results'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_selection_waiting_duty',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_es_assembly_coupling_size'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly_coupling_type',selected_customer_id:customerId,context:{...c,guided_es_coupling_choices:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(['guided_es_assembly_edit_pump','guided_es_assembly_edit_motor','guided_es_assembly_edit_coupling','guided_es_assembly_coupling_type','guided_es_assembly_edit_baseplate'].includes(step)){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:customerId,context:{...c,guided_es_coupling_type:null,guided_es_coupling_choices:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_es_system'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_es_assembly'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_es_price_scope'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:String(c.guided_es_price_return_step||'guided_product_action'),selected_customer_id:customerId,context:{...c,guided_es_price_supply:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_waiting_es_pole'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_duty',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_price_choice'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_no_curve_price_input',selected_customer_id:customerId,context:{...c,guided_price_choices:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_curve_result'||step==='guided_selection_result'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_customer_selected',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_exact_es_pole'||step==='guided_exact_curve_duty'||step==='guided_price_result'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:c.guided_exact_model?'guided_exact_model_action':'guided_customer_selected',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_baseplate_w1'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_baseplate_l3',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_baseplate_l3'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_baseplate_channel',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_baseplate_channel'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_product',selected_customer_id:customerId,context:c});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session)}
  if(step==='guided_customer_selected'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,customer_name:null}});return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(step==='guided_waiting_customer'){await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session}
  await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session;
}


function guidedBackStageName(choice:any){
  const kind=String(choice?.kind||'').toLowerCase();
  const map:any={brand_series:'Series',series:'Pump Series',es_series:'ES Series',pressure:'Pressure Rating',efficiency:'Motor Efficiency',pole:'Pole',hp:'Motor Rating',type:'Coupling Type',kw:'Motor Rating',panel_model:'Panel Model',pump_dn:'Pump Connection',pump_qty:'Pump Quantity',pressure_bar:'Pressure Class',model:'Exact Model'};
  return String(map[kind]||choice?.label||'Previous Stage').slice(0,42);
}
async function guidedShowBackJumpMenu(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any){
  if(session?.mode!=='guided'){await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session}
  const c=sessionContext(session),originStep=String(session?.step||''),customerId=String(session?.selected_customer_id||''),targets:any[]=[];
  const add=(label:string,target:any)=>{if(!targets.some(x=>x.label===label))targets.push({label,target})};
  if(c.guided_return_step&&originStep==='guided_waiting_customer')add('↩️ Last Product Stage',{step:String(c.guided_return_step)});
  add(customerId?'↩️ Product / Selection':'↩️ Main Product / Selection',{step:customerId?'guided_customer_selected':'idle'});
  if(c.guided_product_choices||c.guided_product)add('↩️ Product',{step:'guided_waiting_product'});
  const hasEsAssembly=originStep.startsWith('guided_es_assembly')||originStep==='guided_es_system'||!!c.es_assembly_bom;
  if(hasEsAssembly){
    add('↩️ ES Assembly',{step:'guided_es_assembly'});
    if(originStep==='guided_es_system')add('↩️ ES System',{step:'guided_es_system'});
  }
  const hasSelectionFlow=originStep.startsWith('guided_selection')||Array.isArray(c.guided_selection_products);
  if(hasSelectionFlow){
    add('↩️ Brand / Series',{step:'guided_selection_scope'});
    if(Number(session?.flow_m3h)>0&&Number(session?.head_m)>0)add('↩️ Pump Sizing',{step:'guided_selection_waiting_duty'});
    if(Array.isArray(c.guided_selection_candidates)&&c.guided_selection_candidates.length)add('↩️ Select Model',{step:'guided_selection_results'});
  }
  const esPriceFlow=String(c.guided_product?.price_group||c.pending_item?.family||'').toUpperCase()==='ES'&&(!!c.pending_item||originStep.startsWith('guided_es_')||String(c.guided_after_customer||'').startsWith('es_'));
  if(esPriceFlow){
    add('↩️ Curve / Assemble / Check Price',{step:c.guided_exact_model?'guided_exact_model_action':'guided_product_action'});
    if(originStep==='guided_es_price_scope'||['es_complete_price','es_both_price','selection_price'].includes(String(c.guided_after_customer||''))&&!!c.guided_es_price_supply)add('↩️ Bare Pump / Complete Pumpset / Both',{step:'guided_es_price_scope'});
  }
  const path=Array.isArray(c.guided_catalog_path)?c.guided_catalog_path:[];
  for(let i=0;i<path.length;i++){if(path[i]?.meta?.guided_auto_skipped)continue;add(`↩️ ${guidedBackStageName(path[i])}`,{step:'guided_catalog',path:path.slice(0,i)})}
  if(!targets.length){await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return session}
  const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_back_menu',selected_customer_id:customerId||null,context:{...c,guided_back_origin_step:originStep,guided_back_targets:targets}});
  const rows=targets.map(x=>[x.label]);rows.push(['🔄 New Request']);
  await telegramSend(telegramToken,chatId,'Go back to:',telegramReplyKeyboard(rows));
  return saved||session;
}
async function guidedUseBackTarget(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,label:string){
  const c=sessionContext(session),targets=Array.isArray(c.guided_back_targets)?c.guided_back_targets:[],choice=targets.find((x:any)=>cleanSearch(x.label)===cleanSearch(label));if(!choice)return null;
  const target=choice.target||{},customerId=String(session?.selected_customer_id||''),user=await linkedKeySuiteUser(service,companyId,senderId);
  if(target.step==='idle'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,selected_customer_id:null,context:{}});await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return saved||session}
  if(target.step==='guided_waiting_product'){
    let productChoices=Array.isArray(c.guided_product_choices)?c.guided_product_choices:[];
    if(!productChoices.length&&user){
      const products=await guidedProductsForContext(service,companyId,user,customerId);productChoices=products.map((x:any)=>({key:String(x.key),label:guidedProductButtonLabel(x),product:x}));
    }
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_product',selected_customer_id:customerId||null,context:{...c,guided_product_choices:productChoices,guided_back_targets:null,guided_back_origin_step:null}});
    return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  if(target.step==='guided_catalog'){
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:customerId||null,context:{...c,guided_catalog_path:Array.isArray(target.path)?target.path:[],guided_exact_model:null,guided_back_targets:null,guided_back_origin_step:null}});
    return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
  }
  const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:String(target.step||'guided_customer_selected'),selected_customer_id:customerId||null,context:{...c,guided_back_targets:null,guided_back_origin_step:null}});
  return await guidedReopenCurrentMenu(service,telegramToken,companyId,chatId,senderId,saved||session);
}

function simpleCurveMenu(){return telegramReplyKeyboard([['⚙️ Options','💰 Check Price'],['🔄 New Request']])}
function simplePriceMenu(hasCurve=true){return hasCurve?telegramReplyKeyboard([['📈 Curve PDF','⚙️ Options'],['🔄 New Request']]):telegramReplyKeyboard([['🔄 New Request']])}
function money(value:any){return `RM ${Number(value||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function parseJsonObject(value:any){if(!value)return {};if(typeof value==='object'&&!Array.isArray(value))return value;try{const parsed=JSON.parse(String(value));return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}}catch(_){return {}}}
function pricingRarity(value:any){const v=String(value||'common').toLowerCase();return ['common','many','rare','fixed'].includes(v)?v:'common'}
function pricingBool(value:any,fallback=true){return value===undefined||value===null?fallback:!!value}
function pricingRule(category:any,family:string){
  const fam=String(family||'CHC').toUpperCase(),rules=parseJsonObject(category?.product_rules),raw=parseJsonObject(rules?.[fam]);
  const fallback=fam==='CHC'?{margin:Number(category?.chc_margin??category?.chc_factor??.38),normal:0,rare:0,transport:Number(category?.transport??30),useCommission:true,useSetDiscount:true,useFinalDiscount:true,useFuelCharge:true}:{margin:0,normal:0,rare:0,transport:0,useCommission:true,useSetDiscount:true,useFinalDiscount:true,useFuelCharge:true};
  return {margin:Number(raw.margin??fallback.margin),normal:Number(raw.normal??fallback.normal),rare:Number(raw.rare??fallback.rare),transport:Number(raw.transport??fallback.transport),useCommission:pricingBool(raw.useCommission??raw.use_commission??raw.includeCommission??raw.include_commission,fallback.useCommission),useSetDiscount:pricingBool(raw.useSetDiscount??raw.use_set_discount??raw.includeSetDiscount??raw.include_set_discount,fallback.useSetDiscount),useFinalDiscount:pricingBool(raw.useFinalDiscount??raw.use_final_discount??raw.includeFinalDiscount??raw.include_final_discount,fallback.useFinalDiscount),useFuelCharge:pricingBool(raw.useFuelCharge??raw.use_fuel_charge??raw.includeFuelCharge??raw.include_fuel_charge,fallback.useFuelCharge)};
}
function customerPricingRow(row:any={}){const q=row?.quotation||{};return {commission:Number(row?.commission??row?.quotation_commission??q?.commission??0),setDiscount:Number(row?.setDiscount??row?.set_discount??row?.quotation_set_discount??q?.setDiscount??0),finalDiscount:Number(row?.finalDiscount??row?.final_discount??row?.quotation_final_discount??q?.finalDiscount??0)}}
function productRates(settings:any,family:string){const fam=String(family||'CHC').toLowerCase();return {USD:Number(settings?.[`${fam}_usd_multiplier`]??settings?.usd_multiplier??5.8),RMB:Number(settings?.[`${fam}_rmb_multiplier`]??settings?.rmb_multiplier??.65),MYR:1}}
function calculateQuotedPrice(candidates:any[],rarityHint:any,rule:any,customerRates:any,ctx:any){
  const rows=(candidates||[]).filter(row=>Number(row?.sourcePrice)>0).map(row=>({...row,rarity:pricingRarity(row.rarity),baseMyr:Number(row.sourcePrice)*Number(row.multiplier||1)}));if(!rows.length)return null;
  const requested=pricingRarity(rarityHint),fixedRows=requested==='fixed'?rows:rows.filter(row=>row.rarity==='fixed'),pool=fixedRows.length?fixedRows:rows;
  const chosen=(fixedRows.length?pool.find(row=>row.currency==='MYR'):null)||pool.reduce((best,row)=>!best||row.baseMyr>best.baseMyr?row:best,null),rarity=pricingRarity(rarityHint||chosen.rarity),fixedPrice=rarity==='fixed';
  if(fixedPrice)return {finalPrice:chosen.baseMyr,fixedPrice:true,rarity,sourceCurrency:chosen.currency,sourcePrice:chosen.sourcePrice,multiplier:chosen.multiplier,baseMyr:chosen.baseMyr,fuelCharge:0};
  if(!(Number(rule.margin)>0))throw new Error('Category Margin is blank or 0%. Update Key → Category Pricing before quoting this pump.');
  const marginPrice=chosen.baseMyr/Math.max(.0001,1-Number(rule.margin||0));
  const afterNormal=(rarity==='common'||rarity==='rare')?marginPrice/Math.max(.0001,1-Number(rule.normal||0)):marginPrice;
  const afterRare=rarity==='rare'?afterNormal/Math.max(.0001,1-Number(rule.rare||0)):afterNormal;
  const withTransport=afterRare+Number(rule.transport||0);
  const afterCommission=rule.useCommission?withTransport/Math.max(.0001,1-Number(customerRates.commission||0)):withTransport;
  const afterSetDiscount=rule.useSetDiscount?afterCommission/Math.max(.0001,1-Number(customerRates.setDiscount||0)):afterCommission;
  const beforeFuel=rule.useFinalDiscount?afterSetDiscount/Math.max(.0001,1-Number(customerRates.finalDiscount||0)):afterSetDiscount;
  const fuelCharge=rule.useFuelCharge?Math.max(0,Number(ctx.distanceKm||0))*Math.max(Number(ctx.fuelPrice||2)-Number(ctx.fuelBasePrice||2),0):0;
  const unrounded=beforeFuel+fuelCharge,finalPrice=Math.ceil((unrounded-1e-9)/10)*10;
  return {finalPrice,fixedPrice:false,rarity,sourceCurrency:chosen.currency,sourcePrice:chosen.sourcePrice,multiplier:chosen.multiplier,baseMyr:chosen.baseMyr,fuelCharge,unroundedPrice:unrounded};
}
const KEYAI_PRICE_NOT_ASSIGNED='Price not assigned for this customer.';
function normalizeKeyAiPriceGroup(value:any){const g=String(value||'').trim().toUpperCase().replace(/\s+/g,'_');return g==='CHC'?'CHC_G2':g}
function pumpPriceGroup(item:any){
  const explicit=normalizeKeyAiPriceGroup(item?.keysuite_price_group_code||item?.price_group_code||item?.product_group_code||item?.keysuite_product_group_code||'');
  if(explicit)return explicit;
  const family=String(item?.family||'CHC').toUpperCase();
  if(family==='BFI')return 'BFI';
  if(family==='ES')return 'ES';
  if(family==='CHC'){const generation=String(item?.generation_code||item?.keysuite_generation_code||'G2').toUpperCase();return generation==='G1'?'CHC_G1':'CHC_G2'}
  return normalizeKeyAiPriceGroup(family);
}
async function requireCustomerPriceAssignment(service:any,customerId:string,userEmail:string,brandRef:string,priceGroup:string){
  const group=normalizeKeyAiPriceGroup(priceGroup);
  const r=await service.rpc('keysuite_v41801_customer_price_assignment',{p_user_email:String(userEmail||''),p_customer_id:String(customerId||''),p_brand_ref:String(brandRef||''),p_price_group:group});
  if(r.error){console.error('[KeySuite V4.18.01] Customer Price Preference lookup failed',r.error);throw new Error(KEYAI_PRICE_NOT_ASSIGNED)}
  const row=(Array.isArray(r.data)?r.data[0]:r.data)||{};
  if(row?.allowed!==true)throw new Error(KEYAI_PRICE_NOT_ASSIGNED);
  return row;
}
async function quotePumpForCustomer(service:any,customerId:string,item:any,keySuiteUserEmail:string,pricingOverride:any={}){
  const customerRes=await service.from('ks_customers').select('id,company_name,pricing_category_id,distance_km,status').eq('id',customerId).eq('status','active').maybeSingle();
  if(customerRes.error||!customerRes.data)throw new Error('Selected customer could not be loaded for pricing.');const customer:any=customerRes.data;
  if(!customer.pricing_category_id)throw new Error(KEYAI_PRICE_NOT_ASSIGNED);
  const priceGroup=pumpPriceGroup(item),priceAssignment=await requireCustomerPriceAssignment(service,customerId,keySuiteUserEmail,String(item?.brand_id||item?.brand||'B.G.Reich'),priceGroup);
  const [categoryRes,settingsRes]=await Promise.all([
    service.from('ks_pricing_categories').select('*').eq('id',customer.pricing_category_id).maybeSingle(),
    service.from('ks_app_settings').select('*').eq('id','default').maybeSingle()
  ]);
  if(categoryRes.error||!categoryRes.data)throw new Error('Customer Pricing Category could not be loaded.');
  if(settingsRes.error)throw new Error('KeySuite pricing settings could not be loaded.');
  const category:any=categoryRes.data,settings:any=settingsRes.data||{},family=String(item?.family||'CHC').toUpperCase(),rates=productRates(settings,family),baseRule=pricingRule(category,family),rule=pricingOverride?.skipSetDiscount?{...baseRule,useSetDiscount:false}:baseRule;
  // V4.13.10: load the exact same V2.22 customer-specific Commission / Set Discount /
  // Final Discount row used by the normal KeySuite quotation screen.
  const pricingRes=await service.rpc('keysuite_v41306_get_customer_pricing',{p_user_email:String(keySuiteUserEmail||''),p_customer_id:String(customerId||'')});
  if(pricingRes.error)throw new Error(`Customer-specific pricing could not be loaded: ${pricingRes.error.message||pricingRes.error}`);
  const pricingRow=(Array.isArray(pricingRes.data)?pricingRes.data[0]:pricingRes.data)||{};
  const companyRates=customerPricingRow(pricingRow);
  const ctx={distanceKm:Number(customer.distance_km||0),fuelPrice:Number(settings.fuel_price??2),fuelBasePrice:Number(settings.fuel_base_price??2)};
  let candidates:any[]=[],rarity:any='common',productId='',material='';
  if(family==='CHC'){
    const model=String(item?.model||'').replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC').trim(),chcTable=priceGroup==='CHC_G1'?'ks_products_chc_g1':'ks_products_chc',chcLabel=priceGroup==='CHC_G1'?'CHC C4':'CHC C6';
    let productRes=await service.from(chcTable).select('*').ilike('model',model).maybeSingle();if(productRes.error||!productRes.data)throw new Error(`No ${chcLabel} price-list record was found for ${item?.model||model}.`);let p:any=productRes.data;productId=String(p.id||'');
    material=/^CHCS\b/i.test(String(item?.model||item?.display_model||''))?'CHCS':/^CHCN\b/i.test(String(item?.model||item?.display_model||''))?'CHCN':'CHC';const key=material.toLowerCase();
    const makeChcCandidates=(row:any,prefix:string)=>['USD','RMB','MYR'].map(currency=>{const ck=currency.toLowerCase(),source=row?.[`${prefix}_${ck}`],r=row?.[`${prefix}_rarity_${ck}`]??'common';return {currency,sourcePrice:Number(source||0),multiplier:(rates as any)[currency],rarity:r}});
    candidates=makeChcCandidates(p,key);
    if(material!=='CHC'&&!candidates.some((x:any)=>Number(x.sourcePrice)>0)){
      const exactSku=String(item?.model||item?.display_model||'').trim();
      const exactRes=exactSku?await service.from(chcTable).select('*').ilike('model',exactSku).maybeSingle():null;
      if(exactRes&&!exactRes.error&&exactRes.data){p=exactRes.data;productId=String(p.id||productId);candidates=makeChcCandidates(p,key);if(!candidates.some((x:any)=>Number(x.sourcePrice)>0))candidates=makeChcCandidates(p,'chc')}
    }
    rarity='';
  }else if(family==='BFI'){
    const full=String(item?.model||'').replace(/[TE]$/i,'').trim(),phase=/1\s*ph/i.test(String(item?.motor_phase||item?.phase||item?.options?.phase||''))?'1ph':'3ph';
    const productRes=await service.from('ks_products_bfi').select('*').ilike('model',full).maybeSingle();if(productRes.error||!productRes.data)throw new Error(`No BFI price-list record was found for ${full}.`);const p:any=productRes.data;productId=String(p.id||'');rarity='';
    candidates=['USD','RMB','MYR'].map(currency=>{const c=currency.toLowerCase();return {currency,sourcePrice:Number(p[`price_${c}_${phase}`]||0),multiplier:(rates as any)[currency],rarity:p[`rarity_${c}_${phase}`]||'common'}});
  }else if(family==='ES'){
    const full=String(item?.model||'').trim(),stripped=full.replace(/^ES\s+/i,'').trim();let productRes=await service.from('ks_products_es').select('*').ilike('model',stripped).maybeSingle();if((productRes.error||!productRes.data)&&full!==stripped)productRes=await service.from('ks_products_es').select('*').ilike('model',full).maybeSingle();if(productRes.error||!productRes.data)throw new Error(`No ES price-list record was found for ${full}.`);const p:any=productRes.data;productId=String(p.id||'');rarity=pricingRarity(p.rarity||'common');
    const variants=Array.isArray(p.variants)?p.variants:[],rawRequested=String(item?.pricing_material||item?.keysuite_material||item?.options?.material||'').trim(),requested=esPricingMaterial(rawRequested),requestedKey=materialKey(requested);
    let variant=requestedKey?variants.find((v:any)=>materialKey(v?.material)===requestedKey&&['priceUsd','priceRmb','priceMyr'].some(k=>Number(v?.[k])>0)):null;
    if(!variant&&(!rawRequested||/^standard$/i.test(rawRequested)))variant=variants.find((v:any)=>['priceUsd','priceRmb','priceMyr'].some(k=>Number(v?.[k])>0));
    if(!variant)throw new Error(`No ES ${requested||'selected material'} source price is available for ${full}.`);material=String(variant.material||requested||'');
    candidates=[{currency:'USD',sourcePrice:Number(variant.priceUsd||0),multiplier:rates.USD,rarity},{currency:'RMB',sourcePrice:Number(variant.priceRmb||0),multiplier:rates.RMB,rarity},{currency:'MYR',sourcePrice:Number(variant.priceMyr||0),multiplier:1,rarity}];
  }else throw new Error('Pricing is currently enabled for CHC, BFI and ES pump items only.');
  const calc=calculateQuotedPrice(candidates,rarity,rule,companyRates,ctx);if(!calc)throw new Error(`No valid ${family} USD, RMB or MYR source price is available for ${item?.model||'this pump'}.`);
  return {...item,unit_price:Number(calc.finalPrice||0),line_total:Number(calc.finalPrice||0)*Math.max(1,Number(item?.qty||1)),pricing:{product_family:family,product_id:productId,material,category_id:String(category.id||''),category_name:String(category.category_name||''),price_group:String(priceAssignment.price_group||priceGroup),price_key:String(priceAssignment.price_key||''),brand_id:String(priceAssignment.brand_id||''),source_currency:calc.sourceCurrency,source_price:calc.sourcePrice,currency_multiplier:calc.multiplier,base_myr:calc.baseMyr,rarity:calc.rarity,fixed_price:!!calc.fixedPrice,fuel_charge:Number(calc.fuelCharge||0),calculated_price:Number(calc.finalPrice||0)}};
}
async function quoteGwsForCustomer(service:any,customerId:string,product:any,qty:any,keySuiteUserEmail:string){
  const customerRes=await service.from('ks_customers').select('id,company_name,pricing_category_id,distance_km,status').eq('id',customerId).eq('status','active').maybeSingle();
  if(customerRes.error||!customerRes.data)throw new Error('Selected customer could not be loaded for pricing.');const customer:any=customerRes.data;
  if(!customer.pricing_category_id)throw new Error(KEYAI_PRICE_NOT_ASSIGNED);
  const priceAssignment=await requireCustomerPriceAssignment(service,customerId,keySuiteUserEmail,'GWS','GWS');
  const [categoryRes,settingsRes,pricingRes]=await Promise.all([
    service.from('ks_pricing_categories').select('*').eq('id',customer.pricing_category_id).maybeSingle(),
    service.from('ks_app_settings').select('*').eq('id','default').maybeSingle(),
    service.rpc('keysuite_v41306_get_customer_pricing',{p_user_email:String(keySuiteUserEmail||''),p_customer_id:String(customerId||'')})
  ]);
  if(categoryRes.error||!categoryRes.data)throw new Error('Customer Pricing Category could not be loaded.');if(settingsRes.error)throw new Error('KeySuite pricing settings could not be loaded.');if(pricingRes.error)throw new Error(`Customer-specific pricing could not be loaded: ${pricingRes.error.message||pricingRes.error}`);
  const category:any=categoryRes.data,settings:any=settingsRes.data||{},rates=productRates(settings,'GWS'),rule=pricingRule(category,'GWS'),pricingRow=(Array.isArray(pricingRes.data)?pricingRes.data[0]:pricingRes.data)||{},companyRates=customerPricingRow(pricingRow),ctx={distanceKm:Number(customer.distance_km||0),fuelPrice:Number(settings.fuel_price??2),fuelBasePrice:Number(settings.fuel_base_price??2)};
  const candidates=[
    {currency:'USD',sourcePrice:Number(product?.price_usd||0),multiplier:rates.USD,rarity:product?.rarity_usd||'common'},
    {currency:'RMB',sourcePrice:Number(product?.price_rmb||0),multiplier:rates.RMB,rarity:product?.rarity_rmb||'common'},
    {currency:'MYR',sourcePrice:Number(product?.price_myr||0),multiplier:1,rarity:product?.rarity_myr||'common'}
  ];
  const calc=calculateQuotedPrice(candidates,'',rule,companyRates,ctx);if(!calc)throw new Error(`No valid GWS source price is available for ${product?.model||'this tank'}.`);
  const count=Math.max(1,Math.trunc(Number(qty)||1));return {family:'GWS',brand:'Keylargo',series:String(product?.series_name||'GWS Tank'),model:String(product?.model||''),qty:count,tank_size_litres:Number(product?.size_litres||0),tank_pressure_bar:Number(product?.pressure_bar||0),unit_price:Number(calc.finalPrice||0),line_total:Number(calc.finalPrice||0)*count,pricing:{product_family:'GWS',product_id:String(product?.id||''),material:'SKU',category_id:String(category.id||''),category_name:String(category.category_name||''),price_group:String(priceAssignment.price_group||'GWS'),price_key:String(priceAssignment.price_key||''),brand_id:String(priceAssignment.brand_id||'GWS'),source_currency:calc.sourceCurrency,source_price:calc.sourcePrice,currency_multiplier:calc.multiplier,base_myr:calc.baseMyr,rarity:calc.rarity,fixed_price:!!calc.fixedPrice,fuel_charge:Number(calc.fuelCharge||0),calculated_price:Number(calc.finalPrice||0)}};
}
function gwsChoiceLabel(product:any){const size=Number(product?.size_litres||0),bar=Number(product?.pressure_bar||0);return `${String(product?.model||'GWS Tank')}${size>0?` · ${inputNumber(size)}L`:''}${bar>0?` · ${inputNumber(bar)}bar`:''}`.slice(0,60)}
async function findGwsMatches(service:any,request:any){
  const r=await service.from('ks_products_gws').select('*').eq('status','active').order('source_row').limit(1000);if(r.error)throw new Error(`GWS Tank catalogue could not be loaded: ${r.error.message||r.error}`);let rows:any[]=r.data||[];
  const size=Number(request?.tank_size_litres||0),bar=Number(request?.tank_pressure_bar||0),hint=cleanSearch(request?.tank_model_hint||'');
  if(size>0)rows=rows.filter(p=>Math.abs(Number(p.size_litres||0)-size)<.001);if(bar>0)rows=rows.filter(p=>Math.abs(Number(p.pressure_bar||0)-bar)<.001);
  if(hint)rows=rows.filter(p=>cleanSearch(`${p.model||''} ${p.series_code||''} ${p.series_name||''}`).includes(hint));
  return rows.slice(0,12);
}

const KEYSUITE_CHC_CONNECTION_DN:any={1:25,2:25,3:25,4:32,5:32,8:40,10:40,12:50,15:50,16:50,20:50,32:65,45:80,64:100,90:100,120:125,150:125,200:150};
const KEYSUITE_MANIFOLD_FALLBACK:any={DN25:['DN25','DN40','DN50','DN65','DN80','DN100'],DN32:['DN32','DN50','DN65','DN80','DN100','DN100'],DN40:['DN40','DN65','DN80','DN100','DN100','DN150'],DN50:['DN50','DN80','DN100','DN100','DN150','DN200'],DN65:['DN65','DN100','DN100','DN150','DN200','DN250'],DN80:['DN80','DN100','DN150','DN200','DN250','DN300'],DN100:['DN100','DN150','DN200','DN250','DN300','DN350'],DN125:['DN125','DN200','DN250','DN300','DN350','DN400'],DN150:['DN150','DN200','DN250','DN350','DN400','DN450'],DN200:['DN200','DN300','DN300','DN400','DN450','DN500']};
function variantArray(value:any){if(Array.isArray(value))return value;if(value&&typeof value==='object')return Object.values(value);return []}
function variantQty(v:any){return Math.max(0,Number(v?.pumpQty??v?.pump_qty??(String(v?.label||'').match(/\d+/)?.[0]||0)))}
function variantCode(v:any){return String(v?.code??v?.pumpQty??v?.pump_qty??v?.tankSize??v?.tank_size??v?.label??'')}
function variantPrice(v:any,currency:string){const c=String(currency).toUpperCase();return Number(v?.[`price${c[0]}${c.slice(1).toLowerCase()}`]??v?.[`price_${c.toLowerCase()}`]??0)}
function dnNumberServer(value:any){const raw=String(value||'');const dn=raw.match(/\bDN\s*(\d+(?:\.\d+)?)/i);if(dn)return Number(dn[1])||0;const first=raw.match(/\d+(?:\.\d+)?/);return Number(first?.[0]||0)||0}
function directChcModelInfo(model:any,generationOrGroup:any='G2'){
  const g=String(generationOrGroup||'').toUpperCase(),isG1=g==='G1'||g==='CHC_G1',db:any=isG1?(globalThis as any).KeySuiteCHCG1Data:(globalThis as any).KeySuiteCHCData,core:any=isG1?(globalThis as any).KeySuiteCHCG1Core:(globalThis as any).KeySuiteCHCCore;const wanted=String(model||'').replace(/^VMS\b/i,'CHC').replace(/\s+/g,' ').trim().toUpperCase();
  const row=(db?.models||[]).find((m:any)=>String(m.model||'').toUpperCase()===wanted);if(!row)return null;
  let shutoff=0;try{const e=core?.evaluateModel?.(db,row,0,0,50);shutoff=Number(e?.predHead||0)}catch(_){ }
  const seriesNo=Number((String(row.series||row.model||'').match(/CHC\s*(\d+)/i)||[])[1]||0),dn=dnNumberServer(row.connection)||Number(KEYSUITE_CHC_CONNECTION_DN[seriesNo]||0);
  return {family:'CHC',brand:'B.G.Reich',series:isG1?'CHC C4':'CHC C6',generation_code:isG1?'G1':'G2',keysuite_generation_code:isG1?'G1':'G2',model:String(row.model),motor_kw:Number(row.motor_kw||0),motor_hp:Number(row.motor_hp||0),connection_dn:dn,connection:dn?`DN${dn}`:String(row.connection||''),shutoff_head_m:shutoff,series_no:seriesNo};
}
function exactChcRatedPoint(model:any,generationOrGroup:any='G2'){
  const g=String(generationOrGroup||'').toUpperCase(),isG1=g==='G1'||g==='CHC_G1',db:any=isG1?(globalThis as any).KeySuiteCHCG1Data:(globalThis as any).KeySuiteCHCData,core:any=isG1?(globalThis as any).KeySuiteCHCG1Core:(globalThis as any).KeySuiteCHCCore,wanted=String(model||'').replace(/^VMS\b/i,'CHC').replace(/\s+/g,' ').trim().toUpperCase();
  const row=(db?.models||[]).find((m:any)=>String(m.model||'').toUpperCase()===wanted);if(!row||!core)return null;
  const seriesText=String(row.series||row.model||''),q=Number((seriesText.match(/CHC\s*(\d+(?:\.\d+)?)/i)||[])[1]||0);
  if(!(q>0))return null;
  try{const atRated=core.evaluateModel(db,row,q,0,50),h=Number(atRated?.predHead||0);if(q>0&&h>0)return {flow_m3h:q,head_m:Math.max(1,Math.floor(h)),efficiency:Number(atRated?.eff||0)};}catch(_){ }
  return null;
}
function exactBfiRatedPoint(model:any){
  const db:any=(globalThis as any).KeySuiteBFIData,core:any=(globalThis as any).KeySuiteBFICore,wanted=String(model||'').replace(/[TE]$/i,'').replace(/\s+/g,' ').trim().toUpperCase();
  const row=(db?.models||[]).find((m:any)=>String(m.model||'').toUpperCase()===wanted);if(!row||!core)return null;
  const seriesText=String(row.series||row.model||''),q=Number((seriesText.match(/BFI\s*(\d+(?:\.\d+)?)/i)||[])[1]||0);
  if(!(q>0))return null;
  try{const atRated=core.evaluateModel(db,row,q,0,50),h=Number(atRated?.predHead||0);if(q>0&&h>0)return {flow_m3h:q,head_m:Math.max(1,Math.floor(h)),efficiency:Number(atRated?.eff||0)};}catch(_){ }
  return null;
}
function exactEsRatedPoint(model:any,pole:any){
  const core:any=(globalThis as any).ESCore,db:any=(globalThis as any).ES_SELECTOR_DB,p=Number(pole),rpm=p===2?2900:p===4?1450:0,wanted=String(model||'').replace(/^ES\s+/i,'').trim().toUpperCase();if(!core||!db||!rpm)return null;
  const pump=(db.pumps||[]).find((x:any)=>String(x.model||'').toUpperCase()===wanted&&Number(x.rpm||0)===rpm);if(!pump)return null;
  try{const maxD=Number(core.dmax(pump)),pts=(core.curvePoints(pump,maxD,1,180)||[]).filter((x:any)=>Number(x.flowM3h)>0&&Number.isFinite(Number(x.headM)));if(!pts.length)return null;let best=pts[0];for(const x of pts)if(Number(x.efficiencyPct||0)>Number(best.efficiencyPct||0))best=x;return {flow_m3h:Number(best.flowM3h),head_m:Number(best.headM),efficiency:Number(best.efficiencyPct||0),impeller_mm:maxD,min_impeller_mm:Number(core.dmin(pump)||0)};}catch(_){return null}
}
async function guidedSendExactRatedCurve(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,product:any,exact:any,pole:any=0){
  const group=String(product?.price_group||'').toUpperCase(),family=guidedSelectorFamily(group),esPole=family==='ES'?Number(pole||exact?.pole||0):0;
  const rated:any=family==='ES'?exactEsRatedPoint(exact?.master_model,esPole):family==='BFI'?exactBfiRatedPoint(exact?.master_model):exactChcRatedPoint(exact?.master_model,group);
  if(!rated){
    if(family==='ES')throw new Error(`Rated Full Size point could not be resolved for ${exact?.display_model||exact?.master_model||'this ES model'}${esPole?` · ${esPole} Pole`:''}.`);
    if(family==='BFI')throw new Error(`Rated point could not be resolved for ${exact?.display_model||exact?.master_model||'this BFI model'}.`);
    throw new Error(`Rated point could not be resolved for ${exact?.display_model||exact?.master_model||'this CHC model'}.`);
  }
  const q=Number(rated.flow_m3h),h=Number(rated.head_m),duty=`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`;
  const curveIdentity=await guidedCurveDisplayIdentity(service,companyId,product,String(exact?.master_model||''),String(exact?.display_model||''));
  const pdf=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),family==='ES'?esPole:0,String(exact?.master_model||''),curveIdentity);
  const label=String(exact?.display_model||exact?.master_model||pdf.model||family),caption=family==='ES'?`${label} curve ready\nFull Size + Min Size\nRated: ${duty}`:`${label} curve ready\nRated: ${duty}`;
  await telegramSendDocument(telegramToken,chatId,pdf.bytes,pdf.filename,caption);
  const c=sessionContext(session),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',flow_m3h:q,head_m:h,selected_customer_id:String(customer?.id||'')||null,context:{...c,...(family==='ES'?{guided_exact_pole:esPole}:{}),guided_exact_rated:{flow_m3h:q,head_m:h,efficiency:Number(rated.efficiency||0),impeller_mm:Number(rated.impeller_mm||0)}}});
  await telegramSend(telegramToken,chatId,'Choose the next action:',guidedExactActionMenu(true,family==='ES'));
  return saved||session;
}

function directBfiModelInfo(model:any){
  const input=String(model||'').trim(),explicitEnhanced=/E$/i.test(input),explicit3=explicitEnhanced||/T$/i.test(input),wanted=input.replace(/[TE]$/i,'').toUpperCase(),db:any=(globalThis as any).KeySuiteBFIData,row=(db?.models||[]).find((x:any)=>String(x.model||'').toUpperCase()===wanted);if(!row)return null;
  const phases=Array.isArray(row.phases)&&row.phases.length?row.phases:['3Ph'];let phase=explicit3?'3Ph':'1Ph';if(!phases.includes(phase))phase=phases.includes('3Ph')?'3Ph':String(phases[0]||'1Ph');
  const enhanced=explicitEnhanced&&phase==='3Ph',base=String(row.model||'').replace(/[TE]$/i,''),display=enhanced?`${base}E`:phase==='3Ph'?`${base}T`:base,motorEff=phase==='1Ph'?'IE1':'IE2';
  return {family:'BFI',brand:'B.G.Reich',series:String(row.series||'BFI'),model:base,base_model:base,display_model:display,quotation_model:display,motor_kw:Number(row.motor_kw||0),motor_hp:Number(row.motor_hp||0),motor_efficiency_class:motorEff,pole:2,rpm:enhanced?3480:2900,frequency_hz:enhanced?60:50,stages:Number(row.stages||0),connection:String(row.connection||'-'),inlet:String(row.inlet||'-'),outlet:String(row.outlet||'-'),max_pressure_bar:Number(row.max_pressure_bar||0),weight_kg:Number(row.weight_kg||0),motor_phase:phase,enhanced,enhanced_curve:enhanced};
}
function directPumpInfo(model:any){const text=String(model||'');if(/^BFI\b/i.test(text))return directBfiModelInfo(text);if(/^CHC\b|^VMS\b/i.test(text))return directChcModelInfo(text);return null}
function systemTankLitresForSeries(series:any){const value=Number(series)||0;if(value>0&&value<=10)return 24;if(value>=12&&value<=28)return 35;if(value>=32&&value<=90)return 100;if(value>=120&&value<=150)return 200;if(value===200)return 300;return 0}
function manifoldConnectionForHead(head:any){const h=Number(head);if(!(h>0))return {connection:'FLANGE_16',priceCode:'FLANGE_16',pressureBar:null};const bar=h*.0981;if(bar<8)return {connection:'THREAD_8',priceCode:'THREAD_10',pressureBar:bar};if(bar<16)return {connection:'FLANGE_16',priceCode:'FLANGE_16',pressureBar:bar};if(bar<25)return {connection:'FLANGE_25',priceCode:'FLANGE_25',pressureBar:bar};return {connection:'',priceCode:'',pressureBar:bar}}
function systemBomOptions(req:any){const b=req?.system_bom&&typeof req.system_bom==='object'?req.system_bom:{};return {panel_kw:Number(b.panel_kw||0),manifold_dn:String(b.manifold_dn||''),manifold_material:String(b.manifold_material||'GI').toUpperCase()==='SS'?'SS':'GI',inlet_flexible:!!b.inlet_flexible,outlet_flexible:!!b.outlet_flexible,strainer:!!b.strainer,tank_size_litres:Number(b.tank_size_litres||0)}}
async function pricingContextForFamily(service:any,customerId:string,userEmail:string,family:string,brandOverride:string=''){
  const group=normalizeKeyAiPriceGroup(family),brandRef=String(brandOverride||'').trim()||(['BASEPLATE','COUPLING','KEYPLC','MANIFOLD'].includes(group)?'Keylargo':group==='GWS'?'GWS':'B.G.Reich');
  const customerRes=await service.from('ks_customers').select('id,company_name,pricing_category_id,distance_km,status').eq('id',customerId).eq('status','active').maybeSingle();if(customerRes.error||!customerRes.data)throw new Error('Selected customer could not be loaded for pricing.');const customer:any=customerRes.data;if(!customer.pricing_category_id)throw new Error(KEYAI_PRICE_NOT_ASSIGNED);
  const priceAssignment=await requireCustomerPriceAssignment(service,customerId,userEmail,brandRef,group);
  const [categoryRes,settingsRes,pricingRes]=await Promise.all([service.from('ks_pricing_categories').select('*').eq('id',customer.pricing_category_id).maybeSingle(),service.from('ks_app_settings').select('*').eq('id','default').maybeSingle(),service.rpc('keysuite_v41306_get_customer_pricing',{p_user_email:String(userEmail||''),p_customer_id:String(customerId||'')})]);
  if(categoryRes.error||!categoryRes.data)throw new Error('Customer Pricing Category could not be loaded.');if(settingsRes.error)throw new Error('KeySuite pricing settings could not be loaded.');if(pricingRes.error)throw new Error(`Customer-specific pricing could not be loaded: ${pricingRes.error.message||pricingRes.error}`);
  const category:any=categoryRes.data,settings:any=settingsRes.data||{},pricingRow=(Array.isArray(pricingRes.data)?pricingRes.data[0]:pricingRes.data)||{};return {customer,category,settings,rates:productRates(settings,family),rule:pricingRule(category,family),customerRates:customerPricingRow(pricingRow),priceAssignment,ctx:{distanceKm:Number(customer.distance_km||0),fuelPrice:Number(settings.fuel_price??2),fuelBasePrice:Number(settings.fuel_base_price??2)}};
}
function guidedApplyProductIdentity(item:any,product:any){
  const group=String(product?.price_group||'').toUpperCase(),generation=group==='CHC_G1'?'G1':group==='CHC_G2'?'G2':String(item?.generation_code||'');
  return {...item,brand:String(product?.brand_name||item?.brand||''),brand_id:String(product?.brand_id||item?.brand_id||''),keysuite_price_group_code:group,price_group_code:group,...(generation?{generation_code:generation,keysuite_generation_code:generation}:{})};
}
function guidedPriceResultText(customer:any,product:any,item:any){
  const qty=Math.max(1,Number(item?.qty||1)),unit=Number(item?.unit_price||0),model=String(item?.display_model||item?.model||item?.product?.model||product?.product_label||'Product');
  return [`Customer: ${String(customer?.company_name||'')}`,'',item?.supply_scope?`Supply: ${String(item.supply_scope)}`:null,`Brand: ${String(product?.brand_name||item?.brand||'-')}`,`Product: ${String(product?.product_label||product?.price_group||'-')}`,`Model: ${model}`,`Qty: ${qty}`,unit>0?`Unit Price: ${money(unit)}`:'Price: unavailable',unit>0&&qty>1?`Total: ${money(unit*qty)}`:null,item?.pricing?.category_name?`Pricing Category: ${item.pricing.category_name}`:null].filter(Boolean).join('\n');
}
async function quoteChcG1ForCustomer(service:any,customerId:string,userEmail:string,brandRef:string,modelInput:string,qty:any=1){
  // V4.18.07: visible OEM aliases (for example Pumpmax VMS 8-10) resolve
  // to the CHC G1 master model first, while the Customer Price Preference
  // gate uses the exact selling Brand ID whenever the guided Product has one.
  const full=String(modelInput||'').replace(/^VMS\b/i,'CHC').replace(/\s+/g,' ').trim(),material=/^CHCS\b/i.test(full)?'CHCS':/^CHCN\b/i.test(full)?'CHCN':'CHC',base=full.replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC').trim();
  const r=await service.from('ks_products_chc_g1').select('*').ilike('model',base).maybeSingle();if(r.error||!r.data)throw new Error(`No CHC C4 price-list record was found for ${full||base}.`);const row:any=r.data,key=material.toLowerCase(),pc=await pricingContextForFamily(service,customerId,userEmail,'CHC_G1',brandRef),candidates=['USD','RMB','MYR'].map(currency=>{const c=currency.toLowerCase();return {currency,sourcePrice:Number(row[`${key}_${c}`]||0),multiplier:(pc.rates as any)[currency],rarity:row[`${key}_rarity_${c}`]||'common'}}),calc=calculateQuotedPrice(candidates,'',pc.rule,pc.customerRates,pc.ctx);if(!calc)throw new Error(`No valid CHC C4 source price is available for ${full}.`);const count=Math.max(1,Math.trunc(Number(qty)||1));return {family:'CHC',brand:brandRef,series:'CHC C4',generation_code:'G1',keysuite_generation_code:'G1',keysuite_price_group_code:'CHC_G1',model:full,qty:count,unit_price:Number(calc.finalPrice||0),line_total:Number(calc.finalPrice||0)*count,pricing:{product_family:'CHC_G1',product_id:String(row.id||''),material,category_id:String(pc.category?.id||''),category_name:String(pc.category?.category_name||''),price_group:'CHC_G1',price_key:String(pc.priceAssignment?.price_key||''),brand_id:String(pc.priceAssignment?.brand_id||''),source_currency:calc.sourceCurrency,source_price:calc.sourcePrice,currency_multiplier:calc.multiplier,base_myr:calc.baseMyr,rarity:calc.rarity,fixed_price:!!calc.fixedPrice,fuel_charge:Number(calc.fuelCharge||0),calculated_price:Number(calc.finalPrice||0)}};
}
async function findSimpleCatalogMatches(service:any,table:string,hint:string){
  const q=cleanSearch(hint);if(!q)return [];const r=await service.from(table).select('*').eq('active',true).order('source_row').limit(1000);if(r.error)throw new Error(`Product catalogue could not be loaded: ${r.error.message||r.error}`);return (r.data||[]).map((row:any)=>({...row,_score:customerMatchScore(row.model,q)})).filter((row:any)=>row._score<9999).sort((a:any,b:any)=>a._score-b._score||String(a.model).localeCompare(String(b.model))).slice(0,8);
}
async function quoteSimpleCatalogRow(service:any,customerId:string,userEmail:string,brandRef:string,family:string,row:any,qty:any=1){
  const group=normalizeKeyAiPriceGroup(family),pc=await pricingContextForFamily(service,customerId,userEmail,group,brandRef),rarity=pricingRarity(row?.rarity||'common'),candidates=[{currency:'USD',sourcePrice:Number(row?.price_usd||0),multiplier:pc.rates.USD,rarity},{currency:'RMB',sourcePrice:Number(row?.price_rmb||0),multiplier:pc.rates.RMB,rarity},{currency:'MYR',sourcePrice:Number(row?.price_myr||0),multiplier:1,rarity}],calc=calculateQuotedPrice(candidates,rarity,pc.rule,pc.customerRates,pc.ctx);if(!calc)throw new Error(`No valid ${group} source price is available for ${row?.model||'this product'}.`);const count=Math.max(1,Math.trunc(Number(qty)||1));return {family:group,brand:brandRef,series:group,model:String(row?.model||''),qty:count,unit_price:Number(calc.finalPrice||0),line_total:Number(calc.finalPrice||0)*count,pricing:{product_family:group,product_id:String(row?.id||''),category_id:String(pc.category?.id||''),category_name:String(pc.category?.category_name||''),price_group:group,price_key:String(pc.priceAssignment?.price_key||''),brand_id:String(pc.priceAssignment?.brand_id||''),source_currency:calc.sourceCurrency,source_price:calc.sourcePrice,currency_multiplier:calc.multiplier,base_myr:calc.baseMyr,rarity:calc.rarity,fixed_price:!!calc.fixedPrice,fuel_charge:Number(calc.fuelCharge||0),calculated_price:Number(calc.finalPrice||0)}};
}
function parseGuidedBaseplateInput(text:any){
  const raw=String(text||''),compact=raw.replace(/[×X]/g,'x');let c='';if(/3\s*[½.5]\s*['\"]?\s*x\s*8/i.test(compact))c='3½" x 8"';else if(/3\s*[½.5]\s*['\"]?\s*x\s*7/i.test(compact))c='3½" x 7"';else if(/3\s*['\"]?\s*x\s*6/i.test(compact))c='3" x 6"';else if(/2\s*[½.5]\s*['\"]?\s*x\s*5/i.test(compact))c='2½" x 5"';else if(/2\s*['\"]?\s*x\s*4/i.test(compact))c='2" x 4"';else if(/1\s*[½.5]\s*['\"]?\s*x\s*3/i.test(compact))c='1½" x 3"';
  const l=(raw.match(/\bL3\s*[:=]?\s*(\d+(?:\.\d+)?)/i)||[])[1],w=(raw.match(/\bW1\s*[:=]?\s*(\d+(?:\.\d+)?)/i)||[])[1];return {cChannel:c,L3:Number(l||0),W1:Number(w||0)};
}
function baseplateRawCost(settings:any,input:any){
  const d={cChannels:{'1½" x 3"':{pricePerStock:205,labour:150,misc:50},'2" x 4"':{pricePerStock:270,labour:200,misc:100},'2½" x 5"':{pricePerStock:390,labour:250,misc:150},'3" x 6"':{pricePerStock:540,labour:300,misc:200},'3½" x 7"':{pricePerStock:950,labour:350,misc:250},'3½" x 8"':{pricePerStock:1080,labour:400,misc:300}},general:{materialRounding:10,wasteFactor:1.33,stockLengthMm:6000,l3Members:2,w1Members:5,paintPrice:150,paintCoverage:10,thinnerPrice:100,thinnerCoverage:20,weldingRod:0,weldingRodCoverage:1,drillingUnitPrice:5,defaultDrillingQty:22,boltNutUnitPrice:5,defaultBoltNutQty:20,oxygenPrice:500,oxygenCoverage:50}};const raw=settings?.baseplate_costing;let saved:any={};try{saved=typeof raw==='string'?JSON.parse(raw):raw||{}}catch(_){saved={}};const row={...(d.cChannels as any)[input.cChannel],...((saved.cChannels||saved.c_channels||{})[input.cChannel]||{})},g={...d.general,...(saved.general||{})};if(!row||!(input.L3>0)||!(input.W1>0))return 0;const rawMat=((input.L3*Number(g.l3Members||2)+input.W1*Number(g.w1Members||5))*Number(g.wasteFactor||1.33)*Number(row.pricePerStock||0))/Number(g.stockLengthMm||6000),material=Math.ceil(rawMat/Number(g.materialRounding||10))*Number(g.materialRounding||10),paint=Number(g.paintCoverage)>0?Number(g.paintPrice||0)/Number(g.paintCoverage):0,thinner=Number(g.thinnerCoverage)>0?Number(g.thinnerPrice||0)/Number(g.thinnerCoverage):0,welding=Number(g.weldingRodCoverage)>0?Number(g.weldingRod||0)/Number(g.weldingRodCoverage):0,drill=Number(g.defaultDrillingQty||22)*Number(g.drillingUnitPrice||0),bolt=Number(g.defaultBoltNutQty||20)*Number(g.boltNutUnitPrice||0),oxygen=Number(g.oxygenCoverage)>0?Number(g.oxygenPrice||0)/Number(g.oxygenCoverage):0;return material+paint+thinner+welding+drill+bolt+oxygen+Number(row.labour||0)+Number(row.misc||0);
}
async function quoteGuidedBaseplate(service:any,customerId:string,userEmail:string,input:any,qty:any=1){const pc=await pricingContextForFamily(service,customerId,userEmail,'BASEPLATE','Keylargo'),raw=baseplateRawCost(pc.settings,input);if(!(raw>0))throw new Error('Baseplate needs C-channel size, L3 and W1.');const calc=calculateQuotedPrice([{currency:'MYR',sourcePrice:raw,multiplier:1,rarity:'common'}],'common',pc.rule,pc.customerRates,pc.ctx);if(!calc)throw new Error('Baseplate price could not be calculated.');const count=Math.max(1,Math.trunc(Number(qty)||1));return {family:'BASEPLATE',brand:'Keylargo',series:'Baseplate',model:`${input.cChannel} · L3 ${input.L3} · W1 ${input.W1}`,qty:count,unit_price:Number(calc.finalPrice||0),line_total:Number(calc.finalPrice||0)*count,pricing:{category_id:String(pc.category?.id||''),category_name:String(pc.category?.category_name||''),price_group:'BASEPLATE',price_key:String(pc.priceAssignment?.price_key||''),brand_id:String(pc.priceAssignment?.brand_id||'KEYLARGO'),source_currency:'MYR',source_price:raw,calculated_price:Number(calc.finalPrice||0)}};}

const KEYBOT_PIN_COUPLINGS=[
  {model:'FCL 90',torque:4,maxSpeed:4000,maxShaft:25},{model:'FCL 100',torque:10,maxSpeed:4000,maxShaft:28},
  {model:'FCL 112',torque:16,maxSpeed:4000,maxShaft:32},{model:'FCL 125',torque:25,maxSpeed:4000,maxShaft:35},
  {model:'FCL 140',torque:50,maxSpeed:4000,maxShaft:44},{model:'FCL 160',torque:110,maxSpeed:4000,maxShaft:56},
  {model:'FCL 180',torque:157,maxSpeed:3500,maxShaft:63},{model:'FCL 200',torque:250,maxSpeed:3200,maxShaft:70},
  {model:'FCL 224',torque:392,maxSpeed:3000,maxShaft:78},{model:'FCL 250',torque:618,maxSpeed:2550,maxShaft:88},
  {model:'FCL 280',torque:980,maxSpeed:2300,maxShaft:98},{model:'FCL 315',torque:1568,maxSpeed:2050,maxShaft:112},
  {model:'FCL 355',torque:2450,maxSpeed:1800,maxShaft:126},{model:'FCL 400',torque:3920,maxSpeed:1600,maxShaft:140},
  {model:'FCL 450',torque:6174,maxSpeed:1400,maxShaft:157},{model:'FCL 560',torque:9800,maxSpeed:1150,maxShaft:175},
  {model:'FCL 630',torque:15680,maxSpeed:1000,maxShaft:196}
];
const KEYBOT_TYRE_COUPLINGS=[
  {model:'F40',torque:24,maxSpeed:4500,f:'1008',h:'1008'},{model:'F50',torque:66,maxSpeed:4500,f:'1210',h:'1210'},
  {model:'F60',torque:127,maxSpeed:4000,f:'1610',h:'1610'},{model:'F70',torque:250,maxSpeed:3600,f:'2012',h:'1610'},
  {model:'F80',torque:375,maxSpeed:3100,f:'2517',h:'2012'},{model:'F90',torque:500,maxSpeed:3000,f:'2517',h:'2517'},
  {model:'F100',torque:675,maxSpeed:2600,f:'3020',h:'2517'},{model:'F110',torque:875,maxSpeed:2300,f:'3020',h:'3020'},
  {model:'F120',torque:1330,maxSpeed:2050,f:'3525',h:'3020'},{model:'F140',torque:2325,maxSpeed:1800,f:'3525',h:'3525'},
  {model:'F160',torque:3730,maxSpeed:1600,f:'4030',h:'4030'},{model:'F180',torque:6270,maxSpeed:1500,f:'4535',h:'4535'},
  {model:'F200',torque:9325,maxSpeed:1300,f:'4535',h:'4535'},{model:'F220',torque:11600,maxSpeed:1100,f:'5040',h:'5040'}
];
const KEYBOT_BUSH_MAX:any={'1008':24,'1210':32,'1610':42,'2012':50,'2517':65,'3020':75,'3525':90,'4030':100,'4535':110,'5040':125};
const KEYBOT_MOTOR_SHAFT:any={'63':11,'71':14,'80':19,'90S':24,'90L':24,'100L':28,'112M':28,'132S':38,'132M':38,'160M':42,'160L':42,'180M':48,'180L':48,'200L':55,'225S':60,'225M':60,'250M':65,'280S':75,'280M':75,'315S':80,'315M':80,'315L':80,'355M':95,'355L':95,'400M':110,'400L':110};

function keybotBaseplateChannel(value:any){
  const raw=String(value||'').replace(/X/gi,'x').replace(/\s+/g,' ').trim();
  const m=raw.match(/(\d+(?:½|\.5)?)\s*"?\s*x\s*(\d+(?:½|\.5)?)"?/i);
  if(!m)return raw;
  const a=m[1].replace('.5','½'),b=m[2].replace('.5','½');return `${a}" x ${b}"`;
}
function keybotMotorShaft(frame:any){const base=String(frame||'').replace(/-\d+\s*$/,'').trim();return Number(KEYBOT_MOTOR_SHAFT[base]||0)}
function keybotEsAutoCoupling(pumpShaft:any,motorFrame:any,motorKw:any,motorRpm:any){
  const ps=Number(pumpShaft||0),ms=keybotMotorShaft(motorFrame),kw=Number(motorKw||0),rpm=Number(motorRpm||0),torque=kw>0&&rpm>0?kw*9550/rpm:0;
  const pin=KEYBOT_PIN_COUPLINGS.find((x:any)=>ps<=x.maxShaft&&ms<=x.maxShaft&&torque<=x.torque&&rpm<=x.maxSpeed);
  if(pin)return {mode:'flexible',type:'pin_bush',model:pin.model,bushes:[],pump_shaft_mm:ps,motor_shaft_mm:ms,required_torque_nm:torque,rpm};
  for(const x of KEYBOT_TYRE_COUPLINGS){
    if(torque>x.torque||rpm>x.maxSpeed)continue;
    const arrangements=ps>24?[{pump:x.h,motor:x.f},{pump:x.f,motor:x.h}]:[{pump:x.f,motor:x.h}];
    const ok=arrangements.find((a:any)=>ps<=Number(KEYBOT_BUSH_MAX[a.pump]||0)&&ms<=Number(KEYBOT_BUSH_MAX[a.motor]||0));
    if(ok)return {mode:'flexible',type:'tyre',model:x.model,bushes:[ok.pump,ok.motor],pump_shaft_mm:ps,motor_shaft_mm:ms,required_torque_nm:torque,rpm};
  }
  return {mode:'flexible',type:'',model:'No suitable coupling',bushes:[],pump_shaft_mm:ps,motor_shaft_mm:ms,required_torque_nm:torque,rpm,warning:'No suitable coupling model was resolved automatically.'};
}

function keybotEsCouplingTypeLabel(value:any){return String(value||'').toLowerCase()==='tyre'?'Tyre':'FCL'}
function keybotEsCouplingChoiceLabel(choice:any,index:number){return `${String(choice?.model||'Coupling')}${index===0?' — Recommended':''}`}
function keybotEsCouplingChoiceKeyboard(choices:any[]){const rows:any[]=[];for(let i=0;i<choices.length;i+=2)rows.push(choices.slice(i,i+2).map((x:any,j:number)=>keybotEsCouplingChoiceLabel(x,i+j)));rows.push(['⬅️ Back','🔄 New Request']);return telegramReplyKeyboard(rows)}
async function keybotEsCouplingChoices(service:any,type:any,bom:any){
  const normalized=String(type||'').toLowerCase()==='tyre'?'tyre':'pin_bush',current=bom?.coupling||{},ps=Number(current.pump_shaft_mm||0),ms=Number(current.motor_shaft_mm||keybotMotorShaft(bom?.motor?.frame)),rpm=Number(current.rpm||bom?.motor?.rpm||0),kw=Number(bom?.motor?.kw||0),torque=Number(current.required_torque_nm||(kw>0&&rpm>0?kw*9550/rpm:0));
  let activeSet:Set<string>|null=null;try{const r=await service.from('ks_products_coupling').select('model,component_type').eq('active',true).eq('component_type',normalized).limit(1000);if(!r.error)activeSet=new Set((r.data||[]).map((x:any)=>String(x.model||'').toUpperCase()))}catch(_){}
  const active=(model:any)=>!activeSet||!activeSet.size||activeSet.has(String(model||'').toUpperCase());
  if(normalized==='pin_bush')return KEYBOT_PIN_COUPLINGS.filter((x:any)=>active(x.model)&&ps<=Number(x.maxShaft||0)&&ms<=Number(x.maxShaft||0)&&torque<=Number(x.torque||0)&&rpm<=Number(x.maxSpeed||0)).map((x:any)=>({type:'pin_bush',model:x.model,bushes:[],pump_shaft_mm:ps,motor_shaft_mm:ms,required_torque_nm:torque,rpm}));
  const out:any[]=[];for(const x of KEYBOT_TYRE_COUPLINGS){if(!active(x.model)||torque>Number(x.torque||0)||rpm>Number(x.maxSpeed||0))continue;const arrangements=ps>24?[{pump:x.h,motor:x.f},{pump:x.f,motor:x.h}]:[{pump:x.f,motor:x.h},{pump:x.h,motor:x.f}];const ok=arrangements.find((a:any)=>ps<=Number(KEYBOT_BUSH_MAX[a.pump]||0)&&ms<=Number(KEYBOT_BUSH_MAX[a.motor]||0));if(ok)out.push({type:'tyre',model:x.model,bushes:[ok.pump,ok.motor],pump_shaft_mm:ps,motor_shaft_mm:ms,required_torque_nm:torque,rpm})}return out;
}
function keybotEsManualCouplingSelection(coupling:any){if(!coupling||coupling.auto!==false)return null;return {type:String(coupling.type||(/^FCL\b/i.test(String(coupling.model||''))?'pin_bush':'tyre')),model:String(coupling.model||''),bushes:Array.isArray(coupling.bushes)?coupling.bushes:[],pump_shaft_mm:Number(coupling.pump_shaft_mm||0),motor_shaft_mm:Number(coupling.motor_shaft_mm||0),required_torque_nm:Number(coupling.required_torque_nm||0),rpm:Number(coupling.rpm||0)} }
function keybotEsMotorInput(text:any,bom:any){
  const raw=String(text||'').trim();if(/^auto$/i.test(raw))return {auto:true};
  const kw=Number((raw.match(/(\d+(?:\.\d+)?)\s*k\s*w/i)||[])[1]||0),hp=Number((raw.match(/(\d+(?:\.\d+)?)\s*h\s*p/i)||[])[1]||0),eff=String((raw.match(/\b(IE5|IE4|IE3|IE2|IE)\b/i)||[])[1]||bom?.motor?.efficiency_class||'IE3').toUpperCase();
  return {kw,hp,efficiency_class:eff};
}
function guidedEsAssemblyText(bom:any,customer:any=null){
  const p=bom?.pump||{},m=bom?.motor||{},c=bom?.coupling||{},b=bom?.baseplate||{},lines:any[]=[];
  if(customer?.company_name)lines.push(`Customer: ${customer.company_name}`,'');
  lines.push('ES Pumpset BOM','',`Pump: ${p.brand?`${p.brand} - `:''}${p.display_model||p.model||'-'}`);
  lines.push(`Pump Material: ${pumpOptions(p?.options,p?.qty).material}`);
  lines.push(`Motor: ${m.model||'-'} · ${oneDecimal(m.kw||0)} kW / ${oneDecimal(m.hp||0)} HP · ${Number(m.pole||2)}P · ${m.efficiency_class||'IE3'}`);
  lines.push(`Coupling: ${c.model||'-'}${Array.isArray(c.bushes)&&c.bushes.length?` · Bush ${c.bushes.join(' + ')}`:''}`);
  lines.push(`Baseplate: ${b.model||'-'}`);
  if(bom?.priced){
    lines.push('',`Pump Price: ${bom.prices?.pump>0?money(bom.prices.pump):'unavailable'}`,`Motor Price: ${bom.prices?.motor>0?money(bom.prices.motor):'unavailable'}`,`Coupling Price: ${bom.prices?.coupling>0?money(bom.prices.coupling):'unavailable'}`,`Baseplate Price: ${bom.prices?.baseplate>0?money(bom.prices.baseplate):'unavailable'}`);
    lines.push(bom?.total>0?`Pumpset Total: ${money(bom.total)}`:`Pumpset Total: unavailable${bom?.missing_prices?.length?` (${bom.missing_prices.join(', ')} price missing)`:''}`);
  }else lines.push('','Tap Pump / Motor / Coupling / Baseplate to amend the BOM.');
  return lines.join('\n');
}
function keybotEsAssemblyBuild(item:any,overrides:any={}){
  const source={...item},pole=Number(overrides.pole||source.pole||2),eff=String(overrides.motor_efficiency_class||'IE3').toUpperCase(),model=String(overrides.pump_model||source.model||'').replace(/^ES\s+/i,'').trim();
  let motorKw=Number(overrides.motor_kw||0),motorHp=Number(overrides.motor_hp||0);if(!(motorKw>0)&&!(motorHp>0)){motorKw=Number(source.motor_kw||0);motorHp=Number(source.motor_hp||0)}
  let ps:any=null;try{if(KEYBOT_ES_MB?.calculateEsPumpset)ps=KEYBOT_ES_MB.calculateEsPumpset({model:`ES ${model}`,motorKw:motorKw||undefined,motorHp:motorHp||undefined,pole,efficiencyClass:eff,voltage:415,phase:'3Ph',hz:50})}catch(_){}
  const motor=ps?.available?{model:String(ps.motor?.model||`${oneDecimal(motorKw)} kW Motor`),kw:Number(ps.motor?.kw||motorKw),hp:Number(ps.motor?.hp||motorHp),pole,efficiency_class:eff,rpm:Number(ps.motor?.rpm||source.rpm||0),frame:String(ps.motor?.frame||'')}:{model:`${oneDecimal(motorKw)} kW ${pole}P ${eff}`,kw:motorKw,hp:motorHp,pole,efficiency_class:eff,rpm:Number(source.rpm||0),frame:''};
  const base=ps?.available?{auto:true,cChannel:keybotBaseplateChannel(ps.baseplate?.cChannel),L3:Number(ps.dimensions?.longitudinal?.L3||0),W1:Number(ps.dimensions?.width?.W1||0),frame:Number(ps.baseplate?.frame||0),model:`Baseplate ${Number(ps.baseplate?.frame||0)} · ${keybotBaseplateChannel(ps.baseplate?.cChannel)} · L3 ${Number(ps.dimensions?.longitudinal?.L3||0)} · W1 ${Number(ps.dimensions?.width?.W1||0)}`}:{auto:true,cChannel:'',L3:0,W1:0,frame:0,model:'Auto Baseplate'};
  const customBase=overrides.baseplate&&typeof overrides.baseplate==='object'?overrides.baseplate:null,baseplate=customBase?{...base,...customBase,auto:false,model:`${customBase.cChannel} · L3 ${customBase.L3} · W1 ${customBase.W1}`} : base;
  const autoCoupling=keybotEsAutoCoupling(Number(ps?.pump?.shaft||0),motor.frame,motor.kw,motor.rpm),couplingModel=String(overrides.coupling_model||'').trim(),selectedCoupling=overrides.coupling_selection&&typeof overrides.coupling_selection==='object'?overrides.coupling_selection:null,coupling=selectedCoupling?{...autoCoupling,...selectedCoupling,auto:false}:couplingModel?{...autoCoupling,auto:false,model:couplingModel,bushes:[]}:{...autoCoupling,auto:true};
  const pump={...source,family:'ES',model:`ES ${model}`,display_model:String(overrides.pump_display_model||source.display_model||`ES ${model}`),pole,motor_kw:motor.kw,motor_hp:motor.hp};
  return {family:'ES',source_item:source,pump,motor,coupling,baseplate,duty:{flow_m3h:Number(source.requested_flow_m3h||0),head_m:Number(source.requested_head_m||0)},priced:false,prices:{pump:0,motor:0,coupling:0,baseplate:0},total:0,missing_prices:[]};
}
async function keybotExactActiveRow(service:any,table:string,model:any){
  const name=String(model||'').trim();if(!name)return null;let r=await service.from(table).select('*').eq('active',true).ilike('model',name).maybeSingle();if(!r.error&&r.data)return r.data;
  const all=await service.from(table).select('*').eq('active',true).limit(1000);if(all.error)return null;return (all.data||[]).find((x:any)=>cleanSearch(x.model)===cleanSearch(name))||null;
}
async function quoteKeybotEsAssembly(service:any,customer:any,user:any,product:any,bom:any){
  const cid=String(customer?.id||''),email=String(user?.email||'');if(!cid||!email)throw new Error('Customer is required before checking the ES Pumpset price.');
  const missing:string[]=[],prices:any={pump:0,motor:0,coupling:0,baseplate:0},priced:any={...bom};
  try{const pump=await quotePumpForCustomer(service,cid,guidedApplyProductIdentity({...bom.pump,qty:1},product),email);prices.pump=Number(pump.unit_price||0);priced.pump={...bom.pump,priced_item:pump}}catch(_){missing.push('Pump')}
  try{const row=await keybotExactActiveRow(service,'ks_products_motor',bom.motor?.model);if(!row)throw new Error('Motor model not found');const item=await quoteSimpleCatalogRow(service,cid,email,'','MOTOR',row,1);prices.motor=Number(item.unit_price||0);priced.motor={...bom.motor,priced_item:item}}catch(_){missing.push('Motor')}
  try{
    const models=[String(bom.coupling?.model||''),...(Array.isArray(bom.coupling?.bushes)?bom.coupling.bushes:[])].filter(Boolean);let total=0;const items:any[]=[];
    for(const model of models){const row=await keybotExactActiveRow(service,'ks_products_coupling',model);if(!row)throw new Error(`Coupling ${model} not found`);const q=await quoteSimpleCatalogRow(service,cid,email,'','COUPLING',row,1);total+=Number(q.unit_price||0);items.push(q)}
    if(!(total>0))throw new Error('Coupling price unavailable');prices.coupling=total;priced.coupling={...bom.coupling,priced_items:items};
  }catch(_){missing.push('Coupling')}
  try{const b=bom.baseplate||{};if(!b.cChannel||!(Number(b.L3)>0)||!(Number(b.W1)>0))throw new Error('Baseplate data incomplete');const item=await quoteGuidedBaseplate(service,cid,email,{cChannel:keybotBaseplateChannel(b.cChannel),L3:Number(b.L3),W1:Number(b.W1)},1);prices.baseplate=Number(item.unit_price||0);priced.baseplate={...bom.baseplate,priced_item:item}}catch(_){missing.push('Baseplate')}
  const total=Object.values(prices).reduce((sum:any,v:any)=>Number(sum)+Number(v||0),0);return {...priced,priced:true,prices,total:missing.length?0:total,component_total:total,missing_prices:missing};
}
function guidedNoCurvePrompt(product:any){const g=String(product?.price_group||'').toUpperCase();if(g==='GWS')return 'This product has no hydraulic curve. Please enter the GWS Tank model or size for price.\nExample: 100L 10 bar';if(g==='MOTOR')return 'This product has no hydraulic curve. Please enter the Motor model for price.';if(g==='COUPLING')return 'This product has no hydraulic curve. Please enter the Coupling model for price.';if(g==='KEYPLC')return 'This product has no hydraulic curve. Please enter motor kW and pump quantity for the KeyPLC Panel price.\nExample: 18.5kW, 2 pumps';if(g==='MANIFOLD')return 'This product has no hydraulic curve. Please enter pump DN, pump quantity and design head.\nExample: DN50, 2 pumps, 80m';if(g==='BASEPLATE')return 'This product has no hydraulic curve. Please enter C-channel, L3 and W1.\nExample: 2 x 4, L3 1200, W1 500';return 'This product has no hydraulic curve. Please enter the model/details for price.';}

async function quoteKeyplcPanel(service:any,customerId:string,userEmail:string,motorKw:number,pumpQty:number,manualKw=0){
  const r=await service.from('ks_products_keyplc').select('*').eq('status','active').order('source_row').limit(1000);if(r.error)throw new Error(`KeyPLC catalogue could not be loaded: ${r.error.message||r.error}`);const need=Math.max(Number(motorKw)||0,Number(manualKw)||0),rows=(r.data||[]).filter((p:any)=>Number(p.motor_kw||String(p.model||'').replace(/[^0-9.]/g,''))>=need-1e-9).sort((a:any,b:any)=>Number(a.motor_kw||0)-Number(b.motor_kw||0));const p:any=rows[0]||null;if(!p)return null;
  const qty=Math.max(1,Math.min(6,Math.trunc(Number(pumpQty)||1))),v=variantArray(p.variants).find((x:any)=>variantQty(x)===qty);if(!v)return {product:p,qty,unit_price:0,price_missing:true};
  if(!customerId)return {product:p,qty,unit_price:0,price_missing:false};const pc=await pricingContextForFamily(service,customerId,userEmail,'KEYPLC');const candidates=['USD','RMB','MYR'].map(c=>({currency:c,sourcePrice:variantPrice(v,c),multiplier:(pc.rates as any)[c],rarity:p.rarity||'common'}));const calc=calculateQuotedPrice(candidates,p.rarity||'common',pc.rule,pc.customerRates,pc.ctx);if(!calc)return {product:p,qty,unit_price:0,price_missing:true};return {product:p,qty,unit_price:Number(calc.finalPrice||0),price_missing:false,pricing:calc};
}
async function manifoldSystemComponent(service:any,customerId:string,userEmail:string,pump:any,pumpQty:number,req:any){
  const rowsRes=await service.from('ks_products_manifold').select('*').eq('status','active').order('section').order('source_row').limit(2000);if(rowsRes.error)throw new Error(`Manifold catalogue could not be loaded: ${rowsRes.error.message||rowsRes.error}`);const rows:any[]=rowsRes.data||[],bom=systemBomOptions(req),pumpDn=`DN${Number(pump.connection_dn||0)}`,conn=manifoldConnectionForHead(pump.shutoff_head_m);if(!pumpDn||pumpDn==='DN0'||!conn.connection)return {model:'Manifold',price_missing:true,warning:'Automatic manifold sizing requires a valid pump connection and shutoff pressure.'};
  const by=(section:string,model:string)=>rows.find(x=>String(x.section)==section&&String(x.model||'').toUpperCase()===String(model).toUpperCase());const findV=(p:any,key:any)=>variantArray(p?.variants).find((v:any)=>variantCode(v)===String(key)||Number(variantQty(v))===Number(key));
  const sizing=by('sizing',pumpDn),sv=findV(sizing,Math.max(1,Math.min(6,pumpQty))),autoDn=String(sv?.resultDn||KEYSUITE_MANIFOLD_FALLBACK[pumpDn]?.[Math.max(1,Math.min(6,pumpQty))-1]||''),headerDn=String(bom.manifold_dn||autoDn);if(!headerDn)return {model:'Manifold',price_missing:true,warning:'No manifold header size could be resolved.'};
  const material=bom.manifold_material==='SS'?'SS':'GI',code=`${material}_${conn.priceCode}`,branch=by('branch',pumpDn),bv=findV(branch,code),header=by('header',`${material} ${headerDn}`),hv=findV(header,Math.max(1,Math.min(6,pumpQty)));const options={material,inlet_flexible:bom.inlet_flexible,outlet_flexible:bom.outlet_flexible,strainer:bom.strainer};let accessoryAddon=0;const missing:string[]=[];
  const baseCandidates=['USD','RMB','MYR'].map(currency=>{const bp=variantPrice(bv,currency),hp=variantPrice(hv,currency);if(!(bp>0)||!(hp>0))return {currency,sourcePrice:0,multiplier:1,rarity:'common'};return {currency,sourcePrice:bp*pumpQty+hp,multiplier:1,rarity:'common'}});
  if(customerId){const pc=await pricingContextForFamily(service,customerId,userEmail,'MANIFOLD');baseCandidates.forEach((x:any)=>x.multiplier=(pc.rates as any)[x.currency]);const acc=(section:string)=>{const row=by(section,pumpDn),v=findV(row,code);if(!v)return null;const cand=['USD','RMB','MYR'].map(c=>({currency:c,sourcePrice:variantPrice(v,c),multiplier:(pc.rates as any)[c]})).filter(x=>x.sourcePrice>0);if(!cand.length)return null;return cand.reduce((a,b)=>!a||b.sourcePrice*b.multiplier>a.sourcePrice*a.multiplier?b:a,null)};for(const [enabled,section,label] of [[options.strainer,'strainer','Strainer'],[options.inlet_flexible,'flexible','Inlet Flexible'],[options.outlet_flexible,'flexible','Outlet Flexible']] as any[]){if(!enabled)continue;const a:any=acc(section);if(!a)missing.push(label);else accessoryAddon+=Number(a.sourcePrice)*Number(a.multiplier)*pumpQty}const calc=calculateQuotedPrice(baseCandidates,'common',pc.rule,pc.customerRates,pc.ctx);const base=Number(calc?.finalPrice||0);return {model:`${material} Manifold ${headerDn}`,material,header_dn:headerDn,pump_dn:pumpDn,connection:conn.connection,options,unit_price:base+accessoryAddon,accessory_addon:accessoryAddon,price_missing:!calc||missing.length>0,missing};}
  return {model:`${material} Manifold ${headerDn}`,material,header_dn:headerDn,pump_dn:pumpDn,connection:conn.connection,options,unit_price:0,price_missing:false,missing};
}
async function autoGwsSystemTank(service:any,customerId:string,userEmail:string,pump:any,req:any){const bom=systemBomOptions(req),auto=systemTankLitresForSeries(pump.series_no),litres=Number(bom.tank_size_litres||auto),minimumBar=Number(pump.shutoff_head_m||0)*.0981;if(!(litres>0))return {model:'GWS Tank',size_litres:0,pressure_bar:0,unit_price:0,price_missing:true,warning:'No automatic tank size rule matched this pump series.'};const r=await service.from('ks_products_gws').select('*').eq('status','active').eq('size_litres',litres).order('pressure_bar').limit(100);if(r.error)throw new Error(`GWS Tank catalogue could not be loaded: ${r.error.message||r.error}`);const p:any=(r.data||[]).filter((x:any)=>Number(x.pressure_bar||0)>minimumBar+1e-9).sort((a:any,b:any)=>Number(a.pressure_bar||0)-Number(b.pressure_bar||0))[0]||null;if(!p)return {model:`GWS ${litres}L`,size_litres:litres,pressure_bar:0,unit_price:0,price_missing:true,warning:`No ${litres}L GWS Tank above ${minimumBar.toFixed(1)} bar is available.`};if(!customerId)return {model:String(p.model||''),size_litres:Number(p.size_litres||litres),pressure_bar:Number(p.pressure_bar||0),unit_price:0,price_missing:false,product:p};const priced=await quoteGwsForCustomer(service,customerId,p,1,userEmail);return {model:priced.model,size_litres:priced.tank_size_litres,pressure_bar:priced.tank_pressure_bar,unit_price:priced.unit_price,price_missing:false,product:p,pricing:priced.pricing};}
async function buildKeyplcSystem(service:any,request:any,customer:any=null,user:any=null){const req=mergeQuoteRequest({},request),qty=Math.max(1,Math.min(6,Math.trunc(Number(req.system_pump_qty||2)||2))),opts=mergePumpOptions({},req.options,qty);let pump:any=null;if(req.selected_pump_item&&String(req.selected_pump_item?.family||'').toUpperCase()==='CHC'){const selected={...req.selected_pump_item},selectedMaster=String(selected.model||selected.display_model||'').replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC'),selectedTech=directPumpInfo(selectedMaster)||{};pump={...selectedTech,...selected}}else if(req.direct_model){pump=directPumpInfo(req.direct_model);if(!pump)throw new Error(`Pump model ${req.direct_model} was not found in the KeySuite CHC/VMS database.`)}else if(Number(req.flow_m3h)>0&&Number(req.head_m)>0&&simplePumpFamilyCode(req)==='CHC'){const s:any=selectPumpSummary('CHC',Number(req.flow_m3h),Number(req.head_m),0);pump={...directPumpInfo(s.model),...s}}else throw new Error('KeyPLC needs an exact CHC/VMS model or a complete CHC duty point.');pump=applyPumpOptionsToItem({...pump,qty},opts);const cid=String(customer?.id||''),email=String(user?.email||''),pumpPriced=cid?await quotePumpForCustomer(service,cid,pump,email,{skipSetDiscount:true}):pump,bom=systemBomOptions(req),panel=await quoteKeyplcPanel(service,cid,email,Number(pump.motor_kw||0),qty,bom.panel_kw),manifold=await manifoldSystemComponent(service,cid,email,pump,qty,req),tank=await autoGwsSystemTank(service,cid,email,pump,req);const linePump=Number(pumpPriced.unit_price||0)*qty,total=linePump+Number(panel?.unit_price||0)+Number(manifold?.unit_price||0)+Number(tank?.unit_price||0),missing=[panel?.price_missing?'KeyPLC Panel':null,manifold?.price_missing?'Manifold':null,tank?.price_missing?'GWS Tank':null,cid&&!Number(pumpPriced.unit_price||0)?'Pump':null].filter(Boolean);return {system_type:'KEYPLC',pump_qty:qty,operation:`1 Duty + ${Math.max(0,qty-1)} On Demand`,control:'VFD + HMI',pump:pumpPriced,panel,manifold,tank,customer_name:String(customer?.company_name||''),system_total:cid&&!missing.length?total:0,price_missing:!!missing.length,missing_prices:missing,request:req};}
function keyplcBomText(bom:any){const p=bom?.pump||{},panel=bom?.panel||{},m=bom?.manifold||{},t=bom?.tank||{},priced=!!bom?.customer_name,pumpMaterial=pumpOptions(p?.options,p?.qty).material;const lines=['System Assembly BOM','',`KeyPLC ${bom.pump_qty}-Pump System`,`Operation: ${bom.operation}`,`Control: VFD + HMI`,bom?.request?.duty_text?`Duty: ${bom.request.duty_text}`:null,'',`Pump: ${bom.pump_qty} × ${p.display_model||p.model||'-'}${Number(p.motor_kw)>0?` · ${inputNumber(p.motor_kw)} kW / ${inputNumber(p.motor_hp)} HP`:''}${pumpMaterial&&pumpMaterial!=='Standard'?` · ${pumpMaterial}`:''}`,priced&&Number(p.unit_price)>0?`Pump Price: ${money(p.unit_price)} each · ${money(Number(p.unit_price)*bom.pump_qty)}`:null,`Panel: KeyPLC ${panel?.product?.model||'-'} · ${bom.pump_qty} Pumps · VFD + HMI`,priced&&Number(panel.unit_price)>0?`Panel Price: ${money(panel.unit_price)}`:null,`Manifold: ${m.model||'-'} · Pump ${m.pump_dn||'-'}${m.options?.inlet_flexible?' · Inlet Flexible':''}${m.options?.outlet_flexible?' · Outlet Flexible':''}${m.options?.strainer?' · Strainer':''}`,priced&&Number(m.unit_price)>0?`Manifold Price: ${money(m.unit_price)}`:null,`GWS Tank: ${t.model||'-'}${Number(t.size_litres)>0?` · ${inputNumber(t.size_litres)}L`:''}${Number(t.pressure_bar)>0?` · ${inputNumber(t.pressure_bar)} bar`:''}`,priced&&Number(t.unit_price)>0?`Tank Price: ${money(t.unit_price)}`:null,priced?'':null,priced&&!bom.price_missing?`System Total: ${money(bom.system_total)}`:priced&&bom.price_missing?`System Total: unavailable (${bom.missing_prices.join(', ')} price missing)`:null].filter(x=>x!==null&&x!==undefined&&x!=='');if(bom.customer_name)lines.unshift(`Customer: ${bom.customer_name}`,'');return lines.join('\n')}
function keyplcResultMenu(hasCustomer=false){return hasCustomer?telegramReplyKeyboard([['✏️ Edit BOM'],['⬅️ Back','🔄 New Request']]):telegramReplyKeyboard([['✏️ Edit BOM','💰 Check Price'],['⬅️ Back','🔄 New Request']])}
function keyplcEditMenu(){return telegramReplyKeyboard([['💧 Pump','⚡ Panel'],['🔩 Manifold','🛢️ Tank'],['✅ Done'],['⬅️ Back','🔄 New Request']])}
function keyplcPumpMenu(bom:any){return telegramReplyKeyboard([['Model','No. of Pumps'],['⬅️ Back','🔄 New Request']])}
function keyplcManifoldMenu(bom:any){const o=bom?.manifold?.options||{},material=String(bom?.manifold?.material||o.material||'GI').toUpperCase()==='SS'?'SS':'GI';return telegramReplyKeyboard([['Size',`Material: ${material}`],[`${o.inlet_flexible?'✅':'⬜'} Inlet Flexible`,`${o.outlet_flexible?'✅':'⬜'} Outlet Flexible`],[`${o.strainer?'✅':'⬜'} Strainer`],['⬅️ Back','🔄 New Request']])}
async function sendKeyplcSystem(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,request:any,customer:any=null,user:any=null){try{const bom=await buildKeyplcSystem(service,request,customer,user);const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'keyplc',step:'keyplc_result',selected_customer_id:customer?String(customer.id):null,context:{...sessionContext(session),keysuite_user_email:String(user?.email||''),customer_name:String(customer?.company_name||''),keyplc_request:bom.request,keyplc_bom:bom}});await telegramSend(telegramToken,chatId,keyplcBomText(bom),keyplcResultMenu(!!customer));return saved}catch(error){await telegramSend(telegramToken,chatId,`KeyPLC system could not be prepared.\n\n${error instanceof Error?error.message:String(error)}`,telegramReplyKeyboard([['⬅️ Back','🔄 New Request']]));return session}}
async function resolveKeyplcCustomer(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,user:any,query:string,request:any){const matches=await findAllowedCustomers(service,companyId,user,query);if(!matches.length){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'keyplc',step:'keyplc_waiting_company',selected_customer_id:null,context:{...sessionContext(session),keysuite_user_email:user.email,keyplc_request:request,customer_choices:[]}});await telegramSend(telegramToken,chatId,`No customer matched “${query}”.\nPlease type another part of the company name.`,guidedInputNavMenu());return saved}const exact=matches.find((x:any)=>cleanSearch(x.company_name)===cleanSearch(query));if(exact||matches.length===1)return await sendKeyplcSystem(service,telegramToken,companyId,chatId,senderId,session,request,exact||matches[0],user);const choices=matches.map((x:any)=>({id:String(x.id),label:String(x.company_name).slice(0,55)}));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'keyplc',step:'keyplc_waiting_company',selected_customer_id:null,context:{...sessionContext(session),keysuite_user_email:user.email,keyplc_request:request,customer_choices:choices}});await telegramSend(telegramToken,chatId,`I found ${matches.length} similar customers for “${query}”.\nPlease confirm which customer you mean:`,telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return saved}
function sessionContext(session:any){
  const c=session?.context;return c&&typeof c==='object'&&!Array.isArray(c)?{...c}:{};
}
function draftItemsFrom(session:any){const c=sessionContext(session);return Array.isArray(c.draft_items)?c.draft_items.slice(0,50):[];}
function persistentDraftMenu(){return telegramReplyKeyboard([['➕ Add Another Item','✏️ Edit Item'],['🗑 Remove Item','📄 Create Quotation'],['❌ Cancel Draft','⬅️ Main Menu']])}
function draftItemButtonLabel(item:any,index:number){return `${index+1}. ${String(item?.model||'Item').slice(0,42)}`}
async function loadPersistentDraft(service:any,companyId:string,draftId:string){if(!draftId)return null;const r=await service.from('ks_keybot_quote_drafts_v41309').select('*').eq('company_id',companyId).eq('id',draftId).maybeSingle();return r.error?null:r.data}
async function ensurePersistentDraft(service:any,companyId:string,chatId:string,senderId:string,userEmail:string,customerId:string,customerName:string,items:any[]=[],preferredId:string=''){
  if(preferredId){const existing=await loadPersistentDraft(service,companyId,preferredId);if(existing&&existing.status==='active'&&String(existing.customer_id)===String(customerId)){const nextItems=Array.isArray(items)&&items.length?items:(Array.isArray(existing.items)?existing.items:[]);const u=await service.from('ks_keybot_quote_drafts_v41309').update({user_email:userEmail,customer_name:customerName,items:nextItems,updated_at:new Date().toISOString()}).eq('id',existing.id).select('*').single();if(!u.error)return u.data}}
  const found=await service.from('ks_keybot_quote_drafts_v41309').select('*').eq('company_id',companyId).eq('channel','telegram').eq('sender_id',senderId).eq('user_email',userEmail).eq('customer_id',customerId).eq('status','active').order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(!found.error&&found.data){const nextItems=Array.isArray(items)&&items.length?items:(Array.isArray(found.data.items)?found.data.items:[]);const u=await service.from('ks_keybot_quote_drafts_v41309').update({chat_id:chatId,customer_name:customerName,items:nextItems,updated_at:new Date().toISOString()}).eq('id',found.data.id).select('*').single();if(!u.error)return u.data}
  const ins=await service.from('ks_keybot_quote_drafts_v41309').insert({company_id:companyId,channel:'telegram',chat_id:chatId,sender_id:senderId,user_email:userEmail,customer_id:customerId,customer_name:customerName,items:Array.isArray(items)?items:[],status:'active',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}).select('*').single();if(ins.error)throw ins.error;return ins.data;
}
async function persistDraftItems(service:any,companyId:string,chatId:string,senderId:string,session:any,items:any[]){const c=sessionContext(session),draft=await ensurePersistentDraft(service,companyId,chatId,senderId,String(c.keysuite_user_email||''),String(session?.selected_customer_id||''),String(c.customer_name||'Selected Customer'),items,String(c.active_draft_id||''));return draft}
function quoteItemForKeySuite(item:any){
  const family=String(item?.family||'').toUpperCase(),qty=Math.max(1,Math.trunc(Number(item?.qty)||1)),unitPrice=Number(item?.unit_price||0),pricingSource=item?.pricing||null;
  if(family==='GWS')return {model:String(item?.model||''),qty,unit:'Unit',unitPrice,productFamily:'GWS',description:[`Keylargo GWS Tank Model: ${String(item?.model||'')}`,Number(item?.tank_size_litres)>0?`Capacity: ${inputNumber(item.tank_size_litres)} Litres`:null,Number(item?.tank_pressure_bar)>0?`Pressure: ${inputNumber(item.tank_pressure_bar)} Bar`:null].filter(Boolean).join('\n'),pricingSource};
  const o=pumpOptions(item?.options,qty),kw=Number(item?.motor_kw||0),hp=Number(item?.motor_hp||0),pole=Number(item?.pole||2)||2,brand=String(item?.brand||'B.G.Reich'),series=family==='ES'?`End Suction Pump`:`Vertical Multistage Pump`,desc=[`${brand} ${series} Model: ${String(item?.model||'')}`,o.bare_shaft?'(Bare shaft pump)':(kw>0?`c/w ${hp>0?`${oneDecimal(hp)} HP / `:''}${oneDecimal(kw)} kW ${pole} Pole ${o.motor_efficiency} Motor (415 V / 3 Ph / 50 Hz)`:null),`Material: ${o.material} / Mech Seal - ${o.seal}/${o.elastomer}`,`Connection: ${o.connection}`].filter(Boolean).join('\n');
  return {model:String(item?.model||''),qty,unit:'Unit',unitPrice,productFamily:family,description:desc,displayCapacity:true,capacityValue:String(Number(item?.requested_flow_m3h||0)),capacityUnit:'m³/hr',headValue:String(Number(item?.requested_head_m||0)),headUnit:'Mtr',pumpData:item,pricingSource};
}
async function createSavedQuotationFromDraft(service:any,companyId:string,draft:any){
  if(!draft||!Array.isArray(draft.items)||!draft.items.length)throw new Error('The draft has no items.');
  const customer=await service.from('ks_customers').select('id,company_name,contacts,payment_terms').eq('id',draft.customer_id).eq('company_id',companyId).eq('status','active').maybeSingle();if(customer.error||!customer.data)throw new Error('Draft customer could not be loaded.');
  const profile=await service.from('ks_user_profiles').select('display_name,designation,signatory_name,signature_image').ilike('email',String(draft.user_email||'')).maybeSingle();const pr=profile.data||{};const contacts=Array.isArray(customer.data.contacts)?customer.data.contacts:[],contact=contacts[0]||{};
  const items=draft.items.map((x:any)=>quoteItemForKeySuite(x)),total=items.reduce((sum:number,x:any)=>sum+Number(x.unitPrice||0)*Number(x.qty||1),0),now=new Date().toISOString();
  const quote:any={id:crypto.randomUUID(),date:now.slice(0,10),documentType:'Quotation',customerId:String(draft.customer_id),contactIndex:contacts.length?'0':'',printedCompany:String(customer.data.company_name||draft.customer_name||''),printedContact:[contact.prefix,contact.name].filter(Boolean).join(' '),pricingCustomerId:String(draft.customer_id),status:'saved',revisionOf:'',revisionRootId:'',revisionNumber:0,audit:[{action:'keybot_created',at:now,by:String(draft.user_email||'')}],assemblySessionId:`keybot:${draft.id}`,preparedBy:String(pr.display_name||draft.user_email||''),preparedByDesignation:String(pr.designation||''),signatoryName:String(pr.signatory_name||''),signatureImage:String(pr.signature_image||''),items,project:'',project2:'',customerReference:'',delivery:'Ex - Stock subject to prior sales. Otherwise 2-3 months upon confirmation order.',delivery2:'',validity:'14 days',priceBasis:'Ex - K.L. only, nett in Ringgit Malaysia.',payment:String(customer.data.payment_terms||'Cash before delivery'),remarks:'',total,createdByEmail:String(draft.user_email||''),createdByName:String(pr.display_name||draft.user_email||''),updatedByEmail:String(draft.user_email||''),createdAt:now,updatedAt:now};
  const r=await service.rpc('keysuite_v41309_create_saved_quotation',{p_user_email:String(draft.user_email||''),p_customer_id:String(draft.customer_id||''),p_quotation:quote});if(r.error)throw new Error(r.error.message||String(r.error));return (Array.isArray(r.data)?r.data[0]:r.data)||quote;
}
function quotationProductMenu(){return telegramReplyKeyboard([['💧 Pump','🛢️ Tank'],['🔎 Change Company','⬅️ Main Menu']])}
function quotationPumpSeriesMenu(){return telegramReplyKeyboard([['CHC','BFI'],['ES 2 Pole','ES 4 Pole'],['🔄 Select Again','⬅️ Main Menu']])}
function quotationResultText(item:any){
  const price=Number(item?.unit_price||0),qty=Math.max(1,Number(item?.qty||1));
  if(String(item?.family||'').toUpperCase()==='GWS')return ['Tank Selection',`Brand: ${item?.brand||'Keylargo'}`,`Series: ${item?.series||'GWS Tank'}`,`Model: ${item?.display_model||item?.model||'-'}`,Number(item?.tank_size_litres)>0?`Size: ${inputNumber(item.tank_size_litres)} Litres`:null,Number(item?.tank_pressure_bar)>0?`Pressure: ${inputNumber(item.tank_pressure_bar)} Bar`:null,`Qty: ${qty}`,price>0?`Unit Price: ${money(price)}`:null,price>0&&qty>1?`Total: ${money(price*qty)}`:null,item?.pricing?.category_name?`Pricing Category: ${item.pricing.category_name}`:null].filter(Boolean).join('\n');
  const kw=Number(item?.motor_kw||0),hp=Number(item?.motor_hp||0),eff=Number(item?.efficiency||0),motor=kw>0?`${oneDecimal(kw)} kW${hp>0?` (${oneDecimal(hp)} HP)`:''}`:'-';
  return ['Pump Selection',`Brand: ${item?.brand||'B.G.Reich'}`,`Series: ${item?.series||item?.family||'-'}${item?.family==='ES'&&item?.pole?` ${item.pole} Pole`:''}`,`Model: ${item?.display_model||item?.model||'-'}`,`Duty: ${String(item?.duty_text||'').trim()||`${oneDecimal(item?.requested_flow_m3h)} m³/hr @ ${oneDecimal(item?.requested_head_m)} Mtr`}`,`Motor: ${motor}${item?.options?.bare_shaft?' · Bare Shaft':''}`,eff>0?`Efficiency: ${oneDecimal(eff)} %`:null,`Qty: ${qty}`,item?.options?`Options: ${pumpOptions(item.options,qty).material} · ${pumpOptions(item.options,qty).motor_efficiency} · ${pumpOptions(item.options,qty).seal} · ${pumpOptions(item.options,qty).elastomer} · ${pumpOptions(item.options,qty).connection}`:null,price>0?`Unit Price: ${money(price)}`:null,price>0&&qty>1?`Total: ${money(price*qty)}`:null,item?.pricing?.category_name?`Pricing Category: ${item.pricing.category_name}`:null].filter(Boolean).join('\n');
}
function quotationDraftText(session:any){
  const c=sessionContext(session),items=draftItemsFrom(session),lines=[`📄 Quotation Draft`,`Company: ${String(c.customer_name||'Selected Customer')}`,''];
  if(!items.length){lines.push('No items added yet.');return lines.join('\n')}
  let total=0;items.forEach((item:any,i:number)=>{const qty=Math.max(1,Number(item?.qty||1)),unit=Number(item?.unit_price||0),line=unit*qty;total+=line;lines.push(`${i+1}. ${item?.model||'-'}`);if(String(item?.family||'').toUpperCase()==='GWS'){lines.push(`   GWS Tank${Number(item?.tank_size_litres)>0?` · ${inputNumber(item.tank_size_litres)}L`:''}${Number(item?.tank_pressure_bar)>0?` · ${inputNumber(item.tank_pressure_bar)}bar`:''} · Qty ${qty}`)}else{const kw=Number(item?.motor_kw||0);lines.push(`   ${oneDecimal(item?.requested_flow_m3h)} m³/hr @ ${oneDecimal(item?.requested_head_m)} Mtr`);lines.push(`   ${item?.family==='ES'&&item?.pole?`ES ${item.pole} Pole`:item?.series||item?.family||'-'} · ${kw>0?`${oneDecimal(kw)} kW`:'Motor -'} · Qty ${qty}`)}lines.push(`   ${money(unit)} each · ${money(line)}`);});
  lines.push('',`Items: ${items.length}`,`Draft Total: ${money(total)}`);return lines.join('\n');
}
async function selectQuotationCustomer(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,user:any,customer:any,previousContext:any={},pendingRequest:any=null){
  const prior=previousContext&&typeof previousContext==='object'?previousContext:{},priorItems=Array.isArray(prior.draft_items)?prior.draft_items:[];const draft=await ensurePersistentDraft(service,companyId,chatId,senderId,String(user.email||''),String(customer.id),String(customer.company_name||''),priorItems,String(prior.active_draft_id||''));const items=Array.isArray(draft?.items)?draft.items:priorItems,context={...prior,keysuite_user_email:user.email,customer_name:customer.company_name,draft_items:items,active_draft_id:String(draft?.id||''),pending_request:pendingRequest||prior.pending_request||null,pending_item:null};
  return await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'customer_selected',selected_customer_id:String(customer.id),flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,context});
}
async function showPumpQuoteFromRequest(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,request:any){
  const c=sessionContext(session),q=Number(request?.flow_m3h||session?.flow_m3h||c.quote_flow_m3h||0),h=Number(request?.head_m||session?.head_m||c.quote_head_m||0),code=String(request?.family_code||'').toUpperCase(),qty=Math.max(1,Math.trunc(Number(request?.qty)||1));
  const merged=mergeQuoteRequest(c.pending_request,request);merged.product_type='pump';merged.qty=qty;
  if(!(q>0)||!(h>0)){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_flow',flow_m3h:q>0?q:null,head_m:h>0?h:null,context:{...c,pending_request:merged,pending_item:null}});await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 20m3/hr @ 30m\n\nYou can include CHC / BFI / ES in the same message.',telegramRemoveKeyboard());return saved}
  merged.flow_m3h=q;merged.head_m=h;
  if(!['CHC','BFI','ES2','ES4'].includes(code)){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_family',flow_m3h:q,head_m:h,context:{...c,pending_request:merged,pending_item:null}});await telegramSend(telegramToken,chatId,`Duty Point\nFlow: ${oneDecimal(q)} m³/hr\nHead: ${oneDecimal(h)} Mtr\n\nChoose the pump series:`,quotationPumpSeriesMenu());return saved}
  merged.family_code=code;const family=code==='CHC'?'CHC':code==='BFI'?'BFI':'ES',pole=code==='ES2'?2:code==='ES4'?4:0;const opts=mergePumpOptions(c.pending_item?.options,merged.options,qty);merged.options=opts;
  try{let summary:any=selectPumpSummary(family,q,h,pole);summary=applyPumpOptionsToItem({...summary,qty},opts);summary=await quotePumpForCustomer(service,String(session.selected_customer_id||''),summary,String(c.keysuite_user_email||''));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_result',flow_m3h:q,head_m:h,context:{...c,pending_request:merged,pending_item:summary}});await telegramSend(telegramToken,chatId,quotationResultText(summary),pumpResultMenu('quotation'));return saved}catch(error){await telegramSend(telegramToken,chatId,`The pump selection/pricing could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,telegramReplyKeyboard([['🔄 Select Again'],['📄 View Draft'],['⬅️ Main Menu']]));return session}
}
async function showTankQuoteFromRequest(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,request:any){
  const c=sessionContext(session),merged=mergeQuoteRequest(c.pending_request,request);merged.product_type='tank';const qty=Math.max(1,Math.trunc(Number(merged.qty)||1));merged.qty=qty;
  const hasSearch=!!(merged.tank_model_hint||Number(merged.tank_size_litres)>0||Number(merged.tank_pressure_bar)>0);
  if(!hasSearch){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_tank',context:{...c,pending_request:merged,pending_item:null}});await telegramSend(telegramToken,chatId,'Please enter the GWS Tank model or size.\n\nExamples:\n100L 10 bar\nmodel PWB-100\n2 units 200L',telegramRemoveKeyboard());return saved}
  try{const matches=await findGwsMatches(service,merged);if(!matches.length){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_tank',context:{...c,pending_request:merged,pending_item:null}});await telegramSend(telegramToken,chatId,'No GWS Tank matched that request. Please enter another model, size or pressure.',telegramRemoveKeyboard());return saved}
    if(matches.length>1){const choices=matches.slice(0,8).map((p:any)=>({id:String(p.id),label:gwsChoiceLabel(p)})),rows=choices.map((x:any)=>[x.label]);rows.push(['🔄 Select Again','⬅️ Main Menu']);const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_tank_choice',context:{...c,pending_request:merged,pending_tank_matches:choices,pending_item:null}});await telegramSend(telegramToken,chatId,'More than one GWS Tank matches. Please choose:',telegramReplyKeyboard(rows));return saved}
    const item=await quoteGwsForCustomer(service,String(session.selected_customer_id||''),matches[0],qty,String(c.keysuite_user_email||''));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'quotation',step:'quote_result',context:{...c,pending_request:merged,pending_tank_matches:null,pending_item:item}});await telegramSend(telegramToken,chatId,quotationResultText(item),telegramReplyKeyboard([['✅ Add to Quotation'],['🔄 Select Again','📄 View Draft'],['⬅️ Main Menu']]));return saved
  }catch(error){await telegramSend(telegramToken,chatId,`The GWS Tank selection/pricing could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,telegramReplyKeyboard([['🔄 Select Again'],['📄 View Draft'],['⬅️ Main Menu']]));return session}
}
async function continueQuotationRequest(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,request:any){
  const merged=mergeQuoteRequest(sessionContext(session).pending_request,request);if(merged.product_type==='tank')return await showTankQuoteFromRequest(service,telegramToken,companyId,chatId,senderId,session,merged);if(merged.product_type==='pump'||merged.flow_m3h||merged.head_m||merged.family_code)return await showPumpQuoteFromRequest(service,telegramToken,companyId,chatId,senderId,session,merged);await telegramSend(telegramToken,chatId,'What would you like to quote?',quotationProductMenu());return session
}


async function guidedCompletePump(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,product:any,request:any,action:'curve'|'price'|'select'){
  const c=sessionContext(session),merged=mergeQuoteRequest(c.guided_pending_request,request),q=Number(merged.flow_m3h||0),h=Number(merged.head_m||0),group=String(product?.price_group||'').toUpperCase(),family=guidedSelectorFamily(group);
  const customerId=String(customer?.id||''),customerName=String(customer?.company_name||''),customerPrefix=customerName?`Customer: ${customerName}\n`:'';
  if(action==='price'&&!customerId)throw new Error('Customer is required before checking price.');
  if(!(q>0)||!(h>0)){const step='guided_waiting_duty',saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step,selected_customer_id:customerId||null,context:{...c,keysuite_user_email:user.email,...(customerName?{customer_name:customerName}:{}),guided_product:product,guided_action:action,guided_pending_request:merged}});await telegramSend(telegramToken,chatId,`${customerPrefix}Product: ${guidedProductButtonLabel(product)}\n\nPlease enter Flow @ Head.\nExample: 30m3/hr @ 80m`,guidedInputNavMenu());return saved}
  let pole=Number(merged.pole||0);if(family==='ES'&&![2,4].includes(pole)){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_waiting_es_pole',flow_m3h:q,head_m:h,selected_customer_id:customerId||null,context:{...c,keysuite_user_email:user.email,...(customerName?{customer_name:customerName}:{}),guided_product:product,guided_action:action,guided_pending_request:{...merged,flow_m3h:q,head_m:h}}});await telegramSend(telegramToken,chatId,'Choose ES motor speed:',telegramReplyKeyboard([['ES 2 Pole','ES 4 Pole'],['⬅️ Back','🔄 New Request']]));return saved}
  try{const forcedModel=String(merged?.force_model||'').trim();let item:any=selectPumpSummary(family,q,h,pole,forcedModel);item=guidedApplyProductIdentity(applyPumpOptionsToItem({...item,qty:Math.max(1,Number(merged.qty||1))},mergePumpOptions({},merged.options,merged.qty||1)),product);if(action==='price')item=await quotePumpForCustomer(service,customerId,item,String(user.email||''));const nextStep=action==='price'?'guided_price_result':action==='curve'?'guided_curve_result':'guided_selection_result',saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:nextStep,flow_m3h:q,head_m:h,selected_customer_id:customerId||null,context:{...c,keysuite_user_email:user.email,...(customerName?{customer_name:customerName}:{}),guided_product:product,guided_action:action,guided_pending_request:{...merged,flow_m3h:q,head_m:h,pole},pending_item:item}});
    if(action==='curve'){const duty=`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`,curveIdentity:any=await guidedCurveDisplayIdentity(service,companyId,product,String(item?.model||''),String(item?.display_model||''));curveIdentity.material=pumpOptions(item.options,item.qty).material;const pdf=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),family==='ES'?pole:0,forcedModel,curveIdentity);await telegramSendDocument(telegramToken,chatId,pdf.bytes,pdf.filename,`${guidedProductButtonLabel(product)} curve ready\n${duty}\nSelected: ${pdf.model}`);await telegramSend(telegramToken,chatId,`${customerPrefix}${quotationResultText(item)}`,guidedResultMenu(true));return saved}
    if(action==='price'){await telegramSend(telegramToken,chatId,`Customer: ${customerName}\n\n${quotationResultText(item)}`,guidedPriceResultMenu(true));return saved}
    await telegramSend(telegramToken,chatId,`${customerPrefix}${quotationResultText(item)}\n\nChoose action:`,guidedProductActionMenu(family==='ES'));return await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_product_action',flow_m3h:q,head_m:h,selected_customer_id:customerId||null,context:{...sessionContext(saved),pending_item:item,guided_product:product,guided_pending_request:{...merged,flow_m3h:q,head_m:h,pole}}});
  }catch(error){await telegramSend(telegramToken,chatId,`The selected product could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,customer?guidedSelectedCustomerMenu():mainMenuMarkup());return session}
}
async function guidedShowCatalogChoices(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,product:any,kind:string,rows:any[]){
  const choices=rows.slice(0,8).map((row:any)=>({id:String(row.id),label:`${String(row.model||'Product')}${row.component_type?` · ${String(row.component_type)}`:''}`.slice(0,60)})),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_choice',selected_customer_id:String(customer.id),context:{...sessionContext(session),keysuite_user_email:user.email,customer_name:customer.company_name,guided_product:product,guided_price_kind:kind,guided_price_choices:choices}});await telegramSend(telegramToken,chatId,'More than one product matches. Please choose:',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return saved;
}
async function guidedQuoteNoCurve(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,product:any,text:string){
  const group=String(product?.price_group||'').toUpperCase(),qty=Math.max(1,Number((String(text).match(/\b(?:qty\s*[:=]?\s*)?(\d+)\s*(?:x|units?|pcs?|sets?)\b/i)||[])[1]||1));
  try{
    if(group==='CHC_G1'){const direct=parseDirectPumpModel(text);if(!direct){await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(product),telegramRemoveKeyboard());return session}const item=await quoteChcG1ForCustomer(service,String(customer.id),String(user.email||''),String(product.brand_id||product.brand_name||'B.G.Reich'),direct.model,qty),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...sessionContext(session),guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return saved}
    if(group==='GWS'){const req=smartQuoteRequest(`GWS Tank ${text}`),matches=await findGwsMatches(service,req);if(!matches.length){await telegramSend(telegramToken,chatId,'No GWS Tank matched that request. Please enter another model, size or pressure.',telegramRemoveKeyboard());return session}if(matches.length>1)return await guidedShowCatalogChoices(service,telegramToken,companyId,chatId,senderId,session,customer,user,product,'GWS',matches);const item=await quoteGwsForCustomer(service,String(customer.id),matches[0],qty,String(user.email||'')),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...sessionContext(session),guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return saved}
    if(group==='MOTOR'||group==='COUPLING'){const table=group==='MOTOR'?'ks_products_motor':'ks_products_coupling',matches=await findSimpleCatalogMatches(service,table,text);if(!matches.length){await telegramSend(telegramToken,chatId,`No ${product.product_label} matched that model. Please try another model.`,telegramRemoveKeyboard());return session}if(matches.length>1)return await guidedShowCatalogChoices(service,telegramToken,companyId,chatId,senderId,session,customer,user,product,group,matches);const item=await quoteSimpleCatalogRow(service,String(customer.id),String(user.email||''),String(product.brand_name||''),group,matches[0],qty),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...sessionContext(session),guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return saved}
    if(group==='KEYPLC'){const kw=Number((String(text).match(/(\d+(?:\.\d+)?)\s*k?w\b/i)||[])[1]||0),pumps=Number((String(text).match(/\b(\d+)\s*(?:p|pumps?)\b/i)||[])[1]||0);if(!(kw>0)||!(pumps>0)){await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(product),telegramRemoveKeyboard());return session}const panel=await quoteKeyplcPanel(service,String(customer.id),String(user.email||''),kw,pumps,kw);if(!panel||panel.price_missing)throw new Error('No matching KeyPLC Panel price is available.');const item={family:'KEYPLC',brand:'Keylargo',series:'KeyPLC Panel',model:String(panel.product?.model||'KeyPLC Panel'),qty:1,unit_price:Number(panel.unit_price||0),pricing:panel.pricing},saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...sessionContext(session),guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return saved}
    if(group==='MANIFOLD'){const dn=Number((String(text).match(/\bDN\s*(\d+)\b/i)||[])[1]||0),pumps=Number((String(text).match(/\b(\d+)\s*(?:p|pumps?)\b/i)||[])[1]||0),parsed=smartQuoteRequest(text),head=Number(parsed.head_m||0);if(!(dn>0)||!(pumps>0)||!(head>0)){await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(product),telegramRemoveKeyboard());return session}const m=await manifoldSystemComponent(service,String(customer.id),String(user.email||''),{connection_dn:dn,shutoff_head_m:head},pumps,{});if(!m||m.price_missing)throw new Error(m?.warning||`Manifold price is unavailable${m?.missing?.length?`: ${m.missing.join(', ')}`:''}.`);const item={family:'MANIFOLD',brand:'Keylargo',series:'Manifold',model:String(m.model||'Manifold'),qty:1,unit_price:Number(m.unit_price||0)},saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...sessionContext(session),guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return saved}
    if(group==='BASEPLATE'){const input=parseGuidedBaseplateInput(text);if(!input.cChannel||!(input.L3>0)||!(input.W1>0)){await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(product),telegramRemoveKeyboard());return session}const item=await quoteGuidedBaseplate(service,String(customer.id),String(user.email||''),input,qty),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...sessionContext(session),guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return saved}
    await telegramSend(telegramToken,chatId,guidedNoCurvePrompt(product),telegramRemoveKeyboard());return session;
  }catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedSelectedCustomerMenu());return session}
}

function customerHintFromMessage(text:any,req:any={}){
  let s=String(text||'');
  // Strip exact product/model expressions before generic family words so model fragments do not look like company names.
  s=s.replace(/\b(?:CHC|VMS)\s*\d{1,3}\s*-\s*\d{1,3}(?:\s*-\s*\d{1,2})?(?:\s*-\s*\d{1,2})?\b/ig,' ')
    .replace(/\bES\s*\d{1,3}\s*-\s*[0-9]{1,3}[A-Z]?(?:-[A-Z0-9]+)?\b/ig,' ')
    .replace(/\b(?:quote|quotation|price|pricing|check|curve|please|prepare|need|want|for|select|selection)\b/ig,' ')
    .replace(/\b(?:qty\s*[:=]?\s*)?\d+\s*(?:x|units?|pcs?|sets?)\b/ig,' ')
    .replace(/\b\d+\s*x\s*(?=[a-z])/ig,' ')
    .replace(/\bkey\s*plc\s*\d+\s*(?:p|pumps?)\b/ig,' ')
    .replace(/\b\d+\s*(?:p|pumps?)\s*(?:system)?\b/ig,' ')
    .replace(/\b(?:key\s*plc|vfd|hmi|system|vms|vertical\s+multistage(?:\s+inline\s+pump)?|chc|es\s*[- ]?[24]\s*(?:p|pole)?|es|pump|pumps|gws|tank|pressure\s*(?:tank|vessel))\b/ig,' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:m3|m³)\s*[.\/]?\s*(?:h|hr|hour)\b/ig,' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:l\s*\/\s*s|lps|l\s*\/\s*(?:m|min|minute)|lpm|us\s*gpm|usgpm|imp(?:erial)?\s*gpm|igpm)\b/ig,' ')
    .replace(/\b\d+(?:\.\d+)?\s*@\s*\d+(?:\.\d+)?(?:\s*(?:mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi))?\b/ig,' ')
    .replace(/@\s*\d+(?:\.\d+)?\s*(?:mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)?\b/ig,' ')
    .replace(/\b(?:head\s*[:=]?\s*)?\d+(?:\.\d+)?\s*(?:mtr|metres?|meters?|m|ft|feet|foot|bar|kpa|psi)\b/ig,' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:l|ltr|litres?|liters?)\b/ig,' ')
    .replace(/\bmodel\s*[:=]?\s*[a-z0-9._\/-]+\b/ig,' ')
    .replace(/\b(?:ss\s*304|ss\s*316|304\s*(?:ss|stainless)?|316\s*(?:ss|stainless)?|ie\s*[12345]|sic\s*[\/-]\s*sic|tc\s*[\/-]\s*tc|carbon\s*[\/-]\s*sic|epdm|nbr|viton|round\s*(?:flange)?|oval\s*(?:flange)?|bare\s*shaft)\b/ig,' ')
    .replace(/[,@;|]+/g,' ')
    .replace(/\s+/g,' ').trim();
  if(/^(?:customer|company)$/i.test(s))return '';
  return s;
}
function simplePumpFamilyCode(req:any){const c=String(req?.family_code||'').toUpperCase();return ['CHC','BFI','ES2','ES4','ES'].includes(c)?c:''}
function simplePumpMissing(req:any){if(req?.direct_model)return '';if(!(Number(req?.flow_m3h)>0)||!(Number(req?.head_m)>0))return 'duty';const c=simplePumpFamilyCode(req);if(!c||c==='ES')return 'family';return ''}
function simpleRequestHasTechnical(req:any){return !!(req?.product_type||req?.family_code||req?.direct_model||req?.system_type||Number(req?.flow_m3h)>0||Number(req?.head_m)>0||req?.tank_model_hint||Number(req?.tank_size_litres)>0||Number(req?.tank_pressure_bar)>0)}
function simpleRequestMenuText(){return 'Fast Search\n\nType a model directly:\nCHC 10-100\nBFI 8-3\nB.G.Reich CHC 10-100\nES 32-20 4P\n\nFor Customer + Product, use 2 rows:\nKey\nCHC 30m3/hr @ 90m\n\nRow 1 = Company / Customer\nRow 2 = Brand / Series / Model / Duty\n\nYou can still use Customer, Product or Selection below.'}
async function sendSimpleCurve(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,request:any){
  const req=mergeQuoteRequest(sessionContext(session).pending_request,request);req.product_type='pump';
  if(!req.chc_scope){const scope=quoteChcScopeFromText(req.raw_input);if(scope)req.chc_scope=scope;}
  if(bfiDirectNeedsPhase(req)){
    const pending={...req,direct_model:bfiBaseModelName(req.direct_model),bfi_requested_enhanced:/E$/i.test(String(req.direct_model||'')),bfi_phase_confirmed:false};
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'smart_curve',step:'bfi_waiting_phase',selected_customer_id:null,context:{pending_request:pending,pending_item:null}});
    await telegramSend(telegramToken,chatId,`BFI Model: ${pending.direct_model}\n\nChoose Motor Phase:`,bfiPhaseMenu(pending.direct_model));return saved;
  }
  if(req.direct_model){const info=directPumpInfo(req.direct_model);if(!info){await telegramSend(telegramToken,chatId,`Pump model ${req.direct_model} was not found.`,mainMenuMarkup());return session}const item=applyPumpOptionsToItem({...info,qty:Math.max(1,Number(req.qty||1))},mergePumpOptions({},req.options,req.qty||1));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'curve',step:'direct_model_result',selected_customer_id:null,context:{pending_request:req,pending_item:item}});await telegramSend(telegramToken,chatId,[`Model: ${item.display_model||item.model}`,`Type: ${String(item.family||'').toUpperCase()==='BFI'?'BFI · Horizontal Multistage Pump':'VMS · Vertical Multistage Inline Pump'}`,Number(item.motor_kw)>0?`Motor: ${inputNumber(item.motor_kw)} kW / ${inputNumber(item.motor_hp)} HP`:null,item.connection?`Connection: ${item.connection}`:null].filter(Boolean).join('\n'),telegramReplyKeyboard([['⚙️ Options','💰 Check Price'],['🔄 New Request']]));return saved}
  const missing=simplePumpMissing(req);
  if(missing==='duty'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'smart_curve',step:'smart_waiting_flow',selected_customer_id:null,context:{pending_request:req}});await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 30m3/hr @ 80m',telegramRemoveKeyboard());return saved}
  if(missing==='family'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'smart_curve',step:'smart_waiting_family',selected_customer_id:null,context:{pending_request:req}});await telegramSend(telegramToken,chatId,'Please choose the pump series:',telegramReplyKeyboard([['CHC','BFI'],['ES 2 Pole','ES 4 Pole'],['🔄 New Request']]));return saved}
  const code=simplePumpFamilyCode(req),family=code==='CHC'?'CHC':code==='BFI'?'BFI':'ES',pole=code==='ES4'?4:code==='ES2'?2:0,q=Number(req.flow_m3h),h=Number(req.head_m),display=dutyDisplay(String(req.raw_input||''),q,h),opts=mergePumpOptions({},req.options,req.qty||1);

  // V4.26.05: a generic CHC duty is assignment-aware and searches every
  // assigned CHC generation together. An explicit CHC C4 / C6 request stays
  // inside that generation. Show the candidate set first; selecting a row then
  // generates the curve for that exact stored model.
  if(family==='CHC'){
    try{
      const user=await linkedKeySuiteUser(service,companyId,senderId);
      if(user){
        const customerId=String(session?.selected_customer_id||'').trim(),customer=customerId?await guidedAllowedCustomerById(service,companyId,user,customerId):null;
        let products=customer?await guidedProductsForContext(service,companyId,user,customerId):await guidedUserAvailableProducts(service,companyId,user);
        const scope=String(req.chc_scope||'').toUpperCase();
        products=(products||[]).filter((p:any)=>{const g=String(p?.price_group||'').toUpperCase();if(!['CHC_G1','CHC_G2'].includes(g))return false;return scope?g===scope:true;});
        if(!products.length){const label=scope==='CHC_G1'?'CHC C4':scope==='CHC_G2'?'CHC C6':'CHC';await telegramSend(telegramToken,chatId,`${label} is not assigned to this KeySuite user${customer?' / Customer':''}.`,mainMenuMarkup());return session;}
        const candidates=await guidedSizeSelectedProducts(service,companyId,products,q,h);
        if(!candidates.length){await telegramSend(telegramToken,chatId,guidedSelectionResultText(q,h,[],display.duty_text),mainMenuMarkup());return session;}
        const token=guidedSelectionNewToken(),saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'guided',step:'guided_selection_results',flow_m3h:q,head_m:h,selected_customer_id:customerId||null,context:{...sessionContext(session),keysuite_user_email:user.email,...(customer?{customer_name:customer.company_name}:{}),guided_selection_products:products,guided_selection_keys:products.map((p:any)=>String(p.key)),guided_selection_candidates:candidates,guided_selection_token:token,guided_duty_text:display.duty_text,guided_pending_request:{...req,flow_m3h:q,head_m:h}}});
        await telegramSend(telegramToken,chatId,guidedSelectionResultText(q,h,candidates,display.duty_text),guidedSelectionResultKeyboard(candidates,token));return saved||session;
      }
      // Unlinked legacy fallback: explicit C4/C6 is still honoured; generic CHC
      // retains the previous C6 default because no user assignment is available.
      if(req.chc_scope==='CHC_G1')req.family_code='CHC_G1';else if(req.chc_scope==='CHC_G2')req.family_code='CHC_G2';
    }catch(error){console.error('[KeySuite V4.26.05] assignment-aware CHC curve sizing failed',error);}
  }

  const resolvedFamily=family==='CHC'&&req.chc_scope==='CHC_G1'?'CHC_G1':family==='CHC'&&req.chc_scope==='CHC_G2'?'CHC_G2':family;
  try{const pdfMeta=await generateCurvePdf(resolvedFamily,q,h,display.duty_text,env('KEYSUITE_PUBLIC_URL'),pole);const sent=await telegramSendDocument(telegramToken,chatId,pdfMeta.bytes,pdfMeta.filename,`${resolvedFamily==='ES'?esPoleLabel(pole):resolvedFamily} curve ready\n${display.duty_text}\nSelected: ${pdfMeta.model}`);let item:any=selectPumpSummary(resolvedFamily,q,h,pole);item=applyPumpOptionsToItem({...item,qty:Math.max(1,Number(req.qty||1))},opts);const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'curve',step:'curve_result',flow_m3h:q,head_m:h,selected_customer_id:null,context:{pending_request:req,pending_item:item,curve_pdf:{family:resolvedFamily,pole,q,h,duty:display.duty_text,filename:pdfMeta.filename}}});await telegramSend(telegramToken,chatId,sent.ok?'Curve ready.':'The curve was prepared but Telegram could not send the PDF.',simpleCurveMenu());return saved}catch(error){await telegramSend(telegramToken,chatId,`KeyBot could not generate this curve.\n\n${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return session}
}

async function sendSimplePumpPrice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,request:any){
  const req=mergeQuoteRequest(sessionContext(session).pending_request,request);req.product_type='pump';const missing=simplePumpMissing(req),baseCtx={...sessionContext(session),keysuite_user_email:String(user.email||''),customer_name:String(customer.company_name||''),pending_request:req};
  if(bfiDirectNeedsPhase(req)){
    const pending={...req,direct_model:bfiBaseModelName(req.direct_model),bfi_requested_enhanced:/E$/i.test(String(req.direct_model||'')),bfi_phase_confirmed:false};
    const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_bfi_waiting_phase',selected_customer_id:String(customer.id),context:{...baseCtx,pending_request:pending,pending_item:null}});
    await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\nBFI Model: ${pending.direct_model}\n\nChoose Motor Phase:`,bfiPhaseMenu(pending.direct_model));return saved;
  }
  if(req.direct_model){const info=directPumpInfo(req.direct_model);if(!info){await telegramSend(telegramToken,chatId,`Pump model ${req.direct_model} was not found.`,mainMenuMarkup());return session}try{let item=applyPumpOptionsToItem({...info,qty:Math.max(1,Number(req.qty||1))},mergePumpOptions({},req.options,req.qty||1));item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_result',selected_customer_id:String(customer.id),context:{...baseCtx,pending_item:item}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\n${quotationResultText(item)}`,simplePriceMenu(false));return saved}catch(error){await telegramSend(telegramToken,chatId,`The direct model price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return session}}
  if(missing==='duty'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_flow',selected_customer_id:String(customer.id),context:baseCtx});await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 30m3/hr @ 80m',telegramRemoveKeyboard());return saved}
  if(missing==='family'){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_family',selected_customer_id:String(customer.id),context:baseCtx});await telegramSend(telegramToken,chatId,'Please choose the pump series:',telegramReplyKeyboard([['CHC','BFI'],['ES 2 Pole','ES 4 Pole'],['🔄 New Request']]));return saved}
  const code=simplePumpFamilyCode(req),family=code==='CHC'?'CHC':code==='BFI'?'BFI':'ES',pole=code==='ES4'?4:2,q=Number(req.flow_m3h),h=Number(req.head_m),opts=mergePumpOptions({},req.options,req.qty||1);
  try{let item:any=selectPumpSummary(family,q,h,pole);item=applyPumpOptionsToItem({...item,qty:Math.max(1,Number(req.qty||1))},opts);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_result',flow_m3h:q,head_m:h,selected_customer_id:String(customer.id),context:{...baseCtx,pending_item:item}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\n${quotationResultText(item)}`,simplePriceMenu(true));return saved}catch(error){await telegramSend(telegramToken,chatId,`The pump selection/pricing could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return session}
}
async function sendSimpleTankPrice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,request:any){
  const req=mergeQuoteRequest(sessionContext(session).pending_request,request);req.product_type='tank';const baseCtx={...sessionContext(session),keysuite_user_email:String(user.email||''),customer_name:String(customer.company_name||''),pending_request:req};
  const hasSearch=!!(req.tank_model_hint||Number(req.tank_size_litres)>0||Number(req.tank_pressure_bar)>0);if(!hasSearch){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_tank',selected_customer_id:String(customer.id),context:baseCtx});await telegramSend(telegramToken,chatId,'Please enter the GWS Tank model or size.\nExample: 100L 10 bar or model PWB-100',telegramRemoveKeyboard());return saved}
  try{const matches=await findGwsMatches(service,req);if(!matches.length){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_tank',selected_customer_id:String(customer.id),context:baseCtx});await telegramSend(telegramToken,chatId,'No GWS Tank matched that request. Please enter another model, size or pressure.');return saved}if(matches.length>1){const choices=matches.slice(0,8).map((p:any)=>({id:String(p.id),label:gwsChoiceLabel(p)}));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_tank_choice',selected_customer_id:String(customer.id),context:{...baseCtx,pending_tank_matches:choices}});await telegramSend(telegramToken,chatId,'More than one GWS Tank matches. Please choose:',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['🔄 New Request']]));return saved}const qty=Math.max(1,Math.trunc(Number(req.qty)||1)),item=await quoteGwsForCustomer(service,String(customer.id),matches[0],qty,String(user.email||''));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_result',selected_customer_id:String(customer.id),context:{...baseCtx,pending_item:item}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\n${quotationResultText(item)}`,simplePriceMenu(false));return saved}catch(error){await telegramSend(telegramToken,chatId,`The GWS Tank pricing could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return session}
}
async function continueSimplePrice(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,customer:any,user:any,request:any){const req=mergeQuoteRequest(sessionContext(session).pending_request,request);if(req.product_type==='keyplc_system'||req.system_type==='KEYPLC')return await sendKeyplcSystem(service,telegramToken,companyId,chatId,senderId,session,req,customer,user);if(req.product_type==='tank')return await sendSimpleTankPrice(service,telegramToken,companyId,chatId,senderId,session,customer,user,req);if(!req.product_type&&!simpleRequestHasTechnical(req)){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_product',selected_customer_id:String(customer.id),context:{...sessionContext(session),keysuite_user_email:user.email,customer_name:customer.company_name,pending_request:req}});await telegramSend(telegramToken,chatId,'What do you need? Send a pump duty such as CHC 30@80, or a GWS Tank model/size.',telegramRemoveKeyboard());return saved}return await sendSimplePumpPrice(service,telegramToken,companyId,chatId,senderId,session,customer,user,{...req,product_type:'pump'})}
async function resolveSimplePriceCustomer(service:any,telegramToken:string,companyId:string,chatId:string,senderId:string,session:any,user:any,query:string,request:any){
  const matches=await findAllowedCustomers(service,companyId,user,query);if(!matches.length){const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_company',selected_customer_id:null,context:{...sessionContext(session),keysuite_user_email:user.email,pending_request:request,customer_choices:[]}});await telegramSend(telegramToken,chatId,`No customer matched “${query}”.\nPlease type another part of the company name.`,telegramRemoveKeyboard());return saved}
  const exact=matches.find((x:any)=>cleanSearch(x.company_name)===cleanSearch(query));if(exact||matches.length===1)return await continueSimplePrice(service,telegramToken,companyId,chatId,senderId,session,exact||matches[0],user,request);
  const choices=matches.map((x:any)=>({id:String(x.id),label:String(x.company_name).slice(0,55)}));const saved=await saveKeybotSession(service,companyId,chatId,senderId,{mode:'price',step:'price_waiting_company',selected_customer_id:null,context:{...sessionContext(session),keysuite_user_email:user.email,pending_request:request,customer_choices:choices}});await telegramSend(telegramToken,chatId,`I found ${matches.length} similar customers for “${query}”.\nPlease confirm which customer you mean:`,telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['🔄 New Request']]));return saved
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({ok:false,error:'POST required.'},405);
  try{
    const supabaseUrl=env('SUPABASE_URL');
    const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY');
    if(!supabaseUrl||!serviceKey)throw new Error('Supabase function environment is incomplete.');
    const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const payload=await req.json().catch(()=>null) as any;

    // V4.12.18 Inbox PDF: same server PDF as Telegram attachment.
    if(payload?.action==='generate_curve_pdf'){
      const authHeader=req.headers.get('Authorization')||'';
      const jwt=authHeader.replace(/^Bearer\s+/i,'').trim();
      if(!jwt)return json({ok:false,error:'Authentication required.'},401);
      const userResult=await service.auth.getUser(jwt);
      if(userResult.error||!userResult.data?.user)return json({ok:false,error:'Invalid KeySuite session.'},401);
      const enquiryId=String(payload?.enquiry_id||'').trim();
      if(!enquiryId)return json({ok:false,error:'enquiry_id is required.'},400);
      const rowResult=await service.from('ks_keyai_enquiries').select('id,status,raw_message,ai_result,parent_enquiry_id').eq('id',enquiryId).maybeSingle();
      if(rowResult.error)throw rowResult.error;
      const row=rowResult.data as any;
      if(!row)return json({ok:false,error:'Curve enquiry not found.'},404);
      const d=row.ai_result&&typeof row.ai_result==='object'?row.ai_result:{};
      const family=String(d.pump_family||'').toUpperCase(),q=Number(d.flow_value),h=Number(d.head_value),pole=Number(d.es_pole||0);
      if((family!=='CHC'&&family!=='BFI'&&family!=='ES')||!(q>0&&h>0))return json({ok:false,error:'This enquiry does not contain a complete curve request.'},400);
      if(family==='ES'&&pole!==2&&pole!==4)return json({ok:false,error:'ES pole information is missing.'},400);
      const dutyText=String(d.duty_text||dutyDisplay(String(row.raw_message||''),q,h).duty_text);
      const pdfMeta=await generateCurvePdf(family,q,h,dutyText,env('KEYSUITE_PUBLIC_URL'),family==='ES'?pole:0);
      return new Response(pdfMeta.bytes,{status:200,headers:{...corsHeaders,'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${pdfMeta.filename}"`,'Cache-Control':'no-store'}});
    }

    const telegramToken=env('TELEGRAM_BOT_TOKEN','KeySuiteBot_Token');
    const webhookSecret=env('TELEGRAM_WEBHOOK_SECRET','KeySuiteBot_TELEGRAM_WEBHOOK_SECRET');
    if(!telegramToken)throw new Error('Telegram bot token secret is missing.');
    if(!webhookSecret)throw new Error('Telegram webhook secret is missing.');
    const supplied=req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'';
    if(supplied!==webhookSecret)return json({ok:false,error:'Invalid Telegram webhook secret.'},401);

    const update=payload;
    const callbackQuery=update?.callback_query||null;
    const message=callbackQuery?.message||update?.message||update?.edited_message||null;
    if(!message)return json({ok:true,ignored:true});
    let text=String(callbackQuery?'':(message?.text||message?.caption||'')).trim();
    const rawTelegramText=text;
    const chatId=String(message?.chat?.id||'');
    if(!callbackQuery&&!text){await telegramSend(telegramToken,chatId,'Please send a text message or use the KeyBot menu.',mainMenuMarkup());return json({ok:true,ignored:true,reason:'non-text'})}

    // V4.12.00 Unified Supabase: Telegram, KeyAI and KeySuite data all live in this project.
    const updateId=Number.isFinite(Number(update?.update_id))?Number(update.update_id):null;
    if(updateId!==null){
      const existing=await service.from('ks_keyai_enquiries').select('id,status').eq('source','telegram').eq('external_update_id',updateId).maybeSingle();
      if(existing.data?.id)return json({ok:true,duplicate:true,id:existing.data.id,status:existing.data.status});
    }

    const sender=callbackQuery?.from||message?.from||{};
    const senderName=[sender?.first_name,sender?.last_name].filter(Boolean).join(' ').trim();
    const senderUsername=String(sender?.username||'');
    const senderId=String(sender?.id||'').trim();
    const keySuiteCompanyId=env('KEYSUITE_COMPANY_ID');
    let senderContext:any={assigned:false,keysuite_company_id:keySuiteCompanyId||null,sender_id:senderId||null,customer_id:null,customer_name:null,pricing_category_id:null,pricing_category_name:null,response_mode:'nothing'};
    if(keySuiteCompanyId&&senderId){
      const touched=await service.rpc('keysuite_v40903_touch_keyai_sender',{
        p_company_id:keySuiteCompanyId,p_sender_id:senderId,p_sender_username:senderUsername,p_sender_name:senderName
      });
      if(touched.error){
        console.error('[KeySuite V4.12.05] Sender/company lookup failed',touched.error);
      }else{
        const first=Array.isArray(touched.data)?touched.data[0]:touched.data;
        senderContext={...senderContext,...(first?.row_data||first||{})};
      }
      const modeRow=await service.from('ks_keyai_sender_customer_v40903')
.select('response_mode,keysuite_user_email')
        .eq('keysuite_company_id',keySuiteCompanyId)
        .eq('channel','telegram')
        .eq('sender_id',senderId)
        .maybeSingle();
      if(modeRow.error){
        console.error('[KeySuite V4.12.05] Sender mode lookup failed',modeRow.error);
      }else{
        senderContext.response_mode=senderResponseMode(modeRow.data?.response_mode);
      }
    }
    const responseMode=senderResponseMode(senderContext.response_mode);
    senderContext.response_mode=responseMode;

    // V4.14.00 Controlled KeyBot Learning. Explicit Owner/Admin teaching is approved immediately;
    // learned aliases are applied before the deterministic parser. Protected commercial/security/
    // engineering rules cannot be learned.
    if(!callbackQuery&&text&&keySuiteCompanyId&&senderId){
      const teach=parseLearningTeachCommand(rawTelegramText),forget=parseLearningForgetCommand(rawTelegramText),showLearning=/^(?:learning|learned|what have you learned)[\s!?.]*$/i.test(rawTelegramText);
      if(teach||forget||showLearning){
        const teacher=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);
        if(!teacher||!['owner','admin'].includes(String(teacher.role||'').toLowerCase())){
          await telegramSend(telegramToken,chatId,'Only a linked KeySuite Owner/Admin can teach or manage KeyBot learning.',mainMenuMarkup());
          return json({ok:true,status:'learning_not_authorised'});
        }
        try{
          if(teach){const row=await saveKeybotLearning(service,keySuiteCompanyId,teacher,teach);await telegramSend(telegramToken,chatId,`🧠 Learned\nContext: ${row.context}\n${row.phrase} → ${row.meaning}\n\nThis affects language interpretation only. Pricing, permissions and engineering rules remain locked.`,mainMenuMarkup());return json({ok:true,status:'learning_saved',learning_id:row.id})}
          if(forget){const count=await forgetKeybotLearning(service,keySuiteCompanyId,teacher,forget);await telegramSend(telegramToken,chatId,count?`🧠 Forgotten: ${forget.phrase} (${forget.context})`:`No active learned rule matched ${forget.phrase} (${forget.context}).`,mainMenuMarkup());return json({ok:true,status:'learning_forgotten',count})}
          const rows=await listKeybotLearning(service,keySuiteCompanyId);const body=rows.length?rows.map((x:any,i:number)=>`${i+1}. [${x.context}] ${x.phrase} → ${x.meaning} · used ${Number(x.usage_count||0)}x`).join('\n'):'KeyBot has no approved learned aliases yet.';await telegramSend(telegramToken,chatId,`🧠 KeyBot Learning\n\n${body}\n\nTeach examples:\nTeach: VMS = CHC\nTeach KeyPLC: 2P = 2 Pumps\nTeach Customer: KLI = Keylargo Industrial Sdn Bhd\n\nForget example:\nForget KeyPLC: 2P`,mainMenuMarkup());return json({ok:true,status:'learning_list',count:rows.length});
        }catch(error){await telegramSend(telegramToken,chatId,`KeyBot could not update learning.\n\n${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return json({ok:true,status:'learning_error'})}
      }
      const learned=await applyKeybotLearning(service,keySuiteCompanyId,text);text=learned.text;
    }

    // V4.14.00 KeyPLC BOM + direct-model routing. Reply-keyboard buttons send normal text
    // messages, so the guided flow works even when Telegram webhook allowed_updates
    // does not include callback_query. Legacy inline callback handling remains supported.
    let session=await keybotSession(service,keySuiteCompanyId,chatId,senderId);
    const callbackData=String(callbackQuery?.data||'').trim();
    const cleanButton=cleanSearch(text);
    const menuText=/^(?:\/(?:start|menu)(?:@[A-Za-z0-9_]+)?|start|menu|hi|hello|hey|helo|halo|hai|yo|key\s*bot|morning|good\s+morning|afternoon|good\s+afternoon|evening|good\s+evening)[\s!.,?]*$/i.test(text)||cleanButton==='main menu';
    const customerButton=!callbackQuery&&cleanButton==='customer';
    const productButton=!callbackQuery&&cleanButton==='product';
    const quickSelectionButton=!callbackQuery&&(cleanButton==='selection'||cleanButton==='quick selection');
    const curveButton=!callbackQuery&&cleanButton==='curve';
    const quotationButton=!callbackQuery&&cleanButton==='quotation';
    const changeButton=!callbackQuery&&(cleanButton==='change'||cleanButton==='change duty');
    const continueButton=!callbackQuery&&cleanButton==='continue';
    const startSizingButton=!callbackQuery&&cleanButton==='start sizing';
    const changeDutyButton=!callbackQuery&&cleanButton==='change duty';
    const selectionScopeButton=!callbackQuery&&cleanButton==='brand series';
    const selectAllButton=!callbackQuery&&cleanButton==='select all';
    const clearAllButton=!callbackQuery&&cleanButton==='clear all';
    const searchAgainButton=!callbackQuery&&(cleanButton==='search again'||cleanButton==='change company');
    const pumpButton=!callbackQuery&&cleanButton==='pump';
    const tankButton=!callbackQuery&&cleanButton==='tank';
    const byFlowHeadButton=!callbackQuery&&cleanButton==='by flow head';
    const addToQuotationButton=!callbackQuery&&cleanButton==='add to quotation';
    const addToSystemButton=!callbackQuery&&cleanButton==='add to system';
    const addAnotherItemButton=!callbackQuery&&cleanButton==='add another item';
    const viewDraftButton=!callbackQuery&&cleanButton==='view draft';
    const myDraftsButton=!callbackQuery&&cleanButton==='my drafts';
    const editItemButton=!callbackQuery&&cleanButton==='edit item';
    const removeItemButton=!callbackQuery&&cleanButton==='remove item';
    const createQuotationButton=!callbackQuery&&cleanButton==='create quotation';
    const cancelDraftButton=!callbackQuery&&cleanButton==='cancel draft';
    const selectAgainButton=!callbackQuery&&(cleanButton==='select again'||cleanButton==='new selection');
    const curvePdfButton=!callbackQuery&&cleanButton==='curve pdf';
    const checkPriceButton=!callbackQuery&&cleanButton==='check price';
    const pumpPriceButton=!callbackQuery&&cleanButton==='pump price';
    const systemPriceButton=!callbackQuery&&cleanButton==='system price';
    const bothPricesButton=!callbackQuery&&(cleanButton==='both prices'||cleanButton==='both price');
    const barePumpButton=!callbackQuery&&cleanButton==='bare pump';
    const completePumpsetButton=!callbackQuery&&cleanButton==='complete pumpset';
    const bothPumpsetButton=!callbackQuery&&cleanButton==='both';
    const assembleButton=!callbackQuery&&cleanButton==='assemble';
    const systemButton=!callbackQuery&&cleanButton==='system';
    const baseplateButton=!callbackQuery&&cleanButton==='baseplate';
    const couplingButton=!callbackQuery&&cleanButton==='coupling';
    const newRequestButton=!callbackQuery&&(cleanButton==='new'||cleanButton==='new request'||cleanButton==='new selection'||cleanButton==='select again');
    const backButton=!callbackQuery&&cleanButton==='back';
    const lastMenuButton=!callbackQuery&&cleanButton==='last menu';
    const optionsButton=!callbackQuery&&cleanButton==='options';
    const pumpConfigurationButton=!callbackQuery&&cleanButton==='pump configuration';
    const doneOptionsButton=!callbackQuery&&cleanButton==='done';
    const materialButton=!callbackQuery&&cleanButton==='material';
    const motorButton=!callbackQuery&&cleanButton==='motor';
    const sealButton=!callbackQuery&&cleanButton==='seal';
    const elastomerButton=!callbackQuery&&cleanButton==='elastomer';
    const connectionButton=!callbackQuery&&cleanButton==='connection';
    const bareShaftButton=!callbackQuery&&cleanButton==='bare shaft';
    const quantityButton=!callbackQuery&&cleanButton==='quantity';
    const editBomButton=!callbackQuery&&cleanButton==='edit bom';
    const editBomBackButton=!callbackQuery&&cleanButton==='edit bom';
    const manifoldSizeButton=!callbackQuery&&cleanButton==='size';
    const inletFlexibleButton=!callbackQuery&&cleanButton.endsWith('inlet flexible');
    const outletFlexibleButton=!callbackQuery&&cleanButton.endsWith('outlet flexible');
    const strainerButton=!callbackQuery&&cleanButton.endsWith('strainer');
    const familyTextCode=!callbackQuery?(cleanButton==='chc'?'CHC':cleanButton==='bfi'?'BFI':cleanButton==='es 2 pole'?'ES2':cleanButton==='es 4 pole'?'ES4':''):'';
    if(callbackQuery?.id)await telegramAnswerCallback(telegramToken,String(callbackQuery.id));

    // V4.21.10: global navigation always wins over any pending Brand / Model choice.
    // This prevents New Request / Hi / Back from being consumed as a model-choice reply.
    if(menuText||callbackData==='menu:home'){
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}});
      await telegramSend(telegramToken,chatId,`Hi 👋\n\n${simpleRequestMenuText()}`,mainMenuMarkup());
      return json({ok:true,status:'keybot_menu',version:'V4.21.15'});
    }
    if(newRequestButton){
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}});
      await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());
      return json({ok:true,status:'new_request'});
    }

    // V4.23.13: BFI exact-model phase is only asked when more than one valid phase exists; single-phase-choice models auto-continue.
    if(!callbackQuery&&session?.mode==='smart_curve'&&session?.step==='bfi_waiting_phase'&&text){
      const phase=bfiPhaseChoice(text),c=sessionContext(session),base=bfiBaseModelName(c.pending_request?.direct_model);if(!phase||!bfiAvailablePhases(base).includes(phase)){await telegramSend(telegramToken,chatId,`${phase?`${phase} is not available for ${base}.\n\n`:''}BFI Model: ${base}\n\nChoose Motor Phase:`,bfiPhaseMenu(base));return json({ok:true,status:'bfi_phase_waiting'})}
      const next=bfiDirectRequestForPhase(c.pending_request||{},phase);session=await sendSimpleCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,next);return json({ok:true,status:'bfi_phase_selected',phase,model:next.direct_model});
    }
    if(!callbackQuery&&session?.mode==='price'&&session?.step==='price_bfi_waiting_phase'&&text){
      const phase=bfiPhaseChoice(text),c=sessionContext(session),base=bfiBaseModelName(c.pending_request?.direct_model);if(!phase||!bfiAvailablePhases(base).includes(phase)){await telegramSend(telegramToken,chatId,`${phase?`${phase} is not available for ${base}.\n\n`:''}BFI Model: ${base}\n\nChoose Motor Phase:`,bfiPhaseMenu(base));return json({ok:true,status:'price_bfi_phase_waiting'})}
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id||''));if(!user||!customer){await telegramSend(telegramToken,chatId,'The customer price session has expired. Start a new request.',mainMenuMarkup());return json({ok:true,status:'price_session_expired'})}
      const next=bfiDirectRequestForPhase(c.pending_request||{},phase);session=await continueSimplePrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,next);return json({ok:true,status:'price_bfi_phase_selected',phase,model:next.direct_model});
    }
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_bfi_waiting_phase'&&text){
      const phase=bfiPhaseChoice(text),c=sessionContext(session),product=c.guided_product,exact=c.guided_exact_model;if(!product||!exact){await telegramSend(telegramToken,chatId,'The BFI Product session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_bfi_phase_expired'})}
      if(!phase||!bfiAvailablePhases(exact.master_model).includes(phase)){const base=bfiBaseModelName(exact.display_model||exact.master_model);await telegramSend(telegramToken,chatId,`${phase?`${phase} is not available for ${base}.\n\n`:''}BFI Model: ${base}\n\nChoose Motor Phase:`,bfiPhaseMenu(exact.master_model));return json({ok:true,status:'guided_bfi_phase_waiting'})}
      const requestedEnhanced=!!exact.bfi_requested_enhanced,is3=phase==='3Ph',enhanced=is3&&requestedEnhanced,finalExact={...exact,master_model:bfiPhaseModelName(exact.master_model,phase,enhanced),display_model:bfiPhaseModelName(exact.display_model||exact.master_model,phase,enhanced),motor_phase:phase,bfi_phase_confirmed:true,bfi_requested_enhanced:enhanced,enhanced,enhanced_curve:enhanced};
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=session.selected_customer_id&&user?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null;
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,guided_exact_model:finalExact}});await telegramSend(telegramToken,chatId,guidedExactActionText(customer,product,finalExact),guidedExactActionMenu(product.has_curve===true,false));return json({ok:true,status:'guided_bfi_phase_selected',phase,model:finalExact.display_model});
    }
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_bfi_price_waiting_phase'&&text){
      const phase=bfiPhaseChoice(text),c=sessionContext(session),product=c.guided_product,pending=c.guided_pending_bfi_price_request;if(!product||!pending){await telegramSend(telegramToken,chatId,'The BFI price session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_bfi_price_phase_expired'})}
      if(!phase||!bfiAvailablePhases(pending.direct_model).includes(phase)){const base=bfiBaseModelName(pending.direct_model);await telegramSend(telegramToken,chatId,`${phase?`${phase} is not available for ${base}.\n\n`:''}BFI Model: ${base}\n\nChoose Motor Phase:`,bfiPhaseMenu(pending.direct_model));return json({ok:true,status:'guided_bfi_price_phase_waiting'})}
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id||''));if(!user||!customer){await telegramSend(telegramToken,chatId,'The BFI price session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_bfi_price_session_expired'})}
      try{const next=bfiDirectRequestForPhase(pending,phase);let item=directBfiModelInfo(next.direct_model);if(!item)throw new Error(`BFI model ${next.direct_model} was not found.`);item=guidedApplyProductIdentity(applyPumpOptionsToItem({...item,qty:Math.max(1,Number(next.qty||1))},mergePumpOptions({},next.options,next.qty||1)),product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...c,guided_pending_bfi_price_request:null,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedPriceResultMenu(true));return json({ok:true,status:'guided_bfi_price_phase_selected',phase,model:item.display_model||item.model})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_bfi_price_phase_error'})}
    }
    if(backButton&&session?.mode==='guided'&&session?.step==='guided_fast_model_choice'){
      session=await guidedGoBack(service,telegramToken,keySuiteCompanyId,chatId,senderId,session);
      return json({ok:true,status:'fast_model_back'});
    }

    if(myDraftsButton){await telegramSend(telegramToken,chatId,'KeyBot quotation drafts are disabled for now. Use KeySuite for quotations.\n\nFor a price, send customer + requirement in one message.',mainMenuMarkup());return json({ok:true,status:'quotation_disabled_in_keybot'})}

    if(false&&myDraftsButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'My Drafts is available to linked KeySuite users only.',mainMenuMarkup());return json({ok:true,status:'draft_user_not_linked'})}
      const r=await service.from('ks_keybot_quote_drafts_v41309').select('*').eq('company_id',keySuiteCompanyId).eq('channel','telegram').eq('sender_id',senderId).eq('user_email',String(user.email||'')).eq('status','active').order('updated_at',{ascending:false}).limit(8);if(r.error){await telegramSend(telegramToken,chatId,`Drafts could not be loaded.\n\n${r.error.message||r.error}`,mainMenuMarkup());return json({ok:true,status:'draft_load_error'})}
      const drafts=r.data||[];if(!drafts.length){await telegramSend(telegramToken,chatId,'You have no active quotation drafts.',mainMenuMarkup());return json({ok:true,status:'draft_none'})}
      const choices=drafts.map((d:any,i:number)=>({id:String(d.id),label:`${i+1}. ${String(d.customer_name||'Customer').slice(0,38)} · ${(Array.isArray(d.items)?d.items.length:0)} item${(Array.isArray(d.items)?d.items.length:0)===1?'':'s'}`}));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'draft_list',context:{keysuite_user_email:user.email,draft_choices:choices}});await telegramSend(telegramToken,chatId,'📂 My Drafts\nChoose a quotation draft to continue:',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Main Menu']]));return json({ok:true,status:'draft_list',count:choices.length});
    }
    if(!callbackQuery&&session?.step==='draft_list'&&text){const c=sessionContext(session),choices=Array.isArray(c.draft_choices)?c.draft_choices:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(choice){const draft=await loadPersistentDraft(service,keySuiteCompanyId,choice.id);if(!draft||draft.status!=='active'){await telegramSend(telegramToken,chatId,'That draft is no longer active.',mainMenuMarkup());return json({ok:true,status:'draft_inactive'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_after_add',selected_customer_id:String(draft.customer_id),context:{keysuite_user_email:String(draft.user_email),customer_name:String(draft.customer_name),draft_items:Array.isArray(draft.items)?draft.items:[],active_draft_id:String(draft.id),pending_item:null,pending_request:null}});await telegramSend(telegramToken,chatId,quotationDraftText(session),persistentDraftMenu());return json({ok:true,status:'draft_resumed',draft_id:draft.id})}}


    // V4.19.16: keep V4.19.15 inline callbacks only for already-visible legacy result messages.
    if(callbackData.startsWith('gsr:')){
      const parts=callbackData.split(':'),token=String(parts[1]||''),action=String(parts[2]||''),c=sessionContext(session),currentToken=String(c.guided_selection_token||'legacy');
      if(session?.mode!=='guided'||session?.step!=='guided_selection_results'||(token!=='legacy'&&currentToken!==token)){await telegramSend(telegramToken,chatId,'That sizing result has expired. Please run Start Sizing again.',mainMenuMarkup());return json({ok:true,status:'guided_selection_callback_expired'})}
      if(/^\d+$/.test(action)){const index=Number(action);session=await guidedSelectSizingCandidate(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,index);return json({ok:true,status:'guided_selection_result_selected',index})}
      if(action==='duty'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_waiting_duty',flow_m3h:null,head_m:null,selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,guided_selection_candidates:null,guided_selection_token:null}});await telegramSend(telegramToken,chatId,'Enter Flow @ Head.\nExample: 30m3/hr @ 80m',guidedInputNavMenu());return json({ok:true,status:'guided_selection_change_duty'})}
      if(action==='scope'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,guided_selection_candidates:null,guided_selection_token:null}});session=await guidedReopenCurrentMenu(service,telegramToken,keySuiteCompanyId,chatId,senderId,session);return json({ok:true,status:'guided_selection_scope'})}
      if(action==='back'){session=await guidedShowBackJumpMenu(service,telegramToken,keySuiteCompanyId,chatId,senderId,session);return json({ok:true,status:'guided_back_menu'})}
      if(action==='new'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}});await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());return json({ok:true,status:'new_request'})}
    }
    // Backward compatibility: consume old reply-keyboard sizing result labels before Fast Search.
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_selection_results'&&text){const c=sessionContext(session),rows=Array.isArray(c.guided_selection_candidates)?c.guided_selection_candidates:[],index=rows.findIndex((x:any,i:number)=>cleanSearch(guidedSelectionChoiceLabel(x,i))===cleanButton);if(index>=0){session=await guidedSelectSizingCandidate(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,index);return json({ok:true,status:'guided_selection_result_selected_legacy',index})}}

    // V4.19.11 Fast Search: exact model recognition runs before hydraulic-number parsing; sizing asks Flow & Head together.
    if(!callbackQuery&&text&&!menuText){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),two=keybotFastLines(rawTelegramText);
      if(user&&two&&keybotFastLooksLikePump(two.product)){
        const matches=await findGuidedCustomers(service,keySuiteCompanyId,user,two.customer);if(!matches.length){await telegramSend(telegramToken,chatId,`No Customer matched “${two.customer}”.`,mainMenuMarkup());return json({ok:true,status:'fast_customer_no_match'})}
        const exact=matches.find((x:any)=>cleanSearch(x.company_name)===cleanSearch(two.customer)),chosen=exact||matches.length===1?exact||matches[0]:null;if(chosen){session=await keybotFastHandleProduct(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,chosen,two.product);return json({ok:true,status:'fast_customer_product'})}
        const choices=matches.map((x:any)=>({id:String(x.id),label:String(x.company_name).slice(0,60)}));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_fast_customer_choice',selected_customer_id:null,context:{keysuite_user_email:user.email,guided_fast_customer_choices:choices,guided_fast_product_text:two.product}});await telegramSend(telegramToken,chatId,`Customer matches for “${two.customer}”:`,telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'fast_customer_choice',count:choices.length})
      }
      if(user&&keybotFastExactMayOverrideSession(session)&&keybotFastLooksLikePump(rawTelegramText)&&keybotFastLooksLikeExactPumpModel(rawTelegramText)){
        // V4.19.11: exact-model Fast Search takes priority over ordinary navigation before any hydraulic-number interpretation.
        // Do not carry the old temporary request/customer/model into the new exact-model lookup.
        session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}})||session;
        const products=await guidedUserAvailableProducts(service,keySuiteCompanyId,user),matches=keybotFastPrepareMatches(await keybotFastModelMatches(service,keySuiteCompanyId,products,rawTelegramText),rawTelegramText);if(matches.length===1){session=await keybotFastOpenPreparedMatch(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,null,matches[0],{keysuite_user_email:user.email});return json({ok:true,status:matches[0]?.keybot_fast_choose_pole?'fast_exact_es_pole':'fast_exact_model'})}if(matches.length>1){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_fast_model_choice',selected_customer_id:null,context:{keysuite_user_email:user.email,guided_fast_matches:matches}});await telegramSend(telegramToken,chatId,'More than one matching model was found. Choose the desired Brand / Model:',keybotFastMatchKeyboard(matches));return json({ok:true,status:'fast_model_choice',count:matches.length})}await telegramSend(telegramToken,chatId,`No exact assigned pump model matched “${rawTelegramText}”.\n\nTry the exact Brand + Model, for example B.G.Reich ES 80-26 4P.`,mainMenuMarkup());return json({ok:true,status:'fast_exact_model_not_found'});
      }
    }
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_fast_customer_choice'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),c=sessionContext(session),choices=Array.isArray(c.guided_fast_customer_choices)?c.guided_fast_customer_choices:[],pick=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(user&&pick){const customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(pick.id));if(customer){session=await keybotFastHandleProduct(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,customer,c.guided_fast_product_text||'');return json({ok:true,status:'fast_customer_selected'})}}await telegramSend(telegramToken,chatId,'Choose one of the shown Customers.',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'fast_customer_waiting'})}
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_fast_model_choice'&&text){const c=sessionContext(session),matches=Array.isArray(c.guided_fast_matches)?c.guided_fast_matches:[],pick=matches.find((x:any)=>cleanSearch(x.label)===cleanButton);if(pick){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=session.selected_customer_id&&user?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null;session=await keybotFastOpenPreparedMatch(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,pick,c);return json({ok:true,status:pick?.keybot_fast_choose_pole?'fast_model_pole':'fast_model_selected'})}await telegramSend(telegramToken,chatId,'Choose one of the shown Brand / Model matches.',keybotFastMatchKeyboard(matches));return json({ok:true,status:'fast_model_waiting'})}

    if(menuText||callbackData==='menu:home'){
      // V4.19.09: Hi/Hey/Start/Menu always begins a fresh Telegram request.
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}});
      await telegramSend(telegramToken,chatId,`Hi 👋

${simpleRequestMenuText()}`,mainMenuMarkup());
      return json({ok:true,status:'keybot_menu',version:'V4.19.18'});
    }

    if(newRequestButton){
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{}});
      await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());
      return json({ok:true,status:'new_request'});
    }
    if(lastMenuButton){
      if(session?.mode==='guided'&&session?.step&&session.step!=='idle'){
        session=await guidedReopenCurrentMenu(service,telegramToken,keySuiteCompanyId,chatId,senderId,session);
        return json({ok:true,status:'guided_last_menu'});
      }
      await telegramSend(telegramToken,chatId,simpleRequestMenuText(),mainMenuMarkup());
      return json({ok:true,status:'guided_last_menu_empty'});
    }
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_back_menu'&&text&&!backButton){
      const jumped=await guidedUseBackTarget(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,text);
      if(jumped)return json({ok:true,status:'guided_back_jump'});
      const c=sessionContext(session),targets=Array.isArray(c.guided_back_targets)?c.guided_back_targets:[];await telegramSend(telegramToken,chatId,'Choose one of the earlier stages:',telegramReplyKeyboard([...targets.map((x:any)=>[String(x.label).slice(0,60)]),['🔄 New Request']]));return json({ok:true,status:'guided_back_waiting'});
    }
    if(backButton&&session?.mode==='keyplc'){
      const c=sessionContext(session),step=String(session.step||'');
      if(step==='keyplc_result'&&c.guided_product&&c.pending_item){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:session.selected_customer_id||null,flow_m3h:Number(session.flow_m3h||c.pending_item?.requested_flow_m3h||0)||null,head_m:Number(session.head_m||c.pending_item?.requested_head_m||0)||null,context:c});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(c.pending_item)}

Choose action:`,guidedProductActionMenu(false));return json({ok:true,status:'keyplc_back_to_selection'})}
      if(step==='keyplc_edit_menu'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_result',selected_customer_id:session.selected_customer_id||null,context:c});await telegramSend(telegramToken,chatId,keyplcBomText(c.keyplc_bom),keyplcResultMenu(!!session.selected_customer_id));return json({ok:true,status:'keyplc_back_to_result'})}
      if(['keyplc_edit_pump','keyplc_edit_pump_qty'].includes(step)){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_pump_menu',context:c});await telegramSend(telegramToken,chatId,'Edit Pump:',keyplcPumpMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_back_to_pump_menu'})}
      if(['keyplc_edit_manifold_size','keyplc_edit_manifold_material'].includes(step)){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold',context:c});await telegramSend(telegramToken,chatId,'Edit Manifold:',keyplcManifoldMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_back_to_manifold'})}
      if(['keyplc_edit_pump_menu','keyplc_edit_panel','keyplc_edit_manifold','keyplc_edit_tank'].includes(step)){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:c});await telegramSend(telegramToken,chatId,'Choose the component to change:',keyplcEditMenu());return json({ok:true,status:'keyplc_back_to_edit_menu'})}
    }
    if(backButton){
      session=await guidedShowBackJumpMenu(service,telegramToken,keySuiteCompanyId,chatId,senderId,session);
      return json({ok:true,status:'guided_back_menu'});
    }
    // V4.18.03 — Guided fresh-request flow follows Role -> View customers.
    if(customerButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'guided_user_not_linked'})}
      const customerScope=normalizeCustomerScope(user.view_customers);
      if(customerScope==='none'){await telegramSend(telegramToken,chatId,'You do not have permission to view Customers under your KeySuite Role.',mainMenuMarkup());return json({ok:true,status:'guided_customer_permission_none'})}
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,flow_m3h:null,head_m:null,context:{keysuite_user_email:user.email,customer_choices:[]}});
      const accessNote=customerScope==='all'?'Your Role allows all active Customers.':'Only Customers assigned to your KeySuite user will be shown.';
      await telegramSend(telegramToken,chatId,`Please enter customer name.\nExample: KEY\n\n${accessNote}`,guidedInputNavMenu());return json({ok:true,status:'guided_waiting_customer',customer_scope:customerScope});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_waiting_customer'&&text&&!customerButton&&!productButton&&!quickSelectionButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'guided_user_not_linked'})}
      const c=sessionContext(session),choices=Array.isArray(c.customer_choices)?c.customer_choices:[],chosen=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);
      if(chosen){const customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(chosen.id));if(customer){
        const after=String(c.guided_after_customer||'');
        if(after==='exact_price'&&c.guided_product&&c.guided_exact_model){
          session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',selected_customer_id:String(customer.id),context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null}});
          try{session=await guidedFinishExactPrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,c.guided_product,c.guided_exact_model);return json({ok:true,status:'guided_customer_selected_exact_price',customer_id:customer.id})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(c.guided_product.has_curve===true));return json({ok:true,status:'guided_customer_selected_exact_price_error'})}
        }
        if(after==='chc_price_scope'&&c.guided_product&&c.pending_item){
          const choice=String(c.guided_chc_price_choice||'');session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_chc_price_scope',selected_customer_id:String(customer.id),flow_m3h:Number(session.flow_m3h||c.pending_item?.requested_flow_m3h||0)||null,head_m:Number(session.head_m||c.pending_item?.requested_head_m||0)||null,context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null}});
          if(choice){try{session=await guidedRunChcPriceChoice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,choice);return json({ok:true,status:`guided_customer_selected_chc_${choice}_price`,customer_id:customer.id})}catch(error){await telegramSend(telegramToken,chatId,`The CHC price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedChcPriceScopeMenu());return json({ok:true,status:'guided_customer_selected_chc_price_error'})}}
          await telegramSend(telegramToken,chatId,'Choose CHC price:',guidedChcPriceScopeMenu());return json({ok:true,status:'guided_customer_selected_chc_price_scope',customer_id:customer.id});
        }
        if(after==='selection_price'&&c.guided_product&&c.pending_item){
          session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:String(customer.id),context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null}});
          try{session=await guidedFinishSelectionPrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user);return json({ok:true,status:'guided_customer_selected_selection_price',customer_id:customer.id})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedProductActionMenu());return json({ok:true,status:'guided_customer_selected_selection_price_error'})}
        }
        if(after==='es_assembly_price'&&c.guided_product&&c.es_assembly_bom){
          try{const priced=await quoteKeybotEsAssembly(service,customer,user,c.guided_product,c.es_assembly_bom);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:String(c.guided_return_step||'guided_es_assembly'),selected_customer_id:String(customer.id),context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null,es_assembly_bom:priced}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(priced,customer),String(c.guided_return_step||'guided_es_assembly')==='guided_es_system'?guidedEsSystemMenu():guidedEsAssemblyMenu());return json({ok:true,status:'guided_customer_selected_es_assembly_price',customer_id:customer.id})}catch(error){await telegramSend(telegramToken,chatId,`The ES Pumpset price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedEsAssemblyMenu());return json({ok:true,status:'guided_customer_selected_es_assembly_price_error'})}
        }
        if(after==='es_complete_price'&&c.guided_product&&c.es_assembly_bom){
          try{const priced=await quoteKeybotEsAssembly(service,customer,user,c.guided_product,c.es_assembly_bom);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:String(customer.id),context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null,guided_es_price_supply:'complete',es_assembly_bom:priced}});await telegramSend(telegramToken,chatId,`Supply: Complete Pumpset\n\n${guidedEsAssemblyText(priced,customer)}\n\nChoose action:`,guidedProductActionMenu(true));return json({ok:true,status:'guided_customer_selected_es_complete_price',customer_id:customer.id})}catch(error){await telegramSend(telegramToken,chatId,`The ES Complete Pumpset price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_customer_selected_es_complete_price_error'})}
        }
        if(after==='es_both_price'&&c.guided_product&&c.es_assembly_bom&&c.pending_item){
          try{const bare=await quotePumpForCustomer(service,String(customer.id),guidedApplyProductIdentity(c.pending_item,c.guided_product),String(user.email||''));bare.supply_scope='Bare Pump';const complete=await quoteKeybotEsAssembly(service,customer,user,c.guided_product,c.es_assembly_bom);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:String(customer.id),context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null,guided_es_price_supply:'both',es_assembly_bom:complete,es_bare_priced:bare}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\nBare Pump\n${quotationResultText(bare)}\n\nComplete Pumpset\n${guidedEsAssemblyText(complete,null)}\n\nChoose action:`,guidedProductActionMenu(true));return json({ok:true,status:'guided_customer_selected_es_both_price',customer_id:customer.id})}catch(error){await telegramSend(telegramToken,chatId,`The ES comparison price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_customer_selected_es_both_price_error'})}
        }
        session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_customer_selected',selected_customer_id:String(customer.id),context:{...c,keysuite_user_email:user.email,customer_name:customer.company_name,customer_choices:choices,guided_after_customer:null}});await telegramSend(telegramToken,chatId,`✅ Customer: ${customer.company_name}\n\nChoose Product or Selection:`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_customer_selected',customer_id:customer.id})}}
      const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'You do not have permission to view Customers under your KeySuite Role.',mainMenuMarkup());return json({ok:true,status:'guided_customer_permission_none'})}
      const matches=await findGuidedCustomers(service,keySuiteCompanyId,user,text);if(!matches.length){await telegramSend(telegramToken,chatId,customerScope==='all'?'No customer found. Please try another name.':'No assigned customer found. Please try another name.',guidedInputNavMenu());return json({ok:true,status:'guided_customer_no_match'})}
      const nextChoices=matches.map((x:any)=>({id:String(x.id),label:String(x.company_name).slice(0,60)}));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:nextChoices}});await telegramSend(telegramToken,chatId,`${customerScope==='all'?'Customer':'Assigned Customer'} matches for “${text}”:`,telegramReplyKeyboard([...nextChoices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_customer_matches',count:nextChoices.length,customer_scope:customerScope});
    }

    // V4.19.01 — Product and Selection can start without Customer.
    // User product authority is applied first. Customer is required only when Price is requested.
    if(productButton&&!(session?.mode==='guided'&&session?.selected_customer_id)){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'guided_user_not_linked'})}
      try{const products=await guidedUserAvailableProducts(service,keySuiteCompanyId,user);if(!products.length){await telegramSend(telegramToken,chatId,'No Product is assigned to your KeySuite user/Role.',mainMenuMarkup());return json({ok:true,status:'guided_user_no_products'})}const choices=products.map((x:any)=>({key:String(x.key),label:guidedProductButtonLabel(x),product:x}));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_product',selected_customer_id:null,context:{keysuite_user_email:user.email,guided_product_choices:choices,guided_product:null,guided_origin:'user'}});await telegramSend(telegramToken,chatId,'Choose Product from your assigned Brand / Series:',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['🔎 Selection'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_user_product_menu',count:choices.length})}catch(error){await telegramSend(telegramToken,chatId,`Assigned Product list could not be loaded.\n\n${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return json({ok:true,status:'guided_user_product_error'})}
    }
    if(quickSelectionButton&&!(session?.mode==='guided'&&session?.selected_customer_id)){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'guided_user_not_linked'})}
      try{session=await guidedOpenSelection(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,null);return json({ok:true,status:'guided_user_selection_scope'})}catch(error){await telegramSend(telegramToken,chatId,`Selection could not load assigned Brand / Series.

${error instanceof Error?error.message:String(error)}`,mainMenuMarkup());return json({ok:true,status:'guided_user_selection_error'})}
    }

    if(productButton&&session?.mode==='guided'&&session?.selected_customer_id){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id));if(!user||!customer){await telegramSend(telegramToken,chatId,'The selected Customer is no longer available under your Role Customer permission. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_customer_expired'})}
      try{const products=await guidedProductsForContext(service,keySuiteCompanyId,user,String(customer.id));if(!products.length){await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\nNo Product is assigned under both your User Brand/Series and this Customer Price Preference.`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_no_products'})}const choices=products.map((x:any)=>({key:String(x.key),label:guidedProductButtonLabel(x),product:x}));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_product',selected_customer_id:String(customer.id),context:{...sessionContext(session),keysuite_user_email:user.email,customer_name:customer.company_name,guided_product_choices:choices,guided_product:null}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\nChoose Product:`,telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['🔎 Selection'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_product_menu',count:choices.length})}catch(error){await telegramSend(telegramToken,chatId,`Assigned Product list could not be loaded.\n\n${error instanceof Error?error.message:String(error)}`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_product_error'})}
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_waiting_product'&&text&&!productButton&&!quickSelectionButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),choices=Array.isArray(c.guided_product_choices)?c.guided_product_choices:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(!user||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The guided Product session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_product_expired'})}if(!choice){await telegramSend(telegramToken,chatId,'Please choose one of the assigned Product buttons.',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_product_waiting'})}const product=choice.product;try{session=await guidedStartCatalog(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product);return json({ok:true,status:'guided_product_drilldown_started'})}catch(error){await telegramSend(telegramToken,chatId,`Product catalogue could not be opened.\n\n${error instanceof Error?error.message:String(error)}`,customer?guidedSelectedCustomerMenu():mainMenuMarkup());return json({ok:true,status:'guided_product_drilldown_error'})}
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_catalog'&&text&&!quickSelectionButton&&!productButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product,choices=Array.isArray(c.guided_catalog_choices)?c.guided_catalog_choices:[];if(!user||!product||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The guided Product session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_catalog_expired'})}
      if(cleanButton==='product'){try{session=await guidedStartCatalog(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product);return json({ok:true,status:'guided_catalog_restart'})}catch(error){await telegramSend(telegramToken,chatId,String(error),customer?guidedSelectedCustomerMenu():mainMenuMarkup());return json({ok:true,status:'guided_catalog_restart_error'})}}
      let selected=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);
      // V4.21.15: buttons are the normal path, but accept 2 / 2P / 2 Pole and
      // 4 / 4P / 4 Pole as a typing fallback while waiting at the ES Pole step.
      if(!selected&&String(product?.price_group||'').toUpperCase()==='ES'&&choices.some((x:any)=>x?.kind==='pole')){
        const compact=cleanButton.replace(/\s+/g,''),m=compact.match(/^([24])(?:p|pole)?$/i),typedPole=Number(m?.[1]||0);
        if(typedPole)selected=choices.find((x:any)=>x?.kind==='pole'&&Number(x?.meta?.pole||String(x?.value||'').match(/\d+/)?.[0]||0)===typedPole);
      }
      if(!selected){await telegramSend(telegramToken,chatId,'Please choose one of the shown options.',guidedKeyboardForChoices(choices));return json({ok:true,status:'guided_catalog_waiting'})}
      const currentPath=Array.isArray(c.guided_catalog_path)?c.guided_catalog_path:[];try{const currentLevel=await guidedCatalogLevel(service,keySuiteCompanyId,product,currentPath),path=[...currentPath,selected];if(currentLevel.exact&&(selected.kind==='model'||selected.kind==='pump_qty')){session=await guidedSaveExactCatalogChoice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,product,path,selected,c);return json({ok:true,status:'guided_exact_model_ready'})}
        const resolved=await guidedResolveCatalogLevel(service,keySuiteCompanyId,product,path);if(resolved.exactChoice){session=await guidedSaveExactCatalogChoice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,product,resolved.path,resolved.exactChoice,c);return json({ok:true,status:'guided_exact_model_ready_auto'})}
        const level=resolved.level,next=level.choices||[];session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_catalog',selected_customer_id:String(customer?.id||'')||null,context:{...c,guided_catalog_path:resolved.path,guided_catalog_choices:next}});await telegramSend(telegramToken,chatId,level.title,guidedKeyboardForChoices(next));return json({ok:true,status:'guided_catalog_next',count:next.length});
      }catch(error){await telegramSend(telegramToken,chatId,`Product drill-down could not continue.\n\n${error instanceof Error?error.message:String(error)}`,customer?guidedSelectedCustomerMenu():mainMenuMarkup());return json({ok:true,status:'guided_catalog_error'})}
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_baseplate_channel'&&text){const c=sessionContext(session),product=c.guided_product,valid=['1½" x 3"','2" x 4"','2½" x 5"','3" x 6"','3½" x 7"','3½" x 8"'];const channel=valid.find(x=>cleanSearch(x)===cleanButton);if(!channel){await telegramSend(telegramToken,chatId,'Choose one of the shown C-Channel sizes.');return json({ok:true,status:'guided_baseplate_channel_waiting'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_baseplate_l3',selected_customer_id:String(session.selected_customer_id),context:{...c,guided_baseplate:{cChannel:channel}}});await telegramSend(telegramToken,chatId,`${channel}\n\nEnter L3 length in mm.\nExample: 1200`,guidedInputNavMenu());return json({ok:true,status:'guided_baseplate_l3'})}
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_baseplate_l3'&&text){const n=Number((String(text).match(/\d+(?:\.\d+)?/)||[])[0]||0),c=sessionContext(session);if(!(n>0)){await telegramSend(telegramToken,chatId,'Enter L3 length in mm.');return json({ok:true,status:'guided_baseplate_l3_waiting'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_baseplate_w1',selected_customer_id:String(session.selected_customer_id),context:{...c,guided_baseplate:{...(c.guided_baseplate||{}),L3:n}}});await telegramSend(telegramToken,chatId,`L3 ${inputNumber(n)} mm\n\nEnter W1 width in mm.\nExample: 500`,guidedInputNavMenu());return json({ok:true,status:'guided_baseplate_w1'})}
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_baseplate_w1'&&text){const n=Number((String(text).match(/\d+(?:\.\d+)?/)||[])[0]||0),user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product;if(!(n>0)||!user||!product||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'Enter W1 width in mm.');return json({ok:true,status:'guided_baseplate_w1_waiting'})}const b={...(c.guided_baseplate||{}),W1:n},exact={master_model:`${b.cChannel} · L3 ${b.L3} · W1 ${b.W1}`,display_model:`${b.cChannel} · L3 ${b.L3} · W1 ${b.W1}`,baseplate:b};session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',selected_customer_id:String(customer?.id||'')||null,context:{...c,guided_exact_model:exact,guided_baseplate:b}});await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n`:''}Product: Baseplate\nModel: ${exact.display_model}\n\nChoose action:`,guidedExactActionMenu(false));return json({ok:true,status:'guided_baseplate_exact'})}

    if(session?.mode==='guided'&&session?.step==='guided_exact_model_action'&&(curveButton||assembleButton||checkPriceButton)){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product,exact=c.guided_exact_model;
      if(!user||!product||!exact||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The exact Product session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_exact_expired'})}
      if(assembleButton){
        if(String(product.price_group||'').toUpperCase()!=='ES'){await telegramSend(telegramToken,chatId,'Assemble is available for ES Pumpsets.',guidedExactActionMenu(product.has_curve===true,false));return json({ok:true,status:'guided_exact_assemble_not_es'})}
        const knownPole=Number(exact?.pole||c.guided_exact_pole||0);if(![2,4].includes(knownPole)){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_es_pole',selected_customer_id:customerId||null,context:{...c,guided_exact_pole_action:'assemble'}});await telegramSend(telegramToken,chatId,`Model: ${exact.display_model}\n\nChoose ES motor speed for Assembly:`,telegramReplyKeyboard([['ES 2 Pole','ES 4 Pole'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_exact_es_assemble_pole'})}
        try{const rated=exactEsRatedPoint(exact.master_model,knownPole);if(!rated)throw new Error('Rated point could not be resolved for this ES model.');let item:any=selectPumpSummary('ES',Number(rated.flow_m3h),Number(rated.head_m),knownPole,String(exact.master_model||''));item=guidedApplyProductIdentity({...item,display_model:String(exact.display_model||item.model)},product);const bom=keybotEsAssemblyBuild(item,{});session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',flow_m3h:Number(rated.flow_m3h),head_m:Number(rated.head_m),selected_customer_id:customerId||null,context:{...c,guided_exact_pole:knownPole,guided_exact_pole_action:null,pending_item:item,es_assembly_source_item:item,es_assembly_bom:bom}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(bom,customer),guidedEsAssemblyMenu());return json({ok:true,status:'guided_exact_es_assembly_ready',pole:knownPole})}catch(error){await telegramSend(telegramToken,chatId,`ES Assembly could not be prepared.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(true,true));return json({ok:true,status:'guided_exact_es_assembly_error'})}
      }
      if(curveButton){
        if(product.has_curve!==true){await telegramSend(telegramToken,chatId,'This Product does not have a hydraulic curve.',guidedExactActionMenu(false));return json({ok:true,status:'guided_exact_no_curve'})}
        const group=String(product.price_group||'').toUpperCase();
        if(group==='ES'){
          const knownPole=Number(exact?.pole||0);
          if([2,4].includes(knownPole)){
            try{session=await guidedSendExactRatedCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,product,exact,knownPole);return json({ok:true,status:'guided_exact_curve_sent',pole:knownPole})}catch(error){await telegramSend(telegramToken,chatId,`Exact ES curve could not be generated.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(true));return json({ok:true,status:'guided_exact_curve_error'})}
          }
          session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_es_pole',selected_customer_id:customerId||null,context:{...c,guided_exact_pole_action:'curve'}});await telegramSend(telegramToken,chatId,`Model: ${exact.display_model}\n\nChoose ES motor speed:`,telegramReplyKeyboard([['ES 2 Pole','ES 4 Pole'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_exact_es_pole'});
        }
        try{session=await guidedSendExactRatedCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,product,exact,0);return json({ok:true,status:'guided_exact_curve_sent'})}catch(error){await telegramSend(telegramToken,chatId,`Exact model curve could not be generated.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(true));return json({ok:true,status:'guided_exact_curve_error'})}
      }
      if(checkPriceButton&&['CHC_G1','CHC_G2'].includes(String(product.price_group||'').toUpperCase())){const group=String(product.price_group||'').toUpperCase(),base=directChcModelInfo(String(exact.master_model||''),group);if(!base){await telegramSend(telegramToken,chatId,`Pump model ${String(exact.master_model||'')} was not found.`,guidedExactActionMenu(product.has_curve===true,false));return json({ok:true,status:'guided_exact_chc_price_model_not_found'})}const item=guidedApplyProductIdentity({...base,display_model:String(exact.display_model||base.model),qty:1},product);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_chc_price_scope',flow_m3h:Number(session.flow_m3h||item?.requested_flow_m3h||0)||null,head_m:Number(session.head_m||item?.requested_head_m||0)||null,selected_customer_id:customerId||null,context:{...c,pending_item:item,guided_chc_price_choice:null,guided_return_step:'guided_exact_model_action'}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose Price:`,guidedChcPriceScopeMenu());return json({ok:true,status:'guided_exact_chc_price_scope'})}
      if(checkPriceButton&&String(product.price_group||'').toUpperCase()==='ES'){
        const knownPole=Number(exact?.pole||c.guided_exact_pole||0);if(![2,4].includes(knownPole)){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_es_pole',selected_customer_id:customerId||null,context:{...c,guided_exact_pole_action:'price_scope'}});await telegramSend(telegramToken,chatId,`Model: ${exact.display_model}\n\nChoose ES motor speed for Price:`,telegramReplyKeyboard([['ES 2 Pole','ES 4 Pole'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_exact_es_price_pole'})}
        try{const rated=exactEsRatedPoint(exact.master_model,knownPole);if(!rated)throw new Error('Rated point could not be resolved for this ES model.');let item:any=selectPumpSummary('ES',Number(rated.flow_m3h),Number(rated.head_m),knownPole,String(exact.master_model||''));item=guidedApplyProductIdentity({...item,display_model:String(exact.display_model||item.model)},product);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_price_scope',flow_m3h:Number(rated.flow_m3h),head_m:Number(rated.head_m),selected_customer_id:customerId||null,context:{...c,guided_exact_pole:knownPole,pending_item:item,guided_es_price_return_step:'guided_exact_model_action',guided_es_price_supply:null}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose supply for Price:`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_exact_es_price_scope',pole:knownPole})}catch(error){await telegramSend(telegramToken,chatId,`ES Price scope could not be prepared.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(true,true));return json({ok:true,status:'guided_exact_es_price_scope_error'})}
      }
      if(!customer){
        const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedExactActionMenu(product.has_curve===true,String(product.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_exact_price_customer_denied'})}
        session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'exact_price',guided_return_step:'guided_exact_model_action'}});
        await telegramSend(telegramToken,chatId,'Select Customer for this Price.\n\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_exact_price_customer_required'});
      }
      try{session=await guidedFinishExactPrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,exact);return json({ok:true,status:'guided_exact_price_ready'})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(product.has_curve===true,String(product.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_exact_price_error'})}
    }
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_exact_es_pole'&&familyTextCode){const c=sessionContext(session),pole=familyTextCode==='ES4'?4:2,exact=c.guided_exact_model,user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,product=c.guided_product;if(!user||!product||!exact||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The exact ES Product session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_exact_expired'})}try{if(String(c.guided_exact_pole_action||'curve')==='fast_auto'){const selected={kind:'model',value:String(exact.id||exact.master_model||''),label:String(exact.display_model||exact.master_model||''),meta:{...exact,pole,rpm:pole===2?2900:1450,available_poles:null,keybot_fast_choose_pole:false}},match={product,selected,path:[selected],label:`${String(product.brand_name||'Brand')} - ${String(exact.display_model||exact.master_model||'ES')} ${pole}P`};session=await keybotFastOpenMatch(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,match,{...c,guided_exact_pole_action:null,guided_exact_pole:pole});return json({ok:true,status:'fast_exact_es_curve_sent',pole})}if(String(c.guided_exact_pole_action||'curve')==='price_scope'){const rated=exactEsRatedPoint(exact.master_model,pole);if(!rated)throw new Error('Rated point could not be resolved for this ES model.');let item:any=selectPumpSummary('ES',Number(rated.flow_m3h),Number(rated.head_m),pole,String(exact.master_model||''));item=guidedApplyProductIdentity({...item,display_model:String(exact.display_model||item.model)},product);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_price_scope',flow_m3h:Number(rated.flow_m3h),head_m:Number(rated.head_m),selected_customer_id:customerId||null,context:{...c,guided_exact_pole:pole,guided_exact_pole_action:null,pending_item:item,guided_es_price_return_step:'guided_exact_model_action',guided_es_price_supply:null}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose supply for Price:`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_exact_es_price_scope',pole})}if(String(c.guided_exact_pole_action||'curve')==='assemble'){const rated=exactEsRatedPoint(exact.master_model,pole);if(!rated)throw new Error('Rated point could not be resolved for this ES model.');let item:any=selectPumpSummary('ES',Number(rated.flow_m3h),Number(rated.head_m),pole,String(exact.master_model||''));item=guidedApplyProductIdentity({...item,display_model:String(exact.display_model||item.model)},product);const bom=keybotEsAssemblyBuild(item,{});session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',flow_m3h:Number(rated.flow_m3h),head_m:Number(rated.head_m),selected_customer_id:customerId||null,context:{...c,guided_exact_pole:pole,guided_exact_pole_action:null,pending_item:item,es_assembly_source_item:item,es_assembly_bom:bom}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(bom,customer),guidedEsAssemblyMenu());return json({ok:true,status:'guided_exact_es_assembly_ready',pole})}session=await guidedSendExactRatedCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,product,exact,pole);return json({ok:true,status:'guided_exact_curve_sent',pole})}catch(error){await telegramSend(telegramToken,chatId,`Exact ES action could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(true,true));return json({ok:true,status:'guided_exact_es_action_error'})}}
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_exact_curve_duty'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)),c=sessionContext(session),product=c.guided_product,exact=c.guided_exact_model,parsed=smartQuoteRequest(text),q=Number(parsed.flow_m3h||0),h=Number(parsed.head_m||0),pole=Number(c.guided_exact_pole||2);if(!user||!customer||!product||!exact){await telegramSend(telegramToken,chatId,'The exact Product session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_exact_expired'})}if(!(q>0)||!(h>0)){await telegramSend(telegramToken,chatId,'Please enter both Flow and Head.\nExample: 30m3/hr @ 50m',guidedInputNavMenu());return json({ok:true,status:'guided_exact_curve_duty_waiting'})}try{const family=guidedSelectorFamily(product.price_group),duty=`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`,curveIdentity=await guidedCurveDisplayIdentity(service,keySuiteCompanyId,product,String(exact.master_model||''),String(exact.display_model||'')),pdf=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),family==='ES'?pole:0,String(exact.master_model||''),curveIdentity);await telegramSendDocument(telegramToken,chatId,pdf.bytes,pdf.filename,`${exact.display_model||exact.master_model} curve ready\n${duty}`);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_exact_model_action',flow_m3h:q,head_m:h,selected_customer_id:String(customer.id),context:{...c,guided_exact_pole:pole}});await telegramSend(telegramToken,chatId,'Choose the next action:',guidedExactActionMenu(true,family==='ES'));return json({ok:true,status:'guided_exact_curve_sent'})}catch(error){await telegramSend(telegramToken,chatId,`Exact model curve could not be generated.\n\n${error instanceof Error?error.message:String(error)}`,guidedExactActionMenu(true,String(product?.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_exact_curve_error'})}}

    if(quickSelectionButton&&session?.mode==='guided'&&session?.selected_customer_id){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id));if(!user||!customer){await telegramSend(telegramToken,chatId,'The selected Customer session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_customer_expired'})}
      try{session=await guidedOpenSelection(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,customer);return json({ok:true,status:'guided_customer_selection_scope'})}catch(error){await telegramSend(telegramToken,chatId,`Selection could not load assigned Brand / Series.

${error instanceof Error?error.message:String(error)}`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_customer_selection_error'})}
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_selection_scope'&&text&&!quickSelectionButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),products=Array.isArray(c.guided_selection_products)?c.guided_selection_products:[],selected=new Set<string>((Array.isArray(c.guided_selection_keys)?c.guided_selection_keys:[]).map((x:any)=>String(x)));if(!user||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The Selection session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_selection_expired'})}
      if(selectAllButton){products.forEach((x:any)=>selected.add(String(x.key)));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:customerId||null,context:{...c,guided_selection_keys:[...selected]}});await telegramSend(telegramToken,chatId,'All searchable Brand / Series selected.',guidedSelectionRows(products,[...selected]));return json({ok:true,status:'guided_selection_all'})}
      if(clearAllButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:customerId||null,context:{...c,guided_selection_keys:[]}});await telegramSend(telegramToken,chatId,'Selection cleared.',guidedSelectionRows(products,[]));return json({ok:true,status:'guided_selection_clear'})}
      if(continueButton){if(!selected.size){await telegramSend(telegramToken,chatId,'Tick at least one Brand / Series before continuing.',guidedSelectionRows(products,[...selected]));return json({ok:true,status:'guided_selection_none'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_waiting_duty',selected_customer_id:customerId||null,flow_m3h:null,head_m:null,context:{...c,guided_selection_keys:[...selected]}});await telegramSend(telegramToken,chatId,`${customer?`Customer: ${customer.company_name}\n\n`:''}Enter Flow @ Head.\nExample: 30m3/hr @ 80m`,guidedInputNavMenu());return json({ok:true,status:'guided_selection_waiting_duty'})}
      const toggle=guidedSelectionToggle(text,products);if(toggle?.kind==='series'){const key=String(toggle.key);selected.has(key)?selected.delete(key):selected.add(key)}else if(toggle?.kind==='brand'){const keys=(toggle.keys||[]).map((x:any)=>String(x)),all=keys.length&&keys.every((k:string)=>selected.has(k));keys.forEach((k:string)=>all?selected.delete(k):selected.add(k))}else{await telegramSend(telegramToken,chatId,'Use the checkboxes to choose Brand / Series, then press Continue.',guidedSelectionRows(products,[...selected]));return json({ok:true,status:'guided_selection_waiting'})}
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:customerId||null,context:{...c,guided_selection_keys:[...selected]}});await telegramSend(telegramToken,chatId,'Search Brand / Series:',guidedSelectionRows(products,[...selected]));return json({ok:true,status:'guided_selection_toggled',count:selected.size});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_selection_waiting_duty'&&text){
      const c=sessionContext(session),parsed=smartQuoteRequest(text),q=Number(parsed.flow_m3h||0),h=Number(parsed.head_m||0);if(!(q>0)||!(h>0)){await telegramSend(telegramToken,chatId,'Please enter both Flow and Head.\nExample: 30m3/hr @ 80m',guidedInputNavMenu());return json({ok:true,status:'guided_selection_duty_incomplete'})}
      const products=Array.isArray(c.guided_selection_products)?c.guided_selection_products:[],keys=new Set((Array.isArray(c.guided_selection_keys)?c.guided_selection_keys:[]).map((x:any)=>String(x))),chosen=products.filter((x:any)=>keys.has(String(x.key)));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_confirm_duty',flow_m3h:q,head_m:h,selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,guided_duty_text:dutyDisplay(String(text||''),q,h).duty_text,guided_pending_request:{...parsed,raw_input:String(text||''),flow_m3h:q,head_m:h}}});await telegramSend(telegramToken,chatId,`Duty: ${dutyDisplay(String(text||''),q,h).duty_text}\n\nSearch:\n${chosen.map((x:any)=>`• ${guidedSelectionSeriesLabel(x)}`).join('\n')}\n\nPress Start Sizing to search the selected ranges.`,telegramReplyKeyboard([['▶️ Start Sizing'],['✏️ Change Duty','☑ Brand / Series'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_selection_confirm_duty'});
    }

    if(session?.mode==='guided'&&session?.step==='guided_selection_confirm_duty'&&startSizingButton){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),products=Array.isArray(c.guided_selection_products)?c.guided_selection_products:[],keys=new Set((Array.isArray(c.guided_selection_keys)?c.guided_selection_keys:[]).map((x:any)=>String(x))),chosen=products.filter((x:any)=>keys.has(String(x.key))),q=Number(session.flow_m3h||0),h=Number(session.head_m||0);if(!user||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The Selection session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_selection_expired'})}const candidates=await guidedSizeSelectedProducts(service,keySuiteCompanyId,chosen,q,h);if(!candidates.length){await telegramSend(telegramToken,chatId,guidedSelectionResultText(q,h,[],String(c.guided_duty_text||'')),telegramReplyKeyboard([['✏️ Change Duty','☑ Brand / Series'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_selection_no_result'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_results',flow_m3h:q,head_m:h,selected_customer_id:customerId||null,context:{...c,guided_selection_candidates:candidates,guided_selection_token:guidedSelectionNewToken(),guided_pending_request:{...(c.guided_pending_request||{}),flow_m3h:q,head_m:h}}});const resultContext=sessionContext(session),resultToken=String(resultContext.guided_selection_token||'legacy');await telegramSend(telegramToken,chatId,guidedSelectionResultText(q,h,candidates,String(c.guided_duty_text||'')),guidedSelectionResultKeyboard(candidates,resultToken));return json({ok:true,status:'guided_selection_results',count:candidates.length});
    }

    if(session?.mode==='guided'&&['guided_selection_confirm_duty','guided_selection_results'].includes(String(session?.step||''))&&changeDutyButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_waiting_duty',flow_m3h:null,head_m:null,selected_customer_id:String(session.selected_customer_id||'')||null,context:{...sessionContext(session),guided_selection_candidates:null}});await telegramSend(telegramToken,chatId,'Enter Flow @ Head.\nExample: 30m3/hr @ 80m',guidedInputNavMenu());return json({ok:true,status:'guided_selection_change_duty'})}
    if(session?.mode==='guided'&&['guided_selection_confirm_duty','guided_selection_results','guided_selection_waiting_duty'].includes(String(session?.step||''))&&selectionScopeButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_selection_scope',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...sessionContext(session),guided_selection_candidates:null}});return json({ok:true,status:'guided_selection_scope',reopened:!!(await guidedReopenCurrentMenu(service,telegramToken,keySuiteCompanyId,chatId,senderId,session))})}

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_selection_results'&&text){const c=sessionContext(session),rows=Array.isArray(c.guided_selection_candidates)?c.guided_selection_candidates:[],index=rows.findIndex((x:any,i:number)=>cleanSearch(guidedSelectionChoiceLabel(x,i))===cleanButton);if(index>=0){session=await guidedSelectSizingCandidate(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,index);return json({ok:true,status:'guided_selection_result_selected',index})}}

    if(!callbackQuery&&session?.mode==='guided'&&['guided_es_assembly','guided_es_system'].includes(String(session?.step||''))&&text){
      const c=sessionContext(session),bom=c.es_assembly_bom,user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId&&user?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null;if(!user||!bom){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}
      if(editBomButton&&session.step==='guided_es_system'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:customerId||null,context:c});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(bom,customer),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_edit_menu'})}
      if(pumpButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly_edit_pump',selected_customer_id:customerId||null,context:c});await telegramSend(telegramToken,chatId,`Current Pump: ${bom.pump?.display_model||bom.pump?.model||'-'}\n\nEnter ES pump model, or Auto.\nExample: ES 50-26`,guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_edit_pump'})}
      if(motorButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly_edit_motor',selected_customer_id:customerId||null,context:c});await telegramSend(telegramToken,chatId,`Current Motor: ${bom.motor?.model||'-'} · ${oneDecimal(bom.motor?.kw||0)} kW · ${Number(bom.motor?.pole||2)}P · ${bom.motor?.efficiency_class||'IE3'}\n\nEnter kW and efficiency class. Pole remains ${Number(bom.motor?.pole||2)}P.\nExample: 11kW IE3\n\nType Auto to restore the curve recommendation.`,guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_edit_motor'})}
      if(couplingButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly_coupling_type',selected_customer_id:customerId||null,context:{...c,guided_es_coupling_type:null,guided_es_coupling_choices:null}});await telegramSend(telegramToken,chatId,`Current Coupling: ${bom.coupling?.model||'-'}\n\nChoose Coupling Type:`,telegramReplyKeyboard([['FCL','Tyre'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_es_assembly_coupling_type'})}
      if(baseplateButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly_edit_baseplate',selected_customer_id:customerId||null,context:c});await telegramSend(telegramToken,chatId,`Current Baseplate: ${bom.baseplate?.model||'-'}\n\nEnter Baseplate details, or Auto.\nExample: 2 x 4, L3 1200, W1 500`,guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_edit_baseplate'})}
      if(systemButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_system',selected_customer_id:customerId||null,context:c});await telegramSend(telegramToken,chatId,`System\n\n${guidedEsAssemblyText(bom,customer)}\n\nThe assembled ES pumpset is carried into the System stage.`,guidedEsSystemMenu());return json({ok:true,status:'guided_es_system'})}
      if(checkPriceButton){
        if(!customer){const scope=normalizeCustomerScope(user.view_customers);if(scope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',session.step==='guided_es_system'?guidedEsSystemMenu():guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_price_customer_denied'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'es_assembly_price',guided_return_step:String(session.step||'guided_es_assembly')}});await telegramSend(telegramToken,chatId,'Select Customer for this ES Pumpset Price.\n\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_price_customer_required'})}
        try{const priced=await quoteKeybotEsAssembly(service,customer,user,c.guided_product,bom);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:String(session.step),selected_customer_id:customerId||null,context:{...c,es_assembly_bom:priced}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(priced,customer),session.step==='guided_es_system'?guidedEsSystemMenu():guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_priced',total:priced.total})}catch(error){await telegramSend(telegramToken,chatId,`The ES Pumpset price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,session.step==='guided_es_system'?guidedEsSystemMenu():guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_price_error'})}
      }
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_assembly_edit_pump'&&text){
      const c=sessionContext(session),source=c.es_assembly_source_item||c.es_assembly_bom?.source_item,current=c.es_assembly_bom;if(!source||!current){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}
      try{let next:any;if(/^auto$/i.test(String(text).trim()))next=keybotEsAssemblyBuild(source,{});else{const q=Number(source.requested_flow_m3h||session.flow_m3h),h=Number(source.requested_head_m||session.head_m),pole=Number(current.motor?.pole||source.pole||2),model=String(text).replace(/^ES\s+/i,'').trim();const selected=selectPumpSummary('ES',q,h,pole,model);const pump={...source,...selected,brand:source.brand,brand_id:source.brand_id,display_model:`ES ${model}`};next=keybotEsAssemblyBuild(pump,{})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,es_assembly_source_item:next.source_item,es_assembly_bom:next}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(next,null),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_pump_updated'})}catch(error){await telegramSend(telegramToken,chatId,`Pump could not be changed.\n\n${error instanceof Error?error.message:String(error)}`,guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_pump_error'})}
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_assembly_edit_motor'&&text){
      const c=sessionContext(session),source=c.es_assembly_source_item||c.es_assembly_bom?.source_item,current=c.es_assembly_bom;if(!source||!current){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}
      const parsed=keybotEsMotorInput(text,current);try{let next:any;if(parsed.auto)next=keybotEsAssemblyBuild(source,{});else{const pole=Number(current.motor?.pole||source.pole||2),eff=String(parsed.efficiency_class||'IE3'),lookup=KEYBOT_ES_MB?.lookupMotor?KEYBOT_ES_MB.lookupMotor({kw:parsed.kw||undefined,hp:parsed.hp||undefined,pole,efficiencyClass:eff,voltage:415,phase:'3Ph',hz:50}):null;if(!lookup?.available)throw new Error(lookup?.message||'That motor rating is not available.');next=keybotEsAssemblyBuild(source,{motor_kw:Number(lookup.kw||0),motor_hp:Number(lookup.hp||0),motor_efficiency_class:eff})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,es_assembly_bom:next}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(next,null),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_motor_updated'})}catch(error){await telegramSend(telegramToken,chatId,`Motor could not be changed.\n\n${error instanceof Error?error.message:String(error)}`,guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_motor_error'})}
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_assembly_coupling_type'&&text){
      const c=sessionContext(session),current=c.es_assembly_bom,type=cleanButton==='tyre'?'tyre':cleanButton==='fcl'?'pin_bush':'';if(!current){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}if(!type){await telegramSend(telegramToken,chatId,'Choose Coupling Type:',telegramReplyKeyboard([['FCL','Tyre'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_es_assembly_coupling_type_waiting'})}
      const choices=await keybotEsCouplingChoices(service,type,current);if(!choices.length){await telegramSend(telegramToken,chatId,`No suitable ${keybotEsCouplingTypeLabel(type)} coupling size was found for the current pump shaft, motor shaft, torque and speed.`,telegramReplyKeyboard([['FCL','Tyre'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_es_assembly_coupling_no_size'})}
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly_coupling_size',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,guided_es_coupling_type:type,guided_es_coupling_choices:choices}});await telegramSend(telegramToken,chatId,`${keybotEsCouplingTypeLabel(type)} Coupling\n\nChoose Size:\n${choices[0].model} is recommended for the current pumpset.\nOther suitable sizes remain selectable.`,keybotEsCouplingChoiceKeyboard(choices));return json({ok:true,status:'guided_es_assembly_coupling_size'});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_assembly_coupling_size'&&text){
      const c=sessionContext(session),source=c.es_assembly_source_item||c.es_assembly_bom?.source_item,current=c.es_assembly_bom,choices=Array.isArray(c.guided_es_coupling_choices)?c.guided_es_coupling_choices:[];if(!source||!current){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}
      const choice=choices.find((x:any,i:number)=>cleanSearch(keybotEsCouplingChoiceLabel(x,i))===cleanButton||cleanSearch(x.model)===cleanButton);if(!choice){await telegramSend(telegramToken,chatId,'Choose one of the shown coupling sizes.',keybotEsCouplingChoiceKeyboard(choices));return json({ok:true,status:'guided_es_assembly_coupling_size_waiting'})}
      const overrides:any={motor_kw:Number(current.motor?.kw||0),motor_hp:Number(current.motor?.hp||0),motor_efficiency_class:String(current.motor?.efficiency_class||'IE3'),coupling_selection:choice};if(current.baseplate?.auto===false)overrides.baseplate={cChannel:String(current.baseplate?.cChannel||''),L3:Number(current.baseplate?.L3||0),W1:Number(current.baseplate?.W1||0)};
      const next=keybotEsAssemblyBuild(source,overrides);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,es_assembly_bom:next,guided_es_coupling_type:null,guided_es_coupling_choices:null}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(next,null),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_coupling_updated'});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_assembly_edit_coupling'&&text){
      const c=sessionContext(session),source=c.es_assembly_source_item||c.es_assembly_bom?.source_item,current=c.es_assembly_bom;if(!source||!current){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}
      const overrides:any={motor_kw:Number(current.motor?.kw||0),motor_hp:Number(current.motor?.hp||0),motor_efficiency_class:String(current.motor?.efficiency_class||'IE3')};if(!/^auto$/i.test(String(text).trim())){const row=(await findSimpleCatalogMatches(service,'ks_products_coupling',text))[0];if(!row){await telegramSend(telegramToken,chatId,'No Coupling matched that model. Try again or type Auto.',guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_coupling_waiting'})}overrides.coupling_model=String(row.model||text)}
      const next=keybotEsAssemblyBuild(source,overrides);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,es_assembly_bom:next}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(next,null),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_coupling_updated'});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_assembly_edit_baseplate'&&text){
      const c=sessionContext(session),source=c.es_assembly_source_item||c.es_assembly_bom?.source_item,current=c.es_assembly_bom;if(!source||!current){await telegramSend(telegramToken,chatId,'The ES Assemble session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_es_assembly_expired'})}
      const manualCoupling=keybotEsManualCouplingSelection(current.coupling),overrides:any={motor_kw:Number(current.motor?.kw||0),motor_hp:Number(current.motor?.hp||0),motor_efficiency_class:String(current.motor?.efficiency_class||'IE3'),...(manualCoupling?{coupling_selection:manualCoupling}:{})};if(!/^auto$/i.test(String(text).trim())){const b=parseGuidedBaseplateInput(text);if(!b.cChannel||!(b.L3>0)||!(b.W1>0)){await telegramSend(telegramToken,chatId,'Enter C-channel, L3 and W1, or type Auto.\nExample: 2 x 4, L3 1200, W1 500',guidedInputNavMenu());return json({ok:true,status:'guided_es_assembly_baseplate_waiting'})}overrides.baseplate=b}
      const next=keybotEsAssemblyBuild(source,overrides);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,es_assembly_bom:next}});await telegramSend(telegramToken,chatId,guidedEsAssemblyText(next,null),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_baseplate_updated'});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_waiting_es_pole'&&familyTextCode){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product,pole=familyTextCode==='ES4'?4:2;if(user&&product&&(!customerId||customer)){session=await guidedCompletePump(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,{...(c.guided_pending_request||{}),pole},String(c.guided_action||'select') as any);return json({ok:true,status:'guided_es_pole_selected'})}}

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_es_price_scope'&&(barePumpButton||completePumpsetButton||bothPumpsetButton)){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product,item=c.pending_item;
      if(!user||!product||!item||String(item?.family||product?.price_group||'').toUpperCase()!=='ES'||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The ES Price session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_es_price_scope_expired'})}
      const scope=bothPumpsetButton?'both':completePumpsetButton?'complete':'bare';
      if(scope==='both'){
        const bom=keybotEsAssemblyBuild(item,{});
        if(!customer){const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_both_price_customer_denied'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'es_both_price',guided_es_price_supply:'both',es_assembly_source_item:item,es_assembly_bom:bom}});await telegramSend(telegramToken,chatId,'Supply: Bare Pump + Complete Pumpset\n\nSelect Customer for this Price.\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_es_both_price_customer_required'})}
        try{const bare=await quotePumpForCustomer(service,String(customer.id),guidedApplyProductIdentity(item,product),String(user.email||''));bare.supply_scope='Bare Pump';const complete=await quoteKeybotEsAssembly(service,customer,user,product,bom);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:String(customer.id),context:{...c,guided_es_price_supply:'both',es_assembly_source_item:item,es_assembly_bom:complete,es_bare_priced:bare,pending_item:item}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\nBare Pump\n${quotationResultText(bare)}\n\nComplete Pumpset\n${guidedEsAssemblyText(complete,null)}\n\nChoose action:`,guidedProductActionMenu(true));return json({ok:true,status:'guided_es_both_price_ready'})}catch(error){await telegramSend(telegramToken,chatId,`The ES comparison price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_both_price_error'})}
      }
      if(scope==='complete'){
        const bom=keybotEsAssemblyBuild(item,{});
        if(!customer){const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_complete_price_customer_denied'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'es_complete_price',guided_es_price_supply:'complete',es_assembly_source_item:item,es_assembly_bom:bom}});await telegramSend(telegramToken,chatId,'Supply: Complete Pumpset\n\nSelect Customer for this Price.\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_es_complete_price_customer_required'})}
        try{const priced=await quoteKeybotEsAssembly(service,customer,user,product,bom);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_product_action',selected_customer_id:String(customer.id),context:{...c,guided_es_price_supply:'complete',es_assembly_source_item:item,es_assembly_bom:priced}});await telegramSend(telegramToken,chatId,`Supply: Complete Pumpset\n\n${guidedEsAssemblyText(priced,customer)}\n\nChoose action:`,guidedProductActionMenu(true));return json({ok:true,status:'guided_es_complete_price_ready'})}catch(error){await telegramSend(telegramToken,chatId,`The ES Complete Pumpset price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_complete_price_error'})}
      }
      if(!customer){const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_bare_price_customer_denied'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'selection_price',guided_es_price_supply:'bare'}});await telegramSend(telegramToken,chatId,'Supply: Bare Pump\n\nSelect Customer for this Price.\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_es_bare_price_customer_required'})}
      try{session=await guidedFinishSelectionPrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user);return json({ok:true,status:'guided_es_bare_price_ready'})}catch(error){await telegramSend(telegramToken,chatId,`The ES Bare Pump price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_bare_price_error'})}
    }

    if(session?.mode==='guided'&&session?.step==='guided_chc_price_scope'&&(pumpPriceButton||systemPriceButton||bothPricesButton)){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),choice=pumpPriceButton?'pump':systemPriceButton?'system':'both';if(!user||!c.guided_product||!c.pending_item){await telegramSend(telegramToken,chatId,'The CHC price session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_chc_price_expired'})}
      if(!customer){const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedChcPriceScopeMenu());return json({ok:true,status:'guided_chc_price_customer_denied'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,flow_m3h:session.flow_m3h,head_m:session.head_m,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'chc_price_scope',guided_chc_price_choice:choice,guided_return_step:'guided_chc_price_scope'}});await telegramSend(telegramToken,chatId,'Select Customer for this Price.\n\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_chc_price_customer_required',choice})}
      try{session=await guidedRunChcPriceChoice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,choice);return json({ok:true,status:`guided_chc_${choice}_price_ready`})}catch(error){await telegramSend(telegramToken,chatId,`The CHC price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedChcPriceScopeMenu());return json({ok:true,status:'guided_chc_price_error'})}
    }

    if(session?.mode==='guided'&&session?.step==='guided_product_action'&&(curveButton||assembleButton||addToSystemButton||checkPriceButton)){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product;if(!user||!product||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The guided Product session has expired. Start a New Request.',mainMenuMarkup());return json({ok:true,status:'guided_session_expired'})}
      if(addToSystemButton){
        const item=c.pending_item,family=String(item?.family||product?.price_group||'').toUpperCase();if(family!=='CHC'||!item){await telegramSend(telegramToken,chatId,'Add to System is available for CHC/VMS selections. ES uses Assemble first, then System.',guidedProductActionMenu(family==='ES'));return json({ok:true,status:'guided_add_system_not_chc'})}
        const opts=pumpOptions(item.options,item.qty),baseModel=String(item.model||'').replace(/^CHCS\b/i,'CHC').replace(/^CHCN\b/i,'CHC'),request={product_type:'keyplc_system',system_type:'KEYPLC',system_pump_qty:2,system_operation:'1 Duty + 1 On Demand',panel_control:'VFD + HMI',direct_model:baseModel,family_code:'CHC',flow_m3h:Number(item.requested_flow_m3h||session.flow_m3h||0),head_m:Number(item.requested_head_m||session.head_m||0),duty_text:sessionDutyText(session,item),options:{...opts,qty:2},selected_pump_item:{...item,duty_text:sessionDutyText(session,item),options:{...opts,qty:2}}};
        session=await sendKeyplcSystem(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,request,customer,user);return json({ok:true,status:'guided_added_to_system'});
      }
      if(assembleButton){
        const item=c.pending_item;if(String(item?.family||product?.price_group||'').toUpperCase()!=='ES'||!item){await telegramSend(telegramToken,chatId,'Assemble is available for ES selections.',guidedProductActionMenu(false));return json({ok:true,status:'guided_assemble_not_es'})}
        const bom=keybotEsAssemblyBuild(item,{});session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_assembly',flow_m3h:Number(session.flow_m3h||item.requested_flow_m3h||0),head_m:Number(session.head_m||item.requested_head_m||0),selected_customer_id:customerId||null,context:{...c,es_assembly_source_item:item,es_assembly_bom:bom}});
        await telegramSend(telegramToken,chatId,guidedEsAssemblyText(bom,customer),guidedEsAssemblyMenu());return json({ok:true,status:'guided_es_assembly_ready'});
      }
      if(curveButton){const pending=c.guided_pending_request||{},item=c.pending_item;if(item&&Number(item.requested_flow_m3h)>0&&Number(item.requested_head_m)>0){session=await guidedCompletePump(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,{...pending,flow_m3h:item.requested_flow_m3h,head_m:item.requested_head_m,pole:item.pole||pending.pole},'curve');return json({ok:true,status:'guided_curve_from_selection'})}session=await guidedCompletePump(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,pending,'curve');return json({ok:true,status:'guided_curve_started'})}
      if(checkPriceButton&&String(c.pending_item?.family||product?.price_group||'').toUpperCase()==='ES'){const item=c.pending_item;session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_price_scope',flow_m3h:Number(session.flow_m3h||item?.requested_flow_m3h||0),head_m:Number(session.head_m||item?.requested_head_m||0),selected_customer_id:customerId||null,context:{...c,guided_es_price_return_step:'guided_product_action',guided_es_price_supply:null}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose supply for Price:`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_price_scope'})}
      if(checkPriceButton&&String(c.pending_item?.family||product?.price_group||'').toUpperCase()==='CHC'&&c.pending_item){const item=c.pending_item;session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_chc_price_scope',flow_m3h:Number(session.flow_m3h||item?.requested_flow_m3h||0),head_m:Number(session.head_m||item?.requested_head_m||0),selected_customer_id:customerId||null,context:{...c,guided_chc_price_choice:null,guided_return_step:'guided_product_action'}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose Price:`,guidedChcPriceScopeMenu());return json({ok:true,status:'guided_chc_price_scope'})}
      if(!customer){
        const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedProductActionMenu(String(c.pending_item?.family||product?.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_selection_price_customer_denied'})}
        session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'selection_price',guided_return_step:'guided_product_action'}});
        await telegramSend(telegramToken,chatId,'Select Customer for this Price.\n\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_selection_price_customer_required'});
      }
      if(c.pending_item){try{session=await guidedFinishSelectionPrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user);return json({ok:true,status:'guided_selection_price_ready'})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedProductActionMenu(String(c.pending_item?.family||product?.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_selection_price_error'})}}
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_hydraulic_price_input',selected_customer_id:String(customer.id),context:{...c,guided_product:product,guided_action:'price'}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\nProduct: ${guidedProductButtonLabel(product)}\n\nEnter exact model or Flow @ Head for price.\nExamples:\nCHC 15-20\n30m3/hr @ 80m`,telegramRemoveKeyboard());return json({ok:true,status:'guided_hydraulic_price_input'});
    }

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_hydraulic_price_input'&&text){
      const c=sessionContext(session),product=c.guided_product,parsed=smartQuoteRequest(text),group=String(product?.price_group||'').toUpperCase();
      if(group==='BFI'&&parsed.direct_model&&bfiDirectNeedsPhase(parsed)){
        const pending={...parsed,direct_model:bfiBaseModelName(parsed.direct_model),bfi_requested_enhanced:/E$/i.test(String(parsed.direct_model||'')),bfi_phase_confirmed:false};session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_bfi_price_waiting_phase',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,guided_pending_bfi_price_request:pending}});await telegramSend(telegramToken,chatId,`BFI Model: ${pending.direct_model}\n\nChoose Motor Phase:`,bfiPhaseMenu(pending.direct_model));return json({ok:true,status:'guided_bfi_price_phase_required'});
      }
    }
    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_hydraulic_price_input'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)),c=sessionContext(session),product=c.guided_product;if(!user||!customer||!product){await telegramSend(telegramToken,chatId,'The guided Product session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_session_expired'})}const parsed=smartQuoteRequest(text),group=String(product.price_group||'').toUpperCase();try{let item:any=null;if(group==='BFI'&&parsed.direct_model){item=directBfiModelInfo(parsed.direct_model);if(!item)throw new Error(`BFI model ${parsed.direct_model} was not found.`);item=guidedApplyProductIdentity(applyPumpOptionsToItem({...item,qty:Math.max(1,Number(parsed.qty||1))},mergePumpOptions({},parsed.options,parsed.qty||1)),product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));}else if((group==='CHC_G1'||group==='CHC_G2')&&parsed.direct_model){item=directChcModelInfo(parsed.direct_model,group);if(!item)throw new Error(`Pump model ${parsed.direct_model} was not found.`);item=guidedApplyProductIdentity(applyPumpOptionsToItem({...item,qty:Math.max(1,Number(parsed.qty||1))},mergePumpOptions({},parsed.options,parsed.qty||1)),product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));}else if(group==='ES'&&/^\s*ES\b/i.test(text)&&!/[@]/.test(text)){const m=(String(text).match(/\bES\s+([A-Z0-9][A-Z0-9._\/-]*)/i)||[])[1];if(m){item=guidedApplyProductIdentity({family:'ES',brand:product.brand_name,series:'ES',model:`ES ${m}`,qty:Math.max(1,Number(parsed.qty||1))},product);item=await quotePumpForCustomer(service,String(customer.id),item,String(user.email||''));}}if(item){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...c,guided_product:product,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedPriceResultMenu(true));return json({ok:true,status:'guided_direct_price'})}if(Number(parsed.flow_m3h)>0&&Number(parsed.head_m)>0){session=await guidedCompletePump(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,parsed,'price');return json({ok:true,status:'guided_duty_price'})}await telegramSend(telegramToken,chatId,'Please enter an exact model or both Flow and Head.\nExample: 30m3/hr @ 80m',telegramRemoveKeyboard());return json({ok:true,status:'guided_price_input_incomplete'})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_price_error'})}}

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_waiting_duty'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)),c=sessionContext(session),product=c.guided_product;if(user&&customer&&product){session=await guidedCompletePump(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,smartQuoteRequest(text),String(c.guided_action||'select') as any);return json({ok:true,status:'guided_duty_followup'})}}

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_no_curve_price_input'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)),c=sessionContext(session),product=c.guided_product;if(!user||!customer||!product){await telegramSend(telegramToken,chatId,'The guided Product session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_session_expired'})}session=await guidedQuoteNoCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,product,text);return json({ok:true,status:'guided_no_curve_price'});}

    if(!callbackQuery&&session?.mode==='guided'&&session?.step==='guided_price_choice'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await guidedAllowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)),c=sessionContext(session),product=c.guided_product,choices=Array.isArray(c.guided_price_choices)?c.guided_price_choices:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(!user||!customer||!product){await telegramSend(telegramToken,chatId,'The guided Product session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_session_expired'})}if(!choice){await telegramSend(telegramToken,chatId,'Please choose one of the shown Products.',telegramReplyKeyboard([...choices.map((x:any)=>[x.label]),['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'guided_price_choice_waiting'})}try{let item:any=null,kind=String(c.guided_price_kind||'');if(kind==='GWS'){const r=await service.from('ks_products_gws').select('*').eq('id',choice.id).eq('status','active').maybeSingle();if(!r.data)throw new Error('GWS Tank was not found.');item=await quoteGwsForCustomer(service,String(customer.id),r.data,1,String(user.email||''));}else{const table=kind==='MOTOR'?'ks_products_motor':'ks_products_coupling',r=await service.from(table).select('*').eq('id',choice.id).eq('active',true).maybeSingle();if(!r.data)throw new Error('Product was not found.');item=await quoteSimpleCatalogRow(service,String(customer.id),String(user.email||''),String(product.brand_name||''),kind,r.data,1)}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_price_result',selected_customer_id:String(customer.id),context:{...c,guided_product:product,guided_price_choices:null,pending_item:item}});await telegramSend(telegramToken,chatId,guidedPriceResultText(customer,product,item),guidedResultMenu(false));return json({ok:true,status:'guided_price_choice_ready'})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedSelectedCustomerMenu());return json({ok:true,status:'guided_price_choice_error'})}}

    if(checkPriceButton&&session?.mode==='guided'&&['guided_curve_result','guided_selection_result'].includes(String(session?.step||''))){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customerId=String(session.selected_customer_id||''),customer=customerId?await guidedAllowedCustomerById(service,keySuiteCompanyId,user,customerId):null,c=sessionContext(session),product=c.guided_product,item=c.pending_item;if(!user||!product||!item||(customerId&&!customer)){await telegramSend(telegramToken,chatId,'The guided selection session has expired.',mainMenuMarkup());return json({ok:true,status:'guided_session_expired'})}if(String(item?.family||product?.price_group||'').toUpperCase()==='ES'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_es_price_scope',flow_m3h:Number(session.flow_m3h||item?.requested_flow_m3h||0),head_m:Number(session.head_m||item?.requested_head_m||0),selected_customer_id:customerId||null,context:{...c,guided_es_price_return_step:String(session.step||'guided_product_action'),guided_es_price_supply:null}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose supply for Price:`,guidedEsPriceScopeMenu());return json({ok:true,status:'guided_es_price_scope'})}if(String(item?.family||product?.price_group||'').toUpperCase()==='CHC'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_chc_price_scope',flow_m3h:Number(session.flow_m3h||item?.requested_flow_m3h||0),head_m:Number(session.head_m||item?.requested_head_m||0),selected_customer_id:customerId||null,context:{...c,guided_chc_price_choice:null,guided_return_step:String(session.step||'guided_product_action')}});await telegramSend(telegramToken,chatId,`${guidedSelectionPumpLabel(item)}\n\nChoose Price:`,guidedChcPriceScopeMenu());return json({ok:true,status:'guided_chc_price_scope'})}if(!customer){const customerScope=normalizeCustomerScope(user.view_customers);if(customerScope==='none'){await telegramSend(telegramToken,chatId,'Your KeySuite Role does not allow Customer access, so Price cannot be checked.',guidedResultMenu(true));return json({ok:true,status:'guided_selection_price_customer_denied'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'guided_waiting_customer',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[],guided_after_customer:'selection_price',guided_return_step:String(session.step||'guided_selection_result')}});await telegramSend(telegramToken,chatId,'Select Customer for this Price.\n\nEnter customer name.\nExample: KEY',guidedInputNavMenu());return json({ok:true,status:'guided_selection_price_customer_required'})}try{session=await guidedFinishSelectionPrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user);return json({ok:true,status:'guided_selection_priced'})}catch(error){await telegramSend(telegramToken,chatId,`The price could not be completed.\n\n${error instanceof Error?error.message:String(error)}`,guidedResultMenu(true));return json({ok:true,status:'guided_selection_price_error'})}}

    if(curvePdfButton&&session?.mode==='guided'){const c=sessionContext(session),item=c.pending_item,product=c.guided_product;if(item&&product&&product.has_curve===true){try{const family=guidedSelectorFamily(product?.price_group||item.family||'CHC'),q=Number(item.requested_flow_m3h||session.flow_m3h),h=Number(item.requested_head_m||session.head_m),pole=family==='ES'?Number(item.pole||c.guided_pending_request?.pole||2):0,duty=`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`,curveIdentity:any=await guidedCurveDisplayIdentity(service,keySuiteCompanyId,product,String(item?.master_model||item?.model||''),String(item?.display_model||''));curveIdentity.material=pumpOptions(item.options,item.qty).material;const pdf=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),pole,String(item?.model||''),curveIdentity);await telegramSendDocument(telegramToken,chatId,pdf.bytes,pdf.filename,`${guidedProductButtonLabel(product)} curve ready\n${duty}\nSelected: ${pdf.model}`);await telegramSend(telegramToken,chatId,'Choose the next action:',guidedResultMenu(true));return json({ok:true,status:'guided_curve_pdf_sent'})}catch(error){await telegramSend(telegramToken,chatId,`Curve PDF could not be generated.\n\n${error instanceof Error?error.message:String(error)}`,guidedResultMenu(true));return json({ok:true,status:'guided_curve_pdf_error'})}}
    }

    if(quotationButton||myDraftsButton||createQuotationButton){
      await telegramSend(telegramToken,chatId,'Quotation creation stays in KeySuite.\n\nFor a customer price, send the customer name together with the requirement.\nExample: Keylargo, CHC 30m3/hr @ 80m',mainMenuMarkup());
      return json({ok:true,status:'quotation_disabled_in_keybot'});
    }

    if(curveButton||callbackData==='menu:curve'){
      const aq=activeQuoteFromSession(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'curve',step:'waiting_flow',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:aq?{active_quote:aq}:{}});
      await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 20m3/hr @ 30m',telegramRemoveKeyboard());
      return json({ok:true,status:'curve_waiting_flow'});
    }

    if(quotationButton||callbackData==='menu:quotation'){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);
      if(!user){
        await telegramSend(telegramToken,chatId,'Quotation is available to linked KeySuite users only. Please ask the KeySuite administrator to link this Telegram account to your KeySuite user.',telegramReplyKeyboard([['⬅️ Main Menu']]));
        return json({ok:true,status:'quotation_user_not_linked'});
      }
      if(String(user.view_customers||'none')==='none'){
        await telegramSend(telegramToken,chatId,'Your KeySuite role does not have customer access.',telegramReplyKeyboard([['⬅️ Main Menu']]));
        return json({ok:true,status:'quotation_customer_access_denied'});
      }
      const aq=activeQuoteFromSession(session);if(aq?.customer_id){const customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(aq.customer_id));if(customer){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'customer_selected',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:String(customer.id),context:{keysuite_user_email:user.email,customer_name:customer.company_name,draft_items:Array.isArray(aq.draft_items)?aq.draft_items:[],active_quote:aq,pending_request:null,pending_item:null}});await telegramSend(telegramToken,chatId,`Continuing quotation for ${customer.company_name}.\nWhat would you like to add?`,quotationProductMenu());return json({ok:true,status:'quotation_resumed',customer_id:customer.id})}}
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'waiting_company',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,selected_customer_id:null,context:{keysuite_user_email:user.email}});
      await telegramSend(telegramToken,chatId,'Please type the customer/company name.\n\nExample: Key',telegramRemoveKeyboard());
      return json({ok:true,status:'quotation_waiting_company',user_email:user.email});
    }

    if(changeButton||callbackData==='curve:change'){
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'curve',step:'waiting_flow',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null});
      await telegramSend(telegramToken,chatId,'Please enter Flow & Head together again.\nExample: 20m3/hr @ 30m',telegramRemoveKeyboard());
      return json({ok:true,status:'curve_waiting_flow'});
    }

    if(continueButton||callbackData==='curve:confirm'){
      if(!session||session.mode!=='curve'||!(Number(session.flow_m3h)>0&&Number(session.head_m)>0)){
        await telegramSend(telegramToken,chatId,'The duty point session has expired. Please start again.',mainMenuMarkup());
        return json({ok:true,status:'curve_session_expired'});
      }
      await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'curve',step:'waiting_family'});
      await telegramSend(telegramToken,chatId,'Choose the pump series for this curve:',telegramReplyKeyboard([['CHC','BFI'],['ES 2 Pole','ES 4 Pole'],['✏️ Change Duty','⬅️ Main Menu']]));
      return json({ok:true,status:'curve_waiting_family'});
    }

    const familyCallback=/^curve:family:(?:CHC|ES2|ES4)$/.test(callbackData)?callbackData.split(':').pop()||'':'';
    const selectedFamilyCode=familyCallback||familyTextCode;
    if(selectedFamilyCode&&session?.mode==='smart_curve'&&session?.step==='smart_waiting_family'){const c=sessionContext(session);session=await sendSimpleCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,mergeQuoteRequest(c.pending_request,{family_code:selectedFamilyCode,product_type:'pump'}));return json({ok:true,status:'smart_curve_family'})}
    if(selectedFamilyCode&&session?.mode==='price'&&session?.step==='price_waiting_family'){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id||'')),c=sessionContext(session);if(user&&customer){session=await continueSimplePrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,mergeQuoteRequest(c.pending_request,{family_code:selectedFamilyCode,product_type:'pump'}));return json({ok:true,status:'price_family'})}}
    if(selectedFamilyCode&&session?.mode==='quotation'&&session?.step==='quote_waiting_family'){
      const c=sessionContext(session),request=mergeQuoteRequest(c.pending_request,{product_type:'pump',family_code:selectedFamilyCode,flow_m3h:Number(session.flow_m3h||c.pending_request?.flow_m3h||0),head_m:Number(session.head_m||c.pending_request?.head_m||0)});session=await showPumpQuoteFromRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,request);return json({ok:true,status:'quotation_selection_processed'});
    }
    if(selectedFamilyCode){
      if(!session||session.mode!=='curve'||!(Number(session.flow_m3h)>0&&Number(session.head_m)>0)){
        await telegramSend(telegramToken,chatId,'The duty point session has expired. Please start again.',mainMenuMarkup());
        return json({ok:true,status:'curve_session_expired'});
      }
      const familyCode=selectedFamilyCode||'CHC';const family=familyCode==='CHC'?'CHC':'ES';const pole=familyCode==='ES2'?2:familyCode==='ES4'?4:0;
      const q=Number(session.flow_m3h),h=Number(session.head_m);const duty=`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`;
      try{
        const pdfMeta=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),pole);
        const sent=await telegramSendDocument(telegramToken,chatId,pdfMeta.bytes,pdfMeta.filename,`${family==='ES'?esPoleLabel(pole):family} curve ready\n${duty}\nSelected: ${pdfMeta.model}`);
        const updateId=Number.isFinite(Number(update?.update_id))?Number(update.update_id):null;
        await service.from('ks_keyai_enquiries').insert({source:'telegram',external_update_id:updateId,external_message_id:Number(message?.message_id||0)||null,external_chat_id:chatId,sender_username:senderUsername||null,sender_name:senderName||null,raw_message:`Guided Curve: ${family==='ES'?esPoleLabel(pole):family} · ${duty}`,status:sent.ok?'curve_ready':'curve_pdf_error',ai_enabled:false,ai_summary:`${family==='ES'?esPoleLabel(pole):family} · ${duty} · ${pdfMeta.model}`,ai_result:{pump_family:family,es_pole:pole||null,flow_value:q,flow_unit:'m³/hr',head_value:h,head_unit:'m',duty_text:duty,selected_model:pdfMeta.model,guided:true},external_sender_id:senderId||null,keyai_company_id:keySuiteCompanyId||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}).then(()=>{}).catch(()=>{});
        const prior=sessionContext(session),summary=applyPumpOptionsToItem(selectPumpSummary(family,q,h,pole),pumpOptions(prior.pending_item?.options,1));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'curve',step:'curve_result',flow_m3h:q,head_m:h,context:{...prior,pending_item:summary,curve_pdf:{family,pole,q,h,duty,filename:pdfMeta.filename}}});
        await telegramSend(telegramToken,chatId,sent.ok?'Curve ready. You can adjust optional configuration or check the customer price.':'The curve was prepared but Telegram could not send the PDF. You can retry Curve PDF below.',pumpResultMenu('curve'));
        return json({ok:true,status:sent.ok?'curve_ready':'curve_pdf_error',guided:true,family,pole,model:pdfMeta.model});
      }catch(error){
        await telegramSend(telegramToken,chatId,'KeyBot could not generate this curve. Please try another duty point or contact KeySuite support.',telegramReplyKeyboard([['✏️ Change Duty','⬅️ Main Menu']]));
        return json({ok:true,status:'curve_generation_error',error:error instanceof Error?error.message:String(error)});
      }
    }


    if(editBomButton&&session?.mode==='keyplc'&&session?.step==='keyplc_result'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:sessionContext(session)});await telegramSend(telegramToken,chatId,'✏️ Edit KeyPLC BOM\nChoose the component to change:',keyplcEditMenu());return json({ok:true,status:'keyplc_edit_menu'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_menu'&&!callbackQuery){const c=sessionContext(session);if(pumpButton){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_pump_menu',context:c});await telegramSend(telegramToken,chatId,'Edit Pump:',keyplcPumpMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_edit_pump_menu'})}if(motorButton||cleanButton==='panel'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_panel',context:c});await telegramSend(telegramToken,chatId,'Enter the KeyPLC VFD motor rating, for example 5.5kW, or type Auto.',telegramReplyKeyboard([['Auto'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_edit_panel'})}if(cleanButton==='manifold'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold',context:c});await telegramSend(telegramToken,chatId,'Edit Manifold:',keyplcManifoldMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_edit_manifold'})}if(tankButton){const r=await service.from('ks_products_gws').select('size_litres').eq('status','active').order('size_litres');const sizes=[...new Set((r.data||[]).map((x:any)=>Number(x.size_litres||0)).filter((x:number)=>x>0))].slice(0,16);const rows:any[]=[['Auto']];for(let i=0;i<sizes.length;i+=2)rows.push(sizes.slice(i,i+2).map(x=>`${inputNumber(x)}L`));rows.push(['⬅️ Back','🔄 New Request']);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_tank',context:c});await telegramSend(telegramToken,chatId,'Choose GWS Tank size:',telegramReplyKeyboard(rows));return json({ok:true,status:'keyplc_edit_tank'})}if(doneOptionsButton){const req=c.keyplc_request||{};const user=c.keysuite_user_email?await linkedKeySuiteUser(service,keySuiteCompanyId,senderId):null;const customer=session.selected_customer_id&&user?await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null;session=await sendKeyplcSystem(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,req,customer,user);return json({ok:true,status:'keyplc_edit_done'})}}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_pump_menu'&&!callbackQuery){const c=sessionContext(session);if(cleanButton==='model'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_pump',context:c});await telegramSend(telegramToken,chatId,'Enter the CHC/VMS pump model.\nExample: CHC 15-20',telegramReplyKeyboard([['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_edit_pump_model'})}if(cleanButton==='no of pumps'||quantityButton){const qty=Number(c.keyplc_bom?.pump_qty||c.keyplc_request?.system_pump_qty||2);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_pump_qty',context:c});await telegramSend(telegramToken,chatId,`Current Pump Qty: ${qty}
Choose number of pumps:`,telegramReplyKeyboard([['1','2','3'],['4','5','6'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_edit_pump_qty'})}await telegramSend(telegramToken,chatId,'Choose Model or No. of Pumps.',keyplcPumpMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_edit_pump_menu_waiting'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_pump'&&text&&!callbackQuery){const c=sessionContext(session),direct=parseDirectPumpModel(text);if(!direct||direct.family!=='CHC'){await telegramSend(telegramToken,chatId,'Please enter a valid CHC/VMS model, for example CHC 15-20.',telegramReplyKeyboard([['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_edit_pump_waiting'})}const req={...(c.keyplc_request||{}),direct_model:direct.model,family_code:'CHC'};delete req.selected_pump_item;const user=c.keysuite_user_email?await linkedKeySuiteUser(service,keySuiteCompanyId,senderId):null,customer=session.selected_customer_id&&user?await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null,bom=await buildKeyplcSystem(service,req,customer,user);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_pump_menu',context:{...c,keyplc_request:req,keyplc_bom:bom}});await telegramSend(telegramToken,chatId,`Pump changed to ${direct.model}.

${keyplcBomText(bom)}`,keyplcPumpMenu(bom));return json({ok:true,status:'keyplc_pump_updated'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_pump_qty'&&text&&!callbackQuery){const c=sessionContext(session),qty=Math.trunc(Number(String(text).trim()));if(!(qty>=1&&qty<=6)){await telegramSend(telegramToken,chatId,'Choose pump quantity from 1 to 6.',telegramReplyKeyboard([['1','2','3'],['4','5','6'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_edit_pump_qty_waiting'})}const req={...(c.keyplc_request||{}),system_pump_qty:qty,system_operation:`1 Duty + ${Math.max(0,qty-1)} On Demand`};req.options={...(req.options||{}),qty};if(req.selected_pump_item)req.selected_pump_item={...req.selected_pump_item,qty,options:{...(req.selected_pump_item.options||{}),qty}};const user=c.keysuite_user_email?await linkedKeySuiteUser(service,keySuiteCompanyId,senderId):null,customer=session.selected_customer_id&&user?await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null,bom=await buildKeyplcSystem(service,req,customer,user);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_pump_menu',context:{...c,keyplc_request:req,keyplc_bom:bom}});await telegramSend(telegramToken,chatId,`Pump quantity changed to ${qty}.

${keyplcBomText(bom)}`,keyplcPumpMenu(bom));return json({ok:true,status:'keyplc_pump_qty_updated',pump_qty:qty})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_panel'&&text&&!callbackQuery){const c=sessionContext(session),req={...(c.keyplc_request||{})},b=systemBomOptions(req);if(cleanButton==='auto')b.panel_kw=0;else{const kw=Number((String(text).match(/\d+(?:\.\d+)?/)||[])[0]);if(!(kw>0)){await telegramSend(telegramToken,chatId,'Enter a motor rating such as 5.5kW, or Auto.');return json({ok:true,status:'keyplc_edit_panel_waiting'})}b.panel_kw=kw}req.system_bom=b;session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:{...c,keyplc_request:req}});await telegramSend(telegramToken,chatId,b.panel_kw?`Panel rating override: ${inputNumber(b.panel_kw)} kW VFD + HMI.`:'Panel returned to Auto sizing.',keyplcEditMenu());return json({ok:true,status:'keyplc_panel_updated'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_manifold'&&!callbackQuery){const c=sessionContext(session),req={...(c.keyplc_request||{})},b=systemBomOptions(req);if(manifoldSizeButton){const r=await service.from('ks_products_manifold').select('model').eq('status','active').eq('section','header').order('source_row');const material=b.manifold_material==='SS'?'SS':'GI',sizes=[...new Set((r.data||[]).map((x:any)=>String(x.model||'')).filter((x:string)=>new RegExp('^'+material+'\\s+DN\\d+$','i').test(x)).map((x:string)=>x.replace(/^(?:GI|SS)\s+/i,'')))].sort((a:any,b:any)=>dnNumberServer(a)-dnNumberServer(b));const rows:any[]=[['Auto']];for(let i=0;i<sizes.length;i+=2)rows.push(sizes.slice(i,i+2));rows.push(['⬅️ Back','🔄 New Request']);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold_size',context:c});await telegramSend(telegramToken,chatId,`Choose ${material} manifold header size:`,telegramReplyKeyboard(rows));return json({ok:true,status:'keyplc_manifold_size'})}if(materialButton||cleanButton.startsWith('material ')){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold_material',context:c});await telegramSend(telegramToken,chatId,`Current Manifold Material: ${b.manifold_material}
Choose material:`,telegramReplyKeyboard([['GI','SS'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_manifold_material'})}if(inletFlexibleButton){b.inlet_flexible=!b.inlet_flexible}else if(outletFlexibleButton){b.outlet_flexible=!b.outlet_flexible}else if(strainerButton){b.strainer=!b.strainer}else if(cleanButton==='edit bom'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:c});await telegramSend(telegramToken,chatId,'Choose the component to change:',keyplcEditMenu());return json({ok:true,status:'keyplc_edit_menu'})}else{await telegramSend(telegramToken,chatId,'Choose a Manifold option.',keyplcManifoldMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_manifold_waiting'})}req.system_bom=b;const user=c.keysuite_user_email?await linkedKeySuiteUser(service,keySuiteCompanyId,senderId):null,customer=session.selected_customer_id&&user?await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null;const bom=await buildKeyplcSystem(service,req,customer,user);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold',selected_customer_id:session.selected_customer_id,context:{...c,keyplc_request:req,keyplc_bom:bom}});await telegramSend(telegramToken,chatId,keyplcBomText(bom),keyplcManifoldMenu(bom));return json({ok:true,status:'keyplc_manifold_updated'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_manifold_material'&&text&&!callbackQuery){const c=sessionContext(session),req={...(c.keyplc_request||{})},b=systemBomOptions(req),material=String(text).trim().toUpperCase();if(!['GI','SS'].includes(material)){await telegramSend(telegramToken,chatId,'Choose GI or SS.',telegramReplyKeyboard([['GI','SS'],['⬅️ Back','🔄 New Request']]));return json({ok:true,status:'keyplc_manifold_material_waiting'})}b.manifold_material=material;b.manifold_dn='';req.system_bom=b;const user=c.keysuite_user_email?await linkedKeySuiteUser(service,keySuiteCompanyId,senderId):null,customer=session.selected_customer_id&&user?await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id)):null,bom=await buildKeyplcSystem(service,req,customer,user);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold',selected_customer_id:session.selected_customer_id,context:{...c,keyplc_request:req,keyplc_bom:bom}});await telegramSend(telegramToken,chatId,`Manifold material changed to ${material}.

${keyplcBomText(bom)}`,keyplcManifoldMenu(bom));return json({ok:true,status:'keyplc_manifold_material_updated',material})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_manifold_size'&&text&&!callbackQuery){const c=sessionContext(session),req={...(c.keyplc_request||{})},b=systemBomOptions(req);if(cleanButton==='manifold'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_manifold',context:c});await telegramSend(telegramToken,chatId,'Edit Manifold:',keyplcManifoldMenu(c.keyplc_bom));return json({ok:true,status:'keyplc_edit_manifold'})}if(cleanButton==='auto')b.manifold_dn='';else if(/^dn\s*\d+$/i.test(String(text).trim()))b.manifold_dn=String(text).toUpperCase().replace(/\s+/g,'');else{await telegramSend(telegramToken,chatId,'Choose one of the shown DN sizes or Auto.');return json({ok:true,status:'keyplc_manifold_size_waiting'})}req.system_bom=b;session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:{...c,keyplc_request:req}});await telegramSend(telegramToken,chatId,b.manifold_dn?`Manifold header override: ${b.manifold_dn}.`:'Manifold returned to Auto sizing.',keyplcEditMenu());return json({ok:true,status:'keyplc_manifold_size_updated'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_edit_tank'&&text&&!callbackQuery){const c=sessionContext(session),req={...(c.keyplc_request||{})},b=systemBomOptions(req);if(cleanButton==='edit bom'){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:c});await telegramSend(telegramToken,chatId,'Choose the component to change:',keyplcEditMenu());return json({ok:true,status:'keyplc_edit_menu'})}if(cleanButton==='auto')b.tank_size_litres=0;else{const litres=Number((String(text).match(/\d+(?:\.\d+)?/)||[])[0]);if(!(litres>0)){await telegramSend(telegramToken,chatId,'Choose a shown GWS Tank size or Auto.');return json({ok:true,status:'keyplc_tank_waiting'})}b.tank_size_litres=litres}req.system_bom=b;session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_edit_menu',context:{...c,keyplc_request:req}});await telegramSend(telegramToken,chatId,b.tank_size_litres?`Tank size override: ${inputNumber(b.tank_size_litres)}L.`:'Tank returned to Auto sizing.',keyplcEditMenu());return json({ok:true,status:'keyplc_tank_updated'})}
    if(checkPriceButton&&session?.mode==='keyplc'&&session?.step==='keyplc_result'&&!session.selected_customer_id){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'Price checking is available to linked KeySuite users only.',keyplcResultMenu(false));return json({ok:true,status:'keyplc_price_user_not_linked'})}const c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'keyplc',step:'keyplc_waiting_company',selected_customer_id:null,context:{...c,keysuite_user_email:user.email,customer_choices:[]}});await telegramSend(telegramToken,chatId,'Which customer is this KeyPLC system price for?\nType part of the company name.',telegramRemoveKeyboard());return json({ok:true,status:'keyplc_price_waiting_company'})}
    if(session?.mode==='keyplc'&&session?.step==='keyplc_waiting_company'&&text&&!callbackQuery&&!simpleRequestHasTechnical(smartQuoteRequest(text))){const c=sessionContext(session),user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'keyplc_user_not_linked'})}const choices=Array.isArray(c.customer_choices)?c.customer_choices:[],chosen=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(chosen){const customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(chosen.id));if(customer){session=await sendKeyplcSystem(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,c.keyplc_request||{},customer,user);return json({ok:true,status:'keyplc_customer_selected'})}}session=await resolveKeyplcCustomer(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,String(text),c.keyplc_request||{});return json({ok:true,status:'keyplc_customer_search'})}
    if((checkPriceButton||addToQuotationButton)&&session?.mode==='curve'&&['curve_result','direct_model_result'].includes(String(session?.step||''))){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'Price checking is available to linked KeySuite users only.',simpleCurveMenu());return json({ok:true,status:'price_user_not_linked'})}
      const c=sessionContext(session),item=c.pending_item;if(!item?.model){await telegramSend(telegramToken,chatId,'There is no pump selection waiting for pricing.',mainMenuMarkup());return json({ok:true,status:'price_no_selection'})}
      const itemFamily=String(item.family||'').toUpperCase(),code=itemFamily==='CHC'?'CHC':itemFamily==='BFI'?'BFI':Number(item.pole||2)===4?'ES4':'ES2',req=mergeQuoteRequest(c.pending_request,{product_type:'pump',...(c.pending_request?.direct_model?{direct_model:c.pending_request.direct_model}:{}),flow_m3h:Number(item.requested_flow_m3h||session.flow_m3h||0),head_m:Number(item.requested_head_m||session.head_m||0),family_code:code,qty:Number(item.qty||1),options:pumpOptions(item.options,item.qty)});
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'price',step:'price_waiting_company',selected_customer_id:null,context:{keysuite_user_email:user.email,pending_request:req,pending_item:item}});await telegramSend(telegramToken,chatId,'Which customer is this price for?\nType part of the company name.',telegramRemoveKeyboard());return json({ok:true,status:'price_waiting_company'});
    }

    if(curvePdfButton){
      const c=sessionContext(session),item=c.pending_item;if(!item||!['CHC','BFI','ES'].includes(String(item.family||'').toUpperCase())){await telegramSend(telegramToken,chatId,'There is no pump curve waiting to be generated. Please make a pump selection first.',mainMenuMarkup());return json({ok:true,status:'curve_pdf_no_selection'})}
      try{const family=String(item.family).toUpperCase(),q=Number(item.requested_flow_m3h||session?.flow_m3h),h=Number(item.requested_head_m||session?.head_m),pole=family==='ES'?Number(item.pole||2):0,duty=`${oneDecimal(q)} m³/hr @ ${oneDecimal(h)} Mtr`,pdfMeta=await generateCurvePdf(family,q,h,duty,env('KEYSUITE_PUBLIC_URL'),pole);await telegramSendDocument(telegramToken,chatId,pdfMeta.bytes,pdfMeta.filename,`${family==='ES'?esPoleLabel(pole):family} curve ready\n${duty}\nSelected: ${pdfMeta.model}`);await telegramSend(telegramToken,chatId,'What would you like to do with this selection?',pumpResultMenu(session?.mode==='price'?'price':'curve'));return json({ok:true,status:'curve_pdf_sent',model:pdfMeta.model})}catch(error){await telegramSend(telegramToken,chatId,`Curve PDF could not be generated.\n\n${error instanceof Error?error.message:String(error)}`,pumpResultMenu(session?.mode==='price'?'price':'curve'));return json({ok:true,status:'curve_pdf_error'})}
    }


    if(pumpConfigurationButton&&session?.mode==='guided'){
      const c=sessionContext(session),product=c.guided_product,exact=c.guided_exact_model;let item=c.pending_item;
      if(!item&&product&&exact){const group=String(product.price_group||'').toUpperCase();if(group==='CHC_G1'||group==='CHC_G2'){item=directChcModelInfo(exact.master_model,group);if(item)item=guidedApplyProductIdentity({...item,display_model:exact.display_model||exact.master_model,qty:1},product)}else if(group==='BFI'){item=directBfiModelInfo(exact.master_model);if(item)item=guidedApplyProductIdentity({...item,display_model:exact.display_model||exact.master_model,qty:1},product)}else if(group==='ES'){item=guidedApplyProductIdentity({family:'ES',brand:product.brand_name,series:'ES',model:String(exact.master_model||''),display_model:String(exact.display_model||exact.master_model||''),pole:Number(exact.pole||c.guided_exact_pole||2),qty:1},product)}}
      if(!item){await telegramSend(telegramToken,chatId,'Pump Configuration is available after a hydraulic pump model has been selected.',guidedExactActionMenu(product?.has_curve===true,String(product?.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_pump_configuration_unavailable'})}
      const returnStep=String(session.step||'guided_product_action'),configured=applyPumpOptionsToItem(item,pumpOptions(item.options,item.qty));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:'pump_options',selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,option_return_step:returnStep,pending_item:configured}});await telegramSend(telegramToken,chatId,`⚙️ Pump Configuration\n\n${pumpOptionSummary(configured)}\n\nChoose only what you want to change.`,pumpOptionsMenu());return json({ok:true,status:'guided_pump_configuration'})
    }
    if(optionsButton){
      const c=sessionContext(session),item=c.pending_item;if(!item||!['CHC','BFI','ES'].includes(String(item.family||'').toUpperCase())){await telegramSend(telegramToken,chatId,'Options are available after a pump has been selected.',mainMenuMarkup());return json({ok:true,status:'pump_options_no_selection'})}
      const returnStep=session?.mode==='price'?'price_result':session?.mode==='quotation'?'quote_result':'curve_result';const optionMode=session?.mode==='price'?'price':session?.mode==='quotation'?'quotation':'curve';session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:optionMode,step:'pump_options',context:{...c,option_return_step:returnStep,pending_item:applyPumpOptionsToItem(item,pumpOptions(item.options,item.qty))}});await telegramSend(telegramToken,chatId,`⚙️ Pump Options\n\n${pumpOptionSummary(sessionContext(session).pending_item)}\n\nChoose only what you want to change.`,pumpOptionsMenu());return json({ok:true,status:'pump_options'});
    }
    if(materialButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_material',context:c});await telegramSend(telegramToken,chatId,'Choose Material:',telegramReplyKeyboard([['Standard','SS304','SS316'],['⬅️ Options']]));return json({ok:true,status:'pump_option_material'})}
    if(motorButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_motor',context:c});await telegramSend(telegramToken,chatId,'Choose Motor Efficiency:',telegramReplyKeyboard([['IE3','IE4'],['IE5','IE2'],['⬅️ Options']]));return json({ok:true,status:'pump_option_motor'})}
    if(sealButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_seal',context:c});await telegramSend(telegramToken,chatId,'Choose Mechanical Seal:',telegramReplyKeyboard([['Carbon/SiC','SiC/SiC'],['TC/TC'],['⬅️ Options']]));return json({ok:true,status:'pump_option_seal'})}
    if(elastomerButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_elastomer',context:c});await telegramSend(telegramToken,chatId,'Choose Elastomer:',telegramReplyKeyboard([['Viton','EPDM','NBR'],['⬅️ Options']]));return json({ok:true,status:'pump_option_elastomer'})}
    if(connectionButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_connection',context:c});await telegramSend(telegramToken,chatId,'Choose Connection:',telegramReplyKeyboard([['Round Flange','Oval Flange'],['⬅️ Options']]));return json({ok:true,status:'pump_option_connection'})}
    if(bareShaftButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_bare',context:c});await telegramSend(telegramToken,chatId,'Bare shaft pump?',telegramReplyKeyboard([['No','Yes'],['⬅️ Options']]));return json({ok:true,status:'pump_option_bare'})}
    if(quantityButton&&session?.step==='pump_options'){const c=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_option_qty',context:c});await telegramSend(telegramToken,chatId,'Enter quantity, for example 2.',telegramRemoveKeyboard());return json({ok:true,status:'pump_option_qty'})}
    if(!callbackQuery&&cleanButton==='options'&&String(session?.step||'').startsWith('pump_option_')){const c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_options',context:c});await telegramSend(telegramToken,chatId,`⚙️ Pump Options\n\n${pumpOptionSummary(c.pending_item)}`,pumpOptionsMenu());return json({ok:true,status:'pump_options'})}
    if(!callbackQuery&&String(session?.step||'').startsWith('pump_option_')&&text){
      const c=sessionContext(session),item=c.pending_item;if(!item)return json({ok:true,status:'pump_option_no_item'});let o=pumpOptions(item.options,item.qty),accepted=true;
      if(session.step==='pump_option_material'){const map:any={standard:'Standard',ss304:'SS304',ss316:'SS316'};if(!map[cleanButton])accepted=false;else o.material=map[cleanButton]}
      else if(session.step==='pump_option_motor'){const v=String(text||'').toUpperCase().replace(/\s+/g,'');if(!['IE2','IE3','IE4','IE5'].includes(v))accepted=false;else o.motor_efficiency=v}
      else if(session.step==='pump_option_seal'){const map:any={'carbon sic':'Carbon/SiC','sic sic':'SiC/SiC','tc tc':'TC/TC'};if(!map[cleanButton])accepted=false;else o.seal=map[cleanButton]}
      else if(session.step==='pump_option_elastomer'){const map:any={viton:'Viton',epdm:'EPDM',nbr:'NBR'};if(!map[cleanButton])accepted=false;else o.elastomer=map[cleanButton]}
      else if(session.step==='pump_option_connection'){const map:any={'round flange':'Round Flange','oval flange':'Oval Flange'};if(!map[cleanButton])accepted=false;else o.connection=map[cleanButton]}
      else if(session.step==='pump_option_bare'){if(!['yes','no'].includes(cleanButton))accepted=false;else o.bare_shaft=cleanButton==='yes'}
      else if(session.step==='pump_option_qty'){const n=Math.trunc(Number((String(text).match(/\d+/)||[])[0]));if(!(n>=1&&n<=999))accepted=false;else o.qty=n}
      if(!accepted){await telegramSend(telegramToken,chatId,'Please choose one of the shown options.');return json({ok:true,status:'pump_option_waiting'})}
      let updated=applyPumpOptionsToItem(item,o);if((session.mode==='quotation'||session.mode==='price')&&session.selected_customer_id){try{updated=await quotePumpForCustomer(service,String(session.selected_customer_id),updated,String(c.keysuite_user_email||''))}catch(error){await telegramSend(telegramToken,chatId,`That option could not be priced.\n\n${error instanceof Error?error.message:String(error)}`);return json({ok:true,status:'pump_option_pricing_error'})}}
      const pendingRequest=mergeQuoteRequest(c.pending_request,{options:o,qty:o.qty});session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:session.mode,step:'pump_options',context:{...c,pending_item:updated,pending_request:pendingRequest}});await telegramSend(telegramToken,chatId,`Updated.\n\n${pumpOptionSummary(updated)}`,pumpOptionsMenu());return json({ok:true,status:'pump_option_updated'});
    }
    if(doneOptionsButton&&session?.step==='pump_options'){const c=sessionContext(session),item=c.pending_item;if(session.mode==='guided'){const returnStep=String(c.option_return_step||'guided_product_action'),product=c.guided_product;session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'guided',step:returnStep,selected_customer_id:String(session.selected_customer_id||'')||null,context:{...c,option_return_step:null,pending_item:item}});await telegramSend(telegramToken,chatId,`${quotationResultText(item)}\n\nChoose action:`,guidedProductActionMenu(String(item?.family||product?.price_group||'').toUpperCase()==='ES'));return json({ok:true,status:'guided_pump_configuration_done'})}const returnMode=session.mode==='price'?'price':session.mode==='quotation'?'quotation':'curve',returnStep=returnMode==='price'?'price_result':returnMode==='quotation'?'quote_result':'curve_result';session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:returnMode,step:returnStep,context:{...c,option_return_step:null}});await telegramSend(telegramToken,chatId,quotationResultText(item),pumpResultMenu(returnMode));return json({ok:true,status:'pump_options_done'})}

    if(addToQuotationButton&&session?.mode==='curve'&&session?.step==='curve_result'){
      const c=sessionContext(session),pending=c.pending_item;if(!pending?.model){await telegramSend(telegramToken,chatId,'There is no pump selection waiting to be added.',mainMenuMarkup());return json({ok:true,status:'curve_no_pending_item'})}
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'Add to Quotation is available to linked KeySuite users only.',mainMenuMarkup());return json({ok:true,status:'quotation_user_not_linked'})}
      const aq=c.active_quote;if(aq?.customer_id){const customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(aq.customer_id));if(customer){try{let priced=await quotePumpForCustomer(service,String(customer.id),pending,String(user.email||''));const items=Array.isArray(aq.draft_items)?aq.draft_items.slice(0,49):[];items.push({...priced,id:crypto.randomUUID()});const draft=await ensurePersistentDraft(service,keySuiteCompanyId,chatId,senderId,String(user.email||''),String(customer.id),String(customer.company_name||''),items,String(c.active_draft_id||''));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_after_add',selected_customer_id:String(customer.id),context:{keysuite_user_email:user.email,customer_name:customer.company_name,draft_items:items,active_draft_id:String(draft?.id||''),pending_item:null,pending_request:null,active_quote:{customer_id:String(customer.id),customer_name:customer.company_name,keysuite_user_email:user.email,draft_items:items}}});await telegramSend(telegramToken,chatId,`✅ Added to ${customer.company_name} quotation draft.`,telegramReplyKeyboard([['➕ Add Another Item','📄 View Draft'],['⬅️ Main Menu']]));return json({ok:true,status:'curve_added_to_active_quote',items:items.length})}catch(error){await telegramSend(telegramToken,chatId,`This pump could not be priced for ${customer.company_name}.\n\n${error instanceof Error?error.message:String(error)}`,pumpResultMenu('curve'));return json({ok:true,status:'curve_quote_price_error'})}}}
      const familyCode=String(pending.family||'').toUpperCase()==='CHC'?'CHC':Number(pending.pole)===4?'ES4':'ES2',request={product_type:'pump',flow_m3h:Number(pending.requested_flow_m3h),head_m:Number(pending.requested_head_m),family_code:familyCode,qty:Number(pending.qty||1),options:pumpOptions(pending.options,pending.qty)};session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'waiting_company',selected_customer_id:null,context:{keysuite_user_email:user.email,draft_items:[],pending_request:request,pending_item:null,from_curve:true}});await telegramSend(telegramToken,chatId,'Which customer is this quotation for?\nPlease type part of the company name.',telegramRemoveKeyboard());return json({ok:true,status:'curve_quote_waiting_company'});
    }

    if(searchAgainButton||callbackData==='quote:search'){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);
      if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to a KeySuite user.',mainMenuMarkup());return json({ok:true,status:'quotation_user_not_linked'})}
      const prior=sessionContext(session);await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'waiting_company',selected_customer_id:null,context:{keysuite_user_email:user.email,draft_items:[],active_draft_id:'',pending_request:null}});
      await telegramSend(telegramToken,chatId,'Type the customer/company name to search again.',telegramRemoveKeyboard());
      return json({ok:true,status:'quotation_waiting_company'});
    }

    if(/^quote:customer:[A-Za-z0-9_-]+$/.test(callbackData)){
      const customerId=callbackData.slice('quote:customer:'.length);const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);const customer=await allowedCustomerById(service,keySuiteCompanyId,user,customerId);
      if(!customer){await telegramSend(telegramToken,chatId,'That customer is not available under your KeySuite access. Please search again.',telegramReplyKeyboard([['🔎 Search Again','⬅️ Main Menu']]));return json({ok:true,status:'quotation_customer_denied'})}
      const prior=sessionContext(session);session=await selectQuotationCustomer(service,telegramToken,keySuiteCompanyId,chatId,senderId,user,customer,prior,prior.pending_request);session=await continueQuotationRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,prior.pending_request||{});
      return json({ok:true,status:'quotation_customer_selected',customer_id:customer.id,customer_name:customer.company_name});
    }

    // V4.13.10 quotation draft builder.
    if(pumpButton){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'Please select the customer first.',mainMenuMarkup());return json({ok:true,status:'quotation_customer_required'})}
      const c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_pump_method',context:{...c,pending_item:null}});
      await telegramSend(telegramToken,chatId,'How would you like to select the pump?',telegramReplyKeyboard([['📐 By Flow & Head'],['🔎 Change Company','⬅️ Main Menu']]));return json({ok:true,status:'quotation_pump_method'});
    }
    if(tankButton){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'Please select the customer first.',mainMenuMarkup());return json({ok:true,status:'quotation_customer_required'})}
      const c=sessionContext(session),request=mergeQuoteRequest(c.pending_request,{product_type:'tank'});session=await showTankQuoteFromRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,request);return json({ok:true,status:'quotation_tank_started'});
    }
    if(byFlowHeadButton){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'Please select the customer first.',mainMenuMarkup());return json({ok:true,status:'quotation_customer_required'})}
      const c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_flow',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,context:{...c,pending_request:mergeQuoteRequest(c.pending_request,{product_type:'pump'}),pending_item:null}});
      await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 20m3/hr @ 30m',telegramRemoveKeyboard());return json({ok:true,status:'quotation_waiting_flow'});
    }
    if(selectAgainButton){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'Please select the customer first.',mainMenuMarkup());return json({ok:true,status:'quotation_customer_required'})}
      const c=sessionContext(session),tankAgain=String(c.pending_item?.family||'').toUpperCase()==='GWS'||String(c.pending_request?.product_type||'')==='tank';
      if(tankAgain){const request={product_type:'tank',qty:Math.max(1,Number(c.pending_request?.qty||c.pending_item?.qty||1))};session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_tank',flow_m3h:null,head_m:null,context:{...c,pending_request:request,pending_tank_matches:null,pending_item:null}});await telegramSend(telegramToken,chatId,'Please enter the GWS Tank model or size again.\nExample: 100L 10 bar or PWB-100',telegramRemoveKeyboard());return json({ok:true,status:'quotation_waiting_tank'})}
      const request={...mergeQuoteRequest(c.pending_request,{product_type:'pump'}),flow_m3h:null,head_m:null,family_code:''};session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_waiting_flow',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,context:{...c,pending_request:request,pending_item:null}});
      await telegramSend(telegramToken,chatId,'Please enter Flow & Head together again.\nExample: 20m3/hr @ 30m, CHC',telegramRemoveKeyboard());return json({ok:true,status:'quotation_waiting_flow'});
    }
    if(addToQuotationButton&&session?.mode==='quotation'){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'The quotation session has expired. Please select the customer again.',mainMenuMarkup());return json({ok:true,status:'quotation_session_expired'})}
      const c=sessionContext(session),pending=c.pending_item;if(!pending?.model){await telegramSend(telegramToken,chatId,'There is no product selection waiting to be added. Please select a product first.',quotationProductMenu());return json({ok:true,status:'quotation_no_pending_item'})}
      const qty=Math.max(1,Math.trunc(Number(pending.qty)||1)),items=draftItemsFrom(session);items.push({...pending,id:crypto.randomUUID(),qty});const draft=await persistDraftItems(service,keySuiteCompanyId,chatId,senderId,session,items),activeQuote={customer_id:String(session.selected_customer_id),customer_name:String(c.customer_name||'Selected Customer'),keysuite_user_email:String(c.keysuite_user_email||''),draft_items:items};session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_after_add',context:{...c,draft_items:items,active_draft_id:String(draft?.id||c.active_draft_id||''),pending_request:null,pending_item:null,pending_tank_matches:null,active_quote:activeQuote}});
      await telegramSend(telegramToken,chatId,`✅ ${qty} unit${qty===1?'':'s'} added to quotation draft.\n\nDraft now has ${items.length} line item${items.length===1?'':'s'}.`,telegramReplyKeyboard([['➕ Add Another Item','📄 View Draft'],['📄 Create Quotation'],['⬅️ Main Menu']]));return json({ok:true,status:'quotation_item_added',items:items.length,qty});
    }
    if(addAnotherItemButton){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'The quotation session has expired. Please select the customer again.',mainMenuMarkup());return json({ok:true,status:'quotation_session_expired'})}
      const c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'customer_selected',flow_m3h:null,head_m:null,flow_raw:null,head_raw:null,context:{...c,pending_request:null,pending_tank_matches:null,pending_item:null}});await telegramSend(telegramToken,chatId,'What would you like to add?',quotationProductMenu());return json({ok:true,status:'quotation_add_another'});
    }
    if(viewDraftButton){
      if(!session||session.mode!=='quotation'||!session.selected_customer_id){await telegramSend(telegramToken,chatId,'The quotation session has expired. Please select the customer again.',mainMenuMarkup());return json({ok:true,status:'quotation_session_expired'})}
      const c=sessionContext(session);if(c.active_draft_id){const draft=await loadPersistentDraft(service,keySuiteCompanyId,String(c.active_draft_id));if(draft&&draft.status==='active')session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_after_add',selected_customer_id:String(draft.customer_id),context:{...c,customer_name:draft.customer_name,draft_items:Array.isArray(draft.items)?draft.items:[]}})}
      await telegramSend(telegramToken,chatId,quotationDraftText(session),persistentDraftMenu());return json({ok:true,status:'quotation_draft_view',items:draftItemsFrom(session).length});
    }
    if(editItemButton){
      if(!session||session.mode!=='quotation'){await telegramSend(telegramToken,chatId,'Open a quotation draft first.',mainMenuMarkup());return json({ok:true,status:'draft_required'})}const items=draftItemsFrom(session);if(!items.length){await telegramSend(telegramToken,chatId,'There are no items to edit.',persistentDraftMenu());return json({ok:true,status:'draft_no_items'})}const labels=items.map((x:any,i:number)=>({index:i,label:draftItemButtonLabel(x,i)})),c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'draft_edit_choose',context:{...c,draft_item_choices:labels}});await telegramSend(telegramToken,chatId,'Which item do you want to edit?',telegramReplyKeyboard([...labels.map((x:any)=>[x.label]),['📄 View Draft','⬅️ Main Menu']]));return json({ok:true,status:'draft_edit_choose'});
    }
    if(removeItemButton){
      if(!session||session.mode!=='quotation'){await telegramSend(telegramToken,chatId,'Open a quotation draft first.',mainMenuMarkup());return json({ok:true,status:'draft_required'})}const items=draftItemsFrom(session);if(!items.length){await telegramSend(telegramToken,chatId,'There are no items to remove.',persistentDraftMenu());return json({ok:true,status:'draft_no_items'})}const labels=items.map((x:any,i:number)=>({index:i,label:draftItemButtonLabel(x,i)})),c=sessionContext(session);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'draft_remove_choose',context:{...c,draft_item_choices:labels}});await telegramSend(telegramToken,chatId,'Which item do you want to remove?',telegramReplyKeyboard([...labels.map((x:any)=>[x.label]),['📄 View Draft','⬅️ Main Menu']]));return json({ok:true,status:'draft_remove_choose'});
    }
    if(!callbackQuery&&session?.step==='draft_edit_choose'&&text){const c=sessionContext(session),choices=Array.isArray(c.draft_item_choices)?c.draft_item_choices:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(choice){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'draft_edit_qty',context:{...c,draft_edit_index:Number(choice.index)}});await telegramSend(telegramToken,chatId,`Enter the new quantity for ${choice.label}.`,telegramRemoveKeyboard());return json({ok:true,status:'draft_edit_qty'})}}
    if(!callbackQuery&&session?.step==='draft_edit_qty'&&text){const n=Math.trunc(Number((String(text).match(/\d+/)||[])[0]));if(!(n>=1&&n<=999)){await telegramSend(telegramToken,chatId,'Please enter a quantity from 1 to 999.');return json({ok:true,status:'draft_edit_qty'})}const c=sessionContext(session),items=draftItemsFrom(session),i=Number(c.draft_edit_index);if(!(i>=0&&i<items.length)){await telegramSend(telegramToken,chatId,'That draft item is no longer available.',persistentDraftMenu());return json({ok:true,status:'draft_edit_missing'})}items[i]={...items[i],qty:n,line_total:Number(items[i].unit_price||0)*n};const draft=await persistDraftItems(service,keySuiteCompanyId,chatId,senderId,session,items);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_after_add',context:{...c,draft_items:items,active_draft_id:String(draft?.id||c.active_draft_id||''),draft_edit_index:null,draft_item_choices:null}});await telegramSend(telegramToken,chatId,`✅ Quantity updated to ${n}.\n\n${quotationDraftText(session)}`,persistentDraftMenu());return json({ok:true,status:'draft_item_updated'})}
    if(!callbackQuery&&session?.step==='draft_remove_choose'&&text){const c=sessionContext(session),choices=Array.isArray(c.draft_item_choices)?c.draft_item_choices:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(choice){const items=draftItemsFrom(session),i=Number(choice.index),removed=items.splice(i,1)[0];const draft=await persistDraftItems(service,keySuiteCompanyId,chatId,senderId,session,items);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_after_add',context:{...c,draft_items:items,active_draft_id:String(draft?.id||c.active_draft_id||''),draft_item_choices:null}});await telegramSend(telegramToken,chatId,`🗑 Removed ${removed?.model||'item'}.\n\n${quotationDraftText(session)}`,persistentDraftMenu());return json({ok:true,status:'draft_item_removed'})}}
    if(cancelDraftButton){const c=sessionContext(session);if(c.active_draft_id)await service.from('ks_keybot_quote_drafts_v41309').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',String(c.active_draft_id));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',selected_customer_id:null,flow_m3h:null,head_m:null,context:{}});await telegramSend(telegramToken,chatId,'Quotation draft cancelled.',mainMenuMarkup());return json({ok:true,status:'draft_cancelled'})}
    if(createQuotationButton){
      if(!session||session.mode!=='quotation'){await telegramSend(telegramToken,chatId,'Open a quotation draft first.',mainMenuMarkup());return json({ok:true,status:'draft_required'})}const c=sessionContext(session),draft=await loadPersistentDraft(service,keySuiteCompanyId,String(c.active_draft_id||''));if(!draft||draft.status!=='active'){await telegramSend(telegramToken,chatId,'The active quotation draft could not be found. Open My Drafts and try again.',mainMenuMarkup());return json({ok:true,status:'draft_missing'})}if(!Array.isArray(draft.items)||!draft.items.length){await telegramSend(telegramToken,chatId,'Add at least one item before creating the quotation.',persistentDraftMenu());return json({ok:true,status:'draft_empty'})}
      try{const saved=await createSavedQuotationFromDraft(service,keySuiteCompanyId,draft),no=String(saved?.no||saved?.quotationNo||'Saved quotation'),id=String(saved?.id||'');await service.from('ks_keybot_quote_drafts_v41309').update({status:'converted',converted_quotation_id:id||null,converted_quotation_no:no||null,updated_at:new Date().toISOString()}).eq('id',draft.id);session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'',step:'idle',selected_customer_id:null,flow_m3h:null,head_m:null,context:{}});await telegramSend(telegramToken,chatId,`✅ Quotation created in KeySuite.\n\nReference: ${no}\nStatus: Saved\n\nOpen KeySuite to review it. KeyBot did not Seal it or generate the quotation PDF.`,mainMenuMarkup());return json({ok:true,status:'quotation_created',quotation_no:no,quotation_id:id})}catch(error){await telegramSend(telegramToken,chatId,`The Saved quotation could not be created.\n\n${error instanceof Error?error.message:String(error)}`,persistentDraftMenu());return json({ok:true,status:'quotation_create_error'})}
    }

    if(!callbackQuery&&session?.mode==='quotation'&&session?.step==='quote_waiting_flow'&&text){
      const c=sessionContext(session),smart=smartQuoteRequest(text);smart.product_type='pump';const merged=mergeQuoteRequest(c.pending_request,smart);if(!(Number(merged.flow_m3h)>0&&Number(merged.head_m)>0)){await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 20m3/hr @ 30m');return json({ok:true,status:'quotation_waiting_flow'})}session=await showPumpQuoteFromRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,merged);return json({ok:true,status:'quotation_smart_duty_processed'});
    }
    if(!callbackQuery&&session?.mode==='quotation'&&session?.step==='quote_waiting_head'&&text){
      const c=sessionContext(session),smart=smartQuoteRequest(text),fallback=parseHeadStep(text);if(!smart.head_m&&fallback)smart.head_m=fallback.value;smart.flow_m3h=Number(smart.flow_m3h||session.flow_m3h||c.pending_request?.flow_m3h||0);smart.product_type='pump';if(!smart.head_m){await telegramSend(telegramToken,chatId,'I could not read that head. Please enter a positive number, for example 45 or 4.5 bar.');return json({ok:true,status:'quotation_waiting_head'})}session=await showPumpQuoteFromRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,mergeQuoteRequest(c.pending_request,smart));return json({ok:true,status:'quotation_smart_head_processed'});
    }

    if(!callbackQuery&&session?.mode==='quotation'&&session?.step==='quote_waiting_tank'&&text){
      const c=sessionContext(session),smart=smartQuoteRequest(`tank ${text}`);smart.raw_input=text;smart.product_type='tank';session=await showTankQuoteFromRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,mergeQuoteRequest(c.pending_request,smart));return json({ok:true,status:'quotation_tank_processed'});
    }
    if(!callbackQuery&&session?.mode==='quotation'&&session?.step==='quote_waiting_tank_choice'&&text){
      const c=sessionContext(session),choices=Array.isArray(c.pending_tank_matches)?c.pending_tank_matches:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanSearch(text));if(!choice){await telegramSend(telegramToken,chatId,'Please choose one of the GWS Tank options shown, or press Select Again.');return json({ok:true,status:'quotation_tank_choice_waiting'})}
      try{const r=await service.from('ks_products_gws').select('*').eq('id',choice.id).eq('status','active').maybeSingle();if(r.error||!r.data)throw new Error('That GWS Tank is no longer available.');const qty=Math.max(1,Math.trunc(Number(c.pending_request?.qty)||1)),item=await quoteGwsForCustomer(service,String(session.selected_customer_id||''),r.data,qty,String(c.keysuite_user_email||''));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'quote_result',context:{...c,pending_tank_matches:null,pending_item:item}});await telegramSend(telegramToken,chatId,quotationResultText(item),telegramReplyKeyboard([['✅ Add to Quotation'],['🔄 Select Again','📄 View Draft'],['⬅️ Main Menu']]));return json({ok:true,status:'quotation_tank_selection_ready',model:item.model,unit_price:item.unit_price})}catch(error){await telegramSend(telegramToken,chatId,`The GWS Tank selection/pricing could not be completed.\n\n${error instanceof Error?error.message:String(error)}`);return json({ok:true,status:'quotation_tank_error'})}
    }

    if(!callbackQuery&&session?.mode==='curve'&&session?.step==='waiting_flow'&&text){
      const smart=smartQuoteRequest(text),f=Number(smart.flow_m3h||0),h=Number(smart.head_m||0);if(!(f>0&&h>0)){await telegramSend(telegramToken,chatId,'Please enter Flow & Head together.\nExample: 20m3/hr @ 30m');return json({ok:true,status:'curve_waiting_flow'})}
      await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'curve',step:'confirm',flow_m3h:f,head_m:h,flow_raw:text,head_raw:text});
      await telegramSend(telegramToken,chatId,`Duty Point\nFlow: ${oneDecimal(f)} m³/hr\nHead: ${oneDecimal(h)} Mtr`,telegramReplyKeyboard([['✅ Continue','✏️ Change'],['⬅️ Main Menu']]));
      return json({ok:true,status:'curve_confirm',flow_m3h:f,head_m:h});
    }

    if(!callbackQuery&&session?.mode==='curve'&&session?.step==='waiting_head'&&text){
      const parsed=parseHeadStep(text);if(!parsed){await telegramSend(telegramToken,chatId,'I could not read that head. Please enter a positive number, for example 45 or 4.5 bar.');return json({ok:true,status:'curve_waiting_head'})}
      const next=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'curve',step:'confirm',head_m:parsed.value,head_raw:parsed.raw});const q=Number(next?.flow_m3h||session.flow_m3h),h=Number(parsed.value);
      await telegramSend(telegramToken,chatId,`Duty Point\nFlow: ${oneDecimal(q)} m³/hr\nHead: ${oneDecimal(h)} Mtr`,telegramReplyKeyboard([['✅ Continue','✏️ Change'],['⬅️ Main Menu']]));
      return json({ok:true,status:'curve_confirm',flow_m3h:q,head_m:h});
    }

    if(!callbackQuery&&session?.mode==='quotation'&&session?.step==='waiting_company'&&text&&!simpleRequestHasTechnical(smartQuoteRequest(text))){
      const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is no longer linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'quotation_user_not_linked'})}
      const c=sessionContext(session),parsed=smartQuoteRequest(text),pending=mergeQuoteRequest(c.pending_request,parsed),query=customerQueryFromQuoteText(text,parsed)||text,matches=await findAllowedCustomers(service,keySuiteCompanyId,user,query);
      if(!matches.length){session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'waiting_company',context:{...c,pending_request:hasQuoteTechnicalFacts(pending)?pending:c.pending_request}});await telegramSend(telegramToken,chatId,`No customer matched “${query}”.\nPlease try another part of the company name.`,telegramReplyKeyboard([['⬅️ Main Menu']]));return json({ok:true,status:'quotation_no_company_match'})}
      const exact=matches.find((x:any)=>cleanSearch(x.company_name)===cleanSearch(query));
      if(exact||matches.length===1){const chosen=exact||matches[0];session=await selectQuotationCustomer(service,telegramToken,keySuiteCompanyId,chatId,senderId,user,chosen,c,hasQuoteTechnicalFacts(pending)?pending:c.pending_request);await telegramSend(telegramToken,chatId,`✅ Company selected: ${chosen.company_name}`);session=await continueQuotationRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,hasQuoteTechnicalFacts(pending)?pending:{});return json({ok:true,status:'quotation_customer_selected',customer_id:chosen.id,customer_name:chosen.company_name})}
      session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'quotation',step:'waiting_company',context:{...c,pending_request:hasQuoteTechnicalFacts(pending)?pending:c.pending_request}});const rows=matches.map((x:any)=>[String(x.company_name).slice(0,55)]);rows.push(['🔎 Search Again','⬅️ Main Menu']);await telegramSend(telegramToken,chatId,`I found ${matches.length} similar customers for “${query}”.\nPlease confirm which company you mean:`,telegramReplyKeyboard(rows));return json({ok:true,status:'quotation_company_matches',count:matches.length,matches:matches.map((x:any)=>({id:x.id,name:x.company_name}))});
    }

    if(!callbackQuery&&session?.mode==='quotation'&&session?.step==='customer_selected'&&text){
      const smart=smartQuoteRequest(text);if(hasQuoteTechnicalFacts(smart)){session=await continueQuotationRequest(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,smart);return json({ok:true,status:'quotation_smart_request_processed'})}
    }

    // V4.13.10 message-first KeyBot. Any supplied facts are kept; only missing facts are requested.
    if(!callbackQuery&&session?.mode==='smart_curve'&&['smart_waiting_flow','smart_waiting_head'].includes(String(session?.step||''))&&text){const c=sessionContext(session),parsed=smartQuoteRequest(text);session=await sendSimpleCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,mergeQuoteRequest(c.pending_request,parsed));return json({ok:true,status:'smart_curve_followup'})}
    if(!callbackQuery&&session?.mode==='smart_curve'&&session?.step==='smart_waiting_family'&&familyTextCode){const c=sessionContext(session);session=await sendSimpleCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,mergeQuoteRequest(c.pending_request,{family_code:familyTextCode}));return json({ok:true,status:'smart_curve_family'})}
    if(!callbackQuery&&session?.mode==='price'&&session?.step==='price_waiting_company'&&text&&!simpleRequestHasTechnical(smartQuoteRequest(text))){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'This Telegram account is not linked to an active KeySuite user.',mainMenuMarkup());return json({ok:true,status:'price_user_not_linked'})}const c=sessionContext(session),choices=Array.isArray(c.customer_choices)?c.customer_choices:[],chosen=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(chosen){const customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(chosen.id));if(customer){session=await continueSimplePrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,c.pending_request||{});return json({ok:true,status:'price_customer_selected'})}}session=await resolveSimplePriceCustomer(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,String(text),c.pending_request||{});return json({ok:true,status:'price_customer_search'})}
    if(!callbackQuery&&session?.mode==='price'&&['price_waiting_flow','price_waiting_head','price_waiting_product','price_waiting_tank'].includes(String(session?.step||''))&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id||''));if(!user||!customer){await telegramSend(telegramToken,chatId,'The customer price session has expired. Start a new request.',mainMenuMarkup());return json({ok:true,status:'price_session_expired'})}const c=sessionContext(session),prefix=session.step==='price_waiting_tank'?'tank ':'',parsed=smartQuoteRequest(prefix+text);session=await continueSimplePrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,mergeQuoteRequest(c.pending_request,parsed));return json({ok:true,status:'price_followup'})}
    if(!callbackQuery&&session?.mode==='price'&&session?.step==='price_waiting_family'&&familyTextCode){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id||'')),c=sessionContext(session);if(user&&customer){session=await continueSimplePrice(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,customer,user,mergeQuoteRequest(c.pending_request,{family_code:familyTextCode,product_type:'pump'}));return json({ok:true,status:'price_family'})}}
    if(!callbackQuery&&session?.mode==='price'&&session?.step==='price_waiting_tank_choice'&&text){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId),customer=await allowedCustomerById(service,keySuiteCompanyId,user,String(session.selected_customer_id||'')),c=sessionContext(session),choices=Array.isArray(c.pending_tank_matches)?c.pending_tank_matches:[],choice=choices.find((x:any)=>cleanSearch(x.label)===cleanButton);if(user&&customer&&choice){const r=await service.from('ks_products_gws').select('*').eq('id',choice.id).eq('status','active').maybeSingle();if(r.data){const qty=Math.max(1,Math.trunc(Number(c.pending_request?.qty)||1)),item=await quoteGwsForCustomer(service,String(customer.id),r.data,qty,String(user.email||''));session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'price',step:'price_result',selected_customer_id:String(customer.id),context:{...c,pending_item:item,pending_tank_matches:null}});await telegramSend(telegramToken,chatId,`Customer: ${customer.company_name}\n\n${quotationResultText(item)}`,simplePriceMenu(false));return json({ok:true,status:'tank_price_ready'})}}await telegramSend(telegramToken,chatId,'Please choose one of the shown GWS Tank options.');return json({ok:true,status:'tank_choice_waiting'})}

    // V4.14.00: fresh technical/system commands override stale customer-search sessions.
    if(!callbackQuery&&text&&!menuText&&!curveButton&&!quotationButton&&!optionsButton&&!pumpConfigurationButton&&!curvePdfButton&&!checkPriceButton&&!pumpPriceButton&&!systemPriceButton&&!bothPricesButton&&!newRequestButton&&!familyTextCode&&!editBomButton){const parsed=smartQuoteRequest(text),customerHint=customerHintFromMessage(text,parsed),explicitPrice=/\b(?:price|pricing)\b/i.test(text);if(simpleRequestHasTechnical(parsed)||customerHint||explicitPrice){
      if(parsed.product_type==='keyplc_system'||parsed.system_type==='KEYPLC'){if(customerHint){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'Customer pricing is available to linked KeySuite users only.',mainMenuMarkup());return json({ok:true,status:'keyplc_user_not_linked'})}session=await resolveKeyplcCustomer(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,customerHint,parsed);return json({ok:true,status:'message_first_keyplc_price'})}session=await sendKeyplcSystem(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,parsed,null,null);return json({ok:true,status:'message_first_keyplc'})}
      if((parsed.product_type==='tank'||explicitPrice)&&!customerHint){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'For GWS Tank pricing, this Telegram account must be linked to a KeySuite user.',mainMenuMarkup());return json({ok:true,status:'tank_price_user_not_linked'})}session=await saveKeybotSession(service,keySuiteCompanyId,chatId,senderId,{mode:'price',step:'price_waiting_company',selected_customer_id:null,context:{keysuite_user_email:user.email,pending_request:parsed}});await telegramSend(telegramToken,chatId,parsed.product_type==='tank'?'Which customer is this tank price for?\nType part of the company name.':'Which customer is this price for?\nType part of the company name.',telegramRemoveKeyboard());return json({ok:true,status:'price_waiting_company'})}
      if(customerHint){const user=await linkedKeySuiteUser(service,keySuiteCompanyId,senderId);if(!user){await telegramSend(telegramToken,chatId,'Customer pricing is available to linked KeySuite users only.',mainMenuMarkup());return json({ok:true,status:'price_user_not_linked'})}session=await resolveSimplePriceCustomer(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,user,customerHint,parsed);return json({ok:true,status:'message_first_price'})}
      session=await sendSimpleCurve(service,telegramToken,keySuiteCompanyId,chatId,senderId,session,parsed);return json({ok:true,status:'message_first_curve'});
    }}

    const settingsResult=await service.from('ks_app_settings').select('keyai_openai_enabled,keyai_openai_model').eq('id','default').maybeSingle();
    if(settingsResult.error)throw settingsResult.error;
    const openAiEnabled=!!settingsResult.data?.keyai_openai_enabled;
    const model=String(settingsResult.data?.keyai_openai_model||'gpt-5-mini');

    const activeSince=new Date(Date.now()-7*24*60*60*1000).toISOString();
    const activeResult=await service.from('ks_keyai_enquiries')
      .select('id,conversation_id,raw_message,ai_result,clarification_question,clarification_questions,updated_at')
      .eq('source','telegram').eq('external_chat_id',chatId).is('parent_enquiry_id',null).eq('status','awaiting_customer')
      .gte('updated_at',activeSince).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(activeResult.error)throw activeResult.error;
    const active=activeResult.data||null;

    const fullAutomation=responseMode==='curve_price'&&openAiEnabled;
    const initialStatus=responseMode==='nothing'
      ?'sender_mode_nothing'
      :(responseMode==='curve_only'?'received':(openAiEnabled?'processing':'ai_disabled_manual_review'));
    const insertPayload:any={
      source:'telegram',external_update_id:updateId,external_message_id:Number(message?.message_id||0)||null,
      external_chat_id:chatId,sender_username:senderUsername||null,sender_name:senderName||null,
      raw_message:text,status:initialStatus,ai_enabled:fullAutomation,ai_model:fullAutomation?model:null,
      parent_enquiry_id:active?.id||null,conversation_id:active?(active.conversation_id||active.id):null,
      external_sender_id:senderId||null,keyai_company_id:keySuiteCompanyId||null,keyai_customer_id:senderContext.customer_id||null
    };
    const insertResult=await service.from('ks_keyai_enquiries').insert(insertPayload).select('id').single();
    if(insertResult.error)throw insertResult.error;
    const enquiryId=insertResult.data.id;
    const rootId=active?.id||enquiryId;
    if(!active)await service.from('ks_keyai_enquiries').update({conversation_id:enquiryId}).eq('id',enquiryId);

    // V4.12.08: Global AI ON is only a master enable switch. The sender/company
    // mode decides what automation this Telegram sender is allowed to receive.
    if(responseMode==='nothing'){
      return json({ok:true,id:rootId,status:'sender_mode_nothing',response_mode:responseMode,automated_reply:false});
    }

    // V4.12.08: the Telegram structured curve path is deterministic and zero-token. Flow + Head + an
    // explicit CHC/ES family is handled before OpenAI, so there is no
    // OpenAI token charge for a complete structured duty request.
    const curveSource=active?`${active.raw_message||''}\n${text}`:text;
    const previousCurve=active?.ai_result&&typeof active.ai_result==='object'?active.ai_result:{};
    const curveFacts=extractFacts(curveSource);

    // V4.12.14: follow-up answers are merged as structured state, not by
    // re-interpreting the whole conversation as a brand-new request.
    // Example:
    // root: "ES 30 m3/hr @ 20 Mtr" -> waiting for es_pole
    // reply: "4Pole" -> keep ES/flow/head from root and apply only pole=4.
    const currentFamily=curveFamily(text);
    const priorFamily=previousCurve.pump_family||curveFamily(String(active?.raw_message||''))||null;
    const family=currentFamily||priorFamily||curveFamily(curveSource)||null;
    const currentEsPole=curveEsPole(text);
    const priorEsPole=previousCurve.es_pole||curveEsPole(String(active?.raw_message||''))||null;
    const esPole=family==='ES'
      ?(currentEsPole==='AMBIGUOUS'?'AMBIGUOUS':(currentEsPole||priorEsPole||null))
      :null;
    const curveFlow=curveFacts.flow_value??previousCurve.flow_value??null;
    const curveHead=curveFacts.head_value??previousCurve.head_value??null;
    const curveIntent=!!(family||previousCurve.intent==='curve'||(curveFlow!==null&&curveHead!==null));
    if(curveIntent){
      const display=dutyDisplay(curveSource,curveFlow,curveHead);
      const curveResult:any={
        intent:'curve',
        pump_family:family==='AMBIGUOUS'?null:family,
        es_pole:family==='ES'&&esPole!=='AMBIGUOUS'&&esPole?Number(esPole):null,
        pump_speed_rpm:family==='ES'&&esPole!=='AMBIGUOUS'&&esPole?esPoleRpm(esPole):null,
        flow_value:curveFlow,flow_unit:curveFlow===null?null:'m³/hr',
        head_value:curveHead,head_unit:curveHead===null?null:'m',
        flow_text:display.flow_text,head_text:display.head_text,duty_text:display.duty_text,
        processing_engine:'deterministic',
        openai_used:false
      };
      const missing:string[]=[];
      if(family==='AMBIGUOUS')missing.push('Please choose only one pump family: CHC, BFI or ES.');
      else if(!family)missing.push('Please confirm the pump family: CHC, BFI or ES.');
      else if(family==='ES'&&esPole==='AMBIGUOUS')missing.push('Please choose only one ES speed: 2 Pole or 4 Pole.');
      else if(family==='ES'&&!esPole)missing.push('ES 2 Pole or 4 Pole?');
      if(curveFlow===null)missing.push('Please provide the required flow with its unit.');
      if(curveHead===null)missing.push('Please provide the required head or pressure with its unit.');
      if(missing.length){
        curveResult.clarification_questions=missing;
        curveResult.awaiting_field=(family==='ES'&&!esPole)?'es_pole':(!family?'pump_family':(curveFlow===null?'flow':(curveHead===null?'head':null)));
        await service.from('ks_keyai_enquiries').update({status:'awaiting_customer',ai_summary:'Telegram curve request',ai_result:curveResult,clarification_questions:missing,clarification_question:missing.join('\n'),updated_at:new Date().toISOString()}).eq('id',rootId);
        if(active)await service.from('ks_keyai_enquiries').update({status:'followup_processed',updated_at:new Date().toISOString()}).eq('id',enquiryId);
        await telegramSend(telegramToken,chatId,missing.join('\n'));
        return json({ok:true,id:rootId,status:'awaiting_customer',curve:true,clarification_questions:missing});
      }
      const curveUrl=selectorCurveUrl(env('KEYSUITE_PUBLIC_URL'),String(family),Number(curveFlow),Number(curveHead),display,esPole);
      if(!curveUrl){
        const error='KEYSUITE_PUBLIC_URL is not configured for Telegram curve links.';
        await service.from('ks_keyai_enquiries').update({status:'ai_error_manual_review',ai_error:error,ai_result:curveResult,updated_at:new Date().toISOString()}).eq('id',rootId);
        await telegramSend(telegramToken,chatId,'The curve request is complete, but the KeySuite curve link is not configured. Please contact the KeySuite administrator.');
        return json({ok:true,id:rootId,status:'ai_error_manual_review',curve:true,error});
      }
      curveResult.selector_url=curveUrl;curveResult.selector_engine=String(family).toUpperCase()==='CHC_G1'?'KeyCHC C4 manual Selector':String(family).toUpperCase().startsWith('CHC')?'KeyCHC manual Selector':String(family).toUpperCase()==='BFI'?'KeyBFI manual Selector':`KeyES ${Number(esPole)} Pole Selector`;
      delete curveResult.awaiting_field;
      let pdfMeta:any=null,pdfError='';
      try{
        pdfMeta=await generateCurvePdf(String(family),Number(curveFlow),Number(curveHead),display.duty_text,env('KEYSUITE_PUBLIC_URL'),family==='ES'?Number(esPole):0);
        curveResult.pdf_filename=pdfMeta.filename;
        curveResult.selected_model=pdfMeta.model;
        curveResult.motor_kw=pdfMeta.motor_kw;
        curveResult.motor_hp=pdfMeta.motor_hp;
        curveResult.efficiency=pdfMeta.efficiency;
        curveResult.npshr=pdfMeta.npshr;
        curveResult.shaft_kw=pdfMeta.shaft_kw;
        if(pdfMeta.pole)curveResult.es_pole=Number(pdfMeta.pole);
        if(pdfMeta.rpm)curveResult.pump_speed_rpm=Number(pdfMeta.rpm);
        if(pdfMeta.selector_core_version)curveResult.selector_core_version=pdfMeta.selector_core_version;
        if(pdfMeta.pdf_layout)curveResult.pdf_layout=pdfMeta.pdf_layout;
        if(pdfMeta.pdf_layout_version)curveResult.pdf_layout_version=pdfMeta.pdf_layout_version;
      }catch(error){
        pdfError=error instanceof Error?error.message:String(error);
        console.error('KeyBot curve PDF generation failed',pdfError);
      }
      await service.from('ks_keyai_enquiries').update({
        status:pdfMeta?'curve_ready':'curve_pdf_error',
        ai_enabled:false,
        ai_model:null,
        ai_summary:`${family==='ES'?esPoleLabel(esPole):family} curve · ${display.duty_text}${pdfMeta?` · ${pdfMeta.model}`:''}`,
        ai_result:curveResult,
        ai_error:pdfError||null,
        clarification_questions:[],
        clarification_question:null,
        updated_at:new Date().toISOString()
      }).eq('id',rootId);
      if(active)await service.from('ks_keyai_enquiries').update({status:'followup_processed',updated_at:new Date().toISOString()}).eq('id',enquiryId);
      if(pdfMeta){
        const sent=await telegramSendDocument(
          telegramToken,
          chatId,
          pdfMeta.bytes,
          pdfMeta.filename,
          `${family==='ES'?esPoleLabel(esPole):family} curve ready\n${display.duty_text}\nSelected: ${pdfMeta.model}`
        );
        if(!sent.ok){
          pdfError=`Telegram PDF send failed: ${sent.error||'Unknown error'}`;
          await service.from('ks_keyai_enquiries').update({status:'curve_pdf_error',ai_error:pdfError,updated_at:new Date().toISOString()}).eq('id',rootId);
          await telegramSend(telegramToken,chatId,`${family==='ES'?esPoleLabel(esPole):family} curve is ready, but the PDF could not be sent. Please contact KeySuite support.`);
        }
      }else{
        await telegramSend(telegramToken,chatId,`${family==='ES'?esPoleLabel(esPole):family} curve is ready, but the PDF could not be generated. Please contact KeySuite support.`);
      }
      return json({
        ok:true,id:rootId,status:pdfMeta&&!pdfError?'curve_ready':'curve_pdf_error',curve:true,response_mode:responseMode,
        family,es_pole:family==='ES'?Number(esPole):null,pump_speed_rpm:family==='ES'?esPoleRpm(esPole):null,
        flow_m3h:Number(curveFlow),head_m:Number(curveHead),
        duty_text:display.duty_text,selector_url:curveUrl,
        pdf_filename:pdfMeta?.filename||null,selected_model:pdfMeta?.model||null,pdf_error:pdfError||null,
        processing_engine:'deterministic',openai_used:false
      });
    }

    if(responseMode==='curve_only'){
      await service.from('ks_keyai_enquiries').update({
        status:'curve_only_manual_review',
        ai_enabled:false,
        ai_model:null,
        ai_summary:'Sender is limited to Curve Only; non-curve enquiry saved for manual review.',
        updated_at:new Date().toISOString()
      }).eq('id',rootId);
      if(active)await service.from('ks_keyai_enquiries').update({status:'followup_processed',updated_at:new Date().toISOString()}).eq('id',enquiryId);
      await telegramSend(telegramToken,chatId,'Thank you. Your enquiry has been received for manual review.');
      return json({ok:true,id:rootId,status:'curve_only_manual_review',response_mode:responseMode,openai:false});
    }

    if(responseMode==='curve_price'&&!senderContext.assigned){
      await service.from('ks_keyai_enquiries').update({
        status:'ai_error_manual_review',
        ai_enabled:false,
        ai_model:null,
        ai_error:'Curve & Price requires an assigned KeySuite company/customer.',
        updated_at:new Date().toISOString()
      }).eq('id',rootId);
      await telegramSend(telegramToken,chatId,'Thank you. Your enquiry has been received for manual review. Pricing access is not configured for this sender.');
      return json({ok:true,id:rootId,status:'ai_error_manual_review',response_mode:responseMode,openai:false});
    }

    if(!openAiEnabled){
      if(active)await service.from('ks_keyai_enquiries').update({status:'ai_disabled_manual_review',updated_at:new Date().toISOString()}).eq('id',active.id);
      await telegramSend(telegramToken,chatId,'Thank you. Your enquiry has been received. AI processing is currently disabled. Your enquiry has been saved for manual review.');
      return json({ok:true,id:rootId,openai:false,status:'ai_disabled_manual_review',response_mode:responseMode});
    }

    const baseInstructions=`You are KeyBot for KeySuite. Extract and update customer pump/system quotation requirements only. Do not select a pump model, calculate engineering performance, calculate prices, discounts, margins, commercial terms, or send a quotation. The API enforces the JSON schema. Use null only for genuinely unknown scalar values before defaults are applied and [] for empty arrays. B4.06.04 uses DEFAULT ASSUMPTIONS for unspecified normal enquiries: application/system = Booster System; if a pump quantity is stated, it is a system request; duty configuration = 1 Duty + remaining pumps On Demand (so 3 pumps = 1 Duty + 2 On Demand); flow_basis = per_duty_pump; fluid = Water; fluid_temperature = 10–70°C; power = 415V / 3Ph / 50Hz; material = Standard Material; elastomer = Standard; installation = Indoor; suction_condition = Flooded / Positive Suction. Explicit customer wording ALWAYS overrides these defaults, including total/system flow, standby arrangements, Oil/other fluids, non-standard temperature, voltage, material, elastomer, outdoor installation or suction lift. The only normally required inputs are FLOW and HEAD/PRESSURE. Do not ask the customer to confirm any default. clarification_questions should be empty when flow and head are known unless the customer's own wording contains a genuine contradiction/ambiguity that cannot be safely resolved. Preserve facts already confirmed by the customer. Normalize system_type to the actual system such as Booster System or Transfer System; keep duty_configuration separate. Normalize recognised flow units to m³/hr and recognised head/pressure units to metres of water head before returning the structured result. Keep the summary concise.`;
    const existingNormal=active?normaliseResult(active.ai_result,active.raw_message):null;
    const currentSmart=active?smartQuestionsFrom(existingNormal?.smart_followup_questions||active.ai_result?.smart_followup_questions):[];
    const interpreted=active?interpretSmartReply(text,currentSmart):{overrides:{},recognized:0,semantic:''};
    const aiInput=active
      ?`Existing extracted requirements:\n${JSON.stringify(existingNormal||{},null,2)}\n\nCurrent KeyBot follow-up questions:\n${currentSmart.map((q,i)=>`${i+1}. ${questionText(q)}`).join('\n\n')||String(active.clarification_question||'')}\n\nCustomer follow-up reply:\n${text}\n${interpreted.semantic?`\nDeterministically interpreted current choices:\n${interpreted.semantic}\n`:''}\nMerge the reply into the existing requirements. Treat the deterministic interpretations as authoritative. Remove resolved items from critical_missing_information and clarification_questions.`
      :text;
    const aiResponse=await fetch(`${supabaseUrl}/functions/v1/keyai-openai`,{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${serviceKey}`,'apikey':serviceKey},
      body:JSON.stringify({
        mode:active?'telegram-followup':'telegram',
        input:aiInput,
        instructions:baseInstructions,
        keySuiteContext:senderContext
      })
    });
    const aiData=await aiResponse.json().catch(()=>({}));
    if(!aiResponse.ok||!aiData?.ok){
      const error=String(aiData?.error||`KeyBot OpenAI HTTP ${aiResponse.status}`);
      await service.from('ks_keyai_enquiries').update({status:'ai_error_manual_review',ai_error:error,updated_at:new Date().toISOString()}).eq('id',rootId);
      if(active)await service.from('ks_keyai_enquiries').update({status:'ai_error_manual_review',ai_error:error}).eq('id',enquiryId);
      await telegramSend(telegramToken,chatId,'Thank you. Your enquiry has been received and saved for manual review.');
      return json({ok:true,id:rootId,openai:true,status:'ai_error_manual_review',error});
    }

    const parsed=parseAiJson(String(aiData.output||''));
    const source=active?`${active.raw_message}\n${text}`:text;
    const result=applyKeyAiDefaults(applyOverrides(normaliseResult(parsed,source,existingNormal),interpreted.overrides));
    // Keep the resolved KeySuite customer/pricing context with the enquiry without
    // requiring new columns in the separate KeyAI database. It is refreshed on every message.
    result.keySuiteContext=senderContext;
    const smart=buildSmartQuestions(result,source,strings(result.clarification_questions,6));
    result.smart_followup_questions=smart;
    result.clarification_questions=smart.map(questionText);
    // Keep status lists accurate after deterministic choice application.
    if(result.fluid)result.missing_information=strings(result.missing_information).filter(v=>!/fluid not specified|fluid being pumped/i.test(v));
    if(result.flow_basis)result.critical_missing_information=strings(result.critical_missing_information).filter(v=>!/total system flow|per duty pump|flow basis|whether .*flow/i.test(v));
    const summary=summaryFrom(result);
    const questions=result.clarification_questions;
    const questionTextJoined=questions.join('\n\n');
    const nextStatus=questions.length?'awaiting_customer':'ai_draft_ready';
    await service.from('ks_keyai_enquiries').update({
      status:nextStatus,ai_model:String(aiData.model||model),ai_summary:summary||null,ai_result:result,ai_error:null,
      clarification_questions:questions,clarification_question:questionTextJoined||null,updated_at:new Date().toISOString()
    }).eq('id',rootId);
    if(active)await service.from('ks_keyai_enquiries').update({status:'followup_processed',ai_model:String(aiData.model||model),ai_error:null,updated_at:new Date().toISOString()}).eq('id',enquiryId);

    if(smart.length)await telegramSend(telegramToken,chatId,clarificationText(smart));
    else await telegramSend(telegramToken,chatId,active?'Thank you. KeyBot has updated the quotation requirements and they are ready for review.':'Thank you. Your enquiry has been received. KeyBot has prepared the quotation requirements for review.');
    return json({ok:true,id:rootId,openai:true,status:nextStatus,response_mode:responseMode,clarification_questions:questions,smart_followup_questions:smart,keySuiteContext:senderContext});
  }catch(error){console.error(error);return json({ok:false,error:error instanceof Error?error.message:String(error)},500)}
});
