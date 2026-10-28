import {moveOnStairs} from './stairs.js';
import {clearSegment,floorHeight,walkingHeight} from './navigation.js';
export function advanceManual(a,keys,stick,dt,world,actors,cameraYaw){const m=a.rig.model;
   if((keys.has('ArrowLeft')||keys.has('KeyA')))m.rotation.y+=dt*1.8;if((keys.has('ArrowRight')||keys.has('KeyD')))m.rotation.y-=dt*1.8;if(Math.hypot(stick.x,stick.y)>.08)m.rotation.y=cameraYaw+Math.atan2(stick.x,stick.y);
   const speed=(Math.hypot(stick.x,stick.y)>.08?Math.min(1,Math.hypot(stick.x,stick.y)):Number((keys.has('ArrowUp')||keys.has('KeyW')))-Number((keys.has('ArrowDown')||keys.has('KeyS'))))*(a.run||keys.has('ShiftLeft')||keys.has('ShiftRight')?3.5:2.2)*dt,next={x:m.position.x+Math.sin(m.rotation.y)*speed,z:m.position.z+Math.cos(m.rotation.y)*speed};
   const stairMove=moveOnStairs(a,next);if(stairMove!==null){a.state=stairMove&&speed?(a.run?'run':'walk'):'idle';return;}
   const towerMove=world.diving?.tryMove(a,next);if(towerMove!==null&&towerMove!==undefined){a.state=towerMove&&speed?(a.run?'run':'walk'):'idle';return;}
   if(clearSegment(m.position,next,a.floor,world.obstacles[a.floor]||[])&&clearSegment(m.position,next,a.floor,(world.dynamicColliders||[]).filter(o=>!o.floor||o.floor===a.floor))){m.position.x=next.x;m.position.z=next.z;if(a.floor==='all'||a.floor==='0'){a.floor=next.x>-65&&next.x<-5&&next.z>-19&&next.z<19?'0':'all';m.position.y=walkingHeight(next.x,next.z,a.floor)}a.state=speed?(a.run?'run':'walk'):'idle'}else a.state='idle';
  
}
