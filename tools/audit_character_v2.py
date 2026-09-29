import bpy,json,sys
from pathlib import Path
out=Path('D:/AI语言训练/mouth_teacher/work/v2');out.mkdir(exist_ok=True)
report={'file':bpy.data.filepath,'objects':[],'materials':[]}
for o in bpy.context.scene.objects:
 if o.name.startswith('cs_'):continue
 item={'name':o.name,'type':o.type,'visible':o.visible_get(),'hide_render':o.hide_render,'parent':o.parent.name if o.parent else None,'parent_type':o.parent_type,'parent_bone':o.parent_bone,'location':list(o.location),'dimensions':list(o.dimensions),'modifiers':[{'type':m.type,'name':m.name,'visible':m.show_viewport,'object':getattr(getattr(m,'object',None),'name',None)} for m in o.modifiers]}
 if o.type=='MESH':item.update(vertices=len(o.data.vertices),materials=[m.name if m else None for m in o.data.materials],particles=[{'name':p.name,'type':p.settings.type,'count':p.settings.count,'render_type':p.settings.render_type} for p in o.particle_systems],shapes=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [])
 report['objects'].append(item)
for m in bpy.data.materials:
 if not m.use_nodes:continue
 report['materials'].append({'name':m.name,'nodes':[{'name':n.name,'type':n.type,'image':getattr(getattr(n,'image',None),'filepath',None),'group':getattr(getattr(n,'node_tree',None),'name',None)} for n in m.node_tree.nodes]})
r=bpy.data.objects.get('rig')
if r:report['controls']=[{'name':b.name,'loc':list(b.location),'head':list(b.head),'tail':list(b.tail),'constraints':[c.type for c in b.constraints],'rotation_mode':b.rotation_mode,'properties':{k:str(v) for k,v in b.items()}} for b in r.pose.bones if b.name.startswith('c_') and any(t in b.name for t in ['lip','eyel','brow','jaw','cheek','tong','arm','shoulder','hand'])]
(out/(Path(bpy.data.filepath).stem+'_audit.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('AUDIT_SAVED',out, 'objects',len(report['objects']))
