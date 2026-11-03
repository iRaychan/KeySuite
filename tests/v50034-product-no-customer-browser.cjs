const {chromium}=require('/private/tmp/keysuite-v50033-qa/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({serviceWorkers:'block'});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:8274/tests/');
    await page.setContent('<title>Product ES</title><h1>Product · ES</h1><div class="product-model-row"><h3>ES 80-32</h3><div class="product-model-actions"><button>Curve</button><button>Assembly</button><button>Quote</button></div></div>');
    await page.evaluate(()=>{
      window.KeySuiteApp={getPricingCustomer:()=>null,getSelectedCustomer:()=>null,getCustomers:()=>[]};
      window.KeySuitePermissions={can:()=>true};
      window.KeySuiteComponents={apply:value=>value};
    });
    await page.addScriptTag({url:'http://127.0.0.1:8274/pricing.js?v=50034'});
    const ids=[...fs.readFileSync('pricing.js','utf8').matchAll(/byId\('([^']+)'\)/g)].map(match=>match[1]);
    await page.evaluate(requiredIds=>{
      requiredIds.forEach(id=>{if(!document.getElementById(id)){const element=document.createElement('div');element.id=id;document.body.appendChild(element)}});
      window.KEYSUITE_SECURE_DATA={categories:[],esProducts:[{id:'es80-32',model:'ES 80-32',rarity:'common',variants:[{material:'CI / SS / SS / MS',priceUsd:306.12,priceRmb:null,priceMyr:1541.33}]}],productMultipliers:{ES:{USD:5.5,RMB:.65,MYR:1}},customerPricingRows:[]};
      KeySuitePricing.init(KEYSUITE_SECURE_DATA,{});
    },ids);
    await page.addScriptTag({url:'http://127.0.0.1:8274/costing-audit-v50032.js?v=50034'});
    await page.evaluate(()=>KeySuiteCostingAudit.enhance());
    await page.locator('.keysuite-cost-button').click();
    await page.locator('dialog').waitFor({state:'visible'});
    const text=await page.locator('dialog').innerText();
    assert(text.includes('306.12'));
    assert(text.includes('1,683.66'));
    assert(text.includes('1,541.33'));
    assert(text.includes('Customer pricing not selected'));
    assert(text.includes('Assembly running total'));
    assert(!text.includes('Brand Margin (applied after Transport)'));
    assert(text.includes('Assembly final: RM —'));
    assert(!text.includes('Assembly final: RM 0.00'));
    console.log('PASS Product Costing Audit shows ES source costs without customer/category context and does not substitute zero');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
