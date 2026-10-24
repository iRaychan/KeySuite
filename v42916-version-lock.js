/* KeySuite V4.29.16 — guarded late-module display lock. */
(()=>{
  'use strict';
  const V='4.29.16';let applying=false;
  function apply(){if(applying)return;applying=true;try{const title=String(window.__KEYSUITE_LOCKED_QUOTATION_PDF_TITLE__||'').trim()||`KeySuite V${V}`;if(document.title!==title)document.title=title;document.documentElement.setAttribute('data-keysuite-version',V);document.querySelectorAll('.suite-version').forEach(x=>x.textContent=`KeySuite V${V}`);document.querySelectorAll('.brand small,.auth-brand small').forEach(x=>{if(/(?:full suite|keysuite|v\d)/i.test(x.textContent||''))x.textContent=x.closest('.auth-brand')?`V${V}`:`Full Suite V${V}`})}finally{applying=false}}
  function start(){apply();new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});window.addEventListener('pageshow',apply);window.addEventListener('beforeprint',apply)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
