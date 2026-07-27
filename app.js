const $=id=>document.getElementById(id);
const money=n=>'RM '+Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const store={get:(k,d=[])=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
let editingQuoteId=null, viewedCustomerId=null;

document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));
function showPage(id){
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
 $(id).classList.add('active');
 refreshAll();
}

function customers(){return store.get('ks_customers',[])}
function quotes(){return store.get('ks_quotes',[])}
function activeCustomerId(){return localStorage.getItem('ks_active_customer')||''}
function activeCustomer(){return customers().find(c=>c.id===activeCustomerId())}
function customerName(id){return customers().find(c=>c.id===id)?.company||''}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function digits(value){return String(value||'').replace(/\D/g,'')}
function formatMYPhone(value){
 let d=digits(value);
 if(!d)return '';
 if(d.startsWith('60'))d=d.slice(2);
 if(d.startsWith('0'))d=d.slice(1);
 if(!d)return '';
 const areaLen=d.startsWith('1')?2:(['3','4','5','6','7','8','9'].includes(d[0])?1:2);
 const area=d.slice(0,areaLen), rest=d.slice(areaLen);
 if(!rest)return `+60 (${area})`;
 const split=rest.length>4?rest.length-4:0;
 return split?`+60 (${area}) ${rest.slice(0,split)} ${rest.slice(split)}`:`+60 (${area}) ${rest}`;
}
function formatPhoneInputs(){
 document.querySelectorAll('.contact-phone,#companyPhone').forEach(input=>{
   input.addEventListener('blur',()=>input.value=formatMYPhone(input.value));
 });
}

function contactRow(data={}){
 const row=document.createElement('div');row.className='contact-row';
 row.innerHTML=`<div><label>Prefix</label><select class="contact-prefix"><option ${data.prefix==='Mr.'?'selected':''}>Mr.</option><option ${data.prefix==='Ms.'?'selected':''}>Ms.</option><option ${data.prefix==='Mrs.'?'selected':''}>Mrs.</option><option ${data.prefix==='Dr.'?'selected':''}>Dr.</option><option ${data.prefix==='Ir.'?'selected':''}>Ir.</option><option ${data.prefix==="Dato'"?'selected':''}>Dato'</option></select></div><button class="btn danger remove-contact" type="button">Remove Contact</button><div><label>Name</label><input class="contact-name" value="${esc(data.name||'')}"></div><div><label>Phone</label><input class="contact-phone" placeholder="+60 (x) xxxx xxxx" value="${esc(formatMYPhone(data.phone||''))}"></div><div><label>Email</label><input class="contact-email" type="email" value="${esc(data.email||'')}"></div>`;
 row.querySelector('.remove-contact').onclick=()=>row.remove();$('contactEditor').appendChild(row);formatPhoneInputs();
}
function getContacts(){
 return [...document.querySelectorAll('.contact-row')].map(r=>({
   prefix:r.querySelector('.contact-prefix').value,
   name:r.querySelector('.contact-name').value.trim(),
   phone:formatMYPhone(r.querySelector('.contact-phone').value),
   email:r.querySelector('.contact-email').value.trim()
 })).filter(c=>c.name||c.phone||c.email);
}

