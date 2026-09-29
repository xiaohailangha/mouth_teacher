"""Build an isolated runtime asset; never saves the source or touches live Blender.

Rig constraints are evaluated offline into neutral/unit bone poses. Runtime owns
jaw/tongue bones and lip/eyelid morphs separately; no jawOpen morph is generated.
Current morphs are derived from the original rig, NOT completed Faceit baking.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Matrix

ROOT=Path('D:/AI语言训练/mouth_teacher')
OUT=ROOT/'runtime/public/character'
OUT.mkdir(parents=True,exist_ok=True)
source=bpy.data.filepath
assert Path(source).name=='小虎男孩_嘴部动作验证版.blend'
rig=bpy.data.objects['rig']
rig.animation_data_clear()
rig.data.pose_position='POSE'
scene=bpy.context.scene
scene.frame_set(1)

def reset():
 for b in rig.pose.bones:
  b.location=(0,0,0); b.scale=(1,1,1)
  b.rotation_euler=(0,0,0); b.rotation_quaternion=(1,0,0,0)
 bpy.context.view_layer.update()

reset()
sys.path.insert(0,str(ROOT/'tools'))
from bake_runtime_eyes import bake_eyes
eye_materials=bake_eyes(bpy.data.objects['左眼'],OUT)
meshes=[o for o in scene.objects if o.type=='MESH' and o.visible_get() and not o.name.startswith('cs_') and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
for o in meshes:
 for m in o.modifiers:
  if m.type=='ARMATURE' and m.object!=rig: m.show_viewport=False; m.show_render=False
  if m.type=='SUBSURF': m.levels=1; m.render_levels=1
deform=[b for b in rig.pose.bones if b.bone.use_deform]
parents={}
for b in deform:
 p=b.parent
 while p and not p.bone.use_deform: p=p.parent
 parents[b.name]=p.name if p else None

def matrices():
 bpy.context.view_layer.update()
 return {b.name:rig.matrix_world @ b.matrix.copy() for b in deform}

neutral=matrices()
def local_pose(mats):
 result={}
 for name,m in mats.items():
  local=mats[parents[name]].inverted() @ m if parents[name] else m
  p,q,s=local.decompose()
  result[name]={'p':list(p),'q':[q.x,q.y,q.z,q.w],'s':list(s)}
 return result

def evaluated(o):
 bpy.context.view_layer.update()
 e=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
 return bpy.data.meshes.new_from_object(e,preserve_all_data_layers=True,depsgraph=bpy.context.evaluated_depsgraph_get())

base={o.name:evaluated(o) for o in meshes}
coll=bpy.data.collections.new('RealtimeTeacherExport'); scene.collection.children.link(coll)
arm=bpy.data.armatures.new('TeacherSkeleton')
runtime=bpy.data.objects.new('TeacherSkeleton',arm); coll.objects.link(runtime)
bpy.context.view_layer.objects.active=runtime; runtime.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for b in deform:
 eb=arm.edit_bones.new(b.name); eb.head=(0,0,0); eb.tail=(0,max(b.length,.001),0); eb.matrix=neutral[b.name]
for name,parent in parents.items():
 if parent: arm.edit_bones[name].parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
copies={}
for o in meshes:
 m=base[o.name]; m.transform(o.matrix_world)
 dst=bpy.data.objects.new('Teacher_'+o.name,m); coll.objects.link(dst)
 # Evaluated mesh retains vertex-group indices, including subdivided vertices.
 for g in o.vertex_groups: dst.vertex_groups.new(name=g.name)
 dst.parent=runtime
 mod=dst.modifiers.new('RuntimeSkin','ARMATURE'); mod.object=runtime
 copies[o.name]=dst
 if o.name in ['左眼','右眼']:
  for i,mat in enumerate(eye_materials): dst.data.materials[i]=mat

def loc(name,axis,v): rig.pose.bones[name].location[axis]=v
def rot(name,axis,v):
 b=rig.pose.bones[name]; b.rotation_mode='XYZ'; b.rotation_euler[axis]=v

# Unit shapes are independent of jaw/tongue. Neutral subtraction removes rest pose.
shapes={
 'mouthPucker':[('c_lips_smile.l',0,-.018),('c_lips_smile.r',0,.018)],
 'mouthFunnel':[('c_lips_smile.l',0,-.012),('c_lips_smile.r',0,.012),('c_lips_top.x',1,-.01),('c_lips_bot.x',1,-.01)],
 'mouthSmileLeft':[('c_lips_smile.l',0,.012),('c_lips_smile.l',2,.008)],
 'mouthSmileRight':[('c_lips_smile.r',0,-.012),('c_lips_smile.r',2,.008)],
 'mouthUpperUpLeft':[('c_lips_top.l',2,.012)],
 'mouthUpperUpRight':[('c_lips_top.r',2,.012)],
 'mouthLowerDownLeft':[('c_lips_bot.l',2,-.01)],
 'mouthLowerDownRight':[('c_lips_bot.r',2,-.01)],
 'eyeBlinkLeft':[('c_eyelid_top.l',2,-.108),('c_eyelid_bot.l',2,.023)],
 'eyeBlinkRight':[('c_eyelid_top.r',2,-.108),('c_eyelid_bot.r',2,.023)],
}
metrics={}
for name,controls in shapes.items():
 reset()
 for bone,axis,v in controls: loc(bone,axis,v)
 metrics[name]={}
 for src in meshes:
  if src.name not in ['头','睫毛','眉毛']: continue
  dst=copies[src.name]; m=evaluated(src); m.transform(src.matrix_world)
  assert len(m.vertices)==len(dst.data.vertices)
  displacement=max((a.co-b.co).length for a,b in zip(m.vertices,dst.data.vertices))
  if displacement>1e-6:
   if not dst.data.shape_keys: dst.shape_key_add(name='Basis')
   key=dst.shape_key_add(name=name)
   for point,v in zip(key.data,m.vertices): point.co=v.co
   metrics[name][src.name]=displacement
  bpy.data.meshes.remove(m)
reset()
poses={}
for name,callback in [
 ('jawOpen',lambda:loc('c_jawbone.x',2,.05)),
 ('tongueOut',lambda:loc('c_tong_01.x',1,-.018)),
 ('tongueTipUp',lambda:rot('c_tong_03.x',0,.25)),
]:
 reset(); callback(); poses[name]=local_pose(matrices())
reset()
for o in bpy.context.selected_objects: o.select_set(False)
runtime.select_set(True)
for o in copies.values(): o.select_set(True)
bpy.context.view_layer.objects.active=runtime
manifest={'source':source,'status':'prototype_original_rig_morphs_not_faceit_final','fps':60,'neutral':local_pose(neutral),'poses':poses,'morphMetrics':metrics,'jawOwner':'bones_only','mappedMorphs':list(shapes),'meshCount':len(copies)}
(OUT/'controls.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
bpy.ops.export_scene.gltf(filepath=str(OUT/'tiger.glb'),export_format='GLB',use_selection=True,export_yup=False,export_animations=False,export_skins=True,export_morph=True,export_apply=False)
# Save only to a newly named working asset, retaining all original Faceit data.
for o in scene.objects:
 if o not in list(coll.objects):
  o.hide_set(True);o.hide_render=True
target=ROOT/'work/小虎男孩_实时驱动工作副本.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(target),check_existing=False)
print('REALTIME_EXPORT='+json.dumps({'meshes':len(copies),'morphs':metrics,'bytes':(OUT/'tiger.glb').stat().st_size},ensure_ascii=False))
