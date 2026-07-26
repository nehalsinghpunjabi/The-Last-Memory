"""
Blender asset generator for THE LAST MEMORY.

Produces correctly-scaled blockouts for the three places in the film where
hand-modelled geometry is worth its download (see BLENDER_ASSETS.md):

    tower-01..06.glb    Hero architecture for Chapter III's descent
    satellite-01.glb    Dead satellite for Chapter V
    crystal.glb         Fractured memory crystal for the final reveal

These are *starting points to art-direct*, not finished assets. The point is to
hand you geometry that is already at the right scale, with the right pivot, and
the right polygon budget, so you can open it and start sculpting instead of
starting from a default cube.

Scale reference: 1 Blender unit = 1 world unit = 1 metre.
The camera is a ~38mm-equivalent lens. Towers read at 150-400m.

Usage:
    blender --background --python scripts/blender/generate_assets.py -- --out ./public/models

Requires Blender 3.6+ (tested on 4.x).
"""

import argparse
import math
import os
import random
import sys

try:
    import bpy
    import bmesh
    from mathutils import Vector
except ImportError:  # pragma: no cover - only runs inside Blender
    print("This script must be run inside Blender:")
    print("  blender --background --python scripts/blender/generate_assets.py -- --out ./public/models")
    sys.exit(1)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="./public/models", help="output directory")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--towers", type=int, default=6)
    return p.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def new_material(name, base_color, roughness=0.6, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        # Socket names moved between Blender versions.
        for key in ("Emission Color", "Emission"):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = (*emission, 1.0)
                break
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 3.0
    return mat


def export_glb(objects, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_yup=True,
        export_normals=True,
        export_tangents=True,
    )
    print(f"  wrote {path}")


def add_lods(obj, ratios=(0.4, 0.15)):
    """Duplicate + decimate. glTF has no LOD concept, so we name by convention
    and let the runtime pick — see BLENDER_ASSETS.md."""
    lods = []
    for i, ratio in enumerate(ratios, start=1):
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.duplicate()
        lod = bpy.context.active_object
        lod.name = f"{obj.name}_LOD{i}"
        mod = lod.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = ratio
        lods.append(lod)
    return lods


# --------------------------------------------------------------------------- #
# 1. Hero towers
# --------------------------------------------------------------------------- #

def build_tower(name, height, base_width, rng):
    """A setback tower: stacked, shrinking, slightly rotated boxes with
    mechanical floors and a mast. Roofline variety is what makes a skyline
    read, so the top is where the randomness is concentrated."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()

    sections = rng.randint(3, 6)
    y = 0.0
    width = base_width
    depth = base_width * rng.uniform(0.75, 1.25)

    for s in range(sections):
        remaining = height - y
        section_h = remaining / (sections - s) * rng.uniform(0.75, 1.2)
        section_h = min(section_h, remaining)

        bmesh.ops.create_cube(bm, size=1.0, matrix=_transform(
            (0, y + section_h / 2, 0), (width, section_h, depth), rng.uniform(-0.04, 0.04)
        ))

        # Mechanical floor: a slightly wider band between sections.
        if s < sections - 1:
            bmesh.ops.create_cube(bm, size=1.0, matrix=_transform(
                (0, y + section_h, 0), (width * 1.08, 2.5, depth * 1.08), 0
            ))

        y += section_h
        width *= rng.uniform(0.72, 0.9)
        depth *= rng.uniform(0.72, 0.9)

    # Crown.
    crown = rng.choice(["mast", "block", "taper", "none"])
    if crown == "mast":
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8, radius1=1.2, radius2=0.35,
            depth=height * 0.18,
            matrix=_transform((0, y + height * 0.09, 0), (1, 1, 1), 0),
        )
    elif crown == "block":
        bmesh.ops.create_cube(bm, size=1.0, matrix=_transform(
            (0, y + 6, 0), (width * 0.7, 12, depth * 0.7), rng.uniform(-0.3, 0.3)
        ))
    elif crown == "taper":
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=4, radius1=width * 0.7, radius2=0.5,
            depth=height * 0.12,
            matrix=_transform((0, y + height * 0.06, 0), (1, 1, 1), math.pi / 4),
        )

    bm.to_mesh(mesh)
    bm.free()

    # Pivot at the base — the runtime places towers by their footprint.
    obj.location = (0, 0, 0)
    return obj


def _transform(location, scale, rot_y):
    from mathutils import Matrix
    return (
        Matrix.Translation(Vector(location))
        @ Matrix.Rotation(rot_y, 4, "Y")
        @ Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))
    )


def generate_towers(out_dir, count, seed):
    print("\nHero towers (Chapter III)")
    facade = new_material("Facade", (0.24, 0.26, 0.32), roughness=0.42, metallic=0.35)
    glass = new_material("Windows", (0.9, 0.72, 0.42), roughness=0.12,
                         metallic=0.0, emission=(1.0, 0.78, 0.45))

    for i in range(count):
        rng = random.Random(seed + i * 97)
        clear_scene()
        height = rng.uniform(160, 400)
        obj = build_tower(f"tower_{i + 1:02d}", height, rng.uniform(14, 26), rng)
        obj.data.materials.append(facade)
        obj.data.materials.append(glass)

        # Shade smooth on the crown only; keep facades flat.
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_flat()

        add_lods(obj)
        export_glb([obj], os.path.join(out_dir, f"tower-{i + 1:02d}.glb"))


# --------------------------------------------------------------------------- #
# 2. Dead satellite
# --------------------------------------------------------------------------- #

def generate_satellite(out_dir, seed):
    print("\nSatellite (Chapter V)")
    clear_scene()
    rng = random.Random(seed + 404)

    body_mat = new_material("SatBody", (0.42, 0.45, 0.5), roughness=0.62, metallic=0.75)
    panel_mat = new_material("SolarPanel", (0.06, 0.09, 0.15), roughness=0.24, metallic=0.9)
    gold_mat = new_material("ThermalBlanket", (0.75, 0.58, 0.22), roughness=0.35, metallic=0.85)

    parts = []

    # Bus.
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    bus = bpy.context.active_object
    bus.name = "satellite_bus"
    bus.scale = (1.4, 1.3, 2.2)
    bpy.ops.object.transform_apply(scale=True)
    bevel = bus.modifiers.new("Bevel", "BEVEL")
    bevel.width = 0.06
    bevel.segments = 2
    bus.data.materials.append(gold_mat)
    parts.append(bus)

    # High-gain dish.
    bpy.ops.mesh.primitive_cone_add(
        vertices=24, radius1=0.95, radius2=0.15, depth=0.6,
        location=(0, 0, 1.7), rotation=(math.pi / 2, 0, 0),
    )
    dish = bpy.context.active_object
    dish.name = "satellite_dish"
    dish.data.materials.append(body_mat)
    parts.append(dish)

    # Solar arrays — the silhouette everyone recognises.
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 4.2, 0, 0))
        panel = bpy.context.active_object
        panel.name = f"satellite_panel_{'L' if side < 0 else 'R'}"
        panel.scale = (6.4, 0.05, 1.9)
        bpy.ops.object.transform_apply(scale=True)
        # Cell seams.
        solidify = panel.modifiers.new("Bevel", "BEVEL")
        solidify.width = 0.02
        panel.data.materials.append(panel_mat)
        parts.append(panel)

        # Boom.
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8, radius=0.09, depth=2.0,
            location=(side * 1.6, 0, 0), rotation=(0, math.pi / 2, 0),
        )
        boom = bpy.context.active_object
        boom.name = f"satellite_boom_{'L' if side < 0 else 'R'}"
        boom.data.materials.append(body_mat)
        parts.append(boom)

    # Antenna whips — cheap tris, huge silhouette payoff.
    for i in range(3):
        a = rng.uniform(0, math.pi * 2)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=6, radius=0.03, depth=rng.uniform(1.2, 2.6),
            location=(math.cos(a) * 0.6, -1.0, math.sin(a) * 0.6),
            rotation=(rng.uniform(-0.3, 0.3), 0, rng.uniform(-0.3, 0.3)),
        )
        whip = bpy.context.active_object
        whip.name = f"satellite_antenna_{i}"
        whip.data.materials.append(body_mat)
        parts.append(whip)

    export_glb(parts, os.path.join(out_dir, "satellite-01.glb"))


# --------------------------------------------------------------------------- #
# 3. Memory crystal
# --------------------------------------------------------------------------- #

def generate_crystal(out_dir, seed):
    print("\nMemory crystal (final reveal)")
    clear_scene()
    rng = random.Random(seed + 1212)

    crystal_mat = new_material("Crystal", (0.72, 0.85, 1.0), roughness=0.05, metallic=0.0)
    crystal_mat.use_backface_culling = False
    bsdf = crystal_mat.node_tree.nodes.get("Principled BSDF")
    for key, value in (("Transmission Weight", 1.0), ("Transmission", 1.0),
                       ("IOR", 2.4), ("Alpha", 0.65)):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value

    # Radius 22 — the camera starts *inside* this. Do not scale it down without
    # also moving the rail keyframes in src/lib/cameraRail.ts.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=22.0)
    crystal = bpy.context.active_object
    crystal.name = "memory_crystal"

    # Push vertices out along their normals unevenly to break the sphere into
    # something faceted and mineral rather than geodesic.
    mesh = crystal.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    for v in bm.verts:
        v.co += v.normal * rng.uniform(-1.6, 2.8)
    bm.to_mesh(mesh)
    bm.free()

    bpy.ops.object.shade_flat()
    crystal.data.materials.append(crystal_mat)

    # A second, smaller shell — the light held inside.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=11.0)
    core = bpy.context.active_object
    core.name = "memory_crystal_core"
    bpy.ops.object.shade_flat()
    core_mat = new_material("CrystalCore", (1.0, 0.85, 0.62), roughness=0.3,
                            emission=(1.0, 0.82, 0.55))
    core.data.materials.append(core_mat)

    export_glb([crystal, core], os.path.join(out_dir, "crystal.glb"))


# --------------------------------------------------------------------------- #

def main():
    args = parse_args()
    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)

    print(f"THE LAST MEMORY — asset generation")
    print(f"Output: {out_dir}")

    generate_towers(out_dir, args.towers, args.seed)
    generate_satellite(out_dir, args.seed)
    generate_crystal(out_dir, args.seed)

    print("\nDone. Next steps:")
    print("  1. Open the .glb files and art-direct them — these are blockouts.")
    print("  2. gltf-transform optimize <in> <out> --texture-compress ktx2 --compress draco")
    print("  3. Lazy-load them inside the chapter's sceneActive() guard.")
    print("  See BLENDER_ASSETS.md for budgets and wiring.")


if __name__ == "__main__":
    main()
