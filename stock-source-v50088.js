(() => {
 'use strict';
 const snapshots=new WeakMap();
 let request=0;
 async function refresh(){
   const data=window.KEYSUITE_SECURE_DATA,client=window.KeySuiteAuth?.getClient?.();
   const generation=++request;
   if(!data||!client)return;
   if(!data.categories?.some(c=>Object.values(c.productRules||{}).some(r=>r.currencies?.includes('STOCK')))){
     snapshots.delete(data);
     return;
   }
   try {
     const result=await client.rpc('keysuite_quotation_costs_v50088');
     if(generation!==request||data!==window.KEYSUITE_SECURE_DATA)return;
     if(result.error||!Array.isArray(result.data)){snapshots.delete(data);return;}
     snapshots.set(data,{rows:result.data,at:Date.now()});
   }catch{if(generation===request)snapshots.delete(data);}
 }
 function lookup(family,variant,options){
   const snapshot=snapshots.get(window.KEYSUITE_SECURE_DATA);
   if(!snapshot||Date.now()-snapshot.at>30000)return null;
   const code=family==='CHC'?'CHC_G2':family;
   if(!(options.stockVariant||variant)&&!options.stockConfigurationId)return null;
   const matches=snapshot.rows.filter(r=>r.variant===(options.stockVariant||variant)&&
     (options.stockProductId?r.item_key===code+':'+options.stockProductId:
       r.item_key.startsWith(code+':')&&(options.stockModel?r.model===options.stockModel:!!options.stockConfigurationId))&&
     (!options.stockConfigurationId||options.stockConfigurationId===r.id));
   if(!matches.length||new Set(matches.map(row=>row.item_key)).size!==1)return null;
   const priced=matches.filter(row=>row.cost!=null);
   if(!priced.length)return null;
   return {...matches[0],cost:Math.max(...priced.map(row=>Number(row.cost))),available:matches.reduce((sum,row)=>sum+Number(row.available),0)};
 }
 function notice(message){
   let node=document.getElementById('stockCostNotice');
   if(!node&&message){node=document.createElement('div');node.id='stockCostNotice';node.setAttribute('role','status');
     node.style.cssText='width:max-content;max-width:100%;margin:0 0 12px;background:#fff5dd;color:#463600;padding:8px 14px;border:1px solid #d8b964;border-radius:6px';
   }
   if(node&&message){
     const host=document.querySelector('main .page.active')||document.body;
     if(node.parentElement!==host)host.prepend(node);
   }
   if(node){node.hidden=!message;node.textContent=message;}
   clearTimeout(notice.timeout);
   if(message)notice.timeout=setTimeout(()=>notice(''),4500);
 }
 async function verifyNewQuotation(items){
   const checks=[];
   function collect(source,qty){
     if(source?.stock_check)checks.push([source.stock_check,qty]);
     for(const child of source?.assembly_items||[])collect(child.pricingSource,qty*Number(child.qty||1));
   }
   for(const item of items)collect(item.pricingSource,item.qty);
   if(!checks.length)return true;
   await refresh();
   for(const [check,qty] of checks){
     const row=lookup(check.family,check.variant,check,check.brandId);
     if((row?.cost??null)!==check.observed){
       notice('Stock costing changed. Recalculate this quotation before saving.');
       return false;
     }
     if(row&&qty>row.available)notice('Insufficient stock. Available quantity: '+row.available);
   }
   return true;
 }
 window.KeySuiteStockCost={refresh,lookup,notice,verifyNewQuotation};
 window.addEventListener('keysuite-permissions-changed',()=>{
   if(window.KEYSUITE_SECURE_DATA)snapshots.delete(window.KEYSUITE_SECURE_DATA);
   refresh();
 });
 window.addEventListener('focus',refresh);
 window.addEventListener('KEYSUITE_PAGE_CHANGED',()=>{notice('');refresh()});
 window.setInterval(()=>{if(!document.hidden)refresh()},20000);
})();
