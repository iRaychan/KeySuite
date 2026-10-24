const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{for(const engine of ['chrome','webkit']){
 const browser=await (engine==='chrome'?chromium.launch({channel:'chrome',headless:true}):webkit.launch({headless:true}));
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8259/keyhq/');await page.waitForFunction(()=>window.KeyHQCampus?.snapshot().actors.length===2);
 const snap=()=>page.evaluate(()=>KeyHQCampus.snapshot());
 const before=await snap();await page.mouse.move(800,700);await page.mouse.wheel(0,-180);await page.waitForTimeout(500);assert((await snap()).camera.radius<before.camera.radius);
 await page.mouse.wheel(0,180);await page.waitForTimeout(500);assert(Math.abs((await snap()).camera.screenOffset[1]-before.camera.screenOffset[1])<.01);
 await page.click('[data-floor="1"]');await page.click('[data-action="work"]');await page.waitForTimeout(1200);
 const s=await snap(),actor=s.actors.find(a=>a.id===s.selected),station=s.workstations.find(w=>w.deskNo===2&&w.floor==='1');assert.deepEqual(actor.position,station.seat);
 await page.mouse.click((station.screen[0]+1)*720,(1-station.screen[1])*500);await page.waitForSelector('#quotationDialog[open]');await page.click('#quotationDialog button');
 await page.screenshot({path:`outputs/KeyHQ_V0.9/${engine}-office.png`});assert.deepEqual(errors,[]);console.log(engine+' Stage A passed');await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});
