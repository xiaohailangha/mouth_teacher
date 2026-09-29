"""Render four unsaved diagnostics from the current working character."""

import bpy
import os
from mathutils import Vector


scene = bpy.context.scene
rig = bpy.data.objects["rig"]
targets = [bpy.data.objects[n] for n in ("头", "牙齿上", "牙齿下", "舌头", "左眼", "右眼")]
output = os.path.join(os.path.dirname(bpy.data.filepath), "预览")
os.makedirs(output, exist_ok=True)

camera_data = bpy.data.cameras.new("Diagnostic_Face_Camera")
camera = bpy.data.objects.new("Diagnostic_Face_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -3.0, 1.08)
target = Vector((0, 0, 1.08))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 1.22
scene.camera = camera
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.engine = "BLENDER_EEVEE"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = output


def set_faceit_modifiers(enabled):
    for obj in targets:
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object and mod.object.name == "FaceitRig":
                mod.show_viewport = enabled
                mod.show_render = enabled


def render(name):
    scene.render.filepath = os.path.join(output, name + ".png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    print("TIGER_RENDER=" + scene.render.filepath)


rig.data.pose_position = "REST"
set_faceit_modifiers(True)
scene.frame_set(2)
render("01_faceit_neutral")
scene.frame_set(10)
render("02_faceit_aa")

rig.data.pose_position = "POSE"
set_faceit_modifiers(False)
scene.frame_set(2)
render("03_original_neutral")
rig.pose.bones["c_jawbone.x"].location.z = -0.05
render("04_original_jaw_open")
