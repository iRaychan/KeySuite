/* Behind the KeySuite host's authenticated same-origin /api/technical-pdf route. */
'use strict';
const { createServer } = require('node:http');
const { chromium } = require('playwright');

const maxBytes = 20 * 1024 * 1024;
const maxJobs = 2;
let browserPromise;
let activeJobs = 0;

function browser() {
  if (!browserPromise) {
    const channel = process.env.KEYSUITE_PDF_CHROMIUM_CHANNEL;
    browserPromise = chromium.launch({headless:true, chromiumSandbox:true, ...(channel?{channel}:{})})
      .then(instance => {
        instance.on('disconnected', () => { browserPromise = undefined; });
        return instance;
      }, error => { browserPromise = undefined; throw error; });
  }
  return browserPromise;
}
async function render({html,title}) {
  const context = await (await browser()).newContext({
    javaScriptEnabled:false,
    serviceWorkers:'block',
    viewport:{width:1280,height:1000},
  });
  try {
    // The report carries its own assets. It cannot make network or file requests.
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    const css=`<style>
      @page { size: A4 !important; }
      html, body, body * { font-family: Arial, sans-serif !important; }
      * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    </style>`;
    const metadata=typeof title==='string'&&title
      ? '<title>'+title.slice(0,300).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</title>'
      : '';
    const report=html.replace(/<\/head>/i,css+'</head>')
      .replace(/<head\b[^>]*>/i,head=>head+metadata);
    await page.emulateMedia({media:'print'});
    await page.setContent(report, {waitUntil:'load',timeout:15000});
    return await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true,timeout:20000});
  } finally {
    await context.close();
  }
}

async function handleTechnicalPdf(req,res) {
  res.setHeader('Cache-Control','no-store');
  const expectedOrigin=process.env.KEYSUITE_PDF_ORIGIN;
  if(req.method!=='POST'||!/^application\/json\b/i.test(req.headers['content-type']||'')){
    res.writeHead(405).end();return;
  }
  if(!expectedOrigin||req.headers.origin!==expectedOrigin){res.writeHead(403).end();return;}
  if(activeJobs>=maxJobs){res.writeHead(503).end();return;}
  if(Number(req.headers['content-length'])>maxBytes){res.writeHead(413).end();return;}
  activeJobs++;
  try {
    const chunks=[];
    let bytes=0;
    for await (const chunk of req) {
      bytes+=chunk.length;
      if(bytes>maxBytes){res.writeHead(413).end();return;}
      chunks.push(chunk);
    }
    let payload;
    try { payload=JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch (_) { res.writeHead(400).end();return; }
    if(typeof payload?.html!=='string'||!/^<!doctype html>/i.test(payload.html)){
      res.writeHead(400).end();return;
    }
    const pdf=await render(payload);
    res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':pdf.length,'X-Content-Type-Options':'nosniff'}).end(pdf);
  } catch (error) {
    console.error('Technical PDF failed:',error.message);
    if(!res.headersSent)res.writeHead(500).end();
  } finally {
    activeJobs--;
  }
}
if(require.main===module){
  if(!process.env.KEYSUITE_PDF_ORIGIN)throw Error('Set KEYSUITE_PDF_ORIGIN to the authorized KeySuite origin.');
  createServer((req,res)=>{
    if(req.url==='/api/technical-pdf')void handleTechnicalPdf(req,res);
    else res.writeHead(404).end();
  }).listen(Number(process.env.KEYSUITE_PDF_PORT||8765),'127.0.0.1');
}
module.exports={handleTechnicalPdf};
