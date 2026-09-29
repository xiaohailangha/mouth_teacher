"""Verify the saved mouth prototype after reopening it in Blender."""

import bpy
import json
from mathutils import Vector

scene = bpy.context.scene
rig = bpy.data.objects["rig"]
faceit = bpy.data.objects["FaceitRig"]
names = ("头", "牙齿上", "牙齿下", "舌头")


def coords(name, frame):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    obj = bpy.data.objects[name]
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    values = [tuple(v.co) for v in mesh.vertices]
    evaluated.to_mesh_clear()
    return values


def difference(left, right):
    values = [(Vector(a) - Vector(b)).length for a, b in zip(left, right)]
    return {"mean": round(sum(values) / len(values), 6), "max": round(max(values), 6)}


snapshots = {name: {frame: coords(name, frame) for frame in (1, 15, 38, 62, 78)}
             for name in names}
report = {
    "file": bpy.data.filepath,
    "frame_range": [scene.frame_start, scene.frame_end],
    "rig_pose_position": rig.data.pose_position,
    "rig_action": rig.animation_data.action.name if rig.animation_data and rig.animation_data.action else None,
    "faceit_preserved": faceit is not None and getattr(scene.faceit_armature, "name", None) == faceit.name,
    "faceit_registered_objects": [item.name for item in scene.faceit_face_objects],
    "modifiers": {name: [{"name": modifier.name, "viewport": modifier.show_viewport,
                          "render": modifier.show_render} for modifier in bpy.data.objects[name].modifiers
                         if modifier.type == "ARMATURE"] for name in names},
    "deformation": {name: {"open_vs_closed": difference(frames[15], frames[1]),
                            "round_vs_open": difference(frames[38], frames[15]),
                            "tongue_vs_open": difference(frames[62], frames[15]),
                            "return_vs_closed": difference(frames[78], frames[1])}
                    for name, frames in snapshots.items()},
}
assert report["frame_range"] == [1, 78]
assert report["rig_pose_position"] == "POSE"
assert report["rig_action"] == "SpeechDemo_原骨架口型动作"
assert report["faceit_preserved"]
assert report["deformation"]["头"]["open_vs_closed"]["max"] > .02
assert report["deformation"]["舌头"]["tongue_vs_open"]["max"] > .001
assert report["deformation"]["头"]["return_vs_closed"]["max"] < .0001
print("TIGER_VERIFICATION_JSON=" + json.dumps(report, ensure_ascii=False))
