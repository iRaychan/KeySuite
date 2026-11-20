(() => {
  'use strict';
  const normalize=value=>window.KeySuiteProductFamilies?.normalize?.(value)||String(value||'').toUpperCase();
  const excluded=new Set(['MOTOR','BASEPLATE','COUPLING','KEYPLC','MANIFOLD','GWS']);
  function forBrand(brand){
    const api=window.KeySuiteV391;
    // brandFamilies is the configured commercial navigation catalogue, not hydraulic model names.
    const configured=api?.brandFamilies?.(brand)||[];
    const rows=configured.filter(item=>!excluded.has(normalize(item.productGroup||item.family)));
    return [...new Map(rows.map(item=>{
      const group=normalize(item.productGroup||item.family);
      return [group,{group,family:item.family||group,label:item.label}];
    })).values()];
  }
  window.KeySuiteHydraulicRegistry={forBrand,get groups(){
    return (window.KeySuiteProductFamilies?.list?.()||[]).filter(item=>!excluded.has(item.code)).map(item=>item.code);
  }};
})();
