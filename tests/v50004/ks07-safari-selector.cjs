const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  // Exercise the exact macOS Safari code path with its UA. The release QA
  // report keeps real Safari acceptance as a staging requirement.
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({
      viewport:{width:1440,height:1000},
      userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15'
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8264/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.KeySuiteSelectorFirstOpen&&document.getElementById('selectorFrame')?.contentDocument?.body);
    await page.evaluate(()=>{
      document.getElementById('loginView').style.setProperty('display','none','important');
      document.getElementById('appView').classList.remove('hidden');
      document.getElementById('appView').style.setProperty('display','grid','important');
      document.querySelectorAll('.page').forEach(node=>node.classList.remove('active'));
      document.getElementById('selector').classList.add('active');
      document.getElementById('selector').style.setProperty('display','block','important');
      const frame=document.getElementById('selectorFrame'),doc=frame.contentDocument;
      frame.style.zoom='1.35';frame.style.transform='scale(1.35)';
      doc.documentElement.style.zoom='1.35';doc.documentElement.style.width='135%';doc.documentElement.style.transform='scale(1.35)';
      doc.body.style.zoom='1.35';doc.body.style.width='135%';doc.body.style.transform='scale(1.35)';
      window.KeySuiteSelectorFirstOpen.stabilize('selector');
    });
    await page.waitForTimeout(2800);
    await page.evaluate(()=>window.KeySuiteSelectorFirstOpen.stabilize('selector'));
    await page.waitForTimeout(1600);
    const result=await page.evaluate(()=>{
      const frame=document.getElementById('selectorFrame'),doc=frame.contentDocument,host=frame.parentElement;
      return {
        safari:window.KeySuiteSelectorFirstOpen.isMacSafari,
        frameWidth:Math.round(frame.getBoundingClientRect().width),
        hostWidth:Math.round(host.getBoundingClientRect().width),
        frameZoom:frame.style.zoom,frameTransform:frame.style.transform,
        htmlZoom:doc.documentElement.style.zoom,htmlWidth:doc.documentElement.style.width,htmlTransform:doc.documentElement.style.transform,
        bodyZoom:doc.body.style.zoom,bodyWidth:doc.body.style.width,bodyTransform:doc.body.style.transform,
        layout:doc.documentElement.dataset.ksParentSafariZoom,
        standard:!doc.getElementById('enhancedMode')?.checked
      };
    });
    console.log(JSON.stringify({diagnostic:result},null,2));
    assert.equal(result.safari,true);
    assert.equal(result.standard,true);
    assert(result.hostWidth>=900,JSON.stringify(result));
    assert(Math.abs(result.frameWidth-result.hostWidth)<=3,JSON.stringify(result));
    for(const key of ['frameZoom','frameTransform','htmlZoom','htmlWidth','htmlTransform','bodyZoom','bodyWidth','bodyTransform'])assert.equal(result[key],'',key);
    assert.equal(result.layout,'native');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({pass:true,...result},null,2));
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
