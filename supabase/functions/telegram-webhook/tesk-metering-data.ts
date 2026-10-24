export type TeskServiceType='water'|'chemical_dosing'|'chemical_transfer'|'dosing'|'ambiguous'|'none';
export type TeskMeteringRequest={
  raw_text?:string;service_type?:TeskServiceType;medium?:string;medium_key?:string;
  concentration_pct?:number|null;temperature_c?:number|null;flow_lph?:number|null;pressure_bar?:number|null;
};

type ChemicalRule={
  key:string;name:string;aliases:string[];concentrations?:number[];
  maxTempC?:number;headMaxTempC?:number;temperatureColumnsC?:number[];
  head:'PVDF'|'PVC'|'316SS';diaphragm:string;seal:string;avoid?:string[];note:string;
};

// V4.28.07: conservative digital rules derived from TESK's catalogue anticorrosion table.
// Full wetted-parts compatibility is only called "confirmed" where the represented
// head + seal combination is covered by the conservative rule. Where only the pump
// head material remains supported, KeyBot returns a preliminary recommendation and
// explicitly keeps the seal / final wetted-parts selection open for engineering review.
export const TESK_CHEMICAL_RULES:ChemicalRule[]=[
  {key:'sodium_hypochlorite',name:'Sodium hypochlorite',aliases:['sodium hypochlorite','naocl','bleach'],concentrations:[10],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'EPDM',avoid:['304SS','316SS'],note:'TESK table supports fluoroplastic and EPDM for the represented 10% sodium hypochlorite condition; stainless steel is not selected.'},
  {key:'hydrochloric_acid',name:'Hydrochloric acid',aliases:['hydrochloric acid','hcl','muriatic acid'],concentrations:[30],maxTempC:50,headMaxTempC:100,temperatureColumnsC:[25,50,100],head:'PVDF',diaphragm:'PTFE composite',seal:'FPM',avoid:['304SS','316SS','EPDM at elevated temperature'],note:'TESK lists Muriatic acid 30%. Fluoroplastic is rated V through the 100°C table column; FPM is rated V at 25/50°C and O at 100°C, so above 50°C the PVDF pump head can be proposed but the final seal requires confirmation.'},
  {key:'hydrochloric_acid',name:'Hydrochloric acid',aliases:['hydrochloric acid','hcl','muriatic acid'],concentrations:[38],maxTempC:0,headMaxTempC:100,temperatureColumnsC:[25,50,100],head:'PVDF',diaphragm:'PTFE composite',seal:'Final seal confirmation required',avoid:['304SS','316SS'],note:'TESK lists Muriatic acid 38%. Fluoroplastic is rated V through the 100°C table column, but the listed elastomer ratings do not support a conservative final seal recommendation; confirm the complete wetted-parts combination before supply.'},
  {key:'sulfuric_acid',name:'Sulfuric acid',aliases:['sulfuric acid','sulphuric acid','h2so4'],concentrations:[50],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'FPM',note:'TESK table includes sulfuric acid at 50%; PVDF/fluoroplastic is used as the conservative liquid-end choice.'},
  {key:'sulfuric_acid',name:'Sulfuric acid',aliases:['sulfuric acid','sulphuric acid','h2so4'],concentrations:[98],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'FPM',avoid:['EPDM'],note:'TESK table includes 98% sulfuric acid. Fluoroplastic is the conservative liquid-end choice; elastomer compatibility must stay within the catalogue condition.'},
  {key:'sodium_hydroxide',name:'Sodium hydroxide',aliases:['sodium hydroxide','naoh','caustic soda','caustic'],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'EPDM',note:'TESK table includes sodium hydroxide; PVDF/fluoroplastic with EPDM is used as the conservative choice.'},
  {key:'ferric_chloride',name:'Ferric chloride',aliases:['ferric chloride','fecl3'],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'EPDM',avoid:['304SS','316SS'],note:'TESK table includes ferric chloride; PVDF/fluoroplastic is preferred over stainless steel.'},
  {key:'phosphoric_acid',name:'Phosphoric acid',aliases:['phosphoric acid','h3po4'],concentrations:[85],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'EPDM',note:'TESK table includes phosphoric acid at 85%; PVDF/fluoroplastic is used as the conservative choice.'},
  {key:'nitric_acid',name:'Nitric acid',aliases:['nitric acid','hno3'],concentrations:[50,95],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'FPM',note:'TESK table includes nitric acid at 50% and 95%; PVDF/fluoroplastic is used as the conservative liquid-end choice.'},
  {key:'hydrogen_peroxide',name:'Hydrogen peroxide',aliases:['hydrogen peroxide','h2o2'],concentrations:[90],maxTempC:50,headMaxTempC:50,temperatureColumnsC:[25,50],head:'PVDF',diaphragm:'PTFE composite',seal:'EPDM',note:'TESK table includes 90% hydrogen peroxide. Confirm the exact operating condition before final supply.'},
  {key:'water',name:'Water',aliases:['water','clean water','city water','tap water'],head:'PVC',diaphragm:'PTFE composite',seal:'EPDM',note:'Water service does not require chemical compatibility screening.'}
];

