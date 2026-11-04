/* Separate downloaded filename from PDF Info.Title for existing report pages. */
(()=>{'use strict';
 const root=new URL('.',document.currentScript.src),busy=new WeakMap();
 function inject(html,source){
  if(typeof html!=='string'||!/<body\b/i.test(html)||html.includes('ks50035PdfDownload'))return html;
  let payload={};try{payload=source?.__KEYSUITE_CURRENT_SELECTION?.()||source?.keysuiteExportPayload||{}}catch(_){}
  const names=window.KeySuitePumpPdfNames,snapshot=source?.__KEYSUITE_PDF_PRESENTATION_SNAPSHOT||{};
  const filename=snapshot.pdfFileTitle||source?.__KEYSUITE_PDF_FILE_TITLE__||names?.nextFromPayload?.(payload)||payload.model||'Pump';
  const title=names?.metadataTitleFromPump?.(payload)||snapshot.pdfMetadataTitle||'';
  const config=JSON.stringify({filename,title}).replace(/</g,'\\u003c');
  const scripts=`<script id="ks50035PdfDownload" src="${new URL('vendor/html2canvas-1.4.1.min.js',root)}"><\/script><script src="${new URL('vendor/jspdf-2.5.2.umd.min.js',root)}"><\/script><script>window.__KEYSUITE_DOWNLOAD_CONFIG__=${config};window.print=()=>{const owner=window.opener?.top||window.parent?.top;return owner.KeySuitePumpPdfDownload.download(window,window.__KEYSUITE_DOWNLOAD_CONFIG__)};<\/script>`;
  return html.replace(/<head\b[^>]*>/i,tag=>tag+scripts);
 }
 async function download(report,config){
  if(busy.has(report))return busy.get(report);
  const task=(async()=>{
   const doc=report.document;await doc.fonts?.ready;
   await Promise.all([...doc.images].map(image=>image.decode?.().catch(()=>{})||Promise.resolve()));
   const printStyle=doc.createElement('style');printStyle.textContent=[...doc.querySelectorAll('style')].map(style=>style.textContent.replace(/@media\s+print/g,'@media screen')).join('\n');doc.head.appendChild(printStyle);
   doc.querySelectorAll('[id$="PendingStyle"]').forEach(node=>node.remove());
   const pages=[...doc.body.querySelectorAll('.report,.tech-page,.dimension-page,.legacy-page,.print-page')].filter(page=>!page.parentElement.closest('.report,.tech-page,.dimension-page,.legacy-page,.print-page')&&report.getComputedStyle(page).display!=='none');
   if(!pages.length)throw Error('Report pages are unavailable.');
   const pdf=new report.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   pdf.setProperties({title:config.title,creator:'KeySuite',author:'KeySuite'});
   for(let index=0;index<pages.length;index++){
    if(index)pdf.addPage();const page=pages[index],canvas=await report.html2canvas(page,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:Math.ceil(page.getBoundingClientRect().width)});
    const width=194,height=canvas.height/canvas.width*width;
    pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',8,8,width,Math.min(281,height));
   }
   const blob=pdf.output('blob'),url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download=config.filename.replace(/\.pdf$/i,'')+'.pdf';doc.body.appendChild(link);link.click();link.remove();
   window.KeySuitePumpPdfNames?.commit?.(config.filename);setTimeout(()=>URL.revokeObjectURL(url),30000);
   printStyle.remove();return blob;
  })();busy.set(report,task);
  try{return await task}catch(error){busy.delete(report);report.alert('PDF generation failed: '+error.message);throw error}
 }
 window.KeySuitePumpPdfDownload={inject,download};
})();
