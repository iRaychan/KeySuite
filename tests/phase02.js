addEventListener('DOMContentLoaded',()=>{
 const b=document.createElement('button');b.textContent='Run Phase 02 checks';b.style='position:fixed;right:20px;bottom:120px;z-index:99999';document.body.append(b);
 const out=document.createElement('pre');out.style='position:fixed;top:10px;right:10px;z-index:99999;background:white;max-width:800px';document.body.append(out);
 b.onclick=async()=>{const log=m=>out.textContent+=m+'\n',assert=(x,m)=>{if(!x)throw Error(m)};try{
 showPage('quotation');document.getElementById('quoteItems').innerHTML='';
 }catch(_){document.querySelectorAll('.quote-item').forEach(r=>r.remove())}
 try{
 quotationStatus='saved';
 const expected=Array.from({length:5},(_,i)=>'Item '+i+'\nLine two '+i);
 for(let i=0;i<5;i++){const row=quoteItemRow({manualItem:i%2===0,model:'Test '+i,description:'Test description '+i,qty:1,unitPrice:100+i});row.dataset.internalRemark=expected[i]}
 let items=getQuoteItems();assert(items.length===5,'five items');assert(items.every((x,i)=>x.internalRemark===expected[i]),'remarks serialization');
 const ids=items.map(x=>x.quoteItemId);assert(new Set(ids).size===5,'stable IDs');
 const saved=JSON.parse(JSON.stringify(items));document.querySelectorAll('.quote-item').forEach(r=>r.remove());saved.forEach(x=>quoteItemRow(x,{restored:true}));
 assert(getQuoteItems().every((x,i)=>x.internalRemark===expected[i]&&x.quoteItemId===ids[i]),'reload');log('PASS five mixed manual/product items retain remarks and IDs through serialization/reload');
 const rows=[...document.querySelectorAll('.quote-item')];rows[1].querySelector('.duplicate-quote-item').click();
 let clone=rows[1].nextElementSibling;assert(getQuoteItemData(clone).internalRemark===expected[1],'clone remarks');assert(getQuoteItemData(clone).quoteItemId!==ids[1],'clone ID');
 rows[4].before(clone);assert(getQuoteItemData(clone).internalRemark===expected[1],'reorder');log('PASS cloning and reordering preserve independent remarks');
 quotationStatus='sealed';setQuotationEditingLocked(true);assert(!rows[0].querySelector('.remark-quote-item').disabled,'sealed remarks button');openItemRemark(rows[0]);
 assert(document.getElementById('itemRemarkInput').readOnly,'readonly');assert(document.getElementById('saveItemRemark').disabled,'save blocked');assert(document.getElementById('itemRemarkInput').value===expected[0],'sealed value');document.getElementById('itemRemarkDialog').close();
 quotationStatus='saved';setQuotationEditingLocked(false);openItemRemark(rows[0]);assert(!document.getElementById('itemRemarkInput').readOnly,'editable');document.getElementById('itemRemarkInput').value='Edited\nMultiline';saveItemRemark();document.getElementById('itemRemarkDialog').close();assert(getQuoteItemData(rows[0]).internalRemark==='Edited\nMultiline','edited value');log('PASS sealed view and unsealed edit');
 const api=KeySuiteV391;
 api.state.brands.push({id:'future',brand_name:'Future Test',brand_key:'future',brand_type:'oem',active:true});
 api.state.mappings.push({brand_id:'future',master_family:'BFI',master_series:'BFI',selling_series:'FUTURE',active:true});
 api.state.mappings.push({brand_id:'oem',master_family:'BFI',master_series:'BFI',selling_series:'HMS',active:true});
 for(const [id,target] of [['future','FUTURE'],['oem','HMS'],['bg','BFI']]){
 const ctx=api.brandContext(id,'BFI','','BFI');assert(api.displayModelAlias('BFI 10-3T',ctx)===target+' 10-3T','mapping '+id);
 assert(KeySuiteSelectorBrand.modelAliasFor('BFI 10-3T',ctx)===target+' 10-3T','shared resolver '+id);
 }log('PASS configured new brand and brandless HMS mapping');
 for(const brand of ['Megaflow','B.G.Reich','O.K. Pump','Future Test','-']){
 const desc=(brand==='-'?'':brand+' ')+'End Suction Pump Model: ES 40-16\nSuction x Discharge: DN65 x DN40\nPump Material: CI / SS / SS';
 const d={assembly_type:'pumpset',items:[{section:'pump',description:desc,model:'ES 40-16',brand},{section:'motor',description:'c/w Motor'},{section:'coupling',couplingData:{model:'F60'},description:'c/w Coupling'}]};
 const text=KeySuiteAssembly.formatPumpsetDescription(d);assert(text.includes(desc.split('\n')[0]),'complete brand '+brand);assert(brand==='B.G.Reich'||!text.includes('B.G.Reich'),'brand fallback '+brand);
 }log('PASS complete-set descriptions preserve component commercial brand');
 log('FOCUSED CHECKS COMPLETE');document.title='Phase 02 focused checks passed';
 }catch(e){log('FAIL '+e.stack);document.title='Phase 02 checks failed'}};
});