function openNewCustomer(){
 viewedCustomerId=null;
 $('customerEmpty').style.display='none';$('customerDetail').style.display='none';$('customerEditorCard').style.display='block';
 $('customerEditorTitle').textContent='Add New Customer';$('deleteCustomerBtn').style.display='none';
 ['customerId','company','companyPhone','address','customerTerms','tinNumber','brnNumber','sstNumber','msicCode','businessActivity','customerNotes'].forEach(id=>$(id).value='');
 $('contactEditor').innerHTML='';contactRow();
 $('company').focus();
}
function editCustomer(id){
 const c=customers().find(x=>x.id===id);if(!c)return;
 viewedCustomerId=id;
 $('customerEmpty').style.display='none';$('customerDetail').style.display='none';$('customerEditorCard').style.display='block';
 $('customerEditorTitle').textContent='Edit Customer';$('deleteCustomerBtn').style.display='inline-block';
 $('customerId').value=c.id;$('company').value=c.company||'';$('companyPhone').value=formatMYPhone(c.companyPhone||'');
 $('address').value=c.address||'';$('customerTerms').value=c.terms||'';$('tinNumber').value=c.tinNumber||'';
 $('brnNumber').value=c.brnNumber||'';$('sstNumber').value=c.sstNumber||'';$('msicCode').value=c.msicCode||'';
 $('businessActivity').value=c.businessActivity||'';$('customerNotes').value=c.notes||'';
 $('contactEditor').innerHTML='';(c.contacts?.length?c.contacts:[{}]).forEach(contactRow);
}
function cancelCustomerEdit(){
 $('customerEditorCard').style.display='none';
 if(viewedCustomerId)showCustomerDetail(viewedCustomerId);else $('customerEmpty').style.display='block';
}
function saveCustomer(){
 const company=$('company').value.trim();if(!company)return alert('Company name is required.');
 let arr=customers(),id=$('customerId').value||crypto.randomUUID();
 const old=arr.find(x=>x.id===id)||{};
 const c={
   ...old,id,company,
   companyPhone:formatMYPhone($('companyPhone').value),
   address:$('address').value.trim(),
   terms:$('customerTerms').value.trim(),
   tinNumber:$('tinNumber').value.trim(),
   brnNumber:$('brnNumber').value.trim(),
   sstNumber:$('sstNumber').value.trim(),
   msicCode:$('msicCode').value.trim(),
   businessActivity:$('businessActivity').value.trim(),
   notes:$('customerNotes').value.trim(),
   contacts:getContacts()
 };
 const i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]=c;else arr.push(c);
 store.set('ks_customers',arr);localStorage.setItem('ks_active_customer',id);viewedCustomerId=id;
 refreshAll();showCustomerDetail(id);
 alert('Customer saved and selected.');
}
function deleteCustomer(id){
 if(!id)return;
 if(confirm('Delete this customer?')){
   store.set('ks_customers',customers().filter(x=>x.id!==id));
   if(activeCustomerId()===id)localStorage.removeItem('ks_active_customer');
   viewedCustomerId=null;$('customerEditorCard').style.display='none';$('customerDetail').style.display='none';$('customerEmpty').style.display='block';
   refreshAll();
 }
}
function selectCustomer(id){
 localStorage.setItem('ks_active_customer',id);viewedCustomerId=id;refreshAll();showCustomerDetail(id);
}
function showCustomerDetail(id){
 const c=customers().find(x=>x.id===id);if(!c)return;
 viewedCustomerId=id;
 $('customerEmpty').style.display='none';$('customerEditorCard').style.display='none';$('customerDetail').style.display='block';
 $('detailCompany').textContent=c.company+(c.id===activeCustomerId()?' — Selected':'');
 $('detailAddress').textContent=c.address||'-';$('detailPhone').textContent=formatMYPhone(c.companyPhone)||'-';
 $('detailTerms').textContent=c.terms||'-';$('detailTin').textContent=c.tinNumber||'-';$('detailBrn').textContent=c.brnNumber||'-';
 $('detailSst').textContent=c.sstNumber||'-';$('detailMsic').textContent=c.msicCode||'-';
 $('detailBusinessActivity').textContent=c.businessActivity||'-';$('detailNotes').textContent=c.notes||'-';
 $('detailContacts').innerHTML=(c.contacts||[]).map(x=>`<tr><td>${esc([x.prefix,x.name].filter(Boolean).join(' '))}</td><td>${esc(formatMYPhone(x.phone)||'-')}</td><td>${esc(x.email||'-')}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">No contact persons saved.</td></tr>';
 $('selectDetailCustomer').textContent=c.id===activeCustomerId()?'Selected Customer':'Select Customer';
 $('selectDetailCustomer').disabled=c.id===activeCustomerId();
}
function refreshCustomerList(){
 const query=($('customerSearch')?.value||'').trim().toLowerCase();
 const arr=customers().filter(c=>{
   const text=[c.company,c.companyPhone,c.tinNumber,c.brnNumber,...(c.contacts||[]).flatMap(x=>[x.name,x.phone,x.email])].join(' ').toLowerCase();
   return !query||text.includes(query);
 });
 $('customerListPanel').innerHTML=arr.map(c=>`<button class="customer-item ${c.id===viewedCustomerId?'selected':''}" data-view-c="${c.id}">
 <b>${esc(c.company)}</b><span class="muted">${esc(formatMYPhone(c.companyPhone)||c.tinNumber||`${(c.contacts||[]).length} contact(s)`)}</span>
 </button>`).join('')||'<p class="muted">No matching customers.</p>';
 document.querySelectorAll('[data-view-c]').forEach(b=>b.onclick=()=>{showCustomerDetail(b.dataset.viewC);refreshCustomerList()});
}
function refreshCustomers(){
 refreshCustomerList();
 const arr=customers(),opts='<option value="">Select customer</option>'+arr.map(c=>`<option value="${c.id}">${esc(c.company)}</option>`).join('');
 const old=$('qCustomer').value;$('qCustomer').innerHTML=opts;$('qCustomer').value=old;
 refreshQuotationContacts();
 const a=activeCustomer();$('activeCustomerBanner').className=a?'notice active-customer':'notice';
 $('activeCustomerBanner').innerHTML=a?`Selected customer: <b>${esc(a.company)}</b>`:'Select a customer from the Customer page first.';
 if(viewedCustomerId&&$('customerDetail').style.display!=='none')showCustomerDetail(viewedCustomerId);
}


function refreshQuotationContacts(){
 const customerId=$('qCustomer').value;
 const c=customers().find(x=>x.id===customerId);
 const old=$('qContact')?.value||'';
 const contacts=c?.contacts||[];
 $('qContact').innerHTML='<option value="">Select contact person</option>'+contacts.map((x,i)=>`<option value="${i}">${esc([x.prefix,x.name].filter(Boolean).join(' '))}</option>`).join('');
 if(old && Number(old)<contacts.length)$('qContact').value=old;
 else if(contacts.length)$('qContact').value='0';
 updateQuotationContactInfo();
 if(c){
   $('payment').value=(c.terms||'').trim()||'Cash before delivery';
 }
}
function updateQuotationContactInfo(){
 const c=customers().find(x=>x.id===$('qCustomer').value);
 const idx=$('qContact').value;
 const person=(c?.contacts||[])[Number(idx)];
 if(!person){$('qContactInfo').textContent='-';return}
 const parts=[];
 if(person.phone)parts.push(formatMYPhone(person.phone));
 if(person.email)parts.push(person.email);
 $('qContactInfo').textContent=parts.join(' · ')||'-';
}
function quoteItemRow(data={}){
 const wrap=document.createElement('div');wrap.className='quote-item';
 wrap.innerHTML=`<div class="quote-item-head"><b>Item <span class="item-number"></span></b><button type="button" class="btn danger remove-quote-item no-print">Remove Item</button></div><div class="quote-item-grid"><div><label>Model / Item</label><input class="item-model" value="${esc(data.model||'')}"></div><div><label>Quantity</label><input class="item-qty" type="number" min="1" value="${data.qty??1}"></div><div><label>Unit Price (RM)</label><input class="item-price" type="number" min="0" step="0.01" value="${data.unitPrice??0}"></div><div><label>Discount (%)</label><input class="item-discount" type="number" min="0" step="0.1" value="${data.discount??0}"></div></div><div style="margin-top:12px"><label>Description</label><textarea class="item-description">${esc(data.description||'')}</textarea></div><div class="quote-total" style="margin-top:10px;font-size:16px">Item Total: <span class="item-total">RM 0.00</span></div>`;
 $('quoteItems').appendChild(wrap);wrap.querySelector('.remove-quote-item').onclick=()=>{if(document.querySelectorAll('.quote-item').length<=1)return alert('At least one item is required.');wrap.remove();renumberQuoteItems();calcTotal()};wrap.querySelectorAll('input').forEach(x=>x.addEventListener('input',()=>{calcTotal();refreshItemExportButtons()}));renumberQuoteItems();calcTotal();return wrap;
}
function renumberQuoteItems(){[...document.querySelectorAll('.quote-item')].forEach((r,i)=>r.querySelector('.item-number').textContent=i+1);refreshItemExportButtons()}

function safePdfName(value){
 return String(value||'Pump Model').replace(/[\\/:*?\"<>|]/g,'-').replace(/\s+/g,' ').trim()||'Pump Model';
}
function restorePrintState(){
 document.body.classList.remove('export-single');
 document.querySelectorAll('.quote-item.export-target').forEach(x=>x.classList.remove('export-target'));
 if(window.__ksOldTitle){document.title=window.__ksOldTitle;window.__ksOldTitle=''}
}
function printWithFilename(filename,targetRow=null){
 restorePrintState();
 window.__ksOldTitle=document.title;
 document.title=safePdfName(filename);
 if(targetRow){document.body.classList.add('export-single');targetRow.classList.add('export-target')}
 window.addEventListener('afterprint',restorePrintState,{once:true});
 window.print();
 setTimeout(restorePrintState,1500);
}
function refreshItemExportButtons(){
 const box=$('itemExportButtons');if(!box)return;
 const rows=[...document.querySelectorAll('.quote-item')];
 box.innerHTML='';
 rows.forEach((row,i)=>{
   const model=row.querySelector('.item-model')?.value.trim()||'Pump Model';
   const no=String(i+1).padStart(2,'0');
   const b=document.createElement('button');
   b.className='btn secondary';
   b.textContent=`Export Item ${no} - ${model}`;
   b.onclick=()=>printWithFilename(`Item ${no} - ${model}`,row);
   box.appendChild(b);
 });
}

function getQuoteItems(){return [...document.querySelectorAll('.quote-item')].map(r=>({model:r.querySelector('.item-model').value.trim(),qty:+r.querySelector('.item-qty').value||0,unitPrice:+r.querySelector('.item-price').value||0,discount:+r.querySelector('.item-discount').value||0,description:r.querySelector('.item-description').value.trim()})).filter(x=>x.model||x.description||x.unitPrice||x.qty)}
function setQuoteItems(items=[]){$('quoteItems').innerHTML='';(items.length?items:[{}]).forEach(quoteItemRow);calcTotal()}
function nextQuoteNo(){
 const d=new Date(),yy=String(d.getFullYear()).slice(-2),mm=String(d.getMonth()+1).padStart(2,'0'),seq=String(quotes().length+1).padStart(4,'0');
 return `R-${yy}${mm}-${seq}`;
}
function calcTotal(){let total=0;document.querySelectorAll('.quote-item').forEach(r=>{const qty=+r.querySelector('.item-qty').value||0,price=+r.querySelector('.item-price').value||0,discount=+r.querySelector('.item-discount').value||0,itemTotal=qty*price*(1-discount/100);r.querySelector('.item-total').textContent=money(itemTotal);total+=itemTotal});$('quoteTotal').textContent=money(total);return total}
function saveQuote(){if(!$('qCustomer').value)return alert('Customer is required.');const items=getQuoteItems();if(!items.length)return alert('At least one item is required.');const q={id:editingQuoteId||crypto.randomUUID(),no:$('quoteNo').value||nextQuoteNo(),date:$('qDate').value,documentType:$('qDocumentType').value,customerId:$('qCustomer').value,contactIndex:$('qContact').value,preparedBy:$('preparedBy').value,items,delivery:$('delivery').value,validity:$('validity').value,payment:$('payment').value,remarks:$('remarks').value,total:calcTotal()};let arr=quotes(),i=arr.findIndex(x=>x.id===q.id);if(i>=0)arr[i]=q;else arr.unshift(q);store.set('ks_quotes',arr);editingQuoteId=q.id;$('quoteNo').value=q.no;refreshAll();alert(`${q.documentType} saved.`)}
function loadQuote(id){const q=quotes().find(x=>x.id===id);if(!q)return;editingQuoteId=id;$('quoteNo').value=q.no||'';$('qDate').value=q.date||'';$('qDocumentType').value=q.documentType||'Quotation';$('qCustomer').value=q.customerId||'';refreshQuotationContacts();$('qContact').value=q.contactIndex!=null?String(q.contactIndex):'';updateQuotationContactInfo();$('preparedBy').value=q.preparedBy||'Ray';$('delivery').value=q.delivery||'';$('validity').value=q.validity||'';$('payment').value=q.payment||'Cash before delivery';$('remarks').value=q.remarks||'';const items=q.items?.length?q.items:[{model:q.model||'',qty:q.qty||1,unitPrice:q.unitPrice||0,discount:q.discount||0,description:q.description||''}];setQuoteItems(items);showPage('quotation')}
function deleteQuote(id){if(confirm('Delete this quotation?')){store.set('ks_quotes',quotes().filter(x=>x.id!==id));refreshAll()}}
function newQuote(){editingQuoteId=null;$('quoteNo').value=nextQuoteNo();$('qDate').value=new Date().toISOString().slice(0,10);$('qDocumentType').value='Quotation';$('remarks').value='';setQuoteItems([{}]);const a=activeCustomer();if(a){$('qCustomer').value=a.id;refreshQuotationContacts();$('payment').value=(a.terms||'').trim()||'Cash before delivery'}else{$('qCustomer').value='';$('payment').value='Cash before delivery';refreshQuotationContacts()}calcTotal()}
function refreshQuotes(){
 const arr=quotes();
 $('quoteRows').innerHTML=arr.map(q=>{const itemCount=q.items?.length||1;return `<tr><td>${esc(q.no)}</td><td>${esc(q.date)}</td><td>${esc(q.documentType||'Quotation')}</td><td>${esc(customerName(q.customerId))}</td><td>${itemCount}</td><td>${money(q.total)}</td><td><button class="btn secondary" data-open-q="${q.id}">Open</button> <button class="btn danger" data-del-q="${q.id}">Delete</button></td></tr>`}).join('')||'<tr><td colspan="7" class="muted">No quotations yet.</td></tr>';
 document.querySelectorAll('[data-open-q]').forEach(b=>b.onclick=()=>loadQuote(b.dataset.openQ));document.querySelectorAll('[data-del-q]').forEach(b=>b.onclick=()=>deleteQuote(b.dataset.delQ));
 $('recentQuotes').innerHTML=arr.slice(0,5).map(q=>{const first=q.items?.[0]?.model||q.model||'';return `<tr><td>${esc(q.no)}</td><td>${esc(customerName(q.customerId))}</td><td>${esc(first)}</td><td>${money(q.total)}</td><td>${esc(q.documentType||'Quotation')}</td></tr>`}).join('')||'<tr><td colspan="5" class="muted">No quotations yet.</td></tr>';
 $('mCustomers').textContent=customers().length;$('mQuotes').textContent=arr.length;$('mValue').textContent=money(arr.reduce((sum,q)=>sum+q.total,0));$('mPending').textContent=arr.length;
}

function updateConnectionAvailabilityFromModel(model){
 const size=Number((String(model||'').match(/CHC(?:S|N)?\s+(\d+)/i)||[])[1]||0);
 const sel=$('connectionType');
 const oval=sel?.querySelector('option[value="oval"]');
 if(!sel||!oval)return;
 if(size>=32){
   sel.value='round';
   oval.disabled=true;
   sel.disabled=true;
   sel.title='CHC 32 to CHC 200 use Round Flange only';
 }else{
   oval.disabled=false;
   sel.disabled=false;
   sel.title='';
 }
}

function refreshAll(){refreshCustomers();refreshQuotes()}

window.addEventListener('message',function(event){
 if(!event.data||event.data.type!=='KEYSUITE_ADD_SELECTION')return;
 const p=event.data.payload||{},customer=activeCustomer();
 if(!customer){alert('Please select a customer first.');showPage('customers');return}
 showPage('quotation');
 $('qCustomer').value=customer.id;refreshQuotationContacts();
 $('payment').value=(customer.terms||'').trim()||'Cash before delivery';
 const material=$('pumpMaterial').value;
 const seal=$('sealFaces').value;
 const elastomer=$('sealElastomer').value;
 const bare=$('bareShaft').checked;
 const rawModel=String(p.model||'');
 updateConnectionAvailabilityFromModel(rawModel);
 const seriesSize=Number((rawModel.match(/CHC\s+(\d+)/i)||[])[1]||0);
 const connectionSelect=$('connectionType');
 const ovalOption=connectionSelect.querySelector('option[value="oval"]');
 if(seriesSize>=32){
   connectionSelect.value='round';
   connectionSelect.disabled=true;
   connectionSelect.title='CHC 32 to CHC 200 use Round Flange only';
   if(ovalOption) ovalOption.disabled=true;
 }else if(ovalOption){
   ovalOption.disabled=false;
   connectionSelect.disabled=false;
   connectionSelect.title='';
 }
 const connectionType=connectionSelect.value;
 const quotationModel=material==='SS304' ? rawModel.replace(/^CHC\b/i,'CHCS') : material==='SS316' ? rawModel.replace(/^CHC\b/i,'CHCN') : rawModel;
 const rawConnection=String(p.connection||'');
 const dnMatch=rawConnection.match(/DN\s*\d+/ig)||[];
 const gMatch=rawConnection.match(/G\s*\d+(?:[½¼¾]|\s*1\/2|\s*1\/4|\s*3\/4)?/ig)||[];
 let suctionDischarge;
 if(connectionType==='oval'){
   const oval=gMatch[0]||rawConnection.match(/\(([^)]+)\)/)?.[1]||'G';
   suctionDischarge=`${oval} x ${oval}`;
 }else{
   const round=dnMatch[0]||rawConnection.split('(')[0].trim()||'DN';
   suctionDischarge=`${round} x ${round}`;
 }
 const hp=p.motor_hp!=null?Number(p.motor_hp).toFixed(2).replace(/\.00$/,''):'';
 const motorLine=`c/w ${hp||'-'}HP 2Pole ${p.motor_efficiency_class||'IE3'} Motor (${p.motor_voltage||415}V / ${p.motor_phase||'3Ph'} / ${Number(p.frequency_hz||50).toFixed(1)}Hz)`;
 const standardSeal=seal==='Car/Cer'&&elastomer==='Viton';
 const materialLine=standardSeal?`${material} / Mech Seal`:`${material} / Mech Seal-${seal}/${elastomer}`;
 const lines=[
   `Duty: ${Number(p.flow_m3h||0).toFixed(1)} m³/h @ ${Number(p.head_m||0).toFixed(1)} m`,
   `B.G.Reich Vertical Multistage Pump Model: ${quotationModel||'-'}`,
   bare?'(Bare shaft pump)':motorLine,
   `Suction & Discharge: ${suctionDischarge}`,
   `Material: ${materialLine}`
 ];
 const rows=[...document.querySelectorAll('.quote-item')];
 const empty=rows.length===1&&!rows[0].querySelector('.item-model').value&&!rows[0].querySelector('.item-description').value&&!+rows[0].querySelector('.item-price').value;
 const row=empty?rows[0]:quoteItemRow({});
 row.querySelector('.item-model').value=quotationModel||'';row.querySelector('.item-qty').value=1;row.querySelector('.item-description').value=lines.join('\n');calcTotal();refreshItemExportButtons();
});

$('addNewCustomer').onclick=openNewCustomer;
$('addContact').onclick=()=>contactRow();
$('saveCustomer').onclick=saveCustomer;
$('cancelCustomerEdit').onclick=cancelCustomerEdit;
$('deleteCustomerBtn').onclick=()=>deleteCustomer($('customerId').value);
$('editDetailCustomer').onclick=()=>editCustomer(viewedCustomerId);
$('selectDetailCustomer').onclick=()=>selectCustomer(viewedCustomerId);
$('customerSearch').addEventListener('input',refreshCustomerList);
$('qCustomer').addEventListener('change',refreshQuotationContacts);
$('qContact').addEventListener('change',updateQuotationContactInfo);
$('companyPhone').addEventListener('blur',()=>$('companyPhone').value=formatMYPhone($('companyPhone').value));
$('addQuoteItem').onclick=()=>quoteItemRow({});
$('saveQuote').onclick=saveQuote;$('newQuote').onclick=newQuote;$('printQuote').onclick=()=>printWithFilename($('quoteNo').value||'Quotation');
$('saveNotes').onclick=()=>{localStorage.setItem('ks_notes',$('testingNotes').value);alert('Testing notes saved.')};
$('testingNotes').value=localStorage.getItem('ks_notes')||'';

newQuote();refreshAll();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
