import * as T from 'three';
import {clearPoint,clearSegment,floorHeight} from './navigation.js';
import {routeActor} from './leisure.js';
export class Seating{
 constructor(world,actors){this.world=world;this.actors=actors;}
 available(a,type){return this.world.seats.filter(s=>s.floor===a.floor&&!s.occupant&&(!type||s.type===type)).sort((x,y)=>x.hip.distanceTo(a.rig.model.position)-y.hip.distanceTo(a.rig.model.position));}
 standPoint(a,s){for(const distance of [1,1.5,2])for(const offset of [0,.8,-.8,Math.PI]){const yaw=s.facing+offset,p={x:s.hip.x+Math.sin(yaw)*distance,z:s.hip.z+Math.cos(yaw)*distance};if(clearPoint(p.x,p.z,s.floor,this.world.obstacles[s.floor])&&!this.actors().some(b=>b!==a&&b.floor===s.floor&&Math.hypot(b.rig.model.position.x-p.x,b.rig.model.position.z-p.z)<.7))return p;}return null;}
 sit(a,type){if(a.vehicle||a.lift||a.seating)return false;for(const seat of this.available(a,type)){const approach=this.standPoint(a,seat);if(!approach||!routeActor(a,{...approach,floor:seat.floor},this.world))continue;seat.occupant=a.id;a.seating={seat,stage:'approach',manual:a.manual,auto:a.auto};a.manual=false;a.auto=false;return true}return false;}
 stand(a){if(!a.seating)return true;const {seat}=a.seating,p=this.standPoint(a,seat);if(!p)return false;a.rig.model.position.set(p.x,floorHeight(a.floor),p.z);a.rig.model.rotation.set(0,seat.facing,0);seat.occupant=null;a.seating=null;a.path=[];a.state='idle';a.manual=true;a.auto=false;return true;}
 update(){for(const a of this.actors()){if(!a.seating&&!a.path.length&&!a.match&&!a.manual&&!a.vehicle&&!a.lift&&['work','sit','type','mouse'].includes(a.state)){const candidate=this.available(a).find(s=>s.hip.distanceTo(a.rig.model.position)<.9);if(candidate){candidate.occupant=a.id;a.seating={seat:candidate,stage:'seated',action:a.state}}}const seat=a.seating?.seat;if(!seat)continue;if(a.seating.stage==='approach'&&!a.path.length&&!a.routeFailed){a.seating.stage='seated';}if(a.seating.stage==='seated'){const hipHeight=.65*a.rig.model.scale.y;a.rig.model.position.copy(seat.hip).add(new T.Vector3(0,-hipHeight,0));a.rig.model.rotation.set(0,seat.facing,0);a.state=a.seating.action||'sit';}if(a.routeFailed){seat.occupant=null;a.seating=null;a.state='idle';a.manual=true;}}}
 release(a){if(a.seating){a.seating.seat.occupant=null;a.seating=null;}}
}
