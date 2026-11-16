(() => {
  'use strict';
  const supported = ['CHC_G1','CHC_G2','CR','KV','BFI','BGF','BSW','ES','ISO'];
  const entry = group => ({group,family:group.startsWith('CHC')?'CHC':group});
  window.KeySuiteHydraulicRegistry = {
    groups:supported,
    forBrand(brand){
      const api=window.KeySuiteV391;
      const master=brand.brand_type==='master'||String(brand.brand_key).toLowerCase()==='b.g.reich';
      if(master){
        const families=api?.brandFamilies?.(brand);
        return families
          ?families.filter(item=>item.family!=='MOTOR').map(item=>({...entry(item.productGroup||item.family),label:item.label}))
          :supported.map(entry);
      }
      const rows=[
        ...(api?.state?.series||[]).filter(r=>r.active!==false&&String(r.brand_id)===String(brand.id)).map(r=>r.product_group),
        ...(api?.state?.mappings||[]).filter(r=>r.active!==false&&String(r.brand_id)===String(brand.id)).map(r=>r.master_family)
      ];
      return [...new Set(rows.map(group=>group==='CHC'?'CHC_G2':group))].filter(group=>supported.includes(group)).map(entry);
    }
  };
})();
