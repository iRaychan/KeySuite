import * as T from 'three';
import {floorHeight} from './navigation.js';
export class Elevator{
 constructor(world){this.world=world;this.stops=world.floorGroups.map((_,i)=>String(i)).concat('roof');this.floor='0';this.y=floorHeight('0');this.queue=[];this.passengers=[];this.capacity=4;this.phase='idle';this.door=0;this.destination=null;this.calls=[];this.buttons=[];
 const root=this.root=new T.Group();root.name='campus-elevator';world.scene.add(root);const metal=new T.MeshStandardMaterial({color:'#6b8888',metalness:.6,roughness:.3}),light=new T.MeshStandardMaterial({color:'#eef2db'});
 const box=(p,s,mat=metal,parent=root)=>{const m=new T.Mesh(new T.BoxGeometry(...s),mat);m.position.set(...p);parent.add(m);return m};
 this.cabin=new T.Group();root.add(this.cabin);this.cabin.position.set(-35,this.y,-12);box([0,-.08,0],[3.5,.16,3.6],metal,this.cabin);box([0,1.5,-1.7],[3.5,3,.1],metal,this.cabin);for(const x of [-1.7,1.7])box([x,1.5,0],[.1,3,3.4],metal,this.cabin);box([0,3,0],[3.5,.1,3.6],light,this.cabin);
 this.landings=this.stops.map(f=>{const g=new T.Group();g.position.set(-35,floorHeight(f),-10.2);root.add(g);const doors=[-1,1].map(sign=>box([sign*.85,1.45,0],[1.68,2.9,.1],metal,g));const call=box([2,1.1,.1],[.25,.45,.1],light,g);call.userData.elevatorFloor=f;this.buttons.push(call);return {f,g,doors}});
 this.canvas=document.createElement('canvas');this.canvas.width=256;this.canvas.height=64;this.texture=new T.CanvasTexture(this.canvas);const sign=new T.Mesh(new T.PlaneGeometry(2,.5),new T.MeshBasicMaterial({map:this.texture}));sign.position.set(0,2.65,-1.62);this.cabin.add(sign);this.label();
 }
 label(){const c=this.canvas.getContext('2d');c.fillStyle='#102b31';c.fillRect(0,0,256,64);c.fillStyle='#b8ffd5';c.font='28px sans-serif';c.textAlign='center';c.fillText(`${this.floor==='roof'?'R':Number(this.floor)+1}  ·  ${this.phase}`,128,43);this.texture.needsUpdate=true;}
 request(actor,to){if(to!==null&&!this.stops.includes(to)||actor.lift)return;actor.lift={from:actor.floor,to,stage:'waiting'};this.queue.push(actor);}
 call(f){if(this.stops.includes(f)&&!this.calls.includes(f))this.calls.push(f)}
 moveActor(a,x,y,z,dt){const p=a.rig.model.position,d=Math.hypot(x-p.x,y-p.y,z-p.z),k=d?Math.min(1,dt*1.5/d):1;if(Math.hypot(x-p.x,z-p.z)>.01)a.rig.model.rotation.y=Math.atan2(x-p.x,z-p.z);p.lerp(new T.Vector3(x,y,z),k);a.state=d>.02?'walk':'idle';return d<.03;}
 update(dt){
  this.queue=this.queue.filter(a=>a.lift);this.passengers=this.passengers.filter(a=>a.lift);
  const set=p=>{this.phase=p;this.label()};
  if(this.phase==='idle'){
   const waiting=this.queue[0];this.destination=waiting?.lift.from||this.calls.shift();if(this.destination!=null){set(this.destination===this.floor?'opening':'moving')}
  }else if(this.phase==='moving'){
   const end=floorHeight(this.destination),delta=Math.sign(end-this.y)*Math.min(Math.abs(end-this.y),dt*1.7);this.y+=delta;this.cabin.position.y=this.y;
   for(const a of this.passengers){a.rig.model.position.y+=delta;a.state='idle';a.floor=this.floor;}
   if(Math.abs(end-this.y)<.001){this.floor=this.destination;for(const a of this.passengers)a.floor=this.floor;set('opening')}
  }else if(this.phase==='opening'){
   this.door=Math.min(1,this.door+dt*1.3);if(this.door===1)set('unloading');
  }else if(this.phase==='unloading'){
   const leaving=this.passengers.filter(a=>a.lift.to===this.floor);for(const a of leaving){a.lift.stage='exiting';if(this.moveActor(a,-35+(a.lift.slot%2? .7:-.7),this.y,-8.6,dt)){a.lift=null;this.passengers=this.passengers.filter(b=>b!==a)}}if(!leaving.length)set('boarding');
  }else if(this.phase==='boarding'){
   const waiting=this.queue.filter(a=>a.lift.from===this.floor).slice(0,this.capacity-this.passengers.length);
   for(const a of waiting){this.queue=this.queue.filter(b=>b!==a);a.lift.slot=[0,1,2,3].find(i=>!this.passengers.some(b=>b.lift.slot===i));a.lift.stage='boarding';this.passengers.push(a)}
   let ready=true;for(const a of this.passengers){if(a.lift.stage==='riding')continue;const slot=a.lift.slot;if(this.moveActor(a,-35+(slot%2?.65:-.65),this.y,-11.5-Math.floor(slot/2)*1.1,dt))a.lift.stage='riding';else ready=false}
   if(ready&&this.passengers.some(a=>a.lift.to===null)){set('selecting');return}
   if(ready){this.hold=(this.hold||0)+dt;if(this.hold>1){this.hold=0;set('closing')}}
  }else if(this.phase==='closing'){
   this.door=Math.max(0,this.door-dt*1.3);if(this.door===0){this.destination=this.passengers[0]?.lift.to||this.queue[0]?.lift.from||this.calls.shift();set(this.destination!=null&&this.destination!==this.floor?'moving':'idle')}
  }
  for(const l of this.landings){l.doors.forEach((d,i)=>d.position.x=(i?1:-1)*(.85+(l.f===this.floor?this.door:0)*1.65));}
 }
 selectDestination(a,f){if(!this.stops.includes(f)||!this.passengers.includes(a)||a.lift.stage!=='riding')return false;a.lift.to=f;if(this.phase==='selecting'&&!this.passengers.some(b=>b.lift.to===null))this.phase=f===this.floor?'unloading':'closing';this.label();return true;}
 cancel(a){if(a.lift?.stage==='waiting'){this.queue=this.queue.filter(b=>b!==a);a.lift=null;return true}return !a.lift;}
 snapshot(){return {floor:this.floor,y:this.y,phase:this.phase,door:this.door,capacity:this.capacity,queue:this.queue.length,passengers:this.passengers.map(a=>a.id)}}
}
