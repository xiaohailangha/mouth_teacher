import bpy,json
from mathutils import Vector
from pathlib import Path
rig=bpy.data.objects['rig']
if rig.animation_data:rig.animation_data.action=None
for b in rig.pose.bones:
 b.location=(0,0,0);b.rotation_euler=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
rig.pose.bones['c_jawbone.x']['lips_retain']=0.0
rig.update_tag();bpy.context.view_layer.update()
result={}
for name in ['头','舌头','牙齿上','牙齿下']:
 o=bpy.data.objects[name];e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh()
 verts=[o.matrix_world@v.co for v in m.vertices]
 bounds={'min':[min(v[i] for v in verts) for i in range(3)],'max':[max(v[i] for v in verts) for i in range(3)]}
 mats=[]
 for i,mat in enumerate(o.data.materials):
  pts=[verts[j] for p in m.polygons if p.material_index==i for j in p.vertices]
  if pts:mats.append({'name':mat.name,'min':[min(v[j] for v in pts) for j in range(3)],'max':[max(v[j] for v in pts) for j in range(3)]})
 result[name]={'bounds':bounds,'materials':mats,'groups':[g.name for g in o.vertex_groups]}
 e.to_mesh_clear()
Path('D:/AI语言训练/mouth_teacher/work/v2/oral_geometry.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
