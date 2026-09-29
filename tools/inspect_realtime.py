import bpy, json
from pathlib import Path
r=bpy.data.objects['rig']
out={'meshes':[], 'bones':[], 'faceit':[]}
for o in bpy.data.objects:
 if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==r for m in o.modifiers):
  out['meshes'].append({'name':o.name,'verts':len(o.data.vertices),'visible':o.visible_get(),'keys':[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [],'mods':[(m.name,m.type,m.show_viewport) for m in o.modifiers]})
for b in r.pose.bones:
 if any(t in b.name for t in ['jaw','lip','tong','eyelid','eye','head','neck']):
  out['bones'].append({'name':b.name,'deform':b.bone.use_deform,'parent':b.parent.name if b.parent else None,'head':list(b.head),'constraints':[(c.type,c.name) for c in b.constraints]})
f=bpy.data.objects.get('FaceitRig')
if f: out['faceit']=[b.name for b in f.pose.bones]
Path('D:/AI语言训练/mouth_teacher/work/realtime_inventory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
