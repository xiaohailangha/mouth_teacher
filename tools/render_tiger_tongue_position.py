"""Small-translation tongue scan; never save .blend."""

import bpy
import os
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
rig.pose.bones["c_jawbone.x"].location.z = .06
scene.frame_set(1)

camera_data = bpy.data.cameras.new("Diagnostic_Face_Camera")
camera = bpy.data.objects.new("Diagnostic_Face_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -3, 1.08)
camera.rotation_euler = (Vector((0, 0, 1.08)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 1.22
scene.camera = camera
scene.render.resolution_x = 600
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.engine = "BLENDER_EEVEE"
output = os.path.join(os.path.dirname(bpy.data.filepath), "预览")
os.makedirs(output, exist_ok=True)
for name, bone_name, dz in (("tongue_pos_base", None, 0),
                            ("tongue_01_up", "c_tong_01.x", .002),
                            ("tongue_01_down", "c_tong_01.x", -.002),
                            ("tongue_03_up", "c_tong_03.x", .002),
                            ("tongue_03_down", "c_tong_03.x", -.002)):
    for active in ("c_tong_01.x", "c_tong_03.x"):
        rig.pose.bones[active].location.z = 0
    if bone_name:
        rig.pose.bones[bone_name].location.z = dz
    scene.render.filepath = os.path.join(output, name + ".png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    print("TIGER_RENDER=" + scene.render.filepath)
