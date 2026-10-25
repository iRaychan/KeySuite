import * as T from 'three';
// One obstruction system: section cutaways. Never changes camera distance or materials.
export class CameraSafety {
 constructor(world){this.world=world;this.sections=world.cutawaySections||[];this.ray=new T.Ray();this.hidden=[];this.zero=new T.Matrix4().makeScale(0,0,0);this.lastGood=null;this.recoveries=0;}
 update(camera,actor,dt,now,enabled=true){
 const p=actor?.rig.model.position,inside=p&&p.x>-66&&p.x<-4&&p.z>-20&&p.z<20&&actor.floor!=='roof';
 const aim=p?.clone().add(new T.Vector3(0,1.35,0));const touched=new Set();this.hidden=[];
 for(const section of this.sections){const box=section.bounds;let hide=false;
 if(enabled&&aim){const delta=camera.position.clone().sub(aim),distance=delta.length();this.ray.set(aim,delta.normalize());const expanded=box.clone().expandByScalar(section.kind==='wall'?.45:.15),hit=this.ray.intersectBox(expanded,new T.Vector3());const obstructs=!!hit&&hit.distanceTo(aim)<distance+.1;
 const localCeiling=inside&&section.kind==='slab'&&box.min.y>p.y+2&&box.min.y<camera.position.y+1&&box.distanceToPoint(new T.Vector3(p.x,box.min.y,p.z))<8;
 hide=obstructs||localCeiling;
 // Never remove the occupied floor surface or a floor below the avatar.
 if(section.kind==='slab'&&box.max.y<=p.y+1)hide=false;
 }
 if(hide){section.clearSince=0;}else if(section.hidden&&enabled){section.clearSince ||= now;hide=now-section.clearSince<350;}
 if(hide!==section.hidden){section.hidden=hide;section.mesh.setMatrixAt(section.id,hide?this.zero:section.transform);touched.add(section.mesh);}
 if(hide)this.hidden.push({object:section.mesh.uuid,instance:section.id,kind:section.kind,floor:section.floor});
 }
 for(const mesh of touched){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
 }
 recover(camera,actor,viewMode){
 // Recovery is reserved for invalid coordinates; ordinary walls use cutaways.
 const finite=camera.position.toArray().every(Number.isFinite)&&camera.quaternion.toArray().every(Number.isFinite);
 if(!finite&&this.lastGood){camera.position.copy(this.lastGood.position);camera.quaternion.copy(this.lastGood.quaternion);this.recoveries++;}
 if(camera.position.toArray().every(Number.isFinite))this.lastGood={position:camera.position.clone(),quaternion:camera.quaternion.clone()};
 }
 snapshot(){return this.hidden;}
}
