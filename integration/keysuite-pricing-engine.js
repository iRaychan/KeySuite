(function(global){
  'use strict';
  function create(masterData){
    const data=masterData||{};
    const categoryById=id=>(data.categories||[]).find(c=>c.id===id)||data.categories?.[0]||null;
    const companyById=id=>(data.companies||[]).find(c=>c.id===id)||data.companies?.[0]||null;
    const categoryForCompany=companyId=>{
      const company=companyById(companyId);
      return (data.categories||[]).find(c=>c.name===company?.category)||data.categories?.[0]||null;
    };
    const findProduct=(modelOrId)=>(data.products||[]).find(p=>p.id===modelOrId||p.model===modelOrId)||null;
    const calculate=(sourceUsd,material='CHC',categoryId)=>{
      const category=categoryById(categoryId);
      if(sourceUsd===null||sourceUsd===undefined||!Number.isFinite(Number(sourceUsd)))return null;
      const usd=Number(sourceUsd),multiplier=Number(data.currency_multiplier||1);
      const factor=Number(category?.factors?.[material]??category?.factors?.CHC??1);
      const transport=Number(category?.transport||0),commission=Number(category?.commission||0);
      const setDiscount=Number(category?.set_discount||0),finalDiscount=Number(category?.final_discount||0);
      const baseMyr=usd*multiplier;
      const landedCost=baseMyr*factor+transport;
      const quotationList=landedCost/(1-commission)/(1-setDiscount);
      const finalPrice=quotationList*(1-finalDiscount);
      return {usd,multiplier,factor,transport,commission,setDiscount,finalDiscount,baseMyr,landedCost,quotationList,finalPrice};
    };
    const priceProduct=(modelOrId,material='CHC',categoryId)=>{
      const product=findProduct(modelOrId);if(!product)return null;
      const sourceUsd=product.prices_usd?.[material];
      const price=calculate(sourceUsd,material,categoryId);
      return price?{product,material,sourceUsd,...price}:null;
    };
    return {data,companyById,categoryById,categoryForCompany,findProduct,calculate,priceProduct};
  }
  global.KeySuitePricing={create};
})(window);
