const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { chromium, webkit } = require('playwright');

const engine = process.env.PDF_QA_BROWSER || 'chrome';
const base = process.env.PDF_QA_URL || 'http://127.0.0.1:8370';
const output = path.resolve(process.env.PDF_QA_OUTPUT || '../tmp/pdf-v50059');
const families = [
  ['BGF', 'bgf', 'Bgf', 'BGF 350M'],
  ['ES', 'es', 'Es', '65-26'],
  ['ISO', 'iso', 'Iso', '150-125-400'],
  ['CHC-C6', '', '', null],
  ['CHC-C4', 'g1', '', null],
  ['CR', 'cr', 'Cr', null],
  ['KV', 'kv', 'Kv', null],
  ['BFI', 'bfi', 'Bfi', null],
  ['BSW', 'bsw', 'Bsw', null],
];
const duties = [[6,20],[12,30],[3,12],[25,25],[40,15],[2,8],[10,50],[90,30],[150,20]];

async function select(frame, family) {
  if (family === 'ISO' || family === 'ES') {
    return frame.evaluate(iso => {
      document.getElementById('flow').value = iso ? '1000' : '90';
      document.getElementById('flowUnit').value = iso ? 'usgpm' : 'm3h';
      document.getElementById('head').value = iso ? '55' : '90';
      document.getElementById('run').click();
      return window.__KEYSUITE_CURRENT_SELECTION()?.model;
    }, family === 'ISO');
  }
  for (const [flow, head] of duties) {
    const model = await frame.evaluate(([flow, head]) => {
      document.getElementById('flow').value = flow;
      document.getElementById('head').value = head;
      document.getElementById('go').click();
      return window.__KEYSUITE_CURRENT_SELECTION()?.model;
    }, [flow, head]);
    if (model) return model;
  }
}

