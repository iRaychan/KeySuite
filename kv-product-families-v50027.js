/* V5.00.27 — expose every actual KV V1.2 family through KV 600 without inventing models. */
(()=>{'use strict';
 const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
 const renameModels=()=>{const prefix=String(document.getElementById('kvProductMaterial')?.value||'KV').toUpperCase();document.querySelectorAll('#kvProductModelGrid h3').forEach(h=>{const next=String(h.textContent||'').replace(/^(?:KVC|KVN|KVD|KVSD|KV)\b/i,prefix);if(h.textContent!==next)h.textContent=next})};
 function sync(){
  const host=document.getElementById('kvProductSeriesList'),db=window.KeySuiteKVData;if(!host||!db?.available_families)return;
  const existing=new Set([...host.querySelectorAll('[data-kv-series],[data-kv-unavailable-series]')].map(b=>b.dataset.kvSeries||b.dataset.kvUnavailableSeries));
  db.available_families.slice().sort(natural).forEach(name=>{if(existing.has(name))return;const button=document.createElement('button');button.type='button';button.dataset.kvUnavailableSeries=name;button.textContent=name;button.onclick=()=>{host.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));const title=document.getElementById('kvProductSeriesTitle'),count=document.getElementById('kvProductModelCount'),grid=document.getElementById('kvProductModelGrid');if(title)title.textContent=`${name} Models`;if(count)count.textContent='0 complete models · family retained from KV V1.2 engineering data';if(grid)grid.innerHTML='<div class="product-empty">This family is present in the engineering master, but no complete product model row is supplied. No model has been invented.</div>'};host.appendChild(button)});
  renameModels();
 }
 const observer=new MutationObserver(sync);document.addEventListener('DOMContentLoaded',()=>{const h=document.getElementById('kvProductSeriesList'),g=document.getElementById('kvProductModelGrid');if(h)observer.observe(h,{childList:true});if(g)new MutationObserver(renameModels).observe(g,{childList:true,subtree:true});document.getElementById('kvProductMaterial')?.addEventListener('change',()=>setTimeout(renameModels,0));sync()},{once:true});window.addEventListener('KEYSUITE_PAGE_CHANGED',sync);
})();
