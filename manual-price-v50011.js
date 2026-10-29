(() => {
  'use strict';
  async function offer(item, reason='Automatic pricing is unavailable.') {
    const app=window.KeySuiteApp;
    if(!app?.canEditQuotation?.(true)||!app.ensureQuotationPricingContext('add a manually priced pump'))return null;
    const dialog=document.createElement('dialog');
    dialog.style.cssText='max-width:620px;width:90%;border:0;border-radius:16px;padding:24px';
    dialog.innerHTML='<form><h2>Enter selling price</h2><p class="reason"></p><pre style="white-space:pre-wrap;max-height:260px;overflow:auto"></pre><label>Unit selling price (MYR)<input name="price" type="number" min="0.01" step="0.01" required placeholder="Enter price" style="display:block;width:100%;margin:12px 0"></label><p>This price will remain unchanged when categories or price lists refresh.</p><button class="btn" type="submit">Add to quotation</button> <button class="btn secondary" type="button">Cancel</button></form>';
    dialog.querySelector('.reason').textContent=reason;
    dialog.querySelector('pre').textContent=[item.model,item.description].filter(Boolean).join('\n');
    document.body.appendChild(dialog);
    return new Promise(resolve=>{
      let result=null;
      dialog.addEventListener('close',()=>{dialog.remove();resolve(result)},{once:true});
      dialog.querySelector('button[type=button]').onclick=()=>dialog.close();
      dialog.querySelector('form').onsubmit=event=>{
        event.preventDefault();
        const price=Number(dialog.querySelector('input').value);
        if(!Number.isFinite(price)||price<=0)return;
        result=app.addExternalQuoteItem({...item,unitPrice:price,descriptionManuallyEdited:true,pricingSource:{...(item.pricingSource||{}),product_family:item.productFamily||'MANUAL',manual_override:true,manual_price_reason:reason,calculated_price:price}});
        if(result)app.showPage('quotation');
        dialog.close();
      };
      dialog.showModal();dialog.querySelector('input').focus();
    });
  }
  document.addEventListener('focusin',event=>{
    const row=event.target.closest?.('.quote-item');if(!row||row.querySelector('.manual-reprice'))return;
    let source={};try{source=JSON.parse(row.dataset.pricingSource||'{}')}catch(_){}
    if(!source.manual_override)return;
    const button=document.createElement('button');button.type='button';button.className='btn secondary manual-reprice';button.textContent='Reprice automatically';
    button.onclick=()=>{
      if(!window.KeySuiteApp.canEditQuotation(true))return;
      let source={};try{source=JSON.parse(row.dataset.pricingSource||'{}')}catch(_){}
      const found=window.KeySuitePricing.repriceSource({...source,manual_override:false});
      if(!found||window.KeySuitePricing.quoteBlockReason(found.calc)){alert('Automatic pricing is still unavailable. Your manual price is unchanged.');return;}
      row.querySelector('.item-price').value=found.calc.finalPrice.toFixed(2);row.dataset.pricingSource=JSON.stringify(window.KeySuitePricing.sourceSnapshot(found));delete row.dataset.pricingValidationError;row.querySelector('.item-price').dispatchEvent(new Event('input',{bubbles:true}));button.remove();
    };row.appendChild(button);
  });
  window.KeySuiteManualPrice={offer};
})();
