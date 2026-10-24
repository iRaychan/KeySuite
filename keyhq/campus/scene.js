import * as T from 'three';
// World units are metres. The football playing surface is 68 × 105 metres.
export const destinations=[
 {id:'hq',name:'Headquarters',x:-35,z:0,y:7,d:102},
 {id:'football',name:'Football',x:57,z:-64,y:1,d:110},
 {id:'basketball',name:'Basketball',x:57,z:8,y:1,d:48},
 {id:'pool',name:'Pool & café',x:57,z:55,y:1,d:60},
 {id:'tennis',name:'Tennis',x:-87,z:-66,y:1,d:45},
 {id:'pickleball',name:'Pickleball',x:-87,z:-30,y:1,d:29},
 {id:'badminton',name:'Badminton',x:-86,z:0,y:1,d:40},
 {id:'garden',name:'Globe garden',x:-31,z:53,y:1,d:53}
];
export function createCampus(renderer){
 const scene=new T.Scene();scene.background=new T.Color('#b7d9e3');scene.fog=new T.Fog('#b7d9e3',270,850);
 const hemi=new T.HemisphereLight(0xe8f6ff,0x78836a,2.3);scene.add(hemi);
 const sun=new T.DirectionalLight(0xffe1b0,3.5);sun.position.set(-90,150,85);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-145,right:145,top:145,bottom:-145,near:1,far:450});sun.shadow.normalBias=.1;sun.shadow.bias=-.00015;sun.target.position.set(0,0,-15);scene.add(sun,sun.target);
 const materials=new Map(),batches=new Map(),unit={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(.5,12,8),cylinder:new T.CylinderGeometry(.5,.5,1,24),cone:new T.ConeGeometry(.5,1,10)};
 const workstations=[];const lazyZones=[];const coarseSphere=new T.IcosahedronGeometry(.5,0);const matrix=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3(),s=new T.Vector3();let group=scene;const neonLights=[],logoHalos=[];const details=[],floorGroups=[],facades=[],ceilings=[],labels=[],obstacles=[[],[],[]],water=[];
 const mat=(color,opts={})=>{const key=color+JSON.stringify(opts);if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.74,...opts}));return materials.get(key)};
 const white=mat('#f4f0e4'),stone=mat('#c7c7ad'),dark=mat('#263e3b'),wood=mat('#a97b4f'),grass=mat('#729259'),leaf=mat('#2f6542'),warm=mat('#f1c175',{emissive:'#e8b86b',emissiveIntensity:.45}),glass=mat('#a6c7be',{transparent:true,opacity:.14,roughness:.13,metalness:.15,depthWrite:false}),blue=mat('#174b69'),trim=mat('#526661',{metalness:.5,roughness:.32});
 function primitive(geo,x,y,z,w,h,d,m,ry=0,rz=0,rx=0){let groups=batches.get(group);if(!groups)batches.set(group,groups=new Map());const key=geo+':'+m.uuid;let b=groups.get(key);if(!b)groups.set(key,b={geo:unit[geo],mat:m,transforms:[]});q.setFromEuler(new T.Euler(rx,ry,rz));matrix.compose(v.set(x,y,z),q,s.set(w,h,d));b.transforms.push(matrix.clone());}
 const box=(x,y,z,w,h,d,m=white,ry=0)=>primitive('box',x,y,z,w,h,d,m,ry);
 const cyl=(x,y,z,w,h,m=white)=>primitive('cylinder',x,y,z,w,h,w,m);
 const sphere=(x,y,z,w,h,d,m=leaf)=>primitive('sphere',x,y,z,w,h,d,m);
 function line(points,color='#f8f8e5',parent=group){const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),o=new T.Line(g,new T.LineBasicMaterial({color}));parent.add(o);return o}
 function ring(x,y,z,r,color='#fff9d7',parent=group,vertical=false){const pts=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;pts.push([x+Math.cos(a)*r,y+(vertical?Math.sin(a)*r:0),z+(vertical?0:Math.sin(a)*r)])}return line(pts,color,parent)}
 function text(text,x,y,z,w=8,color='#31594e',parent=group){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='500 31px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,59);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,w*96/512),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 const texture=new T.TextureLoader().load('../keylargo-logo.png');texture.colorSpace=T.SRGBColorSpace;
 function logo(x,y,z,w,parent=group){
  // Chroma-key only the near-white background in the shader. The supplied PNG is untouched.
  const logoMaterial=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false,transparent:true,depthWrite:false,alphaTest:.015});
  logoMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float whiteBackground = min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
