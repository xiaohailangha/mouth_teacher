"""Render a safe parameter scan of the supplied jaw controller; never save .blend."""

import bpy
import os
from mathutils import Vector


scene = bpy.context.scene
rig = bpy.data.objects["rig"]
rig.data.pose_position = "POSE"
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    for mod in obj.modifiers:
        if mod.type == "ARMATURE" and mod.object and mod.object.name == "FaceitRig":
            mod.show_viewport = False
            mod.show_render = False

camera_data = bpy.data.cameras.new("Diagnostic_Face_Camera")
camera = bpy.data.objects.new("Diagnostic_Face_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -3.0, 1.08)
camera.rotation_euler = (Vector((0, 0, 1.08)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 1.22
scene.camera = camera
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.engine = "BLENDER_EEVEE"
output = os.path.join(os.path.dirname(bpy.data.filepath), "预览")
os.makedirs(output, exist_ok=True)
scene.frame_set(1)

for jaw_z in (0.0, 0.0184020958840847, 0.05, 0.08, 0.11):
    rig.pose.bones["c_jawbone.x"].location.z = jaw_z
    scene.render.filepath = os.path.join(output, f"jaw_{jaw_z:.3f}.png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    print("TIGER_RENDER=" + scene.render.filepath)
