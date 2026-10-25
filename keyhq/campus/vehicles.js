import * as T from 'three';
import {clearSegment,clearPoint,roadPoint} from './navigation.js';
import {routeActor,online} from './leisure.js';
export const vehicleSpecs={bicycle:{name:'Bicycle',capacity:1,speed:6.6,position:[-2,68]},scooter:{name:'Scooter',capacity:2,speed:8.8,position:[1,63]},hoverboard:{name:'Hoverboard',capacity:1,speed:4.4,position:[-2,58]},golfcart:{name:'Golf cart',capacity:4,speed:11,position:[1,71]}};
export class Vehicles{
 constructor({world,actors,session,keys,toast,post,leisure}){Object.assign(this,{world,actors,session,keys,toast,post,leisure});this.items=[];this.lastSend=0;this.rows=[];
 for(const [id,spec] of Object.entries(vehicleSpecs)){const group=new T.Group();group.name=id;group.position.set(spec.position[0],.2,spec.position[1]);world.scene.add(group);const v={id,spec,group,occupants:[],speed:0,wheels:[],session:null};this.items.push(v);
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.45,metalness:.25});const cream=mat('#eee8d8'),dark=mat('#243c40'),teal=mat('#3c8e85'),silver=mat('#b4c9c8');
 const box=(x,y,z,w,h,d,m=cream)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);group.add(o);return o};
 const wheel=(x,z,r=.33)=>{const o=new T.Mesh(new T.TorusGeometry(r,.08,8,24),dark);o.rotation.y=Math.PI/2;o.position.set(x,r,z);group.add(o);v.wheels.push(o)};
 if(id==='golfcart'){box(0,.45,0,1.8,.25,3.4);box(0,2.15,0,2,.12,3.4);for(const x of [-.85,.85]){box(x,1.3,1.5,.06,1.7,.06,silver);box(x,1.3,-1.5,.06,1.7,.06,silver);for(const z of [-1.1,1.1])wheel(x,z)}for(const z of [-.7,.7]){box(0,.75,z,1.6,.15,.7,dark);box(0,1.1,z-.35,1.6,.6,.12,teal)}v.seats=[[-.45,.28,.7],[.45,.28,.7],[-.45,.28,-.7],[.45,.28,-.7]];box(-.45,1.25,1.25,.5,.07,.28,dark)}
 else if(id==='hoverboard'){box(0,.22,0,.85,.12,.45,teal);wheel(-.46,0,.14);wheel(.46,0,.14);v.seats=[[0,.22,0]];}
 else{wheel(0,-.8);wheel(0,.8);box(0,.5,0,.16,.15,1.6,teal);box(0,.85,.8,.07,.7,.07,silver);box(0,1.18,.8,.8,.06,.08,dark);box(0,.85,-.15,id==='scooter'?.45:.3,.12,id==='scooter'?1.1:.4,dark);if(id==='scooter')box(0,.55,0,.4,.5,1.1,teal);else {box(0,.65,0,.07,.45,.07,silver);box(0,.38,0,.5,.07,.12,dark)}v.seats=id==='scooter'?[[0,.35,.15],[0,.35,-.45]]:[[0,.35,-.15]];}
 }
 }
 near(a){return this.items.find(v=>a.floor==='all'&&v.group.position.distanceTo(a.rig.model.position)<3)}
 approach(a,v){if(a.lift||a.vehicle){this.toast('Exit your current ride first.');return}this.leisure.release(a);const p=v.group.position;if(!routeActor(a,{x:p.x+2,z:p.z,floor:'all'},this.world))this.toast('No clear route to this vehicle.');else this.toast('Walk to '+v.spec.name+', then press Enter to ride.');}
 enter(a){if(a.vehicle)return this.exit(a);const v=this.near(a);if(!v){this.toast('Approach a parked vehicle first.');return}if(v.occupants.length>=v.spec.capacity){this.toast('This vehicle is full.');return}if(Math.abs(v.speed)>.05){this.toast('Wait until the vehicle stops.');return}
 if(v.session){this.toast('Ask the driver for a ride invitation.');return}
 this.post({type:'KEYHQ_SOCIAL',action:'create',activity:'ride_'+v.id,invitees:[],requestId:crypto.randomUUID()});
 }
 mount(a,v,slot){if(a.vehicle||a.lift)return;this.leisure.release(a);a.auto=false;a.manual=false;a.ridePending=null;a.vehicle=v;a.mounting=true;a.seat=slot;a.path=[];v.occupants.push(a);}
 exit(a,remote=false){const v=a.vehicle;if(!v)return true;if(Math.abs(v.speed)>.05){if(!remote)this.toast('Stop before exiting.');return false}const p=v.group.position;let end;for(const sign of [1,-1]){const candidate={x:p.x+Math.cos(v.group.rotation.y)*2*sign,z:p.z-Math.sin(v.group.rotation.y)*2*sign};if(clearPoint(candidate.x,candidate.z,'all',this.world.obstacles.all)&&!this.actors().some(b=>b!==a&&!v.occupants.includes(b)&&Math.hypot(candidate.x-b.rig.model.position.x,candidate.z-b.rig.model.position.z)<.7)){end=candidate;break}}
 if(!end){this.toast('No safe exit space.');return false}a.dismount=end;if(!remote)this.post({type:'KEYHQ_SOCIAL',action:a.userId===v.host?'end':'leave',id:v.session,requestId:crypto.randomUUID()});return true;
 }
 sync(rows,positions=[]){this.rows=rows;for(const v of this.items){const row=rows.find(s=>s.activity==='ride_'+v.id&&['waiting','playing'].includes(s.status));if(!row){for(const a of this.actors())if(a.ridePending===v.id){a.ridePending=null;a.path=[];a.auto=!online(a);a.next=performance.now()+3000;}for(const a of v.occupants){v.speed=0;this.exit(a,true)}v.session=null;v.remote=null;continue}v.session=row.id;v.host=row.host_id;
 const remote=positions.find(p=>p.session_id===row.id);if(remote&&v.host!==this.session().userId)v.remote=remote;
 const people=(row.participants||[]).filter(p=>['accepted','arrived'].includes(p.status)).sort((a,b)=>a.user_id===row.host_id?-1:b.user_id===row.host_id?1:a.user_id.localeCompare(b.user_id));
 for(const [slot,p] of people.entries()){const a=this.actors().find(a=>a.userId===p.user_id);if(!a||a.vehicle===v||slot>=v.spec.capacity)continue;if(a.ridePending!==v.id){this.leisure.release(a);a.auto=false;a.manual=false;a.ridePending=v.id;}const pos=v.group.position;if(a.floor==='all'&&a.rig.model.position.distanceTo(pos)<3){this.mount(a,v,slot)}else if(!a.path.length&&!a.lift)routeActor(a,{x:pos.x+2,z:pos.z,floor:'all'},this.world)}
 for(const a of v.occupants)if(!people.some(p=>p.user_id===a.userId)&&!a.dismount){v.speed=0;this.exit(a,true)}
 }}
 update(dt,now){
 this.world.dynamicColliders=this.items.map(v=>({x:v.group.position.x,z:v.group.position.z,w:v.id==='golfcart'?3.6:1.6,d:v.id==='golfcart'?3.6:1.6}));
 for(const v of this.items){const driver=v.occupants.find(a=>a.userId===v.host&&!a.dismount),p=v.group.position;
 if(driver&&v.host===this.session().userId&&!v.occupants.some(a=>a.mounting||a.dismount)){
  const input=this.analog&&Math.abs(this.analog.y)>.08?-this.analog.y:Number(this.keys.has('ArrowUp'))-Number(this.keys.has('ArrowDown'));v.speed=T.MathUtils.damp(v.speed,input*v.spec.speed,7,dt);if(Math.abs(v.speed)<.02)v.speed=0;
  const rotation=v.group.rotation.y+(this.analog&&Math.abs(this.analog.x)>.08?-this.analog.x:Number(this.keys.has('ArrowLeft'))-Number(this.keys.has('ArrowRight')))*dt*1.4;const next={x:p.x+Math.sin(rotation)*v.speed*dt,z:p.z+Math.cos(rotation)*v.speed*dt},radius=v.id==='golfcart'?1.8:v.id==='scooter'?1:.6;
  const clear=clearSegment(p,next,'all',this.world.obstacles.all,radius)&&(! (v.id==='golfcart')||roadPoint(next.x,next.z,1))&&!this.actors().some(a=>!v.occupants.includes(a)&&a.floor==='all'&&Math.hypot(next.x-a.rig.model.position.x,next.z-a.rig.model.position.z)<radius+.4)&&!this.items.some(o=>o!==v&&Math.hypot(next.x-o.group.position.x,next.z-o.group.position.z)<radius+1);
  if(clear){p.x=next.x;p.z=next.z;v.group.rotation.y=rotation}else v.speed=0;
  if(now-this.lastSend>200){this.lastSend=now;this.post({type:'KEYHQ_SOCIAL',action:'ride-position',id:v.session,x:p.x,z:p.z,yaw:v.group.rotation.y,speed:v.speed})}
 }else if(v.remote){p.lerp(new T.Vector3(v.remote.x,.2,v.remote.z),1-Math.exp(-dt*8));v.group.rotation.y=v.remote.yaw;v.speed=v.remote.speed;}
 v.group.updateWorldMatrix(true,false);for(const a of [...v.occupants]){let end;if(a.dismount)end=new T.Vector3(a.dismount.x,.2,a.dismount.z);else end=new T.Vector3(...v.seats[a.seat]).applyMatrix4(v.group.matrixWorld);
 const m=a.rig.model,d=m.position.distanceTo(end),step=dt*2;if(a.mounting||a.dismount)m.position.lerp(end,d?Math.min(1,step/d):1);else m.position.copy(end);m.rotation.set(0,v.group.rotation.y,0);a.path=[];a.floor='all';a.state=a.mounting||a.dismount?'walk':v.id==='hoverboard'?'idle':v.id==='bicycle'?'cycle':'ride';
 if(d<.03){a.mounting=false;if(a.dismount){a.vehicle=null;a.dismount=null;a.state='idle';a.returnToWork=online(a);v.occupants=v.occupants.filter(b=>b!==a)}}
 }
 for(const w of v.wheels)w.rotation.x+=v.speed*dt*2;
 }
 }
 snapshot(){return this.items.map(v=>({id:v.id,capacity:v.spec.capacity,position:v.group.position.toArray(),speed:v.speed,occupants:v.occupants.map(a=>a.id)}))}
}
