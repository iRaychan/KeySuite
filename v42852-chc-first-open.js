/* KeySuite V4.28.52 — stabilize the CHC selector viewport before its first visible frame. */
(()=>{
  'use strict';
  if(window.__KEYSUITE_V42852_CHC_FIRST_OPEN__)return;
  window.__KEYSUITE_V42852_CHC_FIRST_OPEN__=true;

  const frame=()=>document.getElementById('selectorFrame');
  const section=()=>document.getElementById('selector');
  const isActive=()=>section()?.classList.contains('active');
  let sequence=0;

  function notifyResize(target){
    try{target?.contentWindow?.dispatchEvent(new Event('resize'))}catch(_){}
    try{target?.contentWindow?.postMessage({type:'KEYSUITE_PARENT_VIEWPORT_READY',width:Math.round(target.getBoundingClientRect().width||0)},'*')}catch(_){}
  }
  function prime(){
    const target=frame();if(!target)return false;
    target.dataset.ksChcViewportReady='0';
    target.style.visibility='hidden';
    return true;
  }
  function reloadOnceVisible(target,host){
    if(target.dataset.ksChcVisibleReloaded==='1')return false;
    const width=Math.floor(host.getBoundingClientRect().width||section()?.getBoundingClientRect().width||0);
    if(width<320)return false;
    target.dataset.ksChcVisibleReloaded='1';
    target.dataset.ksChcVisibleReloadLoading='1';
    prime();
    const current=target.getAttribute('src')||target.dataset.src;
    if(!current){target.dataset.ksChcVisibleReloadLoading='0';return false}
    const url=new URL(current,location.href);
    url.searchParams.set('ks-visible','1');
    target.setAttribute('src',url.href);
    return true;
  }
  function stabilize(attempt=0,token=++sequence){
    if(token!==sequence)return false;
    const target=frame(),host=target?.parentElement,active=isActive();
    if(!target||!host||!active)return false;
    if(target.dataset.ksChcVisibleReloadLoading==='1')return false;
    if(reloadOnceVisible(target,host))return true;
    const width=Math.floor(host.getBoundingClientRect().width||section()?.getBoundingClientRect().width||0);
    if(width<320){if(attempt<5)setTimeout(()=>stabilize(attempt+1,token),[0,40,90,180,320][attempt]||320);return false}
    prime();
    target.style.display='block';
    target.style.maxWidth='100%';
    target.style.width=width+'px';
    void target.offsetWidth;
    notifyResize(target);
    requestAnimationFrame(()=>{
      if(token!==sequence||!isActive())return;
      target.style.width='100%';
      void target.offsetWidth;
      notifyResize(target);
      requestAnimationFrame(()=>{
        if(token!==sequence||!isActive())return;
        notifyResize(target);
        target.dataset.ksChcViewportReady='1';
        target.style.visibility='visible';
        try{window.dispatchEvent(new CustomEvent('KEYSUITE_CHC_VIEWPORT_READY',{detail:{frameId:target.id,src:target.getAttribute('src')||''}}))}catch(_){}
      });
    });
    return true;
  }
  function schedule(){
    const token=++sequence;
    prime();
    [0,40,120,280].forEach((delay,index)=>setTimeout(()=>stabilize(index,token),delay));
  }
  function bind(){
    const target=frame();if(!target)return false;
    if(target.dataset.ksChcFirstOpenBound!=='1'){
      target.dataset.ksChcFirstOpenBound='1';
      target.addEventListener('load',()=>{target.dataset.ksChcVisibleReloadLoading='0';target.dataset.ksChcViewportReady='0';if(isActive())schedule()});
    }
    window.addEventListener('KEYSUITE_PAGE_CHANGED',event=>{if(event.detail?.page==='selector')schedule();else if(event.detail?.previousPage==='selector')sequence++});
    window.addEventListener('resize',()=>{if(isActive())schedule()},{passive:true});
    window.addEventListener('pageshow',()=>{if(isActive())schedule()});
    document.addEventListener('click',event=>{if(event.target?.closest?.('button[data-page="selector"]')){prime();setTimeout(()=>{if(isActive())schedule()},0)}},true);
    if(isActive())schedule();
    return true;
  }
  window.KeySuiteChcFirstOpen={version:'4.28.52',stabilize:schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
