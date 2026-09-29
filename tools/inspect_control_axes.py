import bpy,json
from pathlib import Path
r=bpy.data.objects['rig'];r.animation_data.action=None
for b in r.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
bpy.context.view_layer.update()
names=['c_jawbone.x','c_lips_top.x','c_lips_bot.x','c_lips_smile.l','c_eyelid_top.l','c_eyelid_bot.l','c_hand_ik.l']
data={'axes':{n:[list(r.pose.bones[n].matrix.to_3x3().col[i]) for i in range(3)] for n in names},'driverCount':len(r.animation_data.drivers),'drivers':[]}
for d in r.animation_data.drivers:
 vs=[{'name':v.name,'type':v.type,'targets':[{'bone':t.bone_target,'transform':t.transform_type,'space':t.transform_space,'path':t.data_path} for t in v.targets]} for v in d.driver.variables]
 if any(any(t['bone'] in names or any(n in t['path'] for n in names) for t in v['targets']) for v in vs):data['drivers'].append({'path':d.data_path,'index':d.array_index,'expression':d.driver.expression,'variables':vs})
Path('D:/AI语言训练/mouth_teacher/work/v2/control_axes.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(data,ensure_ascii=False))
