import {PhoneChat} from './keyhq/campus/chat.js';

const launcher=window.KeySuiteKeyHQ;
const button=document.getElementById('dashboardMessengerButton');
const count=document.getElementById('dashboardMessengerCount');

if(launcher?.social&&button&&count){
  const mount=document.createElement('div');
  mount.className='top-actions keysuite-chat-mount';
  mount.hidden=true;
  document.body.append(mount);

  const style=document.createElement('style');
  style.id='keysuiteMessengerStyle';
  style.textContent=`
    .dashboard-tool-count{position:absolute;right:-5px;top:-7px;display:grid;place-items:center;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#b42318;color:#fff;font-size:10px;font-weight:800;box-shadow:0 0 0 2px #fff}.dashboard-tool-count[hidden]{display:none}
    #phoneChat.phone{box-sizing:border-box;width:390px;height:min(760px,90dvh);max-width:94vw;padding:18px 12px 12px;border:7px solid #8e9caa;border-radius:42px;background:#f2f5f1;box-shadow:0 0 0 2px #263340,0 24px 90px #0007;color:#183c36;overflow:visible}
    #phoneChat.phone:not([open]){display:none}#phoneChat.phone[open]{position:fixed;inset:auto 24px 24px auto;margin:0;z-index:7000}#phoneChat.phone::backdrop{background:#17342e44;backdrop-filter:blur(5px)}
    #phoneChat .island{width:100px;height:22px;border-radius:18px;background:#172d2d;margin:0 auto 18px}#phoneChat header{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap}#phoneChat header strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#phoneChat header button{padding:6px 9px}
    #phoneChat .phone-status{font-size:11px;color:#55746a;padding:0 10px;min-height:30px}#phoneChat input[type=search]{width:100%;padding:12px;border:0;border-radius:15px;background:#e4ece5}#phoneChat .phone-content{height:calc(100% - 220px);overflow:auto;overscroll-behavior:contain;padding:10px 4px}
    #phoneChat .phone-compose{display:flex;gap:6px;align-items:center;margin-top:8px}#phoneChat .phone-compose textarea{resize:none;flex:1;min-width:0;border-radius:18px;border:1px solid #cbd9d0;padding:10px;font:inherit}#phoneChat .phone-compose button{border-radius:20px;background:#1c6555;color:white}
    #phoneChat .bubble{width:fit-content;max-width:86%;padding:10px 13px;margin:10px 0;border-radius:19px;background:white;overflow-wrap:anywhere}#phoneChat .bubble p{white-space:pre-wrap;margin:0 0 5px}#phoneChat .bubble small{font-size:10px;opacity:.7}#phoneChat .outgoing{margin-left:auto;background:#d4e6d8;border-bottom-right-radius:5px}#phoneChat .incoming{border-bottom-left-radius:5px}
    #phoneChat .chat-person{display:flex;align-items:center;gap:10px;width:100%;margin:8px 0;padding:14px;text-align:left;border:0;border-bottom:1px solid #dce7dc;background:transparent;color:#183c36}#phoneChat .chat-person small{margin-left:auto}#phoneChat .chat-avatar{background:#d9e4d0;border-radius:50%;padding:10px 14px}#phoneChat [hidden]{display:none!important}
    #phoneChat.expanded{width:min(780px,calc(100vw - 28px));height:min(850px,calc(100vh - 40px))}#phoneChat::after{content:'';position:absolute;left:-7px;top:120px;width:4px;height:65px;background:#9da8b4;border-radius:3px}#phoneChat::before{content:'';position:absolute;right:-7px;top:150px;width:4px;height:45px;background:#9da8b4;border-radius:3px}
    .message-notice{position:fixed;top:22px;right:22px;z-index:7100;background:#f5f9f0;color:#174638;padding:16px;border:1px solid #a9c9b9;border-radius:18px;box-shadow:0 8px 30px #1234}
    @media(max-width:600px){#phoneChat.phone[open]{right:10px;bottom:10px;max-height:calc(100vh - 20px)}}
  `;
  document.head.append(style);

  let context=launcher.getCachedContext?.()||{};
  const toast=message=>{
    let node=document.getElementById('keysuiteMessengerToast');
    if(!node){node=document.createElement('div');node.id='keysuiteMessengerToast';node.setAttribute('role','status');Object.assign(node.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:'7200',padding:'10px 16px',borderRadius:'12px',background:'#17365d',color:'#fff'});document.body.append(node)}
    node.textContent=message;node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.hidden=true,3500);
  };
  const chat=new PhoneChat({post:data=>launcher.social.handle(data),session:()=>context,toast,onSessions:()=>{}});
  chat.button.hidden=true;

  function updateButton(data={}){
    const unread=Number(data.unread||0)+(data.groupCounts||[]).reduce((total,row)=>total+Number(row.unread||0),0);
    count.textContent=unread>99?'99+':String(unread);
    count.hidden=!unread;
    button.classList.toggle('has-unread',unread>0);
    button.setAttribute('aria-label',unread?`Open KeyHQ Messenger Chat, ${unread} unread`:'Open KeyHQ Messenger Chat');
    button.title=unread?`KeyHQ Messenger Chat · ${unread} unread`:'KeyHQ Messenger Chat';
  }

  async function refreshContext(force=false){
    button.disabled=true;
    try{const cached=launcher.getCachedContext?.()||{};context=!force&&cached.userId?cached:await launcher.getContext();chat.update(launcher.social.data);updateButton(launcher.social.data)}
    catch(error){toast('Messenger could not connect. '+String(error?.message||error))}
    finally{button.disabled=false}
  }

  launcher.social.subscribe(event=>{
    if(event.type==='KEYHQ_SOCIAL_STATE'){chat.update(event.data);updateButton(event.data)}
    else if(event.type==='KEYHQ_SOCIAL_RESULT')chat.result(event);
  });
  button.addEventListener('click',async()=>{
    await refreshContext();
    if(!chat.phone.open)chat.phone.show();
    chat.render();
  });
  updateButton(launcher.social.data);
  refreshContext();
  window.KeySuiteMessenger={open:()=>button.click(),refresh:()=>refreshContext(true),chat};
}
