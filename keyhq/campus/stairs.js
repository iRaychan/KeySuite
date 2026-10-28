// Two switchback flights in the existing rear stair core. Metres; 0.2 m risers.
export const stairs={left:-45.6,right:-40.4,back:-15.6,front:-8.4,split:-43,lowX:-44.3,highX:-41.7,start:-9,end:-13.8,rise:4.8};
const level=f=>f==='all'?0:Number(f);
const within=(p)=>p.x>stairs.left+.24&&p.x<stairs.right-.24&&p.z>stairs.back+.24&&p.z<stairs.front;
export function stairHeight(x,z,base){const t=Math.max(0,Math.min(1,(-9-z)/4.8));return .4+base*4.8+(z<=-13.8?2.4:x<-43?2.4*t:4.8-2.4*t);}
// Return null when ordinary floor collision owns movement, false at a balustrade.
export function moveOnStairs(a,next){
 const p=a.rig.model.position;let base=a.stairBase;
 if(base===undefined){if(!within(next)||next.z>=-8.4)return null;if(p.z<-9.05)return false;const f=level(a.floor);if(!Number.isInteger(f)||f<0||f>2)return null;base=next.x<-43?f:f-1;if(base<0||base>1)return false;}
 const y=stairHeight(next.x,next.z,base);
 if(next.z>=stairs.front){if(p.z<-9.05)return false;a.floor=String(next.x<-43?base:base+1);delete a.stairBase;p.set(next.x,.4+Number(a.floor)*4.8,next.z);return true;}
 if(!within(next))return false;
 // A central guard separates flights except at the level mid-landing.
 if((p.x<-43)!==(next.x<-43)&&next.z>-13.9)return false;
 if(Math.abs(y-p.y)>.24)return false;
 a.stairBase=base;a.floor=String(next.x<-43?base:base+1);p.set(next.x,y,next.z);return true;
}
export function stairWaypoints(from,to){
 if(Math.abs(to-from)!==1||Math.min(from,to)<0||Math.max(from,to)>2)return null;
 const base=Math.min(from,to),up=to>from,points=[{x:-44.3,z:-8.2},{x:-44.3,z:-9},{x:-44.3,z:-14.5},{x:-41.7,z:-14.5},{x:-41.7,z:-9},{x:-41.7,z:-8.2}];if(!up)points.reverse();return points.map(p=>({...p,y:stairHeight(p.x,p.z,base),floor:String(p.x<-43?base:base+1),stairs:true}));
}
