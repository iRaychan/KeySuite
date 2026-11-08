const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const mode = process.env.PDF_QA_MODE || 'static';
const engine = process.env.PDF_QA_BROWSER || 'chrome';
const base = process.env.PDF_QA_URL || 'http://127.0.0.1:8369';
const output = path.resolve(process.env.PDF_QA_OUTPUT || '../deliverables/Phase_V50058');
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

async function run() {
  const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({channel:'chrome'});
  await fs.mkdir(output, {recursive:true});
  try {
    const context = await browser.newContext({serviceWorkers:'block', acceptDownloads:true});
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (['native','failover'].includes(mode) && url.pathname === '/index.html') {
        const response = await route.fetch();
        const body = (await response.text()).replace('<script src="technical-pdf.js', '<script data-native="true" src="technical-pdf.js');
        return route.fulfill({response, body});
      }
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [], dialogs = [], endpoint = [], assetFailures = [];
    let popups = 0, downloads = 0, capture = false;
    page.on('popup', () => popups++);
    page.on('download', () => downloads++);
    page.on('pageerror', error => { if (capture) errors.push(error.message); });
    page.on('console', msg => { if (capture && msg.type() === 'error') errors.push(msg.text()); });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.pathname === '/api/technical-pdf') endpoint.push(response.status());
      if (capture && url.origin === base && response.status() >= 400) assetFailures.push(url.pathname);
    });
    page.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
    await page.goto(base + '/index.html');
    await page.waitForFunction(() => window.KeySuiteTechnicalPdf && window.KeySuitePumpPdfNames);
    let item = 0;
    for (const [family, folder, cap, pinned] of families) {
      if (mode === 'production' && family !== 'BGF') break;
      if (mode !== 'static' && !['BGF','ES','ISO'].includes(family)) break;
      if (engine === 'webkit' && !['BGF','ES','ISO'].includes(family)) break;
      const directory = '/selector' + (folder ? '-' + folder : '');
      const id = 'selector' + cap + 'Frame';
      const selection = await page.locator('#' + id).elementHandle();
      await selection.evaluate((el, url) => { el.src = url; }, directory + '/index.html');
      const selected = await selection.contentFrame();
      await selected.waitForFunction(() => window.__KEYSUITE_CURRENT_SELECTION);
      const selectedModel = mode === 'production' ? pinned : await select(selected, family);
      assert(selectedModel, family + ' selection fixture missing');
      for (const product of [true, false]) {
        if (mode === 'production' && !product) break;
        if (mode === 'failover' && (family !== 'BGF' || !product)) continue;
        const entry = product ? 'Product' : 'Selection';
        let frame = selected;
        let model = selectedModel;
        if (product) {
          const url = directory + (['','g1','cr','bfi'].includes(folder) ? '/product.html?product=1' : '/index.html?product=1');
          const element = await page.locator('#product' + cap + 'SelectorFrame').elementHandle();
          await element.evaluate((el, src) => { el.src = src; }, url);
          frame = await element.contentFrame();
          await frame.waitForFunction(() => window.__KEYSUITE_CURRENT_SELECTION);
          await frame.evaluate(({model, family}) => {
            window.dispatchEvent(new MessageEvent('message', {data:{
              type:'KEYSUITE_PRODUCT_MODEL',model,pole:family === 'ISO' ? 4 : 2,
            }}));
          }, {model:pinned || selectedModel, family});
          if (family === 'ES' || family === 'ISO') await select(frame, family);
          model = await frame.evaluate(() => window.__KEYSUITE_CURRENT_SELECTION()?.model);
          assert(model, family + ' Product fixture missing');
          if (pinned) assert(model.includes(pinned), model);
        }
        const button = frame.locator('#keysuitePdf,#keysuiteMobileExport');
        const before = downloads;
        capture = true;
        if (mode === 'production') {
          await button.evaluate(el => el.click());
          await page.waitForFunction(() => !document.querySelector('iframe[title="Technical report"]'));
          assert.deepEqual(endpoint, [405]);
          assert.deepEqual(dialogs, ['PDF generation failed: The technical PDF renderer is unavailable.']);
          console.log(JSON.stringify({entry,family,model,endpoint,dialogs,errors,assetFailures}));
          continue;
        }
        const pending = page.waitForEvent('download', {timeout:65000});
        await button.evaluate(el => { el.click(); el.click(); });
        const download = await pending;
        const filename = download.suggestedFilename();
        assert(filename.endsWith('.pdf') && filename.includes(model), filename);
        if (product) assert.match(filename, /^\d{6} - /);
        else assert(filename.startsWith('Item ' + String(++item).padStart(2, '0') + ' - '), filename);
        const sample = path.join(output, [mode,engine,entry,family].join('-') + '.pdf');
        await download.saveAs(sample);
        assert.equal((await fs.readFile(sample)).subarray(0,5).toString(), '%PDF-');
        assert.equal(downloads, before + 1);
        assert.equal(popups, 0);
        assert.deepEqual(dialogs, []);
        capture = false;
        console.log(JSON.stringify({entry,family,model,filename,sample}));
      }
    }
    if (mode !== 'production') {
      assert.deepEqual(assetFailures, mode === 'failover' ? ['/api/technical-pdf'] : []);
      if (mode !== 'failover') assert.deepEqual(errors, []);
      assert.deepEqual(endpoint, mode === 'static' ? [] : Array(downloads).fill(mode === 'native' ? 200 : 501));
      console.log(JSON.stringify({mode,engine,downloads,popups,errors,endpoint}));
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
