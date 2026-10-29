import * as T from 'three';
// One obstruction system: section cutaways. Never changes camera distance or materials.
export class CameraSafety {
 constructor(world){this.world=world;this.sections=world.cutawaySections||[];this.ray=new T.Ray();this.hidden=[];this.zero=new T.Matrix4().makeScale(0,0,0);this.lastGood=null;this.recoveries=0;this.attachments=[];
 }
 update(camera,actor,dt,now,enabled=true){
 const p=actor?.rig.model.position,inside=p&&p.x>-66&&p.x<-4&&p.z>-20&&p.z<20&&actor.floor!=='roof';
 const aim=p?.clone().add(new T.Vector3(0,1.35,0));const touched=new Set();this.hidden=[];
 for(const section of this.sections){const box=section.bounds;let hide=false;
 if(enabled&&aim&&section.kind==='slab'&&box.min.y>p.y+2){const expanded=box.clone().expandByScalar(section.kind==='wall'?.45:.15);
 // Sample the occupied room around the avatar as well as the avatar itself.
 const obstructs=[aim,...[[-2,0],[2,0],[0,-2],[0,2]].map(([x,z])=>aim.clone().add(new T.Vector3(x,0,z)))].some(target=>{const delta=camera.position.clone().sub(target),distance=delta.length();this.ray.set(target,delta.normalize());const hit=this.ray.intersectBox(expanded,new T.Vector3());return !!hit&&hit.distanceTo(target)<distance+.1;});
 const localCeiling=inside&&section.kind==='slab'&&box.min.y>p.y+2&&box.min.y<camera.position.y+1&&box.distanceToPoint(new T.Vector3(p.x,box.min.y,p.z))<8;
 hide=obstructs;
 // Never remove the occupied floor surface or a floor below the avatar.
 if(section.kind==='slab'&&box.max.y<=p.y+1)hide=false;
 }
 if(hide){section.hideSince ??= now;hide=section.hidden||now-section.hideSince>=150;section.clearSince=0;}else section.hideSince=null;
 if(hide){section.clearSince=0;}else if(section.hidden&&enabled){section.clearSince ||= now;hide=now-section.clearSince<650;}
 if(hide!==section.hidden){section.hidden=hide;section.mesh.setMatrixAt(section.id,hide?(section.kind==='wall'?this.lowWall(section):this.zero):section.transform);touched.add(section.mesh);}
 if(hide)this.hidden.push({object:section.mesh.uuid,instance:section.id,kind:section.kind,floor:section.floor});
 }
 for(const a of this.attachments){const hide=a.walls.some(s=>s.hidden);if(hide&&!a.hidden){a.wasVisible=a.object.visible;a.object.visible=false;}else if(!hide&&a.hidden)a.object.visible=a.wasVisible;a.hidden=hide;}
 for(const mesh of touched){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
 }
 recover(camera,actor,viewMode){
 // Recovery is reserved for invalid coordinates; ordinary walls use cutaways.
 const finite=camera.position.toArray().every(Number.isFinite)&&camera.quaternion.toArray().every(Number.isFinite);
 if(!finite&&this.lastGood){camera.position.copy(this.lastGood.position);camera.quaternion.copy(this.lastGood.quaternion);this.recoveries++;}
 if(camera.position.toArray().every(Number.isFinite))this.lastGood={position:camera.position.clone(),quaternion:camera.quaternion.clone()};
 }
 lowWall(section){if(!section.low){const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();section.transform.decompose(p,q,s);p.y=section.floorY+.09-section.mesh.getWorldPosition(new T.Vector3()).y;s.y=.18;section.low=new T.Matrix4().compose(p,q,s);}return section.low;}
 snapshot(){return this.hidden;}
}
