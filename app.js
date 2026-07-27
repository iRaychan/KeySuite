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
 const row=document.createElement('div');
 row.className='contact-row';
 row.innerHTML=`<div><label>Prefix</label><select class="contact-prefix">
 <option ${data.prefix==='Mr.'?'selected':''}>Mr.</option><option ${data.prefix==='Ms.'?'selected':''}>Ms.</option>
 <option ${data.prefix==='Mrs.'?'selected':''}>Mrs.</option><option ${data.prefix==='Dr.'?'selected':''}>Dr.</option>
 <option ${data.prefix==='Ir.'?'selected':''}>Ir.</option><option ${data.prefix==="Dato'"?'selected':''}>Dato'</option>
 </select></div>
 <div><label>Name</label><input class="contact-name" value="${esc(data.name||'')}"></div>
 <div><label>Phone</label><input class="contact-phone" placeholder="+60 (x) xxxx xxxx" value="${esc(formatMYPhone(data.phone||''))}"></div>
 <div><label>Email</label><input class="contact-email" type="email" value="${esc(data.email||'')}"></div>
 <button class="btn danger remove-contact" type="button">Remove</button>`;
 row.querySelector('.remove-contact').onclick=()=>row.remove();
 $('contactEditor').appendChild(row);
 formatPhoneInputs();
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
function nextQuoteNo(){
 const d=new Date(),yy=String(d.getFullYear()).slice(-2),mm=String(d.getMonth()+1).padStart(2,'0'),seq=String(quotes().length+1).padStart(4,'0');
 return `R-${yy}${mm}-${seq}`;
}
function calcTotal(){
 const total=(+$('qQty').value||0)*(+$('unitPrice').value||0)*(1-(+$('discount').value||0)/100);
 $('quoteTotal').textContent=money(total);return total;
}
function saveQuote(){
 if(!$('qCustomer').value)return alert('Customer is required.');
 const q={id:editingQuoteId||crypto.randomUUID(),no:$('quoteNo').value||nextQuoteNo(),date:$('qDate').value,status:$('qStatus').value,customerId:$('qCustomer').value,contactIndex:$('qContact').value,preparedBy:$('preparedBy').value,model:$('qModel').value,qty:+$('qQty').value,unitPrice:+$('unitPrice').value,discount:+$('discount').value,delivery:$('delivery').value,validity:$('validity').value,description:$('description').value,payment:$('payment').value,remarks:$('remarks').value,total:calcTotal()};
 let arr=quotes(),i=arr.findIndex(x=>x.id===q.id);if(i>=0)arr[i]=q;else arr.unshift(q);
 store.set('ks_quotes',arr);editingQuoteId=q.id;$('quoteNo').value=q.no;refreshAll();alert('Quotation saved.');
}
function loadQuote(id){
 const q=quotes().find(x=>x.id===id);if(!q)return;editingQuoteId=id;
 const map={quoteNo:'no',qDate:'date',qStatus:'status',qCustomer:'customerId',qContact:'contactIndex',preparedBy:'preparedBy',qModel:'model',qQty:'qty',unitPrice:'unitPrice',discount:'discount',delivery:'delivery',validity:'validity',description:'description',payment:'payment',remarks:'remarks'};
 Object.entries(map).forEach(([id,k])=>{if($(id))$(id).value=q[k]??''});
 refreshQuotationContacts();
 if(q.contactIndex!=null)$('qContact').value=String(q.contactIndex);
 updateQuotationContactInfo();
 calcTotal();showPage('quotation');
}
function deleteQuote(id){if(confirm('Delete this quotation?')){store.set('ks_quotes',quotes().filter(x=>x.id!==id));refreshAll()}}
function newQuote(){
 editingQuoteId=null;['qModel','description','remarks'].forEach(id=>$(id).value='');
 $('quoteNo').value=nextQuoteNo();$('qDate').value=new Date().toISOString().slice(0,10);$('qStatus').value='Draft';
 $('qQty').value=1;$('unitPrice').value=0;$('discount').value=0;
 const a=activeCustomer();
 if(a){
   $('qCustomer').value=a.id;
   refreshQuotationContacts();
   $('payment').value=(a.terms||'').trim()||'Cash before delivery';
 }else{
   $('payment').value='Cash before delivery';
   refreshQuotationContacts();
 }
 calcTotal();
}
function refreshQuotes(){
 const arr=quotes();
 $('quoteRows').innerHTML=arr.map(q=>`<tr><td>${esc(q.no)}</td><td>${esc(q.date)}</td><td>${esc(customerName(q.customerId))}</td><td>${esc(q.model)}</td><td>${money(q.total)}</td><td><span class="badge ${q.status.toLowerCase()}">${q.status}</span></td><td><button class="btn secondary" data-open-q="${q.id}">Open</button> <button class="btn danger" data-del-q="${q.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="muted">No quotations yet.</td></tr>';
 document.querySelectorAll('[data-open-q]').forEach(b=>b.onclick=()=>loadQuote(b.dataset.openQ));document.querySelectorAll('[data-del-q]').forEach(b=>b.onclick=()=>deleteQuote(b.dataset.delQ));
 $('recentQuotes').innerHTML=arr.slice(0,5).map(q=>`<tr><td>${q.no}</td><td>${esc(customerName(q.customerId))}</td><td>${esc(q.model)}</td><td>${money(q.total)}</td><td>${q.status}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No quotations yet.</td></tr>';
 $('mCustomers').textContent=customers().length;$('mQuotes').textContent=arr.length;$('mValue').textContent=money(arr.reduce((s,q)=>s+q.total,0));$('mPending').textContent=arr.filter(q=>['Draft','Sent'].includes(q.status)).length;
}
function refreshAll(){refreshCustomers();refreshQuotes()}

window.addEventListener('message',function(event){
 if(!event.data||event.data.type!=='KEYSUITE_ADD_SELECTION')return;
 const p=event.data.payload||{},a=activeCustomer();
 if(!a){alert('Please select a customer first.');showPage('customers');return}
 showPage('quotation');$('qCustomer').value=a.id;refreshQuotationContacts();$('payment').value=(a.terms||'').trim()||'Cash before delivery';$('qModel').value=p.model||'';$('qQty').value=1;
 const mat=$('pumpMaterial').value,faces=$('sealFaces').value,elast=$('sealElastomer').value;
 const motor=[p.motor_kw!=null?`${Number(p.motor_kw).toFixed(2)} kW`:'',p.motor_hp!=null?`${Number(p.motor_hp).toFixed(2).replace(/\.00$/,'')} HP`:''].filter(Boolean).join(' / ');
 $('description').value=['B.G.Reich Vertical Multistage Pump',`Model: ${p.model||'-'}`,`Duty: ${Number(p.flow_m3h||0).toFixed(1)} m³/h @ ${Number(p.head_m||0).toFixed(1)} m`,`Material: ${mat}`,`Mechanical Seal: ${faces}, ${elast}`,`Motor: ${motor}, ${p.motor_voltage||415}V / ${p.motor_phase||'3Ph'} / ${Number(p.frequency_hz||50).toFixed(1)}Hz`,p.speed_rpm!=null?`Speed: ${Math.round(p.speed_rpm)} rpm`:'',p.efficiency!=null?`Pump Efficiency: ${Number(p.efficiency).toFixed(1)}%`:'',p.npshr!=null?`NPSHr: ${Number(p.npshr).toFixed(2)} m`:'',p.connection?`Connection: ${p.connection}`:''].filter(Boolean).join('\n');
 calcTotal();
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
['qQty','unitPrice','discount'].forEach(id=>$(id).addEventListener('input',calcTotal));
$('saveQuote').onclick=saveQuote;$('newQuote').onclick=newQuote;$('printQuote').onclick=()=>window.print();
$('saveNotes').onclick=()=>{localStorage.setItem('ks_notes',$('testingNotes').value);alert('Testing notes saved.')};
$('testingNotes').value=localStorage.getItem('ks_notes')||'';

newQuote();refreshAll();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
