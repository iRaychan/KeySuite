const $=id=>document.getElementById(id);
const money=n=>'RM '+Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const store={get:(k,d=[])=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};

const CHC_DATA=[
 {model:'CHC 8-10',motor:'5.5 HP / 4.0 kW',eff:69.9,npsh:2.1,curve:[[0,78],[4,77],[8,74],[10,71],[12,66]]},
 {model:'CHC 15-30',motor:'5.5 HP / 4.0 kW',eff:65.0,npsh:1.8,curve:[[0,39],[5,38],[10,36.5],[15,33],[18,29]]},
 {model:'CHC 15-50',motor:'5.5 HP / 4.0 kW',eff:65.6,npsh:1.8,curve:[[0,65],[5,64],[10,62],[12,60],[15,56]]},
 {model:'CHC 32-40',motor:'15 HP / 11 kW',eff:74.0,npsh:2.8,curve:[[0,52],[10,50],[20,47],[30,43],[36,38]]},
 {model:'CHC 64-40',motor:'30 HP / 22 kW',eff:78.0,npsh:3.4,curve:[[0,50],[20,49],[40,46],[60,41],[72,35]]}
];

let selected=null, editingQuoteId=null;

document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));
function showPage(id){
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
 $(id).classList.add('active'); refreshAll();
}

function customers(){return store.get('ks_customers',[])}
function quotes(){return store.get('ks_quotes',[])}
function customerName(id){return customers().find(c=>c.id===id)?.company||''}

function saveCustomer(){
 const company=$('company').value.trim(); if(!company)return alert('Company name is required.');
 let arr=customers(), id=$('customerId').value||crypto.randomUUID();
 const c={id,company,contact:$('contact').value,phone:$('phone').value,email:$('email').value,address:$('address').value,notes:$('customerNotes').value};
 const i=arr.findIndex(x=>x.id===id); if(i>=0)arr[i]=c; else arr.push(c);
 store.set('ks_customers',arr); clearCustomer(); refreshAll();
}
function clearCustomer(){['customerId','company','contact','phone','email','address','customerNotes'].forEach(id=>$(id).value='')}
function editCustomer(id){const c=customers().find(x=>x.id===id); if(!c)return; Object.keys(c).forEach(k=>{if($(k))$(k).value=c[k]}); $('customerId').value=c.id}
function deleteCustomer(id){if(confirm('Delete this customer?')){store.set('ks_customers',customers().filter(x=>x.id!==id));refreshAll()}}

