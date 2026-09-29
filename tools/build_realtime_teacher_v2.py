"""Build an isolated runtime asset; never saves the source or touches live Blender.

Rig constraints are evaluated offline into neutral/unit bone poses. Runtime owns
jaw/tongue bones and lip/eyelid morphs separately; no jawOpen morph is generated.
Current morphs are derived from the original rig, NOT completed Faceit baking.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT=Path('D:/AI语言训练/mouth_teacher')
OUT=ROOT/'runtime/public/character-v2'
OUT.mkdir(parents=True,exist_ok=True)
source=bpy.data.filepath
assert Path(source).name=='小虎男孩_嘴部动作验证版.blend'
rig=bpy.data.objects['rig']
# Keep native rig drivers (jaw/lip follow and IK/FK); remove only timeline action.
if rig.animation_data:
 rig.animation_data.action=None
 for track in rig.animation_data.nla_tracks:track.mute=True
rig.data.pose_position='POSE'
scene=bpy.context.scene
scene.frame_set(1)

def reset():
 for b in rig.pose.bones:
  b.location=(0,0,0); b.scale=(1,1,1)
  b.rotation_euler=(0,0,0); b.rotation_quaternion=(1,0,0,0)
 rig.pose.bones['c_jawbone.x']['lips_retain']=0.0
 rig.update_tag()
 bpy.context.view_layer.update()

def move_world(name,delta):
 b=rig.pose.bones[name]
 b.location += b.matrix.to_3x3().inverted() @ Vector(delta)

def relaxed():
 for side,sign in [('l',1),('r',-1)]:
  move_world('c_hand_ik.'+side,(-sign*.17,-.035,-.24))
 bpy.context.view_layer.update()

reset();relaxed()
sys.path.insert(0,str(ROOT/'tools'))
from bake_runtime_eyes import bake_eyes
eye_materials=bake_eyes(bpy.data.objects['左眼'],OUT)
meshes=[o for o in scene.objects if o.type in {'MESH','CURVE'} and o.visible_get() and (any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers) or (o.parent==rig and o.parent_type=='BONE'))]
for o in meshes:
 for m in o.modifiers:
  if m.type=='ARMATURE' and m.object!=rig: m.show_viewport=False; m.show_render=False
  if m.type=='SUBSURF': m.levels=2 if o.name in ['头','左眼','右眼','睫毛'] else 1; m.render_levels=m.levels
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
 if o.parent_type=='BONE':
  g=dst.vertex_groups.new(name='head.x');g.add(list(range(len(m.vertices))),1,'REPLACE')
 else:
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
 'mouthPucker':[('c_lips_smile.l',(-.047,-.024,0)),('c_lips_smile.r',(.047,-.024,0)),('c_lips_top.x',(0,-.034,.010)),('c_lips_bot.x',(0,-.034,-.014))],
 'mouthFunnel':[('c_lips_smile.l',(-.03,-.021,0)),('c_lips_smile.r',(.03,-.021,0)),('c_lips_top.x',(0,-.029,.020)),('c_lips_bot.x',(0,-.029,-.022))],
 'mouthClose':[('c_lips_top.x',(0,0,-.006)),('c_lips_bot.x',(0,0,.008))],
 'mouthRollUpper':[('c_lips_top.x',(0,.010,-.004))],
 'mouthRollLower':[('c_lips_bot.x',(0,.010,.004))],
 'mouthShrugUpper':[('c_lips_top.x',(0,-.005,.009))],
 'mouthShrugLower':[('c_lips_bot.x',(0,-.006,.012))],
 'mouthFv':[('c_lips_bot.x',(0,.018,.037)),('c_lips_bot.l',(0,.013,.030)),('c_lips_bot.r',(0,.013,.030)),('c_lips_top.x',(0,0,.025)),('c_lips_top.l',(0,0,.023)),('c_lips_top.r',(0,0,.023)),('c_lips_smile.l',(0,0,.014)),('c_lips_smile.r',(0,0,.014))],
 'browInnerUp':[('c_eyebrow_01.l',(0,0,.017)),('c_eyebrow_01.r',(0,0,.017))],
}
for side,sign in [('l',1),('r',-1)]:
 for part,x in [('top',.045),('bot',.045),('top_01',.089),('bot_01',.083)]:
  shapes['mouthPucker'].append(('c_lips_'+part+'.'+side,(-sign*x*.40,-.024,.006 if part.startswith('top') else -.006)))
  shapes['mouthFunnel'].append(('c_lips_'+part+'.'+side,(-sign*x*.23,-.018, .005 if part.startswith('top') else -.005)))
for side,suffix,sign in [('l','Left',1),('r','Right',-1)]:
 corner='c_lips_smile.'+side
 shapes['mouthSmile'+suffix]=[(corner,(sign*.023,0,.019))]
 shapes['mouthFrown'+suffix]=[(corner,(sign*.006,0,-.016))]
 shapes['mouthDimple'+suffix]=[(corner,(sign*.017,.01,0))]
 shapes['mouthStretch'+suffix]=[(corner,(sign*.025,0,0))]
 shapes['mouthPress'+suffix]=[('c_lips_top.'+side,(0,0,-.008)),('c_lips_bot.'+side,(0,0,.009))]
 shapes['mouthUpperUp'+suffix]=[('c_lips_top.'+side,(0,-.004,.018)),('c_lips_top_01.'+side,(0,0,.010)),('c_lips_top.x',(0,0,.007))]
 shapes['mouthLowerDown'+suffix]=[('c_lips_bot.'+side,(0,-.003,-.019)),('c_lips_bot_01.'+side,(0,0,-.011)),('c_lips_bot.x',(0,0,-.007))]
 shapes['mouth'+suffix]=[(corner,(sign*.019,0,0)),('c_lips_top.x',(sign*.014,0,0)),('c_lips_bot.x',(sign*.014,0,0))]
 shapes['eyeBlink'+suffix]=[('c_eyelid_top.'+side,(0,-.012,-.154)),('c_eyelid_bot.'+side,(0,-.018,.034))]
 shapes['eyeWide'+suffix]=[('c_eyelid_top.'+side,(0,0,.018)),('c_eyelid_bot.'+side,(0,0,-.008))]
 shapes['eyeSquint'+suffix]=[('c_eyelid_top.'+side,(0,0,-.012)),('c_eyelid_bot.'+side,(0,-.006,.022))]
 shapes['browDown'+suffix]=[('c_eyebrow_full.'+side,(sign*.005,0,-.018))]
 shapes['browOuterUp'+suffix]=[('c_eyebrow_03.'+side,(0,0,.022))]
metrics={}
for name,controls in shapes.items():
 reset();relaxed()
 for bone,delta in controls: move_world(bone,delta)
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
reset();relaxed()
poses={}
def jaw_retained():
 loc('c_jawbone.x',2,.05)
 rig.pose.bones['c_jawbone.x']['lips_retain']=1.0
 rig.update_tag()
for name,callback in [
 ('jawOpen',lambda:loc('c_jawbone.x',2,.05)),
 ('jawClosedLips',jaw_retained),
 ('tongueOut',lambda:loc('c_tong_01.x',1,-.018)),
 ('tongueTipUp',lambda:rot('c_tong_03.x',0,.25)),
]:
 reset();relaxed(); callback(); poses[name]=local_pose(matrices())
reset();relaxed()
head=copies['头'];lashes=copies['睫毛']
for name in ['eyeBlinkLeft','eyeBlinkRight']:
 head_key=head.data.shape_keys.key_blocks[name];lash_key=lashes.data.shape_keys.key_blocks[name]
 tree=BVHTree.FromPolygons([v.co for v in head_key.data],[list(p.vertices) for p in head.data.polygons])
 for base_v,v in zip(lashes.data.vertices,lash_key.data):
  if (v.co-base_v.co).length<1e-5:continue
  hit=tree.ray_cast(Vector((v.co.x,-2,v.co.z)),Vector((0,1,0)),4)[0]
  if hit:v.co.y=min(v.co.y,hit.y-.003)
for o in bpy.context.selected_objects: o.select_set(False)
runtime.select_set(True)
for o in copies.values(): o.select_set(True)
bpy.context.view_layer.objects.active=runtime
manifest={'source':source,'version':2,'status':'calibrated_native_rig_morphs','fps':60,'neutral':local_pose(neutral),'poses':poses,'morphMetrics':metrics,'jawOwner':'bones_only','mappedMorphs':list(shapes),'meshCount':len(copies),'hairCount':sum(o.type=='CURVE' for o in meshes),'restPose':'relaxed_arms','coordinateSpace':'Blender world XYZ, forward -Y'}
(OUT/'controls.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
bpy.ops.export_scene.gltf(filepath=str(OUT/'tiger.glb'),export_format='GLB',use_selection=True,export_yup=False,export_animations=False,export_skins=True,export_morph=True,export_apply=False)
# Save only to a newly named working asset, retaining all original Faceit data.
for o in scene.objects:
 if o not in list(coll.objects):
  o.hide_set(True);o.hide_render=True
target=ROOT/'work/v2/小虎男孩_实时驱动精修版.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(target),check_existing=False)
print('REALTIME_EXPORT='+json.dumps({'meshes':len(copies),'morphs':metrics,'bytes':(OUT/'tiger.glb').stat().st_size},ensure_ascii=False))
