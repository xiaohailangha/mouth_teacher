"""Read-only weight and modifier diagnostics for the supplied face mesh."""

import bpy
import json

GROUPS = ("jawbone.x", "tong_01.x", "tong_02.x", "tong_03.x", "DEF-jaw", "DEF-face", "DEF-tongue")
report = {"file": bpy.data.filepath, "frame": bpy.context.scene.frame_current, "objects": {}}
for name in ("头", "牙齿上", "牙齿下", "舌头"):
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    groups = {}
    for group_name in GROUPS:
        group = obj.vertex_groups.get(group_name)
        if group:
            weights = []
            for vertex in obj.data.vertices:
                try:
                    weights.append(group.weight(vertex.index))
                except RuntimeError:
                    pass
            groups[group_name] = {"count": len(weights), "mean": sum(weights) / len(weights) if weights else 0,
                                  "max": max(weights) if weights else 0}
    report["objects"][name] = {"groups": groups, "parent": obj.parent.name if obj.parent else None,
                                 "modifiers": [{"name": m.name, "type": m.type, "object": getattr(getattr(m, "object", None), "name", None),
                                                "show_viewport": m.show_viewport, "show_render": m.show_render, "influence": getattr(m, "influence", None),
                                                "use_vertex_groups": getattr(m, "use_vertex_groups", None)} for m in obj.modifiers]}
rig = bpy.data.objects.get("rig")
if rig:
    bone = rig.pose.bones["c_jawbone.x"]
    report["jaw"] = {"location": list(bone.location), "matrix": [list(row) for row in bone.matrix],
                     "constraints": [{"name": c.name, "type": c.type, "mute": c.mute} for c in bone.constraints],
                     "is_visible": rig.visible_get(), "pose_position": rig.data.pose_position,
                     "hide_set": rig.hide_get()}
print("TIGER_WEIGHTS_JSON=" + json.dumps(report, ensure_ascii=False))
