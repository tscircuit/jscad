import { expect, test } from "bun:test"
import upstream from "@jscad/modeling"
import jscad from "../lib"
import { cleanupSubtraction } from "../lib/cleanup-subtraction"
import { snapshotSvg } from "./fixtures/snapshot"

test("3D subtraction automatically cleans floating-point joins and retains native references", async () => {
  const outer = jscad.extrusions.extrudeLinear(
    { height: 60, topOutlineName: "outer" },
    jscad.primitives.roundedRectangle({
      size: [40, 20],
      roundRadius: 4,
      segments: 64,
    }),
  )
  const inner = jscad.extrusions.extrudeLinear(
    { height: 60, topOutlineName: "bore" },
    jscad.primitives.roundedRectangle({
      size: [36, 16],
      roundRadius: 2,
      segments: 64,
    }),
  )
  const raw = upstream.booleans.subtract(
    structuredClone(outer),
    structuredClone(inner),
  )
  expect(() => upstream.geometries.geom3.validate(raw)).toThrow("non-manifold")
  const material = { color: "steel" }
  const base = {
    ...raw,
    material,
    color: [0.5, 0.6, 0.7, 1] as [number, number, number, number],
  }
  const cleaned = cleanupSubtraction(upstream, base) as typeof base
  const solid = jscad.booleans.subtract(outer, inner)
  expect(() => upstream.geometries.geom3.validate(solid)).not.toThrow()
  expect(cleaned.material).toBe(material)
  expect(cleaned.color).toEqual(base.color)
  expect(jscad.references.list(solid)).toEqual(["outer", "bore"])
  expect(jscad.references.get(solid, "bore").matrix[14]).toBe(60)
  expect(
    upstream.measurements.measureVolume(solid) /
      upstream.measurements.measureVolume(raw),
  ).toBeCloseTo(1, 5)
  const bounds = upstream.measurements.measureBoundingBox(solid)
  const originalBounds = upstream.measurements.measureBoundingBox(raw)
  for (let end = 0; end < 2; end++)
    for (let axis = 0; axis < 3; axis++)
      expect(bounds[end]![axis]).toBeCloseTo(originalBounds[end]![axis]!, 7)
  const box = jscad.primitives.cuboid({ size: [2, 3, 4] })
  expect(
    jscad.geometries.geom3.toPolygons(jscad.booleans.subtract(box, box)),
  ).toHaveLength(0)
  // Native booleans also accept pre-existing open surfaces. Cleanup must not
  // introduce mandatory manifold validation for those callers.
  const open = upstream.geometries.geom3.create([
    upstream.geometries.poly3.create([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]),
  ])
  expect(() => cleanupSubtraction(upstream, open)).not.toThrow()
  const rectangle = jscad.primitives.rectangle({ size: [10, 10] })
  const hole = jscad.primitives.circle({ radius: 2 })
  expect(jscad.booleans.subtract(rectangle, hole)).toEqual(
    upstream.booleans.subtract(rectangle, hole),
  )
  expect(await snapshotSvg(solid)).toMatchSvgSnapshot(import.meta.path)
}, 30_000)
