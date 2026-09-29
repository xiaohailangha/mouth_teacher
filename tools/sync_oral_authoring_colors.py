"""Update only region colors in our generated authoring copy, never sources."""
import bpy,json
from pathlib import Path
root=Path('D:/AI语言训练/mouth_teacher')
target=root/'work/v4/小虎男孩_舌位形态工作版.blend'
bpy.ops.wm.open_mainfile(filepath=str(target))
data=json.loads((root/'work/v4/oral-authoring.json').read_text(encoding='utf-8'))
obj=bpy.data.objects['TeachingTongue_Authoring']
assert obj.get('teaching_accuracy')=='unverified_directional_demonstration'
colors=obj.data.color_attributes['TongueRegions']
assert len(colors.data)*3==len(data['colors'])
for i,c in enumerate(colors.data):c.color=(*data['colors'][i*3:i*3+3],1)
bpy.ops.wm.save_as_mainfile(filepath=str(target),check_existing=False)
