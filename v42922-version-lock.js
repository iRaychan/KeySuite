/* KeySuite V4.29.22 — idempotent late-module display lock. */
(()=>{
  'use strict';
  if(window.__KEYSUITE_V42922_VERSION_LOCK__)return;
  window.__KEYSUITE_V42922_VERSION_LOCK__=true;
  const V='4.29.22';
  let scheduled=false;
  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
  function apply(){
    const title=String(window.__KEYSUITE_LOCKED_QUOTATION_PDF_TITLE__||'').trim()||`KeySuite V${V}`;
    if(document.title!==title)document.title=title;
    if(document.documentElement.getAttribute('data-keysuite-version')!==V)document.documentElement.setAttribute('data-keysuite-version',V);
    document.querySelectorAll('.suite-version').forEach(node=>setText(node,`KeySuite V${V}`));
    document.querySelectorAll('.brand small,.auth-brand small').forEach(node=>{
      if(/(?:full suite|keysuite|v\d)/i.test(node.textContent||''))setText(node,node.closest('.auth-brand')?`V${V}`:`Full Suite V${V}`);
    });
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}
  function start(){apply();new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});window.addEventListener('pageshow',schedule);window.addEventListener('beforeprint',apply)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
