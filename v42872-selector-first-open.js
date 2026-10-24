/* KeySuite V4.28.72 — platform-safe CHC/CR selector first-visible sizing. */
(()=>{
  'use strict';
  if(window.__KEYSUITE_V42872_SELECTOR_FIRST_OPEN__)return;
  window.__KEYSUITE_V42872_SELECTOR_FIRST_OPEN__=true;

  const ua=String(navigator.userAgent||'');
  const isMacSafari=/Macintosh/i.test(ua)&&/Safari\//i.test(ua)&&!/(?:Chrome|Chromium|CriOS|Edg|OPR)/i.test(ua);
  const targets={
    selector:{frameId:'selectorFrame',readyEvent:'KEYSUITE_CHC_VIEWPORT_READY'},
    selectorCr:{frameId:'selectorCrFrame',readyEvent:'KEYSUITE_CR_VIEWPORT_READY'}
  };
  const sequences={selector:0,selectorCr:0};
  const section=page=>document.getElementById(page);
  const frame=page=>document.getElementById(targets[page]?.frameId||'');
  const isActive=page=>section(page)?.classList.contains('active');
  const generation=value=>String(value||'').toUpperCase()==='G1'?'G1':'G2';
  const expectedChcPath=value=>generation(value)==='G1'?'selector-g1/index.html':'selector/index.html';

  function notifyResize(target){
    try{target?.contentWindow?.dispatchEvent(new Event('resize'))}catch(_){}
    try{target?.contentWindow?.postMessage({type:'KEYSUITE_PARENT_VIEWPORT_READY',width:Math.round(target.getBoundingClientRect().width||0),devicePixelRatio:Number(window.devicePixelRatio)||1},'*')}catch(_){}
  }
  function restoreNativeChildLayout(target){
    if(!isMacSafari||!target)return;
    try{
      const doc=target.contentDocument;
      if(!doc?.body)return;
      doc.documentElement.dataset.ksParentSafariZoom='1';
      doc.body.style.removeProperty('zoom');
      doc.body.style.removeProperty('width');
    }catch(_){}
  }
  function loadedPath(target){
    try{return String(target?.contentWindow?.location?.pathname||'')}catch(_){return ''}
  }
  function reveal(target){
    if(!target)return;
    target.style.visibility='visible';
    target.style.opacity='1';
    target.dataset.ksSelectorViewportReady='1';
    delete target.dataset.ksPendingGeneration;
  }
  function hideForDesktopRoute(target){
    if(!target)return;
    target.dataset.ksSelectorViewportReady='0';
    target.style.visibility='hidden';
    target.style.opacity='0';
  }
  function keepMacFrameLayoutActive(target,{conceal=true}={}){
    if(!target)return;
    target.style.display='block';
    target.style.visibility='visible';
    target.style.maxWidth='100%';
    target.style.minWidth='0';
    if(conceal){target.dataset.ksSelectorViewportReady='0';target.style.opacity='0'}
  }
  function canRevealChc(target,{fallback=false}={}){
    const next=target?.dataset?.ksPendingGeneration;
    if(!next)return true;
    const expected=expectedChcPath(next),src=String(target.getAttribute('src')||'');
    try{
      const ready=target.contentDocument?.readyState;
      if(loadedPath(target).includes(expected)&&(ready==='interactive'||ready==='complete'))return true;
      return fallback&&src.includes(expected)&&ready==='complete';
    }catch(_){return fallback&&src.includes(expected)}
  }
  function wantedChcUrl(target,next){
    return next==='G1'?(target.dataset.g1Src||'selector-g1/index.html?v=42872'):(target.dataset.g2Src||target.dataset.src||'selector/index.html?v=42872');
  }
  function macVisibleUrl(raw,key){
    const url=new URL(raw,location.href);
    url.searchParams.set('ks-visible','1');
    url.searchParams.set('ks-layout','42872');
    url.searchParams.set('ks-frame',key);
    return url.href;
  }
  function ensureMacVisibleNavigation(page,target,host){
    if(!isMacSafari||!target||!host)return false;
    const width=Math.floor(host.getBoundingClientRect().width||section(page)?.getBoundingClientRect().width||0);
    if(width<320)return false;
    const next=page==='selector'?generation(target.dataset.ksPendingGeneration||(/selector-g1/i.test(target.getAttribute('src')||'')?'G1':'G2')):'CR';
    const key=page==='selector'?next:'CR';
    if(target.dataset.ksMacSafariVisibleKey===key)return false;
    target.dataset.ksMacSafariVisibleKey=key;
    keepMacFrameLayoutActive(target,{conceal:target.dataset.ksSelectorViewportReady!=='1'||!!target.dataset.ksPendingGeneration});
    target.style.width=width+'px';
    void target.offsetWidth;
    const raw=page==='selector'?wantedChcUrl(target,next):(target.getAttribute('src')||target.dataset.src||'selector-cr/index.html?v=42872');
    const wanted=macVisibleUrl(raw,key);
    if(String(target.getAttribute('src')||'')!==wanted){target.dataset.ksMacSafariReloading='1';target.setAttribute('src',wanted)}
    return true;
  }
  function prepareChc(nextGeneration){
    const target=frame('selector');if(!target)return;
    const next=generation(nextGeneration),wanted=wantedChcUrl(target,next),expected=expectedChcPath(next);
    const current=String(target.getAttribute('src')||''),changing=!current.includes(expected)||!loadedPath(target).includes(expected);
    target.dataset.ksPendingGeneration=next;
    target.title=`KeySelector CHC ${next==='G1'?'C4':'C6'} Series`;
    if(isMacSafari){
      keepMacFrameLayoutActive(target);
      if(changing&&current!==wanted){
        target.dataset.ksMacSafariVisibleKey=next;
        target.dataset.ksMacSafariReloading='1';
        window.KeySuiteCHCSelection?.setGeneration?.(next);
        target.setAttribute('src',macVisibleUrl(wanted,next));
      }
      schedule('selector');
      return;
    }
    hideForDesktopRoute(target);
    if(changing){
      window.KeySuiteCHCSelection?.setGeneration?.(next);
      if(current!==wanted)target.setAttribute('src',wanted);
    }else stabilizeDesktop('selector');
  }
  function stabilizeDesktop(page){
    if(!targets[page])return false;
    const token=++sequences[page];
    requestAnimationFrame(()=>{
      if(token!==sequences[page])return;
      const target=frame(page),host=target?.parentElement;
      if(!target||!host||!isActive(page))return;
      const width=Math.floor(host.getBoundingClientRect().width||section(page)?.getBoundingClientRect().width||0);
      if(width<320)return;
      target.style.display='block';target.style.maxWidth='100%';target.style.minWidth='0';target.style.width=width+'px';
      void target.offsetWidth;notifyResize(target);
      requestAnimationFrame(()=>{
        if(token!==sequences[page]||!isActive(page))return;
        target.style.width='100%';void target.offsetWidth;notifyResize(target);
        requestAnimationFrame(()=>{
          if(token!==sequences[page]||!isActive(page))return;
          if(page==='selector'&&!canRevealChc(target))return;
          reveal(target);
          try{window.dispatchEvent(new CustomEvent(targets[page].readyEvent,{detail:{frameId:target.id,src:target.getAttribute('src')||''}}))}catch(_){}
        });
      });
    });
    return true;
  }
  function stabilizeMac(page,attempt,token){
    if(token!==sequences[page])return false;
    const target=frame(page),host=target?.parentElement;
    if(!target||!host||!isActive(page))return false;
    keepMacFrameLayoutActive(target,{conceal:target.dataset.ksSelectorViewportReady!=='1'||!!target.dataset.ksPendingGeneration});
    if(ensureMacVisibleNavigation(page,target,host))return true;
    if(target.dataset.ksMacSafariReloading==='1')return false;
    const width=Math.floor(host.getBoundingClientRect().width||section(page)?.getBoundingClientRect().width||0);
    if(width<320)return false;
    target.style.width=width+'px';void target.offsetWidth;restoreNativeChildLayout(target);notifyResize(target);
    requestAnimationFrame(()=>{
      if(token!==sequences[page]||!isActive(page))return;
      target.style.width='100%';void target.offsetWidth;restoreNativeChildLayout(target);notifyResize(target);
      requestAnimationFrame(()=>{
        if(token!==sequences[page]||!isActive(page))return;
        restoreNativeChildLayout(target);notifyResize(target);
        if(page==='selector'&&!canRevealChc(target,{fallback:attempt>=4}))return;
        reveal(target);
        try{window.dispatchEvent(new CustomEvent(targets[page].readyEvent,{detail:{frameId:target.id,src:target.getAttribute('src')||''}}))}catch(_){}
      });
    });
    return true;
  }
  function schedule(page){
    if(!targets[page])return false;
    if(!isMacSafari)return stabilizeDesktop(page);
    const token=++sequences[page],target=frame(page);
    if(target)keepMacFrameLayoutActive(target);
    [0,40,120,280,650,1200,2200].forEach((delay,attempt)=>setTimeout(()=>stabilizeMac(page,attempt,token),delay));
    return true;
  }
  function bindTarget(page){
    const target=frame(page);if(!target)return false;
    if(target.dataset.ksSelectorFirstOpenBound!=='1'){
      target.dataset.ksSelectorFirstOpenBound='1';
      target.addEventListener('load',()=>{target.dataset.ksSelectorViewportReady='0';target.dataset.ksMacSafariReloading='0';restoreNativeChildLayout(target);if(isActive(page))schedule(page)});
    }
    if(isActive(page))schedule(page);
    return true;
  }
  function bind(){
    Object.keys(targets).forEach(bindTarget);
    window.addEventListener('KEYSUITE_PAGE_CHANGED',event=>{const page=event.detail?.page,previous=event.detail?.previousPage;if(targets[previous]&&previous!==page)sequences[previous]++;if(targets[page])schedule(page)});
    window.addEventListener('resize',()=>Object.keys(targets).forEach(page=>{if(isActive(page))schedule(page)}),{passive:true});
    window.addEventListener('pageshow',()=>Object.keys(targets).forEach(page=>{if(isActive(page))schedule(page)}));
    document.addEventListener('pointerdown',event=>{const button=event.target?.closest?.('button[data-page="selector"][data-generation]');if(button)prepareChc(button.dataset.generation)},true);
    document.addEventListener('click',event=>{const button=event.target?.closest?.('button[data-page]'),page=button?.dataset?.page;if(page==='selector')prepareChc(button.dataset.generation);if(targets[page])schedule(page)},true);
  }
  window.KeySuiteSelectorFirstOpen={version:'4.28.72',stabilize:schedule,prepareChc,prepareWindowsChc:prepareChc,isMacSafari};
  window.KeySuiteChcFirstOpen={version:'4.28.72',stabilize:()=>schedule('selector')};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
