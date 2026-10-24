// Shared by the legacy office and 3D campus; uses the existing KeySuite store/PDF workflow.
export function openMonitor(station,session,post){
 let dialog=document.getElementById('quotationDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='quotationDialog';document.body.append(dialog)}
 dialog.replaceChildren();const make=(tag,text,parent=dialog)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
 const close=make('button','Close ×');close.onclick=()=>dialog.close();const person=station.employee;
 make('h2',person?`${person.name} · Desk ${station.deskNo}`:'Unassigned workstation').id='quotationEmployee';
 make('p','Existing KeySuite quotation history · records permitted by your current account').id='quotationAccess';
 const rows=person?(session.quotations||[]).filter(q=>String(q.createdByEmail||'').toLowerCase()===String(person.email).toLowerCase()).sort((a,b)=>String(b.date).localeCompare(String(a.date))):[];
 make('small',`${rows.length} records`).id='quotationCount';const list=make('div','');list.id='quotationList';
 if(!rows.length)make('p',session.quotationError||'No authorized records were returned.',list);
 const detail=make('section','');make('h3','Original KeySuite quotation format',detail);make('p','Select an authorized sealed quotation to view the original PDF, with its existing layout, logo, pricing and permission checks.',detail);const note=make('p','No quotation selected.',detail);note.id='selectedPdfNote';const open=make('button','View original PDF',detail);open.id='openPdfWorkflow';open.disabled=true;
 for(const q of rows){const button=make('button',`${q.reference} · ${q.customer} · ${q.currency} ${Number(q.amount).toFixed(2)} · ${q.date} · ${q.status}`,list);button.className='quotation-record';button.disabled=String(q.status).toLowerCase()!=='sealed';button.onclick=()=>{list.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));note.textContent=q.reference+' · '+q.customer;open.disabled=false;open.onclick=()=>post({type:'KEYHQ_OPEN_PDF',id:q.id})}}
 if(!dialog.open)dialog.showModal();
}
