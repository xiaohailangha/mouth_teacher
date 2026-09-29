"""Measure which native rig controls actually move lips and tongue."""

import bpy
import json
from mathutils import Vector

scene = bpy.context.scene
rig = bpy.data.objects["rig"]
rig.data.pose_position = "POSE"
if rig.animation_data:
    rig.animation_data.action = None
for obj in bpy.data.objects:
    if obj.type == "MESH":
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object and mod.object.name == "FaceitRig":
                mod.show_viewport = False
                mod.show_render = False
for bone in rig.pose.bones:
    bone.location = (0, 0, 0)
    if bone.rotation_mode == "QUATERNION":
        bone.rotation_quaternion = (1, 0, 0, 0)
    else:
        bone.rotation_euler = (0, 0, 0)
    bone.scale = (1, 1, 1)
rig.pose.bones["c_jawbone.x"].location.z = .035
scene.frame_set(1)


def coords(name):
    obj = bpy.data.objects[name]
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    values = [tuple(v.co) for v in mesh.vertices]
    evaluated.to_mesh_clear()
    return values


def displacement(base, current):
    distances = [(Vector(a) - Vector(b)).length for a, b in zip(base, current)]
    return [round(sum(distances) / len(distances), 6), round(max(distances), 6)]


head_base = coords("头")
tongue_base = coords("舌头")
checks = {}
for name in ("c_lips_smile.l", "c_lips_smile.r", "c_lips_top.x", "c_lips_bot.x",
             "c_lips_corner_mini.l", "c_lips_corner_mini.r", "c_lips_roll_top.x",
             "c_lips_roll_bot.x", "c_tong_01.x", "c_tong_02.x", "c_tong_03.x"):
    bone = rig.pose.bones.get(name)
    if not bone:
        continue
    axes = {}
    for axis in range(3):
        bone.location[axis] = .02
        axes["xyz"[axis]] = {"head": displacement(head_base, coords("头")),
                              "tongue": displacement(tongue_base, coords("舌头"))}
        bone.location[axis] = 0
    checks[name] = axes
print("TIGER_PROBE_JSON=" + json.dumps(checks, ensure_ascii=False))