diffuseColor.a *= 1.0-smoothstep(0.76,0.98,whiteBackground);`)};
  const geometry=new T.PlaneGeometry(w,w*219/546),mesh=new T.Mesh(geometry,logoMaterial);mesh.position.set(x,y,z+.06);parent.add(mesh);
  const haloMaterial=new T.ShaderMaterial({uniforms:{art:{value:texture},strength:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform sampler2D art; uniform float strength; varying vec2 vUv;
  float ink(vec2 p){vec3 c=texture2D(art,clamp(p,vec2(0.),vec2(1.))).rgb;return 1.-smoothstep(.87,.99,min(c.r,min(c.g,c.b)));}
  void main(){float glow=0.;for(int i=0;i<12;i++){float a=float(i)*.523599;glow+=ink(vUv+vec2(cos(a),sin(a))*.009);}glow/=12.;float core=ink(vUv);gl_FragColor=vec4(vec3(.08,.40,1.),strength*(glow*.52+core*.22));}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
  const halo=new T.Mesh(geometry,haloMaterial);halo.position.set(x,y,z+.075);parent.add(halo);logoHalos.push(haloMaterial);
 }
 function label(name,x,y,z,floor=null){labels.push({name,x,y,z,floor})}
 function palm(x,z,h=9){const trunk=mat('#897455');cyl(x,h/2,z,.42,h,trunk);sphere(x,h,z,1.1,1,1.1,leaf);for(let j=0;j<7;j++){const a=j*Math.PI*2/7;for(let k=0;k<3;k++){const r=1.2+k*1.1,yy=h+.9-Math.pow(k*.7,2);primitive('sphere',x+Math.sin(a)*r,yy,z+Math.cos(a)*r,1.35,.24,3,leaf,a,0,(k-1)*.22)}}}
 function tree(x,z,h=6){cyl(x,h*.4,z,.45,h*.8,wood);sphere(x,h*.8,z,h*.65,h*.65,h*.65,leaf);sphere(x+1,h*.95,z+.2,h*.46,h*.55,h*.5,mat('#497645'))}
 function planter(x,y,z,w=2,d=2){box(x,y+.3,z,w,.6,d,stone);box(x,y+.8,z,w*.93,.55,d*.93,leaf)}
 function flowers(x,z,w=4,d=2){planter(x,0,z,w,d);const pink=mat('#ce7a9b');for(let i=0;i<8;i++)sphere(x+(i%4-1.5)*w/4,1.05,z+(Math.floor(i/4)-.5)*d/2,.48,.4,.48,pink)}
 function bench(x,y,z,rot=0){box(x,y+.55,z,2,.17,.65,wood,rot);box(x,y+.94,z-.28,2,.65,.14,wood,rot);for(const dx of [-.7,.7])box(x+dx,y+.27,z,.12,.54,.5,trim)}
 // All chair parts rotate about the same local origin; forward is -Z.
 function chair(x,y,z,rot=0,executive=false){
  const previous=group;group=new T.Group();group.position.set(x,y,z);group.rotation.y=rot;previous.add(group);
  const upholstery=executive?mat('#263132'):dark;
  sphere(0,.50,0,.64,.18,.60,upholstery);sphere(0,.86,.25,.60,executive?.86:.65,.14,upholstery);
  if(executive)sphere(0,1.27,.26,.42,.20,.13,upholstery);
  for(const side of [-1,1]){box(side*.34,.69,0,.08,.06,.39,upholstery);cyl(side*.30,.58,.06,.045,.23,trim)}
  cyl(0,.27,0,.085,.41,trim);
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;box(Math.sin(angle)*.16,.12,Math.cos(angle)*.16,.055,.05,.34,trim,angle);sphere(Math.sin(angle)*.32,.07,Math.cos(angle)*.32,.10,.12,.10,dark)}
  group=previous;
 }
 function desk(x,y,z,floor=1,rotation=0){
  const previous=group;group=new T.Group();group.name='workstation';group.position.set(x,y,z);group.rotation.y=rotation;previous.add(group);
  box(0,.79,0,2,.13,1,wood);box(0,.4,-.3,1.8,.7,.1,white);
  cyl(0,1.01,-.20,.045,.3,trim);box(0,.87,-.20,.30,.03,.20,dark);
  const monitor=new T.Mesh(unit.box,mat('#83b6c1',{emissive:'#8cb5bc',emissiveIntensity:.25}));
  monitor.position.set(0,1.24,-.20);monitor.scale.set(.68,.43,.09);group.add(monitor);
  box(0,.9,.17,.45,.025,.15,dark);sphere(.39,.90,.17,.08,.04,.12,dark);
  chair(0,0,.80,0,floor===2);
  const station={group,monitor,floor:String(floor),deskNo:floor===1?workstations.filter(w=>w.floor==='1').length+1:0,employee:null,
   seat:new T.Vector3(0,0,.80),facing:Math.PI+rotation};
  group.updateWorldMatrix(true,true);station.seat.applyMatrix4(group.matrixWorld);monitor.userData.workstation=station;workstations.push(station);
  obstacles[floor]?.push({x,z,w:2.1,d:1.1});group=previous;
 }
 function couch(x,y,z,w=3,rot=0){box(x,y+.38,z,w,.65,1.1,mat('#c7bfa4'),rot);box(x,y+.95,z-.45,w,.9,.22,mat('#b4b69f'),rot);for(const dx of [-w/2,w/2])box(x+dx,y+.65,z,.22,.7,1.1,mat('#b4b69f'),rot)}
 function tableSet(x,y,z){cyl(x,y+.8,z,1.5,.12,wood);cyl(x,y+.4,z,.15,.8,trim);chair(x-1.1,y,z,Math.PI/2);chair(x+1.1,y,z,-Math.PI/2);chair(x,y,z+1.1);}
 function umbrella(x,y,z){cyl(x,y+1.5,z,.08,3,trim);primitive('cone',x,y+3,z,5,.85,5,white)}
 function lounge(x,y,z){box(x,y+.36,z,.9,.18,2.3,white);box(x,y+.62,z-.75,.9,.7,.17,mat('#d7cbaa'));}
 function fence(x,z,w,d,h=3){const fm=mat('#526658');for(let a=-w/2;a<=w/2;a+=5){cyl(x+a,h/2,z-d/2,.09,h,fm);cyl(x+a,h/2,z+d/2,.09,h,fm)}for(let a=-d/2;a<=d/2;a+=5){cyl(x-w/2,h/2,z+a,.09,h,fm);cyl(x+w/2,h/2,z+a,.09,h,fm)}const net=mat('#6c8671',{transparent:true,opacity:.15});box(x,h/2,z-d/2,w,h,.03,net);box(x,h/2,z+d/2,w,h,.03,net);box(x-w/2,h/2,z,.03,h,d,net);box(x+w/2,h/2,z,.03,h,d,net);line([[x-w/2,h,z-d/2],[x+w/2,h,z-d/2],[x+w/2,h,z+d/2],[x-w/2,h,z+d/2],[x-w/2,h,z-d/2]],'#526658')}
 function lamp(x,z,h=6){cyl(x,h/2,z,.09,h,dark);box(x,h,z,.7,.14,.7,warm);}
 // Coast, park ground, surrounding skyline.
 box(0,-2.2,-10,245,4,260,mat('#c2bea0'));box(0,-.09,-10,237,.2,252,grass);box(0,-2.6,-370,2200,1,500,mat('#79b8c5',{roughness:.25,metalness:.2}));box(0,-1.2,-148,600,1,27,mat('#c6c6a5'));
 for(let i=0;i<45;i++){const x=-350+i*17,h=7+(Math.sin(i*12.34)+1)*16;box(x,h/2-1,-310-(i%4)*17,8,h,8,mat(['#b0c3c9','#9cb6bc','#c8d0cc'][i%3]));}
 for(let i=0;i<14;i++)primitive('cone',-450+i*75,2,-480,150,70+(i%4)*23,100,mat('#9cbfc6'));
 // Driveway, pedestrian avenues, entrance.
 box(-48,.035,58,114,.12,45,mat('#7a8582'));box(18,.04,53,9,.12,92,stone);box(-34,.1,30,67,.2,11,stone);box(-34,.02,-30,70,.08,8,stone);box(-70,.03,-20,7,.1,110,stone);box(14,.04,-36,8,.1,151,stone);box(57,.04,-4,86,.1,9,stone);box(58,.04,33,86,.1,7,stone);
 for(let z=38;z<80;z+=10)box(3,.12,z,.15,.015,4,white);
 box(-12,.06,88,65,.1,9,mat('#7a8582'));box(24,2.2,86,18,4.4,1.1,white);logo(24,2.4,86.62,9);box(9,1.8,86,6,3.6,5,glass);box(9,3.7,86,7,.35,6,white);box(-1,1.3,85,12,.13,.13,white);for(let i=0;i<8;i++)box(-6+i*1.5,1.3,85,.65,.15,.15,mat('#be6554'));
 fence(-3,-12,222,230,2);for(let z=-114;z<=94;z+=14){palm(-110,z,8+(z%3));palm(105,z,10);lamp(101,z)}
 // Headquarters: three floors, 60 × 38 metres, no fourth floor.
 const bx=-35,bz=0,bw=60,bd=38,fh=4.8;
 for(let f=0;f<3;f++){
  group=new T.Group();group.name='floor-'+f;scene.add(group);floorGroups.push(group);const y=f*fh;
  box(bx,y+.18,bz,bw+2,.36,bd+2,white);box(bx,y+.38,bz,bw-.3,.06,bd-.3,mat('#d9d4bd'));const interiorGroup=group,ceiling=new T.Group();interiorGroup.add(ceiling);ceilings.push(ceiling);group=ceiling;box(bx,y+fh-.17,bz,bw+3,.34,bd+3,white);group=interiorGroup;
  const fg=new T.Group();fg.name='facade-'+f;group.add(fg);facades.push(fg);const interior=group;group=fg;
  box(bx,y+2.55,19,60,4.35,.1,glass);box(-65,y+2.55,0,.1,4.35,38,glass);box(-5,y+2.55,0,.1,4.35,38,glass);box(bx,y+2.55,-19,60,4.35,.1,glass);
  for(let x=-65;x<=-5;x+=5){box(x,y+2.55,19,.11,4.5,.18,trim);box(x,y+2.55,-19,.11,4.5,.18,trim)}
  for(let z=-19;z<=19;z+=4.75){box(-65,y+2.55,z,.18,4.5,.11,trim);box(-5,y+2.55,z,.18,4.5,.11,trim)}
  box(-47,y+2.5,19.2,13,4.8,.65,white);group=interior;
  for(let x=-62;x<-5;x+=14){box(x,y+2.5,17,.48,4.5,.48,white);box(x,y+2.5,-17,.48,4.5,.48,white)}
  group=ceiling;for(let x=-59;x<-8;x+=10)for(let z=-13;z<18;z+=10){box(x,y+4.4,z,3,.05,.8,warm)}group=interiorGroup;
  for(let z=-14;z<17;z+=8){planter(-62,y+.4,z,1.2,1.2);planter(-8,y+.4,z,1.2,1.2)}
  // Stair and elevator core at rear, consistent in each floor.
  box(-35,y+1.95,-14,6,3.3,6,white);box(-35,y+1.8,-10.94,2.1,2.9,.08,trim);text('LIFT',-35,y+3.7,-10.85,2);for(let j=0;j<12;j++)box(-43,y+j*.36,-16+j*.48,2.4,.2,.5,stone);
  if(f===0){
   box(-39,y+1,10,11,1.5,2.3,white);box(-39,y+.6,11.2,10,.09,.1,warm);box(-39,y+2.5,5,14,4,.25,wood);logo(-39,y+2.8,5.2,6.5);text('RECEPTION',-39,y+.95,11.23,5);
   for(let x=-58;x<-47;x+=5){couch(x,y+.4,12);box(x,y+.7,14,2,.3,1,wood)}
   // Pump showroom: original modeled machinery, plinths and pipes.
   for(let x=-26;x<-9;x+=5)for(let z=2;z<14;z+=7){box(x,y+.65,z,3,.5,2.8,white);cyl(x,y+1.6,z,1.1,1.4,blue);box(x,y+1.1,z+1,1.8,.7,.6,blue);cyl(x,y+2.4,z,.7,.3,trim);box(x+1,y+1.5,z,.8,.22,.22,trim)}
   label('PUMP SHOWROOM',-18,2,16,0);label('RECEPTION',-39,2,14,0);
   for(let x=-60;x<-45;x+=5){desk(x,y+.4,-10,0);box(x,y+1.7,-13,2.4,1.5,1,blue);primitive('cylinder',x,y+1.6,-11,1.5,.4,1.5,trim,0,Math.PI/2)}
   label('KEYLAB · PUMP TESTING',-54,2,-6,0);
   for(let x=-27;x<-10;x+=5)for(let z=-15;z<-5;z+=4){box(x,y+1,z,2.8,.15,1.1,wood);chair(x,y+.4,z+1)}label('TRAINING',-19,2,-4,0);
   box(-60,1.7,1,7,2.6,.12,white);text('PANTRY / WC',-59,2,1.1,5);
   box(-60,1.1,-1.5,6,1.4,.8,wood);box(-60,1.84,-1.5,6,.12,.9,white);cyl(-58,1.95,-1.5,.55,.15,trim);
   for(const x of [-62,-59]){box(x,1.6,-4,2.2,2.7,.1,white);cyl(x,.8,-5, .65,.7,white);box(x,1.1,-5.6,.7,1.1,.3,white);}
   box(-54,1,-1,2,.8,2,white);box(-54,1.5,-1,.7,.8,.6,dark);
  }else if(f===1){
   for(let x=-59;x<=-41;x+=4.5)for(let z=-4;z<=13;z+=5)desk(x,y+.4,z,1);
   label('KEYOFFICE',-51,y+2,15,1);
   for(const z of [-9,9]){box(-18,y+1,z,8,.2,2.6,wood);for(let x=-21;x<-14;x+=2){chair(x,y+.4,z+2);chair(x,y+.4,z-2,Math.PI)}box(-27,y+2.1,z,.08,3.4,12,glass);box(-17,y+2.1,z-6,20,3.4,.08,glass);label(z<0?'MEETING ROOM':'COLLABORATION',-18,y+2,z+4,1)}
   box(-30,y+2.4,1,6,3,.2,dark);box(-30,y+2.5,1.13,5.4,2.2,.02,mat('#335c66',{emissive:'#3a8490',emissiveIntensity:.35}));text('KEYBOT',-30,y+2.7,1.18,3.5,'#e1eee5');label('AI STUDIO',-30,y+2,4,1);couch(-57,y+.4,-14,5);tableSet(-49,y+.4,-14);
  }else{
   // Owner furniture is placed in a separate visibility group below.
   box(-38,y+2.2,0,.16,3.6,34,glass);box(-52,y+2.2,-2,26,3.6,.16,glass);
   label('EXECUTIVE SUITE',-52,y+2,15,2);label('WELLNESS & GYM',-18,y+2,14,2);
   for(let x=-28;x<-8;x+=4){box(x,y+.7,10,1.8,.4,3,dark);box(x,y+1.5,8.7,1.5,1.5,.1,trim);box(x,y+2.3,8.7,1.3,.5,.1,blue)}
   for(let x=-29;x<-10;x+=4)box(x,y+.45,0,2,.06,4,mat('#a7b7a2'));
   box(-20,y+1,-11,10,.18,3,wood);for(let x=-24;x<-14;x+=2){chair(x,y+.4,-8.8);chair(x,y+.4,-13.2,Math.PI)}label('EXECUTIVE MEETING',-20,y+2,-6,2);
  }
 }
 group=new T.Group();group.name='owner-interior';floorGroups[2].add(group);const ownerGroup=group;desk(-53,10,9,2);couch(-57,10,1,4);couch(-47,10,1,4);box(-52,10.6,3,3,.3,1.5,wood);box(-52,12,-.9,5,2.5,.14,dark);text('OWNER ROOM',-52,12.3,15,7);ownerGroup.visible=false;
 // Front logo and canopy belongs to the exterior, not to a fourth floor.
 group=new T.Group();scene.add(group);const exterior=group;box(-47,7.25,20.8,13,14.5,1,white);
 for(const y of [4.7,9.5]){box(-5,y,1,8,.25,36,white);box(-1.2,y+.7,1,.08,1.2,36,glass);for(let z=-14;z<17;z+=7)planter(-2,y+.15,z,1.3,2.5);}
 for(let f=0;f<3;f++){const glow=new T.PointLight(0xffd399,85,28,2);glow.position.set(-38,f*4.8+2.8,12);scene.add(glow);}
 box(-39,4.4,23,18,.18,9,glass);for(const x of [-47,-31])cyl(x,2.2,26,.12,4.4,trim);
 group=new T.Group();group.name='rooftop';scene.add(group);const roof=group;const ry=14.4;
 // Rooftop sign is mounted above the parapet and is never covered by floor slabs.
 logo(-46,ry+3.4,19.6,13);for(const x of [-51,-41])box(x,ry+1.4,19.35,.09,2.6,.09,trim);
 const neon=mat('#63cde6',{emissive:'#48c9ff',emissiveIntensity:2.4,roughness:.3});
 for(const y of [4.65,9.45,14.65]){box(-25,y,20.6,32,.065,.065,neon);box(-57,y,20.6,13,.065,.065,neon);box(-3.35,y,0,.065,.065,40,neon);}
 box(-35,ry+.65,-19.4,60,.07,.07,neon);box(-65.4,ry+.65,0,.07,.07,39,neon);
 for(const [x,y,z,color,power] of [[-46,17.3,21,0x459dff,150],[-31,2,53,0x57cfe0,110],[65,1.3,54,0x43cfe4,160],[-38,2,25,0xffce91,95]]){const light=new T.PointLight(color,0,38,2);light.position.set(x,y,z);light.userData.nightPower=power;scene.add(light);neonLights.push(light);}
 box(-35,ry+.18,0,62,.36,40,white);box(-35,ry+.39,0,59,.08,37,wood);
 for(let x=-64;x<=-6;x+=4){cyl(x,ry+1,19,.05,1.3,trim);cyl(x,ry+1,-19,.05,1.3,trim)}box(-35,ry+1,19,60,1.2,.06,glass);box(-35,ry+1,-19,60,1.2,.06,glass);box(-65,ry+1,0,.06,1.2,38,glass);box(-5,ry+1,0,.06,1.2,38,glass);
 for(let x=-60;x<-7;x+=8){planter(x,ry+.4,16,5,1);planter(x,ry+.4,-16,5,1)}
 // Open pergola, not an enclosed fourth storey.
 box(-40,ry+3.4,-8,21,.35,11,dark);for(const x of [-49,-31])for(const z of [-12,-4])box(x,ry+1.9,z,.2,3,.2,wood);
 for(let x=-48;x<-31;x+=4)tableSet(x,ry+.4,-8);
 for(let x=-58;x<-10;x+=10){couch(x,ry+.4,8,4);box(x,ry+.8,11,2,.3,1,white);if(x<-30)umbrella(x+1,ry+.4,8)}
 box(-15,ry+2.2,-10,10,3.6,.2,white);box(-15,ry+2.25,-9.85,9,2.7,.02,dark);text('ROOFTOP CINEMA',-15,ry+2.4,-9.8,7,'#dce6cf');for(let x=-20;x<-10;x+=3)lounge(x,ry+.4,-3);box(-56,ry+1,-9,5,1.2,1.4,trim);label('ROOFTOP · CINEMA & SOCIAL',-35,17,17,'roof');
 // Fountain: circular garden and globe armature.
 group=scene;cyl(-31,.1,53,30,.24,leaf);cyl(-31,.24,53,25,.22,stone);cyl(-31,.42,53,22,.17,mat('#66aeb4',{roughness:.2,metalness:.3}));cyl(-31,.55,53,13,.24,white);cyl(-31,.85,53,10,.4,trim);
 const globe=new T.Group();globe.position.set(-31,4.7,53);scene.add(globe);for(let i=0;i<6;i++){const r=ring(0,0,0,3.6,'#bdc9b9',globe,true);r.rotation.y=i*Math.PI/6}for(const y of [-2.4,-1.2,0,1.2,2.4])ring(0,y,0,Math.sqrt(3.6**2-y**2),'#bdc9b9',globe);sphere(-31,4.7,53,5.8,5.8,5.8,mat('#d8c9a2',{metalness:.7,roughness:.3}));for(let i=0;i<14;i++){const a=i/14*Math.PI*2;cyl(-31+8*Math.cos(a),1.1,53+8*Math.sin(a),.07,1.3,mat('#c5eef1',{transparent:true,opacity:.6}));}
 // Football. Two proper goals, halfway line, penalty areas, six-yard areas and circle.
 const fx=57,fz=-64;box(fx,.15,fz,73,.3,110,mat('#426f46'));for(let i=0;i<10;i++)box(fx,.32,fz-52.5+5.25+i*10.5,68,.01,10.5,mat(i%2?'#628d4c':'#557e44'));
 const fieldY=.36;const rect=(x,z,w,d,y=fieldY,c='#eef1d7')=>line([[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2],[x-w/2,y,z-d/2]],c);
 rect(fx,fz,68,105);line([[fx-34,fieldY,fz],[fx+34,fieldY,fz]]);ring(fx,fieldY,fz,9.15);for(const sign of [-1,1]){const end=fz+sign*52.5;rect(fx,end-sign*8.25,40.32,16.5);rect(fx,end-sign*2.75,18.32,5.5);for(const dx of [-3.66,3.66])cyl(fx+dx,1.54,end,.13,2.44,white);box(fx,2.76,end,7.45,.13,.13,white);box(fx,1.5,end+sign*.9,7.32,2.44,1.8,mat('#dde6d0',{transparent:true,opacity:.16}));cyl(fx,fieldY,end-sign*11,.25,.02,white)}fence(fx,fz,76,114,5);label('FOOTBALL · 105 × 68 m',fx,1,fz);
 for(const x of [18,96])for(const z of [-112,-65,-16]){lamp(x,z,15);box(x,15,z,3,.7,.5,warm)}
 // Basketball 28 × 15 metres, two hoops.
 box(57,.18,8,34,.36,21,mat('#69858b'));box(57,.38,8,28,.03,15,mat('#3e76b6'));rect(57,8,28,15,.41);line([[57,.41,.5],[57,.41,15.5]]);ring(57,.41,8,1.8);for(const sign of [-1,1]){const x=57+sign*12.4;box(x,.4,8,4.8,.025,4.9,mat('#b98a6b'));rect(x,8,4.8,4.9,.44);cyl(57+sign*15,1.8,8,.14,3.6,white);box(x,3.6,8,.12,1.05,1.8,white);const hoop=ring(x-sign*.6,3.05,8,.45,'#e18150');}fence(57,8,35,22,2.4);label('BASKETBALL',57,1,19);
 // Deferred outdoor detail generation after the primary architecture is visible.
 lazyZones.push(()=>{
 // Tennis and pickleball regulation playing surfaces.
 function racketCourt(x,z,w,d,color,name){box(x,.18,z,w+5,.35,d+5,mat('#7e9777'));box(x,.38,z,w,.03,d,mat(color));rect(x,z,w,d,.41);rect(x,z,w*.76,d,.42);line([[x-w/2,.42,z-d*.27],[x+w/2,.42,z-d*.27]]);line([[x-w/2,.42,z+d*.27],[x+w/2,.42,z+d*.27]]);line([[x,.42,z-d*.27],[x,.42,z+d*.27]]);box(x,.94,z,w,1.05,.04,mat('#354c43',{transparent:true,opacity:.55}));line([[x-w/2,1.45,z],[x+w/2,1.45,z]]);fence(x,z,w+6,d+7,3);label(name,x,1,z+d/2+3)}
 racketCourt(-87,-66,10.97,23.77,'#617fa3','TENNIS');racketCourt(-87,-30,6.1,13.41,'#629998','PICKLEBALL');racketCourt(-86,0,6.1,13.4,'#5e9485','BADMINTON');for(const x of [-93,-79])for(const z of [-11,11])box(x,3,z,.22,6,.22,white);box(-86,6.1,0,17,.25,25,white);
 // Pool deck, turquoise water, loungers, café.
 box(58,.15,55,66,.3,37,stone);box(65,.4,54,43,.4,24,white);const pool=new T.Mesh(new T.PlaneGeometry(40,21,18,12),mat('#42b9c5',{roughness:.19,metalness:.3,transparent:true,opacity:.9}));pool.rotation.x=-Math.PI/2;pool.position.set(65,.63,54);scene.add(pool);water.push(pool);
 for(let x=48;x<88;x+=5){lounge(x,.35,39);lounge(x,.35,70);if(x%10===8){umbrella(x+1,.35,38);umbrella(x+1,.35,71)}}
 for(let i=0;i<5;i++)line([[46,.65,46+i*4],[84,.65,46+i*4]],'#9ce0dd');
 box(29,1.8,57,11,3.6,18,wood);box(29,3.8,57,13,.3,20,wood);for(let z=48;z<66;z+=1.4)box(29,4.1,z,14,.15,.2,dark);box(35,1.4,57,.5,1.8,16,white);for(let z=48;z<67;z+=6){tableSet(41,.3,z);umbrella(41,.3,z)}text('THE COASTAL CAFÉ',35.3,2.8,66.1,9);label('POOL & CAFÉ',65,1,73);
 });
 // Parking and cars.
 for(let i=0;i<9;i++){const x=-101+i*5.4;box(x,.13,78,.12,.015,8,white);if(i%3!==2){const carMat=mat(['#e3e4d8','#254659','#82958e'][i%3]);box(x+2.4,.9,77,2.1,1.1,4.5,carMat);box(x+2.4,1.65,77,1.8,.7,2.4,dark);for(const xx of [-1,1])for(const zz of [-1.4,1.4])sphere(x+2.4+xx,.5,77+zz,.35,.65,.65,dark)}}
 // Garden paths and seating behind the headquarters.
 box(-35,.04,-67,40,.12,3,stone);box(-35,.04,-67,3,.12,62,stone);
 for(const x of [-57,-14])for(const z of [-45,-68,-91]){tree(x,z,7);flowers(x+2,z+2,4,2);bench(x,0,z+4);}
 for(const x of [-45,-25])for(const z of [-48,-85]){cyl(x,.2,z,8,.3,stone);tableSet(x,.4,z);umbrella(x,.4,z);}
 text('SMOKING CORNER',-12,1.6,-89,4);label('DESIGNATED SMOKING CORNER',-12,2,-87,'all');
 // Garden massing: repeated geometry shares instanced buffers.
 for(let x=-100;x<102;x+=9){flowers(x,94,5,2);tree(x,-126,6+(x%3));if(x<-67||x>3)palm(x,81,8)}
 for(let z=-110;z<80;z+=12){flowers(10,z,2,5);palm(6,z,8);if(z<20)tree(-72,z,6)}
 for(let x=-62;x<-3;x+=7){flowers(x,26,5,2);if(x%2===0)tree(x,29,5)}
 for(const [x,z] of [[-66,44],[-55,58],[-10,59],[22,42],[98,45],[98,68],[39,77],[-72,27],[-72,-43]]){palm(x,z,10);flowers(x+2,z+2,3,2)}
 for(let z=-103;z<85;z+=22){lamp(-69,z);lamp(16,z)}for(let x=-100;x<100;x+=20)lamp(x,92);
 for(const x of [-58,-46,-14])bench(x,.2,34);for(const z of [-35,0,34])bench(17,.2,z,Math.PI/2);
 // Electric golf cart, animated on a safe exterior route.
 const cart=new T.Group();scene.add(cart);group=cart;box(0,.6,0,1.7,.3,3,white);box(0,1.1,.35,1.5,.6,1,dark);box(0,2.1,0,1.9,.1,2.6,white);for(const x of [-.8,.8]){box(x,1.4,-1,.06,1.4,.06,trim);for(const z of [-.9,.9])sphere(x,.4,z,.32,.6,.6,dark)}box(0,1.5,-.9,1.4,.7,.04,glass);cart.position.set(1,.1,71);group=scene;
 function flush(){for(const [parent,groups] of batches){for(const b of groups.values()){const mesh=new T.InstancedMesh(b.geo,b.mat,b.transforms.length);b.transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!b.mat.transparent;mesh.receiveShadow=true;if(b.geo===unit.sphere&&b.transforms.length>10){const low=new T.InstancedMesh(coarseSphere,b.mat,b.transforms.length);b.transforms.forEach((m,i)=>low.setMatrixAt(i,m));low.instanceMatrix.needsUpdate=true;low.castShadow=mesh.castShadow;low.receiveShadow=true;const lod=new T.LOD();lod.addLevel(mesh,0);lod.addLevel(low,180);parent.add(lod)}else parent.add(mesh)}}batches.clear()}
 flush();
 function setFloor(value,owner=false){floorGroups.forEach((g,i)=>{g.visible=value==='all'||(value==='roof')||i<=Number(value);facades[i].visible=value==='all'||value==='roof'||i<Number(value);ceilings[i].visible=facades[i].visible});roof.visible=value==='all'||value==='roof';exterior.visible=value==='all'||value==='roof';ownerGroup.visible=owner;}
 function lighting(mode){const night=mode==='night',sunset=mode==='sunset';scene.background.set(night?'#152d40':sunset?'#d6baa2':'#b7d9e3');scene.fog.color.copy(scene.background);hemi.intensity=night?.65:sunset?1.8:2.3;sun.intensity=night?.4:sunset?2.4:3.5;sun.color.set(night?'#9fb7ec':sunset?'#ffd5a0':'#ffe1b0');sun.position.set(-90,sunset?55:150,85);warm.emissiveIntensity=night?3:1;neon.emissiveIntensity=night?4.5:sunset?2:.5;for(const light of neonLights)light.intensity=night?light.userData.nightPower:sunset?light.userData.nightPower*.3:0;for(const halo of logoHalos)halo.uniforms.strength.value=night?1.6:sunset?.5:0;glass.color.set(night?'#d5b87e':'#a6c7be');}
 function buildDistant(){while(lazyZones.length){group=scene;lazyZones.shift()();}flush();}
 return {scene,workstations,labels,buildDistant,floorGroups,roof,ownerGroup,cart,water,obstacles,setFloor,lighting,sun,details,dimensions:{football:{width:68,length:105},floors:3,floorHeight:4.8,building:{x:-35,z:0,width:60,depth:38}}};
}
