"""Read-only scene/camera/animation overview."""

import bpy
import json

scene = bpy.context.scene
report = {"file": bpy.data.filepath,
          "frame": scene.frame_current,
          "camera": scene.camera.name if scene.camera else None,
          "cameras": [o.name for o in bpy.data.objects if o.type == "CAMERA"],
          "render": {"engine": scene.render.engine, "resolution": [scene.render.resolution_x, scene.render.resolution_y]},
          "scene_faceit_armature": getattr(getattr(scene, "faceit_armature", None), "name", None),
          "faceit_armature_type": str(getattr(scene, "faceit_armature_type", None)),
          "faceit_objects": [item.name for item in getattr(scene, "faceit_face_objects", [])],
          "faceit_expressions": [{"name": item.name,
                                   "frame": getattr(item, "frame", None),
                                   "index": getattr(item, "index", None)}
                                  for item in getattr(scene, "faceit_expression_list", [])],
          "actions": {a.name: list(a.frame_range) for a in bpy.data.actions
                      if "faceit" in a.name.lower() or "shape" in a.name.lower()}}
for rig_name in ("rig", "FaceitRig"):
    rig = bpy.data.objects.get(rig_name)
    if rig:
        report[rig_name] = {"pose_position": rig.data.pose_position,
                            "location": list(rig.location), "scale": list(rig.scale),
                            "action": rig.animation_data.action.name if rig.animation_data and rig.animation_data.action else None,
                            "visible": rig.visible_get()}
print("TIGER_SCENE_JSON=" + json.dumps(report, ensure_ascii=False))
