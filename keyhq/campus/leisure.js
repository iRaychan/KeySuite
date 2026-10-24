import * as T from 'three';
import {groundPath} from './state.js';
export const activities={
 basketball:{name:'Basketball · shooting practice',min:1,capacity:4,x:61,z:8,floor:'all',y:.42},
 football:{name:'Football · shooting practice',min:1,capacity:4,x:57,z:-98,floor:'all',y:.35},
 badminton:{name:'Badminton · singles',min:2,capacity:2,x:-86,z:0,floor:'all',y:.42},
 pickleball:{name:'Pickleball · singles',min:2,capacity:2,x:-87,z:-30,floor:'all',y:.42},
 tennis:{name:'Tennis · singles',min:2,capacity:2,x:-87,z:-66,floor:'all',y:.42},
 swim:{name:'Swimming',min:1,capacity:4,x:42,z:54,floor:'all',y:.4},
 gym:{name:'Gym / fitness',min:1,capacity:3,x:-18,z:12,floor:'2',y:10},
 coffee:{name:'Coffee break',min:1,capacity:4,x:39,z:57,floor:'all',y:.3},
 smoking:{name:'Smoking / chatting',min:1,capacity:3,x:-12,z:-87,floor:'all',y:.2},
 rooftop:{name:'Rooftop relaxation',min:1,capacity:4,x:-58,z:8,floor:'roof',y:14.8},
 garden:{name:'Garden walking',min:1,capacity:6,x:-35,z:-67,floor:'all',y:.2}
};
export const online=a=>!a.demo&&a.presence==='online';
export const minimumReady=(activity,participants)=>participants.filter(p=>p.status==='arrived').length>=activities[activity].min;
const height=f=>f==='all'?.2:f==='roof'?14.8:Number(f)*4.8+.4;
// Explicit doors and lift stops. Ground routing never cuts through the building or pool.
export function routeActor(a,end,world){
 const m=a.rig.model,start={x:m.position.x,z:m.position.z},from=a.floor,to=end.floor,prefix=[];if(from==='all'&&start.x>43&&start.x<87&&start.z>42&&start.z<66){prefix.push({x:44,z:start.z,y:.4,floor:'all',swim:true},{x:42,z:start.z,y:.4,floor:'all'});start.x=42;}
 const leg=(s,e,f)=>{const path=f==='roof'?[e]:groundPath(s,e,f,world.obstacles[Number(f)]||[]);return path?.map(p=>({...p,y:height(f),floor:f}))};
 let result=[];
 if(from===to){result=leg(start,end,to);}
 else{
  const lift={x:-35,z:-9},door={x:-35,z:24};
  if(from==='all'){const path=leg(start,door,'all');if(!path)return false;result.push(...path,{...door,y:.4,floor:'0'},{x:-35,z:16,y:.4,floor:'0'},...leg({x:-35,z:16},lift,'0')||[])}
  else{const path=leg(start,lift,from);if(!path)return false;result.push(...path)}
  if(to==='all'){result.push({...lift,y:.4,floor:'0',lift:true},...leg(lift,{x:-35,z:16},'0')||[],{...door,y:.2,floor:'all'});const path=leg(door,end,'all');if(!path)return false;result.push(...path)}
  else{result.push({...lift,y:height(to),floor:to,lift:true});const path=leg(lift,end,to);if(!path)return false;result.push(...path)}
 }
 if(!result)return false;a.path=[...prefix,...result];a.state='walk';a.auto=false;return true;
}
export class Leisure{
 constructor({world,actors,session,toast,post}){Object.assign(this,{world,actors,session,toast,post});this.matches=new Map();this.remote=new Map();this.last=0;this.statusChanged=()=>{};}
 release(a){a.followTarget=null;if(a.match){const match=this.matches.get(a.match);if(match){match.members=match.members.filter(m=>m.id!==a.id);match.status='waiting';match.started=0;if(!match.members.length){this.matches.delete(match.id);this.disposeMatch(match)}}a.match=null}a.path=[];a.activity=null;a.rig.model.rotation.x=0;a.rig.model.position.y=height(a.floor);this.clearProps(a);}
 clearProps(a){for(const p of a.props||[]){p.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});p.removeFromParent()}a.props=[];}
 choose(a,key,invitees=[]){const spec=activities[key];if(!spec)return false;if(online(a)&&a.userId!==this.session().userId)return false;
 const busy=[...this.matches.values()].some(m=>m.activity===key&&m.members.length);if(busy){this.toast('This facility is reserved. Choose another activity.');return false}
 const members=[a,...invitees.filter(b=>b!==a&&Boolean(b.demo)===Boolean(a.demo))].slice(0,spec.capacity);
 if(!a.demo&&a.userId===this.session().userId){this.post({type:'KEYHQ_SOCIAL',action:'create',activity:key,invitees:members.filter(b=>b.userId&&b!==a).map(b=>b.userId)});return true}
 const id='local:'+crypto.randomUUID(),match={id,activity:key,members:[],status:'waiting',started:0,created:performance.now(),autonomous:a.auto};this.matches.set(id,match);
 for(const actor of members){if(online(actor))continue;this.join(match,actor)}this.statusChanged();return true;
 }
 join(match,a){const spec=activities[match.activity];if(match.members.length>=spec.capacity||(!match.remote&&online(a)))return false;this.release(a);const index=match.members.length;
 const offset=spec.min===2?{x:spec.x,z:spec.z+(index===0?-1:1)*(match.activity==='tennis'?7:4)}:{x:spec.x+index*1.4,z:spec.z};
 if(!routeActor(a,{...spec,...offset},this.world)){this.toast('No clear route to '+spec.name);return false}
 a.activity=match.activity;a.match=match.id;a.auto=false;a.next=Infinity;match.members.push(a);a.arrived=false;a.reported=false;return true;
 }
 sync(rows){
 const live=new Set();for(const row of rows){if(!['waiting','playing'].includes(row.status))continue;live.add(row.id);let match=this.matches.get(row.id);if(!match){match={id:row.id,activity:row.activity,members:[],status:'waiting',started:0,created:performance.now(),remote:true,host:row.host_id};this.matches.set(row.id,match)}
  for(const p of [...row.participants||[]].sort((a,b)=>a.user_id.localeCompare(b.user_id))){const a=this.actors().find(a=>a.userId===p.user_id);if(!a)continue;if(['accepted','arrived'].includes(p.status)&&!match.members.includes(a))this.join(match,a);if(['invited','declined','left'].includes(p.status)&&a.match===match.id)this.release(a)}
  match.server=row;
 }
 for(const m of [...this.matches.values()])if(m.remote&&!live.has(m.id)){for(const a of [...m.members])this.release(a);this.matches.delete(m.id);this.disposeMatch(m)}this.statusChanged();
 }
 update(dt,now){
 for(const match of [...this.matches.values()]){const spec=activities[match.activity];
  for(const a of match.members){if(!a.path.length&&!a.arrived){a.arrived=true;a.state='idle';if(match.remote&&!a.reported&&(a.userId===this.session().userId||!online(a)&&match.host===this.session().userId)){a.reported=true;this.post({type:'KEYHQ_SOCIAL',action:'arrive',id:match.id,userId:a.userId})}}}
  const ready=match.members.filter(a=>a.arrived);
  const authorized=!match.remote||match.server?.status==='playing';
  if(ready.length>=spec.min&&authorized){if(!match.started){match.started=now;match.status='playing';this.equipment(match);this.statusChanged()}if(match.ball)match.ball.visible=true;this.play(match,dt,match.remote&&match.server?.started_at?Math.max(0,(Date.now()-Date.parse(match.server.started_at))/1000):(now-match.started)/1000)}else{match.status='waiting';match.started=0;if(match.ball)match.ball.visible=false;for(const a of ready)a.state='idle'}
  if(!match.remote&&now-match.created>15000&&ready.length<spec.min){const candidate=this.actors().find(a=>!online(a)&&!a.match&&a.auto&&Boolean(a.demo)===Boolean(match.members[0]?.demo));if(candidate)this.join(match,candidate);else if(now-match.created>35000)for(const a of [...match.members]){this.release(a);a.auto=true;a.next=now+2000}}
  if(!match.remote&&match.started&&now-match.started>45000+(match.created%30000)){for(const a of [...match.members]){this.release(a);a.auto=true;a.next=now+3000+Math.random()*5000}}
 }
 if(now-this.last>1200){this.last=now;for(const a of this.actors())if(a.auto&&!a.match&&!a.path.length&&!online(a)&&now>a.next){const choices=Object.keys(activities).filter(k=>k!==a.previousActivity&&!['smoking'].includes(k)&&![...this.matches.values()].some(m=>m.activity===k));const weights=choices.flatMap(k=>Array(['garden','coffee','basketball','swim'].includes(k)?3:1).fill(k));const key=weights[Math.floor(Math.random()*weights.length)];if(key){a.previousActivity=key;const spec=activities[key],peers=this.actors().filter(b=>b!==a&&!online(b)&&b.auto&&!b.match&&Boolean(b.demo)===Boolean(a.demo)).slice(0,spec.min-1);if(peers.length>=spec.min-1)this.choose(a,key,peers);else a.next=now+5000}}}
 }
 mesh(geo,color,parent,pos=[0,0,0]){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.6}));m.position.set(...pos);parent.add(m);return m}
 equipment(match){const key=match.activity;
 if(!match.ball&&['basketball','football','tennis','badminton','pickleball'].includes(key)){const radius=key==='basketball'?.12:key==='football'?.11:.045;match.ball=this.mesh(new T.SphereGeometry(radius,16,10),key==='basketball'?'#d9772b':key==='football'?'#faf6e4':'#def75a',this.world.scene);if(key==='badminton'){const skirt=this.mesh(new T.ConeGeometry(.08,.14,10,1,true),'#fffdf4',match.ball,[0,.08,0]);skirt.rotation.x=Math.PI} }
 for(const a of match.members){if(a.props?.length)continue;a.anchor=a.rig.model.position.clone();this.clearProps(a);const hand=a.rig.model.getObjectByName('RHand');if(['tennis','badminton','pickleball'].includes(key)){const racket=new T.Group();hand.add(racket);a.props=[racket];racket.rotation.x=-Math.PI/2;this.mesh(new T.CylinderGeometry(.018,.018,.26,8),'#314a52',racket,[0,-.12,0]);const head=this.mesh(key==='pickleball'?new T.BoxGeometry(.23,.32,.04):new T.TorusGeometry(.16,.015,6,20),'#dccda9',racket,[0,-.40,0]);if(key!=='pickleball')for(let i=-2;i<=2;i++){this.mesh(new T.BoxGeometry(.25,.005,.005),'#b9d6d4',racket,[0,-.40+i*.045,0]);this.mesh(new T.BoxGeometry(.005,.25,.005),'#b9d6d4',racket,[i*.045,-.40,0])}}
 if(['coffee','smoking','gym'].includes(key)){const prop=new T.Group();hand.add(prop);a.props=[prop];if(key==='coffee')this.mesh(new T.CylinderGeometry(.05,.04,.10,12),'#f5eee4',prop);if(key==='smoking')this.mesh(new T.CylinderGeometry(.006,.006,.08,6),'#eee5c9',prop);if(key==='gym'){this.mesh(new T.CylinderGeometry(.018,.018,.25,8),'#bec6c4',prop).rotation.z=Math.PI/2;for(const side of [-1,1])this.mesh(new T.BoxGeometry(.08,.16,.16),'#253335',prop,[side*.12,0,0])}}
 }
 }
 play(match,dt,t){const spec=activities[match.activity],key=match.activity,ready=match.members.filter(a=>a.arrived),m=ready[0];if(!m)return;
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
 if(key==='swim')for(const [i,a] of ready.entries()){const u=Math.min(t/4,1);a.rig.model.rotation.x=-Math.PI/2*u;a.rig.model.position.set(42+u*20+Math.sin(t*.22)*Math.min(t,12),.4,48+i*3);a.rig.model.rotation.y=Math.cos(t*.22)>0?Math.PI/2:-Math.PI/2;}
 if(key==='garden')for(const [i,a] of ready.entries()){a.rig.model.position.set(-35+Math.sin(t*.18+i)*.6,.2,-67+Math.sin(t*.12+i)*13);a.rig.model.rotation.y=Math.cos(t*.12+i)>0?0:Math.PI;}
 }
 disposeMatch(match){match.ball?.geometry.dispose();match.ball?.material.dispose();match.ball?.removeFromParent();match.ball=null;}
 dispose(){for(const a of this.actors())this.clearProps(a);for(const m of this.matches.values())this.disposeMatch(m);this.matches.clear()}
}
