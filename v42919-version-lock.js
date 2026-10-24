/* V4.29.20 compatibility shim for a cached V4.29.19 shell. */
(()=>{
  'use strict';
  if(window.__KEYSUITE_V42920_VERSION_LOCK__)return;
  const script=document.createElement('script');
  script.src='./v42920-version-lock.js?v=42920&compat=42919';
  script.async=false;
  (document.head||document.documentElement).appendChild(script);
})();
