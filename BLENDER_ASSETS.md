# Blender asset recommendations

Everything in THE LAST MEMORY is currently procedural. That is a deliberate
choice, not a limitation: it keeps the repository under a megabyte, makes the
experience work offline, guarantees every playthrough is identical, and means
there is nothing to license before shipping.

But procedural generation has a ceiling, and there are exactly three places in
this film where hand-modelled geometry would raise it. This document says which,
why, what the budget is, and how to wire the result in.

---

## Where models would actually earn their download

### 1. Chapter III — hero architecture (highest impact)

The megacity reads well at distance because the crane shot never lingers on any
one building. The weakest moment in the film is `t ≈ 0.505`, where the camera
drops to 34 units and boxes are briefly legible as boxes.

**Model:** 6–10 hero towers, placed by hand along the camera's descent path.

| Property     | Target                                                    |
| ------------ | --------------------------------------------------------- |
| Poly budget  | 8–15k tris each, 2 LODs (LOD1 at 40%, LOD2 → the existing instanced box) |
| Texture      | 2K albedo + roughness/metalness packed, KTX2/Basis         |
| Detail       | Setbacks, mechanical floors, sky bridges, antenna masts     |
| Silhouette   | Vary the *tops* — a skyline is read by its roofline         |

Keep the procedural instanced city for everything beyond ~250 units. Hero models
only need to exist inside the corridor the camera actually flies through.

**Blender approach:** Geometry Nodes for the setback logic, then a Decimate
modifier per LOD, then bake AO to the second UV set. Export glTF 2.0 (`.glb`)
with Draco compression.

### 2. Chapter V — the satellites

Right now they are boxes, a cylinder and two flat panels. The camera moves so
little in Solitude that the audience has time to look at them properly, and this
is the one chapter where a recognisable, weathered, real-looking object would
add loneliness rather than spectacle.

| Property    | Target                                                     |
| ----------- | ---------------------------------------------------------- |
| Poly budget | 4–8k tris, single LOD (there are ≤9 on screen)              |
| Texture     | 1K albedo + normal + roughness; heavy use of dirt/micrometeorite pitting |
| Detail      | Thermal blanket wrinkles, exposed harnessing, a mission patch or serial number nobody will ever read |

That unreadable serial number is the point. It implies a builder.

### 3. Chapter VII — the crystal

The current crystal is an icosahedron with fake refraction, which works because
it is only fully visible for about four seconds. If you want to hold on it
longer, a real faceted model with a `MeshPhysicalMaterial`
(`transmission: 1`, `thickness`, `ior: 2.4`, `iridescence`) would take it much
further.

| Property    | Target                                                    |
| ----------- | --------------------------------------------------------- |
| Poly budget | 2–4k tris — facet count matters more than density          |
| Approach    | Cell Fracture on a sphere, dissolve interior faces, shade flat |
| Caution     | Transmission is expensive. Gate it behind `device.tier === 'high'` and keep the current shader as the fallback. |

---

## What *not* to model

- **The neural lattice** (Ch. I) — it is a graph, not an object. Modelling it
  would make it worse.
- **Memory fragments** (Ch. II) — they are planes on purpose. They are
  photographs.
- **Debris fields** — instanced icosahedra with per-instance scale are
  indistinguishable from modelled rubble at these distances and cost nothing.
- **The AI core** — it is a shader. A mesh would kill it.
- **The final photograph** — do not replace this with a real photo of real
  people unless you have their explicit permission. The painted version is
  deliberately non-specific so the audience projects their own faces onto it,
  which is the entire mechanism of the ending.

---

## Pipeline

```bash
# In Blender: File > Export > glTF 2.0 (.glb)
#   Format:        glTF Binary (.glb)
#   Include:       Selected Objects, +Y Up
#   Geometry:      Apply Modifiers, UVs, Normals, Tangents
#   Compression:   Draco, level 6
```

Then compress textures to GPU-native formats:

```bash
npm i -D @gltf-transform/cli
gltf-transform optimize in.glb out.glb --texture-compress ktx2 --compress draco
```

Drop the result in `public/models/` and load it lazily so it never blocks the
opening:

```tsx
import { useGLTF } from '@react-three/drei';

function HeroTower(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/models/tower-01.glb');
  return (
    <group {...props}>
      <mesh geometry={nodes.Tower.geometry} material={materials.Facade} />
    </group>
  );
}
useGLTF.preload('/models/tower-01.glb');
```

Mount it inside the chapter's `sceneActive` guard (see
[`SceneDirector`](src/components/three/SceneDirector.tsx)) so it is only
fetched when the camera is approaching that chapter, and wrap it in `<Suspense>`
with `null` as the fallback — a pop-in is better than a stall.

**Budget discipline:** the whole point of this project is that it starts
instantly. If you add models, keep the total download under 4 MB and lazy-load
every byte of it. A 40 MB city that takes twelve seconds to appear is a worse
film than a procedural one that starts immediately.

---

## Starter script

[`scripts/blender/generate_assets.py`](scripts/blender/generate_assets.py)
generates a procedural tower kit, a satellite blockout and a fractured crystal
directly in Blender, so you have something correctly-scaled to art-direct rather
than starting from a default cube:

```bash
blender --background --python scripts/blender/generate_assets.py -- --out ./public/models
```

Scale reference: **1 world unit = 1 metre.** The camera is a 38mm-equivalent
lens at the default FOV. Hero towers should be 150–400 units tall; satellites
2–6 units; the crystal is 22 units in radius (and the camera starts inside it).