type CksPoint={code:string;maxFlowLph:number;maxPressureBar:number};
export const TESK_CKS_POINTS:CksPoint[]=[
  {code:'03',maxFlowLph:2.3,maxPressureBar:10},{code:'04',maxFlowLph:4.4,maxPressureBar:7},
  {code:'06',maxFlowLph:6,maxPressureBar:4},{code:'12',maxFlowLph:12.2,maxPressureBar:2},
  {code:'05',maxFlowLph:4.9,maxPressureBar:10},{code:'08',maxFlowLph:7.8,maxPressureBar:7},
  {code:'16',maxFlowLph:16.4,maxPressureBar:4},{code:'24',maxFlowLph:24.2,maxPressureBar:2}
];

type GsPoint={model:string;maxFlowLph:number;maxPressureBar:number};
// TESK GS catalogue flow table (GS001-GS060).
export const TESK_GS_POINTS:GsPoint[]=[
  {model:'GS001',maxFlowLph:1.1,maxPressureBar:10},
  {model:'GS002',maxFlowLph:2.2,maxPressureBar:10},
  {model:'GS003',maxFlowLph:4.5,maxPressureBar:10},
  {model:'GS005',maxFlowLph:6.5,maxPressureBar:10},
  {model:'GS010',maxFlowLph:13,maxPressureBar:10},
  {model:'GS025',maxFlowLph:25,maxPressureBar:7},
  {model:'GS030',maxFlowLph:30,maxPressureBar:7},
  {model:'GS035',maxFlowLph:36,maxPressureBar:5},
  {model:'GS045',maxFlowLph:46,maxPressureBar:4},
  {model:'GS055',maxFlowLph:55,maxPressureBar:2},
  {model:'GS060',maxFlowLph:59,maxPressureBar:2}
];

type SeriesEnvelope={series:string;maxFlowLph:number;maxPressureBar:number;materials:string[];plasticMaxBar?:number;note:string};
export const TESK_SERIES_ENVELOPES:SeriesEnvelope[]=[
  {series:'GS',maxFlowLph:59,maxPressureBar:10,materials:['PVC','PVDF','316SS'],note:'Mechanical diaphragm metering pump series.'},
  {series:'GLS',maxFlowLph:152,maxPressureBar:10,materials:['PVC','PVDF','316SS'],note:'Mechanical diaphragm metering pump series.'},
  {series:'GTS',maxFlowLph:500,maxPressureBar:7,materials:['PVC','PVDF','316SS'],note:'Mechanical diaphragm metering pump series.'},
  {series:'GM/GB',maxFlowLph:2040,maxPressureBar:12,materials:['PVC','PVDF','316SS'],note:'General mechanical diaphragm metering pump family.'},
  {series:'JMLS',maxFlowLph:190,maxPressureBar:59,materials:['304SS','316SS','PVDF'],plasticMaxBar:10,note:'Hydraulic diaphragm metering pump series; plastic liquid end is limited to the catalogue plastic pressure rating.'},
  {series:'JMBS',maxFlowLph:430,maxPressureBar:92,materials:['304SS','316SS','PVDF'],plasticMaxBar:10,note:'Hydraulic diaphragm metering pump series; plastic liquid end is limited to the catalogue plastic pressure rating.'},
  {series:'JMXS',maxFlowLph:1600,maxPressureBar:40,materials:['PVC','PVDF','304SS','316SS'],plasticMaxBar:8,note:'Hydraulic diaphragm metering pump series; plastic liquid end is limited to the catalogue plastic pressure rating.'}
];

const norm=(v:any)=>String(v??'').toLowerCase().replace(/[³]/g,'3').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
const num=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:null};

