import {clearSegment,floorHeight,walkingHeight} from './navigation.js';
export function advanceManual(a,keys,stick,dt,world,actors,cameraYaw){const m=a.rig.model;
   if(keys.has('ArrowLeft'))m.rotation.y+=dt*1.8;if(keys.has('ArrowRight'))m.rotation.y-=dt*1.8;if(Math.hypot(stick.x,stick.y)>.08)m.rotation.y=cameraYaw+Math.atan2(stick.x,stick.y);
   const speed=(Math.hypot(stick.x,stick.y)>.08?Math.min(1,Math.hypot(stick.x,stick.y)):Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*(a.run?3.5:2.2)*dt,next={x:m.position.x+Math.sin(m.rotation.y)*speed,z:m.position.z+Math.cos(m.rotation.y)*speed};
   if(clearSegment(m.position,next,a.floor,world.obstacles[a.floor]||[])&&clearSegment(m.position,next,a.floor,(world.dynamicColliders||[]).filter(o=>!o.floor||o.floor===a.floor))&&!actors.some(b=>b!==a&&b.floor===a.floor&&Math.hypot(next.x-b.rig.model.position.x,next.z-b.rig.model.position.z)<.55)){m.position.x=next.x;m.position.z=next.z;if(a.floor==='all'||a.floor==='0'){a.floor=next.x>-65&&next.x<-5&&next.z>-19&&next.z<19?'0':'all';m.position.y=walkingHeight(next.x,next.z,a.floor)}a.state=speed?(a.run?'run':'walk'):'idle'}else a.state='idle';
  
}
