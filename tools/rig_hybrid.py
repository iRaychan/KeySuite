"""Rig the accepted FreeHybrid01 geometry; no new face primitives or source edits."""
import bpy,math,json
from mathutils import Vector,Matrix
from pathlib import Path
root=Path(__file__).resolve().parents[1];workspace=root.parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'keyhq/avatar/assets/keyhq-original.glb'))
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
for o in list(bpy.data.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(workspace/'prototypes/FreeHybrid01/preview/hybrid-study.glb'))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:
 mw=o.matrix_world.copy();o.parent=None;o.matrix_world=Matrix.Identity(4)
 for v in o.data.vertices:v.co=mw@v.co
 # Bring the static lowered A-pose arms into the existing animation rig's rest pose.
 if o.name in ['GEO-snow-body','GEO-snow-shirt']:
  for v in o.data.vertices:
   x=v.co.x;w=max(0,min(1,(abs(x)-.18)/.11));sign=1 if x>0 else -1
   pivot=Vector((.18*sign,0,1.37));v.co=pivot+Matrix.Rotation(math.radians(38)*w*sign,4,'Y')@(v.co-pivot)
   v.co.x+=.055*sign*w
   v.co.z=1.37+(v.co.z-1.37)*(1-.14*w)
 for g in list(o.vertex_groups):o.vertex_groups.remove(g)
 groups={b.name:o.vertex_groups.new(name=b.name) for b in arm.data.bones}
 def assign(index,weights):
  total=sum(weights.values())
  for name,w in weights.items():
   if w>0:groups[name].add([index],w/total,'REPLACE')
 def blend(index,z,a,b,lo,hi):
  t=max(0,min(1,(z-lo)/(hi-lo)));assign(index,{a:1-t,b:t})
 for v in o.data.vertices:
  x,y,z=v.co;side='R' if x>0 else 'L'
  if 'head_stylized' in o.name:
   if '.eye.' in o.name:assign(v.index,{'Head':1})
   else:blend(v.index,z,'Spine','Head',1.36,1.5)
  elif o.name in ['Hair_SimpleParted','Eyebrows_Regular']:assign(v.index,{'Head':1})
  elif 'body' in o.name:
   if z>1.08:blend(v.index,z,side+'Forearm',side+'Arm',1.02,1.13)
   else:blend(v.index,z,side+'Hand',side+'Forearm',.78,.87)
  elif 'shirt' in o.name:
   if abs(x)>.20 and z>1.07:blend(v.index,abs(x),'Spine',side+'Arm',.19,.255)
   else:blend(v.index,z,'Hips','Spine',.94,1.12)
  elif 'pants' in o.name:
   if z>.78:blend(v.index,z,side+'Thigh','Hips',.78,.94)
   else:blend(v.index,z,side+'Shin',side+'Thigh',.39,.53)
  elif 'shoes' in o.name:assign(v.index,{side+'Foot':1})
  else:assign(v.index,{'Spine':1})
 o.parent=arm;mod=o.modifiers.new('KeyHQ compatible skin','ARMATURE');mod.object=arm
 for p in o.data.polygons:p.use_smooth=True
 # Preserve the approved continuous facial surface, including existing mouth and eyelids.
 o['hybrid_component']=True
arm['hybrid_avatar']=True
bpy.context.view_layer.update()
# Export all original body clips with compatible bone names.
output=root/'keyhq/avatar/assets/keyhq-hybrid.glb'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animations=True,export_skins=True,export_extras=True,export_animation_mode='ACTIONS')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'source/keyhq-hybrid-rig.blend'))
report={'meshes':len(meshes),'bones':len(arm.data.bones),'vertices':sum(len(o.data.vertices) for o in meshes),'actions':[a.name for a in bpy.data.actions],'limitations':['Analytic body skin weights require visual review at elbows, shoulders and seated hips.','No authored facial morph rig or individual finger joints.','Fixed approved hairstyle and face geometry; profile values remain stored.']}
(root/'tests/v50011/avatar-rig-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