export function isTeskChemicalTemplateCommand(text:any){
  const s=norm(text).replace(/[.!?]+$/,'').trim();
  return /^(?:chem|chemical|chemical pump|tesk chemical pump|chemical dosing|chemical dosing pump|dosing|dosing pump|metering|metering pump|tesk metering pump)$/.test(s);
}

export function teskChemicalInputTemplate(){
  return ['Medium:','Concentration:','Flow:','Pressure:','Temperature:'].join('\n');
}

export function identifyTeskMedium(text:any){
  const s=norm(text);
  const sorted=[...TESK_CHEMICAL_RULES].sort((a,b)=>Math.max(...b.aliases.map(x=>x.length))-Math.max(...a.aliases.map(x=>x.length)));
  for(const rule of sorted){for(const alias of rule.aliases){const a=norm(alias);if(a&&s.includes(a))return {key:rule.key,name:rule.name}}}
  return {key:'',name:''};
}

function parseFlowLph(text:string){
  const s=norm(text);let m=s.match(/(\d+(?:\.\d+)?)\s*(?:l\s*\/\s*(?:h|hr|hour)|lph|lit(?:re|er)s?\s*\/\s*(?:h|hr|hour))/i);if(m)return num(m[1]);
  m=s.match(/(\d+(?:\.\d+)?)\s*(?:ml\s*\/\s*(?:min|minute)|mlpm)/i);if(m){const n=num(m[1]);return n==null?null:n*.06}
  return null;
}
function parsePressureBar(text:string){
  const s=norm(text);const patterns=[
    [/(?:@|pressure\s*[:=]?)\s*(\d+(?:\.\d+)?)\s*bar\b/i,1],
    [/(?:@|pressure\s*[:=]?)\s*(\d+(?:\.\d+)?)\s*mpa\b/i,10],
    [/(?:@|pressure\s*[:=]?)\s*(\d+(?:\.\d+)?)\s*kpa\b/i,.01],
    [/(?:@|pressure\s*[:=]?)\s*(\d+(?:\.\d+)?)\s*psi\b/i,.0689476]
  ] as const;
  for(const [re,factor] of patterns){const m=s.match(re);if(m){const n=num(m[1]);return n==null?null:n*factor}}
  const fallback=s.match(/\b(\d+(?:\.\d+)?)\s*bar\b/i);return fallback?num(fallback[1]):null;
}
function parseTemperatureC(text:string){
  const s=norm(text);
  const m=s.match(/(?:temp(?:erature)?\s*[:=]?\s*)?(-?\d+(?:\.\d+)?)\s*(?:°\s*)?(?:(?:deg|degree|degrees)\s*)?c\b/i);
  return m?num(m[1]):null;
}
function parseConcentration(text:string){const m=norm(text).match(/\b(\d+(?:\.\d+)?)\s*%/);return m?num(m[1]):null}

export function parseTeskMeteringRequest(text:any):TeskMeteringRequest{
  const raw=String(text||''),s=norm(raw);let medium=identifyTeskMedium(raw);
  if(!medium.key){const mm=raw.match(/(?:^|\n)\s*(?:medium|chemical)\s*:\s*([^\r\n]+)/i);const mv=String(mm?.[1]||'').trim();if(mv)medium={key:'unlisted',name:mv}}
  const flowLph=parseFlowLph(raw),pressureBar=parsePressureBar(raw),temp=parseTemperatureC(raw),conc=parseConcentration(raw);
  const explicitDose=/\b(?:dosing|dose|metering|injection|inject)\b/i.test(s);
  const explicitChemicalPump=/\btesk\s+chemical\s+pump\b|\bchemical\s+(?:dosing|metering)\s+pump\b/i.test(s);
  const explicitTransfer=/\b(?:transfer|circulation|circulating|process\s+pump)\b/i.test(s);
  const m3=/\b\d+(?:\.\d+)?\s*(?:m3|m³)\s*\/\s*(?:h|hr|hour)\b/i.test(raw);
  const headM=/(?:@|head\s*[:=]?)\s*\d+(?:\.\d+)?\s*(?:m|mtr|metres?|meters?)\b/i.test(raw);
  let service_type:TeskServiceType='none';
  if(explicitTransfer||(medium.key&&m3&&headM))service_type='chemical_transfer';
  else if(explicitChemicalPump)service_type='chemical_dosing';
  else if(explicitDose||((flowLph!=null&&pressureBar!=null)&&(medium.key||/\b(?:chemical|acid|alkali|bleach|caustic)\b/i.test(s))))service_type=medium.key==='water'?'dosing':medium.key?'chemical_dosing':'dosing';
  else if(flowLph!=null&&pressureBar!=null)service_type=medium.key&&medium.key!=='water'?'chemical_dosing':'dosing';
  else if(medium.key&&flowLph!=null)service_type=medium.key==='water'?'dosing':'chemical_dosing';
  else if(medium.key)service_type='ambiguous';
  return {raw_text:raw,service_type,medium:medium.name||undefined,medium_key:medium.key||undefined,concentration_pct:conc,temperature_c:temp,flow_lph:flowLph,pressure_bar:pressureBar};
}

