# Models

**This folder is intentionally empty.**

All geometry in THE LAST MEMORY is generated procedurally at runtime:

| What                  | Where it comes from                                              |
| --------------------- | ---------------------------------------------------------------- |
| Neural lattice (Ch I) | `buildNeuralGraph()` — clustered small-world graph, 2 draw calls  |
| Memory planes (Ch II) | `PlaneGeometry` + the hologram shader                             |
| Megacity (Ch III/IV)  | `buildCity()` — one instanced box mesh, procedural windows        |
| Orbital rings         | `buildRing()` — instanced segments that can shatter               |
| Debris (Ch IV/V)      | `buildDebris()` — instanced icosahedra                            |
| Satellites (Ch V)     | Primitive composition in `SolitudeScene`                          |
| Crystal (Ch VII)      | `IcosahedronGeometry` + the crystal shader                        |
| AI core               | Displaced icosahedron — entirely shader-driven                    |

See [`src/utils/geometry.ts`](../../src/utils/geometry.ts).

## Adding real models

There are exactly three places where hand-modelled geometry would meaningfully
raise the ceiling — hero towers in Chapter III, the satellites in Chapter V, and
the final crystal. [`BLENDER_ASSETS.md`](../../BLENDER_ASSETS.md) covers which,
why, poly budgets, the export pipeline, and how to lazy-load them so they never
delay the opening.

To generate correctly-scaled blockouts to start from:

```bash
blender --background --python scripts/blender/generate_assets.py -- --out ./public/models
```

**Scale reference:** 1 world unit = 1 metre. Hero towers 150–400 units tall,
satellites 2–6 units, the crystal 22 units in radius — and note that the camera
begins *inside* the crystal, so changing its radius means moving the rail
keyframes in `src/lib/cameraRail.ts` too.

**Budget:** keep total added downloads under ~4 MB and lazy-load every byte. The
experience currently starts instantly with zero asset requests; that is worth
more than higher-fidelity geometry.
