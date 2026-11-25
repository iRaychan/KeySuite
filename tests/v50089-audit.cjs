const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<body></body>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{
 w.KeySuitePermissions={can:()=>true};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 let split=false;w.KeySuitePricing={repriceSource:(_,mode)=>{
   const val=split&&mode==='assembly'?80:90;
   return {calc:{sourceCurrency:'STOCK',availableCandidates:[{currency:'STOCK',sourcePrice:val,multiplier:1,baseMyr:val}],finalPrice:110,baseMyr:val,brandMargin:0}};
 }};
 w.eval(fs.readFileSync('../costing-audit-v50032.js','utf8'));const open=()=>w.KeySuiteCostingAudit.open({model:'Fixture',qty:2,pricingSource:{product_family:'KV'}});
 await open();const table=()=>d.querySelector('.cost-audit-table');
 assert.deepEqual([...table().tHead.rows[0].cells].map(c=>c.textContent),['Component','Qty','USD','RMB','MYR','STOCK']);
 assert.equal(table().tBodies[0].rows.length,3);
 assert.equal(table().rows[1].cells[2].textContent,'—');
 assert.equal(table().rows[1].cells[5].textContent,'180.00');
 assert.equal(table().rows[2].cells[5].textContent,'1.000');assert(table().querySelector('.cost-route-active'));assert(table().querySelector('.cost-converted'));
 assert.equal(d.querySelector('.cost-trail').tHead.rows[0].cells.length,5);
 assert.match(d.querySelector('.cost-trail').textContent,/Brand Margin/);
 split=true;await open();assert.equal(table().tBodies[0].rows.length,6);assert.match(table().textContent,/Assembly/);assert.match(table().textContent,/Individual/);
 console.log('PASS shared and differing source panels, STOCK multiplier, unavailable cells, selected highlights and separate calculation trails');
 }finally{w.document.body.replaceChildren();await new Promise(resolve=>setTimeout(resolve,0));w.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
