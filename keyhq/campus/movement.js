import {groundPath,walkingHeight,groundFloorAt} from './navigation.js';
// One movement owner per actor: elevator, vehicle, manual control, then routed walking.
export function advanceActor(a,actors,elevator,dt){
 if(a.vehicle||a.lift||a.manual||!a.path.length)return;
 const m=a.rig.model,p=a.path[0];if(a.path[1]?.liftTo&&Math.hypot(p.x-m.position.x,p.z-m.position.z)<1.5){const to=a.path[1].liftTo;a.path.splice(0,2);if(a.floor!==to)elevator.request(a,to);return}
 if(p.liftTo){a.path.shift();if(a.floor!==p.liftTo)elevator.request(a,p.liftTo);return}
 const dx=p.x-m.position.x,dz=p.z-m.position.z,dy=(p.y??m.position.y)-m.position.y,dist=!p.swim&&(a.floor==='all'||a.floor==='0')?Math.hypot(dx,dz):Math.hypot(dx,dz,dy),step=dt*(p.swim?1.2:2.2),k=dist?Math.min(1,step/dist):1;
 if(Math.hypot(dx,dz)>.01)m.rotation.y=Math.atan2(dx,dz);
 let nx=m.position.x+dx*k,nz=m.position.z+dz*k;
 const vehicleBlocked=a.floor==='all'&&(elevator.world.dynamicColliders||[]).filter(o=>!o.floor||o.floor===a.floor).some(o=>Math.abs(nx-o.x)<o.w/2+.25&&Math.abs(nz-o.z)<o.d/2+.25);
 const blocked=vehicleBlocked||actors.some(b=>b!==a&&!b.lift&&!b.vehicle&&b.floor===a.floor&&Math.hypot(nx-b.rig.model.position.x,nz-b.rig.model.position.z)<.52);
 if(!blocked){m.position.set(nx,m.position.y+dy*k,nz);if(!p.swim&&(a.floor==='all'||a.floor==='0')){a.floor=groundFloorAt(nx,nz);m.position.y=walkingHeight(nx,nz,a.floor);}if(dist<=step){a.floor=p.floor??a.floor;a.path.shift()}a.blockedFor=0}else a.blockedFor=(a.blockedFor||0)+dt;
 if(a.blockedFor>1.5){a.blockedFor=0;a.routeRetries=(a.routeRetries||0)+1;if(a.routeRetries>4){a.path=[];a.routeFailed=true;a.state='idle';a.next=performance.now()+15000;return;}const obstacles=[...(elevator.world.obstacles[a.floor]||[]),...(a.floor==='all'?elevator.world.dynamicColliders||[]:[]),...actors.filter(b=>b!==a&&b.floor===a.floor&&!b.lift).map(b=>({x:b.rig.model.position.x,z:b.rig.model.position.z,w:.6,d:.6}))];const route=groundPath(m.position,p,a.floor,obstacles);if(route)a.path=[...route.map(n=>({...n,y:m.position.y,floor:a.floor})),...a.path.slice(1)];}
 a.state=blocked?'idle':p.swim?'swim':'walk';m.rotation.x=p.swim?-Math.PI/2:0;
 if(!a.path.length){a.state='idle';if(a.returning){m.rotation.y=a.returning.facing;a.state=a.returning.action||'work';a.returning=null}}
}
