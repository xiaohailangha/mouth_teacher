"""Visual scan of native tongue-tip rotations; never save .blend."""

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
rig.pose.bones["c_jawbone.x"].location.z = .055
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
tip = rig.pose.bones["c_tong_03.x"]
cases = (("tongue_base", (0, 0, 0)),
         ("tongue_x_plus", (.3, 0, 0)),
         ("tongue_x_minus", (-.3, 0, 0)),
         ("tongue_y_plus", (0, .3, 0)),
         ("tongue_y_minus", (0, -.3, 0)),
         ("tongue_z_plus", (0, 0, .3)),
         ("tongue_z_minus", (0, 0, -.3)))
for name, rotation in cases:
    tip.rotation_euler = rotation
    scene.render.filepath = os.path.join(output, name + ".png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    print("TIGER_RENDER=" + scene.render.filepath)
