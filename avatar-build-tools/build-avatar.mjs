import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';
globalThis.FileReader=class {readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:application/octet-stream;base64,'+Buffer.from(v).toString('base64');this.onloadend?.()})}};
const root=new T.Group();root.name='KeyHQ_Original_Avatar';
const bones=[], ids={};
function bone(name,parent,x,y,z){const b=new T.Bone();b.name=name;b.position.set(x,y,z);(parent?bones[ids[parent]]:root).add(b);ids[name]=bones.length;bones.push(b);return b}
bone('Hips',null,0,.88,0);bone('Spine','Hips',0,.25,0);bone('Head','Spine',0,.45,0);
for(const [side,sgn] of [['L',-1],['R',1]]){bone(side+'Arm','Spine',sgn*.235,.22,0);bone(side+'Forearm',side+'Arm',0,-.29,0);bone(side+'Hand',side+'Forearm',0,-.27,0);bone(side+'Thigh','Hips',sgn*.105,-.02,0);bone(side+'Shin',side+'Thigh',0,-.40,0);bone(side+'Foot',side+'Shin',0,-.40,0)}
root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones),parts=new Map();
const colors={skin:'#d9a27e',shirt:'#284a70',pants:'#273446',shoes:'#182332',eyes:'#24313b',white:'#fff9eb',hair:'#39291f',mouth:'#ad6458',business:'#eef1e7',uniform:'#f5ad32',glasses:'#19212b'};
function part(group,joint,geo,x,y,z,sx=1,sy=1,sz=1){geo=geo.index?geo.toNonIndexed():geo;geo.scale(sx,sy,sz);geo.translate(x,y,z);const idx=[],weights=[];for(let i=0;i<geo.attributes.position.count;i++){idx.push(ids[joint],0,0,0);weights.push(1,0,0,0)}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(idx,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));if(!parts.has(group))parts.set(group,[]);parts.get(group).push(geo)}
function oval(g,b,x,y,z,rx,ry,rz){part(g,b,new T.SphereGeometry(1,12,8),x,y,z,rx,ry,rz)}
function block(g,b,x,y,z,w,h,d){part(g,b,new T.BoxGeometry(w,h,d),x,y,z)}
part('shirt','Spine',new T.CylinderGeometry(.21,.16,.43,12),0,1.16,0,1,1,.65);
oval('pants','Hips',0,.88,0,.18,.13,.12);oval('skin','Head',0,1.46,0,.065,.12,.065);
oval('skin','Head',0,1.66,0,.151,.197,.137);
for(const sign of [-1,1]){oval('skin','Head',sign*.151,1.65,0,.027,.046,.025);oval('white','Head',sign*.057,1.69,.12,.033,.025,.014);oval('eyes','Head',sign*.057,1.688,.134,.014,.018,.008);oval('white','Head',sign*.053,1.697,.14,.005,.005,.004);block('hair','Head',sign*.057,1.729,.119,.061,.014,.014)}
oval('skin','Head',0,1.646,.139,.022,.035,.028);
// A gently upturned original smile, modeled rather than a texture.
for(let i=0;i<7;i++){let x=(i-3)*.009;oval('mouth','Head',x,1.584+Math.pow(x/.03,2)*.012,.124,.008,.005,.005)}
for(const [side,sgn] of [['L',-1],['R',1]]){
 oval('shirt',side+'Arm',sgn*.24,1.34,0,.078,.09,.078);
 part('shirt',side+'Arm',new T.CylinderGeometry(.078,.066,.22,10),sgn*.235,1.24,0);
 oval('skin',side+'Forearm',sgn*.235,1.06,0,.065,.065,.065);
 part('skin',side+'Forearm',new T.CylinderGeometry(.06,.043,.23,10),sgn*.235,.955,0);
 oval('skin',side+'Hand',sgn*.235,.79,.005,.047,.071,.032);
 part('pants',side+'Thigh',new T.CylinderGeometry(.086,.065,.36,10),sgn*.105,.67,0);
 oval('pants',side+'Shin',sgn*.105,.46,0,.064,.064,.064);
 part('pants',side+'Shin',new T.CylinderGeometry(.064,.046,.36,10),sgn*.105,.27,0);
 oval('shoes',side+'Foot',sgn*.105,.075,.048,.065,.06,.12);
 block('white',side+'Foot',sgn*.105,.035,.048,.12,.018,.20);
}
// Hair options share the same head joint and topology family.
part('hair_short','Head',new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.53),0,1.72,0,.158,.15,.145);
part('hair_bob','Head',new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.57),0,1.72,-.012,.168,.16,.15);
for(const s of [-1,1])oval('hair_bob','Head',s*.139,1.61,-.025,.043,.14,.104);
part('hair_long','Head',new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.55),0,1.72,0,.16,.155,.145);
oval('hair_long','Head',0,1.48,-.104,.15,.28,.07);
for(let i=0;i<12;i++){const a=i*Math.PI*2/12;oval('hair_curly','Head',Math.cos(a)*.12,1.79+Math.sin(i*3)*.03,Math.sin(a)*.10,.07,.07,.065)}
// Clothing details can be selected without replacing the skeleton.
for(const sign of [-1,1]){const geo=new T.BoxGeometry(.07,.19,.018);geo.rotateZ(sign*.3);part('business','Spine',geo,sign*.052,1.3,.139)}
block('uniform','Spine',-.09,1.26,.137,.065,.03,.015);
for(const sign of [-1,1]){part('glasses','Head',new T.TorusGeometry(.038,.006,6,14),sign*.058,1.69,.145);}
block('glasses','Head',0,1.69,.145,.045,.007,.008);
for(const [name,geos] of parts){const base=name.startsWith('hair_')?'hair':name,material=new T.MeshStandardMaterial({color:colors[base],roughness:.8,metalness:0});material.name=base;const mesh=new T.SkinnedMesh(mergeVertices(mergeGeometries(geos)),material);mesh.name=name;root.add(mesh);mesh.bind(skeleton);mesh.frustumCulled=false}
function quat(x=0,y=0,z=0){return new T.Quaternion().setFromEuler(new T.Euler(x,y,z)).toArray()}
const names=['idle','walk','sit','work','talk','wave'],clips=[];
for(const name of names){let tracks=[],duration=name==='walk'?1:3,times=[0,duration/4,duration/2,duration*3/4,duration];
 for(const b of bones){let values=[];for(let i=0;i<5;i++){let x=0,y=0,z=0,p=Math.sin(i*Math.PI/2),side=b.name[0]==='L'?-1:1;
 if(name==='walk'){if(/Thigh/.test(b.name))x=p*.48*side;if(/Shin/.test(b.name))x=Math.max(0,-p*side)*.55;if(/Arm$/.test(b.name))x=-p*.4*side}
 if(name==='sit'||name==='work'){if(/Thigh/.test(b.name))x=-1.5;if(/Shin/.test(b.name))x=1.5;if(/Arm$/.test(b.name))x=-.35;if(/Forearm/.test(b.name))x=-1.1+(name==='work'?p*.06*side:0)}
 if(name==='wave'&&b.name==='RArm'){z=2.4;x=-.2}if(name==='wave'&&b.name==='RForearm'){z=.35+p*.28;x=-.25}
 if(name==='talk'){if(b.name==='Head')y=p*.12;if(/Arm$/.test(b.name))x=-.22-p*.1*side;if(/Forearm/.test(b.name))x=-.6+p*.2*side}
 if(b.name==='Spine')z=p*.012;
 values.push(...quat(x,y,z))}tracks.push(new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,values))}
 tracks.push(new T.VectorKeyframeTrack('Hips.position',times,times.flatMap((t,i)=>[0,(name==='sit'||name==='work'?.65:.88)+(name==='walk'?Math.abs(Math.sin(i*Math.PI/2))*.025:0),0])));
 clips.push(new T.AnimationClip(name,duration,tracks));
}
const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:clips});
fs.writeFileSync(new URL('../keyhq/avatar/assets/keyhq-original.glb',import.meta.url),Buffer.from(data));
console.log({bytes:data.byteLength,bones:bones.length,clips:clips.map(c=>c.name),vertices:[...parts.values()].flat().reduce((n,g)=>n+g.attributes.position.count,0)});
