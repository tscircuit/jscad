# @tscircuit/jscad

A backwards-compatible wrapper around `@jscad/modeling` 2.13.0 with native
construction references. Shapes remain ordinary Geom2, Path2 and Geom3 objects.
This is a small compatibility layer, not a copied modeling kernel.

```ts
import jscad from "@tscircuit/jscad"

const { primitives, booleans, extrusions, transforms, references } = jscad
const profile = references.nameOutlines(
  booleans.subtract(
    primitives.rectangle({ size: [40, 20] }),
    primitives.circle({ radius: 4 }),
  ),
  { outer: "outside", hole: "bore" },
)
const tube = transforms.translate([10, 20, 30], extrusions.extrudeLinear({
  height: 80,
  topOutlineName: "top",
  bottomOutlineName: "bottom",
}, profile))
const rim = references.get(tube, "top.bore")
// rim.geometry: native closed Path2; rim.matrix: full model-space placement
```

All upstream namespaces are exported both individually and on the default object.
`withReferences(existingKernel)` wraps an explicitly supplied compatible kernel
without monkeypatching it. Ordinary calls delegate to upstream unchanged.

## Naming references

- `references.name(name, nativeGeom2OrPath2)` returns a copy carrying that name.
- `references.nameOutlines(geom2, { outer?, hole? })` names actual **output**
  boundaries, including snapped CSG coordinates. Roles use boundary winding.
  Each requested role must have exactly one boundary; ambiguous or absent roles
  throw. Multiple holes can be named individually with native paths and `name`.
- `extrudeLinear({ topOutlineName?, bottomOutlineName?, ... }, profile)` names the
  full cap profile, with namespaced children (`top.bore`). Bottom means authored
  Z=0; top means signed `height`, including the final `twistAngle` in radians.
  Named caps require exactly one Geom2 or closed Path2 input.
- `references.reference(name, profile)` creates an empty native Geom3 carrying a
  planar construction datum. It contributes no rendered polygons.
- `references.get(shape, name)` returns an independent native geometry snapshot
  and matrix. Read its native planar points first, then apply the matrix to
  `[x,y,0]`. `list(shape)` lists names; `collect(shapes)` collects independent
  snapshots from one shape or an array. Missing and duplicate names throw.

Original profile names stay at their construction location; cap names add placed
copies. Public transforms (including aliases, center and align), native geometry
`transform`, booleans, hulls, expansions, modifiers, extrusion and color operations
carry references. Boolean cutter references remain available. Geometry readers
may bake the solid's transforms without changing reference placement.

References describe **authored construction geometry**, not persistent B-rep
edge identity after a cut, split or merge. Operations do not guess which new edge
inherits an old name. Use this wrapper for modeling operations; passing a named
shape through raw upstream booleans can discard metadata. Manual geometry edits,
serialization, low-level slice operations and custom kernels require explicit
reference handling. Symbol metadata is deliberately omitted from JSON; planner
operations serialize naming instructions instead.

## Development

```sh
bun install
bun run typecheck
bun run format:check
bun test
```

Each test has one PoppyGL SVG snapshot containing a raster rendering and reference
labels, with numerical assertions for geometry and placement. PoppyGL and its
rendering dependencies are development-only. The package exports source, so use
a TypeScript-aware bundler or Bun. No viewer, React or Node runtime is imported.
