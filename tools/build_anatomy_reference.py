"""Build a static, aligned adult anatomy teaching reference from BodyParts3D.

Run with Blender in background. Source meshes are downloaded separately from
the official BodyParts3D IS-A Tree OBJ 99% archive. No articulatory motion is
inferred from these static meshes.
"""

import csv
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(r"D:\AI语言训练\mouth_teacher")
SOURCE = ROOT / "work" / "bodyparts3d_obj"
OUTPUT = ROOT / "assets" / "models"
PREVIEW = ROOT / "work"

COLORS = {
    "skin": (0.91, 0.80, 0.72, 1),
    "lip": (0.72, 0.32, 0.42, 1),
    "tongue": (0.91, 0.32, 0.36, 1),
    "gingiva": (0.85, 0.53, 0.55, 1),
    "tooth": (0.96, 0.93, 0.81, 1),
    "bone": (0.75, 0.69, 0.58, 1),
}


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    principled = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    output = mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
    output.is_active_output = True
    mat.node_tree.links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = 0.78
    return mat


def clip_skin(obj):
    # A head-only, left-half cutaway. This changes visibility, not anatomy.
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.bisect_plane(
        mesh, geom=list(mesh.verts) + list(mesh.edges) + list(mesh.faces),
        dist=0.001, plane_co=(0, 0, 1400), plane_no=(0, 0, 1),
        clear_inner=True, clear_outer=False,
    )
    bmesh.ops.bisect_plane(
        mesh, geom=list(mesh.verts) + list(mesh.edges) + list(mesh.faces),
        dist=0.001, plane_co=(0, 0, 0), plane_no=(1, 0, 0),
        clear_inner=False, clear_outer=True,
    )
    mesh.to_mesh(obj.data)
    mesh.free()
    obj.data.update()


def look_at(obj, point):
    direction = Vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

parts = {}
with (ROOT / "work" / "isa_parts_list_e.txt").open(encoding="utf-8") as source:
    for row in csv.DictReader(source, delimiter="\t"):
        parts[row["concept id"]] = row["en"]

selected = {}
with (ROOT / "work" / "isa_element_parts.txt").open(encoding="utf-8") as source:
    for row in csv.DictReader(source, delimiter="\t"):
        name = parts.get(row["concept id"], "")
        fixed = {
            "skin", "tongue", "lip", "mandible", "right maxilla",
            "left maxilla", "right palatine bone", "left palatine bone",
            "gingiva of upper jaw", "gingiva of lower jaw",
        }
        adult_tooth = (
            name.startswith(("right ", "left "))
            and " secondary " in name
            and name.endswith(" tooth")
        )
        if name in fixed or adult_tooth:
            selected[row["element file id"]] = name

materials = {key: material(key.title(), color) for key, color in COLORS.items()}
anatomy = []
for file_id, name in selected.items():
    path = SOURCE / f"{file_id}.obj"
    if not path.exists():
        raise FileNotFoundError(path)
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=str(path), forward_axis="Y", up_axis="Z")
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if len(imported) != 1:
        raise RuntimeError(f"Expected one mesh for {file_id}: {imported}")
    obj = imported[0]
    obj.name = f"{name} [{file_id}]"
    if name == "skin":
        clip_skin(obj)
        group = "skin"
    elif name == "tongue":
        group = "tongue"
    elif name == "lip":
        group = "lip"
    elif name.startswith("gingiva"):
        group = "gingiva"
    elif name.endswith("tooth"):
        group = "tooth"
    else:
        group = "bone"
    obj.data.materials.clear()
    obj.data.materials.append(materials[group])
    obj["BodyParts3D_FMA_name"] = name
    obj["BodyParts3D_file_id"] = file_id
    obj["reference"] = "Adult male anatomy; static teaching reference"
    # The source model is in mm. Preserve all relative positions exactly.
    obj.location = (0, 0, -15)
    obj.scale = (0.01, 0.01, 0.01)
    anatomy.append(obj)
    print("PART", file_id, name, len(obj.data.vertices), len(obj.data.polygons))

# Save an editable master before adding render-only lights and cameras.
bpy.ops.object.select_all(action="DESELECT")
for obj in anatomy:
    obj.select_set(True)
bpy.context.view_layer.objects.active = anatomy[0]
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "anatomy_reference.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT / "anatomy_reference.glb"),
    export_format="GLB", use_selection=True, export_apply=True,
    export_extras=True,
)
bpy.ops.object.select_all(action="DESELECT")
for obj in anatomy:
    if not obj.name.startswith("skin ["):
        obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT / "anatomy_internal.glb"),
    export_format="GLB", use_selection=True, export_apply=True,
    export_extras=True,
)
bpy.ops.object.select_all(action="DESELECT")
for obj in anatomy:
    name = obj["BodyParts3D_FMA_name"]
    if name in {"tongue", "lip", "right palatine bone", "left palatine bone"} or name.endswith("tooth"):
        obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT / "anatomy_speech_parts.glb"),
    export_format="GLB", use_selection=True, export_apply=True,
    export_extras=True,
)

# Two QA renders, not part of the mobile asset.
world = bpy.context.scene.world
world.color = (0.8, 0.8, 0.8)
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.77, 0.83, 0.9, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8

for position, power in [((2, -4, 5), 110), ((-4, 1, 3), 80)]:
    light_data = bpy.data.lights.new("Softbox", type="AREA")
    light = bpy.data.objects.new("Softbox", light_data)
    bpy.context.collection.objects.link(light)
    light.location = position
    light_data.energy = power
    light_data.shape = "DISK"
    light_data.size = 5
    look_at(light, (0, -1.3, 0.1))

camera_data = bpy.data.cameras.new("QA camera")
camera = bpy.data.objects.new("QA camera", camera_data)
bpy.context.collection.objects.link(camera)
bpy.context.scene.camera = camera
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.0

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False

for label, position in [
    ("front", (0, -5.8, 0.2)),
    ("cutaway", (5.2, -3.2, 0.1)),
]:
    for obj in anatomy:
        obj.hide_render = label == "cutaway" and obj.name.startswith("skin [")
    camera.location = position
    look_at(camera, (0, -1.15, 0.08))
    scene.render.filepath = str(PREVIEW / f"anatomy_{label}.png")
    bpy.ops.render.render(write_still=True)

print("DONE", OUTPUT / "anatomy_reference.glb")
