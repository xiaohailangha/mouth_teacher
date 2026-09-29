"""Build a small, stylized mouth-animation asset for the Flutter feasibility test.

Run with Blender in background mode. This is an interaction prototype, not an
anatomically validated speech-therapy model.
"""

import bpy
from pathlib import Path


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

OUT = Path(__file__).resolve().parents[1] / "assets" / "models" / "mouth_teacher.glb"


def material(name, color, alpha=1.0, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1:
        mat.surface_render_method = "DITHERED"
    return mat


skin = material("01 soft transparent face", (0.95, 0.68, 0.49), 0.12)
lip = material("02 lips", (0.89, 0.29, 0.36))
mouth = material("03 mouth cavity", (0.23, 0.05, 0.11), 0.28)
tongue_mat = material("04 tongue", (0.98, 0.40, 0.47))
teeth = material("05 teeth", (0.98, 0.97, 0.88))
eye = material("06 eyes", (0.11, 0.18, 0.25))
palate = material("07 palate", (0.81, 0.37, 0.38))


def ellipsoid(name, location, scale, mat, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def cube(name, location, scale, mat, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("soft edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(mat)
    return obj


# The front of the character points toward negative Y. The head is translucent
# so rotating the model exposes the simplified tongue and palate.
ellipsoid("Translucent face shell", (0, 0.10, 0.08), (1.28, 0.67, 1.43), skin)
ellipsoid("Left eye", (-0.47, -0.55, 0.55), (0.10, 0.06, 0.13), eye)
ellipsoid("Right eye", (0.47, -0.55, 0.55), (0.10, 0.06, 0.13), eye)
ellipsoid("Mouth cavity", (0, -0.58, -0.39), (0.76, 0.12, 0.42), mouth)
ellipsoid("Palate", (0, -0.35, -0.13), (0.65, 0.30, 0.08), palate)

upper_lip = ellipsoid("Animated upper lip", (0, -0.77, -0.28), (0.80, 0.16, 0.11), lip)
lower_lip = ellipsoid("Animated lower lip", (0, -0.78, -0.46), (0.80, 0.16, 0.11), lip)
upper_teeth = cube("Upper front teeth", (0, -0.68, -0.31), (0.47, 0.07, 0.11), teeth)
lower_teeth = cube("Animated lower teeth", (0, -0.68, -0.44), (0.47, 0.07, 0.11), teeth)
tongue = ellipsoid("Animated tongue", (0, -0.36, -0.48), (0.46, 0.40, 0.12), tongue_mat)

# Separate the lip/jaw motion from the tongue. Animation clip: lips closed,
# open for the vowel, then return to closed. The mouth is a teaching sketch.
poses = [
    (1, -0.28, -0.46, -0.44, -0.48),
    (9, -0.28, -0.46, -0.44, -0.48),
    (17, -0.18, -0.68, -0.64, -0.56),
    (31, -0.18, -0.68, -0.64, -0.56),
    (42, -0.28, -0.46, -0.44, -0.48),
    (48, -0.28, -0.46, -0.44, -0.48),
]
for frame, upper_z, lower_z, teeth_z, tongue_z in poses:
    for obj, z in (
        (upper_lip, upper_z),
        (lower_lip, lower_z),
        (lower_teeth, teeth_z),
        (tongue, tongue_z),
    ):
        obj.location.z = z
        obj.keyframe_insert(data_path="location", frame=frame)

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 48
bpy.context.scene.render.fps = 24
bpy.context.scene.frame_set(1)

for obj in (upper_lip, lower_lip, lower_teeth, tongue):
    if obj.animation_data and obj.animation_data.action:
        obj.animation_data.action.name = f"MouthDemo_{obj.name}"

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="ACTIVE_ACTIONS",
    export_materials="EXPORT",
)
print(f"Wrote {OUT}")
