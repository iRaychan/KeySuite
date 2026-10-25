export const gameSpecs={
 basketball:{name:'Basketball',bounds:[43,71,.5,15.5],floor:'all',modes:{practice:1,'1-on-1':2,'3-on-3':6,'5-on-5':10},radius:.12},
 football:{name:'Football',bounds:[23,91,-116.5,-11.5],floor:'all',modes:{practice:1,match:2},radius:.11},
 tennis:{name:'Tennis',bounds:[-92.4,-81.6,-77.8,-54.2],floor:'all',modes:{practice:1,singles:2,doubles:4},radius:.045,net:-66},
 badminton:{name:'Badminton',bounds:[-89,-83,-6.7,6.7],floor:'all',modes:{practice:1,singles:2,doubles:4},radius:.045,net:0},
 pickleball:{name:'Pickleball',bounds:[-90,-84,-36.7,-23.3],floor:'all',modes:{practice:1,singles:2,doubles:4},radius:.045,net:-30},
 swim:{name:'Swimming',bounds:[46,84,45,63],floor:'all',modes:{free:1,laps:1,'timed-race':1,'multiplayer-race':2}},
 gym:{name:'Workout',bounds:[-29,-10,7,15],floor:'2',modes:{individual:1,'group-challenge':2}}
};
export function boundedMove(p,input,dt,bounds,speed=2.2){const length=Math.hypot(input.x,input.z),scale=length>1?1/length:1;return {x:Math.max(bounds[0]+.35,Math.min(bounds[1]-.35,p.x+input.x*scale*speed*dt)),z:Math.max(bounds[2]+.35,Math.min(bounds[3]-.35,p.z+input.z*scale*speed*dt))};}
export function launchBall(from,target,power,kind='basketball'){const distance=Math.hypot(target.x-from.x,target.z-from.z),t=Math.max(.35,distance/(4+Math.max(.1,Math.min(1,power))*8));return {x:from.x,y:from.y,z:from.z,vx:(target.x-from.x)/t,vy:Math.min(12,(target.y-from.y+4.905*t*t)/t),vz:(target.z-from.z)/t,scored:false,kind,bounces:0};}
export function stepBall(ball,dt,spec){const old={...ball};ball.vy-=9.81*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.z+=ball.vz*dt;let score=0;
 if(ball.kind==='basketball'&&!ball.scored&&old.y>=3.05&&ball.y<3.05&&ball.vy<0){const t=(old.y-3.05)/(old.y-ball.y),x=old.x+(ball.x-old.x)*t,z=old.z+(ball.z-old.z)*t;for(const hoop of [45.2,68.8])if(Math.hypot(x-hoop,z-8)<.38){score=2;ball.scored=true;ball.goal=hoop;}}
 if(ball.kind==='football'&&!ball.scored&&(ball.z<=-115.7||ball.z>=-12.3)&&Math.abs(ball.x-57)<3.66&&ball.y<2.44){score=1;ball.scored=true;ball.goal=ball.z<-64?'north':'south';ball.vz*=-.3;}
 if(spec.net!==undefined&&(old.z-spec.net)*(ball.z-spec.net)<0&&ball.y<1.35)ball.fault='net';
 if(ball.y<.42+(spec.radius||.1)){ball.y=.42+(spec.radius||.1);ball.vy=Math.abs(ball.vy)*.55;ball.vx*=.82;ball.vz*=.82;ball.bounces++;ball.bounceSide=ball.z<spec.net?0:1;}
 const [minX,maxX,minZ,maxZ]=spec.bounds;if(spec.net!==undefined&&(ball.x<minX||ball.x>maxX||ball.z<minZ||ball.z>maxZ))ball.fault='out';if(ball.x<minX||ball.x>maxX){ball.x=Math.max(minX,Math.min(maxX,ball.x));ball.vx*=-.65}if(ball.z<minZ||ball.z>maxZ){ball.z=Math.max(minZ,Math.min(maxZ,ball.z));ball.vz*=-.65;}
 return score;
}
