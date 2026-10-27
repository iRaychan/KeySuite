import * as T from 'three';
import {routeActor} from './leisure.js';
export const divingLevels=[10,20,30];
// Six switchback flights share the same surfaces for manual and guided movement.
export class Diving{
 constructor(world,leisure){
 this.world=world;this.leisure=leisure;this.effects=[];this.surfaces=[];world.diving=this;
 const root=new T.Group();root.name='Stainless steel high-diving tower';world.scene.add(root);this.root=root;
 const steel=new T.MeshStandardMaterial({color:'#d5e0e6',metalness:.65,roughness:.34}),deck=new T.MeshStandardMaterial({color:'#526b78',metalness:.65,roughness:.55}),blue=new T.MeshStandardMaterial({color:'#46bcff',emissive:'#168ed9',emissiveIntensity:1.1}),white=new T.MeshStandardMaterial({color:'#effaff',emissive:'#d5f5ff',emissiveIntensity:.7});
 // Batch repeated boxes into four draw calls.
 const batches=new Map(),box=(x,y,z,w,h,d,mat=steel)=>{if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion(),new T.Vector3(w,h,d)));};
 const rail=(x1,z1,x2,z2,y)=>{const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/1.4);for(let i=0;i<=n;i++){const t=i/n;box(x1+(x2-x1)*t,y+.55,z1+(z2-z1)*t,.055,1.1,.055);}box((x1+x2)/2,y+1.1,(z1+z2)/2,Math.abs(x2-x1)+.06,.06,Math.abs(z2-z1)+.06);};
 const flat=(x,z,w,d,y)=>{this.surfaces.push({x,z,w,d,y});box(x,y-.10,z,w,.20,d,deck);};
 for(let flight=0;flight<6;flight++){
 const x=flight%2?74.5:71.5,y=.2+flight*5,forward=flight%2===0;
 this.surfaces.push({x,z:35,w:2,d:10,y,flight,forward});
 for(let step=0;step<25;step++){const z=forward?30+(step+.5)*.4:40-(step+.5)*.4,top=y+(step+1)*.2;box(x,top-.1,z,2,.2,.4,deck);if(step%5===0){box(x,top+.012,z,1.85,.02,.055,white);for(const side of [-1,1])box(x+side*.98,top+.55,z,.055,1.1,.055);}}
 // Continuous sloping rails, constructed with a shared unit box.
 for(const side of [-1,1]){const start=new T.Vector3(x+side*.98,y+1.1,forward?30:40),end=new T.Vector3(x+side*.98,y+6.1,forward?40:30),delta=end.clone().sub(start);batches.get(steel).push(new T.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()),new T.Vector3(.06,delta.length(),.06)));}
 const z=forward?41:29,top=y+5;flat(73,z,5,2,top);rail(70.5,z+(forward?1:-1),75.5,z+(forward?1:-1),top);
 if(forward){rail(70.5,40,70.5,42,top);rail(75.5,40,75.5,42,top);}
 }
 flat(71.5,29,2,2,.2);
 for(const level of divingLevels){const y=.2+level;flat(77.5,29,6,2,y);flat(80,38,2,18,y);rail(74.5,28,81,28,y);rail(75.5,30,79,30,y);rail(79,30,79,46,y);rail(81,28,81,46,y);box(80,y+.015,46,1.8,.03,.12,blue);box(80,y-.08,38,.08,.08,18,blue);
 const c=document.createElement('canvas');c.width=256;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#173a49';ctx.fillRect(0,0,256,96);ctx.fillStyle='#ecfaff';ctx.font='bold 56px sans-serif';ctx.textAlign='center';ctx.fillText(level+' m',128,68);const sign=new T.Mesh(new T.PlaneGeometry(2.4,.9),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),side:T.FrontSide}));sign.position.set(77,y+.7,28.02);root.add(sign);const back=sign.clone();back.rotation.y=Math.PI;back.position.z=27.98;root.add(back);
 // Cantilever truss under the board, tied to the tower's columns.
 for(const x of [79.15,80.85]){const start=new T.Vector3(x,y-3,40),end=new T.Vector3(x,y-.2,46),delta=end.clone().sub(start);batches.get(steel).push(new T.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()),new T.Vector3(.18,delta.length(),.18)));}
 }
 for(const x of [70.3,75.7,79.2,80.8])for(const z of [28,40]){box(x,15.2,z,.3,30.4,.3);box(x,15.2,z+.17,.055,30,.04,blue);}
 for(const [mat,transforms]of batches){const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat,transforms.length);transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 // Ground navigation routes around the tower; manual entry owns its elevations.
 world.obstacles.all.push({x:73,z:36,w:6,d:12},{x:80,z:35,w:2.5,d:14});
 }
 surfaceAt(x,z,y){
 const choices=[];
 for(const s of this.surfaces){if(Math.abs(x-s.x)>s.w/2-.24||Math.abs(z-s.z)>s.d/2+.02)continue;let height=s.y;if(s.flight!==undefined){const run=s.forward?z-30:40-z;height=s.y+Math.min(25,Math.max(0,Math.ceil((run-1e-8)/.4)))*.2;}if(Math.abs(height-y)<=.26)choices.push(height);}
 return choices.sort((a,b)=>Math.abs(a-y)-Math.abs(b-y))[0];
 }
 tryMove(a,next){const p=a.rig.model.position;if(a.floor!=='all'||a.diving)return null;
 const on=this.surfaceAt(p.x,p.z,p.y),height=this.surfaceAt(next.x,next.z,p.y);
 if(on===undefined&&height===undefined)return null;
 // Only ground-level entry can acquire a tower surface from ordinary ground.
 if(on===undefined&&(p.y>.5||height>.46))return false;
 if(height!==undefined&&height<30.3&&[70.3,75.7,79.2,80.8].some(x=>[28,40].some(z=>Math.abs(next.x-x)<.39&&Math.abs(next.z-z)<.39)))return false;
 if(height===undefined){if(p.y<.46&&next.z<28)return null;return false;}
 p.set(next.x,height,next.z);return true;
 }
 levelAt(a){const p=a.rig.model.position;return divingLevels.find(h=>Math.abs(p.y-(h+.2))<.08&&p.x>=79.2&&p.x<=80.8&&p.z>=45.5&&p.z<=47)||null;}
 maxSpins(level){return Math.max(1,Math.floor(Math.sqrt(2*level/9.81)*1.5));}
 start(a,level){if(!divingLevels.includes(level)||a.vehicle||a.lift||a.diving)return false;if(this.leisure.release(a)===false)return false;
 if(!routeActor(a,{x:71.5,z:28,y:.2,floor:'all'},this.world))return false;
 a.auto=false;a.manual=false;a.diving={level,stage:'approach',elapsed:0};return true;}
 cancel(a){if(!a.diving)return;if(['dive','surface'].includes(a.diving.stage))return;delete a.diving;a.path=[];a.manual=true;a.auto=false;a.controlMode='manual';a.rig.model.rotation.x=0;a.rig.model.rotation.z=0;a.state='idle';}
 jump(a,style='forward',spins=0){const level=this.levelAt(a);if(!level||a.diving||a.vehicle||a.lift)return false;const p=a.rig.model.position;a.path=[];a.auto=false;a.manual=false;a.diving={level,style:['forward','backward','twisting'].includes(style)?style:'forward',spins:Math.min(this.maxSpins(level),Math.max(0,Math.floor(Number(spins)||0))),stage:'dive',elapsed:0,start:p.clone(),yaw:a.rig.model.rotation.y};return true;}
 update(a,dt){const d=a.diving;if(!d)return false;const m=a.rig.model;
 if(d.stage==='approach'){if(a.routeFailed){this.cancel(a);return false;}if(a.path.length)return false;d.stage='climb';d.points=[new T.Vector3(71.5,.2,30)];for(let f=0;f<d.level/5;f++){const x=f%2?74.5:71.5,forward=f%2===0,y=.2+f*5;d.points.push(new T.Vector3(x,y,forward?30:40));for(let j=1;j<=25;j++)d.points.push(new T.Vector3(x,y+j*.2,forward?30+j*.4:40-j*.4));const z=forward?41:29;d.points.push(new T.Vector3(x,y+5,z),new T.Vector3(forward?74.5:71.5,y+5,z));}d.points.push(new T.Vector3(80,d.level+.2,29),new T.Vector3(80,d.level+.2,46));}
 if(d.stage==='climb'){let distance=dt*1.8;while(d.points.length&&distance>0){const dest=d.points[0],delta=dest.clone().sub(m.position),length=delta.length();m.rotation.y=Math.atan2(delta.x,delta.z);if(length<=distance){m.position.copy(dest);d.points.shift();distance-=length;}else{m.position.addScaledVector(delta,distance/length);distance=0;}}a.state='walk';if(!d.points.length){delete a.diving;a.manual=true;a.controlMode='manual';a.state='idle';}return true;}
 d.elapsed+=dt;m.rotation.order='YXZ';
 if(d.stage==='dive'){const duration=Math.sqrt(2*(d.start.y-.63)/9.81),u=Math.min(1,d.elapsed/duration),ease=u*u*(3-2*u);m.position.set(d.start.x,d.start.y-(d.start.y-.63)*u*u,d.start.z+5*u);m.rotation.y=d.yaw+(d.style==='twisting'?d.spins*Math.PI*2*ease:0);m.rotation.x=(d.style==='backward'?-1:1)*((d.style==='twisting'?0:d.spins)*Math.PI*2+Math.PI)*ease;a.state='swim';if(u===1){d.stage='surface';d.elapsed=0;d.entry=m.position.clone();this.splash(m.position.x,m.position.z);}}
 else if(d.stage==='surface'){const u=Math.min(1,d.elapsed/1.5);m.position.y=.63;m.rotation.x=Math.PI*(1-u)+Math.PI/2*u;m.rotation.z=0;a.state='swim';if(u===1){delete a.diving;a.activity=null;a.match=null;a.gameActive=false;a.afterPoolControl=true;a.controlMode='manual';a.path=[{x:88,z:m.position.z,y:.63,floor:'all',swim:true},{x:88,z:40,y:.2,floor:'all'}];a.manual=false;a.auto=false;}}
 return true;
 }
 splash(x,z){for(let i=0;i<12;i++){const mesh=new T.Mesh(new T.SphereGeometry(.055,6,4),new T.MeshBasicMaterial({color:'#dcffff',transparent:true,opacity:.85}));mesh.position.set(x,.65,z);this.world.scene.add(mesh);this.effects.push({mesh,age:0,angle:i*Math.PI/6});}}
 tick(dt){for(const p of this.effects){p.age+=dt;p.mesh.position.x+=Math.cos(p.angle)*dt*1.3;p.mesh.position.z+=Math.sin(p.angle)*dt*1.3;p.mesh.position.y=.65+2*p.age-2*p.age*p.age;p.mesh.material.opacity=Math.max(0,1-p.age);}for(const p of this.effects.filter(p=>p.age>=1)){p.mesh.removeFromParent();p.mesh.geometry.dispose();p.mesh.material.dispose();}this.effects=this.effects.filter(p=>p.age<1);}
}
