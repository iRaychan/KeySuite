import * as T from 'three';
// Static structure shares the campus instancing pipeline; only nets and LED texture animate.
export function createBasketballArena({scene,box,cyl,line,ring,mat,text,bench,lamp,planter}){
 const blue=mat('#183e66'),teal=mat('#102d50'),white=mat('#e7f5f7'),steel=mat('#aebec4',{metalness:.55,roughness:.35});
 box(57,.18,8,34,.36,21,teal);box(57,.38,8,28,.03,15,blue);
 const rect=(x,z,w,d)=>line([[x-w/2,.415,z-d/2],[x+w/2,.415,z-d/2],[x+w/2,.415,z+d/2],[x-w/2,.415,z+d/2],[x-w/2,.415,z-d/2]],'#e7f5f7');
 rect(57,8,28,15);line([[57,.42,.5],[57,.42,15.5]],'#e7f5f7');ring(57,.42,8,1.8,'#e7f5f7');
 // Original supplied globe-and-script artwork, native aspect ratio and unmodified pixels.
 const logoTexture=new T.TextureLoader().load('../keylargo-logo.png',texture=>{const im=texture.image;logo.scale.y=im.height/im.width;});logoTexture.colorSpace=T.SRGBColorSpace;
 const logo=new T.Mesh(new T.PlaneGeometry(7,7),new T.MeshBasicMaterial({map:logoTexture,transparent:true,depthWrite:false,toneMapped:false}));logo.name='basketball-original-keylargo-logo';logo.rotation.x=-Math.PI/2;logo.position.set(57,.445,8);logo.scale.y=219/546;scene.add(logo);
 const nets=[];
 for(const sign of [-1,1]){const hoopX=57+sign*11.8,boardX=57+sign*12.4,baseline=57+sign*14,free=57+sign*8.2;
 box(57+sign*11.1,.405,8,5.8,.015,4.9,teal);rect(57+sign*11.1,8,5.8,4.9);ring(free,.43,8,1.8,'#e7f5f7');
 // FIBA-style radius and corner segments, oriented toward midcourt.
 const a=Math.asin(6.6/6.75),points=[];for(let i=0;i<=64;i++){const theta=-a+2*a*i/64;points.push([hoopX-sign*6.75*Math.cos(theta),.43,8+6.75*Math.sin(theta)]);}line(points,'#e7f5f7');for(const z of [1.4,14.6])line([[baseline,.43,z],[hoopX-sign*6.75*Math.cos(a),.43,z]],'#e7f5f7');
 cyl(57+sign*15,1.8,8,.18,3.6,steel);box(57+sign*13.7,3.6,8,2.6,.14,.14,steel);box(57+sign*15,1,8,.5,1.5,.55,teal);
 box(boardX,3.65,8,.07,1.05,1.8,mat('#c6e6f4',{transparent:true,opacity:.25,roughness:.1,depthWrite:false}));
 for(const z of [7.1,8.9])box(boardX,3.65,z,.09,1.1,.045,white);for(const y of [3.125,4.175])box(boardX,y,8,.09,.045,1.8,white);
 for(const z of [7.7,8.3])box(boardX-sign*.05,3.42,z,.03,.45,.03,white);for(const y of [3.195,3.645])box(boardX-sign*.05,y,8,.03,.03,.6,white);
 ring(hoopX,3.05,8,.23,'#ef8c46');const vertices=[];for(let i=0;i<16;i++){const t=i/16*Math.PI*2,u=(i+1)/16*Math.PI*2;vertices.push(.23*Math.cos(t),0,.23*Math.sin(t),.15*Math.cos(u),-.6,.15*Math.sin(u),.23*Math.cos(t),-.6,.23*Math.sin(t),.15*Math.cos(u),-.6,.15*Math.sin(u));}
 const net=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)),new T.LineBasicMaterial({color:'#f4f9fa',transparent:true,opacity:.85}));net.position.set(hoopX,3.04,8);scene.add(net);nets.push(net);
 }
 for(const x of [45,69]){bench(x,.2,22);planter(x+3,.1,22,1.3,1.3);for(const z of [-5,21]){lamp(x,z,8);box(x,8,z,1.5,.2,.6,mat('#e4f7ff',{emissive:'#c9ebff',emissiveIntensity:1.2}));}}
 // Two unshadowed area-style spots: no extra shadow maps.
 for(const x of [45,69]){const light=new T.SpotLight('#d5edff',180,50,.9,.65,1.5);light.position.set(x,8,21);light.target.position.set(57,.4,8);scene.add(light,light.target);}
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 box(57,4,20.3,7.5,3.5,.3,teal);for(const x of [54,60])box(x,1.5,20.3,.16,3,.16,steel);
 const face=new T.Mesh(new T.PlaneGeometry(7.2,3.2),new T.MeshBasicMaterial({map:texture,side:T.FrontSide}));face.position.set(57,4,20.1);face.rotation.y=Math.PI;scene.add(face);
 let signature='',netTime=0;
 function scoreboard({scores=[0,0],seconds=0,title='KEYLARGO ARENA',detail='Choose a game at the court'}={}){const next=JSON.stringify([scores,Math.ceil(seconds),title,detail]);if(next===signature)return;signature=next;ctx.fillStyle='#071d29';ctx.fillRect(0,0,512,256);ctx.textAlign='center';ctx.fillStyle='#78d9ed';ctx.font='bold 24px sans-serif';ctx.fillText(title.toUpperCase(),256,36,480);ctx.fillStyle='#e9faff';ctx.font='bold 86px monospace';ctx.fillText(`${scores[0]} : ${scores[1]}`,256,132);ctx.fillStyle='#eac675';ctx.font='32px monospace';ctx.fillText(Math.floor(seconds/60)+':'+String(Math.ceil(seconds)%60).padStart(2,'0'),256,183);ctx.font='18px sans-serif';ctx.fillStyle='#a8d2db';ctx.fillText(detail,256,226,480);texture.needsUpdate=true;}
 scoreboard();return {scoreboard,nets,pulse:()=>{netTime=.7},tick:dt=>{netTime=Math.max(0,netTime-dt);for(const net of nets){net.scale.y=1+Math.sin(netTime*30)*netTime*.3;net.rotation.y=Math.sin(netTime*20)*netTime*.12;}}};
}
