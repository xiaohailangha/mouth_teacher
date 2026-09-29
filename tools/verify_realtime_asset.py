import bpy,json
from pathlib import Path
assert Path(bpy.data.filepath).name=='小虎男孩_实时驱动工作副本.blend'
head=bpy.data.objects['Teacher_头']
keys=[k.name for k in head.data.shape_keys.key_blocks]
assert len(keys)==11 and 'jawOpen' not in keys
assert bpy.data.objects.get('FaceitRig')
assert len(bpy.context.scene.faceit_expression_list)==21
assert head.visible_get() and not bpy.data.objects['头'].visible_get()
print('ASSET_VERIFIED='+json.dumps({'headKeys':keys,'faceitEntries':21,'runtimeBones':len(bpy.data.objects['TeacherSkeleton'].data.bones),'visibleMeshes':len([o for o in bpy.context.scene.objects if o.type=='MESH' and o.visible_get()])},ensure_ascii=False))