async function run(){
  const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({channel:'chrome'});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    const unexpected = [];
    context.on('request', request => {
      const url = new URL(request.url());
      if(/technical-pdf-server|\/api\/technical-pdf|html2canvas|jspdf|pump-pdf-download/.test(url.pathname)) unexpected.push(url.pathname);
    });
    await context.route(url=>/^https?:$/.test(url.protocol)&&url.origin!==base, route=>route.abort());
    await context.route(url=>url.origin===base&&url.pathname==='/technical-pdf.js', route => {
        const source = readFileSync(path.join(__dirname,'../technical-pdf.js'),'utf8');
        // Instrument the native print boundary because headless browsers do
        // not display the OS print dialog. Everything upstream runs normally.
        const body = source.replace('window.print.bind(window)', '()=>{document.documentElement.dataset.printCalled=String(1+Number(document.documentElement.dataset.printCalled||0))}');
        assert.notEqual(body,source);
        return route.fulfill({contentType:'application/javascript',body});
    });
    const page = await context.newPage();
    let downloads=0;
    context.on('page', tab=>tab.on('download',()=>downloads++));
    const dialogs=[];
    const listen = tab=>tab.on('dialog', d=>{dialogs.push(d.message());void d.dismiss();});
    listen(page);
    context.on('page',listen);
    await page.goto(base+'/index.html');
    await page.waitForFunction(()=>window.KeySuiteTechnicalPdf && window.KeySuitePumpPdfNames);
    let item=0;
    const keyBotOnly=process.env.PDF_QA_KEYBOT_ONLY==='1';
    for (const [family,folder,cap,pinned] of keyBotOnly?[]:families){
      const directory='/selector'+(folder?'-'+folder:'');
      const handle=await page.locator('#selector'+cap+'Frame').elementHandle();
      await handle.evaluate((el,url)=>{el.src=url},directory+'/index.html');
      const selected=await handle.contentFrame();
      await selected.waitForURL('**'+directory+'/index.html');
      await selected.waitForFunction(()=>window.__KEYSUITE_CURRENT_SELECTION);
      const selectedModel=await select(selected,family);
      assert(selectedModel,family);
      for(const product of [true,false]){
        let frame=selected, model=selectedModel;
        if(product){
          const entry=['','g1','cr','bfi'].includes(folder)?'/product.html':'/index.html';
          const el=await page.locator('#product'+cap+'SelectorFrame').elementHandle();
          await el.evaluate((el,url)=>{el.src=url},directory+entry+'?product=1');
          frame=await el.contentFrame();
          await frame.waitForURL('**'+directory+entry+'?product=1');
          await frame.waitForFunction(()=>window.__KEYSUITE_CURRENT_SELECTION);
          await frame.evaluate(({model,family})=>window.dispatchEvent(new MessageEvent('message',{data:{type:'KEYSUITE_PRODUCT_MODEL',model,pole:family==='ISO'?4:2}})),{model:pinned||selectedModel,family});
          if(['ES','ISO'].includes(family)) await select(frame,family);
          model=await frame.evaluate(()=>window.__KEYSUITE_CURRENT_SELECTION()?.model);
          assert(model?.includes(pinned||selectedModel),model);
        }
        const popupPending=page.waitForEvent('popup');
        await frame.locator('#keysuitePdf,#keysuiteMobileExport').evaluate(el=>el.click());
        const popup=await popupPending;
        await popup.bringToFront();
        try {
          await popup.waitForFunction(()=>document.documentElement.dataset.printCalled==='1',null,{timeout:16000});
        } catch (error) {
          console.error('Print report state',await popup.evaluate(()=>({
            title:document.title,ready:document.readyState,print:typeof window.__KEYSUITE_REQUEST_PRINT__,
            printCalled:document.documentElement.dataset.printCalled,button:document.querySelector('#keysuiteReportPrint')?.hidden,
            images:[...document.images].map(img=>[img.currentSrc.slice(0,100),img.complete,img.naturalWidth]),
          })),dialogs);
          throw error;
        }
        const title=await popup.title();
        assert(title.includes(model),title);
        if(product)assert.match(title,/^\d{6} - /);
        else assert(title.startsWith('Item '+String(++item).padStart(2,'0')+' - '),title);
        const content=await popup.locator('body').textContent();
        assert(content.includes(model) || content.includes(model.replace(/^[A-Z]+ /,'')));
        if(['ES','ISO'].includes(family)){
          const dim=await popup.locator('.dimension-drawing img').evaluate(img=>[img.naturalWidth,img.naturalHeight]);
          assert.deepEqual(dim,[1911,858]);
        }
        if(engine==='chrome' && product && ['BGF','ES','ISO'].includes(family)){
          await popup.pdf({path:path.join(output,family+'.pdf'),preferCSSPageSize:true,printBackground:true});
        }
        await popup.locator('#keysuiteReportPrint').evaluate(el=>el.click());
        await popup.waitForFunction(()=>document.documentElement.dataset.printCalled==='2');
        await popup.close();
        console.log('PASS',engine,product?'Product':'Selection',family,title);
      }
    }
    if(!keyBotOnly){
    const popupPending=page.waitForEvent('popup');
    await page.evaluate(()=>{
      const row=document.createElement('div');
      row.dataset.pumpData=JSON.stringify(document.querySelector('#selectorIsoFrame').contentWindow.__KEYSUITE_CURRENT_SELECTION());
      exportPumpDataSheet(row,'ISO saved quotation item');
    });
    const itemPopup=await popupPending;
    await itemPopup.waitForFunction(()=>document.documentElement.dataset.printCalled==='1');
    assert.equal(await itemPopup.title(),'ISO saved quotation item');
    await itemPopup.close();
    }
    await page.evaluate(async base=>{
      window.KEYSUITE_ACCESS={role:'owner',company_id:'local-test'};
      const selector_url=base+'/selector-es/?source=telegram&auto=curve&flowM3h=90&headM=90&esPole=2';
      window.KeySuiteAuth.getClient=()=>({functions:{invoke:async (name,{body})=>{
        if(name!=='keysuite-keyai'||body.action!=='list_inbox')throw Error('Unexpected KeyBot request');
        return {data:{items:[{id:'local-test',status:'curve_ready',ai_result:{selector_url}}]}};
      }}});
      await window.KeySuiteKeyAI.loadInbox(true);
    },base);
    const inboxPopup=page.waitForEvent('popup');
    await page.locator('[data-keyai-pdf-id="local-test"]').evaluate(button=>button.click());
    const telegram=await inboxPopup;
    await telegram.bringToFront();
    try{
      await telegram.waitForFunction(()=>document.documentElement.dataset.printCalled==='1',null,{timeout:12000});
    }catch(error){
      console.error('KeyBot print state',await telegram.evaluate(()=>({
        url:location.href,title:document.title,ready:document.readyState,
        print:typeof window.__KEYSUITE_REQUEST_PRINT__,button:document.querySelector('#keysuiteReportPrint')?.hidden,
        images:[...document.images].map(img=>[img.currentSrc.slice(0,85),img.complete,img.naturalWidth]),
      })),dialogs);
      throw error;
    }
    assert.match(await telegram.title(),/ES 65-26/);
    await telegram.close();
    assert.deepEqual(dialogs,[]);
    assert.deepEqual(unexpected,[]);
    assert.equal(downloads,0);
    console.log('PASS',engine,'quotation item, Telegram in-place print, and no automatic downloads or PDF service requests');
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
