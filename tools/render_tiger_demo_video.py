"""Render a compact PNG sequence from the verified speech demo .blend."""

import bpy
import os
from mathutils import Vector

scene = bpy.context.scene
assert os.path.basename(bpy.data.filepath) == "小虎男孩_嘴部动作验证版.blend"
output_dir = os.path.join(os.path.dirname(bpy.data.filepath), "预览", "动作帧")
os.makedirs(output_dir, exist_ok=True)
assert not os.listdir(output_dir), "Refusing to overwrite existing frames"

camera_data = bpy.data.cameras.new("Diagnostic_Face_Camera")
camera = bpy.data.objects.new("Diagnostic_Face_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -3, 1.08)
camera.rotation_euler = (Vector((0, 0, 1.08)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 1.22
scene.camera = camera

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 480
scene.render.resolution_y = 480
scene.render.resolution_percentage = 100
scene.render.fps = 24
scene.frame_step = 2
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(output_dir, "frame_")
bpy.ops.render.render(animation=True)
print("TIGER_DEMO_FRAMES=" + output_dir)
