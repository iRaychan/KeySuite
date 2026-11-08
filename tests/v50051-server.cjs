// Local-only database-backed QA. Never connects to Supabase.
const http=require('http'),fs=require('fs'),path=require('path');
const {create,as,rpc}=require('./v50051-db.cjs');
const port=Number(process.env.KEYSTOCK_TEST_PORT||8301);
const root=path.resolve(__dirname,'..');
const readOnly=process.env.KEYSTOCK_READ_ONLY==='1';
(async()=>{const db=process.env.KEYSTOCK_V101==='1'?(await require('./v50052-db.cjs').fixture()).db:await create();await as(db,readOnly?'user':'owner','test-a',!readOnly);const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/__stock_rpc'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;const p=JSON.parse(body);try{const data=await rpc(db,p.p_action,p.p_payload);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:null}));}catch(e){res.end(JSON.stringify({data:null,error:{message:e.message}}));}return;}
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  if(requested==='/__safari_fixture.html'){
    res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'none'");
    const fixture=`<script>document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.textContent='Open local KeyStock test';b.className='btn';b.style='position:fixed;top:12px;left:12px;z-index:99999';b.onclick=()=>{window.KEYSUITE_ACCESS={email:'qa@example.invalid',role:'owner',company_id:'test-a'};window.KEYSUITE_PROFILE={email:'qa@example.invalid',role:'owner',company_id:'test-a'};document.body.classList.remove('auth-locked');document.getElementById('loginView').classList.add('hidden');document.getElementById('loadingView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');document.querySelector('.app').style.setProperty('display','grid','important');window.KeySuiteAuth.getClient=()=>({rpc:async(name,args)=>name==='keysuite_stock_v100'?fetch('/__stock_rpc',{method:'POST',body:JSON.stringify(args)}).then(r=>r.json()):{data:null,error:null}});b.remove();KeySuiteApp.showPage('keyStock');};document.body.append(b);});<\/script>`;
    res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('</body>',fixture+'</body>'));return;
  }
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }catch(e){res.statusCode=404;res.end(e.message);}
 });server.listen(port,'127.0.0.1',()=>console.log('Local KeyStock test server: http://127.0.0.1:'+port));
})();
