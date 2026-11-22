"""Create an offline Safari test fixture from the shipped application and regression code."""
from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
test=(root/'tests/v50085-corrective.cjs').read_text()
body=test[test.index('async function main(){'):]
body=body[:body.index('main().then(')]
names=['permissions.js','payment-terms.js','commercial-identity.js','app.js','assembly.js','quotation-templates.js','v40001-multibrand.js','chc-g1-product-data-v41411.js','product.js','manual-price-v50011.js','costing-audit-v50032.js','g-data-v50068.js','g-series-v50068.js','bgf-v50006.js']
sources={name:(root/name).read_text() for name in names}
prefix=r'''
const sources=SOURCE_MAP;
window.KEYSUITE_VERSION='5.00.85';document.title='KeySuite V5.00.85 CORRECTED R1';
document.getElementById('loginView').style.display='none';document.getElementById('appView').classList.remove('hidden');
const nativeCanvasContext=HTMLCanvasElement.prototype.getContext;
const w=window,doc=document,checks=[],outputs={};
const process={env:{}};const __dirname='tests';
const fs={writeFileSync:(name,text)=>{outputs[name]=text;}};
const path={join:(...p)=>p.join('/')};
const dom={serialize:()=>document.documentElement.outerHTML,window:{close(){}}};
const run=s=>window.eval(s),read=n=>sources[n],plain=x=>JSON.parse(JSON.stringify(x));
const load=n=>{const el=document.createElement('script');el.textContent=read(n)+'\n//# sourceURL='+n;document.head.appendChild(el)};
function assert(value,message){if(!value)throw Error(message||'Assertion failed')}
assert.equal=(a,b,msg)=>assert(a===b,(msg||'Exact equality')+'\n'+JSON.stringify(a)+' != '+JSON.stringify(b));
assert.deepEqual=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),(msg||'Deep equality')+'\n'+JSON.stringify(a)+' != '+JSON.stringify(b));
const pass=s=>{checks.push(s);console.log('PASS '+s)};
w.CSS={escape:v=>String(v)};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'))};
w.alert=m=>{throw Error('Unexpected alert '+m)};w.confirm=()=>true;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){} disconnect(){}};w.IntersectionObserver=w.ResizeObserver;
w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:s=>({width:String(s).length*6})});w.fetch=()=>{throw Error('External request blocked')};w.KEYLARGO_LOGO_DATA='data:image/png;base64,';
w.KEYSUITE_ACCESS={email:'test@example.invalid',role:'owner',company_id:'isolated',quotation_prefix:'QA'};w.KEYSUITE_PROFILE={...w.KEYSUITE_ACCESS,display_name:'Isolated tester'};w.KEYSUITE_SECURE_DATA={categories:[],users:[]};
'''
prefix=prefix.replace('SOURCE_MAP',json.dumps(sources))
finish=r'''
main().then(()=>{
 document.documentElement.dataset.correctiveTests='PASS';
 const banner=document.createElement('section');banner.id='corrective-result';banner.className='no-print';banner.style.cssText='position:fixed;inset:8px 8px auto 245px;z-index:99999;max-height:45vh;overflow:auto;background:#dcfce7;padding:16px;border:2px solid #15803d;font:14px Arial';
 banner.textContent='PASS — Corrected V5.00.85 R1 — '+checks.length+' regression groups. All networking blocked; in-memory save/reopen only.';
 const details=document.createElement('pre');details.textContent=checks.join('\n');banner.appendChild(details);document.body.appendChild(banner);
 window.__correctiveEvidence={checks,outputs};
 HTMLCanvasElement.prototype.getContext=nativeCanvasContext;
 buildPrintQuotation();document.body.classList.add('print-complete');
 const evidence=document.createElement('a');evidence.textContent='Download Safari test evidence';evidence.download='v50085-corrective-safari-results.json';evidence.href=URL.createObjectURL(new Blob([JSON.stringify(window.__correctiveEvidence,null,2)],{type:'application/json'}));banner.appendChild(evidence);
 const download=document.createElement('button');download.textContent='Download native quotation PDF';download.onclick=async()=>{try{download.disabled=true;const snapshot=document.getElementById('printQuotationDocument').cloneNode(true);snapshot.querySelectorAll('img').forEach(img=>img.remove());const pdf=await quotationPdfBlob(snapshot,quotationPrintCss(),s=>download.textContent=s);const a=document.createElement('a');a.href=URL.createObjectURL(pdf);a.download='KeySuite_V5.00.85_CORRECTED_SAFARI_EXPORT.pdf';a.textContent='Save native PDF';banner.appendChild(a);a.click();download.textContent='Native quotation PDF generated';}catch(e){download.textContent='Native PDF failed: '+e.message;download.disabled=false}};banner.appendChild(download);
}).catch(e=>{document.documentElement.dataset.correctiveTests='FAIL';const pre=document.createElement('pre');pre.id='corrective-result';pre.style.cssText='position:fixed;inset:0;z-index:999999;background:white;color:red;overflow:auto';pre.textContent='FAIL\n'+e.stack;document.body.appendChild(pre)});
'''
html=(root/'index.html').read_text()
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',html,flags=re.I)
html=re.sub(r'(<iframe\b[^>]*\bsrc=)["\'][^"\']*["\']',r'\1"about:blank"',html,flags=re.I)
script=(prefix+body+finish).replace('</script','<\\/script')
html=html.replace('</body>','<script>'+script+'</script></body>')
(root/'tests/v50085-corrective-browser.html').write_text(html)
print('Offline browser fixture created; application source embedded verbatim; external startup scripts removed.')
