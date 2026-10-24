/* V4.29.19 compatibility shim for a cached V4.29.18 shell. */
(()=>{
  'use strict';
  if(window.__KEYSUITE_V42919_VERSION_LOCK__)return;
  const script=document.createElement('script');
  script.src='./v42919-version-lock.js?v=42919&compat=42918';
  script.async=false;
  (document.head||document.documentElement).appendChild(script);
})();
