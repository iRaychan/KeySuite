const indices=new WeakMap();
function nearby(obstacles,x,z,r){let index=indices.get(obstacles);if(!index||index.length!==obstacles.length){const cells=new Map();for(const o of obstacles)for(let cx=Math.floor((o.x-o.w/2)/5);cx<=Math.floor((o.x+o.w/2)/5);cx++)for(let cz=Math.floor((o.z-o.d/2)/5);cz<=Math.floor((o.z+o.d/2)/5);cz++){const k=cx+','+cz;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(o)}index={length:obstacles.length,cells};indices.set(obstacles,index)}const result=new Set();for(let cx=Math.floor((x-r)/5);cx<=Math.floor((x+r)/5);cx++)for(let cz=Math.floor((z-r)/5);cz<=Math.floor((z+r)/5);cz++)for(const o of index.cells.get(cx+','+cz)||[])result.add(o);return [...result];}
// Shared collision model for paths, manual walking and vehicles. Units are metres.
export const floorHeight=f=>f==='all'?.2:f==='roof'?14.8:Number(f)*4.8+.4;
export function clearPoint(x,z,floor,obstacles=[],radius=.24){
 if(floor==='all'||floor==='0'){
  if(x<=-105+radius||x>=100-radius||z<=-120+radius||z>=90-radius)return false;
  if(x>43-radius&&x<87+radius&&z>42-radius&&z<66+radius)return false;
  if(Math.hypot(x+31,z-53)<15+radius)return false;
 }else{if(x<-63+radius||x>-7-radius||z<-17+radius||z>17-radius)return false;if(x>-37-radius&&x<-33+radius&&z<-10+radius)return false;}
 return !nearby(obstacles,x,z,radius).some(o=>Math.abs(x-o.x)<o.w/2+radius&&Math.abs(z-o.z)<o.d/2+radius);
}
export function clearSegment(a,b,f,obstacles=[],radius=.24){const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/.18));for(let i=1;i<=n;i++)if(!clearPoint(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,f,obstacles,radius))return false;return true;}
export const groundFloorAt=(x,z)=>x>-65&&x<-5&&z>-19&&z<19?'0':'all';
export function groundPath(start,end,floor,obstacles=[]){
 if(!clearPoint(end.x,end.z,floor,obstacles))return null;
 if(clearSegment(start,end,floor,obstacles))return [end];
 const step=.5,key=(x,z)=>x+','+z,cell=p=>[Math.round(p.x/step),Math.round(p.z/step)],a=cell(start),open=[],cost=new Map(),previous=new Map(),points=new Map();
 const push=n=>{open.push(n);let i=open.length-1;while(i){const p=(i-1)>>1;if(open[p].f<=n.f)break;open[i]=open[p];i=p}open[i]=n};
 const pop=()=>{const first=open[0],last=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let c=i*2+1;if(c+1<open.length&&open[c+1].f<open[c].f)c++;if(open[c].f>=last.f)break;open[i]=open[c];i=c}open[i]=last}return first};
 const startKey=key(...a);cost.set(startKey,0);points.set(startKey,start);push({x:a[0],z:a[1],k:startKey,g:0,f:0});let found=null,visited=0;
 while(open.length&&visited++<180000){const c=pop();if(c.g!==cost.get(c.k))continue;const point=points.get(c.k);
  if(Math.hypot(point.x-end.x,point.z-end.z)<step*1.5&&clearSegment(point,end,floor,obstacles)){found=c.k;break}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=c.x+dx,z=c.z+dz,k=key(x,z),p={x:x*step,z:z*step},g=c.g+Math.hypot(dx,dz)*step;if(g>=(cost.get(k)??Infinity)||!clearSegment(point,p,floor,obstacles))continue;cost.set(k,g);previous.set(k,c.k);points.set(k,p);push({x,z,k,g,f:g+Math.hypot(p.x-end.x,p.z-end.z)})}
 }
 if(!found)return null;const path=[end];for(let k=found;k&&k!==startKey;k=previous.get(k))path.push(points.get(k));path.reverse();
 const reduced=[];let current=start;for(let i=0;i<path.length;){let j=i;while(j+1<path.length&&clearSegment(current,path[j+1],floor,obstacles))j++;reduced.push(path[j]);current=path[j];i=j+1}return reduced;
}
export function roadPoint(x,z,r=1){return (x>-104+r&&x<8-r&&z>36+r&&z<80-r)||(x>14+r&&x<22-r&&z>7+r&&z<99-r)||(x>10+r&&x<18-r&&z>-111+r&&z<39-r)||(x>-67+r&&x<-1-r&&z>24.5+r&&z<35.5-r)||(x>14+r&&x<101-r&&z>29.5+r&&z<36.5-r);}
