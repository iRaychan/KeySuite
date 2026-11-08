(() => {
 'use strict';
 const groups=['1_5','8_20','32_90','120_200'];
 // V1.3 Dimension sheets: model column B, shaft column O. Q:R is a separate torque reference.
 const shaftModels={
  ES: {
   24:'32-13 32-16 32-20 32-26 40-13 40-16 40-20 40-26 50-13 50-16 50-20 50-26 65-13 65-16 65-20 80-16',
   32:'40-32 40-32H 50-26G 50-32 50-32H 65-20G 65-26 65-32 65-32H 80-20 80-26 80-32 80-32H 100-16 100-20 100-26 100-26H 100-32 125-20 125-26 150-20',
   42:'40-32G 50-32G 65-32G 80-32G 80-40 100-26G 100-32G 100-40 125-32 125-40 150-26 150-32 150-40 200-26',
   48:'200-32 200-40 250-32 250-40',
  },
  ISO: {
   24:'50-32-160 50-32-200 65-40-200 65-50-160 80-50-200 80-65-160',
   32:'65-40-250 65-40-315 80-50-250 80-50-315 100-65-200 100-65-250 100-80-160 125-100-200',
   37:'100-65-315S',
   42:'100-65-315 125-80-400 125-100-250 125-100-315 125-100-400 150-125-250 150-125-315 150-125-400',
   48:'125-100-500 150-125-500 200-150-315 200-150-400 200-150-500 250-200-200 250-200-315 250-200-400 300-250-315',
   65:'250-200-250 250-200-500 300-250-250 300-250-400 300-250-500',
   75:'350-300-400 350-300-500',
  },
 };
 const pumpMaterials={seal:['Car/Cer','SiC/SiC','Tungsten'],oring:['Viton','EPDM','NBR']};
 const shaftByModel=Object.fromEntries(Object.entries(shaftModels).map(([family,sizes])=>[
   family,new Map(Object.entries(sizes).flatMap(([size,models])=>models.split(' ').map(model=>[model,size])))
 ]));
 function shaftSize(family,model){return shaftByModel[family]?.get(String(model||'').trim().toUpperCase().replace(/^(?:ES|ISO)\s+/,''));}
 let rows=[],available=false,loadError=false;
 const key=r=>[r.family,r.kind,r.size_group,r.material].join('|');
 const defaults=[];
 for(const family of ['ES','ISO'])for(const size_group of Object.keys(shaftModels[family]))for(const [kind,materials] of Object.entries(pumpMaterials))for(const material of materials)defaults.push({family,kind,size_group,material,price_myr:null});
 for(const family of ['CHC','CR'])for(const size_group of [...groups,...(family==='CR'?['320']:[])])for(const material of ['Viton','EPDM'])defaults.push({family,kind:'oring',size_group,material,price_myr:null});
 function group(model){const series=Number(String(model||'').match(/(?:CHC[SN]?|CR[SN]?)\s*(\d+)\s*-/i)?.[1]);return series===320?'320':[[1,5],[8,20],[32,90],[120,200]].find(([a,b])=>series>=a&&series<=b)?.join('_')||null;}
 function price(family,kind,size_group,material){
   const raw=rows.find(r=>key(r)===key({family,kind,size_group:String(size_group),material}))?.price_myr;
   if(raw==null||String(raw).trim()==='')return null;
   const value=Number(raw);
   return Number.isFinite(value)&&value>=0?value:null;
 }
 function pumpOptions(options={}){
   return {
     sealType:options.sealType||options.keysuite_seal_type||'',
     seal:options.seal||options.keysuite_seal||options.keysuite_seal_material||'Car/Cer',
     elastomer:options.elastomer||options.keysuite_elastomer||'Viton',
   };
 }
 function additions(family,model,options={}){
   const pumpFamily=Object.hasOwn(shaftModels,family);
   const requests=[],rawElastomer=String(options.elastomer||options.keysuite_elastomer||'Viton').trim().toUpperCase();
   const elastomer=(pumpFamily?pumpMaterials.oring:['Viton','EPDM']).find(value=>value.toUpperCase()===rawElastomer);
   if(!elastomer)return {error:`No ${family} O-ring price table for ${rawElastomer}. Enter a manual selling price.`};
   if(pumpFamily){
     const size=shaftSize(family,model);
     const text=String(options.seal||options.keysuite_seal||'Car/Cer').toLowerCase();
     const seal=/tungsten/.test(text)?'Tungsten':/sic.*sic|silicon/.test(text)?'SiC/SiC':/car|ca\s*ce/.test(text)?'Car/Cer':null;
     if(!size)return {error:`No V1.3 shaft size for ${family} model ${model}. Enter a manual selling price.`};
     const packing=/\bGP\b|gland packing/i.test([options.material,options.sealType,options.keysuite_seal_type].join(' '));
     if(!packing){if(!seal)return {error:`No ${family} price table for selected seal.`};requests.push(['seal',size,seal,seal==='Car/Cer']);}
     requests.push(['oring',size,elastomer,elastomer==='Viton']);
   }else{const size=group(model);if(!size)return {error:`No ${family} O-ring group for ${model}.`};requests.push(['oring',size,elastomer]);}
   let total=0;const missing=[],details=[];
   for(const [kind,size,material,included] of requests){
     const value=included?0:price(family,kind,size,material);
     details.push({pricelist:'Component Pricelist',family,kind,size,material,currency:'MYR',sourcePrice:value,multiplier:1,baseMyr:value,adjustment:value,...(included?{includedInBase:true}:{})});
     if(value===null)missing.push(`${family} ${size.replace('_','–')} ${material} ${kind==='oring'?'O-ring':'seal'}`);
     else total+=value;
   }
   return missing.length?{error:!available&&loadError
     ?`Component price lookup failed for ${family}. Reload KeySuite before quoting.`
     :`Component price not entered: ${missing.join(', ')}.`,total:null,details}:{total,details};
 }
 function apply(calc,family,model,options={}){
   const pump=Object.hasOwn(shaftModels,family);
   if(!calc||(calc.fixedPrice&&!pump))return calc;
   const result=additions(family,model,options);
   const base=Number(calc.componentBasePrice??calc.finalPrice??0);
   const beforeFuel=Number(calc.componentBaseBeforeFuel??calc.beforeFuel??base);
   const addon=result.error?0:result.total;
   const unrounded=Number(calc.componentBaseUnroundedPrice??calc.unroundedPrice??base);
   return {...calc,componentBasePrice:base,componentAddon:result.total,componentDetails:result.details||[],
     componentPricingError:result.error||'',finalPrice:base+addon,
     ...(pump?{componentBaseBeforeFuel:beforeFuel,beforeFuel:beforeFuel+addon,
       componentBaseUnroundedPrice:unrounded,unroundedPrice:unrounded+addon}:{})};
 }
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const savedKeys=new Set();
 function render(){
   for(const family of ['CHC','CR','ES','ISO']){
     const parent=document.getElementById(`${family.toLowerCase()}PriceList`);
     if(!parent)continue;
     let box=parent.querySelector('.component-price-editor');
     if(!box){box=document.createElement('div');box.className='card component-price-editor';parent.appendChild(box);}
     const pump=Object.hasOwn(shaftModels,family);
     const owner=String(window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
     const sizes=pump?Object.keys(shaftModels[family]):family==='CR'?[...groups,'320']:groups;
     const table=(kind,title,materials)=>{
       const groupsHtml=sizes.map(size=>{
         const records=materials.map(material=>rows.find(row=>key(row)===key({family,kind,size_group:size,material})));
         const editable=owner&&available&&records.every(record=>record&&(!pump||savedKeys.has(key(record))));
         const inputs=records.map((record,i)=>`<td><input data-component-price="${esc(record?key(record):'')}" type="number" min="0" step="0.01" placeholder="Not entered" value="${record?.price_myr??''}" aria-label="${esc(family+' '+size+' '+materials[i]+' MYR')}" ${editable?'':'disabled'}></td>`).join('');
         return `<tr data-component-group="${family}|${kind}|${size}"><td><b>${esc(size.replace('_','–'))}</b></td>${inputs}<td><button class="btn" type="button" data-save-component-group ${editable?'':'disabled'}>Save</button></td></tr>`;
       }).join('');
       return `<h3>${title}</h3><div style="overflow:auto"><table class="pricelist-table compact-component-table"><thead><tr><th>Size / Group</th>${materials.map(m=>`<th>${esc(m)} (MYR)</th>`).join('')}<th></th></tr></thead><tbody>${groupsHtml}</tbody></table></div>`;
     };
     const setupPending=!available||(pump&&defaults.some(row=>row.family===family&&!savedKeys.has(key(row))));
     box.innerHTML=`<h2>${family} component surcharges · MYR</h2><p>Blank means not entered. Enter 0 explicitly only when included at no extra charge.</p>${pump?'<p>Standard Car/Cer and Viton are included in the base pump price.</p>':''}${setupPending?'<p>Database setup pending. Unavailable price groups are read-only.</p>':''}${pump?table('seal','Mechanical Seal Add-ons',pumpMaterials.seal):''}${table('oring','O-ring Surcharges',pump?pumpMaterials.oring:['Viton','EPDM'])}`;
     box.querySelectorAll('[data-save-component-group]').forEach(button=>{button.onclick=()=>saveGroup(button);});
   }
 }
 async function saveGroup(button){
   if(button.disabled)return;
   const inputs=[...button.closest('[data-component-group]').querySelectorAll('[data-component-price]')];
   const records=inputs.map(input=>rows.find(row=>key(row)===input.dataset.componentPrice));
   if(records.some(record=>!record))return alert('A source component row is missing. No values were saved.');
   for(const input of inputs){if(!input.checkValidity()){input.reportValidity();return;}}
   const payload=records.map((record,i)=>({...record,price_myr:inputs[i].value.trim()===''?null:Number(inputs[i].value)}));
   button.disabled=true;
   const original=button.textContent;
   button.textContent='Saving…';
   try{
     const client=window.KeySuiteAuth?.getClient?.();
     if(!client)throw Error('Supabase is not connected.');
     const {data,error}=await client.from('ks_component_prices_v50011').upsert(payload,{onConflict:'family,kind,size_group,material'}).select();
     if(error)throw error;
     if(data?.length!==records.length)throw Error('Price group could not be confirmed.');
     for(const row of data)Object.assign(records.find(record=>key(record)===key(row)),row);
     window.KeySuitePricing?.refreshQuotePrices?.();
     button.textContent='Saved';
   }catch(error){alert(`Component price could not be saved: ${error.message}`);button.textContent=original;}
   finally{button.disabled=false;}
 }
 async function init(){
   rows=defaults.map(row=>({...row}));
   savedKeys.clear();
   available=false;
   loadError=false;
   try{
     const result=await window.KeySuiteAuth.getClient().from('ks_component_prices_v50011').select('family,kind,size_group,material,price_myr');
     if(result.error)throw result.error;
     available=true;
     for(const row of result.data||[]){
       const target=rows.find(record=>key(record)===key(row));
       if(target){Object.assign(target,row);savedKeys.add(key(row));}
     }
   }catch(error){loadError=true;console.info('Component pricing setup pending:',error.message);}
   render();
 }
 window.KeySuiteComponents={init,render,apply,additions,group,shaftSize,pumpOptions,defaults,loadForTest(data){rows=data;loadError=false;}};
})();
