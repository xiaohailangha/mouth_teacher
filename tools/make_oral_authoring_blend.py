"""Import browser tongue into a NEW file; preserve original and desktop Blender.
GPU collision constraints are explicitly not represented as baked animation.
"""
import bpy, json
from pathlib import Path
root=Path('D:/AI语言训练/mouth_teacher')
assert Path(bpy.data.filepath).name=='小虎男孩_口腔与动作工作版.blend'
out=root/'work/v4/小虎男孩_舌位形态工作版.blend'
assert not out.exists(), 'Refusing to overwrite an existing authoring file'
data=json.loads((root/'work/v4/oral-authoring.json').read_text(encoding='utf-8'))
rig=bpy.data.objects['TeacherSkeleton']
coll=bpy.data.collections.new('OralArticulationAuthoring');bpy.context.scene.collection.children.link(coll)
def triples(a):return [tuple(a[i:i+3]) for i in range(0,len(a),3)]
def mesh_object(name,positions,indices):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(triples(positions),[],triples(indices));mesh.update()
 obj=bpy.data.objects.new(name,mesh);coll.objects.link(obj)
 for p in mesh.polygons:p.use_smooth=True
 return obj
tongue=mesh_object('TeachingTongue_Authoring',data['positions'],data['indices'])
tongue.shape_key_add(name='Basis')
for morph in data['morphs']:
 key=tongue.shape_key_add(name=morph['name'],from_mix=False)
 for i,p in enumerate(key.data):
  for axis in range(3):p.co[axis]=data['positions'][i*3+axis]+morph['deltas'][i*3+axis]
names={b.name.replace('.',''):b.name for b in rig.data.bones};groups={}
for index,name in enumerate(data['bones']):
 canonical=name if name in rig.data.bones else names.get(name.replace('.',''))
 assert canonical, name
 groups[index]=tongue.vertex_groups.new(name=canonical)
for i in range(len(data['positions'])//3):
 weights=data['skinWeights'][i*4:i*4+4];assert abs(sum(weights)-1)<1e-5
 for j,weight in enumerate(weights):
  if weight>0:groups[data['skinIndices'][i*4+j]].add([i],weight,'REPLACE')
tongue.parent=rig
mod=tongue.modifiers.new('RuntimeTongueBones','ARMATURE');mod.object=rig
colors=tongue.data.color_attributes.new(name='TongueRegions',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors.data):c.color=(*data['colors'][i*3:i*3+3],1)
material=bpy.data.materials.new('TeachingTongue_Regions');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear();shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');material.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface']);color=nodes.new('ShaderNodeVertexColor');color.layer_name='TongueRegions';material.node_tree.links.new(color.outputs['Color'],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.6
tongue.data.materials.append(material)
palate=mesh_object('PalateReference_Authoring',data['palate']['positions'],data['palate']['indices'])
group=palate.vertex_groups.new(name='head.x');group.add(list(range(len(palate.data.vertices))),1,'REPLACE');palate.parent=rig
mod=palate.modifiers.new('HeadAttachment','ARMATURE');mod.object=rig
material=bpy.data.materials.new('PalateReference_Blue');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear();shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');material.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface']);shader.inputs['Base Color'].default_value=(.2,.38,.46,1);shader.inputs['Alpha'].default_value=.25
if hasattr(material,'surface_render_method'):material.surface_render_method='DITHERED'
palate.data.materials.append(material)
original=bpy.data.objects.get('Teacher_舌头')
if original:original.hide_set(True);original.hide_render=True
note=bpy.data.texts.new('口腔工作副本说明');note.write('保留原场景和 Faceit 数据。新增网格及三个形态键来自当前运行时。骨骼负责整体运动，形态键补充后缩上翘、沟槽与侧缘。上腭是拟合参照。运行时上腭穿插修正未烘焙到形态键；本文件不代表教学准确性已验收。')
tongue['teaching_accuracy']='unverified_directional_demonstration';tongue['runtime_collision_correction_baked']=False
for obj in bpy.context.selected_objects:obj.select_set(False)
tongue.select_set(True);bpy.context.view_layer.objects.active=tongue
bpy.ops.wm.save_as_mainfile(filepath=str(out),check_existing=False)
print('ORAL_AUTHORING='+json.dumps({'path':str(out),'vertices':len(tongue.data.vertices),'shape_keys':[k.name for k in tongue.data.shape_keys.key_blocks],'armature':rig.name},ensure_ascii=False))

