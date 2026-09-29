"""Bake the original procedural eye colours/transparency for glTF, in a copy."""
import bpy
from pathlib import Path
def bake_eyes(source_eye, output):
 scene=bpy.context.scene
 source_eye=source_eye.copy();source_eye.data=source_eye.data.copy();source_eye.parent=None
 scene.collection.objects.link(source_eye);source_eye.hide_select=False;source_eye.hide_viewport=False;source_eye.hide_render=False;source_eye.hide_set(False)
 source_eye.modifiers.clear()
 scene.render.engine='CYCLES';scene.cycles.samples=1
 scene.render.bake.use_selected_to_active=False
 print('BAKE_SELECTED',[(o.name,o.type) for o in bpy.context.selected_objects])
 scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False
 scene.render.bake.use_pass_color=True;scene.render.bake.margin=4
 for o in bpy.context.selected_objects:o.select_set(False)
 source_eye.select_set(True);bpy.context.view_layer.objects.active=source_eye
 materials=list(source_eye.data.materials)
 result=[]
 bake_images={}
 for mat in materials:
  nt=mat.node_tree;group=next(n for n in nt.nodes if n.type=='GROUP')
  # Work on a private group, preserving the scene's original data.
  group.node_tree=group.node_tree.copy();tree=group.node_tree
  shader=next(n for n in tree.nodes if n.type==('BSDF_DIFFUSE' if 'Iris' in mat.name else 'BSDF_PRINCIPLED'))
  group_out=next(n for n in tree.nodes if n.type=='GROUP_OUTPUT')
  for label,input_name in [('RuntimeColour','Color' if shader.type=='BSDF_DIFFUSE' else 'Base Color'),('RuntimeTransmission','Transmission Weight')]:
   tree.interface.new_socket(name=label,in_out='OUTPUT',socket_type='NodeSocketColor')
   inp=shader.inputs.get(input_name)
   if inp and inp.is_linked:tree.links.new(inp.links[0].from_socket,group_out.inputs[label])
   elif inp:group_out.inputs[label].default_value=inp.default_value if hasattr(inp.default_value,'__len__') else (inp.default_value,)*3+(1,)
   else:group_out.inputs[label].default_value=(0,0,0,1)
  emission=nt.nodes.new('ShaderNodeEmission');out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
  nt.links.new(emission.outputs[0],out.inputs['Surface'])
  image=bpy.data.images.new('Bake_'+mat.name,512,512,alpha=True)
  target=nt.nodes.new('ShaderNodeTexImage');target.image=image;nt.nodes.active=target
  bake_images[mat.name]=(image,group,emission)
 for channel in ['RuntimeColour','RuntimeTransmission']:
  for mat in materials:
   image,group,emission=bake_images[mat.name][:3]
   mat.node_tree.links.new(group.outputs[channel],emission.inputs['Color'])
  bpy.ops.object.bake(type='EMIT')
  for mat in materials:
   image,_,_=bake_images[mat.name][:3]
   if channel=='RuntimeColour':bake_images[mat.name]=(*bake_images[mat.name],list(image.pixels))
   else:
    rgba=bake_images[mat.name][3];alpha=list(image.pixels)
    for i in range(0,len(rgba),4):rgba[i+3]=max(0,min(1,1-alpha[i]))
    image.pixels=rgba;image.filepath_raw=str(output/('iris.png' if 'Iris' in mat.name else 'sclera.png'));image.file_format='PNG';image.save();image.pack()
    new=bpy.data.materials.new('Runtime_'+mat.name);new.use_nodes=True
    p=next(n for n in new.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    tex=new.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    new.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    new.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha'])
    p.inputs['Roughness'].default_value=.23
    result.append(new)
 bpy.data.objects.remove(source_eye,do_unlink=True)
 return result
