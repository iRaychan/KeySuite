import * as T from 'three';
// Original, low-poly modular fallback assets. No downloaded likenesses or motion assets.
const sphere=new T.SphereGeometry(1,24,16),box=new T.BoxGeometry(1,1,1);
export const extraOptions={hair:['short','bob','long','curly','tied','bald','bun','pigtails','mohawk','afro','side-part','fringe'],facialHair:['none','stubble','moustache','goatee','beard'],hat:['none','cap','beanie'],earrings:['none','studs','hoops'],watch:['none','silver','gold'],nose:['small','medium','broad'],ears:['small','medium','large'],lips:['thin','medium','full'],brows:['soft','straight','arched'],eyeSize:['small','medium','large'],eyeSpacing:['close','medium','wide']};
export function decorate(model,p){
 let root=model.getObjectByName('customHead');if(root){root.traverse(o=>o.material?.dispose());root.removeFromParent()}
 root=new T.Group();root.name='customHead';model.getObjectByName('Head').add(root);
 const materials=new Map(),material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.72}));return materials.get(color)};
 const add=(name,pos,size,color,geo=sphere,parent=root)=>{const m=new T.Mesh(geo,material(color));m.name=name;m.position.set(...pos);m.scale.set(...size);parent.add(m);return m};
 const skin=p.skin,hair=p.hairColor;model.userData.gender=p.gender;
 for(const sign of [-1,1]){add('cheek',[sign*.14,.018,.174],[.045,.028,.018],new T.Color(skin).lerp(new T.Color('#d9958a'),.24));if(p.gender==='female')add('lash',[sign*.085,.164,.24],[.049,.005,.012],hair);}
 // Base face is skinned. Features use head-local coordinates and follow every clip.
 add('customNose',[0,.065,.22],[p.nose==='broad'?.047:.033,.045,p.nose==='small'?.03:.045],skin);
 for(const sign of [-1,1]){
  add('customEar',[sign*.23,.065,0],[.038,p.ears==='large'?.07:p.ears==='small'?.043:.056,.04],skin);
  if(p.earrings!=='none'&&p.earrings)add('earring',[sign*.245,.012,.012],[.015,.02,.012],'#d8b76b');
  const spacing=p.eyeSpacing==='wide'?.095:p.eyeSpacing==='close'?.073:.085,size=p.eyeSize==='large'?1.12:p.eyeSize==='small'?.88:1;
  add('eyeWhite',[sign*spacing,.12,.218],[.046*size,.057*size,.03],'#fffaf3');
  add('iris',[sign*spacing,.12,.246],[.023*size,.032*size,.009],p.eyeColor||'#513a2b');
  add('pupil',[sign*spacing,.12,.254],[.012*size,.021*size,.005],'#192329');
  add('eyeLight',[sign*spacing-.007,.133,.26],[.007,.008,.004],'#ffffff');
  add('eyebrow',[sign*.086,.194,.211],[.05,.011,.018],hair).rotation.z=sign*(p.brows==='arched'?.15:0);
 }
 for(let i=-3;i<=3;i++)add('smile',[i*.012,-.026+Math.pow(i/3,2)*.014,.192],[.012,p.lips==='full'?.009:.006,.01],'#9a5b50');
 if(p.facialHair&&p.facialHair!=='none'){if(['moustache','beard'].includes(p.facialHair))add('moustache',[0,-.01,.205],[.074,.016,.025],hair);if(p.facialHair!=='moustache')add('beard',[0,-.11,.14],[p.facialHair==='goatee'?.045:.12,p.facialHair==='stubble'?.028:.065,.065],hair)}
 if(['bun','tied'].includes(p.hair))add('hairBun',[0,.16,-.22],[.13,.12,.12],hair);
 if(p.hair==='pigtails')for(const sign of [-1,1])add('tail',[sign*.24,-.07,-.10],[.07,.23,.07],hair);
 if(p.hair==='mohawk')add('mohawk',[0,.30,0],[.05,.12,.22],hair);
 if(p.hair==='afro')for(let i=0;i<12;i++){const a=i*Math.PI/6;add('curl',[Math.cos(a)*.22,.21+Math.sin(a)*.12,-.035],[.14,.14,.16],hair)}
 if(['side-part','fringe'].includes(p.hair))add('fringe',[p.hair==='side-part'?.07:0,.25,.13],[.22,.085,.16],hair).rotation.z=.22;
 if(p.hat&&p.hat!=='none'){add('hat',[0,.30,0],[.265,.13,.25],p.outfitColor||'#254459');if(p.hat==='cap')add('brim',[0,.25,.23],[.25,.014,.15],'#254459')}
 let skirt=model.getObjectByName('customDress');if(skirt){skirt.geometry.dispose();skirt.material.dispose();skirt.removeFromParent()}if(p.outfit==='dress'){skirt=new T.Mesh(new T.CylinderGeometry(.19,.28,.45,24),new T.MeshStandardMaterial({color:p.outfitColor||'#b56c6e',roughness:.65}));skirt.name='customDress';skirt.position.set(0,-.17,0);model.getObjectByName('Hips').add(skirt);}
 let watch=model.getObjectByName('customWatch');if(watch){watch.material.dispose();watch.removeFromParent()}
 if(p.watch&&p.watch!=='none')add('customWatch',[0,.04,0],[.055,.025,.05],p.watch==='gold'?'#d8b76b':'#acb7bb',box,model.getObjectByName('LHand'));
 model.userData.faceParts=[];root.traverse(o=>{if(['eyeWhite','iris','pupil','eyeLight','smile','eyebrow'].includes(o.name)){o.userData.restScale=o.scale.clone();model.userData.faceParts.push(o)}});
 model.traverse(o=>{if(!o.isMesh)return;if(o.material.name==='shirt'&&p.outfitColor)o.material.color.set(p.outfitColor);if(o.material.name==='eyes'&&p.eyeColor)o.material.color.set(p.eyeColor);if(o.name==='glasses'&&p.accessory==='sunglasses')o.material.color.set('#14212b')});
}
export function installClips(rig){
 const poses={ride:{LThigh:[-1.5,0,0],RThigh:[-1.5,0,0],LShin:[1.5,0,0],RShin:[1.5,0,0],LArm:[-.8,0,.2],RArm:[-.8,0,-.2],LForearm:[-.8,0,0],RForearm:[-.8,0,0]},cycle:{LThigh:[-1.1,0,0],RThigh:[-1.1,0,0],LShin:[1.2,0,0],RShin:[1.2,0,0],LArm:[-.9,0,.2],RArm:[-.9,0,-.2]},greet:{RArm:[-1.1,0,-.4],RForearm:[-.5,0,0]},handshake:{RArm:[-.65,0,-.15],RForearm:[-.65,0,0]},laugh:{Spine:[.12,0,0],Head:[-.2,0,0]},clap:{LArm:[-.9,0,.6],RArm:[-.9,0,-.6],LForearm:[-.8,0,0],RForearm:[-.8,0,0]},cheer:{LArm:[0,0,2.4],RArm:[0,0,-2.4]},selfie:{RArm:[-1.5,0,-.4]},dance:{LArm:[-.5,0,.7],RArm:[.5,0,-.7],Spine:[0,0,.2]},read:{LArm:[-.7,0,.3],RArm:[-.7,0,-.3],Head:[.25,0,0]},phone:{RArm:[-.6,0,-.5],RForearm:[-2.1,0,0]},coffee:{RArm:[-.5,0,-.2],RForearm:[-2,0,0]},smoking:{RArm:[-.5,0,0],RForearm:[-2,0,0]},basketball:{RArm:[-.8,0,-.3],RForearm:[-.7,0,0]},football:{RThigh:[-.7,0,0],RShin:[.6,0,0]},tennis:{RArm:[-.7,0,-.7],Spine:[0,.35,0]},swim:{LArm:[-2,0,.3],RArm:[1,0,-.3],LThigh:[.2,0,0],RThigh:[-.2,0,0]},gym:{LArm:[-.9,0,.2],RArm:[-.9,0,-.2],LForearm:[-1,0,0],RForearm:[-1,0,0]}};
 const bones=['Hips','Spine','Head','LArm','LForearm','RArm','RForearm','LThigh','LShin','RThigh','RShin'];
 for(const [name,pose] of Object.entries(poses)){
  const tracks=[];for(const bone of bones){const angles=pose[bone]||[0,0,0],values=[];for(let i=0;i<5;i++){const q=new T.Quaternion().setFromEuler(new T.Euler(angles[0]+(pose[bone]?Math.sin(i*Math.PI/2+(bone.startsWith('R')?Math.PI:0))*(name==='cycle'?.55:.22):0),angles[1],angles[2]));values.push(...q.toArray())}tracks.push(new T.QuaternionKeyframeTrack(bone+'.quaternion',[0,.5,1,1.5,2],values))}
  const hipHeight=['ride','cycle'].includes(name)?.50:.88;tracks.push(new T.VectorKeyframeTrack('Hips.position',[0,2],[0,hipHeight,0,0,hipHeight,0]));rig.actions[name]=rig.mixer.clipAction(new T.AnimationClip(name,2,tracks));
 }
 for(const [name,source] of Object.entries({type:'work',mouse:'work',relax:'sit',sofa:'sit',tv:'sit',meeting:'talk',badminton:'tennis',pickleball:'tennis'}))rig.actions[name]=rig.actions[source];
}
