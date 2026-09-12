/* KeySuite V4.23.20 reversible PDF image optimization. Source assets are never modified. */
(()=>{
  'use strict';
  const STORAGE_KEY='keysuite_pdf_optimized_v42320';
  const cache=new Map();

  function isEnabled(){
    try{
      const query=new URLSearchParams(location.search).get('pdfOptimized');
      if(query==='0'||query==='false')return false;
      if(query==='1'||query==='true')return true;
      const raw=localStorage.getItem(STORAGE_KEY);
      return raw===null?false:raw==='1';
    }catch(_){return false}
  }
  function setEnabled(value){
    const enabled=!!value;
    try{localStorage.setItem(STORAGE_KEY,enabled?'1':'0')}catch(_){}
    syncCheckboxes();
    window.dispatchEvent(new CustomEvent('keysuite:pdf-optimization',{detail:{enabled}}));
    return enabled;
  }
  function syncCheckboxes(root=document){
    try{
      root.querySelectorAll?.('[data-keysuite-pdf-optimize]').forEach(input=>{
        if(input.type==='checkbox')input.checked=isEnabled();
        if(input.dataset.keysuitePdfOptimizeBound==='1')return;
        input.dataset.keysuitePdfOptimizeBound='1';
        input.addEventListener('change',()=>setEnabled(input.checked));
      });
    }catch(_){}
  }
  function waitImage(img){
    if(img.complete&&img.naturalWidth>0)return Promise.resolve();
    if(typeof img.decode==='function')return img.decode().catch(()=>undefined);
    return new Promise(resolve=>{const done=()=>resolve();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true})});
  }
  function profileFor(img,profile){
    const w=Number(img.naturalWidth)||0,h=Number(img.naturalHeight)||0,ratio=h>0?w/h:1;
    if(profile==='quotation'){
      if(ratio>2.7)return {maxW:650,maxH:180,scale:.78,quality:.80};
      return {maxW:600,maxH:320,scale:.84,quality:.82};
    }
    // Datasheets: the only raster content should be logos and outline/dimension drawings.
    if(ratio>2.7)return {maxW:650,maxH:180,scale:.75,quality:.80};
    return {maxW:650,maxH:950,scale:.76,quality:.82};
  }
  function cacheKey(src,w,h,quality){return `${src.length}:${src.slice(0,48)}:${w}x${h}:${quality}`}
  async function optimizedSource(img,profile='datasheet'){
    await waitImage(img);
    const nw=Number(img.naturalWidth)||0,nh=Number(img.naturalHeight)||0;
    if(nw<80||nh<40)return '';
    const src=String(img.currentSrc||img.src||'');
    if(!src||/^data:image\/svg/i.test(src))return '';
    const p=profileFor(img,profile);
    const ratio=Math.min(1,p.maxW/nw,p.maxH/nh,p.scale);
    const tw=Math.max(1,Math.round(nw*ratio)),th=Math.max(1,Math.round(nh*ratio));
    const key=cacheKey(src,tw,th,p.quality);
    if(cache.has(key))return cache.get(key);
    try{
      const doc=img.ownerDocument||document,canvas=doc.createElement('canvas');
      canvas.width=tw;canvas.height=th;
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx)return '';
      ctx.fillStyle='#fff';ctx.fillRect(0,0,tw,th);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,0,0,tw,th);
      const out=canvas.toDataURL('image/jpeg',p.quality);
      // Data URLs can be compared directly. Keep the original if optimization somehow grew it.
      if(/^data:image\//i.test(src)&&out.length>=src.length*.98){cache.set(key,'');return ''}
      cache.set(key,out);return out;
    }catch(_){cache.set(key,'');return ''}
  }
  async function optimizeDocument(root=document,options={}){
    if(!isEnabled())return ()=>{};
    const scope=root?.querySelectorAll?root:document;
    const images=[...(scope.querySelectorAll?.('img')||[])];
    const originals=[];
    await Promise.all(images.map(async img=>{
      try{
        const original=img.getAttribute('src')||'';
        const optimized=await optimizedSource(img,options.profile||'datasheet');
        if(!optimized||optimized===original)return;
        originals.push([img,original]);
        img.setAttribute('src',optimized);
        await waitImage(img);
      }catch(_){}
    }));
    return ()=>{
      for(const [img,src] of originals){try{img.setAttribute('src',src)}catch(_){}}
    };
  }
  function labelHtml(){return '<label class="keysuite-pdf-optimize-label"><input type="checkbox" data-keysuite-pdf-optimize>Optimized PDF</label>'}

  const api={version:'4.23.20',storageKey:STORAGE_KEY,isEnabled,setEnabled,syncCheckboxes,optimizeDocument,labelHtml};
  window.KeySuitePdfOptimization=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>syncCheckboxes(),{once:true});
  else syncCheckboxes();
  try{new MutationObserver(()=>syncCheckboxes()).observe(document.documentElement,{subtree:true,childList:true})}catch(_){}
})();
