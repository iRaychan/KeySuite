import * as T from 'three';
// Original, low-poly modular fallback assets. No downloaded likenesses or motion assets.
const sphere=new T.SphereGeometry(1,12,8),box=new T.BoxGeometry(1,1,1);
export const extraOptions={hair:['short','bob','long','curly','tied','bald','bun','pigtails','mohawk','afro','side-part','fringe'],facialHair:['none','stubble','moustache','goatee','beard'],hat:['none','cap','beanie'],earrings:['none','studs','hoops'],watch:['none','silver','gold'],nose:['small','medium','broad'],ears:['small','medium','large'],lips:['thin','medium','full'],brows:['soft','straight','arched'],eyeSize:['small','medium','large'],eyeSpacing:['close','medium','wide']};
export function decorate(model,p){
 let root=model.getObjectByName('customHead');if(root){root.traverse(o=>o.material?.dispose());root.removeFromParent()}
 root=new T.Group();root.name='customHead';model.getObjectByName('Head').add(root);
 const materials=new Map(),material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.72}));return materials.get(color)};
 const add=(name,pos,size,color,geo=sphere,parent=root)=>{const m=new T.Mesh(geo,material(color));m.name=name;m.position.set(...pos);m.scale.set(...size);parent.add(m);return m};
 const skin=p.skin,hair=p.hairColor;
 // Base face is skinned. Features use head-local coordinates and follow every clip.
 add('customNose',[0,.015,.19],[p.nose==='broad'?.045:.028,.045,p.nose==='small'?.035:.052],skin);
 for(const sign of [-1,1]){add('customEar',[sign*.18,.015,0],[.035,p.ears==='large'?.065:p.ears==='small'?.035:.05,.035],skin);if(p.earrings!=='none'&&p.earrings)add('earring',[sign*.19,-.035,.015],[.017,.022,.013],'#d8b76b');const spacing=p.eyeSpacing==='wide'?.083:p.eyeSpacing==='close'?.055:.07;add('iris',[sign*spacing,.06,.19],[p.eyeSize==='large'?.018:.013,.017,.012],p.eyeColor||'#513a2b');add('eyebrow',[sign*.075,.10,.18],[.04,.007,.012],hair,box).rotation.z=sign*(p.brows==='arched'?.2:0)}
 add('customLips',[0,-.065,.18],[.06,p.lips==='full'?.018:p.lips==='thin'?.006:.011,.015],'#9a5b50');
 if(p.facialHair&&p.facialHair!=='none'){if(['moustache','beard'].includes(p.facialHair))add('moustache',[0,-.055,.18],[.074,.016,.025],hair);if(p.facialHair!=='moustache')add('beard',[0,-.12,.13],[p.facialHair==='goatee'?.045:.12,p.facialHair==='stubble'?.028:.065,.065],hair)}
 if(['bun','tied'].includes(p.hair))add('hairBun',[0,.12,-.18],[.11,.10,.10],hair);
 if(p.hair==='pigtails')for(const sign of [-1,1])add('tail',[sign*.18,-.07,-.06],[.07,.23,.07],hair);
 if(p.hair==='mohawk')add('mohawk',[0,.22,0],[.045,.12,.18],hair);
 if(p.hair==='afro')for(let i=0;i<12;i++){const a=i*Math.PI/6;add('curl',[Math.cos(a)*.16,.15+Math.sin(a)*.1,-.035],[.12,.12,.13],hair)}
 if(['side-part','fringe'].includes(p.hair))add('fringe',[p.hair==='side-part'?.07:0,.16,.10],[.16,.07,.12],hair).rotation.z=.22;
 if(p.hat&&p.hat!=='none'){add('hat',[0,.20,0],[.21,.11,.20],p.outfitColor||'#254459');if(p.hat==='cap')add('brim',[0,.17,.19],[.19,.014,.12],'#254459')}
 let watch=model.getObjectByName('customWatch');if(watch){watch.material.dispose();watch.removeFromParent()}
 if(p.watch&&p.watch!=='none')add('customWatch',[0,.04,0],[.055,.025,.05],p.watch==='gold'?'#d8b76b':'#acb7bb',box,model.getObjectByName('LHand'));
 model.traverse(o=>{if(!o.isMesh)return;if(o.material.name==='shirt'&&p.outfitColor)o.material.color.set(p.outfitColor);if(o.material.name==='eyes'&&p.eyeColor)o.material.color.set(p.eyeColor);if(o.name==='glasses'&&p.accessory==='sunglasses')o.material.color.set('#14212b')});
}
export function installClips(rig){
 const poses={greet:{RArm:[-1.1,0,-.4],RForearm:[-.5,0,0]},handshake:{RArm:[-.65,0,-.15],RForearm:[-.65,0,0]},laugh:{Spine:[.12,0,0],Head:[-.2,0,0]},clap:{LArm:[-.9,0,.6],RArm:[-.9,0,-.6],LForearm:[-.8,0,0],RForearm:[-.8,0,0]},cheer:{LArm:[0,0,2.4],RArm:[0,0,-2.4]},selfie:{RArm:[-1.5,0,-.4]},dance:{LArm:[-.5,0,.7],RArm:[.5,0,-.7],Spine:[0,0,.2]},read:{LArm:[-.7,0,.3],RArm:[-.7,0,-.3],Head:[.25,0,0]},phone:{RArm:[-.6,0,-.5],RForearm:[-2.1,0,0]},coffee:{RArm:[-.5,0,-.2],RForearm:[-2,0,0]},smoking:{RArm:[-.5,0,0],RForearm:[-2,0,0]},basketball:{RArm:[-.8,0,-.3],RForearm:[-.7,0,0]},football:{RThigh:[-.7,0,0],RShin:[.6,0,0]},tennis:{RArm:[-.7,0,-.7],Spine:[0,.35,0]},swim:{LArm:[-2,0,.3],RArm:[1,0,-.3],LThigh:[.2,0,0],RThigh:[-.2,0,0]},gym:{LArm:[-.9,0,.2],RArm:[-.9,0,-.2],LForearm:[-1,0,0],RForearm:[-1,0,0]}};
 const bones=['Hips','Spine','Head','LArm','LForearm','RArm','RForearm','LThigh','LShin','RThigh','RShin'];
 for(const [name,pose] of Object.entries(poses)){
  const tracks=[];for(const bone of bones){const angles=pose[bone]||[0,0,0],values=[];for(let i=0;i<5;i++){const q=new T.Quaternion().setFromEuler(new T.Euler(angles[0]+(pose[bone]?Math.sin(i*Math.PI/2)*.22:0),angles[1],angles[2]));values.push(...q.toArray())}tracks.push(new T.QuaternionKeyframeTrack(bone+'.quaternion',[0,.5,1,1.5,2],values))}
  tracks.push(new T.VectorKeyframeTrack('Hips.position',[0,2],[0,.88,0,0,.88,0]));rig.actions[name]=rig.mixer.clipAction(new T.AnimationClip(name,2,tracks));
 }
 for(const [name,source] of Object.entries({type:'work',mouse:'work',relax:'sit',sofa:'sit',tv:'sit',meeting:'talk',badminton:'tennis',pickleball:'tennis'}))rig.actions[name]=rig.actions[source];
}
