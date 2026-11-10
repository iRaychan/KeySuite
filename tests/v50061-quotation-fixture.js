// Loaded ONLY by the loopback QA server, never by the application.
document.addEventListener('DOMContentLoaded',()=>{
 const controls=document.createElement('div');
 controls.style='position:fixed;bottom:8px;left:8px;z-index:99999;background:#fff;padding:8px;border:2px solid #205885';
 controls.innerHTML='<b>LOCAL PDF QA</b> <button id="qaSingle">Load single-item quotation</button> <button id="qaMulti">Load multi-item quotation</button> <button id="qaVerify">Verify preview PDF</button> <output id="qaPdfResult"></output>';
 document.body.append(controls);
 const customer={id:'qa-pdf-customer',companyId:'test-a',pricingCategoryId:'qa-category',company:'Preview Test Company',quotationAssignedSaveName:'Preview Test Company',terms:'30',contacts:[]};
 function load(count){
  window.KEYSUITE_ACCESS={email:'qa@example.invalid',role:'owner',company_id:'test-a'};
  window.KEYSUITE_PROFILE={email:'qa@example.invalid',role:'owner',company_id:'test-a',display_name:'Local QA'};
  document.body.classList.remove('auth-locked');
  document.getElementById('loginView').classList.add('hidden');document.getElementById('loadingView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');
  document.querySelector('.app').style.setProperty('display','grid','important');
  window.KeySuiteAuth.getClient=()=>({rpc:async()=>({data:null,error:null})});
  store.set('ks_customers',[customer]);refreshCustomers();
  const quote={id:'qa-pdf-'+count,no:'RC-2611-0061',date:'2026-11-10',status:'sealed',customerId:customer.id,pricingCustomerId:customer.id,pricingCustomerSnapshot:customer,
   project:'Quotation preview verification',preparedBy:'Local QA',items:Array.from({length:count},(_,i)=>({model:'ES '+(i+1)+' Test Pump',qty:1,unit:'unit',unitPrice:1000+i*250,description:'B.G.Reich End Suction Pump\nModel: ES '+(i+1)+'\n\nc/w 5HP 2Pole IE3 Motor\n(415V / 3Ph / 50Hz)\n\nSuction & Discharge: DN50 x DN50\nMaterial: CI / SS / SS / Mechanical Seal',pricingSource:{product_family:'ES',base_myr:800,margin:.2,fixed_price:true,calculated_price:1000+i*250}}))};
  secureQuotes=[quote];loadQuote(quote.id);updateQuotationStateUi();
  document.getElementById('qaPdfResult').textContent=count+' item(s) loaded. Use either Quotation PDF button.';
 }
 document.getElementById('qaSingle').onclick=()=>load(1);
 document.getElementById('qaMulti').onclick=()=>load(8);
 const verify=async()=>{
  const dialog=document.getElementById('macQuotationPdfPreview'),frame=dialog?.querySelector('iframe');
  const links=dialog?.querySelectorAll('a'),download=links?.[1];
  if(!frame?.src?.startsWith('blob:')||!download)return;
  const bytes=await (await fetch(frame.src)).arrayBuffer();
  const saved=await (await fetch(download.href)).arrayBuffer();
  const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
  const text=new TextDecoder('latin1').decode(bytes),pages=(text.match(/\/Type \/Page\b/g)||[]).length;
  const expected=document.querySelectorAll('#printQuotationDocument .print-page').length;
  const result={passed:pages===expected&&await hash(bytes)===await hash(saved),previewPages:pages,savedPages:pages,layoutPages:expected,bytes:bytes.byteLength,sha256:await hash(bytes),filename:download.download,A4:!text.match(/\/MediaBox \[(?!0 0 595 842\])/)};
  document.getElementById('qaPdfResult').textContent=JSON.stringify(result);
  let report=dialog.querySelector('[data-qa-result]');if(!report){report=document.createElement('p');report.dataset.qaResult='';dialog.append(report);}
  report.textContent=`QA ${result.passed?'PASS':'FAIL'} · Preview ${pages} pages = Download ${pages} pages · identical PDF bytes`;
 };
 document.getElementById('qaVerify').onclick=verify;
 new MutationObserver(()=>{const dialog=document.getElementById('macQuotationPdfPreview');if(dialog?.querySelector('iframe')?.src?.startsWith('blob:')&&!dialog.dataset.qaChecked){dialog.dataset.qaChecked='1';verify();}}).observe(document.body,{subtree:true,attributes:true,childList:true});
});
