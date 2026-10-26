import * as T from 'three';
import {routeActor} from './leisure.js';
// One continuous staircase on the north deck, with three side landings over water.
export const divingLevels=[1,3,5];
export class Diving{
 constructor(world,leisure){this.world=world;this.leisure=leisure;this.effects=[];const root=new T.Group();root.name='Three-level diving platform';world.scene.add(root);this.root=root;
 const material=new T.MeshStandardMaterial({color:'#e8e4d7',roughness:.6}),rail=new T.MeshStandardMaterial({color:'#386f69',metalness:.4});
 const box=(x,y,z,w,h,d,mat=material)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);};
 for(let i=0;i<25;i++){const y=.2+(i+1)*.2,z=30+(i+.5)*.4;box(71.5,y-.1,z,1.5,.2,.4);for(const x of [70.7,72.3])box(x,y+.45,z,.055,.9,.055,rail);}
 for(const x of [70.7,72.3]){const start=new T.Vector3(x,1.3,30),end=new T.Vector3(x,6.3,40),bar=new T.Mesh(new T.CylinderGeometry(.045,.045,start.distanceTo(end),8),rail);bar.position.copy(start).add(end).multiplyScalar(.5);bar.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize());root.add(bar);}
 for(const level of divingLevels){const z=30+level*2;box(73.5,.2+level,z,4,.16,1.5);box(75.5,.2+level,(z+47)/2,1.2,.12,47-z);for(const x of [72.5,74.5])box(x,(level+.2)/2,z,.16,level+.2,.16,rail);for(const x of [72.5,73.5,74.5]){box(x,level+.7,z-.75,.06,1,.06,rail);box(x,level+.7,z+.75,.06,1,.06,rail);}}
 // Stair base blocks ordinary routes, while its explicit climbing path owns elevation.
 world.obstacles.all.push({x:71.5,z:35,w:1.6,d:10});
 }
 start(a,level){if(!divingLevels.includes(level)||a.vehicle||a.lift||a.diving)return false;if(this.leisure.release(a)===false)return false;
 if(!routeActor(a,{x:71.5,z:29,y:.2,floor:'all'},this.world))return false;
 a.auto=false;a.manual=false;a.diving={level,stage:'approach',elapsed:0};return true;
 }
 cancel(a){if(!a.diving)return;delete a.diving;a.path=[];a.rig.model.position.set(69.5,.2,29);a.rig.model.rotation.x=0;a.state='idle';}
 update(a,dt){const d=a.diving;if(!d)return false;const m=a.rig.model;
 if(d.stage==='approach'){if(a.routeFailed){this.cancel(a);return false;}if(a.path.length)return false;d.stage='climb';d.elapsed=0;}
 d.elapsed+=dt;m.rotation.order='YXZ';
 if(d.stage==='climb'){const u=Math.min(1,d.elapsed/(d.level*2));m.position.set(71.5,.2+d.level*u,30+d.level*2*u);m.rotation.set(0,0,0);a.state='walk';if(u===1){d.stage='edge';d.elapsed=0;d.start=m.position.clone();}}
 else if(d.stage==='edge'){const z=30+d.level*2,total=4+47-z,dist=Math.min(total,d.elapsed*1.8);m.position.set(Math.min(75.5,71.5+dist),.2+d.level,z+Math.max(0,dist-4));m.rotation.y=dist<4?Math.PI/2:0;a.state='walk';if(dist===total){d.stage='dive';d.elapsed=0;d.start=m.position.clone();}}
 else if(d.stage==='dive'){const duration=.65+Math.sqrt(d.level/4.9),u=Math.min(1,d.elapsed/duration);m.position.set(75.5,d.start.y*(1-u)+.2*u+Math.sin(Math.PI*u)*(d.level>1?1:.6),47+5*u);m.rotation.x=d.level===1?-.2*Math.sin(Math.PI*u):Math.sin(Math.PI*u)*Math.PI*.8;a.state=d.level===1?'cheer':'swim';if(u===1){d.stage='surface';d.elapsed=0;this.splash(75.5,52);}}
 else if(d.stage==='surface'){const u=Math.min(1,d.elapsed/1.5);m.position.set(75.5,.2+.35*u,52);m.rotation.x=Math.PI/2*u;a.state='swim';if(u===1){delete a.diving;this.leisure.games?.prepare('swim','free');if(!this.leisure.choose(a,'swim')){a.path=[{x:44,z:52,y:.55,floor:'all',swim:true},{x:42,z:52,y:.2,floor:'all'}];a.controlMode='manual';}return true;}}
 return true;
 }
 splash(x,z){for(let i=0;i<12;i++){const mesh=new T.Mesh(new T.SphereGeometry(.055,6,4),new T.MeshBasicMaterial({color:'#dcffff',transparent:true,opacity:.85}));mesh.position.set(x,.65,z);this.world.scene.add(mesh);this.effects.push({mesh,age:0,angle:i*Math.PI/6});}}
 tick(dt){for(const p of this.effects){p.age+=dt;p.mesh.position.x+=Math.cos(p.angle)*dt*1.3;p.mesh.position.z+=Math.sin(p.angle)*dt*1.3;p.mesh.position.y=.65+2*p.age-2*p.age*p.age;p.mesh.material.opacity=Math.max(0,1-p.age);}for(const p of this.effects.filter(p=>p.age>=1)){p.mesh.removeFromParent();p.mesh.geometry.dispose();p.mesh.material.dispose();}this.effects=this.effects.filter(p=>p.age<1);}
}
