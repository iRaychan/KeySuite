const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
module.exports=async function(db){
 await db.exec("reset role;grant usage on schema auth to authenticated;insert into ks_pricing_categories(id,product_rules,is_active) values ('D','{}',true),('C','{}',true);");
 const {as}=require('./v50051-db.cjs');await as(db,'owner','test-links');
 const rows=async()=>(await db.query("select *,case id when 'D' then 'Dealer' else 'Contractor' end as category_name from ks_pricing_categories order by id")).rows;
 const dom=new JSDOM(fs.readFileSync('../index.html','utf8'),{runScripts:'outside-only',url:'https://isolated.invalid'});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id),wait=ms=>new Promise(r=>setTimeout(r,ms));
 try{
 w.CSS={escape:String};w.KEYSUITE_ACCESS={role:'owner'};w.KEYSUITE_SECURE_DATA={categories:[]};
 w.KeySuitePermissions={level:()=>w.KEYSUITE_ACCESS.role==='owner'?'full':'view'};
 const client={from:()=>({select:()=>({or:()=>({order:async()=>({data:await rows()})})})}),rpc:async(name,args)=>{
 assert.equal(name,'keysuite_category_rule_v50088');
 await db.query('select public.keysuite_category_rule_v50088($1,$2,$3)',[args.p_category_id,args.p_product_code,JSON.stringify(args.p_rule)]);return {error:null};
 }};
 w.KeySuiteAuth={getClient:()=>client};
 for(const file of ['product-family-registry-v50047.js','categories.js','v3944-categories.js'])w.eval(fs.readFileSync('../'+file,'utf8'));
 await wait(750);await w.KeySuiteCategories.reload();w.KeySuiteCategories.init(null,w.KEYSUITE_ACCESS);
 $('ks3942CompareBtn').click();
 const header=[...d.querySelectorAll('#ks3942Compare th')].map(n=>n.textContent);
 assert.deepEqual(header,['Category','USD','RMB','MYR','STOCK','Margin %','Normal %','Rare %','Transport RM','Commission','Set Discount','Final Discount','Fuel Charge']);
 const dealer=d.querySelector('[data-category-id=D]'),stock=dealer.querySelector('[data-currency=STOCK]');
 assert(stock.disabled&&!stock.checked);assert.equal(dealer.querySelectorAll('[type=number]').length,4);
 $('ks3944CompareEdit').dispatchEvent(new w.Event('pointerdown'));await wait(80);$('ks3944CompareEdit').dispatchEvent(new w.Event('pointerup'));assert(stock.disabled);
 $('ks3944CompareEdit').dispatchEvent(new w.Event('pointerdown'));await wait(3100);
 const row=d.querySelector('[data-category-id=D]');row.querySelector('[data-currency=STOCK]').checked=true;
 row.querySelector('[data-factor=useCommission]').checked=false;row.querySelector('[data-f=margin]').value='23.45';
 $('compareFilter').value='DEAL';$('compareFilter').dispatchEvent(new w.Event('input'));assert(d.querySelector('[data-category-id=C]').hidden);
 $('clearCompareFilter').click();assert(!d.querySelector('[data-category-id=C]').hidden);
 await $('ks3942SaveCompare').onclick();assert.match($('ks3942CompareMessage').textContent,/saved/);
 $('ks3942Normal').click();d.querySelector('[data-category-open=D]').click();
 assert($('categoryCurrencySTOCK').checked);assert(!$('categoryUseCommission').checked);assert.equal(Number($('categoryMarginInput').value),23.45);
 $('editCategoryRule').dispatchEvent(new w.Event('pointerdown'));await wait(3100);
 $('categoryUseCommission').checked=true;$('categoryForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await wait(100);$('ks3942CompareBtn').click();
 assert(d.querySelector('[data-category-id=D] [data-factor=useCommission]').checked);assert(d.querySelector('[data-category-id=D] [data-currency=STOCK]').checked);
 const saved=(await rows()).find(r=>r.id==='D');assert.equal(Number(saved.chc_margin),.2345);
 await as(db,'viewer','test-links');await assert.rejects(db.query('select public.keysuite_category_rule_v50088($1,$2,$3)',['D','CHC_G2',JSON.stringify(saved.product_rules.CHC_G2)]),/Owner/);
 console.log('PASS 13 Category columns, filter and Clear, hold-to-edit, SQL persistence, Normal View reload, owner-only write');
 }finally{w.close()}
};
