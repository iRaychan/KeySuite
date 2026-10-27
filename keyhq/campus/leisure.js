import * as T from 'three';
import {groundPath,groundFloorAt} from './navigation.js';
export const activities={
 basketball:{name:'Basketball · shooting practice',min:1,capacity:10,x:61,z:8,floor:'all',y:.42},
 football:{name:'Football · shooting practice',min:1,capacity:4,x:57,z:-98,floor:'all',y:.35},
 badminton:{name:'Badminton · singles',min:1,capacity:4,x:-86,z:-4,courtZ:0,floor:'all',y:.42},
 pickleball:{name:'Pickleball · singles',min:1,capacity:4,x:-87,z:-34,courtZ:-30,floor:'all',y:.42},
 tennis:{name:'Tennis · singles',min:1,capacity:4,x:-87,z:-73,courtZ:-66,floor:'all',y:.42},
 swim:{name:'Swimming',min:1,capacity:4,x:42,z:51,floor:'all',y:.4},
 gym:{name:'Gym / fitness',min:1,capacity:3,x:-18,z:12,floor:'2',y:10},
 coffee:{name:'Coffee break',min:1,capacity:4,x:39,z:57,floor:'all',y:.3},
 smoking:{name:'Smoking / chatting',min:1,capacity:3,x:-12,z:-87,floor:'all',y:.2},
 rooftop:{name:'Rooftop relaxation',min:1,capacity:4,x:-58,z:10,floor:'roof',y:14.8},
 garden:{name:'Garden walking',min:1,capacity:6,x:-35,z:-67,floor:'all',y:.2}
};
export const online=a=>!a.demo&&a.presence==='online';
export const minimumReady=(activity,participants)=>participants.filter(p=>p.status==='arrived').length>=activities[activity].min;
const height=f=>f==='all'?.2:f==='roof'?14.8:Number(f)*4.8+.4;
// Explicit doors and lift stops. Ground routing never cuts through the building or pool.
export function planRoute(a,end,world){
 const start={x:a.rig.model.position.x,z:a.rig.model.position.z},from=a.floor,to=end.floor;
 const prefix=[];if(from==='all'&&start.x>43&&start.x<87&&start.z>42&&start.z<66){prefix.push({x:44,z:start.z,y:.65,floor:'all',swim:true},{x:42,z:start.z,y:.2,floor:'all'});start.x=42;}
 const ground=f=>f==='all'||f==='0',lift={x:-35,z:-8.6};
 const leg=(s,e,f)=>groundPath(s,e,f,world.obstacles[f]||[])?.map(p=>({...p,y:height(f),floor:ground(f)?groundFloorAt(p.x,p.z):f}));
 let result;
 if(from===to||ground(from)&&ground(to))result=leg(start,end,to);
 else {const first=leg(start,lift,from),last=leg(lift,end,to);if(!first||!last)return null;result=[...first,{...lift,y:height(ground(to)?'0':to),floor:ground(to)?'0':to,liftTo:ground(to)?'0':to},...last]}
 if(!result)return null;if(result.length&&Number.isFinite(end.y))result[result.length-1].y=end.y;return [...prefix,...result];
}
export function routeActor(a,end,world){
 if(a.lift||a.vehicle)return false;const result=planRoute(a,end,world);if(!result)return false;
 a.returning=null;a.followTarget=null;a.manual=false;a.path=result;a.routeRetries=0;a.routeFailed=false;a.state='walk';return true;
}
export class Leisure{
 constructor({world,actors,session,toast,post}){Object.assign(this,{world,actors,session,toast,post});this.matches=new Map();this.remote=new Map();this.last=0;this.statusChanged=()=>{};}
 release(a){const played=a.gameActive;if(a.activity==='smoking')this.carry?.stop(a);if(a.seating&&!this.seating?.stand(a))return false;a.gameActive=false;a.returnToWork=online(a)&&Boolean(a.match||a.activity);a.followTarget=null;if(a.match){const match=this.matches.get(a.match);if(match){match.members=match.members.filter(m=>m.id!==a.id);match.status='waiting';match.started=0;if(!match.members.length){this.matches.delete(match.id);this.disposeMatch(match)}}a.match=null}const swimming=a.activity==='swim';a.path=swimming?[{x:44,z:a.rig.model.position.z,y:.65,floor:'all',swim:true},{x:42,z:a.rig.model.position.z,y:.2,floor:'all'}]:[];a.activity=null;if(!swimming)a.rig.model.rotation.x=0;this.clearProps(a);if(played){a.controlMode='manual';a.returnToWork=false;a.path=[];a.manual=true;a.auto=false;a.state='idle';a.rig.model.rotation.x=0;if(swimming){a.manual=false;a.afterPoolControl=true;a.path=[{x:44,z:a.rig.model.position.z,y:.55,floor:'all',swim:true},{x:42,z:a.rig.model.position.z,y:.2,floor:'all'}];}}}
 clearProps(a){for(const p of a.props||[]){p.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});p.removeFromParent()}a.props=[];}
 choose(a,key,invitees=[]){const spec=activities[key];if(!spec)return false;if(online(a)&&a.userId!==this.session().userId)return false;
 const busy=[...this.matches.values()].some(m=>m.activity===key&&m.members.length);if(busy){this.toast('This facility is reserved. Choose another activity.');return false}
 const members=[a,...invitees.filter(b=>b!==a&&Boolean(b.demo)===Boolean(a.demo))].slice(0,spec.capacity);
 if(!a.demo&&a.userId===this.session().userId){this.post({type:'KEYHQ_SOCIAL',action:'create',activity:key,invitees:members.filter(b=>b.userId&&b!==a).map(b=>b.userId)});return true}
 const id='local:'+crypto.randomUUID(),match={id,activity:key,members:[],status:'waiting',started:0,created:performance.now(),autonomous:a.auto};this.matches.set(id,match);
 for(const actor of members){if(online(actor))continue;this.join(match,actor)}if(!match.members.length){this.matches.delete(id);return false}this.statusChanged();return true;
 }
 join(match,a){const spec=activities[match.activity];if(match.members.length>=spec.capacity||(!match.remote&&online(a)))return false;if(this.release(a)===false)return false;const index=match.members.length;
 const offset=spec.courtZ!==undefined?{x:spec.x+(index>=2?1:-1),z:spec.courtZ+(index%2===0?-1:1)*(match.activity==='tennis'?7:4)}:{x:spec.x+(match.activity==='swim'?0:index*1.4),z:spec.z+(match.activity==='swim'?index*.6:0)};
 const waterEntry=match.activity==='swim'&&a.rig.model.position.x>46&&a.rig.model.position.x<84&&a.rig.model.position.z>45&&a.rig.model.position.z<63;if(waterEntry){a.path=[];a.manual=false;}if(!waterEntry&&!routeActor(a,{...spec,...offset},this.world)){a.routeFailures??={};if(!a.routeFailures[match.activity])this.toast('No clear route to '+spec.name);a.routeFailures[match.activity]=performance.now();a.next=performance.now()+15000;return false}
 a.activity=match.activity;a.match=match.id;a.next=Infinity;match.members.push(a);a.arrived=false;a.reported=false;return true;
 }
 sync(rows){
 const live=new Set();for(const row of rows){if(!activities[row.activity]||!['waiting','playing'].includes(row.status))continue;live.add(row.id);let match=this.matches.get(row.id);if(!match){match={id:row.id,activity:row.activity,members:[],status:'waiting',started:0,created:performance.now(),remote:true,host:row.host_id};this.matches.set(row.id,match)}
  for(const p of [...row.participants||[]].sort((a,b)=>a.user_id.localeCompare(b.user_id))){const a=this.actors().find(a=>a.userId===p.user_id);if(!a)continue;if(['accepted','arrived'].includes(p.status)&&!match.members.includes(a)&&(!a.routeFailures?.[row.activity]||performance.now()-a.routeFailures[row.activity]>60000))this.join(match,a);if(['invited','declined','left'].includes(p.status)&&a.match===match.id)this.release(a)}
  match.server=row;
 }
 for(const m of [...this.matches.values()])if(m.remote&&!live.has(m.id)){for(const a of [...m.members])this.release(a);this.matches.delete(m.id);this.disposeMatch(m)}this.statusChanged();
 }
 update(dt,now){
 for(const match of [...this.matches.values()]){const spec=activities[match.activity];
  for(const a of [...match.members]){if(a.routeFailed){a.routeFailures??={};a.routeFailures[match.activity]=now;if(match.remote&&a.userId===this.session().userId)this.post({type:'KEYHQ_SOCIAL',action:match.host===a.userId?'end':'leave',id:match.id});this.release(a);a.controlMode='auto';a.manual=false;a.auto=true;a.next=now+15000;this.toast('Route blocked by traffic. Choose another destination or try again shortly.');continue;}if(!a.path.length&&!a.lift&&!a.arrived&&!a.routeFailed){a.arrived=true;a.state='idle';if(match.remote&&!a.reported&&(a.userId===this.session().userId||!online(a)&&match.host===this.session().userId)){a.reported=true;this.post({type:'KEYHQ_SOCIAL',action:'arrive',id:match.id,userId:a.userId})}}}
  const ready=match.members.filter(a=>a.arrived);
  const authorized=!match.remote||match.server?.status==='playing';
  if(ready.length>=spec.min&&authorized){if(!match.started){match.started=now;match.status='playing';this.equipment(match);this.statusChanged()}if(match.ball)match.ball.visible=true;this.play(match,dt,match.activity!=='swim'&&match.remote&&match.server?.started_at?Math.max(0,(Date.now()-Date.parse(match.server.started_at))/1000):(now-match.started)/1000)}else{this.games?.updateMatch(match,dt,now);match.status='waiting';match.started=0;if(match.ball)match.ball.visible=false;for(const a of ready)a.state='idle'}
  if(!match.remote&&now-match.created>15000&&match.members.length<spec.min&&!match.members.some(a=>a.path.length||a.lift)){const candidate=this.actors().find(a=>!online(a)&&!a.match&&a.auto&&Boolean(a.demo)===Boolean(match.members[0]?.demo));if(candidate)this.join(match,candidate);else if(now-match.created>35000)for(const a of [...match.members]){this.release(a);a.controlMode='auto';a.manual=false;a.auto=true;a.next=now+2000}}
  if(!match.remote&&match.autonomous&&match.started&&now-match.started>45000+(match.created%30000)){for(const a of [...match.members]){this.release(a);a.controlMode='auto';a.manual=false;a.auto=true;a.next=now+3000+Math.random()*5000}}
 }
 if(now-this.last>1200){this.last=now;for(const a of this.actors())if(a.auto&&!a.match&&!a.path.length&&!a.lift&&!a.vehicle&&!a.ridePending&&!a.manual&&(!online(a)||a.userId===this.session().userId)&&now>a.next){a.next=now+8000;if(a.seating&&this.seating?.stand(a)===false)continue;a.manual=false;a.auto=true;a.controlMode='auto';const choices=Object.keys(activities).filter(k=>(activities[k].min===1||this.actors().filter(b=>b!==a&&!online(b)&&b.auto&&!b.match).length>=activities[k].min-1)&&k!==a.previousActivity&&(!a.routeFailures?.[k]||now-a.routeFailures[k]>60000)&&planRoute(a,activities[k],this.world)&&!['smoking'].includes(k)&&![...this.matches.values()].some(m=>m.activity===k));const weights=choices.flatMap(k=>Array(['garden','coffee','basketball','swim'].includes(k)?3:1).fill(k));const key=weights[Math.floor(Math.random()*weights.length)];if(key){a.previousActivity=key;const spec=activities[key],peers=this.actors().filter(b=>b!==a&&!online(b)&&b.auto&&!b.match&&Boolean(b.demo)===Boolean(a.demo)).slice(0,spec.min-1);if(peers.length>=spec.min-1)this.choose(a,key,peers);else a.next=now+5000}}}
 }
 mesh(geo,color,parent,pos=[0,0,0]){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.6}));m.position.set(...pos);parent.add(m);return m}
 equipment(match){const key=match.activity;
 if(!match.ball&&['basketball','football','tennis','badminton','pickleball'].includes(key)){const radius=key==='basketball'?.12:key==='football'?.11:.045;match.ball=this.mesh(new T.SphereGeometry(radius,16,10),key==='basketball'?'#d9772b':key==='football'?'#faf6e4':'#def75a',this.world.scene);if(key==='badminton'){const skirt=this.mesh(new T.ConeGeometry(.08,.14,10,1,true),'#fffdf4',match.ball,[0,.08,0]);skirt.rotation.x=Math.PI} }
 for(const a of match.members){if(a.props?.length)continue;a.anchor=a.rig.model.position.clone();this.clearProps(a);const hand=a.rig.model.getObjectByName('RHand');if(['tennis','badminton','pickleball'].includes(key)){const racket=new T.Group();hand.add(racket);a.props=[racket];racket.rotation.x=-Math.PI/2;this.mesh(new T.CylinderGeometry(.018,.018,.26,8),'#314a52',racket,[0,-.12,0]);const head=this.mesh(key==='pickleball'?new T.BoxGeometry(.23,.32,.04):new T.TorusGeometry(.16,.015,6,20),'#dccda9',racket,[0,-.40,0]);if(key!=='pickleball')for(let i=-2;i<=2;i++){this.mesh(new T.BoxGeometry(.25,.005,.005),'#b9d6d4',racket,[0,-.40+i*.045,0]);this.mesh(new T.BoxGeometry(.005,.25,.005),'#b9d6d4',racket,[i*.045,-.40,0])}}
 if(key==='smoking')this.carry?.start(a,'smoke');
 if(['coffee','gym'].includes(key)){const prop=new T.Group();hand.add(prop);a.props=[prop];if(key==='coffee')this.mesh(new T.CylinderGeometry(.05,.04,.10,12),'#f5eee4',prop);if(key==='smoking')this.mesh(new T.CylinderGeometry(.006,.006,.08,6),'#eee5c9',prop);if(key==='gym'){this.mesh(new T.CylinderGeometry(.018,.018,.25,8),'#bec6c4',prop).rotation.z=Math.PI/2;for(const side of [-1,1])this.mesh(new T.BoxGeometry(.08,.16,.16),'#253335',prop,[side*.12,0,0])}}
 }
 }
 play(match,dt,t){if(['coffee','rooftop'].includes(match.activity)){for(const a of match.members.filter(a=>a.arrived&&!a.seating)){if(!this.seating?.sit(a,match.activity==='rooftop'?'sofa':'chair'))a.state='idle';}return;}if(!match.autonomous&&this.games?.updateMatch(match,dt,performance.now())){if(match.ball)match.ball.visible=false;return;}const spec=activities[match.activity],key=match.activity,ready=match.members.filter(a=>a.arrived),m=ready[0];if(!m)return;
 for(const [i,a] of ready.entries()){a.state=['rooftop'].includes(key)?'relax':key==='garden'?'walk':key;a.rig.model.visible=a.rig.model.visible;}
 const pos=m.rig.model.position;
 if(key==='basketball'){
  const cycle=t%17,turn=Math.floor(t/17)%ready.length,a=ready[turn],home=a.anchor||a.rig.model.position.clone(),hoop=new T.Vector3(68.8,3.05,8),landing=new T.Vector3(68.8,.54,8),p=a.rig.model.position;
  a.rig.model.rotation.y=Math.atan2(hoop.x-p.x,hoop.z-p.z);const hand=()=>a.rig.model.getObjectByName('RHand').getWorldPosition(new T.Vector3());
  if(cycle<3){p.copy(home);const h=hand();match.ball.position.set(h.x,.54+Math.abs(Math.cos(cycle*Math.PI*2))*Math.max(.1,h.y-.54),h.z)}
  else if(cycle<4){a.state='cheer';match.ball.position.copy(hand());match.release=match.ball.position.clone()}
  else if(cycle<6){const u=(cycle-4)/2;match.ball.position.lerpVectors(match.release||home.clone().add(new T.Vector3(0,1.4,0)),hoop,u);match.ball.position.y+=Math.sin(u*Math.PI)*2;a.state='cheer'}
  else if(cycle<8){const u=(cycle-6)/2;match.ball.position.copy(landing);match.ball.position.y=.54+Math.abs(Math.cos(u*Math.PI*1.5))*2.51*(1-u);if(Math.floor(t/17)%3===2)match.ball.position.z+=Math.sin(u*Math.PI)*.8}
  else if(cycle<11){const u=(cycle-8)/3;p.lerpVectors(home,landing.clone().setY(home.y),u);match.ball.position.copy(landing);a.state='walk'}
  else if(cycle<14){const u=(cycle-11)/3;p.lerpVectors(landing.clone().setY(home.y),home,u);a.rig.model.rotation.y=Math.atan2(home.x-landing.x,home.z-landing.z);a.state='walk';match.ball.position.copy(hand())}
  else{p.copy(home);const next=ready[(turn+1)%ready.length],u=(cycle-14)/3,receiver=next.rig.model.getObjectByName('RHand').getWorldPosition(new T.Vector3());match.ball.position.lerpVectors(hand(),receiver,u);match.ball.position.y+=Math.sin(u*Math.PI)*.5;a.state='basketball';next.state='basketball'}
 }
 if(key==='football'){
  const cycle=t%12,turn=Math.floor(t/12)%ready.length,a=ready[turn],home=a.anchor||pos.clone(),goal=new T.Vector3(57,.47,-115.8),p=a.rig.model.position;const foot=home.clone().add(new T.Vector3(0,.12,-.45));
  a.rig.model.rotation.y=Math.PI;
  if(cycle<2){p.copy(home);a.state='football';match.ball.position.copy(foot)}
  else if(cycle<4){const u=(cycle-2)/2;match.ball.position.lerpVectors(foot,goal,u);match.ball.position.y+=Math.sin(u*Math.PI)*.7}
  else if(cycle<8){const u=(cycle-4)/4;p.lerpVectors(home,goal.clone().setY(home.y),u);match.ball.position.copy(goal);a.state='walk'}
  else{const u=(cycle-8)/4;p.lerpVectors(goal.clone().setY(home.y),home,u);match.ball.position.copy(p).add(new T.Vector3(0,.12,.45));a.rig.model.rotation.y=0;a.state='walk'}
 }
 if(spec.min===2&&match.ball){
  const a=ready[0],b=ready[1];a.rig.model.rotation.y=0;b.rig.model.rotation.y=Math.PI;
  const cycle=t%3,u=cycle/3,reverse=Math.floor(t/3)%2;for(const [i,actor] of ready.entries()){actor.rig.model.position.x=spec.x+Math.sin(t*.7+i*Math.PI)*.25;actor.rig.model.updateMatrixWorld(true)}
  const tip=actor=>actor.props?.[0]?actor.props[0].localToWorld(new T.Vector3(0,-.4,0)):actor.rig.model.position.clone().add(new T.Vector3(.35,1,0));
  const start=tip(reverse?b:a),end=tip(reverse?a:b);match.ball.position.lerpVectors(start,end,u);
  match.ball.position.y+=Math.sin(u*Math.PI)*(key==='badminton'?2.8:1.6);
  if(key!=='badminton'&&u>.68){const v=(u-.68)/.32;match.ball.position.y=v<.5?T.MathUtils.lerp(1.6,.47,v*2):T.MathUtils.lerp(.47,end.y,(v-.5)*2)}
  // Every sixth rally is missed; the visible projectile drops before a new serve.
  if(Math.floor(t/3)%6===5&&u>.8){match.ball.position.y=T.MathUtils.lerp(match.ball.position.y,.47,(u-.8)/.2);(reverse?a:b).state='idle'}
 }
 if(key==='swim')for(const [i,a] of ready.entries()){
  const entry=a.anchor,elapsed=Math.min(t/6,1),lane=48+i*3;
  if(t<6){a.rig.model.position.lerpVectors(entry,new T.Vector3(47,.65,lane),elapsed);a.rig.model.rotation.order='YXZ';a.rig.model.rotation.x=Math.PI/2*elapsed;a.rig.model.rotation.y=Math.PI/2}
  else{const phase=(t-6)*.12;const x=47+34*(1-Math.cos(phase))/2;a.rig.model.position.set(x,.65,lane);a.rig.model.rotation.order='YXZ';a.rig.model.rotation.x=Math.PI/2;a.rig.model.rotation.y=Math.sin(phase)>=0?Math.PI/2:-Math.PI/2;}
 }
 if(key==='garden')for(const [i,a] of ready.entries()){a.rig.model.position.set(-35+Math.sin(t*.18+i)*.6,.2,-67+Math.sin(t*.12+i)*13);a.rig.model.rotation.y=Math.cos(t*.12+i)>0?0:Math.PI;}
 }
 disposeMatch(match){match.ball?.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});match.ball?.removeFromParent();match.ball=null;}
 dispose(){for(const a of this.actors())this.clearProps(a);for(const m of this.matches.values())this.disposeMatch(m);this.matches.clear()}
}
