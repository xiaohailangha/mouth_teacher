import bpy,json
from pathlib import Path
root=Path('D:/AI语言训练/mouth_teacher')
base=root/'work/v3/小虎男孩_口腔与动作工作版.blend'
target=root/'work/v4/小虎男孩_舌位形态工作版.blend'
bpy.ops.wm.open_mainfile(filepath=str(base))
names=set(bpy.data.objects.keys());drivers=len(bpy.data.objects['rig'].animation_data.drivers)
bpy.ops.wm.open_mainfile(filepath=str(target))
assert names.issubset(set(bpy.data.objects.keys()))
assert len(bpy.data.objects['rig'].animation_data.drivers)==drivers
data=json.loads((root/'work/v4/oral-authoring.json').read_text(encoding='utf-8'))
o=bpy.data.objects['TeachingTongue_Authoring']
assert len(o.data.vertices)==len(data['positions'])//3
assert any(m.type=='ARMATURE' and m.object.name=='TeacherSkeleton' for m in o.modifiers)
max_error=max(abs(v.co[a]-data['positions'][i*3+a]) for i,v in enumerate(o.data.vertices) for a in range(3))
assert max_error<1e-6
color_error=max(abs(c.color[a]-data['colors'][i*3+a]) for i,c in enumerate(o.data.color_attributes['TongueRegions'].data) for a in range(3))
assert color_error<1e-6
keys={}
for morph in data['morphs']:
 key=o.data.shape_keys.key_blocks[morph['name']]
 error=max(abs(key.data[i].co[a]-o.data.vertices[i].co[a]-morph['deltas'][i*3+a]) for i in range(len(o.data.vertices)) for a in range(3))
 print('MORPH_ERROR',morph['name'],error);assert error<1e-6;keys[morph['name']]={'maxError':error,'changedVertices':sum((a.co-b.co).length>1e-6 for a,b in zip(key.data,o.data.vertices))}
for v in o.data.vertices:assert abs(sum(g.weight for g in v.groups)-1)<1e-5
report={'reopened':True,'originalObjectsRetained':len(names),'originalRigDriversRetained':drivers,'vertices':len(o.data.vertices),'baseCoordinateMaxError':max_error,'shapeKeys':keys,'runtimeCollisionNotBaked':True}
(root/'work/v4/authoring-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('VERIFIED='+json.dumps(report,ensure_ascii=False))

