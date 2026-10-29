(() => {
 'use strict';
 const sizes=[24,32,45,55],groups=['1_5','8_20','32_90','120_200'],couplingToSeal={24:24,32:32,42:45,48:55};
 let rows=[],available=false;
 const key=r=>[r.family,r.kind,r.size_group,r.material].join('|');
 const defaults=[];
 for(const family of ['ES','ISO'])for(const size of sizes)for(const [kind,materials] of [['seal',['Car/Cer','SiC/SiC']],['oring',['Viton','EPDM']]])for(const material of materials)defaults.push({family,kind,size_group:String(size),material,price_myr:null});
 for(const family of ['CHC','CR'])for(const size_group of [...groups,...(family==='CR'?['320']:[])])for(const material of ['Viton','EPDM'])defaults.push({family,kind:'oring',size_group,material,price_myr:null});
 function group(model){const series=Number(String(model||'').match(/(?:CHC[SN]?|CR[SN]?)\s*(\d+)\s*-/i)?.[1]);return series===320?'320':[[1,5],[8,20],[32,90],[120,200]].find(([a,b])=>series>=a&&series<=b)?.join('_')||null;}
 function price(family,kind,size_group,material){const row=rows.find(r=>key(r)===key({family,kind,size_group:String(size_group),material}));return row?.price_myr===null||row?.price_myr===undefined?null:Number(row.price_myr);}
 function additions(family,model,options={}){
   const requests=[],rawElastomer=String(options.elastomer||options.keysuite_elastomer||'Viton').trim().toUpperCase(),elastomer=rawElastomer==='EPDM'?'EPDM':rawElastomer==='VITON'?'Viton':null;
   if(!elastomer)return {error:`No ${family} O-ring price table for ${rawElastomer}. Enter a manual selling price.`};
   if(['ES','ISO'].includes(family)){
     const size=options.sealSize||couplingToSeal[options.shaft_mm];
     const text=String(options.seal||options.keysuite_seal||'Car/Cer').toLowerCase();
     const seal=/sic.*sic|silicon/.test(text)?'SiC/SiC':/car|ca\s*ce/.test(text)?'Car/Cer':null;
     if(!size)return {error:`${family} seal size is unavailable for shaft ${options.shaft_mm||'not supplied'}. Enter a manual selling price.`};
     if(!/\bGP\b/i.test(options.material||'')){if(!seal)return {error:`No ${family} price table for selected seal.`};requests.push(['seal',String(size),seal]);}
     requests.push(['oring',String(size),elastomer]);
   }else{const size=group(model);if(!size)return {error:`No ${family} O-ring group for ${model}.`};requests.push(['oring',size,elastomer]);}
   let total=0;const missing=[];
   for(const [kind,size,material] of requests){const value=price(family,kind,size,material);if(value===null)missing.push(`${family} ${size.replace('_','–')} ${material} ${kind==='oring'?'O-ring':'seal'}`);else total+=value;}
   return missing.length?{error:`Component price not entered: ${missing.join(', ')}.`,total:null}:{total};
 }
 function apply(calc,family,model,options={}){if(!calc||calc.fixedPrice)return calc;const result=additions(family,model,options),base=Number(calc.componentBasePrice??calc.finalPrice??0);return {...calc,componentBasePrice:base,componentAddon:result.total,componentPricingError:result.error||'',finalPrice:result.error?base:base+result.total};}
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){for(const family of ['CHC','CR','ES','ISO']){const parent=document.getElementById(`${family.toLowerCase()}PriceList`);if(!parent)continue;let box=parent.querySelector('.component-price-editor');if(!box){box=document.createElement('div');box.className='card component-price-editor';parent.appendChild(box);}
   const owner=String(window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
   box.innerHTML=`<h2>${family} component surcharges · MYR</h2><p>Blank means not entered. Enter 0 explicitly only when included at no extra charge.</p>${available?'':'<p>Database setup pending; values cannot be saved yet.</p>'}<div style="overflow:auto"><table><thead><tr><th>Size / group</th><th>Component</th><th>Material</th><th>MYR</th><th></th></tr></thead><tbody>${rows.filter(r=>r.family===family).map(r=>`<tr data-component="${esc(key(r))}"><td>${esc(r.size_group.replace('_','–'))}</td><td>${r.kind==='seal'?'Mechanical seal':'O-ring'}</td><td>${esc(r.material)}</td><td><input aria-label="${esc(key(r))} MYR" type="number" min="0" step="0.01" placeholder="Not entered" value="${r.price_myr??''}" ${owner&&available?'':'disabled'}></td><td><button type="button" class="btn" ${owner&&available?'':'disabled'}>Save</button></td></tr>`).join('')}</tbody></table></div>`;
   box.querySelectorAll('[data-component]').forEach(tr=>tr.querySelector('button').onclick=async()=>{const row=rows.find(r=>key(r)===tr.dataset.component),input=tr.querySelector('input'),price_myr=input.value.trim()===''?null:Number(input.value);if(price_myr!==null&&(!Number.isFinite(price_myr)||price_myr<0)){input.reportValidity();return;}const button=tr.querySelector('button');button.disabled=true;try{const {data,error}=await window.KeySuiteAuth.getClient().from('ks_component_prices_v50011').upsert({...row,price_myr},{onConflict:'family,kind,size_group,material'}).select();if(error)throw error;if(data?.length!==1)throw Error('Price was not saved.');Object.assign(row,data[0]);window.KeySuitePricing?.refreshQuotePrices?.();button.textContent='Saved';}catch(e){alert(`Component price could not be saved: ${e.message}`);}finally{button.disabled=false;}});
 }}
 async function init(){rows=defaults.map(r=>({...r}));available=false;try{const result=await window.KeySuiteAuth.getClient().from('ks_component_prices_v50011').select('family,kind,size_group,material,price_myr');if(result.error)throw result.error;available=true;for(const row of result.data||[]){const target=rows.find(r=>key(r)===key(row));if(target)Object.assign(target,row);}}catch(e){console.info('Component pricing setup pending:',e.message);}render();}
 window.KeySuiteComponents={init,render,apply,additions,group,couplingToSeal,defaults,loadForTest(data){rows=data;}};
})();
