"""Create a separate, reversible mouth-animation prototype from the work copy.

The existing Faceit rig and registration are retained but its duplicate mesh
deformation is disabled while the original character rig drives speech motion.
This is a visual prototype, not a clinically validated articulation model.
"""

import bpy
import os
from mathutils import Vector


scene = bpy.context.scene
source = bpy.data.filepath
output_dir = os.path.dirname(source)
output_blend = os.path.join(output_dir, "小虎男孩_嘴部动作验证版.blend")
assert os.path.basename(source) == "小虎男孩_言语训练工作版.blend", source
assert not os.path.exists(output_blend), "Output already exists; refusing to overwrite"

rig = bpy.data.objects["rig"]
faceit = bpy.data.objects["FaceitRig"]
assert rig.type == faceit.type == "ARMATURE"
required = ("头", "左眼", "右眼", "牙齿上", "牙齿下", "舌头")
for name in required:
    obj = bpy.data.objects[name]
    assert any(m.type == "ARMATURE" and m.object == rig for m in obj.modifiers), name
    for modifier in obj.modifiers:
        if modifier.type == "ARMATURE" and modifier.object == faceit:
            modifier.show_viewport = False
            modifier.show_render = False

rig.data.pose_position = "POSE"
faceit.hide_set(True)
scene.frame_set(1)
if rig.animation_data:
    rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.location = (0, 0, 0)
    if bone.rotation_mode == "QUATERNION":
        bone.rotation_quaternion = (1, 0, 0, 0)
    else:
        bone.rotation_euler = (0, 0, 0)
    bone.scale = (1, 1, 1)

controls = {
    "jaw": rig.pose.bones["c_jawbone.x"],
    "lip_l": rig.pose.bones["c_lips_smile.l"],
    "lip_r": rig.pose.bones["c_lips_smile.r"],
    "tongue_base": rig.pose.bones["c_tong_01.x"],
    "tongue_tip": rig.pose.bones["c_tong_03.x"],
}
rig.animation_data_create()
action = bpy.data.actions.new("SpeechDemo_原骨架口型动作")
rig.animation_data.action = action


def key_pose(frame, jaw=0, roundness=0, tongue_raise=0, tongue_curl=0):
    scene.frame_set(frame)
    controls["jaw"].location.z = jaw
    controls["lip_l"].location.x = -roundness
    controls["lip_r"].location.x = roundness
    controls["tongue_base"].location.z = tongue_raise
    controls["tongue_tip"].rotation_euler.x = tongue_curl
    for key in ("jaw", "lip_l", "lip_r", "tongue_base"):
        controls[key].keyframe_insert(data_path="location", frame=frame, group="SpeechDemo_Mouth")
    controls["tongue_tip"].keyframe_insert(data_path="rotation_euler", frame=frame,
                                            group="SpeechDemo_Tongue")


# Pauses between poses make the movement easy to inspect in Blender.
poses = (
    (1, 0, 0, 0, 0),
    (8, 0, 0, 0, 0),
    (15, .050, 0, 0, 0),
    (23, .050, 0, 0, 0),
    (30, 0, 0, 0, 0),
    (38, .035, .018, 0, 0),
    (46, .035, .018, 0, 0),
    (53, 0, 0, 0, 0),
    (62, .055, 0, .003, .25),
    (70, .055, 0, .003, .25),
    (78, 0, 0, 0, 0),
)
for pose in poses:
    key_pose(*pose)

for frame, name in ((1, "闭嘴/中性"), (15, "张口动作"), (38, "圆唇动作"), (62, "舌头动作测试")):
    if not any(marker.name == name for marker in scene.timeline_markers):
        marker = scene.timeline_markers.new(name, frame=frame)

scene.frame_start = 1
scene.frame_end = 78
scene.frame_set(1)
scene["speech_demo_status"] = "visual prototype only; anatomical/phonetic accuracy not validated"
notes = bpy.data.texts.get("READ_ME_口型演示") or bpy.data.texts.new("READ_ME_口型演示")
notes.clear()
notes.write(
    "这是小虎男孩的独立嘴部动作验证版。\n"
    "时间轴 1-78 帧：闭嘴 → 张口 → 圆唇 → 舌头动作测试。\n"
    "原有角色骨架 rig 驱动头、牙齿、舌头；FaceitRig 与面部标记均保留，"
    "但 Faceit_Armature 修改器暂时关闭，以免与原骨架重复变形。\n"
    "这是视觉动作样例，尚未通过言语治疗师审核，不可当作准确发音示范。\n"
    "原文件与原工作版未覆盖。\n"
)

bpy.context.view_layer.objects.active = rig
for obj in bpy.context.selected_objects:
    obj.select_set(False)
rig.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=output_blend, check_existing=False)
print("TIGER_DEMO_BLEND=" + output_blend)

# Render only a few key poses for independent visual QA; don't save these camera changes.
original_camera = scene.camera
camera_data = bpy.data.cameras.new("Diagnostic_Face_Camera")
camera = bpy.data.objects.new("Diagnostic_Face_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -3, 1.08)
camera.rotation_euler = (Vector((0, 0, 1.08)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 1.22
scene.camera = camera
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.engine = "BLENDER_EEVEE"
preview_dir = os.path.join(output_dir, "预览")
os.makedirs(preview_dir, exist_ok=True)
for frame, label in ((1, "demo_closed"), (15, "demo_open"),
                     (38, "demo_round"), (62, "demo_tongue")):
    scene.frame_set(frame)
    scene.render.filepath = os.path.join(preview_dir, label + ".png")
    bpy.ops.render.render(write_still=True)
    print("TIGER_DEMO_RENDER=" + scene.render.filepath)
scene.camera = original_camera
