"""Read-only inventory for the supplied tiger character .blend files."""

import bpy
import json


def relevant(name):
    tokens = ("头", "牙", "舌", "口", "嘴", "腭", "jaw", "tong", "teeth", "face", "rig")
    return any(token.lower() in name.lower() for token in tokens)


objects = []
for obj in bpy.data.objects:
    if obj.type not in {"MESH", "ARMATURE"}:
        continue
    entry = {"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None,
             "hidden": obj.hide_viewport, "collection": [c.name for c in obj.users_collection]}
    if obj.type == "MESH":
        entry["vertices"] = len(obj.data.vertices)
        entry["shape_keys"] = [k.name for k in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else []
        entry["modifiers"] = [{"name": m.name, "type": m.type,
                               "object": getattr(getattr(m, "object", None), "name", None),
                               "viewport": m.show_viewport} for m in obj.modifiers]
        entry["vertex_groups"] = [g.name for g in obj.vertex_groups if relevant(g.name)]
    else:
        entry["bones"] = [b.name for b in obj.data.bones if relevant(b.name)]
        entry["pose"] = {p.name: {"location": list(p.location), "rotation": list(p.rotation_euler)}
                         for p in obj.pose.bones if relevant(p.name)}
    objects.append(entry)

scene = bpy.context.scene
result = {"file": bpy.data.filepath, "frame": scene.frame_current,
          "objects": objects,
          "faceit_scene_properties": [p.identifier for p in scene.bl_rna.properties
                                      if "faceit" in p.identifier.lower()]}
print("TIGER_INSPECTION_JSON=" + json.dumps(result, ensure_ascii=False))
