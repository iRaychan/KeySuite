/* Shared display curve for CHC, BFI and ES. Does not modify hydraulic data or motor sizing. */
(function(root){
  'use strict';
  function fit(input){
    const groups=new Map();
    for(const p of input||[]){const x=Number(p.x),y=Number(p.y);if(!Number.isFinite(x)||x<0||!Number.isFinite(y)||y<0)continue;const g=groups.get(x)||[];g.push(y);groups.set(x,g)}
    const all=[...groups].map(([x,ys])=>({x,y:ys.reduce((a,b)=>a+b,0)/ys.length})).sort((a,b)=>a.x-b.x);
    const positive=all.filter(p=>p.x>1e-9);if(positive.length<2||!(positive[0].y>0))return null;
    const [a]=positive;
    // V4.28.57: Point 1 is display-only shut-off power and is always derived
    // from Point 2. All positive-flow source values remain untouched.
    const y0=a.y*.68;
    const pts=[{x:0,y:y0},...positive],n=pts.length,h=[],s=[],d=new Array(n).fill(0);
    for(let i=0;i<n-1;i++){h[i]=pts[i+1].x-pts[i].x;s[i]=(pts[i+1].y-pts[i].y)/h[i]}
    for(let i=1;i<n-1;i++){if(s[i-1]*s[i]>0){const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];d[i]=(w1+w2)/(w1/s[i-1]+w2/s[i])}}
    function edge(h0,h1,s0,s1){let m=((2*h0+h1)*s0-h0*s1)/(h0+h1);if(Math.sign(m)!==Math.sign(s0))m=0;else if(Math.sign(s0)!==Math.sign(s1)&&Math.abs(m)>3*Math.abs(s0))m=3*s0;return m}
    d[0]=edge(h[0],h[1],s[0],s[1]);d[n-1]=edge(h[n-2],h[n-3],s[n-2],s[n-3]);
    // The first displayed span is a quintic Hermite bridge. It matches value,
    // slope and curvature at the first real power point, so the estimated
    // Q=0 extension joins the shape-preserving curve with C2 continuity.
    // Later spans remain the bounded PCHIP interpolation through source points.
    const bridge=(()=>{
      const h0=pts[1].x-pts[0].x;if(!(h0>0))return null;
      let endSecond=0;
      if(n>2){const h1=pts[2].x-pts[1].x;endSecond=(-6*pts[1].y-4*h1*d[1]+6*pts[2].y-2*h1*d[2])/(h1*h1)}
      if(!Number.isFinite(endSecond))endSecond=0;
      const a0=pts[0].y,a1=d[0]*h0,a2=0;
      const r0=pts[1].y-a0-a1-a2,r1=d[1]*h0-a1-2*a2,r2=endSecond*h0*h0-2*a2;
      return {x1:pts[1].x,h:h0,minY:Math.min(pts[0].y,pts[1].y),maxY:Math.max(pts[0].y,pts[1].y),a:[a0,a1,a2,10*r0-4*r1+r2/2,-15*r0+7*r1-r2,6*r0-3*r1+r2/2],endSecond};
    })();
    return {pts,d,bridge,min:0,max:pts[n-1].x,y0,estimatedShutoff:true,shutoffFactor:.68};
  }
  function value(curve,x){
    x=Number(x);if(!curve||!Number.isFinite(x)||x<0||x>curve.max+1e-9)return NaN;
    const {pts,d}=curve;if(x<=0)return pts[0].y;if(x>=curve.max)return pts[pts.length-1].y;
    if(curve.bridge&&x<=curve.bridge.x1+1e-9){const b=curve.bridge,t=Math.max(0,Math.min(1,x/b.h)),a=b.a,y=a[0]+a[1]*t+a[2]*t*t+a[3]*t**3+a[4]*t**4+a[5]*t**5;return Math.max(b.minY,Math.min(b.maxY,y))}
    let lo=0,hi=pts.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(pts[mid].x<=x)lo=mid;else hi=mid}
    const a=pts[lo],b=pts[hi],h=b.x-a.x,t=(x-a.x)/h,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*a.y+(t3-2*t2+t)*h*d[lo]+(-2*t3+3*t2)*b.y+(t3-t2)*h*d[hi];
  }
  const api={fit,value};if(typeof module==='object'&&module.exports)module.exports=api;else root.KeySuitePowerCurve=api;
})(typeof globalThis!=='undefined'?globalThis:this);