function refreshCustomers(){
 const arr=customers();
 $('customerRows').innerHTML=arr.map(c=>`<tr><td>${esc(c.company)}</td><td>${esc(c.contact)}</td><td>${esc(c.phone)}</td><td><button class="btn secondary" data-edit-c="${c.id}">Edit</button> <button class="btn danger" data-del-c="${c.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">No customers yet.</td></tr>';
 document.querySelectorAll('[data-edit-c]').forEach(b=>b.onclick=()=>editCustomer(b.dataset.editC));
 document.querySelectorAll('[data-del-c]').forEach(b=>b.onclick=()=>deleteCustomer(b.dataset.delC));
 const opts='<option value="">Select customer</option>'+arr.map(c=>`<option value="${c.id}">${esc(c.company)}</option>`).join('');
 ['selCustomer','qCustomer'].forEach(id=>{const old=$(id).value;$(id).innerHTML=opts;$(id).value=old});
}

function interpolate(curve,x){
 for(let i=0;i<curve.length-1;i++){let a=curve[i],b=curve[i+1];if(x>=a[0]&&x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}
 return null;
}
function runSelection(){
 const q=+$('flow').value,h=+$('head').value;
 const candidates=CHC_DATA.map(p=>({...p,headAt:interpolate(p.curve,q)})).filter(p=>p.headAt!==null&&p.headAt>=h).sort((a,b)=>(a.headAt-h)-(b.headAt-h));
 selected=candidates[0]||null;
 if(!selected){$('selectionResult').innerHTML='<div class="notice">No sample model can meet this duty point.</div>';drawCurve(null,q,h);return}
 $('selectionResult').innerHTML=`<div class="card" style="background:#f8fafc"><b>${selected.model}</b><div class="muted" style="margin-top:6px">Calculated head: ${selected.headAt.toFixed(1)} m · Motor: ${selected.motor} · Efficiency: ${selected.eff}% · NPSHr: ${selected.npsh} m</div></div>`;
 drawCurve(selected,q,h);
}
function drawCurve(p,q,h){
 const c=$('curve'),ctx=c.getContext('2d'),W=c.width,H=c.height,m={l:55,r:20,t:20,b:45};
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
 const curve=p?.curve||[[0,0],[20,20]], xmax=Math.max(...curve.map(x=>x[0]),q||0)*1.15||20, ymax=Math.max(...curve.map(x=>x[1]),h||0)*1.15||20;
 const X=x=>m.l+x/xmax*(W-m.l-m.r),Y=y=>H-m.b-y/ymax*(H-m.t-m.b);
 ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m.l,m.t);ctx.lineTo(m.l,H-m.b);ctx.lineTo(W-m.r,H-m.b);ctx.stroke();
 ctx.fillStyle='#64748b';ctx.font='12px Arial';ctx.fillText('Head (m)',8,18);ctx.fillText('Flow (m³/h)',W-90,H-10);
 if(p){ctx.strokeStyle='#17365d';ctx.lineWidth=3;ctx.beginPath();curve.forEach((pt,i)=>i?ctx.lineTo(X(pt[0]),Y(pt[1])):ctx.moveTo(X(pt[0]),Y(pt[1])));ctx.stroke()}
 if(q&&h){ctx.fillStyle='#c00000';ctx.beginPath();ctx.arc(X(q),Y(h),6,0,Math.PI*2);ctx.fill();ctx.fillText(` ${q} @ ${h}`,X(q)+7,Y(h)-7)}
}
function toQuote(){
 if(!selected)return alert('Select a pump first.');
 if(!$('selCustomer').value)return alert('Select a customer first.');
 showPage('quotation');
 $('qCustomer').value=$('selCustomer').value;$('qProject').value=$('project').value;$('qYourRef').value=$('yourRef').value;
 $('qModel').value=selected.model;$('qQty').value=$('qty').value;
 $('description').value=`B.G.Reich Vertical Multistage Pump\nModel: ${selected.model}\nDuty: ${$('flow').value} m³/h @ ${$('head').value} m\nMotor: ${selected.motor}, 415V / 3Ph / 50Hz\nLiquid: ${$('liquid').value} at ${$('temperature').value}°C\nEfficiency: ${selected.eff}%\nNPSHr: ${selected.npsh} m`;
 calcTotal();
}
function nextQuoteNo(){
 const d=new Date(), yy=String(d.getFullYear()).slice(-2),mm=String(d.getMonth()+1).padStart(2,'0'),seq=String(quotes().length+1).padStart(4,'0');
 return `R-${yy}${mm}-${seq}`;
}
function calcTotal(){const total=(+$('qQty').value||0)*(+$('unitPrice').value||0)*(1-(+$('discount').value||0)/100);$('quoteTotal').textContent=money(total);return total}
function saveQuote(){
 if(!$('qCustomer').value)return alert('Customer is required.');
 const q={id:editingQuoteId||crypto.randomUUID(),no:$('quoteNo').value||nextQuoteNo(),date:$('qDate').value,status:$('qStatus').value,customerId:$('qCustomer').value,project:$('qProject').value,yourRef:$('qYourRef').value,preparedBy:$('preparedBy').value,model:$('qModel').value,qty:+$('qQty').value,unitPrice:+$('unitPrice').value,discount:+$('discount').value,delivery:$('delivery').value,validity:$('validity').value,description:$('description').value,payment:$('payment').value,remarks:$('remarks').value,total:calcTotal()};
 let arr=quotes(),i=arr.findIndex(x=>x.id===q.id);if(i>=0)arr[i]=q;else arr.unshift(q);store.set('ks_quotes',arr);editingQuoteId=q.id;$('quoteNo').value=q.no;refreshAll();alert('Quotation saved.');
}
function loadQuote(id){const q=quotes().find(x=>x.id===id);if(!q)return;editingQuoteId=id; const map={quoteNo:'no',qDate:'date',qStatus:'status',qCustomer:'customerId',qProject:'project',qYourRef:'yourRef',preparedBy:'preparedBy',qModel:'model',qQty:'qty',unitPrice:'unitPrice',discount:'discount',delivery:'delivery',validity:'validity',description:'description',payment:'payment',remarks:'remarks'};Object.entries(map).forEach(([id,k])=>$(id).value=q[k]??'');calcTotal();showPage('quotation')}
function deleteQuote(id){if(confirm('Delete this quotation?')){store.set('ks_quotes',quotes().filter(x=>x.id!==id));refreshAll()}}
function newQuote(){editingQuoteId=null;['qProject','qYourRef','qModel','description','remarks'].forEach(id=>$(id).value='');$('quoteNo').value=nextQuoteNo();$('qDate').value=new Date().toISOString().slice(0,10);$('qStatus').value='Draft';$('qQty').value=1;$('unitPrice').value=0;$('discount').value=0;calcTotal()}
function refreshQuotes(){
 const arr=quotes();
 $('quoteRows').innerHTML=arr.map(q=>`<tr><td>${esc(q.no)}</td><td>${esc(q.date)}</td><td>${esc(customerName(q.customerId))}</td><td>${esc(q.project)}</td><td>${esc(q.model)}</td><td>${money(q.total)}</td><td><span class="badge ${q.status.toLowerCase()}">${q.status}</span></td><td><button class="btn secondary" data-open-q="${q.id}">Open</button> <button class="btn danger" data-del-q="${q.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="8" class="muted">No quotations yet.</td></tr>';
 document.querySelectorAll('[data-open-q]').forEach(b=>b.onclick=()=>loadQuote(b.dataset.openQ));document.querySelectorAll('[data-del-q]').forEach(b=>b.onclick=()=>deleteQuote(b.dataset.delQ));
 $('recentQuotes').innerHTML=arr.slice(0,5).map(q=>`<tr><td>${q.no}</td><td>${esc(customerName(q.customerId))}</td><td>${esc(q.model)}</td><td>${money(q.total)}</td><td>${q.status}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No quotations yet.</td></tr>';
 $('mCustomers').textContent=customers().length;$('mQuotes').textContent=arr.length;$('mValue').textContent=money(arr.reduce((s,q)=>s+q.total,0));$('mPending').textContent=arr.filter(q=>['Draft','Sent'].includes(q.status)).length;
}
function refreshAll(){refreshCustomers();refreshQuotes()}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

$('saveCustomer').onclick=saveCustomer;$('clearCustomer').onclick=clearCustomer;$('runSelection').onclick=runSelection;$('toQuote').onclick=toQuote;
['qQty','unitPrice','discount'].forEach(id=>$(id).addEventListener('input',calcTotal));
$('saveQuote').onclick=saveQuote;$('newQuote').onclick=newQuote;$('printQuote').onclick=()=>window.print();
$('saveNotes').onclick=()=>{localStorage.setItem('ks_notes',$('testingNotes').value);alert('Testing notes saved.')};
$('testingNotes').value=localStorage.getItem('ks_notes')||'';
newQuote();refreshAll();drawCurve(null,12,35);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
