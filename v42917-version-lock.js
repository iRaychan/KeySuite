/* V4.29.18 compatibility shim for a cached V4.29.17 shell. */
(()=>{
  'use strict';
  if(window.__KEYSUITE_V42918_VERSION_LOCK__)return;
  const script=document.createElement('script');
  script.src='./v42918-version-lock.js?v=42918&compat=42917';
  script.async=false;
  (document.head||document.documentElement).appendChild(script);
})();
