/* Separate downloaded filename from PDF Info.Title for existing report pages. */
(()=>{'use strict';
 const root=new URL('.',document.currentScript.src),busy=new WeakMap();
 function openSelectionReport(source,html){
  const url=new URL('pump-pdf-report.html',root);
  const reportHtml=inject(html,source);
  const report=source.open(url.href,'_blank');
  if(!report){source.alert('Allow pop-ups to export the PDF.');return;}
  // Wait for the same-origin host so the report's images and scripts load in
  // its real document, including on browsers that restrict about:blank popups.
  const deadline=Date.now()+15000;
  const timer=setInterval(()=>{
   if(report.closed){clearInterval(timer);return;}
   if(Date.now()>=deadline){clearInterval(timer);source.alert('The PDF report did not open. Please try again.');return;}
   try{
    if(report.location.href!==url.href||report.document.readyState!=='complete')return;
    clearInterval(timer);
    report.document.open();
    report.document.write(reportHtml);
    report.document.close();
   }catch(error){clearInterval(timer);source.alert('PDF generation failed: '+error.message);}
  },50);
 }
 function inject(html,source){
  if(typeof html!=='string'||!/<body\b/i.test(html)||html.includes('ks50035PdfDownload'))return html;
  let payload={};try{payload=source?.__KEYSUITE_CURRENT_SELECTION?.()||source?.keysuiteExportPayload||{}}catch(_){}
  const names=window.KeySuitePumpPdfNames,snapshot=source?.__KEYSUITE_PDF_PRESENTATION_SNAPSHOT||{};
  const filename=snapshot.pdfFileTitle||source?.__KEYSUITE_PDF_FILE_TITLE__||names?.nextFromPayload?.(payload)||payload.model||'Pump';
  const title=names?.metadataTitleFromPump?.(payload)||snapshot.pdfMetadataTitle||'';
  const config=JSON.stringify({filename,title,itemTicket:names?.ticket?.(filename)||null}).replace(/</g,'\\u003c');
  const scripts=`<script id="ks50035PdfDownload" defer src="${new URL('vendor/html2canvas-1.4.1.min.js',root)}"><\/script><script defer src="${new URL('vendor/jspdf-2.5.2.umd.min.js',root)}"><\/script><script>window.__KEYSUITE_DOWNLOAD_CONFIG__=${config};window.print=()=>{const owner=window.opener?.top||window.parent?.top;return owner.KeySuitePumpPdfDownload.download(window,window.__KEYSUITE_DOWNLOAD_CONFIG__)};<\/script>`;
  return html.replace(/<head\b[^>]*>/i,tag=>tag+scripts)
   .replace(/<script src="[^"]*\/pdf-optimization\.js[^"]*"/i,
    `<script defer src="${new URL('pdf-optimization.js?v=42508',root)}"`);
 }
 async function render(report,title){
   const doc=report.document;await doc.fonts?.ready;
   await Promise.all([...doc.images].map(image=>image.decode?.().catch(()=>{})||Promise.resolve()));
   const printStyle=doc.createElement('style');printStyle.textContent=[...doc.querySelectorAll('style')].map(style=>style.textContent.replace(/@media\s+print/g,'@media screen')).join('\n');doc.head.appendChild(printStyle);
   doc.querySelectorAll('[id$="PendingStyle"]').forEach(node=>node.remove());
   const pages=[...doc.body.querySelectorAll('.report,.tech-page,.dimension-page,.legacy-page,.print-page')].filter(page=>!page.parentElement.closest('.report,.tech-page,.dimension-page,.legacy-page,.print-page')&&report.getComputedStyle(page).display!=='none');
   if(!pages.length)throw Error('Report pages are unavailable.');
   const pdf=new report.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   pdf.setProperties({title,creator:'KeySuite',author:'KeySuite'});
   for(let index=0;index<pages.length;index++){
    if(index)pdf.addPage();
    const page=pages[index],bounds=page.getBoundingClientRect();
    const drawing=page.querySelector('#esPumpsetDimensionDrawing, #isoPumpsetDimensionDrawing');
    let artwork=null;
    if(drawing){
     const response=await fetch(drawing.currentSrc||drawing.src);
     if(!response.ok||!drawing.naturalWidth)throw Error('Original dimension drawing is unavailable.');
     artwork={bytes:new report.Uint8Array(await response.arrayBuffer()),bounds:drawing.getBoundingClientRect()};
    }
    const canvas=await report.html2canvas(page,{
     scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:Math.ceil(bounds.width),
     ...(drawing?{onclone:clone=>{clone.getElementById(drawing.id).style.visibility='hidden';}}:{})
    });
    const width=Math.min(194,281*canvas.width/canvas.height),height=canvas.height/canvas.width*width;
    const left=(210-width)/2;
    pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',left,8,width,height);
    if(artwork){
     const box=artwork.bounds,scale=width/bounds.width;
     pdf.addImage(artwork.bytes,'PNG',left+(box.left-bounds.left)*scale,8+(box.top-bounds.top)*scale,box.width*scale,box.height*scale,undefined,'FAST');
    }
   }
   printStyle.remove();
   return pdf.output('blob');
 }
 async function download(report,config){
  if(busy.has(report))return busy.get(report);
  const task=(async()=>{
   const blob=await render(report,config.title);
   if(report.closed)return null;
   const doc=report.document,url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download=config.filename.replace(/\.pdf$/i,'')+'.pdf';doc.body.appendChild(link);link.click();link.remove();
   window.KeySuitePumpPdfNames?.commit?.(config.filename,config.itemTicket);setTimeout(()=>URL.revokeObjectURL(url),30000);
   return blob;
  })();busy.set(report,task);
  try{return await task}catch(error){busy.delete(report);if(!report.closed)report.alert('PDF generation failed: '+error.message);throw error}
 }
 window.KeySuitePumpPdfDownload={inject,download,openSelectionReport,render};
})();
