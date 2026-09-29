"""Create the child-facing Q-style teacher exterior.

This is an artistic character shell, not an anatomy mesh. The separate
BodyParts3D-derived teaching plate remains the source for oral positions.
"""

from pathlib import Path
from math import radians

import bpy
from mathutils import Vector


ROOT = Path(r"D:\AI语言训练\mouth_teacher")
OUT = ROOT / "assets" / "models"
WORK = ROOT / "work"


def mat(name, color, roughness=0.72):
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    result.node_tree.nodes.clear()
    shader = result.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    output = result.node_tree.nodes.new("ShaderNodeOutputMaterial")
    output.is_active_output = True
    result.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    return result


def ellipsoid(name, center, radius, material, segments=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = radius
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def tube(name, points, material, bevel=0.018):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 24
    curve.bevel_depth = bevel
    curve.bevel_resolution = 4
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for node, position in zip(spline.bezier_points, points):
        node.co = position
        node.handle_left_type = "AUTO"
        node.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

skin = mat("warm peach", (0.96, 0.74, 0.58, 1))
skin_shadow = mat("ear inner", (0.83, 0.53, 0.48, 1))
cheek = mat("blush", (0.98, 0.55, 0.54, 1))
hair = mat("deep blue hair", (0.14, 0.29, 0.39, 1))
hair_light = mat("hair highlight", (0.23, 0.42, 0.50, 1))
iris = mat("warm brown eyes", (0.31, 0.20, 0.21, 1), 0.28)
eye_white = mat("eye white", (0.98, 0.97, 0.88, 1), 0.25)
shine = mat("eye shine", (1.0, 1.0, 1.0, 1), 0.15)
mouth = mat("smile", (0.57, 0.25, 0.31, 1))
hoodie = mat("teal hoodie", (0.21, 0.68, 0.71, 1))
hoodie_dark = mat("hoodie seam", (0.12, 0.48, 0.53, 1))
cream = mat("collar cream", (0.98, 0.90, 0.72, 1))

# Character proportions are deliberately stylized. Its smile sits at roughly
# the source lip height; it is not a diagnostic depiction of the oral cavity.
ellipsoid("rounded face", (0, -0.98, 0.10), (0.96, 0.78, 1.12), skin)
ellipsoid("left ear", (-0.94, -0.95, 0.00), (0.18, 0.13, 0.28), skin)
ellipsoid("right ear", (0.94, -0.95, 0.00), (0.18, 0.13, 0.28), skin)
ellipsoid("left ear inset", (-1.035, -1.04, 0.00), (0.06, 0.05, 0.16), skin_shadow)
ellipsoid("right ear inset", (1.035, -1.04, 0.00), (0.06, 0.05, 0.16), skin_shadow)

# Hair silhouette, layered bangs, and a small side part avoid the bald egg look.
ellipsoid("hair cap", (0, -0.89, 0.88), (1.00, 0.80, 0.46), hair)
ellipsoid("left bang", (-0.55, -1.54, 0.76), (0.42, 0.15, 0.27), hair)
ellipsoid("middle bang", (-0.19, -1.62, 0.79), (0.41, 0.17, 0.21), hair)
ellipsoid("right swept bang", (0.36, -1.56, 0.85), (0.43, 0.18, 0.22), hair)
ellipsoid("hair tuft", (0.56, -0.95, 1.25), (0.32, 0.31, 0.21), hair_light)

for sign, side in [(-1, "left"), (1, "right")]:
    x = sign * 0.36
    ellipsoid(f"{side} eye white", (x, -1.704, 0.31), (0.153, 0.065, 0.187), eye_white)
    ellipsoid(f"{side} iris", (x, -1.765, 0.29), (0.091, 0.041, 0.132), iris)
    ellipsoid(f"{side} eye highlight", (x - 0.027, -1.803, 0.345), (0.031, 0.017, 0.043), shine)
    tube(f"{side} eyebrow", [
        (x - 0.12, -1.67, 0.58),
        (x, -1.70, 0.62),
        (x + 0.12, -1.67, 0.57),
    ], hair, 0.018)
    ellipsoid(f"{side} rosy cheek", (sign * 0.67, -1.61, -0.11), (0.18, 0.043, 0.09), cheek)

ellipsoid("round nose", (0, -1.79, -0.035), (0.085, 0.09, 0.10), skin)
tube("gentle smile", [
    (-0.23, -1.716, -0.34),
    (-0.12, -1.756, -0.405),
    (0, -1.765, -0.425),
    (0.12, -1.756, -0.405),
    (0.23, -1.716, -0.34),
], mouth, 0.019)

# Bust/costume gives the child a recognisable little teacher rather than a head.
ellipsoid("teacher hoodie", (0, -0.88, -1.36), (0.88, 0.65, 0.55), hoodie)
ellipsoid("left shoulder", (-0.68, -0.86, -1.30), (0.35, 0.52, 0.38), hoodie)
ellipsoid("right shoulder", (0.68, -0.86, -1.30), (0.35, 0.52, 0.38), hoodie)
ellipsoid("collar", (0, -1.45, -1.05), (0.28, 0.13, 0.09), cream)
tube("hoodie seam", [(-0.54, -1.39, -1.12), (0, -1.51, -1.23), (0.54, -1.39, -1.12)], hoodie_dark, 0.015)

art = [o for o in bpy.context.scene.objects if o.type in {"MESH", "CURVE"}]
bpy.ops.object.select_all(action="DESELECT")
for obj in art:
    obj.select_set(True)
bpy.context.view_layer.objects.active = art[0]
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "q_teacher.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "q_teacher.glb"), export_format="GLB",
    use_selection=True, export_apply=True,
)

world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.96, 1.0, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
for position, energy in [((-3, -4, 5), 500), ((3, -1, 3), 280)]:
    data = bpy.data.lights.new("Studio softbox", "AREA")
    lamp = bpy.data.objects.new("Studio softbox", data)
    bpy.context.collection.objects.link(lamp)
    lamp.location = position
    data.energy = energy
    data.size = 4
    look_at(lamp, (0, -1, 0))
cam_data = bpy.data.cameras.new("QA camera")
cam = bpy.data.objects.new("QA camera", cam_data)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam
cam_data.type = "ORTHO"
cam_data.ortho_scale = 3.7
cam.location = (0, -5.4, 0.03)
look_at(cam, (0, -1, 0.03))
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(WORK / "q_teacher_front.png")
bpy.ops.render.render(write_still=True)
print("DONE", OUT / "q_teacher.glb")
