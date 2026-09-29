"""Non-saving deformation test for the character's existing and Faceit rigs."""

import bpy
import json
from mathutils import Vector


NAMES = ("头", "牙齿上", "牙齿下", "舌头")
orig = bpy.data.objects.get("rig")
faceit = bpy.data.objects.get("FaceitRig")
targets = [bpy.data.objects[n] for n in NAMES if n in bpy.data.objects]


def evaluated_vertices(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    coords = [tuple(obj.matrix_world @ vertex.co) for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    return coords


def measure(a, b):
    if len(a) != len(b):
        return {"count_a": len(a), "count_b": len(b)}
    differences = [(Vector(x) - Vector(y)).length for x, y in zip(a, b)]
    return {"mean": round(sum(differences) / len(differences), 6),
            "max": round(max(differences), 6),
            "over_1mm": sum(d > .001 for d in differences)}


def snapshot(use_original=True, use_faceit=True):
    for obj in targets:
        for mod in obj.modifiers:
            if mod.type == "ARMATURE":
                if mod.object == orig:
                    mod.show_viewport = use_original
                if mod.object == faceit:
                    mod.show_viewport = use_faceit
    bpy.context.view_layer.update()
    return {obj.name: evaluated_vertices(obj) for obj in targets}


base_both = snapshot(True, True)
base_original = snapshot(True, False)
base_faceit = snapshot(False, True)
control = orig.pose.bones.get("c_jawbone.x") if orig else None
initial_jaw_z = control.location.z if control else None
if control:
    control.location.z = -0.05
    bpy.context.view_layer.update()
open_both = snapshot(True, True)
open_original = snapshot(True, False)
if control:
    control.location.z = initial_jaw_z
    bpy.context.view_layer.update()

result = {"file": bpy.data.filepath, "initial_jaw_z": initial_jaw_z,
          "meshes": {obj.name: {"both_vs_original": measure(base_both[obj.name], base_original[obj.name]),
                                "faceit_vs_original": measure(base_faceit[obj.name], base_original[obj.name]),
                                "jaw_effect_both": measure(open_both[obj.name], base_both[obj.name]),
                                "jaw_effect_original_only": measure(open_original[obj.name], base_original[obj.name])}
                     for obj in targets}}
if faceit:
    result["faceit_bones"] = {name: {"head": list(faceit.data.bones[name].head_local),
                                     "tail": list(faceit.data.bones[name].tail_local)}
                              for name in ("jaw_master", "jaw", "tongue_master", "tongue", "teeth.B", "teeth.T")
                              if name in faceit.data.bones}
print("TIGER_DIAGNOSIS_JSON=" + json.dumps(result, ensure_ascii=False))