export function mergeTeskMeteringRequest(a:any,b:any):TeskMeteringRequest{
  const out:any={...(a&&typeof a==='object'?a:{}),...(b&&typeof b==='object'?b:{})};
  for(const k of ['medium','medium_key','service_type','concentration_pct','temperature_c','flow_lph','pressure_bar'])if(b?.[k]==null||b?.[k]==='')out[k]=a?.[k]??b?.[k];
  out.raw_text=[a?.raw_text,b?.raw_text].filter(Boolean).join(' | ');return out;
}

export function teskMeteringLooksRelevant(req:any){return !!req&&String(req.service_type||'none')!=='none'}
export function teskMeteringIsChemical(req:any){return !!req?.medium_key&&req.medium_key!=='water'}

function concentrationCovered(rule:ChemicalRule,requested:any){
  const n=Number(requested);if(!rule.concentrations?.length)return true;if(!Number.isFinite(n))return false;
  return rule.concentrations.some(x=>Math.abs(x-n)<0.26);
}
function uniqueNumbers(values:any[]){return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b)}
function ruleHeadMax(rule:ChemicalRule){return Number(rule.headMaxTempC??rule.maxTempC)||null}

export function teskMaterialRecommendation(req:any){
  const key=String(req?.medium_key||'');if(!key)return {status:'missing_medium',reason:'Medium / chemical was not provided. Hydraulic pump selection can still be shown, but wetted-parts material cannot be confirmed.'};
  if(key==='water'){
    const rule=TESK_CHEMICAL_RULES.find(r=>r.key==='water')!;
    return {status:'confirmed',medium:rule.name,pump_head:rule.head,diaphragm:rule.diaphragm,seal:rule.seal,avoid:rule.avoid||[],note:rule.note};
  }
  const candidates=TESK_CHEMICAL_RULES.filter(r=>r.key===key);
  if(!candidates.length)return {status:'not_confirmed',medium:req?.medium||key,reason:'This chemical is not digitized in the TESK compatibility rules yet. Engineering review is required.'};
  const concentrations=uniqueNumbers(candidates.flatMap(r=>r.concentrations||[]));
  const requestedConc=req?.concentration_pct==null?NaN:Number(req.concentration_pct);
  if(!Number.isFinite(requestedConc)){
    const commonHead=candidates.every(r=>r.head===candidates[0].head)?candidates[0].head:null;
    const maxHead=Math.max(...candidates.map(r=>ruleHeadMax(r)||0));
    return {status:'partial',medium:req?.medium||candidates[0].name,pump_head:commonHead||undefined,diaphragm:commonHead?candidates[0].diaphragm:undefined,seal:'Final seal confirmation required',available_concentrations:concentrations,catalogue_max_temp_c:maxHead||undefined,reason:`Concentration was not provided.${concentrations.length?` TESK catalogue reference concentrations: ${concentrations.join('% / ')}%.`:''}${maxHead?` The proposed ${commonHead||'liquid-end'} material has catalogue chemical-resistance data listed through ${fmt(maxHead)}°C for the represented condition.`:''} Confirm concentration before final wetted-parts selection.`};
  }
  const rule=candidates.find(r=>concentrationCovered(r,requestedConc));
  if(!rule)return {status:'not_confirmed',medium:req?.medium||candidates[0].name,available_concentrations:concentrations,reason:`The requested ${fmt(requestedConc)}% concentration is not covered by the digitized TESK rule.${concentrations.length?` Catalogue reference concentrations: ${concentrations.join('% / ')}%.`:''} Engineering review is required.`};
  const headMax=ruleHeadMax(rule),fullMax=Number(rule.maxTempC)||null,temp=req?.temperature_c==null?NaN:Number(req.temperature_c);
  if(!Number.isFinite(temp))return {status:'partial',medium:rule.name,pump_head:rule.head,diaphragm:rule.diaphragm,seal:rule.seal,avoid:rule.avoid||[],catalogue_max_temp_c:headMax||undefined,combination_max_temp_c:fullMax||undefined,temperature_columns_c:rule.temperatureColumnsC||[],note:rule.note,reason:`Temperature was not provided. ${headMax?`Preliminary reference: the selected ${rule.head}/fluoroplastic liquid-end material is listed in the TESK chemical-resistance table through ${fmt(headMax)}°C for this chemical condition.`:''} Provide the actual liquid temperature to confirm the complete wetted-parts combination and seal / O-ring.`};
  if(headMax&&temp>headMax)return {status:'not_confirmed',medium:rule.name,pump_head:rule.head,diaphragm:rule.diaphragm,seal:'Final seal confirmation required',catalogue_max_temp_c:headMax,available_concentrations:concentrations,reason:`Requested liquid temperature ${fmt(temp)}°C exceeds the ${fmt(headMax)}°C highest digitized catalogue temperature for the proposed ${rule.head}/fluoroplastic condition. Engineering review is required.`};
  if(fullMax&&temp<=fullMax)return {status:'confirmed',medium:rule.name,pump_head:rule.head,diaphragm:rule.diaphragm,seal:rule.seal,avoid:rule.avoid||[],catalogue_max_temp_c:headMax||fullMax,combination_max_temp_c:fullMax,note:rule.note};
  return {status:'partial',medium:rule.name,pump_head:rule.head,diaphragm:rule.diaphragm,seal:'Final seal confirmation required',avoid:rule.avoid||[],catalogue_max_temp_c:headMax||undefined,combination_max_temp_c:fullMax||undefined,temperature_columns_c:rule.temperatureColumnsC||[],note:rule.note,reason:`${rule.head}/fluoroplastic pump-head compatibility is supported at the requested ${fmt(temp)}°C within the catalogue table, but the conservative complete head + seal combination is only confirmed through ${fullMax?`${fmt(fullMax)}°C`:'the lower listed condition'}. Confirm the final seal / O-ring before supply.`};
}

