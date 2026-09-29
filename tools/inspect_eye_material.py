import bpy,json
for name in ['左眼','右眼']:
 o=bpy.data.objects[name]
 print('EYE',name,'mats',[(m.name if m else None) for m in o.data.materials])
 for idx in range(len(o.data.materials)):
  vs={i for p in o.data.polygons if p.material_index==idx for i in p.vertices}
  print('BOUNDS',idx,[(min(o.data.vertices[i].co[a] for i in vs),max(o.data.vertices[i].co[a] for i in vs)) for a in range(3)])
 for m in o.data.materials:
  if m and m.use_nodes:
   print('MATERIAL',m.name)
   for n in m.node_tree.nodes:
    print(n.name,n.type,[(i.name,list(i.default_value) if hasattr(i.default_value,'__len__') else i.default_value) for i in n.inputs if hasattr(i,'default_value') and not i.is_linked][:8])
   print('LINKS',[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links])
   for n in m.node_tree.nodes:
    if n.type=='GROUP':
     print('GROUP_INNER',n.node_tree.name,[(x.name,x.type) for x in n.node_tree.nodes])
     print('GROUP_LINKS',[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in n.node_tree.links])
