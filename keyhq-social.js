/* Event-driven KeyHQ adapter. Messenger may remain available in the elected tab; campus transport is active only while KeyHQ is visible. */
(()=>{'use strict';
const TABLE='ks_keyhq_messages_v09';
const MESSAGE_COLUMNS='id,company_id,sender_id,recipient_id,nonce,body,created_at,read_at';
const GROUP_MESSAGE_COLUMNS='id,conversation_id,sender_id,nonce,body,created_at';
const RECONCILE_MS=300000;

class KeyHQSocial{
 constructor(){
  this.epoch=0;this.client=null;this.company='';this.user='';this.auth=null;this.session=crypto.randomUUID();
  this.backgroundChannel=null;this.campusChannel=null;this.heartbeatTimer=0;this.reconcileTimer=0;this.groupTimer=0;this.sessionTimer=0;
  this.backgroundReady=false;this.campusActive=false;this.actorStateReady=false;this.refreshingMessenger=null;this.refreshingCampus=null;
  this.data={state:'unavailable',messages:[],sessions:[],presence:[],groups:[],groupMessages:[],groupCounts:[],rides:[],games:[],gameInputs:[]};
  this.notified=new Set();this.directory=[];this.listeners=new Set();
  const Coordinator=window.KeyHQTabCoordinator;
  this.coordinator=Coordinator?new Coordinator(()=>this.syncTransport(),(kind,payload)=>this.receiveShared(kind,payload)):{leader:true,start(){},stop(){},setCampusActive(){},publish(){}};
 }
 emit(type,data={}){const event={type,...data};document.getElementById('keyhqFrame')?.contentWindow?.postMessage(event,location.origin);for(const listener of this.listeners){try{listener(event)}catch(error){console.error('KeyHQ social listener failed.',error)}}}
 subscribe(listener){if(typeof listener!=='function')return()=>{};this.listeners.add(listener);return()=>this.listeners.delete(listener)}
 isLeader(){return this.coordinator.leader!==false}
 share(kind,payload){if(this.isLeader())this.coordinator.publish(kind,payload)}
 publishState(){this.emit('KEYHQ_SOCIAL_STATE',{data:this.data});this.notify();this.share('social-state',this.data)}
 receiveShared(kind,payload){
  if(kind==='leader-released'){this.coordinator.check?.(true);return}
  if(kind==='request-sync'&&this.isLeader()){if(payload?.resource==='campus')this.refreshCampus();else if(payload?.resource==='groups')this.refreshGroupMetadata();else this.refreshMessenger();return}
  if(this.isLeader())return;
  if(kind==='social-state'&&payload){this.data=payload;this.actorStateReady=Boolean(payload.actorStateReady);this.emit('KEYHQ_SOCIAL_STATE',{data:this.data});this.notify()}
  if(kind==='actor-state'&&payload)this.emit('KEYHQ_ACTOR_STATE',payload);
  if(kind==='game-state'&&payload)this.emit('KEYHQ_GAME_STATE',payload);
 }
 async connect(client,company){
  if(this.client===client&&this.company===company&&this.user)return;
  const requestedCampus=this.campusActive;await this.disconnect();this.campusActive=requestedCampus&&!document.hidden;if(!client||!company)return;const epoch=this.epoch,result=await client.auth.getUser();
  if(epoch!==this.epoch||result.error||!result.data?.user)return;
  this.client=client;this.company=company;this.user=result.data.user.id;
  this.auth=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id&&session.user.id!==this.user){this.disconnect();this.emit('KEYHQ_SESSION_CLEARED')}}).data?.subscription;
  this.coordinator.start(company+':'+this.user);this.coordinator.setCampusActive(this.campusActive);await this.syncTransport();
 }
 setCampusActive(active){this.campusActive=Boolean(active)&&!document.hidden;this.coordinator.setCampusActive(this.campusActive);this.syncTransport()}
 async syncTransport(){
  if(!this.client||!this.user)return;
  if(!this.isLeader()){await this.stopOwnedTransport(true);return}
  await this.ensureBackgroundTransport();
  if(this.campusActive&&!document.hidden)await this.ensureCampusTransport();else await this.stopCampus(true);
  this.startReconciliation();
 }
 startReconciliation(){
  clearInterval(this.reconcileTimer);if(!this.isLeader())return;
  this.reconcileTimer=setInterval(()=>{if(document.hidden)return;this.refreshMessenger();if(this.campusActive)this.refreshCampus()},RECONCILE_MS);
 }
 async ensureBackgroundTransport(){
  if(this.backgroundChannel)return;
  const epoch=this.epoch,client=this.client;
  let channel=client.channel('keyhq-messenger:'+this.company+':'+this.user);
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:TABLE,filter:'company_id=eq.'+this.company},payload=>this.applyMessage(payload));
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_presence_v09',filter:'company_id=eq.'+this.company},payload=>this.applyPresence(payload));
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_conversations_v010',filter:'company_id=eq.'+this.company},()=>this.scheduleGroups());
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_members_v010'},()=>this.scheduleGroups());
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_group_messages_v010'},payload=>this.applyGroupMessage(payload));
  this.backgroundChannel=channel.subscribe(status=>{if(epoch!==this.epoch)return;if(status==='SUBSCRIBED')this.refreshMessenger();if(['CHANNEL_ERROR','TIMED_OUT'].includes(status))this.backgroundReady=false});
 }
 async ensureCampusTransport(){
  if(this.campusChannel)return;
  const epoch=this.epoch,client=this.client;
  let channel=client.channel('keyhq-campus:'+this.company+':'+this.user);
  for(const table of ['ks_keyhq_sessions_v09','ks_keyhq_participants_v09'])channel=channel.on('postgres_changes',{event:'*',schema:'public',table,...(table==='ks_keyhq_sessions_v09'?{filter:'company_id=eq.'+this.company}:{})},()=>this.scheduleSessions());
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_rides_v010'},payload=>this.applyRow('rides',payload,'session_id'));
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_games_v426'},payload=>this.applyGameRow('games',payload,'session_id'));
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_inputs_v426'},payload=>this.applyGameRow('gameInputs',payload,row=>row.session_id+':'+row.user_id));
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ks_keyhq_actor_state_v426',filter:'company_id=eq.'+this.company},payload=>this.applyActor(payload));
  this.campusChannel=channel.subscribe(status=>{if(epoch!==this.epoch)return;if(status==='SUBSCRIBED')this.refreshCampus();if(['CHANNEL_ERROR','TIMED_OUT'].includes(status))this.actorStateReady=false});
  await this.heartbeat();clearInterval(this.heartbeatTimer);this.heartbeatTimer=setInterval(()=>{if(!document.hidden&&this.campusActive&&this.isLeader())this.heartbeat()},60000);
 }
 async stopCampus(leave=false){
  clearInterval(this.heartbeatTimer);this.heartbeatTimer=0;clearTimeout(this.sessionTimer);this.sessionTimer=0;
  if(leave&&this.campusChannel)await this.heartbeat(true);
  if(this.campusChannel&&this.client)this.client.removeChannel(this.campusChannel);this.campusChannel=null;this.actorStateReady=false;
 }
 async stopOwnedTransport(leave=false){
  clearInterval(this.reconcileTimer);this.reconcileTimer=0;clearTimeout(this.groupTimer);this.groupTimer=0;await this.stopCampus(leave);
  if(this.backgroundChannel&&this.client)this.client.removeChannel(this.backgroundChannel);this.backgroundChannel=null;this.backgroundReady=false;
 }
 async heartbeat(leave=false){
  if(!this.client||!this.user||(!leave&&(!this.isLeader()||!this.campusActive||document.hidden)))return;
  const r=await this.client.rpc('keysuite_keyhq_presence_v09',{p_company:this.company,p_session:this.session,p_leave:leave});
  if(r.error)this.data.error='Apply the KeyHQ V0.9 migration to enable presence and social features.';
 }
 async refreshMessenger(){
  if(!this.client||!this.user)return;if(!this.isLeader()){this.coordinator.publish('request-sync',{resource:'messenger'});return}
  if(this.refreshingMessenger)return this.refreshingMessenger;
  const epoch=this.epoch;
  this.refreshingMessenger=(async()=>{await Promise.resolve();if(epoch!==this.epoch)return;try{
   const [messages,unread,presence,groups,counts]=await Promise.all([
    this.client.from(TABLE).select(MESSAGE_COLUMNS).eq('company_id',this.company).order('created_at',{ascending:false}).limit(50),
    this.client.from(TABLE).select('id',{count:'exact',head:true}).eq('company_id',this.company).eq('recipient_id',this.user).is('read_at',null),
    this.client.from('ks_keyhq_presence_v09').select('company_id,user_id,session_id,expires_at').eq('company_id',this.company).gt('expires_at',new Date().toISOString()),
    this.client.from('ks_keyhq_conversations_v010').select('id,company_id,name,owner_id,created_at,members:ks_keyhq_members_v010(conversation_id,user_id,joined_at,last_read_at)').eq('company_id',this.company).order('created_at',{ascending:false}),
    this.client.rpc('keysuite_keyhq_inbox_v010')
   ]);if(epoch!==this.epoch)return;for(const r of [messages,unread,presence,groups,counts])if(r.error)throw r.error;
   Object.assign(this.data,{state:'ready',companyId:this.company,userId:this.user,messages:messages.data||[],unread:unread.count||0,presence:presence.data||[],groups:groups.data||[],groupCounts:counts.data||[],groupsReady:true,groupError:'',actorStateReady:this.actorStateReady});
   this.backgroundReady=true;this.publishState();
  }catch(error){if(epoch===this.epoch){Object.assign(this.data,{state:'unavailable',companyId:this.company,userId:this.user,error:'Private chat unavailable. '+String(error?.message||error)});this.publishState()}}finally{this.refreshingMessenger=null}})();
  return this.refreshingMessenger;
 }
 async refresh(){return this.campusActive?this.refreshCampus():this.refreshMessenger()}
 async refreshGroupMetadata(){
  if(!this.client||!this.user)return;if(!this.isLeader()){this.coordinator.publish('request-sync',{resource:'groups'});return}
  try{const [groups,counts]=await Promise.all([
   this.client.from('ks_keyhq_conversations_v010').select('id,company_id,name,owner_id,created_at,members:ks_keyhq_members_v010(conversation_id,user_id,joined_at,last_read_at)').eq('company_id',this.company).order('created_at',{ascending:false}),
   this.client.rpc('keysuite_keyhq_inbox_v010')]);
   if(groups.error||counts.error)throw groups.error||counts.error;Object.assign(this.data,{groups:groups.data||[],groupCounts:counts.data||[],groupsReady:true,groupError:''});this.publishState();
  }catch(error){Object.assign(this.data,{groupsReady:false,groupError:'Group chat unavailable. '+String(error?.message||error)});this.publishState()}
 }
 scheduleGroups(){clearTimeout(this.groupTimer);this.groupTimer=setTimeout(()=>this.refreshGroupMetadata(),250)}
 scheduleSessions(){clearTimeout(this.sessionTimer);this.sessionTimer=setTimeout(()=>this.refreshSessions(),250)}
 async refreshSessions(){
  if(!this.client||!this.campusActive||!this.isLeader())return;
  const result=await this.client.from('ks_keyhq_sessions_v09').select('id,company_id,host_id,activity,status,created_at,started_at,expires_at,participants:ks_keyhq_participants_v09(session_id,user_id,status)').eq('company_id',this.company).in('status',['waiting','playing']).gt('expires_at',new Date().toISOString());
  if(!result.error){this.data.sessions=result.data||[];this.publishState()}
 }
 async refreshCampus(){
  if(!this.client||!this.campusActive||document.hidden)return;if(!this.isLeader()){this.coordinator.publish('request-sync',{resource:'campus'});return}
  if(this.refreshingCampus)return this.refreshingCampus;const epoch=this.epoch;
  this.refreshingCampus=(async()=>{await Promise.resolve();if(epoch!==this.epoch)return;try{const [sessions,presence,rides,games,inputs,actors]=await Promise.all([
   this.client.from('ks_keyhq_sessions_v09').select('id,company_id,host_id,activity,status,created_at,started_at,expires_at,participants:ks_keyhq_participants_v09(session_id,user_id,status)').eq('company_id',this.company).in('status',['waiting','playing']).gt('expires_at',new Date().toISOString()),
   this.client.from('ks_keyhq_presence_v09').select('company_id,user_id,session_id,expires_at').eq('company_id',this.company).gt('expires_at',new Date().toISOString()),
   this.client.from('ks_keyhq_rides_v010').select('session_id,x,z,yaw,speed,floor,y,updated_at'),
   this.client.from('ks_keyhq_games_v426').select('session_id,mode,seq,state,updated_at'),
   this.client.from('ks_keyhq_inputs_v426').select('session_id,user_id,seq,input,updated_at'),
   this.client.from('ks_keyhq_actor_state_v426').select('company_id,user_id,session_id,seq,pose,updated_at').eq('company_id',this.company)
  ]);if(epoch!==this.epoch)return;for(const r of [sessions,presence,rides,games,inputs,actors])if(r.error)throw r.error;
   Object.assign(this.data,{sessions:sessions.data||[],presence:presence.data||[],rides:rides.data||[],games:games.data||[],gameInputs:inputs.data||[]});this.actorRows=actors.data||[];this.actorStateReady=true;this.data.actorStateReady=true;this.publishState();
   const actorEvent={companyId:this.company,ready:true,rows:this.actorRows},gameEvent={companyId:this.company,games:this.data.games,gameInputs:this.data.gameInputs,gamesReady:true};
   this.emit('KEYHQ_ACTOR_STATE',actorEvent);this.share('actor-state',actorEvent);this.emit('KEYHQ_GAME_STATE',gameEvent);this.share('game-state',gameEvent);
  }catch(error){if(epoch===this.epoch){this.actorStateReady=false;this.data.actorStateReady=false;this.emit('KEYHQ_ACTOR_STATE',{companyId:this.company,ready:false,rows:[]})}}finally{this.refreshingCampus=null}})();return this.refreshingCampus;
 }
 rowKey(row,key){return typeof key==='function'?key(row):row?.[key]}
 applyRow(field,payload,key){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old,id=this.rowKey(row,key);if(!id)return;
  const rows=[...(this.data[field]||[])],index=rows.findIndex(item=>this.rowKey(item,key)===id);
  if(payload.eventType==='DELETE'){if(index>=0)rows.splice(index,1)}else if(index>=0)rows[index]=row;else rows.push(row);this.data[field]=rows;this.publishState();
 }
 applyMessage(payload){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;if(!row?.id)return;const rows=[...(this.data.messages||[])],index=rows.findIndex(item=>item.id===row.id),prior=index>=0?rows[index]:null;
  const wasUnread=prior?.recipient_id===this.user&&!prior.read_at,isUnread=payload.eventType!=='DELETE'&&row.recipient_id===this.user&&!row.read_at;
  if(payload.eventType==='DELETE'){if(index>=0)rows.splice(index,1)}else if(index>=0)rows[index]=row;else rows.unshift(row);
  rows.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));this.data.messages=rows.slice(0,50);this.data.unread=Math.max(0,Number(this.data.unread||0)+(isUnread?1:0)-(wasUnread?1:0));this.publishState();
 }
 applyGroupMessage(payload){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;if(!row?.id)return;const rows=[...(this.data.groupMessages||[])],index=rows.findIndex(item=>item.id===row.id);
  if(payload.eventType==='DELETE'){if(index>=0)rows.splice(index,1)}else if(index>=0)rows[index]=row;else rows.unshift(row);this.data.groupMessages=rows.slice(0,50);this.publishState();this.scheduleGroups();
 }
 applyPresence(payload){this.applyRow('presence',payload,row=>row.company_id+':'+row.user_id+':'+row.session_id)}
 applyGameRow(field,payload,key){this.applyRow(field,payload,key);const event={companyId:this.company,games:this.data.games||[],gameInputs:this.data.gameInputs||[],gamesReady:true};this.emit('KEYHQ_GAME_STATE',event);this.share('game-state',event)}
 applyActor(payload){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;if(!row?.user_id)return;
  const rows=[...(this.actorRows||[])],index=rows.findIndex(item=>item.user_id===row.user_id);
  if(payload.eventType==='DELETE'){if(index>=0)rows.splice(index,1)}else if(index>=0)rows[index]=row;else rows.push(row);this.actorRows=rows;this.actorStateReady=true;this.data.actorStateReady=true;
  const event={companyId:this.company,ready:true,rows:row.user_id===this.user?[]:[row],incremental:true,eventType:payload.eventType};this.emit('KEYHQ_ACTOR_STATE',event);this.share('actor-state',event);
 }
 notify(){if(this.data.state!=='ready')return;const incoming=(this.data.messages||[]).filter(m=>m.recipient_id===this.user&&!m.read_at&&!this.notified.has(m.id));for(const m of incoming)this.notified.add(m.id);if(!incoming.length||document.getElementById('dashboardMessengerButton'))return;if(document.getElementById('keyhqOverlay')?.classList.contains('keyhq-open'))return;let notice=document.getElementById('keyhqPrivateNotice');if(!notice){notice=document.createElement('button');notice.id='keyhqPrivateNotice';Object.assign(notice.style,{position:'fixed',right:'22px',top:'22px',zIndex:'6000',padding:'16px 22px',borderRadius:'18px',background:'#eef5ef',color:'#174638',border:'1px solid #a9c9b9',boxShadow:'0 8px 32px #0003'});document.body.append(notice)}const message=incoming[0],name=this.directory.find(p=>p.user_id===message.sender_id)?.name||'a colleague';notice.textContent='Private KeyHQ message from '+name;notice.onclick=()=>{notice.remove();this.pendingConversation=message.sender_id;if(window.KeySuiteMessenger?.open)window.KeySuiteMessenger.open();else window.KeySuiteKeyHQ?.open()}}
 async handle(data){
  const epoch=this.epoch;if(!this.client||!this.user){this.emit('KEYHQ_SOCIAL_RESULT',{requestId:data.requestId,ok:false,error:'Sign in to KeySuite first.'});return}
  try{let result;
   if(data.action==='avatar-state'){if(!this.actorStateReady||!this.isLeader()||!this.campusActive||document.hidden)return;result=await this.client.rpc('keysuite_keyhq_actor_v426',{p_company:this.company,p_session:this.session,p_seq:Date.now(),p_pose:data.pose})}
   else if(data.action?.startsWith('game-')){if(!this.isLeader()||!this.campusActive||document.hidden)return;result=await this.client.rpc('keysuite_keyhq_game_v426',{p_id:data.id,p_action:data.action.slice(5),p_mode:data.mode||null,p_seq:data.seq||null,p_payload:data.input||data.state||{}})}
   else if(data.action==='ride-position'){if(!this.isLeader()||!this.campusActive||document.hidden)return;result=await this.client.rpc('keysuite_keyhq_ride_v426',{p_id:data.id,p_x:data.x,p_z:data.z,p_yaw:data.yaw,p_speed:data.speed,p_floor:data.floor||'all',p_y:data.y??.2})}
   else if(data.action==='group-history')result=await this.client.from('ks_keyhq_group_messages_v010').select(GROUP_MESSAGE_COLUMNS).eq('conversation_id',data.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(Math.max(0,Number(data.offset)||0),Math.max(0,Number(data.offset)||0)+99);
   else if(data.action?.startsWith('group-'))result=await this.client.rpc('keysuite_keyhq_groups_v010',{p_company:this.company,p_action:data.action.slice(6),p_id:data.id||null,p_name:data.name||null,p_users:data.users||[],p_user:data.userId||null,p_body:data.body||null,p_nonce:data.nonce||null});
   else if(data.action==='send'){
    const body=String(data.body||'').trim();if(!body||body.length>4000)throw new Error('Message must contain 1–4000 characters.');
    result=await this.client.from(TABLE).insert({company_id:this.company,recipient_id:data.recipient,nonce:data.nonce,body}).select(MESSAGE_COLUMNS).single();
    if(result.error?.code==='23505'){result=await this.client.from(TABLE).select(MESSAGE_COLUMNS).eq('company_id',this.company).eq('sender_id',this.user).eq('nonce',data.nonce).single();if(result.data&&(result.data.body!==body||result.data.recipient_id!==data.recipient))throw new Error('Retry identifier already belongs to another message.')}
   }else if(data.action==='read')result=await this.client.from(TABLE).update({read_at:new Date().toISOString()}).eq('company_id',this.company).eq('recipient_id',this.user).eq('sender_id',data.recipient).is('read_at',null);
   else if(data.action==='history'){
    if(!/^[0-9a-f-]{36}$/i.test(data.recipient))throw new Error('Invalid recipient');
    result=await this.client.from(TABLE).select(MESSAGE_COLUMNS).eq('company_id',this.company).or(`and(sender_id.eq.${this.user},recipient_id.eq.${data.recipient}),and(sender_id.eq.${data.recipient},recipient_id.eq.${this.user})`).order('created_at',{ascending:false}).order('id',{ascending:false}).range(Number(data.offset)||0,(Number(data.offset)||0)+99);
   }else if(data.action==='refresh'){this.isLeader()?await(this.campusActive?this.refreshCampus():this.refreshMessenger()):this.coordinator.publish('request-sync',{resource:this.campusActive?'campus':'messenger'});return}
   else result=await this.client.rpc('keysuite_keyhq_social_v09',{p_company:this.company,p_action:data.action,p_id:data.id||null,p_activity:data.activity||null,p_invitees:data.invitees||[],p_user:data.userId||null});
   if(epoch!==this.epoch)return;if(result?.error)throw result.error;
   this.emit('KEYHQ_SOCIAL_RESULT',{requestId:data.requestId,action:data.action,ok:true,result:result?.data,recipient:data.recipient,id:data.id});
   if(data.action==='send'&&result.data&&this.isLeader())this.applyMessage({eventType:'INSERT',new:result.data,old:{}});
   if(data.action==='read'&&this.isLeader()){for(const message of this.data.messages||[])if(message.recipient_id===this.user&&message.sender_id===data.recipient&&!message.read_at)message.read_at=new Date().toISOString();this.data.unread=(this.data.messages||[]).filter(m=>m.recipient_id===this.user&&!m.read_at).length;this.publishState()}
   if(data.action?.startsWith('group-'))this.isLeader()?this.scheduleGroups():this.coordinator.publish('request-sync',{resource:'groups'});
   if(!data.action?.startsWith('group-')&&!['send','read','history','ride-position','avatar-state'].includes(data.action))this.isLeader()?this.scheduleSessions():this.coordinator.publish('request-sync',{resource:'campus'});
  }catch(error){if(epoch===this.epoch)this.emit('KEYHQ_SOCIAL_RESULT',{requestId:data.requestId,action:data.action,ok:false,error:String(error?.message||error)})}
 }
 disconnect(){
  document.getElementById('keyhqPrivateNotice')?.remove();this.notified.clear();this.pendingConversation=null;this.epoch++;
  clearInterval(this.reconcileTimer);clearInterval(this.heartbeatTimer);clearTimeout(this.groupTimer);clearTimeout(this.sessionTimer);this.reconcileTimer=this.heartbeatTimer=this.groupTimer=this.sessionTimer=0;
  if(this.client&&this.campusChannel)this.client.removeChannel(this.campusChannel);if(this.client&&this.backgroundChannel)this.client.removeChannel(this.backgroundChannel);if(this.client&&this.channel)this.client.removeChannel(this.channel);
  this.campusChannel=null;this.backgroundChannel=null;this.channel=null;this.coordinator.stop();this.auth?.unsubscribe();this.auth=null;this.client=null;this.user='';this.company='';this.campusActive=false;this.actorRows=[];
  this.data={state:'unavailable',messages:[],sessions:[],presence:[],groups:[],groupMessages:[],groupCounts:[],rides:[],games:[],gameInputs:[]};
  for(const listener of this.listeners){try{listener({type:'KEYHQ_SOCIAL_STATE',data:this.data})}catch(error){console.error('KeyHQ social listener failed.',error)}}
 }
}
window.KeyHQSocial=KeyHQSocial;
})();