export function selectTeskMeteringPump(req:any,material:any){
  const q=Number(req?.flow_lph),p=Number(req?.pressure_bar);if(!(q>0)||!(p>0))return {status:'missing_duty'};
  const materialName=String(material?.pump_head||'').toUpperCase();
  const cks=TESK_CKS_POINTS.filter(x=>x.maxFlowLph>=q&&x.maxPressureBar>=p).sort((a,b)=>a.maxFlowLph-b.maxFlowLph||a.maxPressureBar-b.maxPressureBar)[0];
  if(cks&&(!materialName||['PVDF','316SS'].includes(materialName)))return {status:'exact',series:'CKS',model:`CKS ${cks.code}`,variants:[`CKSS${cks.code}`,`CKSP${cks.code}`,`CKSZ${cks.code}`],max_flow_lph:cks.maxFlowLph,max_pressure_bar:cks.maxPressureBar,note:'Exact CKS hydraulic point. Choose S/P/Z control version to suit the control signal.'};
  const gs=TESK_GS_POINTS.filter(x=>x.maxFlowLph>=q&&x.maxPressureBar>=p).sort((a,b)=>a.maxFlowLph-b.maxFlowLph||a.maxPressureBar-b.maxPressureBar)[0];
  if(gs&&(!materialName||['PVC','PVDF','316SS'].includes(materialName)))return {status:'exact',series:'GS',model:gs.model,liquid_end_material:materialName||undefined,max_flow_lph:gs.maxFlowLph,max_pressure_bar:gs.maxPressureBar,note:'Exact GS hydraulic model from the TESK flow/pressure table. Final full model code still depends on liquid-end, connector, motor and option codes.'};
  const families=TESK_SERIES_ENVELOPES.filter(x=>x.maxFlowLph>=q&&x.maxPressureBar>=p&&(!materialName||x.materials.includes(materialName))&&(!(x.plasticMaxBar&&['PVC','PVDF'].includes(materialName))||p<=x.plasticMaxBar)).sort((a,b)=>a.maxFlowLph-b.maxFlowLph||a.maxPressureBar-b.maxPressureBar);
  const best=families[0];if(!best)return {status:'not_confirmed',reason:'No catalogue-confirmed series/material envelope in V4.28.07 covers this duty. Engineering review is required.'};
  return {status:'series',series:best.series,max_flow_lph:best.maxFlowLph,max_pressure_bar:best.maxPressureBar,note:`${best.note} Exact model must be confirmed against the TESK flow/pressure table.`};
}

