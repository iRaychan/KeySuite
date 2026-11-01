/* KeySuite V5.00.27 — BSW adapter on the standard selector architecture. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);document.title='KeySelector BSW Series';
 const title=document.querySelector('header h1'),meta=document.querySelector('header p');if(title)title.textContent='BSW Series';if(meta)meta.textContent='Database Version: 261101-V1.1 · KeySelector BSW · KeySuite V5.00.27';
 $('enhancedToggleLabel')?.remove();document.querySelectorAll('aside.inputs *').forEach(n=>{if(n.childNodes.length===1&&n.firstChild?.nodeType===3)n.textContent=n.textContent.replace(/KV/g,'BSW')});
 keysuiteKvPresentationAlias=v=>String(v??'').replace(/^KV\b/i,'BSW');keysuiteKvMaterialDisplay=()=>({casing:'Cast Iron',impeller:'Cast Iron',shaft:'45C'});keysuiteKvSealDisplay=()=> 'Mechanical Seal';
 const baseRender=renderSelected;renderSelected=function(){baseRender();const eyebrow=out.querySelector('.selection-eyebrow');if(eyebrow)eyebrow.textContent='Selected BSW Pump';const cards=[...out.querySelectorAll('.chart-card')];cards.forEach(c=>{if(/NPSH/i.test(c.textContent||''))c.remove()});const stack=out.querySelector('.chart-stack');if(stack)stack.style.gridTemplateRows='repeat(2,1fr)'};
 const baseCurrent=currentSelection;currentSelection=function(){const p=baseCurrent();return p?{...p,source:'KeySuite-BSW-V5.00.27',family:'BSW',product:'BSW',generation_code:'BSW',keysuite_generation_code:'BSW',keysuite_product_group_code:'BSW',keysuite_price_group_code:'BSW',keysuite_material:'CI / 45C / Mechanical Seal',keysuite_seal:'Mechanical Seal',has_npsh:false}:p};window.__KEYSUITE_CURRENT_SELECTION=currentSelection;
 parent.postMessage({type:'KEYSUITE_PRODUCT_FRAME_READY',family:'BSW'},'*');
})();