const fmt=(n:any)=>{const v=Number(n);return Number.isFinite(v)?(Math.round(v*10)/10).toString():'-'};
export function formatTeskMeteringRecommendation(customerName:string,req:any,material:any,pump:any,chemicalSelection=true){
  const chemical=String(req?.medium_key||'')&&String(req?.medium_key)!=='water';
  const lines=[...(customerName?[`Customer: ${customerName}`,'']:[]),'TESK Chemical Pump',`Service: ${chemical?'Chemical Dosing / Metering':'Dosing / Metering'}`,`Medium: ${req?.medium||'Not specified'}`];
  if(req?.concentration_pct!=null)lines.push(`Concentration: ${fmt(req.concentration_pct)}%`);else if(chemical)lines.push('Concentration: Not provided');
  if(req?.temperature_c!=null)lines.push(`Temperature: ${fmt(req.temperature_c)}°C`);else if(chemical)lines.push('Temperature: Not provided');
  lines.push(`Duty: ${fmt(req?.flow_lph)} L/hr @ ${fmt(req?.pressure_bar)} bar`,'');
  lines.push('Pump');
  if(pump?.status==='exact'){
    lines.push(`Recommended: ${pump.model}`,`Catalogue capability: ${fmt(pump.max_flow_lph)} L/hr @ ${fmt(pump.max_pressure_bar)} bar`);
    if(Array.isArray(pump.variants)&&pump.variants.length)lines.push(`Control variants: ${pump.variants.join(' / ')}`);
    if(pump?.liquid_end_material)lines.push(`Liquid-end material: ${pump.liquid_end_material}`);
    lines.push(`Note: ${pump.note}`);
  }else if(pump?.status==='series')lines.push(`Recommended series: ${pump.series}`,`Series envelope: up to ${fmt(pump.max_flow_lph)} L/hr @ ${fmt(pump.max_pressure_bar)} bar`,`Note: ${pump.note}`);
  else lines.push('Recommendation: Not confirmed',`Note: ${pump?.reason||'Flow and pressure are required for hydraulic selection.'}`);
  if(chemicalSelection){
    lines.push('','Material');
    if(material?.status==='confirmed'){
      lines.push(`Pump head: ${material.pump_head}`,`Diaphragm: ${material.diaphragm}`,`Seal / O-ring: ${material.seal}`,`Compatibility: Confirmed within digitized TESK catalogue rule`);
      if(material?.catalogue_max_temp_c)lines.push(`Catalogue material table: listed through ${fmt(material.catalogue_max_temp_c)}°C for this condition`);
      if(material?.avoid?.length)lines.push(`Avoid: ${material.avoid.join(', ')}`);
      if(material?.note)lines.push(`Note: ${material.note}`);
    }else if(material?.status==='partial'){
      if(material?.pump_head)lines.push(`Preliminary pump head: ${material.pump_head}`);
      if(material?.diaphragm)lines.push(`Diaphragm: ${material.diaphragm}`);
      lines.push(`Seal / O-ring: ${material?.seal||'Final confirmation required'}`,'Compatibility: Preliminary / incomplete information');
      if(material?.available_concentrations?.length)lines.push(`Catalogue concentrations: ${material.available_concentrations.join('% / ')}%`);
      if(material?.catalogue_max_temp_c)lines.push(`Catalogue ${material.pump_head||'material'} table: listed through ${fmt(material.catalogue_max_temp_c)}°C for the referenced condition`);
      if(material?.avoid?.length)lines.push(`Avoid: ${material.avoid.join(', ')}`);
      lines.push(`Note: ${material?.reason||material?.note||'Provide the missing chemical condition to complete material confirmation.'}`);
    }else{
      lines.push('Compatibility: Not confirmed');
      if(material?.pump_head)lines.push(`Possible pump head: ${material.pump_head}`);
      if(material?.available_concentrations?.length)lines.push(`Catalogue concentrations: ${material.available_concentrations.join('% / ')}%`);
      if(material?.catalogue_max_temp_c)lines.push(`Highest digitized material-table temperature: ${fmt(material.catalogue_max_temp_c)}°C`);
      lines.push(`Note: ${material?.reason||'Engineering review is required before final material selection.'}`);
    }
  }
  lines.push('','Technical selection only. Confirm actual chemical concentration, liquid temperature and final wetted-parts compatibility before supply.');
  return lines.join('\n');
}
